/**
 * The simulated Roblox place: DataModel + services, players and characters,
 * script execution (server Scripts, LocalScripts per player, ModuleScripts),
 * remotes, tweens, DataStores, and helpers to simulate what players do
 * (join, touch, click, trigger prompts, press keys).
 */
import type { Expr } from "../ast";
import {
  Interpreter,
  Scope,
  toNumber,
  type OutputEntry,
  type RuntimeErrorInfo,
} from "../interpreter";
import { parse } from "../parser";
import { installStdlib } from "../stdlib";
import {
  formatNumber,
  isTruthy,
  LuaError,
  LuaFunction,
  LuaTable,
  native,
  nativeGen,
  robloxTypeOf,
  Userdata,
  type InterpreterLike,
  type LuaGen,
  type ScriptContext,
} from "../values";
import { installClasses } from "./classes";
import {
  BrickColor,
  CFrame,
  Color3,
  datatypeGlobals,
  enumItem,
  EnumItem,
  Opaque,
  UDim,
  UDim2,
  Vector2,
  Vector3,
} from "./datatypes";
import { classDef, classExists, defineClass, Instance, isInstanceOf } from "./instance";
import { RBXSignal } from "./signal";

export interface WorldOptions {
  dataStoresEnabled?: boolean;
  httpEnabled?: boolean;
  randomSeed?: number;
  timeoutSteps?: number;
  maxTotalSteps?: number;
}

type FuncExpr = Extract<Expr, { k: "Func" }>;

const SERVICE_NAMES = [
  "Workspace",
  "Players",
  "Lighting",
  "ReplicatedFirst",
  "ReplicatedStorage",
  "ServerScriptService",
  "ServerStorage",
  "StarterGui",
  "StarterPack",
  "StarterPlayer",
  "Teams",
  "SoundService",
  "Chat",
  "TextChatService",
  "RunService",
  "TweenService",
  "DataStoreService",
  "HttpService",
  "CollectionService",
  "Debris",
  "UserInputService",
  "ContextActionService",
  "MarketplaceService",
  "BadgeService",
  "TeleportService",
  "PathfindingService",
  "PhysicsService",
  "TextService",
  "LocalizationService",
  "GroupService",
  "MessagingService",
  "MemoryStoreService",
  "ProximityPromptService",
  "GuiService",
  "HapticService",
  "VRService",
  "SocialService",
  "PolicyService",
  "AnalyticsService",
  "AssetService",
  "ContentProvider",
  "AvatarEditorService",
  "InsertService",
  "Stats",
];

/** Deep-copies Lua values crossing a remote/bindable boundary (like Roblox does). */
function copyAcross(v: unknown, seen = new Map<LuaTable, LuaTable>()): unknown {
  if (v instanceof LuaFunction) return undefined;
  if (!(v instanceof LuaTable)) return v;
  const existing = seen.get(v);
  if (existing) return existing;
  const t = new LuaTable();
  seen.set(v, t);
  for (const [k, val] of v.entries()) t.set(copyAcross(k, seen), copyAcross(val, seen));
  return t;
}

function toJSONValue(v: unknown, what: "json" | "datastore"): unknown {
  if (v === undefined || typeof v === "boolean" || typeof v === "string") return v ?? null;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) {
      if (what === "datastore")
        throw new LuaError("104: Cannot store NaN or infinity in data store.");
      return null;
    }
    return v;
  }
  if (v instanceof LuaTable) {
    const entries = v.entries();
    const isArray = entries.every(([k], i) => k === i + 1);
    if (isArray) return entries.map(([, val]) => toJSONValue(val, what));
    const obj: Record<string, unknown> = {};
    for (const [k, val] of entries) {
      if (typeof k !== "string" && typeof k !== "number") {
        if (what === "datastore")
          throw new LuaError(
            `104: Cannot store Dictionary in data store. Data stores can only accept valid UTF-8 characters.`,
          );
        continue;
      }
      if (typeof k === "number" && what === "datastore") {
        throw new LuaError(
          `104: Cannot store Array in data store. Data stores can only accept valid UTF-8 characters.`,
        );
      }
      obj[String(k)] = toJSONValue(val, what);
    }
    return obj;
  }
  if (what === "datastore") {
    throw new LuaError(
      `104: Cannot store ${robloxTypeOf(v)} in data store. Data stores can only accept valid UTF-8 characters.`,
    );
  }
  return null;
}

function fromJSONValue(v: unknown): unknown {
  if (v === null || v === undefined) return undefined;
  if (Array.isArray(v)) return LuaTable.from(v.map(fromJSONValue));
  if (typeof v === "object") {
    const t = new LuaTable();
    for (const [k, val] of Object.entries(v as Record<string, unknown>))
      t.set(k, fromJSONValue(val));
    return t;
  }
  return v;
}

function easing(style: string, dir: string, t: number): number {
  const base: Record<string, (x: number) => number> = {
    Linear: (x) => x,
    Quad: (x) => x * x,
    Cubic: (x) => x * x * x,
    Quart: (x) => x ** 4,
    Quint: (x) => x ** 5,
    Sine: (x) => 1 - Math.cos((x * Math.PI) / 2),
    Exponential: (x) => (x === 0 ? 0 : 2 ** (10 * x - 10)),
    Circular: (x) => 1 - Math.sqrt(1 - x * x),
    Back: (x) => 2.70158 * x ** 3 - 1.70158 * x * x,
    Elastic: (x) =>
      x === 0 || x === 1
        ? x
        : -(2 ** (10 * x - 10)) * Math.sin((x * 10 - 10.75) * ((2 * Math.PI) / 3)),
    Bounce: (x) => 1 - bounceOut(1 - x),
  };
  const f = base[style] ?? base.Quad;
  if (dir === "In") return f(t);
  if (dir === "Out") return 1 - f(1 - t);
  return t < 0.5 ? f(t * 2) / 2 : 1 - f((1 - t) * 2) / 2;
}
function bounceOut(x: number): number {
  const n = 7.5625;
  const d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
}

function lerpValue(a: unknown, b: unknown, t: number): unknown {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * t;
  if (a instanceof Vector3 && b instanceof Vector3) return a.lerp(b, t);
  if (a instanceof Vector2 && b instanceof Vector2)
    return new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  if (a instanceof Color3 && b instanceof Color3)
    return new Color3(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
  if (a instanceof UDim2 && b instanceof UDim2) {
    const l = (p: number, q: number) => p + (q - p) * t;
    return new UDim2(
      new UDim(l(a.x.scale, b.x.scale), l(a.x.offset, b.x.offset)),
      new UDim(l(a.y.scale, b.y.scale), l(a.y.offset, b.y.offset)),
    );
  }
  if (a instanceof UDim && b instanceof UDim)
    return new UDim(a.scale + (b.scale - a.scale) * t, a.offset + (b.offset - a.offset) * t);
  if (a instanceof CFrame && b instanceof CFrame)
    return t >= 1 ? b : new CFrame(a.p.lerp(b.p, t), t < 0.5 ? a.r : b.r);
  return t >= 1 ? b : a;
}

function tweenTypeName(v: unknown): string {
  if (typeof v === "number") return "float";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "string") return "string";
  return robloxTypeOf(v);
}

let servicesDefined = false;

export class World {
  interp: Interpreter;
  game: Instance;
  options: Required<Pick<WorldOptions, "dataStoresEnabled" | "httpEnabled">>;
  private services = new Map<string, Instance>();
  private tagSignals = new Map<string, { added: RBXSignal; removed: RBXSignal }>();
  private contexts = new Map<Instance, ScriptContext[]>();
  private dataStores = new Map<string, Map<string, string>>();
  private lastWrite = new Map<string, number>();
  private playerSeq = 0;
  private bindToClose: LuaFunction[] = [];
  private guidSeq = 0;
  private mice = new Map<Instance, Instance>();
  private boundActions = new Map<
    string,
    { fn: LuaFunction; keys: string[]; script?: ScriptContext }
  >();

  constructor(options: WorldOptions = {}) {
    installClasses();
    defineServiceClasses();
    this.options = {
      dataStoresEnabled: options.dataStoresEnabled ?? true,
      httpEnabled: options.httpEnabled ?? false,
    };
    this.interp = new Interpreter({
      timeoutSteps: options.timeoutSteps,
      maxTotalSteps: options.maxTotalSteps,
    });
    installStdlib(this.interp, { randomSeed: options.randomSeed });

    this.game = new Instance(this, "DataModel", "Game");
    for (const name of SERVICE_NAMES) {
      const svc = new Instance(this, classExists(name) ? name : "Folder", name);
      svc.parent = this.game;
      this.game.children.push(svc);
      this.services.set(name, svc);
    }
    const workspace = this.service("Workspace");
    const camera = new Instance(this, "Camera", "Camera");
    camera.parent = workspace;
    workspace.children.push(camera);
    workspace.props.set("CurrentCamera", camera);
    const terrain = new Instance(this, "Terrain", "Terrain");
    terrain.parent = workspace;
    workspace.children.push(terrain);
    terrain.props.set("Anchored", true);
    const starterPlayer = this.service("StarterPlayer");
    for (const n of ["StarterPlayerScripts", "StarterCharacterScripts"]) {
      const f = new Instance(this, n, n);
      f.parent = starterPlayer;
      starterPlayer.children.push(f);
    }

    this.installGlobals();
    const runService = this.service("RunService");
    this.interp.heartbeatActive = () =>
      [
        "Heartbeat",
        "Stepped",
        "RenderStepped",
        "PreSimulation",
        "PostSimulation",
        "PreRender",
      ].some((e) => runService.signal(e).hasListeners());
    this.interp.fireHeartbeat = (dt) => {
      runService.fire("Stepped", [this.interp.time, dt]);
      runService.fire("PreSimulation", [dt]);
      runService.fire("Heartbeat", [dt]);
      runService.fire("PostSimulation", [dt]);
      runService.fire("RenderStepped", [dt]);
      runService.fire("PreRender", [dt]);
    };
  }

  // ------------------------------------------------------------------ basics
  service(name: string): Instance {
    const s = this.services.get(name);
    if (!s) throw new Error(`no service ${name}`);
    return s;
  }
  get workspace() {
    return this.service("Workspace");
  }
  get output(): OutputEntry[] {
    return this.interp.output;
  }
  get errors(): RuntimeErrorInfo[] {
    return this.interp.errors;
  }
  run(seconds: number) {
    this.interp.runFor(seconds);
  }

  /** Engine-side helper to build fixtures. */
  create(className: string, props: Record<string, unknown> = {}, parent?: Instance): Instance {
    const inst = new Instance(this, className);
    for (const [k, v] of Object.entries(props)) {
      if (k === "Name") inst.name = String(v);
      else {
        try {
          inst.luaNewIndex(k, v);
        } catch {
          inst.setProp(k, v);
        }
      }
    }
    if (parent) inst.setParent(parent, true);
    return inst;
  }

  /** Finds an instance by a dotted path like "Workspace.Door" or "ServerScriptService.Script". */
  find(path: string): Instance | undefined {
    let cur: Instance | undefined = this.game;
    for (const part of path.split(".")) {
      cur = cur?.findFirstChild(part);
      if (!cur) return undefined;
    }
    return cur;
  }

  addScript(opts: {
    source: string;
    kind?: "Script" | "LocalScript" | "ModuleScript";
    name?: string;
    parent: Instance;
  }): Instance {
    const s = new Instance(this, opts.kind ?? "Script", opts.name ?? opts.kind ?? "Script");
    s.source = opts.source;
    s.setParent(opts.parent, true);
    return s;
  }

  currentSide(I?: InterpreterLike): "server" | "client" {
    return (I ?? this.interp).currentScript()?.side ?? "server";
  }

  /** Clients can't see ServerStorage / ServerScriptService contents. */
  hiddenFromClient(inst: Instance, I?: InterpreterLike): boolean {
    if (this.currentSide(I) !== "client") return false;
    let cur: Instance | undefined = inst;
    while (cur) {
      if (
        cur === this.services.get("ServerStorage") ||
        cur === this.services.get("ServerScriptService")
      )
        return true;
      cur = cur.parent;
    }
    return false;
  }

  // ------------------------------------------------------------------ hooks from Instance
  specialGet(inst: Instance, key: string, I: Interpreter): { handled: boolean; value?: unknown } {
    if (inst.className === "Players" && key === "LocalPlayer") {
      const ctx = I.currentScript();
      return { handled: true, value: ctx?.side === "client" ? ctx.player : undefined };
    }
    if (inst.className === "Humanoid" && key === "RootPart") {
      return { handled: true, value: inst.parent?.findFirstChild("HumanoidRootPart") };
    }
    if (inst.className === "Sound" && key === "IsPlaying")
      return { handled: true, value: inst.props.get("Playing") === true };
    if (
      (inst.className === "ServerStorage" || inst.className === "ServerScriptService") &&
      this.currentSide(I) === "client"
    ) {
      if (inst.children.some((c) => c.name === key)) {
        throw new LuaError(
          `${key} is not a valid member of ${inst.className} "${inst.getFullName()}"`,
        );
      }
    }
    return { handled: false };
  }

  signalGuard(inst: Instance, name: string) {
    if (inst.isA("RemoteEvent") && name === "OnServerEvent") {
      return (I: InterpreterLike) => {
        if (this.currentSide(I) !== "server")
          throw new LuaError("OnServerEvent can only be used on the server");
      };
    }
    if (inst.isA("RemoteEvent") && name === "OnClientEvent") {
      return (I: InterpreterLike) => {
        if (this.currentSide(I) !== "client")
          throw new LuaError("OnClientEvent can only be used on the client");
      };
    }
    if (inst.className === "RunService" && (name === "RenderStepped" || name === "PreRender")) {
      return (I: InterpreterLike) => {
        if (this.currentSide(I) !== "client")
          throw new LuaError(`${name} event can only be used from local scripts`);
      };
    }
    return undefined;
  }

  onPropertyChanged(inst: Instance, name: string, old: unknown, value: unknown) {
    if (inst.isA("BasePart")) {
      if (name === "Position" && value instanceof Vector3) {
        const cf = inst.props.get("CFrame") as CFrame;
        this.setQuiet(inst, "CFrame", new CFrame(value, cf.r));
      } else if (name === "CFrame" && value instanceof CFrame) {
        this.setQuiet(inst, "Position", value.p);
        const [rx, ry, rz] = value.toOrientation();
        this.setQuiet(
          inst,
          "Orientation",
          new Vector3((rx * 180) / Math.PI, (ry * 180) / Math.PI, (rz * 180) / Math.PI),
        );
      } else if (name === "Orientation" && value instanceof Vector3) {
        const pos = inst.props.get("Position") as Vector3;
        const r = CFrame.orientation(
          (value.x * Math.PI) / 180,
          (value.y * Math.PI) / 180,
          (value.z * Math.PI) / 180,
        ).r;
        this.setQuiet(inst, "CFrame", new CFrame(pos, r));
      } else if (name === "BrickColor" && value instanceof BrickColor) {
        this.setQuiet(inst, "Color", value.color);
      } else if (name === "Color" && value instanceof Color3) {
        this.setQuiet(inst, "BrickColor", BrickColor.fromColor(value));
      }
    }
    if (inst.className === "Humanoid") {
      if (name === "Health") {
        const max = inst.props.get("MaxHealth") as number;
        let h = value as number;
        if (h > max) {
          h = max;
          inst.props.set("Health", h);
        }
        inst.fire("HealthChanged", [h]);
        if (h <= 0 && (old as number) > 0) this.humanoidDied(inst);
      } else if (name === "MaxHealth") {
        const h = inst.props.get("Health") as number;
        if (h > (value as number)) inst.setProp("Health", value);
      }
    }
    if (inst.className === "Sound" && name === "Playing") {
      if (value === true) this.playSound(inst);
    }
    if (inst.isA("BaseScript") && (name === "Disabled" || name === "Enabled")) {
      if (inst.props.get("Enabled") !== false && inst.props.get("Disabled") !== true)
        this.maybeStartScripts(inst);
      else this.killScript(inst);
    }
  }

  private setQuiet(inst: Instance, prop: string, value: unknown) {
    inst.props.set(prop, value);
    inst.fireChanged(prop);
  }

  onParentChanged(inst: Instance, old: Instance | undefined) {
    const nowInGame = inst.isDescendantOf(this.game);
    const wasInGame = old ? old === this.game || old.isDescendantOf(this.game) : false;
    if (nowInGame !== wasInGame) {
      for (const d of [inst, ...inst.descendants()]) {
        for (const tag of d.tags) {
          const sig = this.tagSignals.get(tag);
          if (sig) (nowInGame ? sig.added : sig.removed).fire([d]);
        }
      }
    }
    if (nowInGame) this.maybeStartScripts(inst);
  }

  onDestroyed(inst: Instance) {
    this.killScript(inst);
  }

  onCallbackSet(_inst: Instance, _key: string) {}

  private killScript(inst: Instance) {
    for (const ctx of this.contexts.get(inst) ?? []) ctx.killed = true;
    this.contexts.delete(inst);
    inst.state.started = false;
  }

  // ------------------------------------------------------------------ tags
  addTag(inst: Instance, tag: string) {
    if (inst.tags.has(tag)) return;
    inst.tags.add(tag);
    if (inst.isDescendantOf(this.game)) this.tagSignals.get(tag)?.added.fire([inst]);
  }
  removeTag(inst: Instance, tag: string) {
    if (!inst.tags.delete(tag)) return;
    if (inst.isDescendantOf(this.game)) this.tagSignals.get(tag)?.removed.fire([inst]);
  }
  tagSignal(tag: string) {
    let s = this.tagSignals.get(tag);
    if (!s) {
      s = {
        added: new RBXSignal(`${tag}Added`, () => this.interp),
        removed: new RBXSignal(`${tag}Removed`, () => this.interp),
      };
      this.tagSignals.set(tag, s);
    }
    return s;
  }

  // ------------------------------------------------------------------ scripts
  private scriptRunInfo(
    inst: Instance,
  ): { side: "server" | "client"; player?: Instance } | undefined {
    if (inst.state.started) return undefined;
    if (inst.props.get("Enabled") === false || inst.props.get("Disabled") === true)
      return undefined;
    if (!inst.isDescendantOf(this.game)) return undefined;
    const ancestors: Instance[] = [];
    let cur = inst.parent;
    while (cur) {
      ancestors.push(cur);
      cur = cur.parent;
    }
    const has = (name: string) => ancestors.some((a) => a.className === name);
    if (inst.className === "LocalScript") {
      if (has("ReplicatedFirst"))
        return {
          side: "client",
          player: this.service("Players").children.find((p) => p.className === "Player"),
        };
      const player = ancestors.find((a) => a.className === "Player");
      if (player && (has("PlayerGui") || has("Backpack") || has("PlayerScripts")))
        return { side: "client", player };
      const model = ancestors.find((a) => a.className === "Model" && this.playerFromCharacter(a));
      if (model && has("Workspace"))
        return { side: "client", player: this.playerFromCharacter(model) };
      return undefined;
    }
    if (inst.className === "Script") {
      if (has("Workspace") || has("ServerScriptService") || has("Backpack"))
        return { side: "server" };
    }
    return undefined;
  }

  maybeStartScripts(root: Instance) {
    for (const inst of [root, ...root.descendants()]) {
      if (inst.className !== "Script" && inst.className !== "LocalScript") continue;
      const info = this.scriptRunInfo(inst);
      if (info) this.startScript(inst, info.side, info.player);
    }
  }

  private makeEnv(scriptInst: Instance): LuaTable {
    const env = new LuaTable();
    env.set("script", scriptInst);
    return env;
  }

  private compile(source: string, path: string): FuncExpr | undefined {
    const parsed = parse(source);
    if (parsed.error) {
      this.interp.reportCompileError(path, parsed.error.line, parsed.error.message);
      return undefined;
    }
    return {
      k: "Func",
      params: [],
      vararg: true,
      body: parsed.chunk!.body,
      name: "main chunk",
      line: 1,
      endLine: 1,
    };
  }

  startScript(inst: Instance, side: "server" | "client", player?: Instance) {
    inst.state.started = true;
    const ctx: ScriptContext = {
      path: inst.getFullName(),
      name: inst.name,
      kind: inst.className as ScriptContext["kind"],
      side,
      instance: inst,
      player,
    };
    const list = this.contexts.get(inst) ?? [];
    list.push(ctx);
    this.contexts.set(inst, list);
    const fn = this.compile(inst.source ?? "", ctx.path);
    if (!fn) return;
    const scope = new Scope();
    scope.env = this.makeEnv(inst);
    const closure = this.interp.makeClosure(fn, scope, ctx);
    this.interp.enqueue(closure, [], ctx);
  }

  private *requireModule(module: Instance, I: Interpreter): LuaGen<unknown[]> {
    const caller = I.currentScript();
    const side = caller?.side ?? "server";
    const key = `module_${side}`;
    const cache = module.state[key] as { status: string; value?: unknown } | undefined;
    if (cache?.status === "done") return [cache.value];
    if (cache?.status === "loading") throw I.error("Requested module was required recursively");
    if (cache?.status === "error")
      throw I.error("Requested module experienced an error while loading");
    module.state[key] = { status: "loading" };
    const ctx: ScriptContext = {
      path: module.getFullName(),
      name: module.name,
      kind: "ModuleScript",
      side,
      instance: module,
      player: caller?.player,
    };
    const list = this.contexts.get(module) ?? [];
    list.push(ctx);
    this.contexts.set(module, list);
    const fn = this.compile(module.source ?? "", ctx.path);
    if (!fn) {
      module.state[key] = { status: "error" };
      throw I.error("Requested module experienced an error while loading");
    }
    const scope = new Scope();
    scope.env = this.makeEnv(module);
    const closure = this.interp.makeClosure(fn, scope, ctx);
    let r: unknown[];
    try {
      r = yield* I.call(closure, []);
    } catch (e) {
      if (!(e instanceof LuaError)) throw e;
      I.reportError(e);
      module.state[key] = { status: "error" };
      throw I.error("Requested module experienced an error while loading");
    }
    if (r.length !== 1) {
      module.state[key] = { status: "error" };
      throw I.error("Module code did not return exactly one value");
    }
    module.state[key] = { status: "done", value: r[0] };
    return [r[0]];
  }

  // ------------------------------------------------------------------ globals
  private installGlobals() {
    const G = this.interp.builtins;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const world = this;
    for (const [k, v] of Object.entries(datatypeGlobals())) G.set(k, v);
    G.set("game", this.game);
    G.set("Game", this.game);
    G.set("workspace", this.workspace);
    G.set("Workspace", this.workspace);
    const instanceLib = new LuaTable();
    instanceLib.set(
      "new",
      native("new", (args, I) => {
        const cls = args[0];
        if (typeof cls !== "string")
          throw I.error(`invalid argument #1 to 'new' (string expected, got ${robloxTypeOf(cls)})`);
        const def = classDef(cls);
        if (!def || !def.creatable) throw I.error(`Unable to create an Instance of type "${cls}"`);
        const inst = new Instance(world, cls);
        if (args[1] !== undefined) {
          if (!(args[1] instanceof Instance))
            throw I.error(
              `invalid argument #2 to 'new' (Instance expected, got ${robloxTypeOf(args[1])})`,
            );
          inst.setParent(args[1]);
        }
        return [inst];
      }),
    );
    instanceLib.set(
      "fromExisting",
      native("fromExisting", (args) => [(args[0] as Instance).clone()]),
    );
    instanceLib.frozen = true;
    G.set("Instance", instanceLib);
    G.set(
      "require",
      nativeGen("require", function* (args, I) {
        const m = args[0];
        if (typeof m === "number")
          throw I.error(
            "require(assetId) isn't available in the simulator — require a ModuleScript instance instead",
          );
        if (!(m instanceof Instance) || m.className !== "ModuleScript")
          throw I.error("Attempted to call require with invalid argument(s).");
        return yield* world.requireModule(m, I as Interpreter);
      }),
    );
    G.set(
      "settings",
      native("settings", () => [new Opaque("GlobalSettings")]),
    );
    G.set(
      "UserSettings",
      native("UserSettings", () => [new Opaque("UserSettings")]),
    );
    G.set(
      "PathWaypoint",
      (() => {
        const t = new LuaTable();
        t.set(
          "new",
          native("new", (a) => [
            new Opaque("PathWaypoint", {
              Position: a[0],
              Action: a[1] ?? enumItem("PathWaypointAction", "Walk"),
            }),
          ]),
        );
        return t;
      })(),
    );
    const rp = new LuaTable();
    rp.set(
      "new",
      native("new", () => [new RaycastParams()]),
    );
    G.set("RaycastParams", rp);
    const op = new LuaTable();
    op.set(
      "new",
      native("new", () => [new RaycastParams("OverlapParams")]),
    );
    G.set("OverlapParams", op);
  }

  // ------------------------------------------------------------------ players
  playerFromCharacter(model: Instance): Instance | undefined {
    return this.service("Players").children.find(
      (p) => p.className === "Player" && p.props.get("Character") === model,
    );
  }

  players(): Instance[] {
    return this.service("Players").children.filter((p) => p.className === "Player");
  }

  addPlayer(name = "Builderman", opts: { characterDelay?: number } = {}): Instance {
    // Like a real server, scripts that are already there get to run before anyone joins.
    this.run(0);
    const players = this.service("Players");
    const player = new Instance(this, "Player", name);
    player.props.set("UserId", 1000 + ++this.playerSeq);
    player.props.set("DisplayName", name);
    for (const n of ["Backpack", "PlayerGui", "PlayerScripts", "StarterGear"]) {
      const c = new Instance(this, n, n);
      c.parent = player;
      player.children.push(c);
    }
    player.setParent(players, true);
    players.fire("PlayerAdded", [player]);
    const ps = player.findFirstChild("PlayerScripts")!;
    for (const child of this.service("StarterPlayer").findFirstChild("StarterPlayerScripts")!
      .children)
      child.clone().setParent(ps, true);
    if (players.props.get("CharacterAutoLoads") !== false) {
      this.interp.schedule(opts.characterDelay ?? 0.1, () => {
        if (player.parent === players) this.loadCharacter(player);
      });
    }
    return player;
  }

  removePlayer(player: Instance) {
    const players = this.service("Players");
    if (player.parent !== players) return;
    players.fire("PlayerRemoving", [player]);
    // Handlers run first (they can still read player.leaderstats), then the player leaves.
    this.interp.schedule(0, () => {
      const char = player.props.get("Character") as Instance | undefined;
      if (char) {
        player.fire("CharacterRemoving", [char]);
        char.destroy();
      }
      player.setParent(undefined, true);
    });
  }

  private spawnPoint(player: Instance): CFrame {
    const chosen = player.props.get("RespawnLocation") as Instance | undefined;
    const spawn =
      chosen && chosen.isDescendantOf(this.workspace)
        ? chosen
        : this.workspace
            .descendants()
            .find((d) => d.className === "SpawnLocation" && d.props.get("Enabled") !== false);
    if (spawn) {
      const pos = spawn.props.get("Position") as Vector3;
      const size = spawn.props.get("Size") as Vector3;
      return new CFrame(new Vector3(pos.x, pos.y + size.y / 2 + 3, pos.z));
    }
    return new CFrame(new Vector3(0, 5, 0));
  }

  loadCharacter(player: Instance): Instance {
    const old = player.props.get("Character") as Instance | undefined;
    if (old) {
      player.fire("CharacterRemoving", [old]);
      old.destroy();
    }
    const char = new Instance(this, "Model", player.name);
    const base = this.spawnPoint(player).p;
    const part = (
      name: string,
      size: Vector3,
      offset: Vector3,
      extra: Record<string, unknown> = {},
    ) => {
      const p = new Instance(this, "Part", name);
      p.props.set("Size", size);
      p.props.set("Position", base.add(offset));
      p.props.set("CFrame", new CFrame(base.add(offset)));
      for (const [k, v] of Object.entries(extra)) p.props.set(k, v);
      p.parent = char;
      char.children.push(p);
      return p;
    };
    const root = part("HumanoidRootPart", new Vector3(2, 2, 1), new Vector3(0, 0, 0), {
      Transparency: 1,
    });
    part("Head", new Vector3(2, 1, 1), new Vector3(0, 1.5, 0));
    part("UpperTorso", new Vector3(2, 1, 1), new Vector3(0, 0.5, 0));
    part("LowerTorso", new Vector3(2, 0.4, 1), new Vector3(0, -0.3, 0));
    part("LeftHand", new Vector3(0.6, 0.6, 0.6), new Vector3(-1.5, -0.8, 0));
    part("RightHand", new Vector3(0.6, 0.6, 0.6), new Vector3(1.5, -0.8, 0));
    part("LeftFoot", new Vector3(0.8, 0.4, 1), new Vector3(-0.5, -2.8, 0));
    part("RightFoot", new Vector3(0.8, 0.4, 1), new Vector3(0.5, -2.8, 0));
    const hum = new Instance(this, "Humanoid", "Humanoid");
    hum.props.set("DisplayName", player.props.get("DisplayName"));
    const sp = this.service("StarterPlayer");
    hum.props.set("WalkSpeed", sp.props.get("CharacterWalkSpeed") ?? 16);
    hum.props.set("JumpPower", sp.props.get("CharacterJumpPower") ?? 50);
    hum.parent = char;
    char.children.push(hum);
    const animator = new Instance(this, "Animator", "Animator");
    animator.parent = hum;
    hum.children.push(animator);
    const hat = new Instance(this, "Accessory", "Hat");
    hat.parent = char;
    char.children.push(hat);
    const handle = new Instance(this, "Part", "Handle");
    handle.props.set("Size", new Vector3(1, 1, 1));
    handle.props.set("Position", base.add(new Vector3(0, 2.4, 0)));
    handle.props.set("CanCollide", false);
    handle.parent = hat;
    hat.children.push(handle);
    char.props.set("PrimaryPart", root);
    char.setParent(this.workspace, true);
    player.setProp("Character", char);
    for (const child of sp.findFirstChild("StarterCharacterScripts")!.children)
      child.clone().setParent(char, true);
    // GUI + tools
    const gui = player.findFirstChild("PlayerGui")!;
    for (const g of [...gui.children]) if (g.props.get("ResetOnSpawn") !== false) g.destroy();
    for (const g of this.service("StarterGui").children) {
      if (gui.children.some((c) => c.name === g.name && c.props.get("ResetOnSpawn") === false))
        continue;
      g.clone().setParent(gui, true);
    }
    const backpack = player.findFirstChild("Backpack")!;
    for (const t of [...backpack.children]) t.destroy();
    for (const t of this.service("StarterPack").children) t.clone().setParent(backpack, true);
    player.fire("CharacterAdded", [char]);
    player.fire("CharacterAppearanceLoaded", [char]);
    return char;
  }

  private humanoidDied(hum: Instance) {
    hum.fire("Died");
    hum.fire("StateChanged", [
      enumItem("HumanoidStateType", "Running"),
      enumItem("HumanoidStateType", "Dead"),
    ]);
    const char = hum.parent;
    if (!char) return;
    const player = this.playerFromCharacter(char);
    if (!player) return;
    const delay = (this.service("Players").props.get("RespawnTime") as number) ?? 5;
    this.interp.schedule(delay, () => {
      if (player.parent === this.service("Players") && player.props.get("Character") === char)
        this.loadCharacter(player);
    });
  }

  private playSound(sound: Instance) {
    sound.fire("Played", [sound.props.get("SoundId")]);
    const length = (sound.props.get("TimeLength") as number) || 1;
    this.interp.schedule(length / ((sound.props.get("PlaybackSpeed") as number) || 1), () => {
      if (sound.props.get("Playing") !== true) return;
      if (sound.props.get("Looped") === true) {
        sound.fire("DidLoop", [sound.props.get("SoundId"), 1]);
        this.playSound(sound);
        return;
      }
      sound.setProp("Playing", false);
      sound.fire("Ended", [sound.props.get("SoundId")]);
    });
  }

  // ------------------------------------------------------------------ simulation actions
  touch(a: Instance, b: Instance) {
    if (a.destroyed || b.destroyed) return;
    if (a.props.get("CanTouch") === false || b.props.get("CanTouch") === false) return;
    a.fire("Touched", [b]);
    b.fire("Touched", [a]);
  }

  touchWithCharacter(part: Instance, player: Instance, limb = "LeftFoot") {
    const char = player.props.get("Character") as Instance | undefined;
    const p = char?.findFirstChild(limb) ?? char?.findFirstChild("HumanoidRootPart");
    if (p) this.touch(part, p);
  }

  click(target: Instance, player?: Instance) {
    if (target.className === "ClickDetector") {
      target.fire("MouseClick", [player ?? this.players()[0]]);
      return;
    }
    const owner = player ?? this.players()[0];
    const onlyOwner = (ctx: ScriptContext | undefined) =>
      !ctx || ctx.side === "server" || !owner || ctx.player === owner;
    target.fire("MouseButton1Down", [0, 0], onlyOwner);
    target.fire("MouseButton1Up", [0, 0], onlyOwner);
    target.fire("MouseButton1Click", [], onlyOwner);
    target.fire("Activated", [new InputObject("MouseButton1", "Unknown", "End"), 1], onlyOwner);
  }

  hover(target: Instance, enter = true) {
    target.fire(enter ? "MouseEnter" : "MouseLeave", [0, 0]);
  }

  trigger(prompt: Instance, player?: Instance) {
    const p = player ?? this.players()[0];
    if (prompt.props.get("Enabled") === false) return;
    prompt.fire("PromptButtonHoldBegan", [p]);
    prompt.fire("Triggered", [p]);
    prompt.fire("TriggerEnded", [p]);
    this.service("ProximityPromptService").fire("PromptTriggered", [prompt, p]);
  }

  pressKey(player: Instance | undefined, key: string, state: "Begin" | "End" = "Begin") {
    const input = new InputObject("Keyboard", key, state);
    const uis = this.service("UserInputService");
    const onlyOwner = (ctx: ScriptContext | undefined) =>
      !!ctx && ctx.side === "client" && (!player || ctx.player === player);
    uis.fire(state === "Begin" ? "InputBegan" : "InputEnded", [input, false], onlyOwner);
    for (const [name, action] of this.boundActions) {
      if (action.keys.includes(key) && (!player || action.script?.player === player)) {
        this.interp.enqueue(
          action.fn,
          [name, enumItem("UserInputState", state), input],
          action.script,
        );
      }
    }
  }

  /** Simulates `remote:FireServer(...)` sent by `player`'s client. */
  fireServer(remote: Instance, player: Instance, ...args: unknown[]) {
    remote.fire(
      "OnServerEvent",
      [player, ...args.map((a) => copyAcross(a))],
      (ctx) => !ctx || ctx.side === "server",
    );
  }

  async shutdown() {
    for (const p of this.players()) this.removePlayer(p);
    for (const fn of this.bindToClose) this.interp.enqueue(fn, []);
    this.run(1);
  }

  // ------------------------------------------------------------------ service behaviour (used by class methods)
  registerBindToClose(fn: LuaFunction) {
    this.bindToClose.push(fn);
  }

  mouseFor(player: Instance): Instance {
    let m = this.mice.get(player);
    if (!m) {
      m = new Instance(this, "PlayerMouse", "Mouse");
      this.mice.set(player, m);
    }
    return m;
  }

  bindAction(name: string, fn: LuaFunction, keys: string[], script?: ScriptContext) {
    this.boundActions.set(name, { fn, keys, script });
  }
  unbindAction(name: string) {
    this.boundActions.delete(name);
  }

  dataStore(name: string) {
    let s = this.dataStores.get(name);
    if (!s) {
      s = new Map();
      this.dataStores.set(name, s);
    }
    return s;
  }

  noteWrite(store: string, key: string, I: InterpreterLike) {
    const id = `${store}/${key}`;
    const last = this.lastWrite.get(id);
    if (last !== undefined && I.now() - last < 6) {
      I.print(
        "warn",
        `DataStore request was added to queue. If request queue fills, further requests will be dropped. Try sending fewer requests.Key = ${key}`,
      );
    }
    this.lastWrite.set(id, I.now());
  }

  nextGuid(wrap: boolean) {
    this.guidSeq++;
    const hex = this.guidSeq.toString(16).padStart(12, "0");
    const g = `A1B2C3D4-E5F6-47A8-9B0C-${hex.toUpperCase()}`;
    return wrap ? `{${g}}` : g;
  }

  playTween(tween: Instance) {
    const st = tween.state as { target: Instance; goals: Map<string, unknown>; gen: number };
    const target = st.target;
    const info = tween.props.get("TweenInfo") as import("./datatypes").TweenInfo;
    const duration = Math.max(info.time, 0);
    const gen = ++st.gen;
    const repeats = info.repeatCount < 0 ? 5 : info.repeatCount;
    tween.setProp(
      "PlaybackState",
      enumItem("PlaybackState", info.delayTime > 0 ? "Delayed" : "Playing"),
    );
    let cycle = 0;
    const startCycle = () => {
      const from = new Map<string, unknown>();
      for (const k of st.goals.keys()) from.set(k, target.props.get(k));
      const steps = Math.max(1, Math.round(duration * 30));
      const forward = [...Array(steps).keys()].map((i) => (i + 1) / steps);
      const plan = info.reverses ? [...forward, ...forward.map((t) => 1 - t)] : forward;
      tween.setProp("PlaybackState", enumItem("PlaybackState", "Playing"));
      plan.forEach((t, i) => {
        this.interp.schedule(((i + 1) * duration) / steps, () => {
          if (st.gen !== gen || target.destroyed) return;
          const e = easing(info.style.name, info.direction.name, t);
          for (const [k, goal] of st.goals)
            target.setProp(k, t >= 1 && !info.reverses ? goal : lerpValue(from.get(k), goal, e));
          if (i === plan.length - 1) {
            if (info.reverses) for (const [k] of st.goals) target.setProp(k, from.get(k));
            if (cycle < repeats) {
              cycle++;
              startCycle();
            } else {
              tween.setProp("PlaybackState", enumItem("PlaybackState", "Completed"));
              tween.fire("Completed", [enumItem("PlaybackState", "Completed")]);
            }
          }
        });
      });
    };
    this.interp.schedule(info.delayTime, () => {
      if (st.gen === gen) startCycle();
    });
  }
}

// ------------------------------------------------------------------ small userdata
export class InputObject extends Userdata {
  readonly luaType = "Instance";
  constructor(
    public inputType: string,
    public keyCode: string,
    public state: string,
  ) {
    super();
  }
  luaIndex(key: unknown): unknown {
    switch (key) {
      case "KeyCode":
        return enumItem("KeyCode", this.keyCode);
      case "UserInputType":
        return enumItem("UserInputType", this.inputType);
      case "UserInputState":
        return enumItem("UserInputState", this.state);
      case "Position":
        return new Vector3(0, 0, 0);
      case "Delta":
        return new Vector3(0, 0, 0);
      case "ClassName":
        return "InputObject";
      case "Name":
        return "InputObject";
    }
    throw new LuaError(`${String(key)} is not a valid member of InputObject "InputObject"`);
  }
  luaToString() {
    return "InputObject";
  }
}

export class RaycastParams extends Userdata {
  filter: Instance[] = [];
  filterType: EnumItem = enumItem("RaycastFilterType", "Exclude");
  ignoreWater = false;
  collisionGroup = "Default";
  constructor(public readonly luaType = "RaycastParams") {
    super();
  }
  luaIndex(key: unknown): unknown {
    if (key === "FilterDescendantsInstances") return LuaTable.from(this.filter);
    if (key === "FilterType") return this.filterType;
    if (key === "IgnoreWater") return this.ignoreWater;
    if (key === "CollisionGroup") return this.collisionGroup;
    if (key === "MaxParts") return 0;
    if (key === "AddToFilter") {
      return native("AddToFilter", (a) => {
        const v = a[1];
        if (v instanceof Instance) this.filter.push(v);
        else if (v instanceof LuaTable)
          for (const [, x] of v.entries()) if (x instanceof Instance) this.filter.push(x);
        return [];
      });
    }
    throw new LuaError(`${String(key)} is not a valid member of ${this.luaType}`);
  }
  luaNewIndex(key: unknown, value: unknown): void {
    if (key === "FilterDescendantsInstances") {
      if (!(value instanceof LuaTable)) throw new LuaError(`Unable to cast value to Objects`);
      this.filter = value
        .entries()
        .map(([, v]) => v)
        .filter((v): v is Instance => v instanceof Instance);
      return;
    }
    if (key === "FilterType") {
      if (!(value instanceof EnumItem))
        throw new LuaError("Unable to assign property FilterType. EnumItem expected");
      this.filterType = value;
      return;
    }
    if (key === "IgnoreWater") {
      this.ignoreWater = isTruthy(value);
      return;
    }
    if (
      key === "CollisionGroup" ||
      key === "MaxParts" ||
      key === "RespectCanCollide" ||
      key === "BruteForceAllSlow"
    )
      return;
    throw new LuaError(`${String(key)} is not a valid member of ${this.luaType}`);
  }
}

function aabb(part: Instance) {
  const pos = part.props.get("Position") as Vector3;
  const size = part.props.get("Size") as Vector3;
  return {
    min: new Vector3(pos.x - size.x / 2, pos.y - size.y / 2, pos.z - size.z / 2),
    max: new Vector3(pos.x + size.x / 2, pos.y + size.y / 2, pos.z + size.z / 2),
  };
}

function passesFilter(part: Instance, params?: RaycastParams): boolean {
  if (!params) return true;
  const inList = params.filter.some((f) => part === f || part.isDescendantOf(f));
  return params.filterType.name === "Include" || params.filterType.name === "Whitelist"
    ? inList
    : !inList;
}

function raycast(world: World, origin: Vector3, dir: Vector3, params?: RaycastParams): unknown {
  let best: { part: Instance; t: number; normal: Vector3 } | undefined;
  for (const part of world.workspace.descendants()) {
    if (!part.isA("BasePart") || part.className === "Terrain") continue;
    if (part.props.get("CanQuery") === false || !passesFilter(part, params)) continue;
    const { min, max } = aabb(part);
    let tmin = 0;
    let tmax = 1;
    let normal = new Vector3();
    let ok = true;
    for (const axis of ["x", "y", "z"] as const) {
      const o = origin[axis];
      const d = dir[axis];
      if (Math.abs(d) < 1e-9) {
        if (o < min[axis] || o > max[axis]) {
          ok = false;
          break;
        }
        continue;
      }
      let t1 = (min[axis] - o) / d;
      let t2 = (max[axis] - o) / d;
      let n = -1;
      if (t1 > t2) {
        [t1, t2] = [t2, t1];
        n = 1;
      }
      if (t1 > tmin) {
        tmin = t1;
        normal = new Vector3(axis === "x" ? n : 0, axis === "y" ? n : 0, axis === "z" ? n : 0);
      }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) {
        ok = false;
        break;
      }
    }
    if (ok && (!best || tmin < best.t)) best = { part, t: tmin, normal };
  }
  if (!best) return undefined;
  const position = origin.add(dir.scale(best.t));
  return new Opaque("RaycastResult", {
    Instance: best.part,
    Position: position,
    Normal: best.normal,
    Distance: dir.magnitude * best.t,
    Material: best.part.props.get("Material"),
  });
}

function overlapping(world: World, min: Vector3, max: Vector3, params?: RaycastParams): LuaTable {
  const out: Instance[] = [];
  for (const part of world.workspace.descendants()) {
    if (!part.isA("BasePart") || part.className === "Terrain" || !passesFilter(part, params))
      continue;
    const b = aabb(part);
    if (
      b.min.x <= max.x &&
      b.max.x >= min.x &&
      b.min.y <= max.y &&
      b.max.y >= min.y &&
      b.min.z <= max.z &&
      b.max.z >= min.z
    )
      out.push(part);
  }
  return LuaTable.from(out);
}

// ------------------------------------------------------------------ service classes
function arg(a: unknown[], i: number): string {
  const v = a[i];
  if (typeof v === "string") return v;
  if (typeof v === "number") return formatNumber(v);
  throw new LuaError(`Argument ${i + 1} missing or nil`);
}

function requireSide(I: InterpreterLike, world: World, side: "server" | "client", message: string) {
  if (world.currentSide(I) !== side) throw new LuaError(message);
}

function* waitFor(I: InterpreterLike, seconds: number): LuaGen<void> {
  yield { t: "wait", d: seconds };
}

function modelParts(model: Instance): Instance[] {
  return model.descendants().filter((d) => d.isA("BasePart"));
}

function modelPivot(model: Instance): CFrame {
  const primary = model.props.get("PrimaryPart") as Instance | undefined;
  if (primary && primary.isDescendantOf(model)) return primary.props.get("CFrame") as CFrame;
  const parts = modelParts(model);
  if (parts.length === 0) return (model.props.get("WorldPivot") as CFrame) ?? new CFrame();
  let min = new Vector3(Infinity, Infinity, Infinity);
  let max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const p of parts) {
    const b = aabb(p);
    min = new Vector3(Math.min(min.x, b.min.x), Math.min(min.y, b.min.y), Math.min(min.z, b.min.z));
    max = new Vector3(Math.max(max.x, b.max.x), Math.max(max.y, b.max.y), Math.max(max.z, b.max.z));
  }
  return new CFrame(min.lerp(max, 0.5));
}

function pivotTo(model: Instance, target: CFrame) {
  const delta = target.mul(modelPivot(model).inverse());
  for (const p of modelParts(model))
    p.setProp("CFrame", delta.mul(p.props.get("CFrame") as CFrame));
}

function defineServiceClasses() {
  if (servicesDefined) return;
  servicesDefined = true;
  const svc = (name: string, def: Parameters<typeof defineClass>[1] = {}) =>
    defineClass(name, { ...def, service: true });

  defineClass("DataModel", {
    props: {
      PlaceId: { type: "int", def: () => 0, readOnly: true },
      GameId: { type: "int", def: () => 0, readOnly: true },
      JobId: { type: "string", def: () => "simulated-server", readOnly: true },
      CreatorId: { type: "int", def: () => 0, readOnly: true },
      PlaceVersion: { type: "int", def: () => 1, readOnly: true },
    },
    events: ["Loaded", "Close"],
    methods: {
      GetService: (self, a) => {
        const name = a[0];
        if (typeof name !== "string") throw new LuaError("Argument 1 missing or nil");
        const found = self.children.find((c) => c.name === name && classDef(c.className)?.service);
        if (!found) throw new LuaError(`'${name}' is not a valid Service name`);
        return found;
      },
      FindService: (self, a) => self.children.find((c) => c.name === a[0]),
      BindToClose: (self, a) => {
        if (a[0] instanceof LuaFunction) self.world.registerBindToClose(a[0]);
        return [];
      },
      IsLoaded: () => true,
    },
  });

  defineClass("Workspace", {
    methods: {
      Raycast: (self, a) => {
        const origin = a[0];
        const dir = a[1];
        if (!(origin instanceof Vector3))
          throw new LuaError(`Unable to cast ${robloxTypeOf(origin)} to Vector3`);
        if (!(dir instanceof Vector3))
          throw new LuaError(`Unable to cast ${robloxTypeOf(dir)} to Vector3`);
        return raycast(self.world, origin, dir, a[2] instanceof RaycastParams ? a[2] : undefined);
      },
      GetServerTimeNow: (_self, _a, I) => 1_760_000_000 + I.now(),
      GetPartBoundsInRadius: (self, a) => {
        const c = a[0] as Vector3;
        const r = Number(a[1]);
        return overlapping(
          self.world,
          new Vector3(c.x - r, c.y - r, c.z - r),
          new Vector3(c.x + r, c.y + r, c.z + r),
          a[2] as RaycastParams,
        );
      },
      GetPartBoundsInBox: (self, a) => {
        const cf = a[0] as CFrame;
        const s = a[1] as Vector3;
        return overlapping(
          self.world,
          cf.p.sub(s.scale(0.5)),
          cf.p.add(s.scale(0.5)),
          a[2] as RaycastParams,
        );
      },
      GetPartsInPart: (self, a) => {
        const b = aabb(a[0] as Instance);
        const t = overlapping(self.world, b.min, b.max, a[1] as RaycastParams);
        return LuaTable.from(
          t
            .entries()
            .map(([, v]) => v)
            .filter((v) => v !== a[0]),
        );
      },
    },
  });

  defineClass("Model", {
    methods: {
      GetPivot: (self) => modelPivot(self),
      PivotTo: (self, a) => {
        if (!(a[0] instanceof CFrame))
          throw new LuaError(`Unable to cast ${robloxTypeOf(a[0])} to CoordinateFrame`);
        pivotTo(self, a[0]);
        return [];
      },
      MoveTo: (self, a) => {
        if (!(a[0] instanceof Vector3))
          throw new LuaError(`Unable to cast ${robloxTypeOf(a[0])} to Vector3`);
        pivotTo(self, new CFrame(a[0], modelPivot(self).r));
        return [];
      },
      SetPrimaryPartCFrame: (self, a) => {
        const primary = self.props.get("PrimaryPart") as Instance | undefined;
        if (!primary)
          throw new LuaError(
            "Model:SetPrimaryPartCFrame() failed because no PrimaryPart has been set, or the PrimaryPart no longer exists. Please set Model.PrimaryPart before using this.",
          );
        pivotTo(self, a[0] as CFrame);
        return [];
      },
      GetPrimaryPartCFrame: (self) =>
        (self.props.get("PrimaryPart") as Instance | undefined)?.props.get("CFrame"),
      TranslateBy: (self, a) => {
        pivotTo(self, modelPivot(self).luaArith("+", a[0], true) as CFrame);
        return [];
      },
      GetBoundingBox: (self) => {
        const parts = modelParts(self);
        if (!parts.length) return [new CFrame(), new Vector3()];
        let min = new Vector3(Infinity, Infinity, Infinity);
        let max = new Vector3(-Infinity, -Infinity, -Infinity);
        for (const p of parts) {
          const b = aabb(p);
          min = new Vector3(
            Math.min(min.x, b.min.x),
            Math.min(min.y, b.min.y),
            Math.min(min.z, b.min.z),
          );
          max = new Vector3(
            Math.max(max.x, b.max.x),
            Math.max(max.y, b.max.y),
            Math.max(max.z, b.max.z),
          );
        }
        return [new CFrame(min.lerp(max, 0.5)), max.sub(min)];
      },
      GetExtentsSize: (self) => {
        const parts = modelParts(self);
        if (!parts.length) return new Vector3();
        let min = new Vector3(Infinity, Infinity, Infinity);
        let max = new Vector3(-Infinity, -Infinity, -Infinity);
        for (const p of parts) {
          const b = aabb(p);
          min = new Vector3(
            Math.min(min.x, b.min.x),
            Math.min(min.y, b.min.y),
            Math.min(min.z, b.min.z),
          );
          max = new Vector3(
            Math.max(max.x, b.max.x),
            Math.max(max.y, b.max.y),
            Math.max(max.z, b.max.z),
          );
        }
        return max.sub(min);
      },
      ScaleTo: () => [],
      GetScale: () => 1,
    },
  });

  const loadAnimation = (self: Instance, a: unknown[], owner: Instance) => {
    const anim = a[0];
    if (!(anim instanceof Instance) || anim.className !== "Animation")
      throw new LuaError(`Unable to cast value to Object`);
    if (!owner.isDescendantOf(self.world.game)) {
      throw new LuaError(
        `LoadAnimation requires the ${owner.className} object (${owner.getFullName()}) to be a descendant of the game object`,
      );
    }
    const track = new Instance(self.world, "AnimationTrack", anim.name);
    track.props.set("Animation", anim);
    return track;
  };

  defineClass("Humanoid", {
    methods: {
      TakeDamage: (self, a) => {
        const n = toNumber(a[0]);
        if (n === undefined)
          throw new LuaError(
            `invalid argument #1 to 'TakeDamage' (number expected, got ${robloxTypeOf(a[0])})`,
          );
        if (self.parent?.findFirstChild("ForceField")) return [];
        self.setProp("Health", Math.max(0, (self.props.get("Health") as number) - n));
        return [];
      },
      MoveTo: (self, a, I) => {
        const pos = a[0];
        if (!(pos instanceof Vector3))
          throw new LuaError(`Unable to cast ${robloxTypeOf(pos)} to Vector3`);
        self.setProp("WalkToPoint", pos);
        const root = self.parent?.findFirstChild("HumanoidRootPart");
        if (!root) return [];
        const from = root.props.get("Position") as Vector3;
        const dist = new Vector3(pos.x - from.x, 0, pos.z - from.z).magnitude;
        const speed = (self.props.get("WalkSpeed") as number) || 16;
        I.schedule(Math.min(dist / speed, 8), () => {
          if (self.parent && dist / speed <= 8) {
            const char = self.parent;
            if (char.isA("Model")) pivotTo(char, new CFrame(new Vector3(pos.x, from.y, pos.z)));
          }
          self.fire("MoveToFinished", [dist / speed <= 8]);
        });
        return [];
      },
      LoadAnimation: (self, a) => loadAnimation(self, a, self),
      GetState: (self) =>
        enumItem(
          "HumanoidStateType",
          (self.props.get("Health") as number) <= 0 ? "Dead" : "Running",
        ),
      ChangeState: (self, a) => {
        if (a[0] instanceof EnumItem && a[0].name === "Dead") self.setProp("Health", 0);
        return [];
      },
      SetStateEnabled: () => [],
      GetStateEnabled: () => true,
      EquipTool: (self, a) => {
        const tool = a[0];
        if (tool instanceof Instance && tool.className === "Tool" && self.parent) {
          tool.setParent(self.parent);
          tool.fire("Equipped", [
            self.world.mouseFor(self.world.playerFromCharacter(self.parent) ?? self),
          ]);
        }
        return [];
      },
      UnequipTools: (self) => {
        const char = self.parent;
        const player = char ? self.world.playerFromCharacter(char) : undefined;
        const backpack = player?.findFirstChild("Backpack");
        if (char && backpack) {
          for (const t of char.children.filter((c) => c.className === "Tool")) {
            t.setParent(backpack);
            t.fire("Unequipped");
          }
        }
        return [];
      },
      GetPlayingAnimationTracks: () => new LuaTable(),
      GetAccessories: (self) =>
        LuaTable.from(self.parent?.children.filter((c) => c.className === "Accessory") ?? []),
      AddAccessory: (self, a) => {
        if (a[0] instanceof Instance && self.parent) a[0].setParent(self.parent);
        return [];
      },
      RemoveAccessories: (self) => {
        for (const c of self.parent?.children.filter((x) => x.className === "Accessory") ?? [])
          c.destroy();
        return [];
      },
    },
  });
  defineClass("Animator", {
    methods: {
      LoadAnimation: (self, a) => loadAnimation(self, a, self),
      GetPlayingAnimationTracks: () => new LuaTable(),
    },
  });
  defineClass("AnimationController", {
    methods: { LoadAnimation: (self, a) => loadAnimation(self, a, self) },
  });
  defineClass("AnimationTrack", {
    methods: {
      Play: (self, _a, I) => {
        self.props.set("IsPlaying", true);
        const gen = ((self.state.gen as number) ?? 0) + 1;
        self.state.gen = gen;
        if (self.props.get("Looped") !== true) {
          I.schedule((self.props.get("Length") as number) || 1, () => {
            if (self.state.gen !== gen) return;
            self.props.set("IsPlaying", false);
            self.fire("Stopped");
            self.fire("Ended");
          });
        }
        return [];
      },
      Stop: (self) => {
        self.state.gen = ((self.state.gen as number) ?? 0) + 1;
        if (self.props.get("IsPlaying")) {
          self.props.set("IsPlaying", false);
          self.fire("Stopped");
          self.fire("Ended");
        }
        return [];
      },
      AdjustSpeed: (self, a) => {
        self.props.set("Speed", toNumber(a[0]) ?? 1);
        return [];
      },
      AdjustWeight: () => [],
      GetMarkerReachedSignal: (self, a) => self.signal(`Marker_${String(a[0])}`),
    },
  });

  defineClass("Player", {
    methods: {
      Kick: (self, a, I) => {
        I.print("info", `${self.name} was kicked${a[0] ? `: ${String(a[0])}` : ""}`);
        self.world.removePlayer(self);
        return [];
      },
      LoadCharacter: (self, _a, I) => {
        requireSide(
          I,
          self.world,
          "server",
          "LoadCharacter can only be called by the backend server",
        );
        self.world.loadCharacter(self);
        return [];
      },
      GetMouse: (self, _a, I) => {
        if (self.world.currentSide(I) !== "client") return undefined;
        return self.world.mouseFor(self);
      },
      IsInGroup: () => false,
      GetRankInGroup: () => 0,
      GetRoleInGroup: () => "Guest",
      IsFriendsWith: () => false,
      HasAppearanceLoaded: () => true,
      GetFriendsOnline: () => new LuaTable(),
      ClearCharacterAppearance: () => [],
      GetJoinData: () => new LuaTable(),
      DistanceFromCharacter: (self, a) => {
        const root = (self.props.get("Character") as Instance | undefined)?.findFirstChild(
          "HumanoidRootPart",
        );
        if (!root || !(a[0] instanceof Vector3)) return 0;
        return (root.props.get("Position") as Vector3).sub(a[0]).magnitude;
      },
    },
  });

  svc("Players", {
    props: {
      MaxPlayers: { type: "int", def: () => 50, readOnly: true },
      RespawnTime: { type: "number", def: () => 5 },
      CharacterAutoLoads: { type: "bool", def: () => true },
    },
    events: ["PlayerAdded", "PlayerRemoving", "PlayerMembershipChanged"],
    methods: {
      GetPlayers: (self) => LuaTable.from(self.world.players()),
      GetPlayerFromCharacter: (self, a) =>
        a[0] instanceof Instance ? self.world.playerFromCharacter(a[0]) : undefined,
      GetPlayerByUserId: (self, a) =>
        self.world.players().find((p) => p.props.get("UserId") === toNumber(a[0])),
      GetUserIdFromNameAsync: (self, a) =>
        self.world
          .players()
          .find((p) => p.name === a[0])
          ?.props.get("UserId") ?? 1,
      GetNameFromUserIdAsync: (self, a) =>
        self.world.players().find((p) => p.props.get("UserId") === toNumber(a[0]))?.name ??
        "Player",
      GetUserThumbnailAsync: (_s, a) => [
        `rbxthumb://type=AvatarHeadShot&id=${String(a[0])}&w=150&h=150`,
        true,
      ],
      GetFriendsAsync: () => new Opaque("FriendPages"),
      GetHumanoidDescriptionFromUserId: () => new Opaque("HumanoidDescription"),
    },
  });

  svc("Lighting", {
    props: {
      ClockTime: { type: "number", def: () => 14 },
      TimeOfDay: { type: "string", def: () => "14:00:00" },
      Brightness: { type: "number", def: () => 2 },
      Ambient: { type: "Color3", def: () => Color3.fromRGB(70, 70, 70) },
      OutdoorAmbient: { type: "Color3", def: () => Color3.fromRGB(70, 70, 70) },
      FogEnd: { type: "number", def: () => 100000 },
      FogStart: { type: "number", def: () => 0 },
      FogColor: { type: "Color3", def: () => Color3.fromRGB(192, 192, 192) },
      GlobalShadows: { type: "bool", def: () => true },
      ExposureCompensation: { type: "number", def: () => 0 },
      GeographicLatitude: { type: "number", def: () => 0 },
      EnvironmentDiffuseScale: { type: "number", def: () => 1 },
      EnvironmentSpecularScale: { type: "number", def: () => 1 },
    },
    methods: {
      GetMinutesAfterMidnight: (self) => (self.props.get("ClockTime") as number) * 60,
      SetMinutesAfterMidnight: (self, a) => {
        const m = toNumber(a[0]) ?? 0;
        self.setProp("ClockTime", (m / 60) % 24);
        return [];
      },
      GetSunDirection: () => new Vector3(0, 1, 0),
    },
  });

  for (const name of [
    "ReplicatedFirst",
    "ReplicatedStorage",
    "ServerScriptService",
    "ServerStorage",
    "StarterPack",
    "SoundService",
    "Chat",
    "TextChatService",
    "ProximityPromptService",
    "GuiService",
    "HapticService",
    "VRService",
    "SocialService",
    "PolicyService",
    "AnalyticsService",
    "AssetService",
    "ContentProvider",
    "AvatarEditorService",
    "InsertService",
    "Stats",
    "LocalizationService",
  ]) {
    svc(name);
  }
  svc("ProximityPromptService", { events: ["PromptTriggered", "PromptShown", "PromptHidden"] });
  svc("ContentProvider", { methods: { PreloadAsync: () => [] } });
  svc("StarterPlayer", {
    props: {
      CharacterWalkSpeed: { type: "number", def: () => 16 },
      CharacterJumpPower: { type: "number", def: () => 50 },
      CharacterJumpHeight: { type: "number", def: () => 7.2 },
      CharacterUseJumpPower: { type: "bool", def: () => true },
      CameraMaxZoomDistance: { type: "number", def: () => 128 },
      LoadCharacterAppearance: { type: "bool", def: () => true },
    },
  });
  defineClass("StarterPlayerScripts", {});
  defineClass("StarterCharacterScripts", {});
  svc("StarterGui", {
    props: {
      ResetPlayerGuiOnSpawn: { type: "bool", def: () => true },
      ShowDevelopmentGui: { type: "bool", def: () => true },
    },
    methods: {
      SetCoreGuiEnabled: () => [],
      GetCoreGuiEnabled: () => true,
      SetCore: (_s, a, I) => {
        if (a[0] === "SendNotification" && a[1] instanceof LuaTable)
          I.print(
            "info",
            `(notification) ${String(a[1].get("Title") ?? "")}: ${String(a[1].get("Text") ?? "")}`,
          );
        return [];
      },
      GetCore: () => undefined,
    },
  });
  svc("Teams", {
    methods: {
      GetTeams: (self) => LuaTable.from(self.children.filter((c) => c.className === "Team")),
    },
  });
  defineClass("Team", {
    methods: {
      GetPlayers: (self) =>
        LuaTable.from(self.world.players().filter((p) => p.props.get("Team") === self)),
    },
  });

  svc("RunService", {
    events: [
      "Heartbeat",
      "Stepped",
      "RenderStepped",
      "PreSimulation",
      "PostSimulation",
      "PreRender",
      "PreAnimation",
    ],
    methods: {
      IsServer: (self, _a, I) => self.world.currentSide(I) === "server",
      IsClient: (self, _a, I) => self.world.currentSide(I) === "client",
      IsStudio: () => true,
      IsRunning: () => true,
      IsRunMode: () => true,
      IsEdit: () => false,
      BindToRenderStep: (self, a, I) => {
        requireSide(
          I,
          self.world,
          "client",
          "BindToRenderStep can only be called from a LocalScript",
        );
        const fn = a[2];
        self.state.renderBinds ??= new Map<string, unknown>();
        if (fn instanceof LuaFunction) {
          const sig = self.signal("RenderStepped");
          const conn = (RBXSignal.connectFn.impl([sig, fn], I).next().value as unknown[])[0];
          (self.state.renderBinds as Map<string, unknown>).set(String(a[0]), conn);
        }
        return [];
      },
      UnbindFromRenderStep: (self, a) => {
        const binds = self.state.renderBinds as Map<string, { disconnect(): void }> | undefined;
        binds?.get(String(a[0]))?.disconnect();
        binds?.delete(String(a[0]));
        return [];
      },
    },
  });

  svc("TweenService", {
    methods: {
      Create: (self, a) => {
        const [target, info, goals] = a;
        if (!(target instanceof Instance)) throw new LuaError("Unable to cast value to Object");
        if (!(info instanceof Userdata) || info.luaType !== "TweenInfo")
          throw new LuaError(`Unable to cast value to TweenInfo`);
        if (!(goals instanceof LuaTable)) throw new LuaError("Unable to cast to Dictionary");
        const goalMap = new Map<string, unknown>();
        for (const [k, v] of goals.entries()) {
          const prop = String(k);
          if (!target.props.has(prop))
            throw new LuaError(
              `TweenService:Create no property named '${prop}' for object '${target.name}'`,
            );
          const current = target.props.get(prop);
          const sameType =
            typeof current === typeof v &&
            (!(current instanceof Userdata) ||
              (v instanceof Userdata && v.luaType === current.luaType));
          const tweenable =
            typeof current === "number" ||
            current instanceof Vector3 ||
            current instanceof Vector2 ||
            current instanceof Color3 ||
            current instanceof UDim2 ||
            current instanceof UDim ||
            current instanceof CFrame ||
            typeof current === "boolean" ||
            current instanceof EnumItem;
          if (!tweenable || !sameType) {
            throw new LuaError(
              `TweenService:Create property named '${prop}' cannot be tweened due to type mismatch (property is a '${tweenTypeName(current)}', but given type is '${tweenTypeName(v)}')`,
            );
          }
          goalMap.set(prop, v);
        }
        const tween = new Instance(self.world, "Tween", "Tween");
        tween.props.set("Instance", target);
        tween.props.set("TweenInfo", info);
        tween.state = { target, goals: goalMap, gen: 0 };
        return tween;
      },
      GetValue: (_s, a) => {
        const t = toNumber(a[0]) ?? 0;
        return easing(
          (a[1] as EnumItem)?.name ?? "Quad",
          (a[2] as EnumItem)?.name ?? "Out",
          Math.min(1, Math.max(0, t)),
        );
      },
    },
  });
  defineClass("Tween", {
    methods: {
      Play: (self) => {
        self.world.playTween(self);
        return [];
      },
      Cancel: (self) => {
        (self.state as { gen: number }).gen++;
        self.setProp("PlaybackState", enumItem("PlaybackState", "Cancelled"));
        self.fire("Completed", [enumItem("PlaybackState", "Cancelled")]);
        return [];
      },
      Pause: (self) => {
        (self.state as { gen: number }).gen++;
        self.setProp("PlaybackState", enumItem("PlaybackState", "Paused"));
        return [];
      },
    },
  });

  // DataStores
  const checkEnabled = (world: World) => {
    if (!world.options.dataStoresEnabled)
      throw new LuaError("502: API Services rejected request with error. HTTP 403 (Forbidden)");
  };
  const keyOf = (a: unknown[]): string => {
    const k = a[0];
    if (typeof k !== "string" && typeof k !== "number")
      throw new LuaError("Argument 1 missing or nil");
    const s = typeof k === "number" ? formatNumber(k) : k;
    if (s.length > 50) throw new LuaError("Key name exceeds the 50 character limit.");
    if (s.length === 0) throw new LuaError("Key name can't be empty.");
    return s;
  };
  svc("DataStoreService", {
    methods: {
      GetDataStore: (self, a, I) => {
        requireSide(I, self.world, "server", "DataStoreService can only be used on the server");
        const name = arg(a, 0);
        const store = new Instance(self.world, "DataStore", name);
        store.state = { store: `${name}/${a[1] === undefined ? "global" : String(a[1])}` };
        return store;
      },
      GetOrderedDataStore: (self, a, I) => {
        requireSide(I, self.world, "server", "DataStoreService can only be used on the server");
        const name = arg(a, 0);
        const store = new Instance(self.world, "OrderedDataStore", name);
        store.state = { store: `ordered:${name}` };
        return store;
      },
      GetGlobalDataStore: (self) => {
        const store = new Instance(self.world, "DataStore", "GlobalDataStore");
        store.state = { store: "__global" };
        return store;
      },
      GetRequestBudgetForRequestType: () => 60,
    },
  });
  defineClass("GlobalDataStore", {
    methods: {
      GetAsync: function* (self, a, I) {
        checkEnabled(self.world);
        const key = keyOf(a);
        yield* waitFor(I, 0.05);
        const raw = self.world.dataStore(self.state.store as string).get(key);
        return [
          raw === undefined ? undefined : fromJSONValue(JSON.parse(raw)),
          new Opaque("DataStoreKeyInfo"),
        ];
      },
      SetAsync: function* (self, a, I) {
        checkEnabled(self.world);
        const key = keyOf(a);
        if (a.length < 2) throw new LuaError("Argument 2 missing or nil");
        const json = JSON.stringify(toJSONValue(a[1], "datastore"));
        self.world.noteWrite(self.state.store as string, key, I);
        yield* waitFor(I, 0.05);
        self.world.dataStore(self.state.store as string).set(key, json);
        return ["version-1"];
      },
      UpdateAsync: function* (self, a, I) {
        checkEnabled(self.world);
        const key = keyOf(a);
        const fn = a[1];
        if (!(fn instanceof LuaFunction)) throw new LuaError("Unable to cast value to Function");
        yield* waitFor(I, 0.05);
        const store = self.world.dataStore(self.state.store as string);
        const raw = store.get(key);
        const old = raw === undefined ? undefined : fromJSONValue(JSON.parse(raw));
        const r = yield* I.call(fn, [old, new Opaque("DataStoreKeyInfo")]);
        if (r[0] === undefined) return [old];
        store.set(key, JSON.stringify(toJSONValue(r[0], "datastore")));
        self.world.noteWrite(self.state.store as string, key, I);
        return [r[0]];
      },
      IncrementAsync: function* (self, a, I) {
        checkEnabled(self.world);
        const key = keyOf(a);
        yield* waitFor(I, 0.05);
        const store = self.world.dataStore(self.state.store as string);
        const raw = store.get(key);
        const old = raw === undefined ? 0 : JSON.parse(raw);
        if (typeof old !== "number")
          throw new LuaError("IncrementAsync: the stored value is not a number");
        const next = old + (toNumber(a[1]) ?? 1);
        store.set(key, JSON.stringify(next));
        return [next];
      },
      RemoveAsync: function* (self, a, I) {
        checkEnabled(self.world);
        const key = keyOf(a);
        yield* waitFor(I, 0.05);
        const store = self.world.dataStore(self.state.store as string);
        const raw = store.get(key);
        store.delete(key);
        return [raw === undefined ? undefined : fromJSONValue(JSON.parse(raw))];
      },
      GetSortedAsync: function* (self, a, I) {
        checkEnabled(self.world);
        yield* waitFor(I, 0.05);
        const store = self.world.dataStore(self.state.store as string);
        const ascending = isTruthy(a[0]);
        const size = Math.min(100, Math.max(1, toNumber(a[1]) ?? 50));
        const entries = [...store.entries()]
          .map(([key, raw]) => ({ key, value: JSON.parse(raw) as number }))
          .sort((x, y) => (ascending ? x.value - y.value : y.value - x.value));
        const page = LuaTable.from(
          entries.slice(0, size).map((e) => LuaTable.fromRecord({ key: e.key, value: e.value })),
        );
        const pages = new Instance(self.world, "DataStorePages", "Pages");
        pages.state = { page };
        return pages;
      },
    },
  });
  defineClass("DataStorePages", {
    methods: {
      GetCurrentPage: (self) => self.state.page,
      AdvanceToNextPageAsync: () => [],
    },
  });

  svc("HttpService", {
    props: { HttpEnabled: { type: "bool", def: () => false, readOnly: true } },
    methods: {
      JSONEncode: (_s, a) => {
        try {
          return JSON.stringify(toJSONValue(a[0], "json"));
        } catch {
          throw new LuaError("Can't convert to JSON");
        }
      },
      JSONDecode: (_s, a) => {
        const s = a[0];
        if (typeof s !== "string") throw new LuaError(`Argument 1 missing or nil`);
        try {
          return fromJSONValue(JSON.parse(s));
        } catch {
          throw new LuaError("Can't parse JSON");
        }
      },
      GenerateGUID: (self, a) => self.world.nextGuid(a[0] !== false),
      UrlEncode: (_s, a) => encodeURIComponent(String(a[0] ?? "")),
      GetAsync: (self) => {
        throw new LuaError(
          self.world.options.httpEnabled
            ? "HttpService requests can't reach the internet from the simulator"
            : "Http requests are not enabled. Enable via game settings",
        );
      },
      PostAsync: (self) => {
        throw new LuaError(
          self.world.options.httpEnabled
            ? "HttpService requests can't reach the internet from the simulator"
            : "Http requests are not enabled. Enable via game settings",
        );
      },
      RequestAsync: (self) => {
        throw new LuaError(
          self.world.options.httpEnabled
            ? "HttpService requests can't reach the internet from the simulator"
            : "Http requests are not enabled. Enable via game settings",
        );
      },
    },
  });

  svc("CollectionService", {
    methods: {
      GetTagged: (self, a) => {
        const tag = arg(a, 0);
        return LuaTable.from(self.world.game.descendants().filter((d) => d.tags.has(tag)));
      },
      AddTag: (self, a) => {
        if (a[0] instanceof Instance) self.world.addTag(a[0], arg(a, 1));
        return [];
      },
      RemoveTag: (self, a) => {
        if (a[0] instanceof Instance) self.world.removeTag(a[0], arg(a, 1));
        return [];
      },
      HasTag: (_s, a) => (a[0] instanceof Instance ? a[0].tags.has(arg(a, 1)) : false),
      GetTags: (_s, a) => LuaTable.from(a[0] instanceof Instance ? [...a[0].tags] : []),
      GetInstanceAddedSignal: (self, a) => self.world.tagSignal(arg(a, 0)).added,
      GetInstanceRemovedSignal: (self, a) => self.world.tagSignal(arg(a, 0)).removed,
      GetAllTags: (self) =>
        LuaTable.from([...new Set(self.world.game.descendants().flatMap((d) => [...d.tags]))]),
    },
  });

  svc("Debris", {
    props: { MaxItems: { type: "int", def: () => 1000 } },
    methods: {
      AddItem: (_self, a, I) => {
        const item = a[0];
        if (!(item instanceof Instance)) throw new LuaError("Unable to cast value to Object");
        const life = toNumber(a[1]) ?? 10;
        I.schedule(life, () => item.destroy());
        return [];
      },
    },
  });

  svc("UserInputService", {
    props: {
      KeyboardEnabled: { type: "bool", def: () => true, readOnly: true },
      MouseEnabled: { type: "bool", def: () => true, readOnly: true },
      TouchEnabled: { type: "bool", def: () => false, readOnly: true },
      GamepadEnabled: { type: "bool", def: () => false, readOnly: true },
      MouseIconEnabled: { type: "bool", def: () => true },
      MouseBehavior: { type: "any", def: () => undefined },
      MouseDeltaSensitivity: { type: "number", def: () => 1 },
    },
    events: [
      "InputBegan",
      "InputEnded",
      "InputChanged",
      "JumpRequest",
      "TouchTap",
      "TouchStarted",
      "TouchEnded",
      "WindowFocused",
      "WindowFocusReleased",
    ],
    methods: {
      IsKeyDown: () => false,
      IsMouseButtonPressed: () => false,
      GetMouseLocation: () => new Vector2(960, 540),
      GetKeysPressed: () => new LuaTable(),
      GetMouseDelta: () => new Vector2(),
      GetFocusedTextBox: () => undefined,
    },
  });
  svc("ContextActionService", {
    events: ["LocalToolEquipped", "LocalToolUnequipped"],
    methods: {
      BindAction: (self, a, I) => {
        const name = arg(a, 0);
        const fn = a[1];
        if (!(fn instanceof LuaFunction)) throw new LuaError("Argument 2 missing or nil");
        const keys = a
          .slice(3)
          .filter((k): k is EnumItem => k instanceof EnumItem)
          .map((k) => k.name);
        self.world.bindAction(name, fn, keys, I.currentScript());
        return [];
      },
      BindActionAtPriority: (self, a, I) => {
        const fn = a[1];
        if (fn instanceof LuaFunction)
          self.world.bindAction(
            arg(a, 0),
            fn,
            a
              .slice(4)
              .filter((k): k is EnumItem => k instanceof EnumItem)
              .map((k) => k.name),
            I.currentScript(),
          );
        return [];
      },
      UnbindAction: (self, a) => {
        self.world.unbindAction(arg(a, 0));
        return [];
      },
      SetTitle: () => [],
      SetPosition: () => [],
      SetImage: () => [],
      GetButton: () => undefined,
    },
  });
  svc("MarketplaceService", {
    events: [
      "PromptGamePassPurchaseFinished",
      "PromptProductPurchaseFinished",
      "PromptPurchaseFinished",
    ],
    callbacks: ["ProcessReceipt"],
    methods: {
      PromptProductPurchase: (_s, a, I) => {
        I.print("info", `(simulated) product purchase prompt for id ${String(a[1])}`);
        return [];
      },
      PromptGamePassPurchase: (_s, a, I) => {
        I.print("info", `(simulated) game pass purchase prompt for id ${String(a[1])}`);
        return [];
      },
      PromptPurchase: () => [],
      UserOwnsGamePassAsync: function* (_s, _a, I) {
        yield* waitFor(I, 0.05);
        return [false];
      },
      PlayerOwnsAsset: () => false,
      GetProductInfo: (_s, a) =>
        LuaTable.fromRecord({ Name: "Product", PriceInRobux: 0, AssetId: a[0], Description: "" }),
    },
  });
  svc("BadgeService", {
    methods: {
      AwardBadge: (_s, a, I) => {
        I.print("info", `(simulated) badge ${String(a[1])} awarded`);
        return true;
      },
      UserHasBadgeAsync: () => false,
      GetBadgeInfoAsync: (_s, a) =>
        LuaTable.fromRecord({
          Name: "Badge",
          Description: "",
          IconImageId: 0,
          IsEnabled: true,
          Id: a[0],
        }),
    },
  });
  svc("TeleportService", {
    events: ["TeleportInitFailed", "LocalPlayerArrivedFromTeleport"],
    methods: {
      Teleport: (_s, _a, I) => {
        I.print(
          "warn",
          "Teleports don't work in the simulator (or in Studio playtests) — test them in a live game.",
        );
        return [];
      },
      TeleportAsync: (_s, _a, I) => {
        I.print(
          "warn",
          "Teleports don't work in the simulator (or in Studio playtests) — test them in a live game.",
        );
        return new Opaque("TeleportAsyncResult");
      },
      TeleportToPlaceInstance: (_s, _a, I) => {
        I.print(
          "warn",
          "Teleports don't work in the simulator (or in Studio playtests) — test them in a live game.",
        );
        return [];
      },
      ReserveServer: () => ["reserved-code", "private-server-id"],
      GetLocalPlayerTeleportData: () => undefined,
    },
  });
  svc("PathfindingService", {
    methods: {
      CreatePath: (self) => {
        const path = new Instance(self.world, "Path", "Path");
        path.state = { waypoints: [] };
        return path;
      },
    },
  });
  defineClass("Path", {
    methods: {
      ComputeAsync: function* (self, a, I) {
        const [from, to] = a;
        if (!(from instanceof Vector3) || !(to instanceof Vector3))
          throw new LuaError("Unable to cast value to Vector3");
        yield* waitFor(I, 0.05);
        const dist = to.sub(from).magnitude;
        const steps = Math.max(1, Math.ceil(dist / 4));
        const pts: unknown[] = [];
        for (let i = 0; i <= steps; i++)
          pts.push(
            new Opaque("PathWaypoint", {
              Position: from.lerp(to, i / steps),
              Action: enumItem("PathWaypointAction", "Walk"),
              Label: "",
            }),
          );
        self.state.waypoints = pts;
        self.props.set("Status", enumItem("PathStatus", "Success"));
        return [];
      },
      GetWaypoints: (self) => LuaTable.from((self.state.waypoints as unknown[]) ?? []),
      CheckOcclusionAsync: () => -1,
    },
  });
  svc("PhysicsService", {
    methods: {
      RegisterCollisionGroup: () => [],
      UnregisterCollisionGroup: () => [],
      CollisionGroupSetCollidable: () => [],
      CollisionGroupsAreCollidable: () => true,
      IsCollisionGroupRegistered: () => true,
      GetRegisteredCollisionGroups: () => new LuaTable(),
      SetPartCollisionGroup: (_s, a) => {
        if (a[0] instanceof Instance) a[0].setProp("CollisionGroup", String(a[1]));
        return [];
      },
    },
  });
  svc("TextService", {
    methods: {
      FilterStringAsync: (_s, a) => {
        const text = String(a[0] ?? "");
        const res = new Opaque("TextFilterResult", {});
        const getter = native("Get", () => [text]);
        res.fields = {
          GetNonChatStringForBroadcastAsync: getter,
          GetNonChatStringForUserAsync: getter,
          GetChatForUserAsync: getter,
        };
        return res;
      },
      GetTextSize: (_s, a) =>
        new Vector2(String(a[0] ?? "").length * (toNumber(a[1]) ?? 14) * 0.5, toNumber(a[1]) ?? 14),
    },
  });
  svc("GroupService", {
    methods: {
      GetGroupInfoAsync: (_s, a) =>
        LuaTable.fromRecord({ Id: a[0], Name: "Group", MemberCount: 1 }),
      GetGroupsAsync: () => new LuaTable(),
    },
  });
  svc("MessagingService", {
    methods: {
      PublishAsync: (self, a) => {
        const topic = arg(a, 0);
        const sig = self.signal(`topic:${topic}`);
        sig.fire([LuaTable.fromRecord({ Data: copyAcross(a[1]), Sent: self.world.interp.time })]);
        return [];
      },
      SubscribeAsync: (self, a, I) => {
        const topic = arg(a, 0);
        const fn = a[1];
        if (!(fn instanceof LuaFunction)) throw new LuaError("Argument 2 missing or nil");
        return (
          RBXSignal.connectFn.impl([self.signal(`topic:${topic}`), fn], I).next().value as unknown[]
        )[0];
      },
    },
  });
  svc("MemoryStoreService", {
    methods: {
      GetSortedMap: (self, a) => {
        const m = new Instance(self.world, "DataStore", arg(a, 0));
        m.state = { store: `memory:${arg(a, 0)}` };
        return m;
      },
    },
  });

  // Remotes & bindables
  defineClass("RemoteEvent", {
    methods: {
      FireServer: (self, a, I) => {
        requireSide(I, self.world, "client", "FireServer can only be called from the client");
        const player = I.currentScript()?.player as Instance | undefined;
        self.fire(
          "OnServerEvent",
          [player, ...a.map((x) => copyAcross(x))],
          (ctx) => !ctx || ctx.side === "server",
        );
        return [];
      },
      FireClient: (self, a, I) => {
        requireSide(I, self.world, "server", "FireClient can only be called from the server");
        const player = a[0];
        if (!(player instanceof Instance) || player.className !== "Player")
          throw new LuaError("FireClient: player argument must be a Player object");
        self.fire(
          "OnClientEvent",
          a.slice(1).map((x) => copyAcross(x)),
          (ctx) => ctx?.side === "client" && ctx.player === player,
        );
        return [];
      },
      FireAllClients: (self, a, I) => {
        requireSide(I, self.world, "server", "FireAllClients can only be called from the server");
        self.fire(
          "OnClientEvent",
          a.map((x) => copyAcross(x)),
          (ctx) => ctx?.side === "client",
        );
        return [];
      },
    },
  });
  defineClass("RemoteFunction", {
    methods: {
      InvokeServer: function* (self, a, I) {
        requireSide(I, self.world, "client", "InvokeServer can only be called from the client");
        const player = I.currentScript()?.player;
        let cb = self.callbacks.get("OnServerInvoke");
        while (!(cb instanceof LuaFunction)) {
          yield* waitFor(I, 0.1);
          cb = self.callbacks.get("OnServerInvoke");
        }
        const r = yield* I.call(cb, [player, ...a.map((x) => copyAcross(x))]);
        return r.map((x) => copyAcross(x));
      },
      InvokeClient: function* (self, a, I) {
        requireSide(I, self.world, "server", "InvokeClient can only be called from the server");
        const player = a[0];
        if (!(player instanceof Instance) || player.className !== "Player")
          throw new LuaError("InvokeClient: player argument must be a Player object");
        let cb = self.callbacks.get("OnClientInvoke");
        while (!(cb instanceof LuaFunction)) {
          yield* waitFor(I, 0.1);
          cb = self.callbacks.get("OnClientInvoke");
        }
        const r = yield* I.call(
          cb,
          a.slice(1).map((x) => copyAcross(x)),
        );
        return r.map((x) => copyAcross(x));
      },
    },
  });
  defineClass("BindableEvent", {
    methods: {
      Fire: (self, a) => {
        self.fire(
          "Event",
          a.map((x) => copyAcross(x)),
        );
        return [];
      },
    },
  });
  defineClass("BindableFunction", {
    methods: {
      Invoke: function* (self, a, I) {
        const cb = self.callbacks.get("OnInvoke");
        if (!(cb instanceof LuaFunction)) throw new LuaError("OnInvoke callback not set");
        return yield* I.call(
          cb,
          a.map((x) => copyAcross(x)),
        );
      },
    },
  });

  defineClass("Sound", {
    methods: {
      Play: (self) => {
        self.props.set("TimePosition", 0);
        if (self.props.get("Playing") === true) self.props.set("Playing", false);
        self.setProp("Playing", true);
        return [];
      },
      Stop: (self) => {
        self.setProp("Playing", false);
        self.props.set("TimePosition", 0);
        self.fire("Stopped", [self.props.get("SoundId")]);
        return [];
      },
      Pause: (self) => {
        self.setProp("Playing", false);
        self.fire("Paused", [self.props.get("SoundId")]);
        return [];
      },
      Resume: (self) => {
        self.setProp("Playing", true);
        self.fire("Resumed", [self.props.get("SoundId")]);
        return [];
      },
    },
  });

  void isInstanceOf;
}

export { Instance, CFrame, Vector3, Color3, UDim2, BrickColor };
