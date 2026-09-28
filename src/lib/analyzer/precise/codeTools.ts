/**
 * Small, dependency-free helpers for reading Roblox output logs and Luau
 * snippets. They are deliberately conservative: every helper returns
 * `undefined` rather than guessing when the input doesn't clearly support an
 * answer, because the diagnosis layer turns these results into confidence.
 */

export type Side = "server" | "client" | "unknown";

export interface StackFrame {
  path: string;
  line: number;
  fn?: string;
}

export interface ParsedLog {
  /** The error text without script path, timestamps or Studio suffixes. */
  message: string;
  scriptPath?: string;
  scriptName?: string;
  line?: number;
  side: Side;
  stack: StackFrame[];
  /** Every other non-stack line in the log (earlier/later errors). */
  otherMessages: string[];
}

const TIMESTAMP = /^\s*\d{1,2}:\d{2}:\d{2}(?:\.\d+)?\s+(?:-\s+)?/;
const STUDIO_SUFFIX = /\s+-\s+(Server|Client|Studio)(?:\s+-\s+[^\n]*)?\s*$/i;
const PATH_LINE = /^([A-Za-z_][\w .\-@]*?):(\d+):\s*(.+)$/;
const STACK_LINE = /Script '([^']+)',\s*Line\s+(\d+)(?:\s*-\s*(?:function\s+)?([^\n]+))?/i;

const CLIENT_CONTAINERS =
  /(^|\.)(PlayerScripts|PlayerGui|StarterPlayerScripts|StarterCharacterScripts|StarterGui|Backpack|ReplicatedFirst|StarterPack)(\.|$)/i;
const SERVER_CONTAINERS = /(^|\.)(ServerScriptService|ServerStorage)(\.|$)/i;

export function sideFromPath(path: string | undefined): Side {
  if (!path) return "unknown";
  if (CLIENT_CONTAINERS.test(path)) return "client";
  if (SERVER_CONTAINERS.test(path)) return "server";
  return "unknown";
}

export function parseLog(raw: string): ParsedLog {
  const lines = (raw ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(TIMESTAMP, "").trim())
    .filter(Boolean);

  const stack: StackFrame[] = [];
  const messages: Array<{ text: string; path?: string; line?: number; side?: Side }> = [];

  for (const original of lines) {
    if (/^stack (begin|end)$/i.test(original)) continue;
    const stackMatch = original.match(STACK_LINE);
    if (stackMatch) {
      stack.push({ path: stackMatch[1], line: Number(stackMatch[2]), fn: stackMatch[3]?.trim() });
      continue;
    }

    let text = original;
    let side: Side | undefined;
    const suffix = text.match(STUDIO_SUFFIX);
    if (suffix) {
      const tag = suffix[1].toLowerCase();
      side = tag === "server" ? "server" : tag === "client" ? "client" : undefined;
      text = text.replace(STUDIO_SUFFIX, "").trim();
    }

    const pathMatch = text.match(PATH_LINE);
    if (pathMatch && !/\s{2,}/.test(pathMatch[1])) {
      messages.push({
        text: pathMatch[3].trim(),
        path: pathMatch[1].trim(),
        line: Number(pathMatch[2]),
        side,
      });
    } else {
      messages.push({ text, side });
    }
  }

  // Prefer the first message that looks like an actual error over banner lines.
  const primary =
    messages.find((m) => m.path) ??
    messages.find((m) =>
      /attempt to|expected|invalid|not a valid|unable to|infinite yield|error|failed|cannot|timeout|overflow/i.test(
        m.text,
      ),
    ) ??
    messages[0];

  const scriptPath = primary?.path ?? stack[0]?.path;
  const line = primary?.line ?? stack[0]?.line;
  const side: Side = primary?.side ?? sideFromPath(scriptPath);

  return {
    message: primary?.text ?? "",
    scriptPath,
    scriptName: scriptPath?.split(".").pop(),
    line,
    side,
    stack,
    otherMessages: messages.filter((m) => m !== primary).map((m) => m.text),
  };
}

/**
 * Replaces comments and string contents with spaces (keeping line/column
 * positions) so identifier searches don't match text inside strings.
 */
export function sanitizeCode(code: string): string {
  let out = "";
  let i = 0;
  const n = code.length;
  while (i < n) {
    const ch = code[i];
    const next = code[i + 1];
    if (ch === "-" && next === "-") {
      const long = code.slice(i + 2).match(/^\[(=*)\[/);
      if (long) {
        const close = `]${long[1]}]`;
        const end = code.indexOf(close, i + 2 + long[0].length);
        const stop = end === -1 ? n : end + close.length;
        out += code.slice(i, stop).replace(/[^\n]/g, " ");
        i = stop;
        continue;
      }
      const end = code.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      out += " ".repeat(stop - i);
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < n && code[j] !== ch && code[j] !== "\n") {
        if (code[j] === "\\") j++;
        j++;
      }
      const stop = Math.min(n, j + 1);
      out +=
        ch +
        code.slice(i + 1, stop - 1).replace(/[^\n]/g, " ") +
        (stop - 1 < n && code[stop - 1] === ch ? ch : "");
      i = stop;
      continue;
    }
    if (ch === "[") {
      const long = code.slice(i).match(/^\[(=*)\[/);
      if (long) {
        const close = `]${long[1]}]`;
        const end = code.indexOf(close, i + long[0].length);
        const stop = end === -1 ? n : end + close.length;
        out += code.slice(i, stop).replace(/[^\n]/g, " ");
        i = stop;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

export function splitLines(code: string): string[] {
  return (code ?? "").replace(/\r\n?/g, "\n").split("\n");
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface LocatedLine {
  line: number;
  text: string;
  /** true when the log's line number points at this exact line of the snippet. */
  exact: boolean;
}

/**
 * Finds the line the error is about. Uses the log's line number when the
 * snippet is long enough and that line passes `accept`; otherwise searches the
 * snippet for the first line that passes `accept`.
 */
export function locateLine(
  code: string,
  logLine: number | undefined,
  accept: (sanitizedLine: string, rawLine: string) => boolean,
): LocatedLine | undefined {
  if (!code.trim()) return undefined;
  const raw = splitLines(code);
  const clean = splitLines(sanitizeCode(code));

  if (
    logLine &&
    logLine >= 1 &&
    logLine <= raw.length &&
    accept(clean[logLine - 1], raw[logLine - 1])
  ) {
    return { line: logLine, text: raw[logLine - 1].trim(), exact: true };
  }
  const hits: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (clean[i].trim() && accept(clean[i], raw[i])) hits.push(i);
  }
  if (hits.length === 0) return undefined;
  // With a log line number, prefer the hit nearest to it (snippets are often
  // pasted with a few lines missing at the top).
  const best = logLine
    ? hits.reduce((a, b) => (Math.abs(b + 1 - logLine) < Math.abs(a + 1 - logLine) ? b : a))
    : hits[0];
  return { line: best + 1, text: raw[best].trim(), exact: false };
}

const ID = "[A-Za-z_][A-Za-z0-9_]*";

/** Expression like `a.b:C("x").d["e"]` that ends right before `.key` / `:key` on this line. */
export function expressionBefore(line: string, key: string): string | undefined {
  const pattern = new RegExp(
    `(${ID}(?:\\s*(?:\\.\\s*${ID}|:\\s*${ID}\\s*\\([^()]*\\)|\\[[^\\]]+\\]|\\([^()]*\\)))*)\\s*(?:\\.|:)\\s*${escapeRegExp(key)}\\b`,
  );
  const match = line.match(pattern);
  if (!match) return undefined;
  return match[1].replace(/\s+/g, "");
}

/** Last `.segment` / `:Method(...)` of an expression, e.g. `player.Character` -> `Character`. */
export function lastSegment(expr: string): string | undefined {
  const m = expr.match(/[.:](\w+)(?:\([^()]*\))?$/);
  return m?.[1];
}

export function rootIdentifier(expr: string): string | undefined {
  return expr.match(new RegExp(`^${ID}`))?.[0];
}

export interface Assignment {
  line: number;
  rhs: string;
  isLocal: boolean;
  kind: "assignment" | "parameter" | "loop" | "function";
  fnName?: string;
}

/**
 * Finds the last place `name` got a value at or before `beforeLine`
 * (1-based). Looks at `local x = ...`, `x = ...`, function parameters and
 * for-loop variables.
 */
export function findAssignment(
  code: string,
  name: string,
  beforeLine?: number,
): Assignment | undefined {
  const raw = splitLines(code);
  const clean = splitLines(sanitizeCode(code));
  // `beforeLine` is the failing line itself; only earlier lines can give the value.
  const limit = beforeLine ? Math.min(beforeLine - 1, clean.length) : clean.length;
  const n = escapeRegExp(name);
  let found: Assignment | undefined;

  for (let i = 0; i < limit; i++) {
    const text = clean[i];
    const single = text.match(
      new RegExp(`^\\s*(local\\s+)?${n}\\s*(?::\\s*[\\w.?<>{}|, ]+)?=(?!=)\\s*(.+)$`),
    );
    if (single) {
      found = {
        line: i + 1,
        rhs: rhsFromRaw(raw[i]) ?? single[2].trim(),
        isLocal: Boolean(single[1]),
        kind: "assignment",
      };
      continue;
    }
    const multi = text.match(
      new RegExp(`^\\s*(local\\s+)?((?:${ID}\\s*,\\s*)*${ID})\\s*=(?!=)\\s*(.+)$`),
    );
    if (
      multi &&
      multi[2]
        .split(",")
        .map((s) => s.trim())
        .includes(name)
    ) {
      found = {
        line: i + 1,
        rhs: rhsFromRaw(raw[i]) ?? multi[3].trim(),
        isLocal: Boolean(multi[1]),
        kind: "assignment",
      };
      continue;
    }
    const bare = text.match(new RegExp(`^\\s*local\\s+${n}\\s*(?::\\s*[\\w.?<>{}|, ]+)?\\s*$`));
    if (bare) {
      found = { line: i + 1, rhs: "nil", isLocal: true, kind: "assignment" };
      continue;
    }
    const fn = text.match(/function\s*([\w.:]*)\s*\(([^)]*)\)/);
    if (
      fn &&
      fn[2]
        .split(",")
        .map((s) => s.replace(/:.*$/, "").trim())
        .includes(name)
    ) {
      found = {
        line: i + 1,
        rhs: raw[i].trim(),
        isLocal: true,
        kind: "parameter",
        fnName: fn[1] || undefined,
      };
      continue;
    }
    const loop = text.match(/^\s*for\s+([\w\s,]+?)\s*(?:=|\bin\b)/);
    if (
      loop &&
      loop[1]
        .split(",")
        .map((s) => s.trim())
        .includes(name)
    ) {
      found = { line: i + 1, rhs: raw[i].trim(), isLocal: true, kind: "loop" };
    }
  }
  return found;
}

function rhsFromRaw(rawLine: string): string | undefined {
  const idx = rawLine.search(/[^=~<>]=(?!=)/);
  if (idx === -1) return undefined;
  return rawLine.slice(idx + 2).trim();
}

/** Names declared anywhere in the snippet: locals, functions, params, loop vars, globals. */
export function declaredNames(code: string): Set<string> {
  const names = new Set<string>();
  const clean = sanitizeCode(code);
  const add = (list: string) =>
    list
      .split(",")
      .map((s) =>
        s
          .replace(/:.*$/, "")
          .replace(/\.\.\./, "")
          .trim(),
      )
      .filter((s) => /^[A-Za-z_]\w*$/.test(s))
      .forEach((s) => names.add(s));

  for (const m of clean.matchAll(/\blocal\s+function\s+([A-Za-z_]\w*)/g)) names.add(m[1]);
  for (const m of clean.matchAll(
    /\blocal\s+((?:[A-Za-z_]\w*(?:\s*:\s*[^,=\n]+)?\s*,\s*)*[A-Za-z_]\w*)/g,
  ))
    add(m[1]);
  for (const m of clean.matchAll(/\bfunction\s*([A-Za-z_]\w*)?[\w.:]*\s*\(([^)]*)\)/g)) {
    if (m[1]) names.add(m[1]);
    add(m[2]);
  }
  for (const m of clean.matchAll(/\bfor\s+([\w\s,]+?)\s*(?:=|\bin\b)/g)) add(m[1]);
  for (const m of clean.matchAll(/^\s*([A-Za-z_]\w*)\s*=(?!=)/gm)) names.add(m[1]);
  return names;
}

export const KNOWN_GLOBALS = new Set([
  "game",
  "workspace",
  "Workspace",
  "script",
  "plugin",
  "shared",
  "_G",
  "_VERSION",
  "print",
  "warn",
  "error",
  "pcall",
  "xpcall",
  "require",
  "typeof",
  "type",
  "tostring",
  "tonumber",
  "pairs",
  "ipairs",
  "next",
  "select",
  "unpack",
  "setmetatable",
  "getmetatable",
  "rawget",
  "rawset",
  "rawequal",
  "rawlen",
  "assert",
  "tick",
  "time",
  "os",
  "math",
  "string",
  "table",
  "task",
  "coroutine",
  "utf8",
  "bit32",
  "debug",
  "buffer",
  "vector",
  "wait",
  "delay",
  "spawn",
  "Instance",
  "Vector3",
  "Vector2",
  "Vector3int16",
  "Vector2int16",
  "CFrame",
  "Color3",
  "BrickColor",
  "UDim",
  "UDim2",
  "Enum",
  "TweenInfo",
  "Ray",
  "RaycastParams",
  "OverlapParams",
  "Random",
  "NumberRange",
  "NumberSequence",
  "NumberSequenceKeypoint",
  "ColorSequence",
  "ColorSequenceKeypoint",
  "Rect",
  "Region3",
  "Region3int16",
  "PhysicalProperties",
  "DateTime",
  "Font",
  "Faces",
  "Axes",
  "PathWaypoint",
  "SharedTable",
  "elapsedTime",
  "gcinfo",
  "collectgarbage",
  "newproxy",
  "settings",
  "UserSettings",
  "version",
  "loadstring",
  "getfenv",
  "setfenv",
  "self",
  "stats",
  "CatalogSearchParams",
  "DockWidgetPluginGuiInfo",
  "nil",
  "true",
  "false",
  "and",
  "or",
  "not",
  "then",
  "end",
  "do",
  "if",
  "else",
  "elseif",
  "while",
  "repeat",
  "until",
  "for",
  "in",
  "function",
  "local",
  "return",
  "break",
  "continue",
  "export",
]);

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Closest candidate by edit distance (case-insensitive first). Returns undefined if nothing is close. */
export function closest(
  target: string,
  candidates: Iterable<string>,
  maxDistance = 2,
): string | undefined {
  let best: string | undefined;
  let bestScore = Infinity;
  const lowered = target.toLowerCase();
  for (const candidate of candidates) {
    if (candidate === target) continue;
    if (candidate.toLowerCase() === lowered) return candidate;
    // Real typos almost never change the first letter; this avoids `frame` -> `CFrame`.
    if (candidate[0]?.toLowerCase() !== lowered[0]) continue;
    const d = levenshtein(lowered, candidate.toLowerCase());
    const limit = Math.min(maxDistance, Math.max(1, Math.floor(target.length / 3)));
    if (d <= limit && d < bestScore) {
      best = candidate;
      bestScore = d;
    }
  }
  return best;
}

/** `plr` -> `player`, `hum` -> `humanoid`: letters of `short` appear in order in `long`. */
export function abbreviationOf(short: string, candidates: Iterable<string>): string | undefined {
  const s = short.toLowerCase();
  if (s.length < 2) return undefined;
  for (const candidate of candidates) {
    const c = candidate.toLowerCase();
    if (c.length <= s.length || c[0] !== s[0]) continue;
    let j = 0;
    for (let i = 0; i < c.length && j < s.length; i++) if (c[i] === s[j]) j++;
    if (j === s.length) return candidate;
  }
  return undefined;
}

/** Guesses the execution side from the code itself. */
export function sideFromCode(code: string): Side {
  const clean = sanitizeCode(code);
  const client =
    /\bLocalPlayer\b|UserInputService|ContextActionService|:FireServer\s*\(|:InvokeServer\s*\(|OnClientEvent|\bPlayerGui\b|CurrentCamera|GetMouse\s*\(/.test(
      clean,
    );
  const server =
    /OnServerEvent|OnServerInvoke|:FireClient\s*\(|:FireAllClients\s*\(|DataStoreService|ServerStorage|ServerScriptService|PlayerAdded|MessagingService/.test(
      clean,
    );
  if (client && !server) return "client";
  if (server && !client) return "server";
  return "unknown";
}

/** true if `name` is used as `name(` or `obj.name(` / `obj:name(` somewhere on the given line. */
export function callsOnLine(
  line: string,
): Array<{ name: string; receiver?: string; method: boolean }> {
  const out: Array<{ name: string; receiver?: string; method: boolean }> = [];
  for (const m of line.matchAll(
    new RegExp(`(?:(${ID}(?:\\.${ID})*)\\s*([.:])\\s*)?(${ID})\\s*\\(`, "g"),
  )) {
    const name = m[3];
    if (
      ["if", "while", "function", "return", "and", "or", "not", "elseif", "until", "in"].includes(
        name,
      )
    )
      continue;
    out.push({ name, receiver: m[1], method: m[2] === ":" });
  }
  return out;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
