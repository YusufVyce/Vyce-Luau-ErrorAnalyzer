/**
 * Luau standard library for the simulator: globals, string, math, table,
 * os, coroutine, task, utf8. Argument errors use Luau's wording, e.g.
 *   invalid argument #1 to 'ipairs' (table expected, got nil)
 */
import {
  Interpreter,
  registerIterators,
  ThreadHandle,
  TimeoutError,
  toNumber,
} from "./interpreter";
import { expandReplacement, gmatchIter, gsubCore, strFind } from "./patterns";
import {
  Coroutine,
  formatNumber,
  isTruthy,
  LuaError,
  LuaFunction,
  LuaTable,
  luaTypeOf,
  native,
  nativeGen,
  robloxTypeOf,
  type InterpreterLike,
  type LuaGen,
} from "./values";

function argError(interp: InterpreterLike, n: number, fname: string, msg: string): LuaError {
  return interp.error(`invalid argument #${n} to '${fname}' (${msg})`);
}

export function checkNumber(
  interp: InterpreterLike,
  args: unknown[],
  i: number,
  fname: string,
  optional?: number,
): number {
  const v = args[i];
  if (v === undefined && optional !== undefined) return optional;
  const n = toNumber(v);
  if (n === undefined) {
    if (i >= args.length)
      throw interp.error(`missing argument #${i + 1} to '${fname}' (number expected)`);
    throw argError(interp, i + 1, fname, `number expected, got ${robloxTypeOf(v)}`);
  }
  return n;
}

export function checkInt(
  interp: InterpreterLike,
  args: unknown[],
  i: number,
  fname: string,
  optional?: number,
): number {
  const n = checkNumber(interp, args, i, fname, optional);
  return Math.trunc(n);
}

export function checkString(
  interp: InterpreterLike,
  args: unknown[],
  i: number,
  fname: string,
  optional?: string,
): string {
  const v = args[i];
  if (v === undefined && optional !== undefined) return optional;
  if (typeof v === "string") return v;
  if (typeof v === "number") return formatNumber(v);
  if (i >= args.length)
    throw interp.error(`missing argument #${i + 1} to '${fname}' (string expected)`);
  throw argError(interp, i + 1, fname, `string expected, got ${robloxTypeOf(v)}`);
}

export function checkTable(
  interp: InterpreterLike,
  args: unknown[],
  i: number,
  fname: string,
): LuaTable {
  const v = args[i];
  if (v instanceof LuaTable) return v;
  if (i >= args.length)
    throw interp.error(`missing argument #${i + 1} to '${fname}' (table expected)`);
  throw argError(interp, i + 1, fname, `table expected, got ${robloxTypeOf(v)}`);
}

function lib(entries: Record<string, LuaFunction | unknown>): LuaTable {
  const t = new LuaTable();
  for (const [k, v] of Object.entries(entries)) t.set(k, v);
  return t;
}

function* joinToString(interp: InterpreterLike, args: unknown[]): LuaGen<string> {
  const parts: string[] = [];
  for (const a of args) parts.push(yield* interp.tostring(a));
  return parts.join(" ");
}

// Deterministic PRNG (mulberry32) so simulations are reproducible.
function makeRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strIndex(len: number, i: number): number {
  if (i < 0) return Math.max(len + i, 0);
  return i === 0 ? 0 : i - 1;
}

function* formatImpl(interp: InterpreterLike, args: unknown[]): LuaGen<string> {
  const fmt = checkString(interp, args, 0, "format");
  let out = "";
  let argi = 1;
  const re = /%([-+ #0]*)(\d*)(?:\.(\d*))?([diouxXeEfgGqscaA%])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fmt))) {
    out += fmt.slice(last, m.index);
    last = re.lastIndex;
    const [, flags, widthS, precS, conv] = m;
    if (conv === "%") {
      out += "%";
      continue;
    }
    const argNo = argi + 1;
    const v = args[argi++];
    let piece: string;
    const prec = precS === undefined ? undefined : Number(precS || 0);
    switch (conv) {
      case "d":
      case "i":
      case "u": {
        const n = toNumber(v);
        if (n === undefined) {
          if (v === undefined && argi - 1 >= args.length)
            throw interp.error(`missing argument #${argNo} to 'format' (number expected)`);
          throw argError(interp, argNo, "format", `number expected, got ${robloxTypeOf(v)}`);
        }
        if (!Number.isInteger(n))
          throw argError(interp, argNo, "format", "number has no integer representation");
        piece = String(Math.abs(n));
        if (prec !== undefined) piece = piece.padStart(prec, "0");
        if (n < 0) piece = "-" + piece;
        else if (flags.includes("+")) piece = "+" + piece;
        else if (flags.includes(" ")) piece = " " + piece;
        break;
      }
      case "x":
      case "X":
      case "o": {
        const n = toNumber(v);
        if (n === undefined)
          throw argError(interp, argNo, "format", `number expected, got ${robloxTypeOf(v)}`);
        piece = Math.trunc(n).toString(conv === "o" ? 8 : 16);
        if (conv === "X") piece = piece.toUpperCase();
        break;
      }
      case "c":
        piece = String.fromCharCode(checkNumber(interp, args, argi - 1, "format"));
        break;
      case "e":
      case "E":
      case "f":
      case "g":
      case "G":
      case "a":
      case "A": {
        const n = toNumber(v);
        if (n === undefined)
          throw argError(interp, argNo, "format", `number expected, got ${robloxTypeOf(v)}`);
        const p = prec ?? 6;
        if (!Number.isFinite(n)) piece = Number.isNaN(n) ? "nan" : n > 0 ? "inf" : "-inf";
        else if (conv === "f") piece = n.toFixed(p);
        else if (conv === "e" || conv === "E")
          piece = n.toExponential(p).replace(/e([+-])(\d)$/, "e$10$2");
        else {
          piece = Number(n.toPrecision(p || 1)).toString();
          if (piece.includes("e")) piece = piece.replace(/e([+-])(\d)$/, "e$10$2");
        }
        if (conv === "E" || conv === "G") piece = piece.toUpperCase();
        if (n >= 0 && flags.includes("+")) piece = "+" + piece;
        break;
      }
      case "q": {
        const s = checkString(interp, args, argi - 1, "format");
        piece = `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\0/g, "\\0")}"`;
        break;
      }
      default: {
        // %s
        if (v === undefined && argi - 1 >= args.length)
          throw interp.error(`missing argument #${argNo} to 'format' (string expected)`);
        piece = yield* interp.tostring(v);
        if (prec !== undefined) piece = piece.slice(0, prec);
      }
    }
    const width = Number(widthS || 0);
    if (piece.length < width) {
      if (flags.includes("-")) piece = piece.padEnd(width);
      else if (flags.includes("0") && /[dioxXeEfgG]/.test(conv)) {
        const sign = /^[+-]/.test(piece) ? piece[0] : "";
        piece = sign + piece.slice(sign.length).padStart(width - sign.length, "0");
      } else piece = piece.padStart(width);
    }
    out += piece;
  }
  return out + fmt.slice(last);
}

function* sortImpl(interp: InterpreterLike, list: unknown[], cmp: unknown): LuaGen<unknown[]> {
  const less = function* (a: unknown, b: unknown): LuaGen<boolean> {
    if (cmp !== undefined) return isTruthy((yield* interp.call(cmp, [a, b]))[0]);
    if (typeof a === "number" && typeof b === "number") return a < b;
    if (typeof a === "string" && typeof b === "string") return a < b;
    throw interp.error(`attempt to compare ${robloxTypeOf(a)} < ${robloxTypeOf(b)}`);
  };
  // merge sort (stable, generator-friendly)
  const merge = function* (arr: unknown[]): LuaGen<unknown[]> {
    if (arr.length <= 1) return arr;
    const mid = arr.length >> 1;
    const left = yield* merge(arr.slice(0, mid));
    const right = yield* merge(arr.slice(mid));
    const out: unknown[] = [];
    let i = 0;
    let j = 0;
    while (i < left.length && j < right.length) {
      if (yield* less(right[j], left[i])) out.push(right[j++]);
      else out.push(left[i++]);
    }
    return out.concat(left.slice(i), right.slice(j));
  };
  return yield* merge(list);
}

export function installStdlib(interp: Interpreter, options: { randomSeed?: number } = {}) {
  const G = interp.builtins;
  const rng = { next: makeRandom(options.randomSeed ?? 20240607) };

  const nextFn = native("next", (args, I) => {
    const t = checkTable(I, args, 0, "next");
    const r = t.next(args[1]);
    return r ? [r[0], r[1]] : [undefined];
  });
  const ipairsIter = native("ipairs_iter", (args) => {
    const t = args[0] as LuaTable;
    const i = (args[1] as number) + 1;
    const v = t.get(i);
    return v === undefined ? [undefined] : [i, v];
  });
  registerIterators(nextFn, ipairsIter);

  const printFn = nativeGen("print", function* (args, I) {
    I.print("print", yield* joinToString(I, args));
    return [];
  });
  const warnFn = nativeGen("warn", function* (args, I) {
    I.print("warn", yield* joinToString(I, args));
    return [];
  });

  const pcallFn = nativeGen("pcall", function* (args, I) {
    if (args.length === 0) throw I.error("missing argument #1 to 'pcall' (value expected)");
    const [f, ...rest] = args;
    try {
      const r = yield* I.call(f, rest);
      return [true, ...r];
    } catch (e) {
      if (e instanceof TimeoutError) throw e;
      if (e instanceof LuaError) return [false, e.value];
      if (e instanceof RangeError) return [false, "stack overflow"];
      throw e;
    }
  });

  const xpcallFn = nativeGen("xpcall", function* (args, I) {
    const [f, handler, ...rest] = args;
    try {
      const r = yield* I.call(f, rest);
      return [true, ...r];
    } catch (e) {
      if (e instanceof TimeoutError) throw e;
      if (!(e instanceof LuaError) && !(e instanceof RangeError)) throw e;
      const value = e instanceof LuaError ? e.value : "stack overflow";
      const hr = yield* I.call(handler, [value]);
      return [false, ...hr];
    }
  });

  const errorFn = native("error", (args, I) => {
    const msg = args[0];
    const level = args[1] === undefined ? 1 : Number(args[1]);
    if (typeof msg === "string" && level > 0) throw I.error(msg, level);
    const err = new LuaError(msg);
    err.traceback = (I as Interpreter).traceback();
    throw err;
  });

  const assertFn = native("assert", (args, I) => {
    if (args.length === 0) throw I.error("missing argument #1 to 'assert' (value expected)");
    if (!isTruthy(args[0])) {
      if (args.length > 1) {
        const err = new LuaError(args[1]);
        err.traceback = (I as Interpreter).traceback();
        throw err;
      }
      throw I.error("assertion failed!");
    }
    return args;
  });

  const tostringFn = nativeGen("tostring", function* (args, I) {
    return [yield* I.tostring(args[0])];
  });

  const tonumberFn = native("tonumber", (args) => {
    const [v, base] = args;
    if (base === undefined) return [toNumber(v)];
    const s = String(v).trim().toLowerCase();
    const b = Number(base);
    if (!/^-?[0-9a-z]+$/.test(s)) return [undefined];
    const n = parseInt(s, b);
    return [
      Number.isNaN(n) || [...s.replace("-", "")].some((ch) => parseInt(ch, 36) >= b)
        ? undefined
        : n,
    ];
  });

  const selectFn = native("select", (args, I) => {
    const n = args[0];
    if (n === "#") return [args.length - 1];
    const i = checkNumber(I, args, 0, "select");
    if (i < 0) return args.slice(args.length + i);
    if (i === 0) throw argError(I, 1, "select", "index out of range");
    return args.slice(i);
  });

  const setmetatableFn = native("setmetatable", (args, I) => {
    const t = checkTable(I, args, 0, "setmetatable");
    const mt = args[1];
    if (mt !== undefined && !(mt instanceof LuaTable))
      throw argError(I, 2, "setmetatable", "nil or table expected");
    if (t.metatable?.get("__metatable") !== undefined)
      throw I.error("cannot change a protected metatable");
    t.metatable = mt as LuaTable | undefined;
    return [t];
  });

  const getmetatableFn = native("getmetatable", (args) => {
    const t = args[0];
    if (!(t instanceof LuaTable) || !t.metatable) return [undefined];
    const protectedMt = t.metatable.get("__metatable");
    return [protectedMt !== undefined ? protectedMt : t.metatable];
  });

  const unpackFn = native("unpack", (args, I) => {
    const t = checkTable(I, args, 0, "unpack");
    const i = checkInt(I, args, 1, "unpack", 1);
    const j = checkInt(I, args, 2, "unpack", t.length());
    const out: unknown[] = [];
    for (let k = i; k <= j; k++) out.push(t.get(k));
    return out;
  });

  const shared = new LuaTable();

  const globals: Record<string, unknown> = {
    print: printFn,
    warn: warnFn,
    error: errorFn,
    assert: assertFn,
    pcall: pcallFn,
    xpcall: xpcallFn,
    tostring: tostringFn,
    tonumber: tonumberFn,
    type: native("type", (args, I) => {
      if (args.length === 0) throw I.error("missing argument #1 to 'type' (value expected)");
      return [luaTypeOf(args[0])];
    }),
    typeof: native("typeof", (args, I) => {
      if (args.length === 0) throw I.error("missing argument #1 to 'typeof' (value expected)");
      return [robloxTypeOf(args[0])];
    }),
    select: selectFn,
    next: nextFn,
    pairs: native("pairs", (args, I) => [nextFn, checkTable(I, args, 0, "pairs"), undefined]),
    ipairs: native("ipairs", (args, I) => [ipairsIter, checkTable(I, args, 0, "ipairs"), 0]),
    rawget: native("rawget", (args, I) => [checkTable(I, args, 0, "rawget").get(args[1])]),
    rawset: native("rawset", (args, I) => {
      const t = checkTable(I, args, 0, "rawset");
      t.set(args[1], args[2]);
      return [t];
    }),
    rawequal: native("rawequal", (args) => [args[0] === args[1]]),
    rawlen: native("rawlen", (args, I) => {
      const v = args[0];
      if (typeof v === "string") return [v.length];
      return [checkTable(I, args, 0, "rawlen").length()];
    }),
    setmetatable: setmetatableFn,
    getmetatable: getmetatableFn,
    unpack: unpackFn,
    _G: shared,
    shared,
    _VERSION: "Luau",
    gcinfo: native("gcinfo", () => [1024]),
    collectgarbage: native("collectgarbage", (args) => [args[0] === "count" ? 1024 : 0]),
    tick: native("tick", (_a, I) => [1_760_000_000 + I.now()]),
    time: native("time", (_a, I) => [I.now()]),
    elapsedTime: native("elapsedTime", (_a, I) => [I.now()]),
    wait: nativeGen("wait", function* (args, I) {
      const d = Math.max(toNumber(args[0]) ?? 0.03, 0.03);
      const start = I.now();
      yield { t: "wait", d };
      return [I.now() - start, I.now()];
    }),
    spawn: nativeGen("spawn", function* (args, I) {
      yield* I.spawnThread(args[0], [], "delay", 0.03);
      return [];
    }),
    delay: nativeGen("delay", function* (args, I) {
      yield* I.spawnThread(args[1], [], "delay", toNumber(args[0]) ?? 0.03);
      return [];
    }),
  };
  for (const [k, v] of Object.entries(globals)) G.set(k, v);

  // ---------------------------------------------------------------- string
  const stringLib = lib({
    len: native("len", (a, I) => [checkString(I, a, 0, "len").length]),
    upper: native("upper", (a, I) => [checkString(I, a, 0, "upper").toUpperCase()]),
    lower: native("lower", (a, I) => [checkString(I, a, 0, "lower").toLowerCase()]),
    reverse: native("reverse", (a, I) => [[...checkString(I, a, 0, "reverse")].reverse().join("")]),
    rep: native("rep", (a, I) => {
      const s = checkString(I, a, 0, "rep");
      const n = checkInt(I, a, 1, "rep");
      const sep = checkString(I, a, 2, "rep", "");
      if (n <= 0) return [""];
      if (s.length * n > 1_000_000) throw I.error("resulting string too large");
      return [Array(n).fill(s).join(sep)];
    }),
    sub: native("sub", (a, I) => {
      const s = checkString(I, a, 0, "sub");
      const len = s.length;
      let i = checkInt(I, a, 1, "sub", 1);
      let j = checkInt(I, a, 2, "sub", -1);
      if (i < 0) i = Math.max(len + i + 1, 1);
      else if (i === 0) i = 1;
      if (j < 0) j = len + j + 1;
      else if (j > len) j = len;
      return [i > j ? "" : s.slice(i - 1, j)];
    }),
    byte: native("byte", (a, I) => {
      const s = checkString(I, a, 0, "byte");
      const i = checkInt(I, a, 1, "byte", 1);
      const j = checkInt(I, a, 2, "byte", i);
      const out: number[] = [];
      const start = i < 0 ? s.length + i + 1 : i;
      const end = j < 0 ? s.length + j + 1 : j;
      for (let k = Math.max(start, 1); k <= Math.min(end, s.length); k++)
        out.push(s.charCodeAt(k - 1));
      return out;
    }),
    char: native("char", (a, I) => [
      a.map((_, i) => String.fromCharCode(checkInt(I, a, i, "char"))).join(""),
    ]),
    format: nativeGen("format", function* (a, I) {
      return [yield* formatImpl(I, a)];
    }),
    find: native("find", (a, I) => {
      const s = checkString(I, a, 0, "find");
      const p = checkString(I, a, 1, "find");
      const init = strIndex(s.length, checkInt(I, a, 2, "find", 1));
      return strFind(s, p, init, isTruthy(a[3]), true);
    }),
    match: native("match", (a, I) => {
      const s = checkString(I, a, 0, "match");
      const p = checkString(I, a, 1, "match");
      const init = strIndex(s.length, checkInt(I, a, 2, "match", 1));
      return strFind(s, p, init, false, false);
    }),
    gmatch: native("gmatch", (a, I) => {
      const s = checkString(I, a, 0, "gmatch");
      const p = checkString(I, a, 1, "gmatch");
      const it = gmatchIter(s, p);
      return [
        native("gmatch_iter", () => {
          const r = it.next();
          return r.done ? [undefined] : r.value;
        }),
      ];
    }),
    gsub: nativeGen("gsub", function* (a, I) {
      const s = checkString(I, a, 0, "gsub");
      const p = checkString(I, a, 1, "gsub");
      const repl = a[2];
      const maxN = a[3] === undefined ? Infinity : checkInt(I, a, 3, "gsub");
      if (typeof repl === "string" || typeof repl === "number") {
        const r = String(repl);
        return gsubCore(s, p, maxN, (whole, caps) => expandReplacement(r, whole, caps));
      }
      if (repl instanceof LuaTable) {
        return gsubCore(s, p, maxN, (whole, caps) => {
          const v = repl.get(caps[0] ?? whole);
          return v === undefined || v === false
            ? undefined
            : typeof v === "number"
              ? formatNumber(v)
              : String(v);
        });
      }
      if (repl instanceof LuaFunction) {
        // Collect matches first, then call the function for each (it may yield).
        const found: Array<{ whole: string; caps: Array<string | number> }> = [];
        gsubCore(s, p, maxN, (whole, caps) => {
          found.push({ whole, caps });
          return undefined;
        });
        const replacements: Array<string | undefined> = [];
        for (const f of found) {
          const v = (yield* I.call(repl, f.caps))[0];
          replacements.push(
            v === undefined || v === false
              ? undefined
              : typeof v === "number"
                ? formatNumber(v)
                : String(v),
          );
        }
        let k = 0;
        return gsubCore(s, p, maxN, () => replacements[k++]);
      }
      throw argError(I, 3, "gsub", `string/function/table expected, got ${robloxTypeOf(repl)}`);
    }),
    split: native("split", (a, I) => {
      const s = checkString(I, a, 0, "split");
      const sep = checkString(I, a, 1, "split", ",");
      return [LuaTable.from(sep === "" ? [...s] : s.split(sep))];
    }),
  });
  G.set("string", stringLib);

  // ---------------------------------------------------------------- math
  const mathLib = lib({
    pi: Math.PI,
    huge: Infinity,
    abs: native("abs", (a, I) => [Math.abs(checkNumber(I, a, 0, "abs"))]),
    ceil: native("ceil", (a, I) => [Math.ceil(checkNumber(I, a, 0, "ceil"))]),
    floor: native("floor", (a, I) => [Math.floor(checkNumber(I, a, 0, "floor"))]),
    round: native("round", (a, I) => {
      const n = checkNumber(I, a, 0, "round");
      return [n < 0 ? -Math.round(-n) : Math.round(n)];
    }),
    sqrt: native("sqrt", (a, I) => [Math.sqrt(checkNumber(I, a, 0, "sqrt"))]),
    sin: native("sin", (a, I) => [Math.sin(checkNumber(I, a, 0, "sin"))]),
    cos: native("cos", (a, I) => [Math.cos(checkNumber(I, a, 0, "cos"))]),
    tan: native("tan", (a, I) => [Math.tan(checkNumber(I, a, 0, "tan"))]),
    asin: native("asin", (a, I) => [Math.asin(checkNumber(I, a, 0, "asin"))]),
    acos: native("acos", (a, I) => [Math.acos(checkNumber(I, a, 0, "acos"))]),
    atan: native("atan", (a, I) => [Math.atan(checkNumber(I, a, 0, "atan"))]),
    atan2: native("atan2", (a, I) => [
      Math.atan2(checkNumber(I, a, 0, "atan2"), checkNumber(I, a, 1, "atan2")),
    ]),
    sinh: native("sinh", (a, I) => [Math.sinh(checkNumber(I, a, 0, "sinh"))]),
    cosh: native("cosh", (a, I) => [Math.cosh(checkNumber(I, a, 0, "cosh"))]),
    tanh: native("tanh", (a, I) => [Math.tanh(checkNumber(I, a, 0, "tanh"))]),
    exp: native("exp", (a, I) => [Math.exp(checkNumber(I, a, 0, "exp"))]),
    log: native("log", (a, I) => {
      const x = checkNumber(I, a, 0, "log");
      if (a[1] === undefined) return [Math.log(x)];
      return [Math.log(x) / Math.log(checkNumber(I, a, 1, "log"))];
    }),
    log10: native("log10", (a, I) => [Math.log10(checkNumber(I, a, 0, "log10"))]),
    pow: native("pow", (a, I) => [
      Math.pow(checkNumber(I, a, 0, "pow"), checkNumber(I, a, 1, "pow")),
    ]),
    fmod: native("fmod", (a, I) => [checkNumber(I, a, 0, "fmod") % checkNumber(I, a, 1, "fmod")]),
    modf: native("modf", (a, I) => {
      const n = checkNumber(I, a, 0, "modf");
      const ip = n < 0 ? Math.ceil(n) : Math.floor(n);
      return [ip, n - ip];
    }),
    deg: native("deg", (a, I) => [(checkNumber(I, a, 0, "deg") * 180) / Math.PI]),
    rad: native("rad", (a, I) => [(checkNumber(I, a, 0, "rad") * Math.PI) / 180]),
    sign: native("sign", (a, I) => [Math.sign(checkNumber(I, a, 0, "sign"))]),
    max: native("max", (a, I) => {
      checkNumber(I, a, 0, "max");
      return [Math.max(...a.map((_, i) => checkNumber(I, a, i, "max")))];
    }),
    min: native("min", (a, I) => {
      checkNumber(I, a, 0, "min");
      return [Math.min(...a.map((_, i) => checkNumber(I, a, i, "min")))];
    }),
    clamp: native("clamp", (a, I) => {
      const x = checkNumber(I, a, 0, "clamp");
      const lo = checkNumber(I, a, 1, "clamp");
      const hi = checkNumber(I, a, 2, "clamp");
      if (lo > hi) throw argError(I, 3, "clamp", "max must be greater than or equal to min");
      return [Math.min(Math.max(x, lo), hi)];
    }),
    lerp: native("lerp", (a, I) => {
      const x = checkNumber(I, a, 0, "lerp");
      return [x + (checkNumber(I, a, 1, "lerp") - x) * checkNumber(I, a, 2, "lerp")];
    }),
    map: native("map", (a, I) => {
      const [x, i0, i1, o0, o1] = [0, 1, 2, 3, 4].map((i) => checkNumber(I, a, i, "map"));
      return [o0 + ((x - i0) * (o1 - o0)) / (i1 - i0)];
    }),
    noise: native("noise", (a, I) => {
      const x = checkNumber(I, a, 0, "noise", 0);
      const y = checkNumber(I, a, 1, "noise", 0);
      const z = checkNumber(I, a, 2, "noise", 0);
      const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 0.5;
      return [Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) ? 0 : v];
    }),
    random: native("random", (a, I) => {
      const r = rng.next();
      if (a.length === 0) return [r];
      const lo = a.length >= 2 ? checkInt(I, a, 0, "random") : 1;
      const hi = a.length >= 2 ? checkInt(I, a, 1, "random") : checkInt(I, a, 0, "random");
      if (lo > hi) throw argError(I, a.length >= 2 ? 2 : 1, "random", "interval is empty");
      return [lo + Math.floor(r * (hi - lo + 1))];
    }),
    randomseed: native("randomseed", (a, I) => {
      rng.next = makeRandom(checkInt(I, a, 0, "randomseed"));
      return [];
    }),
  });
  G.set("math", mathLib);

  // ---------------------------------------------------------------- table
  const tableLib = lib({
    insert: native("insert", (a, I) => {
      const t = checkTable(I, a, 0, "insert");
      if (t.frozen) throw I.error("attempt to modify a readonly table");
      if (a.length === 2) {
        t.set(t.length() + 1, a[1]);
      } else if (a.length === 3) {
        const n = t.length();
        const pos = checkInt(I, a, 1, "insert");
        if (pos < 1 || pos > n + 1) throw argError(I, 2, "insert", "position out of bounds");
        for (let i = n; i >= pos; i--) t.set(i + 1, t.get(i));
        t.set(pos, a[2]);
      } else {
        throw I.error("wrong number of arguments to 'insert'");
      }
      return [];
    }),
    remove: native("remove", (a, I) => {
      const t = checkTable(I, a, 0, "remove");
      if (t.frozen) throw I.error("attempt to modify a readonly table");
      const n = t.length();
      const pos = checkInt(I, a, 1, "remove", n);
      if (n === 0 && a[1] === undefined) return [undefined];
      const v = t.get(pos);
      for (let i = pos; i < n; i++) t.set(i, t.get(i + 1));
      if (pos <= n) t.set(n, undefined);
      return [v];
    }),
    concat: native("concat", (a, I) => {
      const t = checkTable(I, a, 0, "concat");
      const sep = checkString(I, a, 1, "concat", "");
      const i = checkInt(I, a, 2, "concat", 1);
      const j = checkInt(I, a, 3, "concat", t.length());
      const parts: string[] = [];
      for (let k = i; k <= j; k++) {
        const v = t.get(k);
        if (typeof v === "string") parts.push(v);
        else if (typeof v === "number") parts.push(formatNumber(v));
        else throw I.error(`invalid value (at index ${k}) in table for 'concat'`);
      }
      return [parts.join(sep)];
    }),
    find: native("find", (a, I) => {
      const t = checkTable(I, a, 0, "find");
      const init = checkInt(I, a, 2, "find", 1);
      for (let i = init; i <= t.length(); i++) if (t.get(i) === a[1]) return [i];
      return [undefined];
    }),
    sort: nativeGen("sort", function* (a, I) {
      const t = checkTable(I, a, 0, "sort");
      const n = t.length();
      const items: unknown[] = [];
      for (let i = 1; i <= n; i++) items.push(t.get(i));
      const sorted = yield* sortImpl(I, items, a[1]);
      sorted.forEach((v, i) => t.set(i + 1, v));
      return [];
    }),
    clear: native("clear", (a, I) => {
      const t = checkTable(I, a, 0, "clear");
      t.arr = [];
      t.hash.clear();
      return [];
    }),
    clone: native("clone", (a, I) => {
      const t = checkTable(I, a, 0, "clone");
      const c = new LuaTable();
      c.arr = [...t.arr];
      c.hash = new Map(t.hash);
      c.metatable = t.metatable;
      return [c];
    }),
    freeze: native("freeze", (a, I) => {
      const t = checkTable(I, a, 0, "freeze");
      t.frozen = true;
      return [t];
    }),
    isfrozen: native("isfrozen", (a, I) => [checkTable(I, a, 0, "isfrozen").frozen]),
    create: native("create", (a, I) => {
      const n = checkInt(I, a, 0, "create");
      return [LuaTable.from(Array(Math.max(0, n)).fill(a[1]))];
    }),
    pack: native("pack", (a) => {
      const t = LuaTable.from(a);
      t.set("n", a.length);
      return [t];
    }),
    unpack: unpackFn,
    getn: native("getn", (a, I) => [checkTable(I, a, 0, "getn").length()]),
    maxn: native("maxn", (a, I) => {
      const t = checkTable(I, a, 0, "maxn");
      let max = 0;
      for (const [k] of t.entries()) if (typeof k === "number" && k > max) max = k;
      return [max];
    }),
    move: native("move", (a, I) => {
      const src = checkTable(I, a, 0, "move");
      const f = checkInt(I, a, 1, "move");
      const e = checkInt(I, a, 2, "move");
      const t = checkInt(I, a, 3, "move");
      const dst = a[4] instanceof LuaTable ? a[4] : src;
      const vals: unknown[] = [];
      for (let i = f; i <= e; i++) vals.push(src.get(i));
      vals.forEach((v, i) => dst.set(t + i, v));
      return [dst];
    }),
  });
  G.set("table", tableLib);

  // ---------------------------------------------------------------- os
  G.set(
    "os",
    lib({
      time: native("time", (_a, I) => [1_760_000_000 + Math.floor(I.now())]),
      clock: native("clock", (_a, I) => [I.now()]),
      difftime: native("difftime", (a) => [Number(a[0]) - Number(a[1] ?? 0)]),
      date: native("date", (a, I) => {
        const fmt = typeof a[0] === "string" ? a[0] : "%c";
        const d = new Date((1_760_000_000 + I.now()) * 1000);
        if (fmt.replace(/^!/, "") === "*t") {
          return [
            LuaTable.fromRecord({
              year: d.getUTCFullYear(),
              month: d.getUTCMonth() + 1,
              day: d.getUTCDate(),
              hour: d.getUTCHours(),
              min: d.getUTCMinutes(),
              sec: d.getUTCSeconds(),
              wday: d.getUTCDay() + 1,
              yday: 1,
              isdst: false,
            }),
          ];
        }
        const pad = (n: number) => String(n).padStart(2, "0");
        return [
          fmt
            .replace(/^!/, "")
            .replace(/%Y/g, String(d.getUTCFullYear()))
            .replace(/%m/g, pad(d.getUTCMonth() + 1))
            .replace(/%d/g, pad(d.getUTCDate()))
            .replace(/%H/g, pad(d.getUTCHours()))
            .replace(/%M/g, pad(d.getUTCMinutes()))
            .replace(/%S/g, pad(d.getUTCSeconds()))
            .replace(/%c/g, d.toUTCString()),
        ];
      }),
    }),
  );

  // ---------------------------------------------------------------- coroutine
  const resumeFn = nativeGen("resume", function* (a, I) {
    const co = a[0];
    if (!(co instanceof Coroutine))
      throw argError(I, 1, "resume", `thread expected, got ${robloxTypeOf(co)}`);
    return yield* (I as Interpreter).resumeCoroutine(co, a.slice(1));
  });
  G.set(
    "coroutine",
    lib({
      create: native("create", (a, I) => {
        if (!(a[0] instanceof LuaFunction))
          throw argError(I, 1, "create", `function expected, got ${robloxTypeOf(a[0])}`);
        return [new Coroutine(a[0])];
      }),
      resume: resumeFn,
      yield: nativeGen("yield", function* (a) {
        const resumed = yield { t: "coyield", values: a };
        return Array.isArray(resumed) ? resumed : [];
      }),
      status: native("status", (a, I) => {
        const co = a[0];
        if (!(co instanceof Coroutine))
          throw argError(I, 1, "status", `thread expected, got ${robloxTypeOf(co)}`);
        return [co.status];
      }),
      running: native("running", (_a, I) => [(I as Interpreter).runningCoroutine()]),
      isyieldable: native("isyieldable", (_a, I) => [
        Boolean((I as Interpreter).runningCoroutine()),
      ]),
      close: native("close", (a) => {
        if (a[0] instanceof Coroutine) a[0].status = "dead";
        return [true];
      }),
      wrap: native("wrap", (a, I) => {
        if (!(a[0] instanceof LuaFunction))
          throw argError(I, 1, "wrap", `function expected, got ${robloxTypeOf(a[0])}`);
        const co = new Coroutine(a[0]);
        return [
          nativeGen("wrapped", function* (args, I2) {
            const r = yield* (I2 as Interpreter).resumeCoroutine(co, args);
            if (r[0] === false) {
              const err = new LuaError(r[1]);
              throw err;
            }
            return r.slice(1);
          }),
        ];
      }),
    }),
  );

  // ---------------------------------------------------------------- task
  G.set(
    "task",
    lib({
      wait: nativeGen("wait", function* (a, I) {
        const d = toNumber(a[0]) ?? 0;
        const start = I.now();
        yield { t: "wait", d };
        return [I.now() - start];
      }),
      spawn: nativeGen("spawn", function* (a, I) {
        const [fn, ...rest] = a;
        if (fn instanceof Coroutine) {
          yield* (I as Interpreter).resumeCoroutine(fn, rest);
          return [fn];
        }
        if (!(fn instanceof LuaFunction))
          throw argError(I, 1, "spawn", `function or thread expected, got ${robloxTypeOf(fn)}`);
        return [yield* I.spawnThread(fn, rest, "now")];
      }),
      defer: nativeGen("defer", function* (a, I) {
        const [fn, ...rest] = a;
        if (!(fn instanceof LuaFunction))
          throw argError(I, 1, "defer", `function expected, got ${robloxTypeOf(fn)}`);
        return [yield* I.spawnThread(fn, rest, "defer")];
      }),
      delay: nativeGen("delay", function* (a, I) {
        const d = checkNumber(I, a, 0, "delay");
        const [, fn, ...rest] = a;
        if (!(fn instanceof LuaFunction))
          throw argError(I, 2, "delay", `function expected, got ${robloxTypeOf(fn)}`);
        return [yield* I.spawnThread(fn, rest, "delay", d)];
      }),
      cancel: native("cancel", (a, I) => {
        if (a[0] instanceof ThreadHandle) (I as Interpreter).cancel(a[0]);
        return [];
      }),
    }),
  );

  // ---------------------------------------------------------------- utf8
  G.set(
    "utf8",
    lib({
      char: native("char", (a, I) => [
        a.map((_, i) => String.fromCodePoint(checkInt(I, a, i, "char"))).join(""),
      ]),
      charpattern: "[\x00-\x7F\xC2-\xFD][\x80-\xBF]*",
      len: native("len", (a, I) => [[...checkString(I, a, 0, "len")].length]),
      codepoint: native("codepoint", (a, I) => {
        const s = checkString(I, a, 0, "codepoint");
        const i = checkInt(I, a, 1, "codepoint", 1);
        return [s.codePointAt(i - 1)];
      }),
    }),
  );
}
