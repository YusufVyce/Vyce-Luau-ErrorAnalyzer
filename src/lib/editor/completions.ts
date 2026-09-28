/**
 * Autocomplete for the code editor: Luau keywords and globals, Roblox
 * services, creatable classes, enums, library functions, common members and
 * the names declared in the user's own code. Pure data — no network.
 */
import { COMMON_MEMBERS, CREATABLE_CLASSES, SERVICE_NAMES } from "@/lib/analyzer/precise/robloxApi";
import { ENUMS } from "@/lib/luau/roblox/datatypes";

export interface Completion {
  label: string;
  kind: "keyword" | "global" | "service" | "class" | "enum" | "function" | "member" | "local";
  /** Text inserted in place of the typed prefix. */
  insert: string;
  detail?: string;
}

const KEYWORDS = [
  "local",
  "function",
  "end",
  "if",
  "then",
  "elseif",
  "else",
  "for",
  "in",
  "do",
  "while",
  "repeat",
  "until",
  "return",
  "break",
  "continue",
  "and",
  "or",
  "not",
  "nil",
  "true",
  "false",
];

const GLOBALS: Array<[string, string]> = [
  ["game", "DataModel"],
  ["workspace", "Workspace"],
  ["script", "this script"],
  ["print", "function"],
  ["warn", "function"],
  ["error", "function"],
  ["assert", "function"],
  ["pcall", "function"],
  ["xpcall", "function"],
  ["require", "function"],
  ["typeof", "function"],
  ["type", "function"],
  ["tostring", "function"],
  ["tonumber", "function"],
  ["ipairs", "function"],
  ["pairs", "function"],
  ["next", "function"],
  ["select", "function"],
  ["unpack", "function"],
  ["setmetatable", "function"],
  ["getmetatable", "function"],
  ["rawget", "function"],
  ["rawset", "function"],
  ["Instance", "class"],
  ["Vector3", "datatype"],
  ["Vector2", "datatype"],
  ["CFrame", "datatype"],
  ["Color3", "datatype"],
  ["BrickColor", "datatype"],
  ["UDim", "datatype"],
  ["UDim2", "datatype"],
  ["TweenInfo", "datatype"],
  ["RaycastParams", "datatype"],
  ["Enum", "enums"],
  ["task", "library"],
  ["math", "library"],
  ["string", "library"],
  ["table", "library"],
  ["coroutine", "library"],
  ["os", "library"],
  ["utf8", "library"],
  ["tick", "function"],
  ["time", "function"],
];

const LIBS: Record<string, string[]> = {
  task: ["wait", "spawn", "delay", "defer", "cancel"],
  math: [
    "abs",
    "ceil",
    "floor",
    "clamp",
    "max",
    "min",
    "random",
    "randomseed",
    "round",
    "sqrt",
    "sin",
    "cos",
    "tan",
    "rad",
    "deg",
    "pi",
    "huge",
    "sign",
    "noise",
    "exp",
    "log",
    "fmod",
    "pow",
  ],
  string: [
    "format",
    "sub",
    "len",
    "lower",
    "upper",
    "rep",
    "reverse",
    "find",
    "match",
    "gmatch",
    "gsub",
    "split",
    "byte",
    "char",
  ],
  table: [
    "insert",
    "remove",
    "find",
    "sort",
    "concat",
    "clear",
    "clone",
    "freeze",
    "isfrozen",
    "create",
    "unpack",
    "pack",
    "move",
  ],
  coroutine: ["create", "resume", "yield", "wrap", "status", "running", "isyieldable", "close"],
  os: ["time", "clock", "date"],
  utf8: ["char", "codepoint", "len", "charpattern"],
  Instance: ["new"],
  Vector3: ["new", "zero", "one", "xAxis", "yAxis", "zAxis"],
  Vector2: ["new", "zero", "one"],
  CFrame: ["new", "Angles", "fromOrientation", "lookAt", "identity"],
  Color3: ["new", "fromRGB", "fromHSV", "fromHex"],
  UDim2: ["new", "fromScale", "fromOffset"],
  TweenInfo: ["new"],
  BrickColor: ["new", "random", "Red", "White", "Black"],
  RaycastParams: ["new"],
};

const METHODS = [
  "GetService",
  "FindFirstChild",
  "FindFirstChildOfClass",
  "FindFirstAncestor",
  "FindFirstAncestorOfClass",
  "WaitForChild",
  "GetChildren",
  "GetDescendants",
  "Clone",
  "Destroy",
  "IsA",
  "IsDescendantOf",
  "GetAttribute",
  "SetAttribute",
  "GetPropertyChangedSignal",
  "Connect",
  "Once",
  "Wait",
  "Disconnect",
  "FireServer",
  "FireClient",
  "FireAllClients",
  "InvokeServer",
  "GetPlayers",
  "GetPlayerFromCharacter",
  "GetAsync",
  "SetAsync",
  "UpdateAsync",
  "GetDataStore",
  "Create",
  "Play",
  "Pause",
  "Cancel",
  "TakeDamage",
  "MoveTo",
  "LoadAnimation",
  "Raycast",
  "PivotTo",
  "GetPivot",
  "AddItem",
  "GetTagged",
  "AddTag",
  "HasTag",
  "RemoveTag",
  "GetInstanceAddedSignal",
  "Kick",
  "LoadCharacter",
  "EquipTool",
];

function localNames(code: string): string[] {
  const out = new Set<string>();
  for (const m of code.matchAll(/\blocal\s+function\s+([A-Za-z_]\w*)/g)) out.add(m[1]);
  for (const m of code.matchAll(/\blocal\s+([A-Za-z_][\w\s,]*?)\s*(?:=|\n|$)/g))
    for (const n of m[1].split(",")) if (/^[A-Za-z_]\w*$/.test(n.trim())) out.add(n.trim());
  for (const m of code.matchAll(/\bfunction\s*[\w.:]*\(([^)]*)\)/g))
    for (const n of m[1].split(",")) if (/^[A-Za-z_]\w*$/.test(n.trim())) out.add(n.trim());
  for (const m of code.matchAll(/\bfor\s+([\w\s,]+?)\s+(?:=|in)\b/g))
    for (const n of m[1].split(",")) if (/^[A-Za-z_]\w*$/.test(n.trim())) out.add(n.trim());
  return [...out];
}

/** Names beginners use most, suggested first. */
const POPULAR = [
  "ReplicatedStorage",
  "Players",
  "ServerStorage",
  "ServerScriptService",
  "TweenService",
  "RunService",
  "UserInputService",
  "DataStoreService",
  "CollectionService",
  "Debris",
  "Workspace",
  "Lighting",
  "Part",
  "Folder",
  "IntValue",
  "NumberValue",
  "StringValue",
  "BoolValue",
  "RemoteEvent",
  "RemoteFunction",
  "ScreenGui",
  "Frame",
  "TextLabel",
  "TextButton",
  "Model",
  "Humanoid",
  "Tool",
  "ProximityPrompt",
  "Sound",
  "local",
  "function",
  "then",
  "end",
  "return",
  "print",
  "game",
  "workspace",
  "wait",
  "WaitForChild",
  "FindFirstChild",
  "Connect",
  "Value",
  "Name",
  "Parent",
  "Position",
];
const POP = new Map(POPULAR.map((n, i) => [n, i]));

function rank(items: Completion[], prefix: string): Completion[] {
  const p = prefix.toLowerCase();
  const seen = new Set<string>();
  return items
    .filter((c) => c.label.toLowerCase().startsWith(p) && c.label !== prefix)
    .filter((c) => (seen.has(c.label) ? false : (seen.add(c.label), true)))
    .sort((a, b) => {
      const ca = a.label.startsWith(prefix) ? 0 : 1;
      const cb = b.label.startsWith(prefix) ? 0 : 1;
      const pa = POP.get(a.label) ?? 999;
      const pb = POP.get(b.label) ?? 999;
      return (
        ca - cb || pa - pb || a.label.length - b.label.length || a.label.localeCompare(b.label)
      );
    })
    .slice(0, 8);
}

export interface CompletionResult {
  items: Completion[];
  /** How many characters before the caret the completion replaces. */
  replace: number;
}

/** Suggestions for the text before the caret. */
export function complete(before: string, code: string): CompletionResult | null {
  // Inside a string: GetService("…"), Instance.new("…"), FindFirstChildOfClass("…")
  const str = before.match(
    /(GetService|Instance\.new|FindFirstChildOfClass|IsA|FindFirstAncestorOfClass)\(\s*["']([\w]*)$/,
  );
  if (str) {
    const list = str[1] === "GetService" ? SERVICE_NAMES : CREATABLE_CLASSES;
    const items = list.map<Completion>((n) => ({
      label: n,
      kind: str[1] === "GetService" ? "service" : "class",
      insert: n,
    }));
    const r = rank(items, str[2]);
    return r.length ? { items: r, replace: str[2].length } : null;
  }
  // Enum.Type.Item
  const en = before.match(/\bEnum\.(\w+)\.(\w*)$/);
  if (en) {
    const items = Object.keys(ENUMS[en[1]] ?? {}).map<Completion>((n) => ({
      label: n,
      kind: "enum",
      insert: n,
      detail: en[1],
    }));
    const r = rank(items, en[2]);
    return r.length ? { items: r, replace: en[2].length } : null;
  }
  const et = before.match(/\bEnum\.(\w*)$/);
  if (et) {
    const r = rank(
      Object.keys(ENUMS).map((n) => ({ label: n, kind: "enum" as const, insert: n })),
      et[1],
    );
    return r.length ? { items: r, replace: et[1].length } : null;
  }
  // lib.member / obj.member / obj:Method
  const mem = before.match(/([A-Za-z_]\w*)\s*([.:])(\w*)$/);
  if (mem) {
    const [, base, sep, prefix] = mem;
    let items: Completion[];
    if (LIBS[base] && sep === ".") {
      items = LIBS[base].map((n) => ({ label: n, kind: "function", insert: n, detail: base }));
    } else if (sep === ":") {
      items = METHODS.map((n) => ({ label: n, kind: "function", insert: n }));
    } else {
      items = [
        ...COMMON_MEMBERS.map((n) => ({ label: n, kind: "member" as const, insert: n })),
        ...SERVICE_NAMES.filter(() => base === "game").map((n) => ({
          label: n,
          kind: "service" as const,
          insert: n,
        })),
      ];
    }
    if (!prefix && sep === ".") return null;
    const r = rank(items, prefix);
    return r.length ? { items: r, replace: prefix.length } : null;
  }
  // Plain identifier
  const id = before.match(/(?:^|[^\w.:"'])([A-Za-z_]\w*)$/);
  if (!id || id[1].length < 2) return null;
  // Don't complete inside comments or strings.
  const line = before.slice(before.lastIndexOf("\n") + 1);
  if (line.includes("--") || (line.split('"').length - 1) % 2 === 1) return null;
  const items: Completion[] = [
    ...localNames(code).map((n) => ({ label: n, kind: "local" as const, insert: n })),
    ...KEYWORDS.map((k) => ({ label: k, kind: "keyword" as const, insert: k })),
    ...GLOBALS.map(([g, d]) => ({ label: g, kind: "global" as const, insert: g, detail: d })),
  ];
  const r = rank(items, id[1]);
  return r.length ? { items: r, replace: id[1].length } : null;
}
