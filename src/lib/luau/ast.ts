/** AST for the executable Luau subset. Every node carries the source line. */

export type Expr =
  | { k: "Nil"; line: number }
  | { k: "True"; line: number }
  | { k: "False"; line: number }
  | { k: "Num"; v: number; line: number }
  | { k: "Str"; v: string; line: number }
  | { k: "Vararg"; line: number }
  | { k: "Interp"; literals: string[]; exprs: Expr[]; line: number }
  | {
      k: "Func";
      params: string[];
      vararg: boolean;
      body: Block;
      name: string;
      line: number;
      endLine: number;
    }
  | { k: "Table"; items: TableItem[]; line: number }
  | { k: "Bin"; op: string; l: Expr; r: Expr; line: number }
  | { k: "Un"; op: string; e: Expr; line: number }
  | { k: "Name"; name: string; line: number }
  | { k: "Index"; obj: Expr; key: Expr; line: number }
  | { k: "Field"; obj: Expr; name: string; line: number }
  | { k: "Call"; fn: Expr; args: Expr[]; line: number }
  | { k: "Method"; obj: Expr; name: string; args: Expr[]; line: number }
  | { k: "Paren"; e: Expr; line: number }
  | { k: "IfExpr"; clauses: Array<[Expr, Expr]>; otherwise: Expr; line: number };

export type TableItem =
  | { type: "pos"; value: Expr }
  | { type: "named"; key: string; value: Expr }
  | { type: "expr"; key: Expr; value: Expr };

export type Stat =
  | { k: "Local"; names: string[]; exprs: Expr[]; line: number }
  | { k: "LocalFunc"; name: string; func: Extract<Expr, { k: "Func" }>; line: number }
  | {
      k: "FuncStat";
      target: Expr;
      method?: string;
      func: Extract<Expr, { k: "Func" }>;
      line: number;
    }
  | { k: "Assign"; targets: Expr[]; exprs: Expr[]; line: number }
  | { k: "Compound"; target: Expr; op: string; expr: Expr; line: number }
  | { k: "CallStat"; call: Expr; line: number }
  | { k: "Do"; body: Block; line: number }
  | { k: "While"; cond: Expr; body: Block; line: number }
  | { k: "Repeat"; body: Block; cond: Expr; line: number }
  | {
      k: "If";
      clauses: Array<{ cond: Expr; body: Block; line: number }>;
      otherwise?: Block;
      line: number;
    }
  | {
      k: "NumFor";
      varName: string;
      start: Expr;
      limit: Expr;
      step?: Expr;
      body: Block;
      line: number;
    }
  | { k: "GenFor"; names: string[]; exprs: Expr[]; body: Block; line: number }
  | { k: "Return"; exprs: Expr[]; line: number }
  | { k: "Break"; line: number }
  | { k: "Continue"; line: number }
  | { k: "Nop"; line: number };

export type Block = Stat[];

export interface Chunk {
  body: Block;
}
