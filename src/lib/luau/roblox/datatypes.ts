/**
 * Roblox datatypes (Vector3, CFrame, Color3, UDim2, BrickColor, Enum…) as
 * Lua userdata. Field names, constructors and error messages mirror Roblox.
 */
import { toNumber } from "../interpreter";
import {
  formatNumber,
  LuaError,
  LuaTable,
  native,
  robloxTypeOf,
  Userdata,
  type InterpreterLike,
  type LuaFunction,
} from "../values";

const fmt = (n: number) => formatNumber(Math.abs(n) < 1e-10 ? 0 : Number(n.toFixed(6)));

function num(args: unknown[], i: number, fname: string, def = 0): number {
  const v = args[i];
  if (v === undefined) return def;
  const n = toNumber(v);
  if (n === undefined)
    throw new LuaError(
      `invalid argument #${i + 1} to '${fname}' (number expected, got ${robloxTypeOf(v)})`,
    );
  return n;
}

function methodCache(
  owner: string,
  defs: Record<string, (self: never, args: unknown[], I: InterpreterLike) => unknown[] | unknown>,
) {
  const cache = new Map<string, LuaFunction>();
  for (const [name, impl] of Object.entries(defs)) {
    cache.set(
      name,
      native(name, (args, I) => {
        const self = args[0];
        if (!(self instanceof Userdata) || self.luaType !== owner)
          throw new LuaError(`Expected ':' not '.' calling member function ${name}`);
        return (impl as (s: unknown, a: unknown[], I: InterpreterLike) => unknown)(
          self,
          args.slice(1),
          I,
        ) as unknown[];
      }),
    );
  }
  return cache;
}

function notMember(key: unknown, type: string): LuaError {
  return new LuaError(`${String(key)} is not a valid member of ${type}`);
}

// ------------------------------------------------------------------ Vector3
export class Vector3 extends Userdata {
  readonly luaType = "Vector3";
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {
    super();
  }
  get magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  unit(): Vector3 {
    const m = this.magnitude;
    return m === 0 ? new Vector3(NaN, NaN, NaN) : new Vector3(this.x / m, this.y / m, this.z / m);
  }
  add(o: Vector3) {
    return new Vector3(this.x + o.x, this.y + o.y, this.z + o.z);
  }
  sub(o: Vector3) {
    return new Vector3(this.x - o.x, this.y - o.y, this.z - o.z);
  }
  scale(k: number) {
    return new Vector3(this.x * k, this.y * k, this.z * k);
  }
  dot(o: Vector3) {
    return this.x * o.x + this.y * o.y + this.z * o.z;
  }
  cross(o: Vector3) {
    return new Vector3(
      this.y * o.z - this.z * o.y,
      this.z * o.x - this.x * o.z,
      this.x * o.y - this.y * o.x,
    );
  }
  lerp(o: Vector3, t: number) {
    return new Vector3(
      this.x + (o.x - this.x) * t,
      this.y + (o.y - this.y) * t,
      this.z + (o.z - this.z) * t,
    );
  }
  static methods = methodCache("Vector3", {
    Dot: (s: Vector3, a: unknown[]) => s.dot(asVector3(a[0], 1, "Dot")),
    Cross: (s: Vector3, a: unknown[]) => s.cross(asVector3(a[0], 1, "Cross")),
    Lerp: (s: Vector3, a: unknown[]) => s.lerp(asVector3(a[0], 1, "Lerp"), num(a, 1, "Lerp")),
    Abs: (s: Vector3) => new Vector3(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z)),
    Floor: (s: Vector3) => new Vector3(Math.floor(s.x), Math.floor(s.y), Math.floor(s.z)),
    Ceil: (s: Vector3) => new Vector3(Math.ceil(s.x), Math.ceil(s.y), Math.ceil(s.z)),
    Max: (s: Vector3, a: unknown[]) => {
      const o = asVector3(a[0], 1, "Max");
      return new Vector3(Math.max(s.x, o.x), Math.max(s.y, o.y), Math.max(s.z, o.z));
    },
    Min: (s: Vector3, a: unknown[]) => {
      const o = asVector3(a[0], 1, "Min");
      return new Vector3(Math.min(s.x, o.x), Math.min(s.y, o.y), Math.min(s.z, o.z));
    },
    FuzzyEq: (s: Vector3, a: unknown[]) =>
      s.sub(asVector3(a[0], 1, "FuzzyEq")).magnitude <= num(a, 1, "FuzzyEq", 1e-5),
    Angle: (s: Vector3, a: unknown[]) => {
      const o = asVector3(a[0], 1, "Angle");
      return Math.acos(Math.max(-1, Math.min(1, s.dot(o) / (s.magnitude * o.magnitude || 1))));
    },
  });
  luaIndex(key: unknown): unknown {
    switch (key) {
      case "X":
      case "x":
        return this.x;
      case "Y":
      case "y":
        return this.y;
      case "Z":
      case "z":
        return this.z;
      case "Magnitude":
      case "magnitude":
        return this.magnitude;
      case "Unit":
      case "unit":
        return this.unit();
    }
    const m = Vector3.methods.get(String(key));
    if (m) return m;
    throw notMember(key, "Vector3");
  }
  luaNewIndex(key: unknown): void {
    throw new LuaError(`${String(key)} cannot be assigned to`);
  }
  luaToString() {
    return `${fmt(this.x)}, ${fmt(this.y)}, ${fmt(this.z)}`;
  }
  luaEq(o: unknown) {
    return o instanceof Vector3 && o.x === this.x && o.y === this.y && o.z === this.z;
  }
  luaArith(op: string, other: unknown, left: boolean): unknown {
    if (op === "unm") return new Vector3(-this.x, -this.y, -this.z);
    if (other instanceof Vector3) {
      const [a, b] = left ? [this, other] : [other, this];
      if (op === "+") return a.add(b);
      if (op === "-") return a.sub(b);
      if (op === "*") return new Vector3(a.x * b.x, a.y * b.y, a.z * b.z);
      if (op === "/") return new Vector3(a.x / b.x, a.y / b.y, a.z / b.z);
      if (op === "//")
        return new Vector3(Math.floor(a.x / b.x), Math.floor(a.y / b.y), Math.floor(a.z / b.z));
      return undefined;
    }
    if (typeof other === "number") {
      if (op === "*") return this.scale(other);
      if (op === "/" && left) return this.scale(1 / other);
      if (op === "/" && !left) return new Vector3(other / this.x, other / this.y, other / this.z);
      if (op === "//" && left)
        return new Vector3(
          Math.floor(this.x / other),
          Math.floor(this.y / other),
          Math.floor(this.z / other),
        );
    }
    return undefined;
  }
}

export function asVector3(v: unknown, argN: number, fname: string): Vector3 {
  if (v instanceof Vector3) return v;
  throw new LuaError(
    `invalid argument #${argN} to '${fname}' (Vector3 expected, got ${robloxTypeOf(v)})`,
  );
}

// ------------------------------------------------------------------ Vector2
export class Vector2 extends Userdata {
  readonly luaType = "Vector2";
  constructor(
    public x = 0,
    public y = 0,
  ) {
    super();
  }
  get magnitude() {
    return Math.hypot(this.x, this.y);
  }
  static methods = methodCache("Vector2", {
    Dot: (s: Vector2, a: unknown[]) => {
      const o = a[0] as Vector2;
      return s.x * o.x + s.y * o.y;
    },
    Lerp: (s: Vector2, a: unknown[]) => {
      const o = a[0] as Vector2;
      const t = num(a, 1, "Lerp");
      return new Vector2(s.x + (o.x - s.x) * t, s.y + (o.y - s.y) * t);
    },
  });
  luaIndex(key: unknown): unknown {
    if (key === "X" || key === "x") return this.x;
    if (key === "Y" || key === "y") return this.y;
    if (key === "Magnitude") return this.magnitude;
    if (key === "Unit")
      return this.magnitude === 0
        ? new Vector2(NaN, NaN)
        : new Vector2(this.x / this.magnitude, this.y / this.magnitude);
    const m = Vector2.methods.get(String(key));
    if (m) return m;
    throw notMember(key, "Vector2");
  }
  luaToString() {
    return `${fmt(this.x)}, ${fmt(this.y)}`;
  }
  luaEq(o: unknown) {
    return o instanceof Vector2 && o.x === this.x && o.y === this.y;
  }
  luaArith(op: string, other: unknown, left: boolean): unknown {
    if (op === "unm") return new Vector2(-this.x, -this.y);
    if (other instanceof Vector2) {
      const [a, b] = left ? [this, other] : [other, this];
      if (op === "+") return new Vector2(a.x + b.x, a.y + b.y);
      if (op === "-") return new Vector2(a.x - b.x, a.y - b.y);
      if (op === "*") return new Vector2(a.x * b.x, a.y * b.y);
      if (op === "/") return new Vector2(a.x / b.x, a.y / b.y);
    }
    if (typeof other === "number") {
      if (op === "*") return new Vector2(this.x * other, this.y * other);
      if (op === "/" && left) return new Vector2(this.x / other, this.y / other);
    }
    return undefined;
  }
}

// ------------------------------------------------------------------ CFrame
type M3 = [number, number, number, number, number, number, number, number, number];
const IDENTITY: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function mul3(a: M3, b: M3): M3 {
  const r: number[] = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]);
  return r as M3;
}
function transpose(a: M3): M3 {
  return [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
}
function rotX(t: number): M3 {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}
function rotY(t: number): M3 {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}
function rotZ(t: number): M3 {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

export class CFrame extends Userdata {
  readonly luaType = "CFrame";
  constructor(
    public p: Vector3 = new Vector3(),
    public r: M3 = [...IDENTITY] as M3,
  ) {
    super();
  }
  static angles(rx: number, ry: number, rz: number) {
    return new CFrame(new Vector3(), mul3(mul3(rotX(rx), rotY(ry)), rotZ(rz)));
  }
  static orientation(rx: number, ry: number, rz: number) {
    return new CFrame(new Vector3(), mul3(mul3(rotY(ry), rotX(rx)), rotZ(rz)));
  }
  static lookAt(at: Vector3, target: Vector3, up = new Vector3(0, 1, 0)): CFrame {
    const look = target.sub(at).unit();
    if (Number.isNaN(look.x)) return new CFrame(at);
    let right = look.cross(up).unit();
    if (Number.isNaN(right.x)) right = new Vector3(1, 0, 0);
    const newUp = right.cross(look);
    return new CFrame(at, [
      right.x,
      newUp.x,
      -look.x,
      right.y,
      newUp.y,
      -look.y,
      right.z,
      newUp.z,
      -look.z,
    ]);
  }
  mulVec(v: Vector3): Vector3 {
    const r = this.r;
    return new Vector3(
      r[0] * v.x + r[1] * v.y + r[2] * v.z,
      r[3] * v.x + r[4] * v.y + r[5] * v.z,
      r[6] * v.x + r[7] * v.y + r[8] * v.z,
    );
  }
  mul(o: CFrame): CFrame {
    return new CFrame(this.p.add(this.mulVec(o.p)), mul3(this.r, o.r));
  }
  inverse(): CFrame {
    const rt = transpose(this.r);
    const inv = new CFrame(new Vector3(), rt);
    return new CFrame(inv.mulVec(this.p).scale(-1), rt);
  }
  toOrientation(): [number, number, number] {
    // inverse of Ry * Rx * Rz
    const r = this.r;
    const rx = Math.asin(Math.max(-1, Math.min(1, -r[5])));
    const ry = Math.atan2(r[2], r[8]);
    const rz = Math.atan2(r[3], r[4]);
    return [rx, ry, rz];
  }
  toEulerXYZ(): [number, number, number] {
    const r = this.r;
    const ry = Math.asin(Math.max(-1, Math.min(1, r[2])));
    const rx = Math.atan2(-r[5], r[8]);
    const rz = Math.atan2(-r[1], r[0]);
    return [rx, ry, rz];
  }
  static methods = methodCache("CFrame", {
    Inverse: (s: CFrame) => s.inverse(),
    Lerp: (s: CFrame, a: unknown[]) => {
      const o = a[0] as CFrame;
      const t = num(a, 1, "Lerp");
      const r = s.r.map((v, i) => v + (o.r[i] - v) * t) as M3;
      return new CFrame(s.p.lerp(o.p, t), t >= 1 ? o.r : t <= 0 ? s.r : r);
    },
    ToWorldSpace: (s: CFrame, a: unknown[]) => s.mul(a[0] as CFrame),
    ToObjectSpace: (s: CFrame, a: unknown[]) => s.inverse().mul(a[0] as CFrame),
    PointToWorldSpace: (s: CFrame, a: unknown[]) =>
      s.p.add(s.mulVec(asVector3(a[0], 1, "PointToWorldSpace"))),
    PointToObjectSpace: (s: CFrame, a: unknown[]) =>
      s.inverse().p.add(s.inverse().mulVec(asVector3(a[0], 1, "PointToObjectSpace"))),
    VectorToWorldSpace: (s: CFrame, a: unknown[]) =>
      s.mulVec(asVector3(a[0], 1, "VectorToWorldSpace")),
    VectorToObjectSpace: (s: CFrame, a: unknown[]) =>
      s.inverse().mulVec(asVector3(a[0], 1, "VectorToObjectSpace")),
    ToEulerAnglesXYZ: (s: CFrame) => s.toEulerXYZ(),
    ToOrientation: (s: CFrame) => s.toOrientation(),
    ToEulerAnglesYXZ: (s: CFrame) => s.toOrientation(),
    GetComponents: (s: CFrame) => [s.p.x, s.p.y, s.p.z, ...s.r],
    components: (s: CFrame) => [s.p.x, s.p.y, s.p.z, ...s.r],
  });
  luaIndex(key: unknown): unknown {
    const r = this.r;
    switch (key) {
      case "Position":
      case "p":
        return this.p;
      case "X":
      case "x":
        return this.p.x;
      case "Y":
      case "y":
        return this.p.y;
      case "Z":
      case "z":
        return this.p.z;
      case "LookVector":
      case "lookVector":
        return new Vector3(-r[2], -r[5], -r[8]);
      case "RightVector":
      case "XVector":
        return new Vector3(r[0], r[3], r[6]);
      case "UpVector":
      case "YVector":
        return new Vector3(r[1], r[4], r[7]);
      case "ZVector":
        return new Vector3(r[2], r[5], r[8]);
      case "Rotation":
        return new CFrame(new Vector3(), r);
    }
    const m = CFrame.methods.get(String(key));
    if (m) return m;
    throw notMember(key, "CFrame");
  }
  luaNewIndex(key: unknown): void {
    throw new LuaError(`${String(key)} cannot be assigned to`);
  }
  luaToString() {
    return [this.p.x, this.p.y, this.p.z, ...this.r].map(fmt).join(", ");
  }
  luaEq(o: unknown) {
    return o instanceof CFrame && this.p.luaEq(o.p) && this.r.every((v, i) => v === o.r[i]);
  }
  luaArith(op: string, other: unknown, left: boolean): unknown {
    if (!left) return undefined;
    if (op === "*" && other instanceof CFrame) return this.mul(other);
    if (op === "*" && other instanceof Vector3) return this.p.add(this.mulVec(other));
    if (op === "+" && other instanceof Vector3) return new CFrame(this.p.add(other), this.r);
    if (op === "-" && other instanceof Vector3) return new CFrame(this.p.sub(other), this.r);
    return undefined;
  }
}

// ------------------------------------------------------------------ Color3
export class Color3 extends Userdata {
  readonly luaType = "Color3";
  constructor(
    public r = 0,
    public g = 0,
    public b = 0,
  ) {
    super();
  }
  static methods = methodCache("Color3", {
    Lerp: (s: Color3, a: unknown[]) => {
      const o = a[0] as Color3;
      const t = num(a, 1, "Lerp");
      return new Color3(s.r + (o.r - s.r) * t, s.g + (o.g - s.g) * t, s.b + (o.b - s.b) * t);
    },
    ToHex: (s: Color3) =>
      [s.r, s.g, s.b]
        .map((c) =>
          Math.round(c * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join(""),
    ToHSV: (s: Color3) => {
      const max = Math.max(s.r, s.g, s.b);
      const min = Math.min(s.r, s.g, s.b);
      const d = max - min;
      let h = 0;
      if (d) {
        if (max === s.r) h = ((s.g - s.b) / d) % 6;
        else if (max === s.g) h = (s.b - s.r) / d + 2;
        else h = (s.r - s.g) / d + 4;
        h /= 6;
        if (h < 0) h += 1;
      }
      return [h, max === 0 ? 0 : d / max, max];
    },
  });
  luaIndex(key: unknown): unknown {
    if (key === "R" || key === "r") return this.r;
    if (key === "G" || key === "g") return this.g;
    if (key === "B" || key === "b") return this.b;
    const m = Color3.methods.get(String(key));
    if (m) return m;
    throw notMember(key, "Color3");
  }
  luaToString() {
    return `${fmt(this.r)}, ${fmt(this.g)}, ${fmt(this.b)}`;
  }
  luaEq(o: unknown) {
    return (
      o instanceof Color3 &&
      Math.abs(o.r - this.r) < 1e-6 &&
      Math.abs(o.g - this.g) < 1e-6 &&
      Math.abs(o.b - this.b) < 1e-6
    );
  }
  static fromRGB(r: number, g: number, b: number) {
    return new Color3(r / 255, g / 255, b / 255);
  }
  static fromHSV(h: number, s: number, v: number) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const table = [
      [v, t, p],
      [q, v, p],
      [p, v, t],
      [p, q, v],
      [t, p, v],
      [v, p, q],
    ][((i % 6) + 6) % 6];
    return new Color3(table[0], table[1], table[2]);
  }
}

// ------------------------------------------------------------------ BrickColor
const BRICK_COLORS: Record<string, [number, number, number, number]> = {
  White: [1, 242, 243, 243],
  Grey: [2, 161, 165, 162],
  "Light yellow": [3, 249, 233, 153],
  "Bright red": [21, 196, 40, 28],
  "Bright blue": [23, 13, 105, 172],
  "Bright yellow": [24, 245, 205, 48],
  Black: [26, 27, 42, 53],
  "Dark green": [28, 40, 127, 71],
  "Bright green": [37, 75, 151, 75],
  "Bright orange": [106, 218, 133, 65],
  "Bright violet": [104, 107, 50, 124],
  "Medium stone grey": [194, 163, 162, 165],
  "Dark stone grey": [199, 99, 95, 98],
  "Really red": [1004, 255, 0, 0],
  "Really blue": [1010, 0, 0, 255],
  "Really black": [1003, 17, 17, 17],
  "Institutional white": [1001, 248, 248, 248],
  "Lime green": [1020, 0, 255, 0],
  "New Yeller": [1009, 255, 255, 0],
  "Hot pink": [1032, 255, 0, 191],
  Gold: [1014, 255, 176, 0],
  "Deep orange": [1017, 255, 175, 0],
  Toothpaste: [1019, 0, 255, 255],
  "Pastel blue": [1024, 175, 221, 255],
  "Bright bluish green": [107, 0, 143, 156],
  "Reddish brown": [192, 105, 64, 40],
  "Sand red": [153, 149, 121, 119],
  Cyan: [1013, 4, 175, 236],
};

export class BrickColor extends Userdata {
  readonly luaType = "BrickColor";
  constructor(
    public name: string,
    public number: number,
    public color: Color3,
  ) {
    super();
  }
  static byName(name: string): BrickColor {
    const entry = BRICK_COLORS[name] ?? BRICK_COLORS["Medium stone grey"];
    const realName = BRICK_COLORS[name] ? name : "Medium stone grey";
    return new BrickColor(realName, entry[0], Color3.fromRGB(entry[1], entry[2], entry[3]));
  }
  static byNumber(n: number): BrickColor {
    const found = Object.entries(BRICK_COLORS).find(([, v]) => v[0] === n);
    return BrickColor.byName(found?.[0] ?? "Medium stone grey");
  }
  static fromColor(c: Color3): BrickColor {
    let best = "Medium stone grey";
    let bestD = Infinity;
    for (const [name, [, r, g, b]] of Object.entries(BRICK_COLORS)) {
      const d = (r / 255 - c.r) ** 2 + (g / 255 - c.g) ** 2 + (b / 255 - c.b) ** 2;
      if (d < bestD) {
        bestD = d;
        best = name;
      }
    }
    return BrickColor.byName(best);
  }
  luaIndex(key: unknown): unknown {
    if (key === "Name") return this.name;
    if (key === "Number") return this.number;
    if (key === "Color") return this.color;
    if (key === "r") return this.color.r;
    if (key === "g") return this.color.g;
    if (key === "b") return this.color.b;
    throw notMember(key, "BrickColor");
  }
  luaToString() {
    return this.name;
  }
  luaEq(o: unknown) {
    return o instanceof BrickColor && o.number === this.number;
  }
}

// ------------------------------------------------------------------ UDim / UDim2
export class UDim extends Userdata {
  readonly luaType = "UDim";
  constructor(
    public scale = 0,
    public offset = 0,
  ) {
    super();
  }
  luaIndex(key: unknown): unknown {
    if (key === "Scale") return this.scale;
    if (key === "Offset") return this.offset;
    throw notMember(key, "UDim");
  }
  luaToString() {
    return `${fmt(this.scale)}, ${fmt(this.offset)}`;
  }
  luaEq(o: unknown) {
    return o instanceof UDim && o.scale === this.scale && o.offset === this.offset;
  }
  luaArith(op: string, other: unknown, left: boolean): unknown {
    if (!(other instanceof UDim)) return undefined;
    const [a, b] = left ? [this, other] : [other, this];
    if (op === "+") return new UDim(a.scale + b.scale, a.offset + b.offset);
    if (op === "-") return new UDim(a.scale - b.scale, a.offset - b.offset);
    return undefined;
  }
}

export class UDim2 extends Userdata {
  readonly luaType = "UDim2";
  constructor(
    public x = new UDim(),
    public y = new UDim(),
  ) {
    super();
  }
  static methods = methodCache("UDim2", {
    Lerp: (s: UDim2, a: unknown[]) => {
      const o = a[0] as UDim2;
      const t = num(a, 1, "Lerp");
      const l = (p: number, q: number) => p + (q - p) * t;
      return new UDim2(
        new UDim(l(s.x.scale, o.x.scale), l(s.x.offset, o.x.offset)),
        new UDim(l(s.y.scale, o.y.scale), l(s.y.offset, o.y.offset)),
      );
    },
  });
  luaIndex(key: unknown): unknown {
    if (key === "X" || key === "Width") return this.x;
    if (key === "Y" || key === "Height") return this.y;
    const m = UDim2.methods.get(String(key));
    if (m) return m;
    throw notMember(key, "UDim2");
  }
  luaToString() {
    return `{${this.x.luaToString()}}, {${this.y.luaToString()}}`;
  }
  luaEq(o: unknown) {
    return o instanceof UDim2 && this.x.luaEq(o.x) && this.y.luaEq(o.y);
  }
  luaArith(op: string, other: unknown, left: boolean): unknown {
    if (!(other instanceof UDim2)) return undefined;
    const [a, b] = left ? [this, other] : [other, this];
    if (op === "+")
      return new UDim2(
        new UDim(a.x.scale + b.x.scale, a.x.offset + b.x.offset),
        new UDim(a.y.scale + b.y.scale, a.y.offset + b.y.offset),
      );
    if (op === "-")
      return new UDim2(
        new UDim(a.x.scale - b.x.scale, a.x.offset - b.x.offset),
        new UDim(a.y.scale - b.y.scale, a.y.offset - b.y.offset),
      );
    return undefined;
  }
}

// ------------------------------------------------------------------ Enum
export const ENUMS: Record<string, Record<string, number>> = {
  Material: {
    Plastic: 256,
    SmoothPlastic: 272,
    Neon: 288,
    Wood: 512,
    WoodPlanks: 528,
    Marble: 784,
    Slate: 800,
    Concrete: 816,
    Granite: 832,
    Brick: 848,
    Pebble: 864,
    Cobblestone: 880,
    Rock: 896,
    Sandstone: 912,
    CorrodedMetal: 1040,
    DiamondPlate: 1056,
    Foil: 1072,
    Metal: 1088,
    Grass: 1280,
    LeafyGrass: 1284,
    Sand: 1296,
    Fabric: 1312,
    Snow: 1328,
    Mud: 1344,
    Ground: 1360,
    Asphalt: 1376,
    Salt: 1392,
    Ice: 1536,
    Glacier: 1552,
    Glass: 1568,
    ForceField: 1584,
    Air: 1792,
    Water: 2048,
    Cardboard: 1316,
    Carpet: 1317,
    Leather: 1320,
    Plaster: 824,
    Pavement: 836,
    Rubber: 1024,
  },
  EasingStyle: {
    Linear: 0,
    Sine: 1,
    Back: 2,
    Quad: 3,
    Quart: 4,
    Quint: 5,
    Bounce: 6,
    Elastic: 7,
    Exponential: 8,
    Circular: 9,
    Cubic: 10,
  },
  EasingDirection: { In: 0, Out: 1, InOut: 2 },
  PartType: { Ball: 0, Block: 1, Cylinder: 2, Wedge: 3, CornerWedge: 4 },
  PlaybackState: { Begin: 0, Playing: 1, Paused: 2, Completed: 3, Cancelled: 4, Delayed: 5 },
  HumanoidStateType: {
    FallingDown: 0,
    Ragdoll: 1,
    GettingUp: 2,
    Jumping: 3,
    Swimming: 4,
    Freefall: 5,
    Flying: 6,
    Landed: 7,
    Running: 8,
    RunningNoPhysics: 10,
    StrafingNoPhysics: 11,
    Climbing: 12,
    Seated: 13,
    PlatformStanding: 14,
    Dead: 15,
    Physics: 16,
    None: 18,
  },
  UserInputType: {
    MouseButton1: 0,
    MouseButton2: 1,
    MouseButton3: 2,
    MouseWheel: 3,
    MouseMovement: 4,
    Touch: 7,
    Keyboard: 8,
    Focus: 9,
    Accelerometer: 10,
    Gyro: 11,
    Gamepad1: 12,
    TextInput: 23,
    None: 25,
  },
  UserInputState: { Begin: 0, Change: 1, End: 2, Cancel: 3, None: 4 },
  Font: {
    Legacy: 0,
    Arial: 1,
    ArialBold: 2,
    SourceSans: 3,
    SourceSansBold: 4,
    SourceSansLight: 5,
    SourceSansItalic: 6,
    Bodoni: 7,
    Garamond: 8,
    Cartoon: 9,
    Code: 10,
    Highway: 11,
    SciFi: 12,
    Arcade: 13,
    Fantasy: 14,
    Antique: 15,
    SourceSansSemibold: 16,
    Gotham: 17,
    GothamMedium: 18,
    GothamBold: 19,
    GothamBlack: 20,
    AmaticSC: 21,
    Bangers: 22,
    Creepster: 23,
    DenkOne: 24,
    Fondamento: 25,
    FredokaOne: 26,
    GrenzeGotisch: 27,
    IndieFlower: 28,
    JosefinSans: 29,
    Jura: 30,
    Kalam: 31,
    LuckiestGuy: 32,
    Merriweather: 33,
    Michroma: 34,
    Nunito: 35,
    Oswald: 36,
    PatrickHand: 37,
    PermanentMarker: 38,
    Roboto: 39,
    RobotoCondensed: 40,
    RobotoMono: 41,
    Sarpanch: 42,
    SpecialElite: 43,
    TitilliumWeb: 44,
    Ubuntu: 45,
    BuilderSans: 46,
    BuilderSansBold: 49,
  },
  RaycastFilterType: { Exclude: 0, Include: 1, Blacklist: 0, Whitelist: 1 },
  CameraType: {
    Fixed: 0,
    Attach: 1,
    Watch: 2,
    Track: 3,
    Follow: 4,
    Custom: 5,
    Scriptable: 6,
    Orbital: 7,
  },
  SortOrder: { Name: 0, Custom: 1, LayoutOrder: 2 },
  FillDirection: { Horizontal: 0, Vertical: 1 },
  HorizontalAlignment: { Center: 0, Left: 1, Right: 2 },
  VerticalAlignment: { Center: 0, Top: 1, Bottom: 2 },
  TextXAlignment: { Left: 0, Right: 1, Center: 2 },
  TextYAlignment: { Top: 0, Center: 1, Bottom: 2 },
  AutomaticSize: { None: 0, X: 1, Y: 2, XY: 3 },
  ZIndexBehavior: { Global: 0, Sibling: 1 },
  NormalId: { Right: 0, Top: 1, Back: 2, Left: 3, Bottom: 4, Front: 5 },
  SurfaceType: {
    Smooth: 0,
    Glue: 1,
    Weld: 2,
    Studs: 3,
    Inlet: 4,
    Universal: 5,
    Hinge: 6,
    Motor: 7,
    SteppingMotor: 8,
    SmoothNoOutlines: 10,
  },
  PathStatus: {
    Success: 0,
    ClosestNoPath: 1,
    ClosestOutOfRange: 2,
    FailStartNotEmpty: 3,
    FailFinishNotEmpty: 4,
    NoPath: 5,
  },
  PathWaypointAction: { Walk: 0, Jump: 1, Custom: 2 },
  CoreGuiType: {
    PlayerList: 0,
    Health: 1,
    Backpack: 2,
    Chat: 3,
    All: 4,
    EmotesMenu: 5,
    SelfView: 6,
    Captures: 7,
  },
  ScaleType: { Stretch: 0, Slice: 1, Tile: 2, Fit: 3, Crop: 4 },
  ProximityPromptStyle: { Default: 0, Custom: 1 },
  ProximityPromptExclusivity: { OnePerButton: 0, OneGlobally: 1, AlwaysShow: 2 },
  ExplosionType: { NoCraters: 0, Craters: 1 },
  Limb: { Head: 0, Torso: 1, LeftArm: 2, RightArm: 3, LeftLeg: 4, RightLeg: 5, Unknown: 6 },
  HumanoidRigType: { R6: 0, R15: 1 },
  MessageType: { MessageOutput: 0, MessageInfo: 1, MessageWarning: 2, MessageError: 3 },
  ContextActionResult: { Sink: 0, Pass: 1 },
  ThumbnailType: { HeadShot: 0, AvatarBust: 1, AvatarThumbnail: 2 },
  ThumbnailSize: {
    Size48x48: 0,
    Size180x180: 1,
    Size420x420: 2,
    Size60x60: 3,
    Size100x100: 4,
    Size150x150: 5,
    Size352x352: 6,
  },
  ProductPurchaseDecision: { NotProcessedYet: 0, PurchaseGranted: 1 },
  CurrencyType: { Default: 0, Robux: 1, Tix: 2 },
  AnimationPriority: {
    Idle: 0,
    Movement: 1,
    Action: 2,
    Action2: 3,
    Action3: 4,
    Action4: 5,
    Core: 1000,
  },
  KeyCode: (() => {
    const k: Record<string, number> = {
      Unknown: 0,
      Backspace: 8,
      Tab: 9,
      Return: 13,
      Escape: 27,
      Space: 32,
      Zero: 48,
      One: 49,
      Two: 50,
      Three: 51,
      Four: 52,
      Five: 53,
      Six: 54,
      Seven: 55,
      Eight: 56,
      Nine: 57,
      Up: 273,
      Down: 274,
      Right: 275,
      Left: 276,
      LeftShift: 304,
      RightShift: 303,
      LeftControl: 306,
      RightControl: 305,
      LeftAlt: 308,
      RightAlt: 307,
      F1: 282,
      F2: 283,
      F3: 284,
      F4: 285,
      ButtonA: 1000,
      ButtonB: 1001,
      ButtonX: 1002,
      ButtonY: 1003,
      ButtonR2: 1011,
      ButtonL2: 1010,
    };
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((c, i) => (k[c] = 97 + i));
    return k;
  })(),
};

export class EnumItem extends Userdata {
  readonly luaType = "EnumItem";
  constructor(
    public enumType: string,
    public name: string,
    public value: number,
  ) {
    super();
  }
  luaIndex(key: unknown): unknown {
    if (key === "Name") return this.name;
    if (key === "Value") return this.value;
    if (key === "EnumType") return ENUM_TYPES.get(this.enumType);
    throw notMember(key, `"Enum.${this.enumType}.${this.name}"`);
  }
  luaToString() {
    return `Enum.${this.enumType}.${this.name}`;
  }
}

export class EnumType extends Userdata {
  readonly luaType = "Enum";
  items = new Map<string, EnumItem>();
  constructor(public name: string) {
    super();
    for (const [item, value] of Object.entries(ENUMS[name]))
      this.items.set(item, new EnumItem(name, item, value));
  }
  luaIndex(key: unknown): unknown {
    const item = this.items.get(String(key));
    if (item) return item;
    if (key === "GetEnumItems") {
      return native("GetEnumItems", () => [LuaTable.from([...this.items.values()])]);
    }
    if (key === "FromName") return native("FromName", (a) => [this.items.get(String(a[1]))]);
    if (key === "FromValue")
      return native("FromValue", (a) => [[...this.items.values()].find((i) => i.value === a[1])]);
    throw new LuaError(`${String(key)} is not a valid member of "Enum.${this.name}"`);
  }
  luaToString() {
    return this.name;
  }
}

const ENUM_TYPES = new Map<string, EnumType>(Object.keys(ENUMS).map((n) => [n, new EnumType(n)]));

export function enumItem(type: string, name: string): EnumItem {
  const item = ENUM_TYPES.get(type)?.items.get(name);
  if (!item) throw new Error(`Unknown enum ${type}.${name}`);
  return item;
}

/** Converts string/number/EnumItem to an EnumItem of `type`, or throws a Roblox-style error. */
export function coerceEnum(type: string, value: unknown, prop: string): EnumItem {
  const et = ENUM_TYPES.get(type)!;
  if (value instanceof EnumItem) {
    if (value.enumType === type) return value;
    throw new LuaError(
      `Unable to assign property ${prop}. EnumItem of type ${type} expected, got an EnumItem of type ${value.enumType}`,
    );
  }
  if (typeof value === "string") {
    const item = et.items.get(value);
    if (item) return item;
    throw new LuaError(
      `Unable to assign property ${prop}. Invalid value "${value}" for enum ${type}`,
    );
  }
  if (typeof value === "number") {
    const item = [...et.items.values()].find((i) => i.value === value);
    if (item) return item;
  }
  throw new LuaError(
    `Unable to assign property ${prop}. EnumItem expected, got ${robloxTypeOf(value)}`,
  );
}

export class EnumRoot extends Userdata {
  readonly luaType = "Enums";
  luaIndex(key: unknown): unknown {
    const t = ENUM_TYPES.get(String(key));
    if (t) return t;
    if (key === "GetEnums")
      return native("GetEnums", () => [LuaTable.from([...ENUM_TYPES.values()])]);
    throw new LuaError(`${String(key)} is not a valid member of "Enum"`);
  }
  luaToString() {
    return "Enum";
  }
}

// ------------------------------------------------------------------ TweenInfo, NumberRange, sequences, Random
export class TweenInfo extends Userdata {
  readonly luaType = "TweenInfo";
  constructor(
    public time = 1,
    public style: EnumItem = enumItem("EasingStyle", "Quad"),
    public direction: EnumItem = enumItem("EasingDirection", "Out"),
    public repeatCount = 0,
    public reverses = false,
    public delayTime = 0,
  ) {
    super();
  }
  luaIndex(key: unknown): unknown {
    switch (key) {
      case "Time":
        return this.time;
      case "EasingStyle":
        return this.style;
      case "EasingDirection":
        return this.direction;
      case "RepeatCount":
        return this.repeatCount;
      case "Reverses":
        return this.reverses;
      case "DelayTime":
        return this.delayTime;
    }
    throw notMember(key, "TweenInfo");
  }
  luaToString() {
    return `Time:${fmt(this.time)} DelayTime:${fmt(this.delayTime)} RepeatCount:${this.repeatCount} Reverses:${this.reverses} EasingDirection:${this.direction.name} EasingStyle:${this.style.name}`;
  }
}

export class Opaque extends Userdata {
  constructor(
    public readonly luaType: string,
    public fields: Record<string, unknown> = {},
  ) {
    super();
  }
  luaIndex(key: unknown): unknown {
    if (String(key) in this.fields) return this.fields[String(key)];
    throw notMember(key, this.luaType);
  }
  luaToString() {
    return this.luaType;
  }
}

export class RandomObj extends Userdata {
  readonly luaType = "Random";
  private state: number;
  constructor(seed: number) {
    super();
    this.state = Math.floor(seed) >>> 0 || 1;
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  static methods = methodCache("Random", {
    NextNumber: (s: RandomObj, a: unknown[]) => {
      const lo = num(a, 0, "NextNumber", 0);
      const hi = num(a, 1, "NextNumber", 1);
      return lo + s.next() * (hi - lo);
    },
    NextInteger: (s: RandomObj, a: unknown[]) => {
      const lo = Math.trunc(num(a, 0, "NextInteger"));
      const hi = Math.trunc(num(a, 1, "NextInteger"));
      if (lo > hi) throw new LuaError("invalid argument #2 to 'NextInteger' (interval is empty)");
      return lo + Math.floor(s.next() * (hi - lo + 1));
    },
    Shuffle: (s: RandomObj, a: unknown[]) => {
      const t = a[0] as LuaTable;
      for (let i = t.length(); i > 1; i--) {
        const j = 1 + Math.floor(s.next() * i);
        const tmp = t.get(i);
        t.set(i, t.get(j));
        t.set(j, tmp);
      }
      return [];
    },
    Clone: (s: RandomObj) => {
      const r = new RandomObj(0);
      r.state = s.state;
      return r;
    },
  });
  luaIndex(key: unknown): unknown {
    const m = RandomObj.methods.get(String(key));
    if (m) return m;
    throw notMember(key, "Random");
  }
}

// ------------------------------------------------------------------ constructors table
function ctorTable(entries: Record<string, unknown>): LuaTable {
  const t = new LuaTable();
  for (const [k, v] of Object.entries(entries)) t.set(k, v);
  t.frozen = true;
  return t;
}

export function datatypeGlobals(): Record<string, unknown> {
  const V3 = ctorTable({
    new: native("new", (a) => new Vector3(num(a, 0, "new"), num(a, 1, "new"), num(a, 2, "new"))),
    zero: new Vector3(0, 0, 0),
    one: new Vector3(1, 1, 1),
    xAxis: new Vector3(1, 0, 0),
    yAxis: new Vector3(0, 1, 0),
    zAxis: new Vector3(0, 0, 1),
    FromNormalId: native("FromNormalId", (a) => {
      const map: Record<string, Vector3> = {
        Right: new Vector3(1, 0, 0),
        Left: new Vector3(-1, 0, 0),
        Top: new Vector3(0, 1, 0),
        Bottom: new Vector3(0, -1, 0),
        Front: new Vector3(0, 0, -1),
        Back: new Vector3(0, 0, 1),
      };
      return map[(a[0] as EnumItem)?.name] ?? new Vector3();
    }),
  });
  const V2 = ctorTable({
    new: native("new", (a) => new Vector2(num(a, 0, "new"), num(a, 1, "new"))),
    zero: new Vector2(0, 0),
    one: new Vector2(1, 1),
  });
  const CF = ctorTable({
    new: native("new", (a) => {
      if (a.length === 0) return new CFrame();
      if (a[0] instanceof Vector3) {
        if (a[1] instanceof Vector3) return CFrame.lookAt(a[0], a[1]);
        return new CFrame(a[0]);
      }
      const p = new Vector3(num(a, 0, "new"), num(a, 1, "new"), num(a, 2, "new"));
      if (a.length >= 12)
        return new CFrame(p, a.slice(3, 12).map((v, i) => num(a, i + 3, "new")) as M3);
      if (a.length >= 7) {
        const [qx, qy, qz, qw] = [3, 4, 5, 6].map((i) => num(a, i, "new"));
        return new CFrame(p, [
          1 - 2 * (qy * qy + qz * qz),
          2 * (qx * qy - qz * qw),
          2 * (qx * qz + qy * qw),
          2 * (qx * qy + qz * qw),
          1 - 2 * (qx * qx + qz * qz),
          2 * (qy * qz - qx * qw),
          2 * (qx * qz - qy * qw),
          2 * (qy * qz + qx * qw),
          1 - 2 * (qx * qx + qy * qy),
        ]);
      }
      return new CFrame(p);
    }),
    identity: new CFrame(),
    Angles: native("Angles", (a) =>
      CFrame.angles(num(a, 0, "Angles"), num(a, 1, "Angles"), num(a, 2, "Angles")),
    ),
    fromEulerAnglesXYZ: native("fromEulerAnglesXYZ", (a) =>
      CFrame.angles(
        num(a, 0, "fromEulerAnglesXYZ"),
        num(a, 1, "fromEulerAnglesXYZ"),
        num(a, 2, "fromEulerAnglesXYZ"),
      ),
    ),
    fromEulerAnglesYXZ: native("fromEulerAnglesYXZ", (a) =>
      CFrame.orientation(
        num(a, 0, "fromEulerAnglesYXZ"),
        num(a, 1, "fromEulerAnglesYXZ"),
        num(a, 2, "fromEulerAnglesYXZ"),
      ),
    ),
    fromOrientation: native("fromOrientation", (a) =>
      CFrame.orientation(
        num(a, 0, "fromOrientation"),
        num(a, 1, "fromOrientation"),
        num(a, 2, "fromOrientation"),
      ),
    ),
    lookAt: native("lookAt", (a) =>
      CFrame.lookAt(
        asVector3(a[0], 1, "lookAt"),
        asVector3(a[1], 2, "lookAt"),
        a[2] instanceof Vector3 ? a[2] : undefined,
      ),
    ),
    fromAxisAngle: native("fromAxisAngle", (a) => {
      const axis = asVector3(a[0], 1, "fromAxisAngle").unit();
      const t = num(a, 1, "fromAxisAngle");
      const c = Math.cos(t);
      const s = Math.sin(t);
      const C = 1 - c;
      const { x, y, z } = axis;
      return new CFrame(new Vector3(), [
        x * x * C + c,
        x * y * C - z * s,
        x * z * C + y * s,
        y * x * C + z * s,
        y * y * C + c,
        y * z * C - x * s,
        z * x * C - y * s,
        z * y * C + x * s,
        z * z * C + c,
      ]);
    }),
  });
  const C3 = ctorTable({
    new: native("new", (a) => new Color3(num(a, 0, "new"), num(a, 1, "new"), num(a, 2, "new"))),
    fromRGB: native("fromRGB", (a) =>
      Color3.fromRGB(num(a, 0, "fromRGB"), num(a, 1, "fromRGB"), num(a, 2, "fromRGB")),
    ),
    fromHSV: native("fromHSV", (a) =>
      Color3.fromHSV(num(a, 0, "fromHSV"), num(a, 1, "fromHSV"), num(a, 2, "fromHSV")),
    ),
    fromHex: native("fromHex", (a) => {
      const hex = String(a[0] ?? "").replace("#", "");
      if (!/^[0-9a-fA-F]{6}$/.test(hex))
        throw new LuaError(`Unable to convert characters to hex value`);
      return Color3.fromRGB(
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      );
    }),
  });
  const brickFns: Record<string, unknown> = {
    new: native("new", (a) => {
      if (typeof a[0] === "string") return BrickColor.byName(a[0]);
      if (a[0] instanceof Color3) return BrickColor.fromColor(a[0]);
      if (typeof a[0] === "number" && a.length >= 3)
        return BrickColor.fromColor(
          new Color3(num(a, 0, "new"), num(a, 1, "new"), num(a, 2, "new")),
        );
      if (typeof a[0] === "number") return BrickColor.byNumber(a[0]);
      return BrickColor.byName("Medium stone grey");
    }),
    random: native("random", () => BrickColor.byName("Bright blue")),
    Random: native("Random", () => BrickColor.byName("Bright blue")),
    palette: native("palette", (a) => BrickColor.byNumber(Number(a[0]))),
  };
  for (const [fn, name] of [
    ["White", "White"],
    ["Gray", "Medium stone grey"],
    ["DarkGray", "Dark stone grey"],
    ["Black", "Black"],
    ["Red", "Bright red"],
    ["Yellow", "Bright yellow"],
    ["Green", "Dark green"],
    ["Blue", "Bright blue"],
  ]) {
    brickFns[fn] = native(fn, () => BrickColor.byName(name));
  }
  const UD = ctorTable({ new: native("new", (a) => new UDim(num(a, 0, "new"), num(a, 1, "new"))) });
  const UD2 = ctorTable({
    new: native("new", (a) => {
      if (a[0] instanceof UDim && a[1] instanceof UDim) return new UDim2(a[0], a[1]);
      return new UDim2(
        new UDim(num(a, 0, "new"), num(a, 1, "new")),
        new UDim(num(a, 2, "new"), num(a, 3, "new")),
      );
    }),
    fromScale: native(
      "fromScale",
      (a) => new UDim2(new UDim(num(a, 0, "fromScale"), 0), new UDim(num(a, 1, "fromScale"), 0)),
    ),
    fromOffset: native(
      "fromOffset",
      (a) => new UDim2(new UDim(0, num(a, 0, "fromOffset")), new UDim(0, num(a, 1, "fromOffset"))),
    ),
  });
  const TI = ctorTable({
    new: native("new", (a) => {
      const style = a[1] === undefined ? undefined : coerceEnum("EasingStyle", a[1], "EasingStyle");
      const dir =
        a[2] === undefined ? undefined : coerceEnum("EasingDirection", a[2], "EasingDirection");
      return new TweenInfo(
        num(a, 0, "new", 1),
        style,
        dir,
        num(a, 3, "new", 0),
        a[4] === true,
        num(a, 5, "new", 0),
      );
    }),
  });
  const NR = ctorTable({
    new: native("new", (a) => {
      const lo = num(a, 0, "new");
      return new Opaque("NumberRange", { Min: lo, Max: num(a, 1, "new", lo) });
    }),
  });
  const seq = (type: string) =>
    ctorTable({ new: native("new", (a) => new Opaque(type, { Keypoints: LuaTable.from(a) })) });
  const kp = (type: string) =>
    ctorTable({ new: native("new", (a) => new Opaque(type, { Time: a[0], Value: a[1] })) });
  const RND = ctorTable({ new: native("new", (a) => new RandomObj(num(a, 0, "new", 42))) });
  const DT = ctorTable({
    now: native(
      "now",
      (_a, I) =>
        new Opaque("DateTime", {
          UnixTimestamp: 1_760_000_000 + Math.floor(I.now()),
          UnixTimestampMillis: (1_760_000_000 + I.now()) * 1000,
        }),
    ),
  });
  return {
    Vector3: V3,
    Vector2: V2,
    CFrame: CF,
    Color3: C3,
    BrickColor: ctorTable(brickFns),
    UDim: UD,
    UDim2: UD2,
    TweenInfo: TI,
    NumberRange: NR,
    NumberSequence: seq("NumberSequence"),
    ColorSequence: seq("ColorSequence"),
    NumberSequenceKeypoint: kp("NumberSequenceKeypoint"),
    ColorSequenceKeypoint: kp("ColorSequenceKeypoint"),
    Random: RND,
    DateTime: DT,
    Enum: new EnumRoot(),
  };
}
