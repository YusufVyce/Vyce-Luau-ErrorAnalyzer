/**
 * Recursive-descent Luau parser. Type annotations are parsed and discarded.
 * Syntax errors use the same wording as Roblox Studio, e.g.
 *   Expected 'end' (to close 'function' at line 3), got <eof>
 */
import type { Block, Chunk, Expr, Stat, TableItem } from "./ast";
import { lex, LuauSyntaxError, type Token } from "./lexer";

type FuncExpr = Extract<Expr, { k: "Func" }>;

const BINARY_PRIORITY: Record<string, [number, number]> = {
  "+": [6, 6],
  "-": [6, 6],
  "*": [7, 7],
  "/": [7, 7],
  "//": [7, 7],
  "%": [7, 7],
  "^": [10, 9],
  "..": [5, 4],
  "==": [3, 3],
  "~=": [3, 3],
  "<": [3, 3],
  "<=": [3, 3],
  ">": [3, 3],
  ">=": [3, 3],
  and: [2, 2],
  or: [1, 1],
};
const UNARY_PRIORITY = 8;
const COMPOUND = new Set(["+=", "-=", "*=", "/=", "//=", "%=", "^=", "..="]);

function describe(t: Token): string {
  if (t.type === "eof") return "<eof>";
  if (t.type === "string") return `'${t.str}'`;
  if (t.type === "interp") return "interpolated string";
  return `'${t.value}'`;
}

class Parser {
  private pos = 0;
  constructor(
    private tokens: Token[],
    private lineOffset = 0,
  ) {}

  private get t(): Token {
    return this.tokens[this.pos];
  }
  private peekTok(o = 1): Token {
    return this.tokens[Math.min(this.pos + o, this.tokens.length - 1)];
  }
  private line(t: Token = this.t) {
    return t.line + this.lineOffset;
  }
  private is(value: string, type?: Token["type"]) {
    return (
      this.t.value === value &&
      (type ? this.t.type === type : this.t.type === "symbol" || this.t.type === "keyword")
    );
  }
  private isName(value?: string) {
    return this.t.type === "name" && (value === undefined || this.t.value === value);
  }
  private next(): Token {
    const t = this.t;
    if (t.type !== "eof") this.pos++;
    return t;
  }
  private fail(message: string, t: Token = this.t): never {
    throw new LuauSyntaxError(message, this.line(t), t.column);
  }
  private accept(value: string): boolean {
    if (this.is(value)) {
      this.next();
      return true;
    }
    return false;
  }
  private expect(value: string, context: string): Token {
    if (!this.is(value))
      this.fail(`Expected '${value}' when parsing ${context}, got ${describe(this.t)}`);
    return this.next();
  }
  private expectMatch(close: string, open: string, openTok: Token) {
    if (this.is(close)) return this.next();
    const where =
      this.line(openTok) === this.line()
        ? `column ${openTok.column}`
        : `line ${this.line(openTok)}`;
    this.fail(`Expected '${close}' (to close '${open}' at ${where}), got ${describe(this.t)}`);
  }
  private expectName(context: string): string {
    if (this.t.type !== "name")
      this.fail(`Expected identifier when parsing ${context}, got ${describe(this.t)}`);
    return this.next().value;
  }

  // ---------------------------------------------------------------- types
  private skipBalanced(open: string, close: string) {
    const start = this.t;
    let depth = 0;
    do {
      if (this.t.type === "eof")
        this.fail(
          `Expected '${close}' (to close '${open}' at line ${this.line(start)}), got <eof>`,
        );
      if (this.is(open)) depth++;
      else if (this.is(close)) depth--;
      this.next();
    } while (depth > 0);
  }
  private skipSimpleType() {
    if (this.isName("typeof")) {
      this.next();
      this.skipBalanced("(", ")");
    } else if (this.t.type === "name" || this.is("nil")) {
      this.next();
      while (this.is(".") && this.peekTok().type === "name") {
        this.next();
        this.next();
      }
      if (this.is("<")) this.skipBalanced("<", ">");
    } else if (this.t.type === "string" || this.is("true") || this.is("false")) {
      this.next();
    } else if (this.is("{")) {
      this.skipBalanced("{", "}");
    } else if (this.is("(")) {
      this.skipBalanced("(", ")");
      if (this.accept("->")) this.skipType();
    } else if (this.is("<")) {
      this.skipBalanced("<", ">");
      this.skipBalanced("(", ")");
      this.expect("->", "function type");
      this.skipType();
    } else if (this.is("...")) {
      this.next();
      this.skipType();
    } else {
      this.fail(`Expected type, got ${describe(this.t)}`);
    }
    while (this.accept("?"));
  }
  private skipType() {
    if (this.is("|") || this.is("&")) this.next();
    this.skipSimpleType();
    while (this.is("|") || this.is("&") || this.is("?")) {
      if (this.accept("?")) continue;
      this.next();
      this.skipSimpleType();
    }
  }

  // ---------------------------------------------------------------- blocks
  private blockEnds() {
    return (
      this.t.type === "eof" ||
      this.is("end") ||
      this.is("else") ||
      this.is("elseif") ||
      this.is("until")
    );
  }

  parseChunk(): Chunk {
    const body = this.parseBlock();
    if (this.t.type !== "eof") {
      this.fail(`Expected <eof>, got ${describe(this.t)}`);
    }
    return { body };
  }

  private parseBlock(): Block {
    const body: Block = [];
    while (!this.blockEnds()) {
      if (this.is("return")) {
        const t = this.next();
        const exprs = this.blockEnds() || this.is(";") ? [] : this.parseExprList();
        this.accept(";");
        body.push({ k: "Return", exprs, line: this.line(t) });
        if (!this.blockEnds())
          this.fail(`Expected 'end', got ${describe(this.t)} (code after 'return' can never run)`);
        break;
      }
      const stat = this.parseStatement();
      if (stat) body.push(stat);
      this.accept(";");
    }
    return body;
  }

  private closeBlock(opener: string, openTok: Token) {
    if (this.is("end")) {
      this.next();
      return;
    }
    this.fail(
      `Expected 'end' (to close '${opener}' at line ${this.line(openTok)}), got ${describe(this.t)}`,
    );
  }

  private parseStatement(): Stat | null {
    const t = this.t;
    const line = this.line(t);
    if (t.type === "keyword") {
      switch (t.value) {
        case "local":
          return this.parseLocal();
        case "function":
          return this.parseFunctionStat();
        case "if":
          return this.parseIf();
        case "while": {
          this.next();
          const cond = this.parseExpr();
          const doTok = this.t;
          this.expect("do", "while loop");
          const body = this.parseBlock();
          this.closeBlock("do", doTok);
          return { k: "While", cond, body, line };
        }
        case "repeat": {
          this.next();
          const body = this.parseBlock();
          if (!this.is("until"))
            this.fail(
              `Expected 'until' (to close 'repeat' at line ${line}), got ${describe(this.t)}`,
            );
          this.next();
          const cond = this.parseExpr();
          return { k: "Repeat", body, cond, line };
        }
        case "for":
          return this.parseFor();
        case "do": {
          this.next();
          const body = this.parseBlock();
          this.closeBlock("do", t);
          return { k: "Do", body, line };
        }
        case "break":
          this.next();
          return { k: "Break", line };
        default:
          break;
      }
    }
    if (t.type === "name") {
      if (t.value === "continue" && !this.isAssignOrCallContinuation(1)) {
        this.next();
        return { k: "Continue", line };
      }
      if (
        t.value === "type" &&
        this.peekTok().type === "name" &&
        (this.peekTok(2).value === "=" || this.peekTok(2).value === "<")
      ) {
        this.skipTypeDecl();
        return { k: "Nop", line };
      }
      if (
        t.value === "export" &&
        this.peekTok().type === "name" &&
        this.peekTok().value === "type"
      ) {
        this.next();
        this.skipTypeDecl();
        return { k: "Nop", line };
      }
    }
    if (t.type === "symbol" && t.value === "@") {
      // attributes like @native / @checked
      this.next();
      this.expectName("attribute");
      return null;
    }
    return this.parseExprStatement();
  }

  private isAssignOrCallContinuation(offset: number) {
    const n = this.peekTok(offset);
    return n.type === "symbol" && ["=", "(", ".", ":", "[", ",", "+=", "-=", "{"].includes(n.value);
  }

  private skipTypeDecl() {
    this.next(); // 'type'
    this.expectName("type name");
    if (this.is("<")) this.skipBalanced("<", ">");
    this.expect("=", "type alias");
    this.skipType();
  }

  private parseLocal(): Stat {
    const localTok = this.next();
    const line = this.line(localTok);
    if (this.is("function")) {
      this.next();
      const name = this.expectName("function name");
      const func = this.parseFuncBody(name, false, localTok);
      return { k: "LocalFunc", name, func, line };
    }
    const names: string[] = [];
    do {
      names.push(this.expectName("variable name"));
      if (this.is("<")) this.skipBalanced("<", ">"); // attributes like <const>
      if (this.accept(":")) this.skipType();
    } while (this.accept(","));
    const exprs = this.accept("=") ? this.parseExprList() : [];
    return { k: "Local", names, exprs, line };
  }

  private parseFunctionStat(): Stat {
    const fnTok = this.next();
    const line = this.line(fnTok);
    const first = this.t;
    let target: Expr = {
      k: "Name",
      name: this.expectName("function name"),
      line: this.line(first),
    };
    let fullName = (target as { name: string }).name;
    let method: string | undefined;
    while (this.is(".")) {
      this.next();
      const name = this.expectName("function name");
      target = { k: "Field", obj: target, name, line };
      fullName += `.${name}`;
    }
    if (this.accept(":")) {
      method = this.expectName("method name");
      fullName += `:${method}`;
    }
    const func = this.parseFuncBody(fullName, Boolean(method), fnTok);
    return { k: "FuncStat", target, method, func, line };
  }

  private parseFuncBody(name: string, isMethod: boolean, openTok: Token): FuncExpr {
    const line = this.line(openTok);
    if (this.is("<")) this.skipBalanced("<", ">");
    const parenTok = this.t;
    this.expect("(", "function");
    const params: string[] = isMethod ? ["self"] : [];
    let vararg = false;
    if (!this.is(")")) {
      do {
        if (this.is("...")) {
          this.next();
          vararg = true;
          if (this.accept(":")) this.skipType();
          break;
        }
        params.push(this.expectName("function parameter"));
        if (this.accept(":")) this.skipType();
      } while (this.accept(","));
    }
    this.expectMatch(")", "(", parenTok);
    if (this.accept(":")) this.skipType();
    const body = this.parseBlock();
    const endLine = this.line();
    this.closeBlock("function", openTok);
    return { k: "Func", params, vararg, body, name, line, endLine };
  }

  private parseIf(): Stat {
    const ifTok = this.next();
    const line = this.line(ifTok);
    const clauses: Array<{ cond: Expr; body: Block; line: number }> = [];
    let cond = this.parseExpr();
    let thenTok = this.t;
    this.expect("then", "if statement");
    clauses.push({ cond, body: this.parseBlock(), line });
    let otherwise: Block | undefined;
    while (true) {
      if (this.is("elseif")) {
        const eTok = this.next();
        cond = this.parseExpr();
        thenTok = this.t;
        this.expect("then", "elseif clause");
        clauses.push({ cond, body: this.parseBlock(), line: this.line(eTok) });
        continue;
      }
      if (this.is("else")) {
        thenTok = this.next();
        otherwise = this.parseBlock();
      }
      break;
    }
    if (!this.is("end")) {
      this.fail(
        `Expected 'end' (to close '${otherwise ? "else" : "then"}' at line ${this.line(thenTok)}), got ${describe(this.t)}`,
      );
    }
    this.next();
    return { k: "If", clauses, otherwise, line };
  }

  private parseFor(): Stat {
    const forTok = this.next();
    const line = this.line(forTok);
    const first = this.expectName("for loop");
    if (this.accept(":")) this.skipType();
    if (this.is("=")) {
      this.next();
      const start = this.parseExpr();
      this.expect(",", "numeric for loop");
      const limit = this.parseExpr();
      const step = this.accept(",") ? this.parseExpr() : undefined;
      const doTok = this.t;
      this.expect("do", "for loop");
      const body = this.parseBlock();
      this.closeBlock("do", doTok);
      return { k: "NumFor", varName: first, start, limit, step, body, line };
    }
    const names = [first];
    while (this.accept(",")) {
      names.push(this.expectName("for loop"));
      if (this.accept(":")) this.skipType();
    }
    this.expect("in", "for loop");
    const exprs = this.parseExprList();
    const doTok = this.t;
    this.expect("do", "for loop");
    const body = this.parseBlock();
    this.closeBlock("do", doTok);
    return { k: "GenFor", names, exprs, body, line };
  }

  private parseExprStatement(): Stat {
    const startTok = this.t;
    const line = this.line(startTok);
    const first = this.parseSuffixed();
    if (this.is("=") || this.is(",")) {
      const targets = [first];
      while (this.accept(",")) targets.push(this.parseSuffixed());
      for (const target of targets) this.checkAssignable(target, startTok);
      this.expect("=", "assignment");
      const exprs = this.parseExprList();
      return { k: "Assign", targets, exprs, line };
    }
    if (this.t.type === "symbol" && COMPOUND.has(this.t.value)) {
      const op = this.next().value.slice(0, -1);
      this.checkAssignable(first, startTok);
      const expr = this.parseExpr();
      return { k: "Compound", target: first, op, expr, line };
    }
    if (first.k === "Call" || first.k === "Method") return { k: "CallStat", call: first, line };
    this.fail("Incomplete statement: expected assignment or a function call", startTok);
  }

  private checkAssignable(e: Expr, tok: Token) {
    if (e.k !== "Name" && e.k !== "Field" && e.k !== "Index") {
      this.fail("Assigned expression must be a variable or a field", tok);
    }
  }

  // ---------------------------------------------------------------- expressions
  parseExprList(): Expr[] {
    const list = [this.parseExpr()];
    while (this.accept(",")) list.push(this.parseExpr());
    return list;
  }

  parseExpr(limit = 0): Expr {
    let left: Expr;
    const t = this.t;
    if (this.is("not") || this.is("-") || this.is("#")) {
      const op = this.next().value;
      const e = this.parseExpr(UNARY_PRIORITY);
      left = { k: "Un", op, e, line: this.line(t) };
    } else {
      left = this.parseSimple();
    }
    while (true) {
      const op = this.t.value;
      const pri =
        this.t.type === "symbol" || this.t.type === "keyword" ? BINARY_PRIORITY[op] : undefined;
      if (!pri || pri[0] <= limit) break;
      const opTok = this.next();
      const right = this.parseExpr(pri[1]);
      left = { k: "Bin", op, l: left, r: right, line: this.line(opTok) };
    }
    return left;
  }

  private parseSimple(): Expr {
    const t = this.t;
    const line = this.line(t);
    let e: Expr;
    switch (t.type) {
      case "number":
        this.next();
        e = { k: "Num", v: t.num!, line };
        break;
      case "string":
        this.next();
        e = { k: "Str", v: t.str!, line };
        break;
      case "interp": {
        this.next();
        const exprs = t.interp!.exprs.map((part) => {
          const sub = new Parser(lex(part.source), part.line - 1 + this.lineOffset);
          const expr = sub.parseExpr();
          if (sub.t.type !== "eof")
            sub.fail(`Malformed interpolated string, expected '}' got ${describe(sub.t)}`);
          return expr;
        });
        e = { k: "Interp", literals: t.interp!.literals, exprs, line };
        break;
      }
      default:
        if (this.is("nil")) {
          this.next();
          e = { k: "Nil", line };
        } else if (this.is("true")) {
          this.next();
          e = { k: "True", line };
        } else if (this.is("false")) {
          this.next();
          e = { k: "False", line };
        } else if (this.is("...")) {
          this.next();
          e = { k: "Vararg", line };
        } else if (this.is("{")) {
          e = this.parseTable();
        } else if (this.is("function")) {
          const fnTok = this.next();
          e = this.parseFuncBody("anonymous function", false, fnTok);
        } else if (this.is("if")) {
          e = this.parseIfExpr();
        } else {
          e = this.parseSuffixed();
        }
    }
    while (this.is("::")) {
      this.next();
      this.skipType();
    }
    return e;
  }

  private parseIfExpr(): Expr {
    const ifTok = this.next();
    const clauses: Array<[Expr, Expr]> = [];
    const cond = this.parseExpr();
    this.expect("then", "if-then-else expression");
    clauses.push([cond, this.parseExpr()]);
    while (this.is("elseif")) {
      this.next();
      const c = this.parseExpr();
      this.expect("then", "if-then-else expression");
      clauses.push([c, this.parseExpr()]);
    }
    this.expect("else", "if-then-else expression");
    const otherwise = this.parseExpr();
    return { k: "IfExpr", clauses, otherwise, line: this.line(ifTok) };
  }

  private parsePrimary(): Expr {
    const t = this.t;
    if (t.type === "name") {
      this.next();
      return { k: "Name", name: t.value, line: this.line(t) };
    }
    if (this.is("(")) {
      this.next();
      const e = this.parseExpr();
      this.expectMatch(")", "(", t);
      return { k: "Paren", e, line: this.line(t) };
    }
    if (this.is("!")) this.fail("Unexpected '!'; did you mean 'not'?");
    if (this.is("=")) this.fail(`Expected identifier when parsing expression, got '='`);
    this.fail(`Expected identifier when parsing expression, got ${describe(t)}`);
  }

  private parseSuffixed(): Expr {
    let e = this.parsePrimary();
    while (true) {
      const t = this.t;
      const line = this.line(t);
      if (this.is(".")) {
        this.next();
        const name = this.expectName("expression");
        e = { k: "Field", obj: e, name, line };
      } else if (this.is("[")) {
        this.next();
        const key = this.parseExpr();
        this.expectMatch("]", "[", t);
        e = { k: "Index", obj: e, key, line };
      } else if (this.is(":")) {
        this.next();
        const name = this.expectName("method name");
        const args = this.parseArgs();
        e = { k: "Method", obj: e, name, args, line };
      } else if (
        this.is("(") ||
        this.is("{") ||
        this.t.type === "string" ||
        this.t.type === "interp"
      ) {
        const args = this.parseArgs();
        e = { k: "Call", fn: e, args, line };
      } else {
        return e;
      }
    }
  }

  private parseArgs(): Expr[] {
    const t = this.t;
    if (t.type === "string") {
      this.next();
      return [{ k: "Str", v: t.str!, line: this.line(t) }];
    }
    if (t.type === "interp") return [this.parseSimple()];
    if (this.is("{")) return [this.parseTable()];
    if (!this.is("("))
      this.fail(`Expected '(', '{' or <string> when parsing function call, got ${describe(t)}`);
    this.next();
    if (this.is(")")) {
      this.next();
      return [];
    }
    const args = this.parseExprList();
    this.expectMatch(")", "(", t);
    return args;
  }

  private parseTable(): Expr {
    const open = this.next();
    const items: TableItem[] = [];
    while (!this.is("}")) {
      if (this.is("[")) {
        const bt = this.next();
        const key = this.parseExpr();
        this.expectMatch("]", "[", bt);
        this.expect("=", "table field");
        items.push({ type: "expr", key, value: this.parseExpr() });
      } else if (
        this.t.type === "name" &&
        this.peekTok().value === "=" &&
        this.peekTok().type === "symbol"
      ) {
        const key = this.next().value;
        this.next();
        items.push({ type: "named", key, value: this.parseExpr() });
      } else {
        items.push({ type: "pos", value: this.parseExpr() });
      }
      if (!this.accept(",") && !this.accept(";")) break;
    }
    this.expectMatch("}", "{", open);
    return { k: "Table", items, line: this.line(open) };
  }
}

export interface ParseResult {
  chunk?: Chunk;
  error?: { message: string; line: number; column: number };
}

export function parse(source: string): ParseResult {
  try {
    const parser = new Parser(lex(source));
    return { chunk: parser.parseChunk() };
  } catch (err) {
    if (err instanceof LuauSyntaxError) {
      return { error: { message: err.message, line: err.line, column: err.column } };
    }
    throw err;
  }
}
