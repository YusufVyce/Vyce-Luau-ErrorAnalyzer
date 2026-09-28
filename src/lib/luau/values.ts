/**
 * Runtime value model for the Luau interpreter.
 *   nil -> undefined, boolean/number/string -> JS primitives,
 *   table -> LuaTable, function -> LuaFunction, userdata -> Userdata subclasses.
 */

export type Signal =
  | { t: "wait"; d: number }
  | { t: "signal"; signal: SignalWaitable }
  | { t: "coyield"; values: unknown[] };

export interface SignalWaitable {
  addWaiter(resume: (args: unknown[]) => void): void;
}

export type LuaGen<T = unknown> = Generator<Signal, T, unknown>;

export class LuaError extends Error {
  /** The Lua error value (usually a string with "Path:line: " prefix). */
  value: unknown;
  traceback: string[] = [];
  constructor(value: unknown) {
    super(typeof value === "string" ? value : "error object");
    this.value = value;
  }
}

let nextId = 1;
export function uniqueAddress(): string {
  nextId += 7919;
  return `0x${(0x1a2b0000 + nextId).toString(16).padStart(16, "0")}`;
}

export class LuaTable {
  arr: unknown[] = [];
  hash = new Map<unknown, unknown>();
  metatable?: LuaTable;
  frozen = false;
  readonly address = uniqueAddress();

  static from(items: unknown[]): LuaTable {
    const t = new LuaTable();
    for (const item of items) t.arr.push(item);
    while (t.arr.length && t.arr[t.arr.length - 1] === undefined) t.arr.pop();
    return t;
  }

  static fromRecord(rec: Record<string, unknown>): LuaTable {
    const t = new LuaTable();
    for (const [k, v] of Object.entries(rec)) t.set(k, v);
    return t;
  }

  get(key: unknown): unknown {
    if (typeof key === "number") {
      if (Number.isInteger(key) && key >= 1 && key <= this.arr.length) return this.arr[key - 1];
      if (Object.is(key, -0)) key = 0;
    }
    return this.hash.get(key);
  }

  set(key: unknown, value: unknown): void {
    if (typeof key === "number") {
      if (Object.is(key, -0)) key = 0;
      const k = key as number;
      if (Number.isInteger(k) && k >= 1) {
        if (k <= this.arr.length) {
          this.arr[k - 1] = value;
          if (value === undefined && k === this.arr.length) {
            while (this.arr.length && this.arr[this.arr.length - 1] === undefined) this.arr.pop();
          }
          return;
        }
        if (k === this.arr.length + 1) {
          if (value === undefined) {
            this.hash.delete(k);
            return;
          }
          this.arr.push(value);
          this.hash.delete(k);
          while (this.hash.has(this.arr.length + 1)) {
            const nk = this.arr.length + 1;
            this.arr.push(this.hash.get(nk));
            this.hash.delete(nk);
          }
          return;
        }
      }
    }
    if (value === undefined) this.hash.delete(key);
    else this.hash.set(key, value);
  }

  length(): number {
    return this.arr.length;
  }

  /** Snapshot of all non-nil key/value pairs in iteration order. */
  entries(): Array<[unknown, unknown]> {
    const out: Array<[unknown, unknown]> = [];
    this.arr.forEach((v, i) => {
      if (v !== undefined) out.push([i + 1, v]);
    });
    for (const [k, v] of this.hash) if (v !== undefined) out.push([k, v]);
    return out;
  }

  next(key: unknown): [unknown, unknown] | undefined {
    const entries = this.entries();
    if (key === undefined) return entries[0];
    const idx = entries.findIndex(([k]) => k === key || (Number.isNaN(k) && Number.isNaN(key)));
    if (idx === -1) throw new LuaError("invalid key to 'next'");
    return entries[idx + 1];
  }
}

export type NativeImpl = (args: unknown[], interp: InterpreterLike) => LuaGen<unknown[]>;

export class LuaFunction {
  readonly address = uniqueAddress();
  constructor(
    public name: string,
    public impl: NativeImpl,
    public isNative = true,
    /** Script that defined the function (closures only). */
    public script?: ScriptContext,
  ) {}
}

/** Wraps a plain JS function as a Lua native. Return an array for multiple values. */
export function native(
  name: string,
  fn: (args: unknown[], interp: InterpreterLike) => unknown[] | unknown,
): LuaFunction {
  // eslint-disable-next-line require-yield
  return new LuaFunction(name, function* (args, interp) {
    const r = fn(args, interp);
    return Array.isArray(r) ? r : [r];
  });
}

/** Wraps a generator-based native (may yield). */
export function nativeGen(name: string, fn: NativeImpl): LuaFunction {
  return new LuaFunction(name, fn);
}

export abstract class Userdata {
  abstract readonly luaType: string;
  abstract luaIndex(key: unknown, interp: InterpreterLike): unknown;
  luaNewIndex(key: unknown, _value: unknown, _interp: InterpreterLike): void {
    throw new LuaError(`${String(key)} cannot be assigned to`);
  }
  luaToString(): string {
    return this.luaType;
  }
  /** Arithmetic hook; return undefined if unsupported. */
  luaArith(_op: string, _other: unknown, _selfIsLeft: boolean): unknown {
    return undefined;
  }
  luaEq(other: unknown): boolean {
    return other === this;
  }
}

export interface ScriptContext {
  path: string;
  name: string;
  kind: "Script" | "LocalScript" | "ModuleScript";
  side: "server" | "client";
  /** The Roblox Script instance (Userdata) for `script`. */
  instance?: unknown;
  /** Player whose client runs this LocalScript. */
  player?: unknown;
  /** Set when the script instance is destroyed: its threads stop. */
  killed?: boolean;
}

export interface Frame {
  name: string;
  script?: ScriptContext;
  line: number;
}

/** The parts of the interpreter that natives need. Implemented by Interpreter. */
export interface InterpreterLike {
  call(fn: unknown, args: unknown[]): LuaGen<unknown[]>;
  index(obj: unknown, key: unknown): LuaGen<unknown>;
  tostring(v: unknown): LuaGen<string>;
  error(message: string, level?: number): LuaError;
  now(): number;
  currentScript(): ScriptContext | undefined;
  print(kind: "print" | "warn" | "info", text: string): void;
  spawnThread(
    fn: unknown,
    args: unknown[],
    mode: "now" | "defer" | "delay",
    delay?: number,
  ): LuaGen<unknown>;
  schedule(delay: number, cb: () => void): void;
  frames(): Frame[];
}

export function isTruthy(v: unknown): boolean {
  return v !== undefined && v !== false;
}

export function luaTypeOf(v: unknown): string {
  if (v === undefined) return "nil";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return "number";
  if (typeof v === "string") return "string";
  if (v instanceof LuaTable) return "table";
  if (v instanceof LuaFunction) return "function";
  if (v instanceof Coroutine) return "thread";
  return "userdata";
}

/** Roblox's `typeof`: userdata report their class-like type (Instance, Vector3…). */
export function robloxTypeOf(v: unknown): string {
  if (v instanceof Userdata) return v.luaType;
  return luaTypeOf(v);
}

export function formatNumber(n: number): string {
  if (Number.isNaN(n)) return "nan";
  if (n === Infinity) return "inf";
  if (n === -Infinity) return "-inf";
  if (Object.is(n, -0)) return "-0";
  return String(n);
}

export class Coroutine {
  readonly address = uniqueAddress();
  status: "suspended" | "running" | "normal" | "dead" = "suspended";
  gen?: LuaGen<unknown[]>;
  started = false;
  frames: Frame[] = [];
  /** true when the scheduler owns this coroutine (it yielded with task.wait etc). */
  scheduled = false;
  constructor(public fn: unknown) {}
}
