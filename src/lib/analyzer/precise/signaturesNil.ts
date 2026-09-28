/**
 * Signatures for Luau's own runtime errors: indexing/calling/doing math on
 * the wrong kind of value.
 */
import {
  callsOnLine,
  closest,
  declaredNames,
  escapeRegExp,
  expressionBefore,
  findAssignment,
  KNOWN_GLOBALS,
  lastSegment,
  ordinal,
  rootIdentifier,
  sanitizeCode,
  splitLines,
} from "./codeTools";
import { docs } from "./docs";
import {
  callArguments,
  cause,
  ev,
  exactLine,
  locateMember,
  locateRegex,
  locationEvidence,
  locationOf,
  q,
  rankCauses,
  result,
} from "./helpers";
import { traceNilExpression, type NilSource } from "./trace";
import type { DiagnoseContext, DiagnosisCause, Signature, SignatureResult } from "./types";

// ---------------------------------------------------------------------------
// attempt to index nil with 'Key'
// ---------------------------------------------------------------------------

const PLAYER_KEYS = new Set([
  "Character",
  "leaderstats",
  "PlayerGui",
  "Backpack",
  "UserId",
  "CharacterAdded",
  "Team",
  "Kick",
  "PlayerScripts",
  "DisplayName",
]);
const CHARACTER_KEYS = new Set([
  "Humanoid",
  "HumanoidRootPart",
  "Head",
  "Torso",
  "UpperTorso",
  "LowerTorso",
  "PrimaryPart",
  "FindFirstChildOfClass",
  "GetPivot",
  "PivotTo",
]);
const REMOTE_KEYS = new Set([
  "FireServer",
  "FireClient",
  "FireAllClients",
  "InvokeServer",
  "InvokeClient",
  "OnServerEvent",
  "OnClientEvent",
  "OnServerInvoke",
  "OnClientInvoke",
]);
const GUI_KEYS = new Set([
  "Text",
  "Visible",
  "Enabled",
  "TextColor3",
  "Image",
  "BackgroundColor3",
  "MouseButton1Click",
  "Activated",
  "TextTransparency",
]);
const PART_KEYS = new Set([
  "Position",
  "CFrame",
  "Size",
  "Anchored",
  "Touched",
  "Transparency",
  "CanCollide",
  "Color",
  "BrickColor",
  "Material",
]);
const DATASTORE_KEYS = new Set([
  "GetAsync",
  "SetAsync",
  "UpdateAsync",
  "RemoveAsync",
  "IncrementAsync",
]);

function keyHints(key: string, ctx: DiagnoseContext): DiagnosisCause[] {
  const server = ctx.side === "server";
  if (PLAYER_KEYS.has(key)) {
    return [
      cause(
        server
          ? "The player variable is nil (LocalPlayer doesn't exist on the server)"
          : "The player variable is nil",
        "likely",
        "On the server Players.LocalPlayer is always nil. In Touched handlers Players:GetPlayerFromCharacter returns nil when something that isn't a player touches the part.",
      ),
      cause("The player left the game before this line ran", "unlikely"),
    ];
  }
  if (CHARACTER_KEYS.has(key)) {
    return [
      cause(
        "The character is nil — it hasn't spawned yet (or the player just died)",
        "likely",
        "player.Character is nil for a moment when a player joins and while they respawn. Use `player.Character or player.CharacterAdded:Wait()`.",
      ),
      cause("You're holding on to an old character from before the player respawned", "possible"),
    ];
  }
  if (key === "Value") {
    return [
      cause(
        "The value object (e.g. leaderstats.Coins) wasn't found",
        "likely",
        "Usually FindFirstChild returned nil because the name is spelled differently or the object is created later by another script.",
      ),
      cause("leaderstats hasn't been created yet when this script runs", "possible"),
    ];
  }
  if (key === "Connect" || key === "Once" || key === "Wait") {
    return [
      cause(
        "The event you're connecting to is nil",
        "likely",
        'Either the object before it is nil, or the event name is misspelled on a table/module (on an Instance a wrong name gives "is not a valid member" instead).',
      ),
    ];
  }
  if (REMOTE_KEYS.has(key)) {
    return [
      cause(
        "The RemoteEvent/RemoteFunction wasn't found",
        "likely",
        'Check the name and location in ReplicatedStorage. On the client, get it with :WaitForChild("Name") so it has time to replicate.',
      ),
      cause(
        "The remote is in ServerStorage/ServerScriptService, which the client can't see",
        "possible",
      ),
    ];
  }
  if (key === "Clone") {
    return [
      cause(
        "The template object you're cloning wasn't found",
        "likely",
        "Check its name/location. Clients can't see ServerStorage — keep client templates in ReplicatedStorage.",
      ),
    ];
  }
  if (DATASTORE_KEYS.has(key)) {
    return [
      cause(
        "The DataStore variable is nil",
        "likely",
        'Create it first: `local store = game:GetService("DataStoreService"):GetDataStore("PlayerData")`.',
      ),
    ];
  }
  if (GUI_KEYS.has(key)) {
    return [
      cause(
        "The GUI object wasn't found",
        "likely",
        'UI is copied into PlayerGui when the character spawns. From a LocalScript use player:WaitForChild("PlayerGui"):WaitForChild("MyGui").',
      ),
      cause(
        "The path points at StarterGui/another frame than where the object really is",
        "possible",
      ),
    ];
  }
  if (PART_KEYS.has(key)) {
    return [
      cause(
        "The part you're using wasn't found",
        "likely",
        "FindFirstChild returned nil or the name differs. With StreamingEnabled, far-away parts may not exist on the client yet.",
      ),
    ];
  }
  if (key === "Instance" || key === "Normal" || key === "Distance") {
    return [
      cause(
        "workspace:Raycast returned nil because the ray hit nothing",
        "likely",
        "Always check `if result then` before reading the raycast result.",
      ),
    ];
  }
  if (key === "Play" || key === "Stop") {
    return [cause("The Sound / AnimationTrack / Tween you're trying to play is nil", "likely")];
  }
  return [
    cause(
      `The value before ${q("." + key)} is nil`,
      "likely",
      "It was never assigned, a lookup (FindFirstChild, a table key, a function return) gave back nil, or the object was destroyed.",
    ),
  ];
}

const INDEX_DOCS = docs(
  ["Instance", "FindFirstChild"],
  ["Instance", "WaitForChild"],
  ["Player", "Character"],
);

function analyzeIndexNil(
  key: string | undefined,
  knownCulprit: string | undefined,
  ctx: DiagnoseContext,
): SignatureResult {
  const evidence = [];
  let located = key ? locateMember(ctx, key) : undefined;
  let culprit = knownCulprit;

  if (!located && knownCulprit) {
    located = locateRegex(ctx, new RegExp(`\\b${escapeRegExp(knownCulprit)}\\s*[.:\\[]`));
  }
  if (located && key && !culprit) {
    const clean = splitLines(sanitizeCode(ctx.code))[located.line - 1] ?? "";
    culprit = expressionBefore(clean, key) ?? expressionBefore(located.text, key);
    if (!culprit) {
      const br = located.text.match(
        new RegExp(
          `([A-Za-z_][\\w.:]*(?:\\([^()]*\\))?)\\s*\\[\\s*["']${escapeRegExp(key)}["']\\s*\\]`,
        ),
      );
      culprit = br?.[1];
    }
  }
  evidence.push(...locationEvidence(located, ctx));

  let traced: NilSource | undefined;
  if (culprit && ctx.hasCode) {
    traced = traceNilExpression(culprit, ctx.code, located?.line, ctx.side, key);
    if (traced) evidence.push(ev(traced.points, traced.reason));
  }

  const causes = rankCauses([
    ...(traced ? [traced.cause] : []),
    ...(key ? keyHints(key, ctx) : []),
  ]);
  const what = culprit ? q(culprit) : "the value";
  const keyText = key ? q(key) : "a field";

  const guardVar = culprit
    ? rootIdentifier(culprit) === culprit
      ? culprit
      : (lastSegment(culprit)?.replace(/^\w/, (c) => c.toLowerCase()) ?? "value")
    : "value";
  const defaultFix = culprit
    ? {
        before: located?.text,
        after:
          rootIdentifier(culprit) === culprit
            ? `if not ${culprit} then\n\twarn("${culprit} is nil")\n\treturn\nend\n${located?.text ?? `${culprit}.${key}`}`
            : `local ${guardVar} = ${culprit}\nif not ${guardVar} then\n\twarn("${culprit} is nil")\n\treturn\nend\n-- then use ${guardVar}.${key ?? "..."}`,
        caption: "Stop early if the value is missing instead of crashing.",
      }
    : undefined;

  return result({
    title: key ? `Tried to use .${key} on nothing (nil)` : "Tried to index nil",
    severity: "High",
    summary: culprit
      ? `${what} is nil, so reading ${keyText} from it fails.`
      : `The object you tried to read ${keyText} from doesn't exist (it's nil).`,
    explanation: `In Luau, nil means "no value". Your code asked for ${keyText} on ${what}, but at that moment ${what} was nil — so there is nothing to read from. Find out why it's nil (see the causes below), then either make sure it exists or check for nil before using it.`,
    location: locationOf(located, culprit),
    causes,
    steps: [
      ...(traced?.step ? [traced.step] : []),
      culprit
        ? `Add \`print(${culprit})\` just above line ${located?.line ?? "?"} to confirm it prints nil.`
        : "Print the object right before the failing line to see which part is nil.",
      "Make sure the object exists before this line runs (WaitForChild, CharacterAdded:Wait, default values).",
      "Guard the access with `if value then ... end` so a missing object can't crash the script.",
    ],
    fixCode: traced?.fix ?? defaultFix,
    docs: INDEX_DOCS,
    evidence,
  });
}

function analyzeIndexWrongType(
  type: string,
  key: string | undefined,
  ctx: DiagnoseContext,
): SignatureResult {
  const located = key ? locateMember(ctx, key) : undefined;
  const evidence = [...locationEvidence(located, ctx)];
  const clean = located ? (splitLines(sanitizeCode(ctx.code))[located.line - 1] ?? "") : "";
  const culprit = key && located ? expressionBefore(clean, key) : undefined;
  const causes: DiagnosisCause[] = [];
  let fix: SignatureResult["fixCode"];

  if (culprit) {
    const root = rootIdentifier(culprit);
    const assignment = root ? findAssignment(ctx.code, root, located?.line) : undefined;
    if (
      assignment?.kind === "assignment" &&
      /\.\s*Value\s*$/.test(assignment.rhs) &&
      (type === "number" || type === "boolean" || type === "string")
    ) {
      causes.push(
        cause(
          `${q(root!)} already holds the ${type} itself (line ${assignment.line} reads .Value)`,
          "likely",
          `Line ${assignment.line} stores ${q(assignment.rhs)} — that's the plain ${type}, not the IntValue/BoolValue object. A ${type} has no ${q(key ?? "fields")}.`,
          true,
        ),
      );
      fix = {
        before: `local ${root} = ${assignment.rhs}`,
        after: `local ${root} = ${assignment.rhs.replace(/\.\s*Value\s*$/, "")} -- keep the object\n-- later: ${root}.Value`,
        caption: "Store the object, and read .Value when you need the number.",
      };
      evidence.push(ev(18, ".Value was read twice"));
    }
  }
  if (type === "function") {
    causes.push(
      cause(
        "You forgot the () to call a function before indexing its result",
        "likely",
        "Example: `player:GetMouse.Hit` should be `player:GetMouse().Hit`.",
        Boolean(culprit),
      ),
    );
  }
  if (type === "number" || type === "boolean") {
    causes.push(
      cause(
        `The variable holds a ${type}, not an object`,
        "likely",
        "Maybe it was overwritten with a number earlier, or .Value was read too early.",
      ),
    );
  }
  if (type === "string") {
    causes.push(
      cause(
        "The variable holds a string (e.g. a name) instead of the object",
        "likely",
        "If you have a name, look the object up: `workspace:FindFirstChild(name)`.",
      ),
    );
  }
  if (causes.length === 0)
    causes.push(cause(`The value is a ${type}, which has no ${q(key ?? "fields")}`, "likely"));

  return result({
    title: `Tried to use .${key ?? "field"} on a ${type}`,
    severity: "High",
    summary: `${culprit ? q(culprit) : "The value"} is a ${type}, and a ${type} has no ${q(key ?? "fields")}.`,
    explanation: `Only tables and Roblox objects have fields you can read with a dot. ${culprit ? q(culprit) : "This value"} turned out to be a ${type}, so ${q("." + (key ?? "field"))} doesn't exist on it.`,
    location: locationOf(located, culprit),
    causes: rankCauses(causes),
    steps: [
      culprit
        ? `Print \`typeof(${culprit})\` before the line to see what it really is.`
        : "Print typeof(value) before the failing line.",
      "Trace back to where the variable was assigned and make it hold the object you meant.",
    ],
    fixCode: fix,
    docs: docs("globals", "Instance"),
    evidence,
  });
}

const indexNil: Signature = {
  id: "index-nil",
  category: "index-nil",
  pattern:
    /attempt to index (nil|number|boolean|string|function|table|userdata|thread|buffer|vector) with (?:'([^']*)'|(\w+))/i,
  base: 56,
  analyze: (m, ctx) => {
    const type = m[1].toLowerCase();
    const key = m[2] ?? undefined;
    return type === "nil"
      ? analyzeIndexNil(key, undefined, ctx)
      : analyzeIndexWrongType(type, key, ctx);
  },
};

const indexNilLegacy: Signature = {
  id: "index-nil-legacy",
  category: "index-nil",
  pattern:
    /attempt to index (?:(?:field|local|global|upvalue) '(\w+)' \(a (nil|number|boolean|string|function) value\)|a (nil|number|boolean|string|function) value(?: \((?:field|local|global|upvalue) '(\w+)'\))?)/i,
  base: 50,
  analyze: (m, ctx) => {
    const name = m[1] ?? m[4];
    const type = (m[2] ?? m[3] ?? "nil").toLowerCase();
    if (type !== "nil") return analyzeIndexWrongType(type, undefined, ctx);
    return analyzeIndexNil(undefined, name, ctx);
  },
};

// ---------------------------------------------------------------------------
// attempt to call a nil value
// ---------------------------------------------------------------------------

const LIBS: Record<string, string[]> = {
  string: [
    "byte",
    "char",
    "find",
    "format",
    "gmatch",
    "gsub",
    "len",
    "lower",
    "match",
    "rep",
    "reverse",
    "sub",
    "upper",
    "split",
    "pack",
    "packsize",
    "unpack",
  ],
  table: [
    "concat",
    "insert",
    "remove",
    "sort",
    "unpack",
    "pack",
    "find",
    "clear",
    "clone",
    "create",
    "freeze",
    "isfrozen",
    "maxn",
    "move",
    "getn",
    "foreach",
    "foreachi",
  ],
  math: [
    "abs",
    "acos",
    "asin",
    "atan",
    "atan2",
    "ceil",
    "clamp",
    "cos",
    "cosh",
    "deg",
    "exp",
    "floor",
    "fmod",
    "frexp",
    "ldexp",
    "log",
    "log10",
    "max",
    "min",
    "modf",
    "noise",
    "pow",
    "rad",
    "random",
    "randomseed",
    "round",
    "sign",
    "sin",
    "sinh",
    "sqrt",
    "tan",
    "tanh",
    "lerp",
    "map",
    "isnan",
    "isinf",
    "isfinite",
  ],
  task: ["spawn", "defer", "delay", "wait", "cancel", "synchronize", "desynchronize"],
  coroutine: ["create", "resume", "running", "status", "wrap", "yield", "isyieldable", "close"],
  os: ["time", "clock", "date", "difftime"],
  utf8: [
    "char",
    "charpattern",
    "codes",
    "codepoint",
    "len",
    "offset",
    "graphemes",
    "nfcnormalize",
    "nfdnormalize",
  ],
};

interface CallFinding {
  cause: DiagnosisCause;
  points: number;
  reason: string;
  fix?: SignatureResult["fixCode"];
  line: number;
  name: string;
}

function inspectCallLine(
  lineIdx: number,
  clean: string[],
  raw: string[],
  ctx: DiagnoseContext,
  declared: Set<string>,
): CallFinding | undefined {
  const line = clean[lineIdx];
  for (const call of callsOnLine(line)) {
    const { name, receiver } = call;
    if (!receiver) {
      if (declared.has(name) || KNOWN_GLOBALS.has(name)) {
        // Declared — but maybe only *below* this line.
        const declIdx = clean.findIndex((l) =>
          new RegExp(
            `^\\s*local\\s+function\\s+${escapeRegExp(name)}\\b|^\\s*local\\s+${escapeRegExp(name)}\\s*=\\s*function\\b`,
          ).test(l),
        );
        if (
          declIdx > lineIdx &&
          !clean
            .slice(0, lineIdx + 1)
            .some((l) =>
              new RegExp(
                `\\b(local\\s+)?${escapeRegExp(name)}\\s*=|function\\s+${escapeRegExp(name)}\\b`,
              ).test(l),
            )
        ) {
          return {
            cause: cause(
              `${q(name + "()")} is called on line ${lineIdx + 1} but only defined on line ${declIdx + 1}`,
              "likely",
              "A `local function` only exists from the line where it's written downwards. When line " +
                (lineIdx + 1) +
                " runs, the name is still nil.",
              true,
            ),
            points: 26,
            reason: "function is used above its local definition",
            fix: {
              after: `-- move this block above line ${lineIdx + 1}:\n${raw[declIdx].trim()}\n\t-- ...\nend`,
              caption: "Define the function before the code that calls it.",
            },
            line: lineIdx + 1,
            name,
          };
        }
        if (name === "loadstring") {
          return {
            cause: cause(
              "loadstring is disabled",
              "likely",
              ctx.side === "client"
                ? "loadstring never works on the client."
                : "On the server it only works when ServerScriptService.LoadStringEnabled is turned on (and it's a security risk).",
              true,
            ),
            points: 22,
            reason: "loadstring call found",
            line: lineIdx + 1,
            name,
          };
        }
        const assignment = findAssignment(ctx.code, name, lineIdx + 1);
        if (assignment?.kind === "assignment" && !/function\b/.test(assignment.rhs)) {
          const traced = traceNilExpression(name, ctx.code, lineIdx + 1, ctx.side);
          if (traced) {
            return { ...traced, line: lineIdx + 1, name, points: traced.points - 4 };
          }
        }
        continue;
      }
      const suggestion = closest(name, declared) ?? closest(name, KNOWN_GLOBALS);
      return {
        cause: suggestion
          ? cause(
              `${q(name)} doesn't exist — did you mean ${q(suggestion)}?`,
              "likely",
              "Luau is case-sensitive: `Print`, `print` and `pritn` are three different names, and only `print` exists.",
              true,
            )
          : cause(
              `${q(name)} is never defined in this snippet`,
              "possible",
              "If it lives in another script, move it into a ModuleScript and require it — locals don't cross scripts.",
              true,
            ),
        points: suggestion ? 24 : 8,
        reason: suggestion
          ? `undefined function name close to \`${suggestion}\``
          : "called function isn't defined in the snippet",
        fix: suggestion
          ? {
              before: raw[lineIdx].trim(),
              after: raw[lineIdx]
                .trim()
                .replace(new RegExp(`\\b${escapeRegExp(name)}\\b`), suggestion),
            }
          : undefined,
        line: lineIdx + 1,
        name,
      };
    }

    const lib = LIBS[receiver];
    if (lib && !lib.includes(name)) {
      const suggestion = closest(name, lib);
      const special =
        receiver === "string" && name === "trim"
          ? ' Luau has no string.trim — use `s:match("^%s*(.-)%s*$")`.'
          : "";
      return {
        cause: cause(
          `${q(`${receiver}.${name}`)} doesn't exist${suggestion ? ` — did you mean ${q(`${receiver}.${suggestion}`)}?` : ""}`,
          "likely",
          `The ${receiver} library has no function called ${q(name)}.${special}`,
          true,
        ),
        points: 24,
        reason: `\`${receiver}.${name}\` is not part of the ${receiver} library`,
        fix: suggestion
          ? {
              before: raw[lineIdx].trim(),
              after: raw[lineIdx]
                .trim()
                .replace(
                  new RegExp(`${receiver}\\s*\\.\\s*${escapeRegExp(name)}`),
                  `${receiver}.${suggestion}`,
                ),
            }
          : undefined,
        line: lineIdx + 1,
        name: `${receiver}.${name}`,
      };
    }

    const recvRoot = rootIdentifier(receiver);
    if (recvRoot) {
      const assignment = findAssignment(ctx.code, recvRoot, lineIdx + 1);
      if (assignment?.kind === "assignment" && /^\s*require\s*\(/.test(assignment.rhs)) {
        return {
          cause: cause(
            `The module ${q(recvRoot)} has no function called ${q(name)}`,
            "likely",
            `Open the ModuleScript and check that it defines \`function ${recvRoot === "self" ? "Module" : "Module"}.${name}(...)\` (same spelling and case) and that it's on the returned table — a \`local function ${name}\` inside the module isn't exported.`,
            true,
          ),
          points: 16,
          reason: "function is called on a required module",
          line: lineIdx + 1,
          name: `${receiver}.${name}`,
        };
      }
    }
  }
  return undefined;
}

function analyzeCallNil(
  named: string | undefined,
  ctx: DiagnoseContext,
  valueType = "nil",
): SignatureResult {
  const evidence = [];
  const raw = splitLines(ctx.code);
  const clean = splitLines(sanitizeCode(ctx.code));
  const declared = declaredNames(ctx.code);
  let finding: CallFinding | undefined;
  let located = named
    ? locateRegex(ctx, new RegExp(`[.:]?\\b${escapeRegExp(named)}\\s*\\(`))
    : undefined;

  if (ctx.hasCode && valueType === "nil") {
    const exact = exactLine(ctx);
    const order: number[] = [];
    if (located) order.push(located.line - 1);
    if (exact) order.push(exact.line - 1);
    for (let i = 0; i < clean.length; i++) if (!order.includes(i)) order.push(i);
    for (const idx of order) {
      finding = inspectCallLine(idx, clean, raw, ctx, declared);
      if (finding) break;
    }
    if (finding && (!located || located.line !== finding.line)) {
      located = {
        line: finding.line,
        text: raw[finding.line - 1].trim(),
        exact: ctx.log.line === finding.line,
      };
    }
  }
  if (!located && exactLine(ctx)) {
    const e = exactLine(ctx)!;
    if (/\(/.test(e.clean)) located = { line: e.line, text: e.text, exact: true };
  }
  evidence.push(...locationEvidence(located, ctx));
  if (finding) evidence.push(ev(finding.points, finding.reason));

  if (valueType !== "nil") {
    const kind =
      valueType === "table"
        ? "a table"
        : valueType === "Instance" || valueType === "userdata"
          ? "a Roblox object"
          : `a ${valueType}`;
    return result({
      title: `Tried to call ${kind} like a function`,
      severity: "High",
      summary: `Something that is ${kind} was used with () as if it were a function.`,
      explanation:
        valueType === "table"
          ? "You wrote `name(...)` but `name` is a table. Usually you meant a function inside it, like `Module.doThing()`, or a ModuleScript returned a table instead of a function."
          : valueType === "Instance" || valueType === "userdata"
            ? "You put () after a Roblox object, e.g. `script.Parent()` or `game.Players.LocalPlayer()`. Objects aren't functions — call one of their methods with `:` instead."
            : `A ${valueType} value was followed by (). Check that you didn't overwrite a function variable with a ${valueType}.`,
      location: locationOf(located),
      causes: [
        cause(
          `The name you're calling holds ${kind}`,
          "likely",
          "Look for a variable with the same name that gets reassigned, or a module that returns a table.",
        ),
      ],
      steps: [
        "Print `typeof(x)` for the thing you're calling.",
        "Call the function inside it (`Module.fn()`), or remove the extra ().",
      ],
      docs: docs("globals", "ModuleScript"),
      evidence,
    });
  }

  const causes = rankCauses([
    ...(finding ? [finding.cause] : []),
    ...(named
      ? [
          cause(
            `${q(named)} is misspelled or doesn't exist on that object/table`,
            "likely",
            "Names are case-sensitive. Check the exact spelling where it's defined.",
          ),
        ]
      : []),
    cause(
      "The function is defined below the line that calls it (local functions don't exist yet above their definition)",
      "possible",
    ),
    cause(
      "A ModuleScript doesn't export that function (it's local inside the module, or has a different name)",
      "possible",
    ),
    cause("A variable holding the function was overwritten with nil", "unlikely"),
  ]);

  const fnName = finding?.name ?? named;
  return result({
    title: fnName ? `${fnName}() doesn't exist (nil)` : "Called something that doesn't exist (nil)",
    severity: "High",
    summary: fnName
      ? `You called ${q(fnName + "()")}, but at that moment it was nil — not a function.`
      : "You called a function that is nil at that moment.",
    explanation:
      "Calling means putting () after a name. Luau looked the name up, found nothing (nil), and nil can't be run. The usual reasons are a typo, a function that's defined further down, or a module that doesn't export the function.",
    location: locationOf(located, finding?.name),
    causes,
    steps: [
      fnName
        ? `Search your code for where ${q(fnName)} is defined and compare the spelling letter by letter.`
        : "Find which call on the failing line is nil (print each part).",
      "If it's a `local function`, make sure it's written above the code that calls it.",
      "If it comes from a ModuleScript, make sure it's `function Module.name()` and the module ends with `return Module`.",
    ],
    fixCode: finding?.fix,
    docs: docs("globals", "ModuleScript"),
    evidence,
  });
}

const callNil: Signature = {
  id: "call-nil",
  category: "call-nil",
  pattern:
    /attempt to call (?:a |an )?(nil|table|number|string|boolean|Instance|userdata) value(?: \((?:method|field|global|local|upvalue) '(\w+)'\))?/i,
  base: 50,
  analyze: (m, ctx) =>
    analyzeCallNil(m[2], ctx, m[1].toLowerCase() === "instance" ? "Instance" : m[1].toLowerCase()),
};

const callMissingMethod: Signature = {
  id: "call-missing-method",
  category: "call-nil",
  pattern: /attempt to call missing method '(\w+)' of (\w+)/i,
  base: 58,
  analyze: (m, ctx) => {
    const r = analyzeCallNil(m[1], ctx);
    return {
      ...r,
      title: `Method :${m[1]}() doesn't exist`,
      summary: `You called ${q(":" + m[1] + "()")} on a ${m[2]}, but that ${m[2]} has no ${q(m[1])} function.`,
      causes: rankCauses([
        cause(
          `${q(m[1])} is misspelled, or it was never added to that ${m[2]}`,
          "likely",
          "For class-style tables, make sure the method is defined as `function Class:" +
            m[1] +
            "()` and the object has `setmetatable(obj, Class)` with `Class.__index = Class`.",
          false,
        ),
        ...r.causes,
      ]),
    };
  },
};

// ---------------------------------------------------------------------------
// Arithmetic / concatenation / comparison on the wrong type
// ---------------------------------------------------------------------------

const an = (t: string) => `${/^[AEIOU]/i.test(t) ? "an" : "a"} ${t}`;

const OP_SYMBOL: Record<string, string> = {
  add: "+",
  sub: "-",
  mul: "*",
  div: "/",
  mod: "%",
  pow: "^",
  unm: "-",
  idiv: "//",
};

function operandsAround(line: string, symbol: string): string[] {
  const s = escapeRegExp(symbol);
  const operand =
    "([A-Za-z_][\\w]*(?:\\s*(?:\\.\\s*[A-Za-z_]\\w*|:\\s*\\w+\\s*\\([^()]*\\)|\\[[^\\]]+\\]|\\([^()]*\\)))*)";
  const out: string[] = [];
  for (const m of line.matchAll(new RegExp(`${operand}\\s*${s}=?\\s*`, "g")))
    out.push(m[1].replace(/\s+/g, ""));
  for (const m of line.matchAll(new RegExp(`${s}=?\\s*${operand}`, "g")))
    out.push(m[1].replace(/\s+/g, ""));
  return [...new Set(out)].filter((o) => !KNOWN_GLOBALS.has(o) || o === "self");
}

const VALUE_OBJECT_SOURCE =
  /leaderstats\s*[.:]|:\s*(WaitForChild|FindFirstChild)\s*\(\s*["'](Coins|Cash|Money|Gems|Points|Kills|Wins|Level|XP|Exp|Strength|Stage|Deaths|Score|Diamonds|Gold)["']|Instance\.new\s*\(\s*["'](Int|Number|String|Bool)Value["']/i;

function traceOperands(
  operands: string[],
  ctx: DiagnoseContext,
  line: number,
  wanted: string,
  lineText = "",
): NilSource | undefined {
  for (const operand of operands) {
    if (wanted === "Instance") {
      const root = rootIdentifier(operand);
      const assignment = root === operand ? findAssignment(ctx.code, operand, line) : undefined;
      const direct =
        /\.\s*(Coins|Cash|Money|Gems|Points|Kills|Wins|Level|XP|Exp|Strength|Stage|Score)$/i.test(
          operand,
        ) && /leaderstats/i.test(operand);
      if (
        direct ||
        (assignment &&
          VALUE_OBJECT_SOURCE.test(assignment.rhs) &&
          !/\.\s*Value\s*$/.test(assignment.rhs))
      ) {
        return {
          cause: cause(
            `${q(operand)} is an IntValue/NumberValue object — you forgot ${q(".Value")}`,
            "likely",
            `${assignment ? `Line ${assignment.line} stores the value object itself. ` : ""}Math works on numbers, so use ${q(operand + ".Value")}.`,
            true,
          ),
          fix: {
            before: lineText,
            after: lineText.replace(
              new RegExp(`\\b${escapeRegExp(operand)}\\b(?!\\s*\\.\\s*Value)`, "g"),
              `${operand}.Value`,
            ),
            caption: `Use ${operand}.Value wherever you do math or comparisons with it.`,
          },
          points: 22,
          reason: "operand is a value object without .Value",
        };
      }
      continue;
    }
    if (wanted === "nil") {
      const traced = traceNilExpression(operand, ctx.code, line, ctx.side);
      if (traced) return traced;
    }
    if (wanted === "string") {
      const root = rootIdentifier(operand) ?? operand;
      const assignment = findAssignment(ctx.code, root, line);
      if (/\.Text$/.test(operand) || (assignment && /\.Text\s*$/.test(assignment.rhs))) {
        return {
          cause: cause(
            `${q(operand)} is text from a TextBox/TextLabel`,
            "likely",
            "`.Text` is always a string. Convert it with tonumber() and handle the case where the player typed something that isn't a number.",
            true,
          ),
          fix: {
            after: `local amount = tonumber(${assignment ? root : operand})\nif not amount then\n\treturn -- not a number\nend`,
          },
          points: 18,
          reason: "operand comes from .Text",
        };
      }
    }
  }
  return undefined;
}

function typeMathAdvice(t: string, op: string): DiagnosisCause[] {
  switch (t) {
    case "nil":
      return [
        cause(
          "One of the values is nil — a variable that was never set, a missing table key, or GetAttribute/GetAsync returning nil",
          "likely",
          "Give it a default: `local coins = data.Coins or 0`.",
        ),
      ];
    case "Instance":
      return [
        cause(
          "You used an object instead of its number — usually a missing `.Value` (e.g. `coins.Value + 1`)",
          "likely",
        ),
      ];
    case "string":
      return [
        cause(
          "One side is text that isn't a number (like TextBox.Text)",
          "likely",
          "Convert with tonumber(text) first. Luau only auto-converts strings that look exactly like numbers.",
        ),
      ];
    case "table":
      return [
        cause(
          "One side is a table — you probably meant one of its fields (e.g. `data.Coins`)",
          "likely",
        ),
      ];
    case "boolean":
      return [cause("One side is true/false, not a number", "likely")];
    case "Vector3":
    case "Vector2":
      return [
        cause(
          `You can't ${op === "add" || op === "sub" ? "add/subtract" : "combine"} a ${t} and a plain number`,
          "likely",
          `Build a ${t} first, e.g. \`pos + Vector3.new(0, 5, 0)\`. Multiplying/dividing by a number is fine.`,
        ),
      ];
    case "UDim2":
      return [
        cause(
          "UDim2 can't be combined with a plain number",
          "likely",
          "Use UDim2.fromScale / UDim2.fromOffset to build the amount you want to add.",
        ),
      ];
    case "CFrame":
      return [
        cause(
          "CFrame math only works with Vector3 (+/-) or another CFrame (*)",
          "likely",
          "E.g. `cf * CFrame.new(0, 5, 0)` or `cf + Vector3.new(0, 5, 0)`.",
        ),
      ];
    default:
      return [cause(`One side is a ${t}, which doesn't support this operation`, "likely")];
  }
}

const arithmetic: Signature = {
  id: "arithmetic",
  category: "arithmetic",
  pattern:
    /attempt to perform arithmetic(?: \((\w+)\))? on (?:a )?(\w+)(?: value)?(?: and (\w+))?(?: \((?:field|local|global|upvalue) '(\w+)'\))?/i,
  base: 54,
  analyze: (m, ctx) => {
    const op = (m[1] ?? "add").toLowerCase();
    const left = m[2];
    const right = m[3];
    const named = m[4];
    const types = [left, right].filter(Boolean) as string[];
    const bad = types.find((t) => t !== "number") ?? left;
    const symbol = OP_SYMBOL[op] ?? "+";
    const located = named
      ? locateRegex(ctx, new RegExp(`\\b${escapeRegExp(named)}\\b`))
      : locateRegex(
          ctx,
          new RegExp(
            `[\\w)\\]]\\s*${escapeRegExp(symbol)}=?\\s*[\\w(]|${escapeRegExp(symbol)}\\s*[\\w(]`,
          ),
        );
    const evidence = [...locationEvidence(located, ctx)];
    let traced: NilSource | undefined;
    if (located) {
      const clean = splitLines(sanitizeCode(ctx.code))[located.line - 1] ?? "";
      const operands = named ? [named] : operandsAround(clean, symbol);
      traced = traceOperands(
        operands,
        ctx,
        located.line,
        bad === "userdata" ? "Instance" : bad,
        located.text,
      );
      if (traced) evidence.push(ev(traced.points, traced.reason));
    }
    const opWord: Record<string, string> = {
      add: "add",
      sub: "subtract",
      mul: "multiply",
      div: "divide",
      mod: "take the remainder of",
      pow: "raise",
      unm: "negate",
      idiv: "divide",
    };
    return result({
      title: `Math on ${bad === "nil" ? "nil" : `${/^[AEIOU]/.test(bad) ? "an" : "a"} ${bad}`}`,
      severity: "Medium",
      summary: `The code tried to ${opWord[op] ?? "do math with"} ${types.length === 2 ? `${an(left)} and ${an(right!)}` : an(bad)}, but math only works on numbers${bad === "Vector3" ? " (or matching vector types)" : ""}.`,
      explanation: `The ${q(symbol)} operator needs numbers on both sides. Here one side was ${bad === "nil" ? "nil (no value)" : an(bad)}. Find which variable that is and turn it into a real number first.`,
      location: locationOf(located),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        ...typeMathAdvice(bad === "userdata" ? "Instance" : bad, op),
      ]),
      steps: [
        "Print each value used on that line to see which one isn't a number.",
        bad === "nil"
          ? "Give missing values a default with `or 0`."
          : bad === "string"
            ? "Wrap text in tonumber(...)."
            : bad === "Instance"
              ? "Add .Value to IntValue/NumberValue objects."
              : "Convert the value to the right type before the math.",
      ],
      fixCode: traced?.fix,
      docs:
        bad === "Vector3"
          ? docs("Vector3")
          : bad === "CFrame"
            ? docs("CFrame")
            : bad === "UDim2"
              ? docs("UDim2")
              : docs("globals"),
      evidence,
    });
  },
};

const concatenate: Signature = {
  id: "concatenate",
  category: "concatenate",
  pattern:
    /attempt to concatenate (?:(\w+) with (\w+)|(?:a )?(\w+) value(?: \((?:field|local|global|upvalue) '(\w+)'\))?)/i,
  base: 54,
  analyze: (m, ctx) => {
    const types = [m[1], m[2], m[3]].filter(Boolean) as string[];
    const bad = types.find((t) => t !== "string" && t !== "number") ?? "nil";
    const named = m[4];
    const located = named
      ? locateRegex(
          ctx,
          new RegExp(
            `\\b${escapeRegExp(named)}\\b[^\\n]*\\.\\.|\\.\\.[^\\n]*\\b${escapeRegExp(named)}\\b`,
          ),
        )
      : locateRegex(ctx, /\.\.(?!\.)/);
    const evidence = [...locationEvidence(located, ctx)];
    let traced: NilSource | undefined;
    let culprit: string | undefined;
    if (located) {
      const clean = splitLines(sanitizeCode(ctx.code))[located.line - 1] ?? "";
      const operands = named ? [named] : operandsAround(clean, "..");
      if (bad === "nil") {
        traced = traceOperands(operands, ctx, located.line, "nil");
      } else if (bad === "Instance" || bad === "userdata") {
        culprit = operands.find(
          (o) =>
            /player|plr|part|hit|char|model|tool|obj|instance|parent|gui/i.test(o) &&
            !/\.(Name|Text|Value|DisplayName)$/.test(o),
        );
        if (culprit) {
          traced = {
            cause: cause(
              `${q(culprit)} is a Roblox object — join its ${q(".Name")} instead`,
              "likely",
              "You can't glue an object into text. Use `obj.Name` (or `player.DisplayName`).",
              true,
            ),
            fix: {
              before: located.text,
              after: located.text.replace(
                new RegExp(`\\b${escapeRegExp(culprit)}\\b(?!\\s*\\.)`),
                `${culprit}.Name`,
              ),
            },
            points: 16,
            reason: "object joined into a string",
          };
        }
      }
      if (traced) evidence.push(ev(traced.points, traced.reason));
    }
    const fixes: Record<string, string> = {
      nil: 'wrap it: tostring(value) — or give a default: (value or "")',
      Instance: "use obj.Name",
      userdata: "use obj.Name",
      table: 'use table.concat(list, ", ") to join a list',
      boolean: "use tostring(flag)",
    };
    return result({
      title: `Tried to join ${bad === "nil" ? "nil" : an(bad)} into text`,
      severity: "Medium",
      summary: `The \`..\` operator only joins strings and numbers, but one side was ${bad === "nil" ? "nil" : an(bad)}.`,
      explanation: `\`..\` glues text together, e.g. \`"Hi " .. player.Name\`. One of the pieces was ${bad === "nil" ? "nil (it has no value)" : an(bad)}, which can't be turned into text automatically. Fix: ${fixes[bad] ?? "convert it with tostring()"}.`,
      location: locationOf(located, culprit),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        bad === "nil"
          ? cause(
              "A variable in the message is nil (not set, or a lookup failed)",
              "likely",
              'Print each piece or use tostring(x), which turns nil into the text "nil" instead of crashing.',
            )
          : cause(
              `A ${bad} was used directly in the text`,
              "likely",
              `Convert it: ${fixes[bad] ?? "tostring(x)"}.`,
            ),
      ]),
      steps: [
        "Wrap each non-text piece in tostring(...) while debugging.",
        "For objects use .Name; for lists use table.concat.",
      ],
      fixCode:
        traced?.fix ??
        (located
          ? {
              before: located.text,
              after: located.text.replace(
                /\.\.\s*([A-Za-z_][\w.]*)(?!\s*\()/,
                (_, v) => `.. tostring(${v})`,
              ),
            }
          : undefined),
      docs: docs("string", "globals"),
      evidence,
    });
  },
};

const compare: Signature = {
  id: "compare",
  category: "compare",
  pattern: /attempt to compare (?:(\w+) (<=|<|>=|>) (\w+)|(\w+) with (\w+)|two (\w+) values)/i,
  base: 52,
  analyze: (m, ctx) => {
    const a = m[1] ?? m[4] ?? m[6];
    const b = m[3] ?? m[5] ?? m[6];
    const bad = [a, b].find((t) => t !== "number") ?? a;
    const located = locateRegex(ctx, /[<>]=?/);
    const evidence = [...locationEvidence(located, ctx)];
    let traced: NilSource | undefined;
    if (located) {
      const clean = splitLines(sanitizeCode(ctx.code))[located.line - 1] ?? "";
      const operands = [...operandsAround(clean, "<"), ...operandsAround(clean, ">")];
      traced = traceOperands(
        operands,
        ctx,
        located.line,
        bad === "userdata" ? "Instance" : bad,
        located.text,
      );
      if (traced) evidence.push(ev(traced.points, traced.reason));
    }
    return result({
      title: `Compared ${a} with ${b}`,
      severity: "Medium",
      summary: `<, >, <= and >= need two numbers (or two strings), but this compared a ${a} with a ${b}.`,
      explanation: `Luau can't tell whether ${a === "nil" || b === "nil" ? "nothing (nil)" : an(bad)} is bigger or smaller than a number. Make sure both sides are numbers before comparing.`,
      location: locationOf(located),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        ...(bad === "string"
          ? [
              cause(
                "One side is text (e.g. TextBox.Text or an attribute string)",
                "likely",
                "Use tonumber(text).",
              ),
            ]
          : bad === "Instance" || bad === "userdata"
            ? [
                cause(
                  "One side is an IntValue object — add .Value",
                  "likely",
                  "e.g. `if coins.Value >= 100 then`.",
                ),
              ]
            : typeMathAdvice(bad, "compare")),
      ]),
      steps: [
        "Print both sides of the comparison.",
        "Use `or 0` for values that can be missing, tonumber() for text, .Value for value objects.",
      ],
      fixCode: traced?.fix,
      docs: docs("globals"),
      evidence,
    });
  },
};

// ---------------------------------------------------------------------------
// Iteration, table keys, for-loops
// ---------------------------------------------------------------------------

const iterateNil: Signature = {
  id: "iterate-nil",
  category: "table",
  pattern: /attempt to iterate over (?:a )?(\w+) value/i,
  base: 56,
  analyze: (m, ctx) => {
    const located = locateRegex(ctx, /\bfor\b.*\bin\b/);
    const evidence = [...locationEvidence(located, ctx)];
    let culprit: string | undefined;
    let traced: NilSource | undefined;
    if (located) {
      const inner = located.text.match(
        /\bin\s+(?:i?pairs\s*\(\s*)?([A-Za-z_][\w.:]*(?:\([^()]*\))?)/,
      );
      culprit = inner?.[1];
      if (culprit) traced = traceNilExpression(culprit, ctx.code, located.line, ctx.side);
      if (traced) evidence.push(ev(traced.points, traced.reason));
    }
    return result({
      title: `Looped over ${m[1]}`,
      severity: "Medium",
      summary: `The for-loop expected a table to go through, but ${culprit ? q(culprit) : "the value"} was ${m[1]}.`,
      explanation:
        "`for _, item in list do` needs `list` to be a table (like the result of :GetChildren()). It was missing, so there's nothing to loop over.",
      location: locationOf(located, culprit),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        cause("The list was never created or a function returned nil instead of a table", "likely"),
      ]),
      steps: [
        "Print the value before the loop.",
        `Use a fallback: \`for _, item in (${culprit ?? "list"} or {}) do\`.`,
      ],
      fixCode: culprit
        ? { before: located?.text, after: `for _, item in (${culprit} or {}) do` }
        : undefined,
      docs: docs("table"),
      evidence,
    });
  },
};

const tableIndexNil: Signature = {
  id: "table-index-nil",
  category: "table",
  pattern: /table index is (nil|NaN)/i,
  base: 56,
  analyze: (m, ctx) => {
    const located = locateRegex(ctx, /\[[^\]]+\]\s*=[^=]|\{\s*\[[^\]]+\]\s*=/);
    const evidence = [...locationEvidence(located, ctx)];
    const key = located?.text.match(/\[([^\]]+)\]\s*=[^=]/)?.[1]?.trim();
    const traced =
      key && /^[A-Za-z_]\w*$/.test(key)
        ? traceNilExpression(key, ctx.code, located?.line, ctx.side)
        : undefined;
    if (traced) evidence.push(ev(traced.points, traced.reason));
    const nan = m[1].toLowerCase() === "nan";
    return result({
      title: nan ? "Used NaN as a table key" : "Used nil as a table key",
      severity: "Medium",
      summary: nan
        ? "You stored something under a key that is NaN (the result of 0/0)."
        : `You stored something in a table under ${key ? q(key) : "a key"}, but that key was nil.`,
      explanation: nan
        ? "NaN (not-a-number) comes from maths like 0/0. It can't be a table key. Guard the division."
        : "Every table entry needs a key. `t[nil] = value` isn't allowed, so the variable you used as the key must have been nil.",
      location: locationOf(located, key),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        cause(
          "The key variable is nil (e.g. player.UserId on a nil player, or a missing name)",
          "likely",
        ),
      ]),
      steps: [
        key ? `Print ${q(key)} right before that line.` : "Print the key before the assignment.",
        "Skip the assignment when the key is missing: `if key == nil then return end`.",
      ],
      fixCode: key ? { after: `if ${key} ~= nil then\n\t${located?.text}\nend` } : undefined,
      docs: docs("table"),
      evidence,
    });
  },
};

const forLoop: Signature = {
  id: "for-loop",
  category: "table",
  pattern: /invalid 'for' (initial value|limit|step) \((\w+) expected, got (\w+)\)/i,
  base: 56,
  analyze: (m, ctx) => {
    const located = locateRegex(ctx, /\bfor\s+\w+\s*=/);
    const evidence = [...locationEvidence(located, ctx)];
    const parts = located?.text.match(/for\s+\w+\s*=\s*(.+?)\s*,\s*(.+?)(?:\s*,\s*(.+?))?\s+do\b/);
    const idx = m[1] === "initial value" ? 1 : m[1] === "limit" ? 2 : 3;
    const culprit = parts?.[idx];
    const traced =
      culprit && /^[A-Za-z_][\w.]*$/.test(culprit)
        ? traceNilExpression(culprit, ctx.code, located?.line, ctx.side)
        : undefined;
    if (traced) evidence.push(ev(traced.points, traced.reason));
    return result({
      title: `for-loop ${m[1]} is ${m[3]}`,
      severity: "Medium",
      summary: `The ${m[1]} of a numeric for-loop must be a number, but it was ${m[3]}${culprit ? ` (${q(culprit)})` : ""}.`,
      explanation: "In `for i = start, finish, step do`, all three parts must be numbers.",
      location: locationOf(located, culprit),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        cause(
          m[3] === "string"
            ? "The value is text — convert it with tonumber()"
            : "The value was never set",
          "likely",
        ),
      ]),
      steps: [
        "Print the loop bounds before the loop.",
        "Convert with tonumber() or give a default with `or 0`.",
      ],
      docs: docs("globals"),
      evidence,
    });
  },
};

// ---------------------------------------------------------------------------
// invalid argument #n to 'fn'
// ---------------------------------------------------------------------------

function analyzeInvalidArgument(
  n: number,
  fn: string,
  expected: string | undefined,
  got: string | undefined,
  extra: string | undefined,
  ctx: DiagnoseContext,
): SignatureResult {
  const fnRe = new RegExp(`(?:^|[^\\w])${escapeRegExp(fn)}\\s*\\(`);
  const located = locateRegex(ctx, fnRe);
  const evidence = [...locationEvidence(located, ctx)];
  let arg: string | undefined;
  let traced: NilSource | undefined;
  if (located) {
    const call = callArguments(located.text, new RegExp(`${escapeRegExp(fn)}\\s*\\(`));
    if (call) {
      const index =
        call.method && /^(sub|find|match|gsub|lower|upper|len|rep|split|format|byte)$/.test(fn)
          ? n - 2
          : n - 1;
      arg = index >= 0 ? call.args[index] : undefined;
      if (arg === undefined && index >= 0)
        evidence.push(ev(8, `the call on line ${located.line} passes fewer than ${n} arguments`));
    }
    if (arg && got === "nil" && /^[A-Za-z_][\w.:]*(\([^()]*\))?$/.test(arg)) {
      traced = traceNilExpression(arg, ctx.code, located.line, ctx.side);
    }
    if (traced) evidence.push(ev(traced.points, traced.reason));
  }

  const specific: DiagnosisCause[] = [];
  if (fn === "random" && extra && /interval is empty/i.test(extra)) {
    specific.push(
      cause(
        "math.random(min, max) was called with min bigger than max",
        "likely",
        "e.g. math.random(10, 1). Swap them, or check the numbers you compute.",
        Boolean(located),
      ),
    );
  }
  if ((fn === "ipairs" || fn === "pairs") && got === "nil") {
    specific.push(
      cause(
        "The table you're looping over is nil",
        "likely",
        "Maybe a function returned nothing or a data table is missing a field.",
      ),
    );
  }
  if (fn === "new" && got === "string") {
    specific.push(
      cause("A number was given as text (e.g. from a TextBox)", "likely", "Wrap it in tonumber()."),
    );
  }
  if (fn === "insert" && got === "nil") {
    specific.push(
      cause(
        "The table you're inserting into doesn't exist yet",
        "likely",
        "Create it first: `list = list or {}`.",
      ),
    );
  }
  if (got === "Instance" && expected === "string") {
    specific.push(
      cause("You passed an object where a name/text is needed — use obj.Name", "likely"),
    );
  }

  const argText = arg ? ` (${q(arg)})` : "";
  return result({
    title: `Wrong value passed to ${fn}()`,
    severity: "Medium",
    summary:
      extra && !expected
        ? `${fn}() rejected its ${ordinal(n)} argument: ${extra}.`
        : `The ${ordinal(n)} value you gave to ${q(fn + "()")}${argText} should be a ${expected ?? "different type"}, but it was ${got ? (got === "nil" ? "nil (missing)" : an(got)) : "missing"}.`,
    explanation: `Functions check what you pass in. ${q(fn)} needs a ${expected ?? "valid value"} as argument #${n}. Look at what you're passing and convert or check it before the call.`,
    location: locationOf(located, arg),
    causes: rankCauses([
      ...(traced ? [traced.cause] : []),
      ...specific,
      cause(
        got === "nil"
          ? "The variable you passed is nil (not set yet, or a lookup failed)"
          : `You passed a ${got ?? "wrong value"} instead of a ${expected ?? "valid value"}`,
        "possible",
      ),
    ]),
    steps: [
      arg
        ? `Print ${q(arg)} and \`typeof(${arg})\` right before the call.`
        : "Print the arguments right before the call.",
      "Convert or validate the value (tonumber, tostring, `or default`).",
    ],
    fixCode: traced?.fix,
    docs:
      fn === "new"
        ? docs("Vector3", "CFrame", "UDim2")
        : docs(
            ["random", "floor", "clamp"].includes(fn)
              ? "math"
              : ["insert", "remove", "concat", "sort", "find"].includes(fn)
                ? "table"
                : ["sub", "format", "split", "find", "match", "gsub"].includes(fn)
                  ? "string"
                  : "globals",
          ),
    evidence,
  });
}

const invalidArgument: Signature = {
  id: "invalid-argument",
  category: "invalid-argument",
  pattern:
    /(?:invalid|bad) argument #(\d+) to '([^']+)' \((?:(.+?) expected, got ([^)]+)|([^)]+))\)/i,
  base: 56,
  analyze: (m, ctx) => analyzeInvalidArgument(Number(m[1]), m[2], m[3], m[4], m[5], ctx),
};

const missingArgument: Signature = {
  id: "missing-argument",
  category: "invalid-argument",
  pattern: /missing argument #(\d+) to '([^']+)'(?: \((.+?) expected\))?/i,
  base: 56,
  analyze: (m, ctx) => analyzeInvalidArgument(Number(m[1]), m[2], m[3], "nil", undefined, ctx),
};

const ROBLOX_ARG_METHODS =
  /:(WaitForChild|FindFirstChild|FindFirstChildOfClass|GetService|FireClient|SetAsync|GetAsync|UpdateAsync|Create|GetPlayerByUserId|GetPlayerFromCharacter|LoadAnimation|PivotTo|MoveTo|TakeDamage|IsA|SetAttribute|GetAttribute|Connect|AddItem|GetDataStore|Kick|Clone|IsDescendantOf|SetPrimaryPartCFrame)\s*\(/;

const argumentMissingOrNil: Signature = {
  id: "argument-missing",
  category: "invalid-argument",
  pattern: /Argument (\d+) missing or nil/i,
  base: 48,
  analyze: (m, ctx) => {
    const n = Number(m[1]);
    const exact = exactLine(ctx);
    const located = exact && /\(/.test(exact.clean) ? exact : locateRegex(ctx, ROBLOX_ARG_METHODS);
    const evidence = [...locationEvidence(located, ctx)];
    let method: string | undefined;
    let arg: string | undefined;
    let traced: NilSource | undefined;
    if (located) {
      const mm = located.text.match(ROBLOX_ARG_METHODS);
      method = mm?.[1];
      if (method) {
        const call = callArguments(located.text, new RegExp(`:${method}\\s*\\(`));
        arg = call?.args[n - 1];
        if (!arg) evidence.push(ev(10, `${method}() is called with fewer than ${n} argument(s)`));
        else if (/^[A-Za-z_][\w.]*$/.test(arg))
          traced = traceNilExpression(arg, ctx.code, located.line, ctx.side);
        if (traced) evidence.push(ev(traced.points, traced.reason));
      }
    }
    const specific: DiagnosisCause[] = [];
    if (method === "FireClient" && n === 1)
      specific.push(
        cause(
          "FireClient needs the Player as its first argument",
          "likely",
          "`remote:FireClient(player, data)`. To send to everyone use FireAllClients(data).",
          true,
        ),
      );
    if (method === "SetAsync" && n === 2)
      specific.push(
        cause(
          "SetAsync(key, value) was called without a value (or the value is nil)",
          "likely",
          "To delete a key use RemoveAsync(key) instead.",
          true,
        ),
      );
    return result({
      title: `${method ? `${method}()` : "A Roblox function"} is missing argument #${n}`,
      severity: "Medium",
      summary: `${method ? q(method + "()") : "A Roblox API call"} needs an argument #${n}, but it was missing or nil${arg ? ` (${q(arg)})` : ""}.`,
      explanation:
        "Roblox functions check their inputs. You either left the argument out, or the variable you passed was nil at that moment.",
      location: locationOf(located, arg),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        ...specific,
        cause("The variable you passed is nil", "possible"),
        cause("The argument was left out", "possible"),
      ]),
      steps: [
        "Check the function's parameters in the Roblox docs.",
        "Print the value you pass right before the call.",
      ],
      fixCode: traced?.fix,
      docs: method
        ? docs(
            method === "FireClient"
              ? "RemoteEvent"
              : /Async|GetDataStore/.test(method)
                ? "GlobalDataStore"
                : "Instance",
          )
        : docs("Instance"),
      evidence,
    });
  },
};

export const NIL_SIGNATURES: Signature[] = [
  indexNil,
  indexNilLegacy,
  callMissingMethod,
  callNil,
  arithmetic,
  concatenate,
  compare,
  iterateNil,
  tableIndexNil,
  forLoop,
  invalidArgument,
  missingArgument,
  argumentMissingOrNil,
];
