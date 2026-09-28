/**
 * Tree-walking Luau interpreter built on JS generators, so any Lua call can
 * yield (task.wait, Event:Wait, WaitForChild…) and be resumed later by the
 * scheduler on a virtual clock. Runtime errors use Roblox's exact wording,
 * prefixed with "Path.To.Script:line:", so the error analyzer understands them.
 */
import type { Block, Expr, Stat } from "./ast";
import {
  Coroutine,
  formatNumber,
  isTruthy,
  LuaError,
  LuaFunction,
  LuaTable,
  robloxTypeOf,
  Userdata,
  type Frame,
  type InterpreterLike,
  type LuaGen,
  type ScriptContext,
  type Signal,
} from "./values";

const MAX_DEPTH = 190;

type Flow = undefined | { k: "break" } | { k: "continue" } | { k: "return"; values: unknown[] };
const BREAK: Flow = { k: "break" };
const CONTINUE: Flow = { k: "continue" };

type FuncExpr = Extract<Expr, { k: "Func" }>;

export class Scope {
  vars = new Map<string, { v: unknown }>();
  varargs?: unknown[];
  env?: LuaTable;
  constructor(public parent?: Scope) {}
  declare(name: string, v: unknown) {
    this.vars.set(name, { v });
  }
  find(name: string): { v: unknown } | undefined {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let s: Scope | undefined = this;
    while (s) {
      const cell = s.vars.get(name);
      if (cell) return cell;
      s = s.parent;
    }
    return undefined;
  }
  root(): Scope {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let s: Scope = this;
    while (s.parent) s = s.parent;
    return s;
  }
  getVarargs(): unknown[] {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let s: Scope | undefined = this;
    while (s) {
      if (s.varargs) return s.varargs;
      s = s.parent;
    }
    return [];
  }
}

export class TimeoutError extends LuaError {
  constructor() {
    super("Script timeout: exhausted allowed execution time");
  }
}

/** Thrown when the whole simulation used too much work; not catchable by pcall. */
export class SimulationAborted extends Error {}

export interface OutputEntry {
  kind: "print" | "warn" | "error" | "info";
  text: string;
  time: number;
  script?: string;
  line?: number;
  traceback?: string[];
}

export interface RuntimeErrorInfo {
  message: string;
  script?: string;
  line?: number;
  traceback: string[];
  time: number;
}

interface Thread {
  id: number;
  gen: LuaGen<unknown>;
  frames: Frame[];
  resumeValue?: unknown;
  status: "ready" | "sleeping" | "waiting" | "dead";
  wakeAt?: number;
  waitStart?: number;
  co?: Coroutine;
  script?: ScriptContext;
  userdata: ThreadHandle;
}

export class ThreadHandle extends Userdata {
  readonly luaType = "thread";
  constructor(public thread?: Thread) {
    super();
  }
  luaIndex(key: unknown): unknown {
    throw new LuaError(`attempt to index thread with '${String(key)}'`);
  }
}

const ARITH_NAMES: Record<string, string> = {
  "+": "add",
  "-": "sub",
  "*": "mul",
  "/": "div",
  "//": "idiv",
  "%": "mod",
  "^": "pow",
};
const ARITH_META: Record<string, string> = {
  "+": "__add",
  "-": "__sub",
  "*": "__mul",
  "/": "__div",
  "//": "__idiv",
  "%": "__mod",
  "^": "__pow",
};

export function toNumber(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return undefined;
    if (/^-?0[xX][0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);
    const n = Number(s);
    return Number.isNaN(n) && s !== "nan" ? undefined : n;
  }
  return undefined;
}

export interface InterpreterOptions {
  timeoutSteps?: number;
  maxTotalSteps?: number;
}

export class Interpreter implements InterpreterLike {
  builtins = new LuaTable();
  output: OutputEntry[] = [];
  errors: RuntimeErrorInfo[] = [];
  time = 0;
  steps = 0;
  private stepsSinceYield = 0;
  private fr: Frame[] = [];
  private ready: Thread[] = [];
  private sleeping: Thread[] = [];
  private timers: Array<{ at: number; seq: number; cb: () => void }> = [];
  private timerSeq = 0;
  private threadSeq = 0;
  private current?: Thread;
  private currentCo?: Coroutine;
  readonly timeoutSteps: number;
  readonly maxTotalSteps: number;
  /** Set by the Roblox runtime: returns true when something listens to Heartbeat. */
  heartbeatActive: () => boolean = () => false;
  fireHeartbeat: (dt: number) => void = () => {};
  private nextHeartbeat = 0;
  aborted = false;

  constructor(options: InterpreterOptions = {}) {
    this.timeoutSteps = options.timeoutSteps ?? 250_000;
    this.maxTotalSteps = options.maxTotalSteps ?? 4_000_000;
  }

  // ------------------------------------------------------------- helpers
  now() {
    return this.time;
  }
  frames() {
    return this.fr;
  }
  currentScript(): ScriptContext | undefined {
    for (let i = this.fr.length - 1; i >= 0; i--) {
      if (this.fr[i].script) return this.fr[i].script;
    }
    return this.current?.script;
  }
  print(kind: "print" | "warn" | "info", text: string) {
    const top = this.topFrame();
    this.output.push({
      kind,
      text,
      time: this.time,
      script: top?.script?.path ?? this.current?.script?.path,
      line: top?.line,
    });
  }
  private topFrame(): Frame | undefined {
    for (let i = this.fr.length - 1; i >= 0; i--) if (this.fr[i].script) return this.fr[i];
    return undefined;
  }
  private setLine(line: number) {
    const f = this.fr[this.fr.length - 1];
    if (f) f.line = line;
  }
  traceback(): string[] {
    const lines: string[] = [];
    for (let i = this.fr.length - 1; i >= 0; i--) {
      const f = this.fr[i];
      if (!f.script) continue;
      lines.push(
        `Script '${f.script.path}', Line ${f.line}${f.name && f.name !== "main chunk" ? ` - function ${f.name}` : ""}`,
      );
    }
    return lines;
  }
  /** A runtime error at the current line, formatted like Roblox. */
  error(message: string, level = 1): LuaError {
    let prefix = "";
    if (level > 0) {
      const scripted = this.fr.filter((f) => f.script);
      const f = scripted[scripted.length - level] ?? scripted[scripted.length - 1];
      if (f?.script) prefix = `${f.script.path}:${f.line}: `;
    }
    const err = new LuaError(prefix + message);
    err.traceback = this.traceback();
    return err;
  }
  private tick() {
    this.steps++;
    this.stepsSinceYield++;
    if (this.stepsSinceYield > this.timeoutSteps) {
      const err = new TimeoutError();
      err.traceback = this.traceback();
      throw err;
    }
    if (this.steps > this.maxTotalSteps) {
      this.aborted = true;
      throw new SimulationAborted("Simulation stopped: the code did too much work.");
    }
  }

  // ------------------------------------------------------------- scheduling
  /** Creates a thread for a Lua function. mode "now" runs it immediately until it yields. */
  // eslint-disable-next-line require-yield
  *spawnThread(
    fn: unknown,
    args: unknown[],
    mode: "now" | "defer" | "delay",
    delay = 0,
  ): LuaGen<unknown> {
    const th = this.createThread(fn, args);
    if (mode === "now") {
      this.runNested(th);
    } else if (mode === "defer") {
      this.ready.push(th);
    } else {
      th.status = "sleeping";
      th.waitStart = this.time;
      th.wakeAt = this.time + delay;
      this.sleeping.push(th);
    }
    return th.userdata;
  }

  createThread(fn: unknown, args: unknown[], script?: ScriptContext): Thread {
    const handle = new ThreadHandle();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const th: Thread = {
      id: ++this.threadSeq,
      frames: [],
      status: "ready",
      script: script ?? (fn instanceof LuaFunction ? fn.script : undefined) ?? this.currentScript(),
      userdata: handle,
      gen: (function* () {
        return yield* self.call(fn, args);
      })(),
    };
    handle.thread = th;
    return th;
  }

  /** Queue a thread to run on the next scheduler pass (engine events, deferred handlers). */
  enqueue(fn: unknown, args: unknown[], script?: ScriptContext) {
    this.ready.push(this.createThread(fn, args, script));
  }

  schedule(delay: number, cb: () => void) {
    this.timers.push({ at: this.time + Math.max(0, delay), seq: ++this.timerSeq, cb });
  }

  cancel(handle: ThreadHandle) {
    const th = handle.thread;
    if (!th) return;
    th.status = "dead";
    this.ready = this.ready.filter((t) => t !== th);
    this.sleeping = this.sleeping.filter((t) => t !== th);
  }

  /** Runs a thread synchronously (inside another thread) until its first yield. */
  private runNested(th: Thread) {
    const savedFr = this.fr;
    const savedCur = this.current;
    const savedSteps = this.stepsSinceYield;
    try {
      this.stepThread(th);
    } finally {
      this.fr = savedFr;
      this.current = savedCur;
      this.stepsSinceYield = savedSteps;
    }
  }

  private stepThread(th: Thread) {
    if (th.status === "dead") return;
    if (th.script?.killed || th.frames.some((f) => f.script?.killed)) {
      th.status = "dead";
      return;
    }
    this.current = th;
    this.fr = th.frames;
    this.stepsSinceYield = 0;
    th.status = "ready";
    let r: IteratorResult<Signal, unknown>;
    const value = th.resumeValue;
    th.resumeValue = undefined;
    try {
      r = th.gen.next(value);
    } catch (e) {
      th.status = "dead";
      if (th.co) th.co.status = "dead";
      if (e instanceof SimulationAborted) throw e;
      this.reportError(e, th);
      return;
    }
    if (r.done) {
      th.status = "dead";
      if (th.co) th.co.status = "dead";
      return;
    }
    this.handleSignal(th, r.value);
  }

  private handleSignal(th: Thread, sig: Signal) {
    if (sig.t === "wait") {
      th.status = "sleeping";
      th.waitStart = this.time;
      th.wakeAt = this.time + Math.max(sig.d, 1 / 60);
      this.sleeping.push(th);
    } else if (sig.t === "signal") {
      th.status = "waiting";
      sig.signal.addWaiter((args) => {
        if (th.status !== "waiting") return;
        th.resumeValue = args;
        th.status = "ready";
        this.ready.push(th);
      });
    } else {
      // coroutine.yield outside of a coroutine: the thread just stops.
      th.status = "dead";
    }
  }

  reportError(e: unknown, th?: Thread) {
    let message: string;
    let traceback: string[] = [];
    if (e instanceof LuaError) {
      const v = e.value;
      message =
        typeof v === "string"
          ? v
          : typeof v === "number"
            ? formatNumber(v)
            : v === undefined
              ? "nil"
              : `${robloxTypeOf(v)} error object`;
      traceback = e.traceback;
    } else if (e instanceof RangeError) {
      message = "stack overflow";
    } else {
      message = `Internal simulator error: ${(e as Error)?.message ?? String(e)}`;
    }
    const m = message.match(/^(.+?):(\d+): /);
    const info: RuntimeErrorInfo = {
      message,
      script: m?.[1] ?? th?.script?.path,
      line: m ? Number(m[2]) : undefined,
      traceback,
      time: this.time,
    };
    this.errors.push(info);
    this.output.push({
      kind: "error",
      text: message,
      time: this.time,
      script: info.script,
      line: info.line,
      traceback,
    });
  }

  reportCompileError(path: string, line: number, message: string) {
    const text = `${path}:${line}: ${message}`;
    this.errors.push({ message: text, script: path, line, traceback: [], time: this.time });
    this.output.push({ kind: "error", text, time: this.time, script: path, line });
  }

  /** Runs everything that is ready or becomes ready within `seconds` of virtual time. */
  runFor(seconds: number) {
    const end = this.time + seconds;
    try {
      while (true) {
        while (this.ready.length) {
          const th = this.ready.shift()!;
          this.stepThread(th);
        }
        const candidates: number[] = [];
        for (const th of this.sleeping) candidates.push(th.wakeAt!);
        for (const t of this.timers) candidates.push(t.at);
        const hb = this.heartbeatActive();
        if (hb) candidates.push(Math.max(this.nextHeartbeat, this.time + 1 / 60));
        if (candidates.length === 0) {
          this.time = end;
          return;
        }
        const next = Math.min(...candidates);
        if (next > end) {
          this.time = end;
          return;
        }
        const dt = next - this.time;
        this.time = next;
        // timers first (engine callbacks), in order
        const due = this.timers
          .filter((t) => t.at <= this.time)
          .sort((a, b) => a.at - b.at || a.seq - b.seq);
        this.timers = this.timers.filter((t) => t.at > this.time);
        for (const t of due) t.cb();
        const wake = this.sleeping
          .filter((th) => th.wakeAt! <= this.time)
          .sort((a, b) => a.wakeAt! - b.wakeAt! || a.id - b.id);
        this.sleeping = this.sleeping.filter((th) => th.wakeAt! > this.time);
        for (const th of wake) {
          if (th.status !== "sleeping") continue;
          th.resumeValue = this.time - (th.waitStart ?? this.time);
          th.status = "ready";
          this.ready.push(th);
        }
        if (hb && this.time >= this.nextHeartbeat) {
          this.nextHeartbeat = this.time + 1 / 60;
          this.fireHeartbeat(Math.max(dt, 1 / 60));
        }
      }
    } catch (e) {
      if (e instanceof SimulationAborted) {
        this.output.push({
          kind: "error",
          text: "The simulator stopped your code because it did too much work (is there a loop that never ends?)",
          time: this.time,
        });
        this.ready = [];
        this.sleeping = [];
        this.timers = [];
        return;
      }
      throw e;
    }
  }

  hasPendingWork(): boolean {
    return this.ready.length > 0 || this.sleeping.length > 0 || this.timers.length > 0;
  }

  // ------------------------------------------------------------- coroutines
  // eslint-disable-next-line require-yield
  *resumeCoroutine(co: Coroutine, args: unknown[]): LuaGen<unknown[]> {
    if (co.status === "dead") return [false, "cannot resume dead coroutine"];
    if (co.status === "running" || co.status === "normal" || co.scheduled)
      return [false, "cannot resume non-suspended coroutine"];
    const savedFr = this.fr;
    const savedCo = this.currentCo;
    if (savedCo) savedCo.status = "normal";
    this.currentCo = co;
    co.status = "running";
    this.fr = co.frames;
    try {
      const first = !co.started;
      if (first) {
        co.started = true;
        co.gen = this.call(co.fn, args);
      }
      const r = co.gen!.next(first ? undefined : args);
      if (r.done) {
        co.status = "dead";
        return [true, ...(r.value as unknown[])];
      }
      const sig = r.value;
      if (sig.t === "coyield") {
        co.status = "suspended";
        return [true, ...sig.values];
      }
      // Yielded with task.wait/Event:Wait — hand the coroutine to the scheduler.
      co.status = "suspended";
      co.scheduled = true;
      const handle = new ThreadHandle();
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      const gen = co.gen!;
      const th: Thread = {
        id: ++this.threadSeq,
        frames: co.frames,
        status: "ready",
        co,
        script: this.currentScript(),
        userdata: handle,
        gen: (function* () {
          let resume: unknown;
          while (true) {
            co.status = "running";
            const step = gen.next(resume);
            if (step.done) {
              co.status = "dead";
              co.scheduled = false;
              return step.value;
            }
            if (step.value.t === "coyield") {
              co.status = "suspended";
              co.scheduled = false;
              return undefined;
            }
            co.status = "suspended";
            resume = yield step.value;
          }
        })(),
      };
      void self;
      handle.thread = th;
      this.handleSignal(th, sig);
      return [true];
    } catch (e) {
      co.status = "dead";
      if (e instanceof LuaError) return [false, e.value];
      if (e instanceof RangeError) return [false, "stack overflow"];
      throw e;
    } finally {
      this.fr = savedFr;
      this.currentCo = savedCo;
      if (savedCo) savedCo.status = "running";
    }
  }

  runningCoroutine(): Coroutine | undefined {
    return this.currentCo;
  }

  // ------------------------------------------------------------- calls
  *call(fn: unknown, args: unknown[]): LuaGen<unknown[]> {
    if (fn instanceof LuaFunction) {
      if (fn.isNative) return yield* fn.impl(args, this);
      if (this.fr.length >= MAX_DEPTH) throw this.error("stack overflow");
      this.fr.push({ name: fn.name, script: fn.script, line: 0 });
      try {
        return yield* fn.impl(args, this);
      } finally {
        this.fr.pop();
      }
    }
    if (fn instanceof LuaTable) {
      const mm = fn.metatable?.get("__call");
      if (mm !== undefined) return yield* this.call(mm, [fn, ...args]);
    }
    throw this.error(`attempt to call a ${robloxTypeOf(fn)} value`);
  }

  makeClosure(f: FuncExpr, scope: Scope, script?: ScriptContext): LuaFunction {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const fnScript = script ?? this.currentScript();
    const lf = new LuaFunction(
      f.name,
      function* (args) {
        const s = new Scope(scope);
        f.params.forEach((p, i) => s.declare(p, args[i]));
        if (f.vararg) s.varargs = args.slice(f.params.length);
        const top = self.fr[self.fr.length - 1];
        if (top) top.line = f.line;
        const flow = yield* self.execBlock(f.body, s);
        if (flow && flow.k === "return") return flow.values;
        return [];
      },
      false,
      fnScript,
    );
    return lf;
  }

  // ------------------------------------------------------------- statements
  *execBlock(block: Block, scope: Scope): LuaGen<Flow> {
    for (const stat of block) {
      this.tick();
      this.setLine(stat.line);
      const flow = yield* this.execStat(stat, scope);
      if (flow) return flow;
    }
    return undefined;
  }

  private *execStat(st: Stat, s: Scope): LuaGen<Flow> {
    switch (st.k) {
      case "Local": {
        const values = yield* this.evalList(st.exprs, s);
        st.names.forEach((n, i) => s.declare(n, values[i]));
        return undefined;
      }
      case "LocalFunc": {
        s.declare(st.name, undefined);
        s.vars.get(st.name)!.v = this.makeClosure(st.func, s);
        return undefined;
      }
      case "FuncStat": {
        const fn = this.makeClosure(st.func, s);
        if (st.method) {
          const obj = yield* this.eval(st.target, s);
          yield* this.setIndex(obj, st.method, fn);
        } else if (st.target.k === "Name") {
          this.assignName(st.target.name, fn, s);
        } else if (st.target.k === "Field") {
          const obj = yield* this.eval(st.target.obj, s);
          yield* this.setIndex(obj, st.target.name, fn);
        }
        return undefined;
      }
      case "Assign": {
        const refs: Array<
          { kind: "name"; name: string } | { kind: "index"; obj: unknown; key: unknown }
        > = [];
        for (const t of st.targets) {
          if (t.k === "Name") refs.push({ kind: "name", name: t.name });
          else if (t.k === "Field")
            refs.push({ kind: "index", obj: yield* this.eval(t.obj, s), key: t.name });
          else if (t.k === "Index") {
            const obj = yield* this.eval(t.obj, s);
            refs.push({ kind: "index", obj, key: yield* this.eval(t.key, s) });
          }
        }
        const values = yield* this.evalList(st.exprs, s);
        for (let i = 0; i < refs.length; i++) {
          const r = refs[i];
          this.setLine(st.line);
          if (r.kind === "name") this.assignName(r.name, values[i], s);
          else yield* this.setIndex(r.obj, r.key, values[i]);
        }
        return undefined;
      }
      case "Compound": {
        const t = st.target;
        const rhs = () => this.eval(st.expr, s);
        if (t.k === "Name") {
          const cur = this.lookup(t.name, s);
          const r = yield* rhs();
          this.assignName(t.name, yield* this.binary(st.op, cur, r), s);
        } else {
          const obj = yield* this.eval(t.k === "Field" || t.k === "Index" ? t.obj : t, s);
          const key =
            t.k === "Field" ? t.name : t.k === "Index" ? yield* this.eval(t.key, s) : undefined;
          const cur = yield* this.index(obj, key);
          const r = yield* rhs();
          const v = yield* this.binary(st.op, cur, r);
          this.setLine(st.line);
          yield* this.setIndex(obj, key, v);
        }
        return undefined;
      }
      case "CallStat":
        yield* this.evalCall(st.call as Extract<Expr, { k: "Call" | "Method" }>, s);
        return undefined;
      case "Do":
        return yield* this.execBlock(st.body, new Scope(s));
      case "While": {
        while (true) {
          this.tick();
          this.setLine(st.line);
          if (!isTruthy(yield* this.eval(st.cond, s))) break;
          const flow = yield* this.execBlock(st.body, new Scope(s));
          if (flow === BREAK) break;
          if (flow === CONTINUE) continue;
          if (flow) return flow;
        }
        return undefined;
      }
      case "Repeat": {
        while (true) {
          this.tick();
          const inner = new Scope(s);
          const flow = yield* this.execBlock(st.body, inner);
          if (flow === BREAK) break;
          if (flow && flow !== CONTINUE) return flow;
          if (isTruthy(yield* this.eval(st.cond, inner))) break;
        }
        return undefined;
      }
      case "If": {
        for (const clause of st.clauses) {
          this.setLine(clause.line);
          if (isTruthy(yield* this.eval(clause.cond, s)))
            return yield* this.execBlock(clause.body, new Scope(s));
        }
        if (st.otherwise) return yield* this.execBlock(st.otherwise, new Scope(s));
        return undefined;
      }
      case "NumFor": {
        const startV = yield* this.eval(st.start, s);
        const startRaw = toNumber(startV);
        if (startRaw === undefined)
          throw this.error(
            `invalid 'for' initial value (number expected, got ${robloxTypeOf(startV)})`,
          );
        const limitV = yield* this.eval(st.limit, s);
        const limit = toNumber(limitV);
        if (limit === undefined)
          throw this.error(`invalid 'for' limit (number expected, got ${robloxTypeOf(limitV)})`);
        let step = 1;
        if (st.step) {
          const stepV = yield* this.eval(st.step, s);
          const n = toNumber(stepV);
          if (n === undefined)
            throw this.error(`invalid 'for' step (number expected, got ${robloxTypeOf(stepV)})`);
          if (n === 0) throw this.error("'for' step is zero");
          step = n;
        }
        for (let i = startRaw; step > 0 ? i <= limit : i >= limit; i += step) {
          this.tick();
          const inner = new Scope(s);
          inner.declare(st.varName, i);
          const flow = yield* this.execBlock(st.body, inner);
          if (flow === BREAK) break;
          if (flow === CONTINUE) continue;
          if (flow) return flow;
        }
        return undefined;
      }
      case "GenFor":
        return yield* this.execGenFor(st, s);
      case "Return":
        return { k: "return", values: yield* this.evalList(st.exprs, s) };
      case "Break":
        return BREAK;
      case "Continue":
        return CONTINUE;
      case "Nop":
        return undefined;
    }
  }

  private *execGenFor(st: Extract<Stat, { k: "GenFor" }>, s: Scope): LuaGen<Flow> {
    const values = yield* this.evalList(st.exprs, s);
    let [f, state, control] = values;
    const runBody = function* (this: Interpreter, vals: unknown[]): LuaGen<Flow> {
      const inner = new Scope(s);
      st.names.forEach((n, i) => inner.declare(n, vals[i]));
      return yield* this.execBlock(st.body, inner);
    }.bind(this);

    const iterTable = function* (this: Interpreter, t: LuaTable): LuaGen<Flow> {
      for (const [k] of t.entries()) {
        this.tick();
        const v = t.get(k);
        if (v === undefined) continue;
        const flow = yield* runBody([k, v]);
        if (flow === BREAK) break;
        if (flow === CONTINUE) continue;
        if (flow) return flow;
      }
      return undefined;
    }.bind(this);

    // Generalized iteration: `for k, v in tbl do`
    if (f instanceof LuaTable && !(f.metatable?.get("__call") !== undefined)) {
      const iter = f.metatable?.get("__iter");
      if (iter !== undefined) {
        [f, state, control] = yield* this.call(iter, [f]);
      } else {
        return yield* iterTable(f);
      }
    }
    if (f === NEXT_FN && state instanceof LuaTable && control === undefined)
      return yield* iterTable(state);
    if (f === IPAIRS_ITER && state instanceof LuaTable) {
      for (let i = 1; ; i++) {
        this.tick();
        const v = state.get(i);
        if (v === undefined) break;
        const flow = yield* runBody([i, v]);
        if (flow === BREAK) break;
        if (flow === CONTINUE) continue;
        if (flow) return flow;
      }
      return undefined;
    }
    if (!(f instanceof LuaFunction) && !(f instanceof LuaTable)) {
      throw this.error(`attempt to iterate over a ${robloxTypeOf(f)} value`);
    }
    while (true) {
      this.tick();
      const r = yield* this.call(f, [state, control]);
      if (r[0] === undefined) break;
      control = r[0];
      const flow = yield* runBody(r);
      if (flow === BREAK) break;
      if (flow === CONTINUE) continue;
      if (flow) return flow;
    }
    return undefined;
  }

  // ------------------------------------------------------------- variables
  private lookup(name: string, s: Scope): unknown {
    const cell = s.find(name);
    if (cell) return cell.v;
    const env = s.root().env;
    if (env) {
      const v = env.get(name);
      if (v !== undefined) return v;
    }
    return this.builtins.get(name);
  }

  private assignName(name: string, value: unknown, s: Scope) {
    const cell = s.find(name);
    if (cell) {
      cell.v = value;
      return;
    }
    const env = s.root().env ?? this.builtins;
    env.set(name, value);
  }

  // ------------------------------------------------------------- expressions
  *eval(e: Expr, s: Scope): LuaGen<unknown> {
    switch (e.k) {
      case "Nil":
        return undefined;
      case "True":
        return true;
      case "False":
        return false;
      case "Num":
        return e.v;
      case "Str":
        return e.v;
      case "Vararg":
        return s.getVarargs()[0];
      case "Name":
        return this.lookup(e.name, s);
      case "Paren":
        return yield* this.eval(e.e, s);
      case "Func":
        return this.makeClosure(e, s);
      case "Interp": {
        let out = e.literals[0];
        for (let i = 0; i < e.exprs.length; i++) {
          out += (yield* this.tostring(yield* this.eval(e.exprs[i], s))) + e.literals[i + 1];
        }
        return out;
      }
      case "Table": {
        const t = new LuaTable();
        let n = 1;
        for (let i = 0; i < e.items.length; i++) {
          const item = e.items[i];
          if (item.type === "pos") {
            if (i === e.items.length - 1) {
              for (const v of yield* this.evalMulti(item.value, s)) t.set(n++, v);
            } else {
              t.set(n++, yield* this.eval(item.value, s));
            }
          } else if (item.type === "named") {
            t.set(item.key, yield* this.eval(item.value, s));
          } else {
            const key = yield* this.eval(item.key, s);
            if (key === undefined) throw this.error("table index is nil");
            if (typeof key === "number" && Number.isNaN(key))
              throw this.error("table index is NaN");
            t.set(key, yield* this.eval(item.value, s));
          }
        }
        return t;
      }
      case "Bin": {
        if (e.op === "and") {
          const l = yield* this.eval(e.l, s);
          return isTruthy(l) ? yield* this.eval(e.r, s) : l;
        }
        if (e.op === "or") {
          const l = yield* this.eval(e.l, s);
          return isTruthy(l) ? l : yield* this.eval(e.r, s);
        }
        const l = yield* this.eval(e.l, s);
        const r = yield* this.eval(e.r, s);
        this.setLine(e.line);
        return yield* this.binary(e.op, l, r);
      }
      case "Un": {
        const v = yield* this.eval(e.e, s);
        this.setLine(e.line);
        return yield* this.unary(e.op, v);
      }
      case "Field": {
        const obj = yield* this.eval(e.obj, s);
        this.setLine(e.line);
        return yield* this.index(obj, e.name);
      }
      case "Index": {
        const obj = yield* this.eval(e.obj, s);
        const key = yield* this.eval(e.key, s);
        this.setLine(e.line);
        return yield* this.index(obj, key);
      }
      case "Call":
      case "Method":
        return (yield* this.evalCall(e, s))[0];
      case "IfExpr": {
        for (const [c, v] of e.clauses)
          if (isTruthy(yield* this.eval(c, s))) return yield* this.eval(v, s);
        return yield* this.eval(e.otherwise, s);
      }
    }
  }

  private *evalMulti(e: Expr, s: Scope): LuaGen<unknown[]> {
    if (e.k === "Call" || e.k === "Method") return yield* this.evalCall(e, s);
    if (e.k === "Vararg") return [...s.getVarargs()];
    return [yield* this.eval(e, s)];
  }

  *evalList(exprs: Expr[], s: Scope): LuaGen<unknown[]> {
    const out: unknown[] = [];
    for (let i = 0; i < exprs.length; i++) {
      if (i === exprs.length - 1) out.push(...(yield* this.evalMulti(exprs[i], s)));
      else out.push(yield* this.eval(exprs[i], s));
    }
    return out;
  }

  private *evalCall(e: Extract<Expr, { k: "Call" | "Method" }>, s: Scope): LuaGen<unknown[]> {
    if (e.k === "Method") {
      const obj = yield* this.eval(e.obj, s);
      this.setLine(e.line);
      const fn = yield* this.index(obj, e.name);
      const args = yield* this.evalList(e.args, s);
      this.setLine(e.line);
      if (fn === undefined && obj instanceof LuaTable) {
        throw this.error(`attempt to call missing method '${e.name}' of table`);
      }
      if (fn === undefined && typeof obj === "string") {
        throw this.error(`attempt to call missing method '${e.name}' of string`);
      }
      return yield* this.call(fn, [obj, ...args]);
    }
    const fn = yield* this.eval(e.fn, s);
    const args = yield* this.evalList(e.args, s);
    this.setLine(e.line);
    return yield* this.call(fn, args);
  }

  // ------------------------------------------------------------- operators
  *index(obj: unknown, key: unknown): LuaGen<unknown> {
    if (obj instanceof LuaTable) {
      const v = obj.get(key);
      if (v !== undefined) return v;
      const mm = obj.metatable?.get("__index");
      if (mm === undefined) return undefined;
      if (mm instanceof LuaFunction) return (yield* this.call(mm, [obj, key]))[0];
      return yield* this.index(mm, key);
    }
    if (obj instanceof Userdata) {
      try {
        return obj.luaIndex(key, this);
      } catch (err) {
        throw this.relocate(err);
      }
    }
    if (typeof obj === "string") {
      const lib = this.builtins.get("string");
      return lib instanceof LuaTable ? lib.get(key) : undefined;
    }
    throw this.error(`attempt to index ${robloxTypeOf(obj)} with ${this.describeKey(key)}`);
  }

  *setIndex(obj: unknown, key: unknown, value: unknown): LuaGen<void> {
    if (obj instanceof LuaTable) {
      if (obj.frozen) throw this.error("attempt to modify a readonly table");
      if (key === undefined) throw this.error("table index is nil");
      if (typeof key === "number" && Number.isNaN(key)) throw this.error("table index is NaN");
      if (obj.get(key) === undefined && obj.metatable) {
        const mm = obj.metatable.get("__newindex");
        if (mm instanceof LuaFunction) {
          yield* this.call(mm, [obj, key, value]);
          return;
        }
        if (mm !== undefined) {
          yield* this.setIndex(mm, key, value);
          return;
        }
      }
      obj.set(key, value);
      return;
    }
    if (obj instanceof Userdata) {
      try {
        obj.luaNewIndex(key, value, this);
      } catch (err) {
        throw this.relocate(err);
      }
      return;
    }
    throw this.error(`attempt to index ${robloxTypeOf(obj)} with ${this.describeKey(key)}`);
  }

  /** Userdata throw LuaErrors without a position; add the current script:line. */
  private relocate(err: unknown): unknown {
    if (
      err instanceof LuaError &&
      typeof err.value === "string" &&
      !/^[\w. -]+:\d+: /.test(err.value)
    ) {
      return this.error(err.value);
    }
    return err;
  }

  private describeKey(key: unknown): string {
    if (typeof key === "string") return `'${key}'`;
    return robloxTypeOf(key);
  }

  private metamethod(a: unknown, b: unknown, name: string): unknown {
    const fromA = a instanceof LuaTable ? a.metatable?.get(name) : undefined;
    if (fromA !== undefined) return fromA;
    return b instanceof LuaTable ? b.metatable?.get(name) : undefined;
  }

  *binary(op: string, a: unknown, b: unknown): LuaGen<unknown> {
    switch (op) {
      case "+":
      case "-":
      case "*":
      case "/":
      case "//":
      case "%":
      case "^": {
        const x = typeof a === "number" ? a : typeof a === "string" ? toNumber(a) : undefined;
        const y = typeof b === "number" ? b : typeof b === "string" ? toNumber(b) : undefined;
        if (x !== undefined && y !== undefined) return arith(op, x, y);
        const mm = this.metamethod(a, b, ARITH_META[op]);
        if (mm !== undefined) return (yield* this.call(mm, [a, b]))[0];
        if (a instanceof Userdata) {
          const r = a.luaArith(op, b, true);
          if (r !== undefined) return r;
        }
        if (b instanceof Userdata) {
          const r = b.luaArith(op, a, false);
          if (r !== undefined) return r;
        }
        throw this.error(
          `attempt to perform arithmetic (${ARITH_NAMES[op]}) on ${robloxTypeOf(a)} and ${robloxTypeOf(b)}`,
        );
      }
      case "..": {
        if (
          (typeof a === "string" || typeof a === "number") &&
          (typeof b === "string" || typeof b === "number")
        ) {
          return (
            (typeof a === "number" ? formatNumber(a) : a) +
            (typeof b === "number" ? formatNumber(b) : b)
          );
        }
        const mm = this.metamethod(a, b, "__concat");
        if (mm !== undefined) return (yield* this.call(mm, [a, b]))[0];
        throw this.error(`attempt to concatenate ${robloxTypeOf(a)} with ${robloxTypeOf(b)}`);
      }
      case "==":
        return yield* this.equals(a, b);
      case "~=":
        return !(yield* this.equals(a, b));
      case "<":
      case "<=":
      case ">":
      case ">=": {
        const [l, r, o] = op === ">" ? [b, a, "<"] : op === ">=" ? [b, a, "<="] : [a, b, op];
        if (typeof l === "number" && typeof r === "number") return o === "<" ? l < r : l <= r;
        if (typeof l === "string" && typeof r === "string") return o === "<" ? l < r : l <= r;
        const mm = this.metamethod(l, r, o === "<" ? "__lt" : "__le");
        if (mm !== undefined) return isTruthy((yield* this.call(mm, [l, r]))[0]);
        throw this.error(`attempt to compare ${robloxTypeOf(a)} ${op} ${robloxTypeOf(b)}`);
      }
    }
    throw this.error(`unknown operator ${op}`);
  }

  *equals(a: unknown, b: unknown): LuaGen<boolean> {
    if (a === b) return true;
    if (typeof a === "number" && typeof b === "number") return a === b;
    if (a instanceof Userdata && b instanceof Userdata) return a.luaEq(b);
    if (a instanceof LuaTable && b instanceof LuaTable) {
      const mm = this.metamethod(a, b, "__eq");
      if (mm !== undefined) return isTruthy((yield* this.call(mm, [a, b]))[0]);
    }
    return false;
  }

  *unary(op: string, v: unknown): LuaGen<unknown> {
    if (op === "not") return !isTruthy(v);
    if (op === "-") {
      const n = typeof v === "number" ? v : typeof v === "string" ? toNumber(v) : undefined;
      if (n !== undefined) return -n;
      const mm = v instanceof LuaTable ? v.metatable?.get("__unm") : undefined;
      if (mm !== undefined) return (yield* this.call(mm, [v, v]))[0];
      if (v instanceof Userdata) {
        const r = v.luaArith("unm", undefined, true);
        if (r !== undefined) return r;
      }
      throw this.error(`attempt to perform arithmetic (unm) on ${robloxTypeOf(v)}`);
    }
    // #
    if (typeof v === "string") return v.length;
    if (v instanceof LuaTable) {
      const mm = v.metatable?.get("__len");
      if (mm !== undefined) return (yield* this.call(mm, [v]))[0];
      return v.length();
    }
    throw this.error(`attempt to get length of a ${robloxTypeOf(v)} value`);
  }

  *tostring(v: unknown): LuaGen<string> {
    if (v === undefined) return "nil";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") return formatNumber(v);
    if (typeof v === "string") return v;
    if (v instanceof LuaTable) {
      const mm = v.metatable?.get("__tostring");
      if (mm !== undefined) {
        const r = (yield* this.call(mm, [v]))[0];
        if (typeof r !== "string") throw this.error("'__tostring' must return a string");
        return r;
      }
      const name = v.metatable?.get("__type");
      return typeof name === "string" ? name : `table: ${v.address}`;
    }
    if (v instanceof LuaFunction) return `function: ${v.address}`;
    if (v instanceof Coroutine) return `thread: ${v.address}`;
    if (v instanceof Userdata) return v.luaToString();
    return String(v);
  }
}

function arith(op: string, x: number, y: number): number {
  switch (op) {
    case "+":
      return x + y;
    case "-":
      return x - y;
    case "*":
      return x * y;
    case "/":
      return x / y;
    case "//":
      return Math.floor(x / y);
    case "%":
      return y === 0 ? NaN : x - Math.floor(x / y) * y;
    default:
      return Math.pow(x, y);
  }
}

/** Identity markers so generic-for can iterate pairs()/ipairs() without calls. */
export let NEXT_FN: LuaFunction | undefined;
export let IPAIRS_ITER: LuaFunction | undefined;
export function registerIterators(next: LuaFunction, ipairsIter: LuaFunction) {
  NEXT_FN = next;
  IPAIRS_ITER = ipairsIter;
}
