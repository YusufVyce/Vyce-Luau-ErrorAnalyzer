/**
 * Luau lexer used by the in-browser interpreter. Produces tokens with 1-based
 * line/column positions and Roblox-style error messages.
 */

export type TokenType = "name" | "keyword" | "number" | "string" | "interp" | "symbol" | "eof";

export interface InterpPart {
  /** Literal text segments and raw source of `{expr}` segments, alternating. */
  literals: string[];
  exprs: Array<{ source: string; line: number; column: number }>;
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  /** Parsed number / string value. */
  num?: number;
  str?: string;
  interp?: InterpPart;
}

export class LuauSyntaxError extends Error {
  line: number;
  column: number;
  constructor(message: string, line: number, column: number) {
    super(message);
    this.line = line;
    this.column = column;
  }
}

export const KEYWORDS = new Set([
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while",
]);

const SYMBOLS = [
  "...",
  "//=",
  "..=",
  "==",
  "~=",
  "<=",
  ">=",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "^=",
  "//",
  "..",
  "::",
  "->",
  "+",
  "-",
  "*",
  "/",
  "%",
  "^",
  "#",
  "&",
  "|",
  "~",
  "<",
  ">",
  "=",
  "(",
  ")",
  "{",
  "}",
  "[",
  "]",
  ";",
  ":",
  ",",
  ".",
  "?",
  "!",
  "@",
];

export function lex(source: string): Token[] {
  const src = source.replace(/\r\n?/g, "\n");
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const peek = (o = 0) => src[i + o] ?? "";
  const advance = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (src[i] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  };

  const longBracketLevel = (at: number): number => {
    if (src[at] !== "[") return -1;
    let j = at + 1;
    let level = 0;
    while (src[j] === "=") {
      level++;
      j++;
    }
    return src[j] === "[" ? level : -1;
  };

  const readLong = (level: number, startLine: number, startCol: number, what: string): string => {
    advance(level + 2);
    const close = `]${"=".repeat(level)}]`;
    const end = src.indexOf(close, i);
    if (end === -1) throw new LuauSyntaxError(`Unfinished long ${what}`, startLine, startCol);
    let text = src.slice(i, end);
    if (text.startsWith("\n")) text = text.slice(1);
    advance(end - i + close.length);
    return text;
  };

  const readEscape = (startLine: number, startCol: number): string => {
    // at backslash
    advance();
    const c = peek();
    const simple: Record<string, string> = {
      n: "\n",
      t: "\t",
      r: "\r",
      a: "\x07",
      b: "\b",
      f: "\f",
      v: "\v",
      "\\": "\\",
      '"': '"',
      "'": "'",
      "`": "`",
      "{": "{",
      "\n": "\n",
    };
    if (c in simple) {
      advance();
      return simple[c];
    }
    if (c === "x") {
      const hex = src.slice(i + 1, i + 3);
      if (!/^[0-9a-fA-F]{2}$/.test(hex))
        throw new LuauSyntaxError("Invalid hexadecimal escape sequence", startLine, startCol);
      advance(3);
      return String.fromCharCode(parseInt(hex, 16));
    }
    if (c === "z") {
      advance();
      while (/\s/.test(peek())) advance();
      return "";
    }
    if (c === "u") {
      const m = src.slice(i).match(/^u\{([0-9a-fA-F]+)\}/);
      if (!m) throw new LuauSyntaxError("Invalid unicode escape sequence", startLine, startCol);
      advance(m[0].length);
      return String.fromCodePoint(parseInt(m[1], 16));
    }
    if (/[0-9]/.test(c)) {
      const m = src.slice(i).match(/^[0-9]{1,3}/)!;
      advance(m[0].length);
      return String.fromCharCode(Number(m[0]));
    }
    throw new LuauSyntaxError("Invalid escape sequence", startLine, startCol);
  };

  while (i < src.length) {
    const c = peek();
    if (c === " " || c === "\t" || c === "\n" || c === "\f" || c === "\v") {
      advance();
      continue;
    }
    const startLine = line;
    const startCol = col;

    // comments
    if (c === "-" && peek(1) === "-") {
      advance(2);
      const level = longBracketLevel(i);
      if (level >= 0) {
        readLong(level, startLine, startCol, "comment");
      } else {
        while (i < src.length && peek() !== "\n") advance();
      }
      continue;
    }

    // names / keywords
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const word = src.slice(i, j);
      advance(j - i);
      tokens.push({
        type: KEYWORDS.has(word) ? "keyword" : "name",
        value: word,
        line: startLine,
        column: startCol,
      });
      continue;
    }

    // numbers
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(peek(1)))) {
      const rest = src.slice(i);
      const m =
        rest.match(/^0[xX][0-9a-fA-F_]+/) ??
        rest.match(/^0[bB][01_]+/) ??
        rest.match(/^(?:[0-9][0-9_]*(?:\.[0-9_]*)?|\.[0-9][0-9_]*)(?:[eE][+-]?[0-9_]+)?/);
      const raw = m![0];
      const next = src[i + raw.length] ?? "";
      if (/[A-Za-z_.]/.test(next) && !(next === "." && src[i + raw.length + 1] === ".")) {
        throw new LuauSyntaxError(`Malformed number near '${raw}${next}'`, startLine, startCol);
      }
      const clean = raw.replace(/_/g, "");
      const num = /^0[xX]/.test(clean)
        ? parseInt(clean.slice(2), 16)
        : /^0[bB]/.test(clean)
          ? parseInt(clean.slice(2), 2)
          : Number(clean);
      advance(raw.length);
      tokens.push({ type: "number", value: raw, num, line: startLine, column: startCol });
      continue;
    }

    // quoted strings
    if (c === '"' || c === "'") {
      advance();
      let out = "";
      while (true) {
        const ch = peek();
        if (ch === "" || ch === "\n")
          throw new LuauSyntaxError(
            "Malformed string; did you forget to finish it?",
            startLine,
            startCol,
          );
        if (ch === c) {
          advance();
          break;
        }
        if (ch === "\\") {
          out += readEscape(startLine, startCol);
          continue;
        }
        out += ch;
        advance();
      }
      tokens.push({ type: "string", value: out, str: out, line: startLine, column: startCol });
      continue;
    }

    // long strings
    if (c === "[") {
      const level = longBracketLevel(i);
      if (level >= 0) {
        const text = readLong(level, startLine, startCol, "string");
        tokens.push({ type: "string", value: text, str: text, line: startLine, column: startCol });
        continue;
      }
    }

    // interpolated strings
    if (c === "`") {
      advance();
      const literals: string[] = [];
      const exprs: InterpPart["exprs"] = [];
      let cur = "";
      while (true) {
        const ch = peek();
        if (ch === "")
          throw new LuauSyntaxError(
            "Malformed interpolated string; did you forget to add a '`'?",
            startLine,
            startCol,
          );
        if (ch === "`") {
          advance();
          break;
        }
        if (ch === "\\") {
          cur += readEscape(startLine, startCol);
          continue;
        }
        if (ch === "{") {
          literals.push(cur);
          cur = "";
          advance();
          const exprLine = line;
          const exprCol = col;
          let depth = 1;
          let j = i;
          let quote: string | null = null;
          while (j < src.length) {
            const d = src[j];
            if (quote) {
              if (d === "\\") j++;
              else if (d === quote) quote = null;
            } else if (d === '"' || d === "'") quote = d;
            else if (d === "{") depth++;
            else if (d === "}") {
              depth--;
              if (depth === 0) break;
            }
            j++;
          }
          if (depth !== 0)
            throw new LuauSyntaxError(
              "Malformed interpolated string; did you forget to add a '}'?",
              startLine,
              startCol,
            );
          const exprSource = src.slice(i, j);
          if (!exprSource.trim())
            throw new LuauSyntaxError(
              "Malformed interpolated string, expected expression inside '{}'",
              exprLine,
              exprCol,
            );
          exprs.push({ source: exprSource, line: exprLine, column: exprCol });
          advance(j - i + 1);
          continue;
        }
        cur += ch;
        advance();
      }
      literals.push(cur);
      tokens.push({
        type: "interp",
        value: "`",
        interp: { literals, exprs },
        line: startLine,
        column: startCol,
      });
      continue;
    }

    const sym = SYMBOLS.find((s) => src.startsWith(s, i));
    if (sym) {
      advance(sym.length);
      tokens.push({ type: "symbol", value: sym, line: startLine, column: startCol });
      continue;
    }
    throw new LuauSyntaxError(`Unexpected character '${c}'`, startLine, startCol);
  }
  tokens.push({ type: "eof", value: "<eof>", line, column: col });
  return tokens;
}
