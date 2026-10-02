/**
 * Roblox Instance model for the simulator: properties with type checking,
 * children, events, attributes, tags, Destroy/Clone and the built-in
 * methods (FindFirstChild, WaitForChild, …). Error messages match Roblox.
 */
import { toNumber, type Interpreter } from "../interpreter";
import {
  formatNumber,
  LuaError,
  LuaFunction,
  LuaTable,
  nativeGen,
  robloxTypeOf,
  Userdata,
  type LuaGen,
} from "../values";
import {
  BrickColor,
  CFrame,
  Color3,
  coerceEnum,
  EnumItem,
  UDim,
  UDim2,
  Vector2,
  Vector3,
} from "./datatypes";
import { RBXSignal } from "./signal";
import type { World } from "./world";

export type PropType =
  | "string"
  | "number"
  | "int"
  | "bool"
  | "Vector3"
  | "Vector2"
  | "CFrame"
  | "Color3"
  | "BrickColor"
  | "UDim"
  | "UDim2"
  | "Content"
  | "Instance"
  | "any"
  | `enum:${string}`;

export interface PropDef {
  type: PropType;
  def: () => unknown;
  readOnly?: boolean;
}

export type MethodImpl = (self: Instance, args: unknown[], I: Interpreter) => unknown;

export interface ClassDef {
  parent?: string;
  props?: Record<string, PropDef>;
  events?: string[];
  methods?: Record<string, MethodImpl>;
  callbacks?: string[];
  creatable?: boolean;
  service?: boolean;
}

const CLASSES = new Map<string, ClassDef>();
const chainCache = new Map<string, string[]>();
const methodFnCache = new Map<string, LuaFunction>();

export function defineClass(name: string, def: ClassDef) {
  const existing = CLASSES.get(name);
  if (existing) {
    existing.props = { ...existing.props, ...def.props };
    existing.events = [...(existing.events ?? []), ...(def.events ?? [])];
    existing.methods = { ...existing.methods, ...def.methods };
    existing.callbacks = [...(existing.callbacks ?? []), ...(def.callbacks ?? [])];
    if (def.parent) existing.parent = def.parent;
    if (def.creatable !== undefined) existing.creatable = def.creatable;
    if (def.service !== undefined) existing.service = def.service;
  } else {
    CLASSES.set(name, { ...def });
  }
  chainCache.clear();
}

export function classExists(name: string) {
  return CLASSES.has(name);
}
export function classDef(name: string) {
  return CLASSES.get(name);
}
export function allClassNames() {
  return [...CLASSES.keys()];
}

export function classChain(name: string): string[] {
  const cached = chainCache.get(name);
  if (cached) return cached;
  const chain: string[] = [];
  let cur: string | undefined = name;
  while (cur) {
    chain.push(cur);
    cur = CLASSES.get(cur)?.parent;
  }
  if (!chain.includes("Instance")) chain.push("Instance");
  chainCache.set(name, chain);
  return chain;
}

function findProp(className: string, prop: string): PropDef | undefined {
  for (const c of classChain(className)) {
    const p = CLASSES.get(c)?.props?.[prop];
    if (p) return p;
  }
  return undefined;
}
function hasEvent(className: string, ev: string): boolean {
  return classChain(className).some((c) => CLASSES.get(c)?.events?.includes(ev));
}
function findMethod(className: string, m: string): { owner: string; impl: MethodImpl } | undefined {
  for (const c of classChain(className)) {
    const impl = CLASSES.get(c)?.methods?.[m];
    if (impl) return { owner: c, impl };
  }
  return undefined;
}
function isCallback(className: string, name: string): boolean {
  return classChain(className).some((c) => CLASSES.get(c)?.callbacks?.includes(name));
}

export function isInstanceOf(className: string, base: string) {
  return classChain(className).includes(base);
}

function isGenerator(v: unknown): v is LuaGen<unknown[]> {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Generator).next === "function" &&
    typeof (v as Generator)[Symbol.iterator] === "function"
  );
}

function methodFunction(owner: string, name: string, impl: MethodImpl): LuaFunction {
  const key = `${owner}.${name}`;
  let fn = methodFnCache.get(key);
  if (!fn) {
    fn = nativeGen(name, function* (args, I) {
      const self = args[0];
      if (!(self instanceof Instance) || !isInstanceOf(self.className, owner)) {
        throw new LuaError(`Expected ':' not '.' calling member function ${name}`);
      }
      const r = impl(self, args.slice(1), I as Interpreter);
      const v = isGenerator(r) ? yield* r : r;
      return Array.isArray(v) ? v : [v];
    });
    methodFnCache.set(key, fn);
  }
  return fn;
}

export function coerceProp(type: PropType, value: unknown, prop: string): unknown {
  const bad = (expected: string): never => {
    throw new LuaError(
      `Unable to assign property ${prop}. ${expected} expected, got ${robloxTypeOf(value)}`,
    );
  };
  switch (type) {
    case "any":
      return value;
    case "string":
      if (typeof value === "string") return value;
      if (typeof value === "number") return formatNumber(value);
      return bad("string");
    case "Content":
      if (typeof value === "string") return value;
      return bad("Content");
    case "number": {
      const n = toNumber(value);
      return n === undefined ? bad("number") : n;
    }
    case "int": {
      const n = toNumber(value);
      return n === undefined ? bad("int") : Math.trunc(n);
    }
    case "bool":
      return typeof value === "boolean" ? value : bad("bool");
    case "Vector3":
      return value instanceof Vector3 ? value : bad("Vector3");
    case "Vector2":
      return value instanceof Vector2 ? value : bad("Vector2");
    case "CFrame":
      return value instanceof CFrame ? value : bad("CFrame");
    case "Color3":
      return value instanceof Color3 ? value : bad("Color3");
    case "BrickColor":
      return value instanceof BrickColor ? value : bad("BrickColor");
    case "UDim":
      return value instanceof UDim ? value : bad("UDim");
    case "UDim2":
      return value instanceof UDim2 ? value : bad("UDim2");
    case "Instance":
      if (value === undefined || value instanceof Instance) return value;
      return bad("Instance");
    default:
      return coerceEnum(type.slice(5), value, prop);
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Userdata && b instanceof Userdata) return a.luaEq(b);
  return false;
}

export class Instance extends Userdata {
  readonly luaType = "Instance";
  name: string;
  parent?: Instance;
  children: Instance[] = [];
  props = new Map<string, unknown>();
  attributes = new Map<string, unknown>();
  tags = new Set<string>();
  destroyed = false;
  parentLocked = false;
  callbacks = new Map<string, unknown>();
  /** Script source (Script / LocalScript / ModuleScript). */
  source?: string;
  /** Free-form engine state for services/special classes. */
  state: Record<string, unknown> = {};
  private signals = new Map<string, RBXSignal>();
  private propSignals = new Map<string, RBXSignal>();
  private attrSignals = new Map<string, RBXSignal>();

  constructor(
    public world: World,
    public className: string,
    name?: string,
  ) {
    super();
    this.name = name ?? className;
    for (const c of [...classChain(className)].reverse()) {
      const props = CLASSES.get(c)?.props;
      if (!props) continue;
      for (const [k, def] of Object.entries(props)) this.props.set(k, def.def());
    }
  }

  // -------------------------------------------------------------- tree
  getFullName(): string {
    const parts: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let cur: Instance | undefined = this;
    while (cur && cur.className !== "DataModel") {
      parts.unshift(cur.name);
      cur = cur.parent;
    }
    return parts.join(".");
  }

  isA(className: string) {
    return isInstanceOf(this.className, className);
  }

  isDescendantOf(other: Instance): boolean {
    let cur = this.parent;
    while (cur) {
      if (cur === other) return true;
      cur = cur.parent;
    }
    return false;
  }

  descendants(): Instance[] {
    const out: Instance[] = [];
    const walk = (i: Instance) => {
      for (const c of i.children) {
        out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }

  findFirstChild(name: string, recursive = false): Instance | undefined {
    const direct = this.children.find((c) => c.name === name);
    if (direct || !recursive) return direct;
    for (const c of this.children) {
      const found = c.findFirstChild(name, true);
      if (found) return found;
    }
    return undefined;
  }

  signal(name: string): RBXSignal {
    let s = this.signals.get(name);
    if (!s) {
      s = new RBXSignal(name, () => this.world.interp, this.world.signalGuard(this, name));
      this.signals.set(name, s);
    }
    return s;
  }

  /** Fire an event if anyone listens (cheap no-op otherwise). */
  fire(name: string, args: unknown[] = [], filter?: Parameters<RBXSignal["fire"]>[1]) {
    const s = this.signals.get(name);
    if (s) s.fire(args, filter);
  }

  propertySignal(prop: string): RBXSignal {
    let s = this.propSignals.get(prop);
    if (!s) {
      s = new RBXSignal(`${prop}Changed`, () => this.world.interp);
      this.propSignals.set(prop, s);
    }
    return s;
  }

  attributeSignal(attr: string): RBXSignal {
    let s = this.attrSignals.get(attr);
    if (!s) {
      s = new RBXSignal(`${attr}AttributeChanged`, () => this.world.interp);
      this.attrSignals.set(attr, s);
    }
    return s;
  }

  setParent(newParent: Instance | undefined, force = false) {
    if (newParent === this.parent) return;
    if (!force) {
      if (this.parentLocked) {
        throw new LuaError(
          `The Parent property of ${this.name} is locked, current parent: ${this.parent ? this.parent.name : "NULL"}, new parent ${newParent ? newParent.name : "NULL"}`,
        );
      }
      if (newParent && (newParent === this || newParent.isDescendantOf(this))) {
        throw new LuaError(
          `Attempt to set parent of ${this.getFullName()} to ${newParent.getFullName()} would result in circular reference`,
        );
      }
      if (CLASSES.get(this.className)?.service) {
        throw new LuaError(
          `The Parent property of ${this.name} is locked, current parent: ${this.parent?.name ?? "NULL"}, new parent ${newParent?.name ?? "NULL"}`,
        );
      }
    }
    const old = this.parent;
    if (old) {
      old.children = old.children.filter((c) => c !== this);
      old.fire("ChildRemoved", [this]);
      let a: Instance | undefined = old;
      while (a) {
        a.fire("DescendantRemoving", [this]);
        a = a.parent;
      }
    }
    this.parent = newParent;
    if (newParent) {
      newParent.children.push(this);
      newParent.fire("ChildAdded", [this]);
      let a: Instance | undefined = newParent;
      while (a) {
        a.fire("DescendantAdded", [this]);
        a = a.parent;
      }
    }
    this.fire("AncestryChanged", [this, newParent]);
    this.fireChanged("Parent");
    this.world.onParentChanged(this, old);
  }

  destroy() {
    if (this.destroyed) return;
    this.fire("Destroying");
    this.destroyed = true;
    for (const c of [...this.children]) c.destroy();
    if (this.parent) this.setParent(undefined, true);
    this.parentLocked = true;
    this.world.onDestroyed(this);
    for (const s of this.signals.values()) s.disconnectAll();
    for (const s of this.propSignals.values()) s.disconnectAll();
  }

  clone(map = new Map<Instance, Instance>()): Instance {
    const c = new Instance(this.world, this.className, this.name);
    map.set(this, c);
    for (const [k, v] of this.props) c.props.set(k, v);
    for (const [k, v] of this.attributes) c.attributes.set(k, v);
    for (const t of this.tags) c.tags.add(t);
    c.source = this.source;
    c.state = { ...this.state, started: false };
    for (const child of this.children) {
      if (child.props.get("Archivable") === false) continue;
      const cc = child.clone(map);
      cc.parent = c;
      c.children.push(cc);
    }
    // remap references inside the cloned subtree (PrimaryPart, ObjectValue.Value…)
    for (const [k, v] of c.props)
      if (v instanceof Instance && map.has(v)) c.props.set(k, map.get(v));
    return c;
  }

  // -------------------------------------------------------------- properties
  getProp(name: string): unknown {
    return this.props.get(name);
  }

  /** Engine-side property write (no read-only check), fires change events. */
  setProp(name: string, value: unknown) {
    const old = this.props.get(name);
    if (sameValue(old, value)) return;
    this.props.set(name, value);
    this.world.onPropertyChanged(this, name, old, value);
    this.fireChanged(name);
  }

  fireChanged(name: string) {
    if (this.isA("ValueBase")) {
      if (name === "Value") this.fire("Changed", [this.props.get("Value")]);
    } else {
      this.fire("Changed", [name]);
    }
    this.propSignals.get(name)?.fire([]);
  }

  setAttribute(name: string, value: unknown) {
    const ok =
      value === undefined ||
      ["boolean", "number", "string"].includes(typeof value) ||
      value instanceof Vector3 ||
      value instanceof Vector2 ||
      value instanceof Color3 ||
      value instanceof BrickColor ||
      value instanceof UDim ||
      value instanceof UDim2 ||
      value instanceof CFrame ||
      value instanceof EnumItem;
    if (!ok) throw new LuaError(`${robloxTypeOf(value)} is not a supported attribute type`);
    if (sameValue(this.attributes.get(name), value)) return;
    if (value === undefined) this.attributes.delete(name);
    else this.attributes.set(name, value);
    this.fire("AttributeChanged", [name]);
    this.attrSignals.get(name)?.fire([]);
  }

  private notMember(key: unknown): LuaError {
    return new LuaError(
      `${String(key)} is not a valid member of ${this.className} "${this.getFullName() || this.name}"`,
    );
  }

  // -------------------------------------------------------------- Lua access
  luaIndex(key: unknown, I: Interpreter): unknown {
    if (typeof key !== "string")
      throw this.notMember(typeof key === "number" ? formatNumber(key) : key);
    if (key === "Name") return this.name;
    if (key === "ClassName") return this.className;
    if (key === "Parent") return this.parent;
    const special = this.world.specialGet(this, key, I);
    if (special.handled) return special.value;
    if (this.props.has(key)) return this.props.get(key);
    if (isCallback(this.className, key)) {
      throw new LuaError(
        `${key} is a callback member of ${this.className}; you can only set the callback value, get is not available`,
      );
    }
    const m = findMethod(this.className, key);
    if (m) return methodFunction(m.owner, key, m.impl);
    if (hasEvent(this.className, key)) return this.signal(key);
    const child = this.children.find((c) => c.name === key);
    if (child) return child;
    throw this.notMember(key);
  }

  luaNewIndex(key: unknown, value: unknown): void {
    if (typeof key !== "string") throw this.notMember(key);
    if (key === "Name") {
      const v = coerceProp("string", value, "Name") as string;
      if (v !== this.name) {
        this.name = v;
        this.fireChanged("Name");
      }
      return;
    }
    if (key === "Parent") {
      if (value !== undefined && !(value instanceof Instance)) {
        throw new LuaError(
          `Unable to assign property Parent. Instance expected, got ${robloxTypeOf(value)}`,
        );
      }
      this.setParent(value as Instance | undefined);
      return;
    }
    if (isCallback(this.className, key)) {
      if (value !== undefined && !(value instanceof LuaFunction)) {
        throw new LuaError(
          `Unable to assign property ${key}. function expected, got ${robloxTypeOf(value)}`,
        );
      }
      this.callbacks.set(key, value);
      this.world.onCallbackSet(this, key);
      return;
    }
    const def = findProp(this.className, key);
    if (def) {
      if (def.readOnly)
        throw new LuaError(`Unable to assign property ${key}. Property is read only`);
      this.setProp(key, coerceProp(def.type, value, key));
      return;
    }
    if (hasEvent(this.className, key) || findMethod(this.className, key))
      throw new LuaError(`${key} cannot be assigned to`);
    throw this.notMember(key);
  }

  luaToString() {
    return this.name;
  }
}

// ------------------------------------------------------------------ base Instance class
function* waitForChild(self: Instance, args: unknown[], I: Interpreter): LuaGen<unknown[]> {
  const name = args[0];
  if (typeof name !== "string") throw new LuaError("Argument 1 missing or nil");
  const timeout = args[1] === undefined ? undefined : toNumber(args[1]);
  const start = I.now();
  let warned = false;
  while (true) {
    const found = self.world.hiddenFromClient(self, I) ? undefined : self.findFirstChild(name);
    if (found) return [found];
    const elapsed = I.now() - start;
    if (timeout !== undefined && elapsed >= timeout) return [undefined];
    if (!warned && timeout === undefined && elapsed >= 5) {
      warned = true;
      I.print("warn", `Infinite yield possible on '${self.getFullName()}:WaitForChild("${name}")'`);
    }
    yield { t: "wait", d: 0.1 };
  }
}

function argString(args: unknown[], i: number): string {
  const v = args[i];
  if (typeof v === "string") return v;
  if (typeof v === "number") return formatNumber(v);
  throw new LuaError(`Argument ${i + 1} missing or nil`);
}

defineClass("Instance", {
  props: { Archivable: { type: "bool", def: () => true } },
  events: [
    "Changed",
    "ChildAdded",
    "ChildRemoved",
    "DescendantAdded",
    "DescendantRemoving",
    "AncestryChanged",
    "Destroying",
    "AttributeChanged",
  ],
  methods: {
    FindFirstChild: (self, a, I) =>
      self.world.hiddenFromClient(self, I)
        ? undefined
        : self.findFirstChild(argString(a, 0), a[1] === true),
    FindFirstChildOfClass: (self, a) => {
      const cls = argString(a, 0);
      return self.children.find((c) => c.className === cls);
    },
    FindFirstChildWhichIsA: (self, a) => {
      const cls = argString(a, 0);
      const list = a[1] === true ? self.descendants() : self.children;
      return list.find((c) => c.isA(cls));
    },
    FindFirstAncestor: (self, a) => {
      const name = argString(a, 0);
      let cur = self.parent;
      while (cur && cur.name !== name) cur = cur.parent;
      return cur;
    },
    FindFirstAncestorOfClass: (self, a) => {
      const cls = argString(a, 0);
      let cur = self.parent;
      while (cur && cur.className !== cls) cur = cur.parent;
      return cur;
    },
    FindFirstAncestorWhichIsA: (self, a) => {
      const cls = argString(a, 0);
      let cur = self.parent;
      while (cur && !cur.isA(cls)) cur = cur.parent;
      return cur;
    },
    FindFirstDescendant: (self, a) => {
      const name = argString(a, 0);
      return self.descendants().find((d) => d.name === name);
    },
    WaitForChild: (self, a, I) => waitForChild(self, a, I),
    GetChildren: (self, _a, I) =>
      LuaTable.from(self.world.hiddenFromClient(self, I) ? [] : [...self.children]),
    GetDescendants: (self, _a, I) =>
      LuaTable.from(self.world.hiddenFromClient(self, I) ? [] : self.descendants()),
    ClearAllChildren: (self) => {
      for (const c of [...self.children]) c.destroy();
      return [];
    },
    Destroy: (self) => {
      self.destroy();
      return [];
    },
    Remove: (self) => {
      self.setParent(undefined);
      return [];
    },
    Clone: (self) => (self.props.get("Archivable") === false ? undefined : self.clone()),
    IsA: (self, a) => self.isA(argString(a, 0)),
    IsDescendantOf: (self, a) => (a[0] instanceof Instance ? self.isDescendantOf(a[0]) : false),
    IsAncestorOf: (self, a) => (a[0] instanceof Instance ? a[0].isDescendantOf(self) : false),
    GetFullName: (self) => self.getFullName(),
    GetAttribute: (self, a) => self.attributes.get(argString(a, 0)),
    SetAttribute: (self, a) => {
      self.setAttribute(argString(a, 0), a[1]);
      return [];
    },
    GetAttributes: (self) => LuaTable.fromRecord(Object.fromEntries(self.attributes)),
    GetAttributeChangedSignal: (self, a) => self.attributeSignal(argString(a, 0)),
    GetPropertyChangedSignal: (self, a) => {
      const prop = argString(a, 0);
      if (!["Name", "Parent"].includes(prop) && !findProp(self.className, prop))
        throw new LuaError(`${prop} is not a valid property name.`);
      return self.propertySignal(prop);
    },
    AddTag: (self, a) => {
      self.world.addTag(self, argString(a, 0));
      return [];
    },
    RemoveTag: (self, a) => {
      self.world.removeTag(self, argString(a, 0));
      return [];
    },
    HasTag: (self, a) => self.tags.has(argString(a, 0)),
    GetTags: (self) => LuaTable.from([...self.tags]),
    GetDebugId: (self) => self.name,
    IsPropertyModified: () => false,
  },
});
