/** RBXScriptSignal / RBXScriptConnection for the simulator. Handlers run deferred. */
import type { Interpreter } from "../interpreter";
import {
  LuaError,
  LuaFunction,
  native,
  nativeGen,
  robloxTypeOf,
  Userdata,
  type InterpreterLike,
  type ScriptContext,
  type SignalWaitable,
} from "../values";

export class RBXConnection extends Userdata {
  readonly luaType = "RBXScriptConnection";
  connected = true;
  constructor(
    public signal: RBXSignal,
    public fn: LuaFunction,
    public script: ScriptContext | undefined,
    public once: boolean,
  ) {
    super();
  }
  static disconnectFn = native("Disconnect", (args) => {
    const self = args[0];
    if (!(self instanceof RBXConnection))
      throw new LuaError("Expected ':' not '.' calling member function Disconnect");
    self.disconnect();
    return [];
  });
  disconnect() {
    this.connected = false;
    this.signal.connections = this.signal.connections.filter((c) => c !== this);
  }
  luaIndex(key: unknown): unknown {
    if (key === "Disconnect" || key === "disconnect") return RBXConnection.disconnectFn;
    if (key === "Connected") return this.connected;
    throw new LuaError(`${String(key)} is not a valid member of RBXScriptConnection`);
  }
  luaToString() {
    return "Connection";
  }
}

export type ConnectGuard = (I: InterpreterLike) => void;

export class RBXSignal extends Userdata implements SignalWaitable {
  readonly luaType = "RBXScriptSignal";
  connections: RBXConnection[] = [];
  private waiters: Array<(args: unknown[]) => void> = [];

  constructor(
    public name: string,
    private interp: () => Interpreter,
    public guard?: ConnectGuard,
  ) {
    super();
  }

  private static check(self: unknown, method: string): RBXSignal {
    if (!(self instanceof RBXSignal))
      throw new LuaError(`Expected ':' not '.' calling member function ${method}`);
    return self;
  }

  private static connectImpl(once: boolean, method: string) {
    return native(method, (args, I) => {
      const self = RBXSignal.check(args[0], method);
      const fn = args[1];
      if (!(fn instanceof LuaFunction)) {
        throw new LuaError(`Attempt to connect failed: Passed value is not a function`);
      }
      self.guard?.(I);
      const conn = new RBXConnection(self, fn, I.currentScript(), once);
      self.connections.push(conn);
      return [conn];
    });
  }

  static connectFn = RBXSignal.connectImpl(false, "Connect");
  static onceFn = RBXSignal.connectImpl(true, "Once");
  static parallelFn = RBXSignal.connectImpl(false, "ConnectParallel");
  static waitFn = nativeGen("Wait", function* (args, I) {
    const self = RBXSignal.check(args[0], "Wait");
    self.guard?.(I);
    const result = yield { t: "signal", signal: self };
    return Array.isArray(result) ? result : [];
  });

  addWaiter(resume: (args: unknown[]) => void) {
    this.waiters.push(resume);
  }

  hasListeners(): boolean {
    return this.connections.length > 0 || this.waiters.length > 0;
  }

  /** Fire to every connection (optionally filtered by the connecting script). */
  fire(args: unknown[], filter?: (script: ScriptContext | undefined) => boolean) {
    const interp = this.interp();
    for (const conn of [...this.connections]) {
      if (!conn.connected) continue;
      if (filter && !filter(conn.script)) continue;
      if (conn.once) conn.disconnect();
      interp.enqueue(conn.fn, args, conn.script);
    }
    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w(args);
  }

  disconnectAll() {
    for (const c of [...this.connections]) c.disconnect();
  }

  luaIndex(key: unknown): unknown {
    switch (key) {
      case "Connect":
      case "connect":
        return RBXSignal.connectFn;
      case "Once":
        return RBXSignal.onceFn;
      case "Wait":
      case "wait":
        return RBXSignal.waitFn;
      case "ConnectParallel":
        return RBXSignal.parallelFn;
    }
    throw new LuaError(`${String(key)} is not a valid member of RBXScriptSignal`);
  }
  luaToString() {
    return `Signal ${this.name}`;
  }
}

export function describeValue(v: unknown): string {
  return robloxTypeOf(v);
}
