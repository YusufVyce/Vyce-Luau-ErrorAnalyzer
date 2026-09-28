/**
 * Allowlist of documentation links the analyzer is allowed to show.
 *
 * Every URL here points at a stable page of the official Roblox Creator Hub
 * reference (`/docs/reference/engine/{classes|libraries|globals|datatypes}/Name`)
 * or a long-standing guide. Links are never assembled from user input or API
 * names at runtime — that is how the old knowledge base produced dead URLs like
 * `/docs/reference/engine/Humanoid:LoadAnimation`. If a topic is not in this
 * table, the analyzer shows no link rather than a guessed one.
 */

const BASE = "https://create.roblox.com/docs";

export interface DocLink {
  label: string;
  url: string;
}

const CLASS_PAGES = [
  "Instance",
  "Players",
  "Player",
  "Humanoid",
  "Animator",
  "BasePart",
  "Model",
  "RemoteEvent",
  "RemoteFunction",
  "BindableEvent",
  "DataStoreService",
  "GlobalDataStore",
  "HttpService",
  "TweenService",
  "RunService",
  "UserInputService",
  "ProximityPrompt",
  "ReplicatedStorage",
  "ServerStorage",
  "ServerScriptService",
  "Workspace",
  "ModuleScript",
  "Script",
  "LocalScript",
  "TextLabel",
  "TextButton",
  "GuiButton",
  "ScreenGui",
  "PlayerGui",
  "Debris",
  "CollectionService",
  "MarketplaceService",
  "Sound",
  "RBXScriptSignal",
] as const;

type ClassPage = (typeof CLASS_PAGES)[number];

const EXTRA: Record<string, DocLink> = {
  task: { label: "task library", url: `${BASE}/reference/engine/libraries/task` },
  string: { label: "string library", url: `${BASE}/reference/engine/libraries/string` },
  table: { label: "table library", url: `${BASE}/reference/engine/libraries/table` },
  math: { label: "math library", url: `${BASE}/reference/engine/libraries/math` },
  coroutine: { label: "coroutine library", url: `${BASE}/reference/engine/libraries/coroutine` },
  globals: {
    label: "Luau globals (pcall, require, tostring…)",
    url: `${BASE}/reference/engine/globals/LuaGlobals`,
  },
  robloxGlobals: {
    label: "Roblox globals (game, workspace, script)",
    url: `${BASE}/reference/engine/globals/RobloxGlobals`,
  },
  Vector3: { label: "Vector3", url: `${BASE}/reference/engine/datatypes/Vector3` },
  CFrame: { label: "CFrame", url: `${BASE}/reference/engine/datatypes/CFrame` },
  UDim2: { label: "UDim2", url: `${BASE}/reference/engine/datatypes/UDim2` },
  Color3: { label: "Color3", url: `${BASE}/reference/engine/datatypes/Color3` },
  TweenInfo: { label: "TweenInfo", url: `${BASE}/reference/engine/datatypes/TweenInfo` },
  guideDataStores: { label: "Guide: Data stores", url: `${BASE}/cloud-services/data-stores` },
  guideRemote: {
    label: "Guide: Remote events and callbacks",
    url: `${BASE}/scripting/events/remote`,
  },
  guideLuau: { label: "Guide: Luau language", url: `${BASE}/luau` },
};

const CLASS_SET = new Set<string>(CLASS_PAGES);

/** Returns a doc link for a known key (class name or EXTRA key), otherwise undefined. */
export function doc(key: string, anchor?: string): DocLink | undefined {
  if (CLASS_SET.has(key)) {
    const cls = key as ClassPage;
    const url = `${BASE}/reference/engine/classes/${cls}${anchor ? `#${anchor}` : ""}`;
    return { label: anchor ? `${cls}:${anchor}` : cls, url };
  }
  return EXTRA[key];
}

export function docs(...keys: Array<string | [string, string]>): DocLink[] {
  const out: DocLink[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const link = Array.isArray(key) ? doc(key[0], key[1]) : doc(key);
    if (link && !seen.has(link.url)) {
      seen.add(link.url);
      out.push(link);
    }
  }
  return out;
}

/** Every URL the analyzer can ever emit — used by tests to guard against invented links. */
export function allAllowedDocUrlPrefixes(): string[] {
  return [
    ...CLASS_PAGES.map((cls) => `${BASE}/reference/engine/classes/${cls}`),
    ...Object.values(EXTRA).map((link) => link.url),
  ];
}
