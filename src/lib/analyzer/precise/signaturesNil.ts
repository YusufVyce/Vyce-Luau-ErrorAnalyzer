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
import { trType, tx } from "./lang";
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
          ? tx(
              "The player variable is nil (LocalPlayer doesn't exist on the server)",
              "Oyuncu değişkeni nil (LocalPlayer sunucuda yoktur)",
            )
          : tx("The player variable is nil", "Oyuncu değişkeni nil"),
        "likely",
        tx(
          "On the server Players.LocalPlayer is always nil. In Touched handlers Players:GetPlayerFromCharacter returns nil when something that isn't a player touches the part.",
          "Sunucuda Players.LocalPlayer her zaman nil'dir. Touched içinde parçaya oyuncu olmayan bir şey dokunursa Players:GetPlayerFromCharacter nil döndürür.",
        ),
      ),
      cause(
        tx(
          "The player left the game before this line ran",
          "Oyuncu bu satır çalışmadan önce oyundan çıktı",
        ),
        "unlikely",
      ),
    ];
  }
  if (CHARACTER_KEYS.has(key)) {
    return [
      cause(
        tx(
          "The character is nil — it hasn't spawned yet (or the player just died)",
          "Karakter nil — henüz doğmadı (ya da oyuncu az önce öldü)",
        ),
        "likely",
        tx(
          "player.Character is nil for a moment when a player joins and while they respawn. Use `player.Character or player.CharacterAdded:Wait()`.",
          "Oyuncu oyuna girdiğinde ve yeniden doğarken player.Character kısa bir süre nil olur. `player.Character or player.CharacterAdded:Wait()` kullan.",
        ),
      ),
      cause(
        tx(
          "You're holding on to an old character from before the player respawned",
          "Oyuncu yeniden doğmadan önceki eski karakteri kullanıyorsun",
        ),
        "possible",
      ),
    ];
  }
  if (key === "Value") {
    return [
      cause(
        tx(
          "The value object (e.g. leaderstats.Coins) wasn't found",
          "Değer objesi (örneğin leaderstats.Coins) bulunamadı",
        ),
        "likely",
        tx(
          "Usually FindFirstChild returned nil because the name is spelled differently or the object is created later by another script.",
          "Genelde isim farklı yazıldığı ya da obje daha sonra başka bir script tarafından oluşturulduğu için FindFirstChild nil döndürmüştür.",
        ),
      ),
      cause(
        tx(
          "leaderstats hasn't been created yet when this script runs",
          "Bu script çalıştığında leaderstats henüz oluşturulmamış",
        ),
        "possible",
      ),
    ];
  }
  if (key === "Connect" || key === "Once" || key === "Wait") {
    return [
      cause(
        tx("The event you're connecting to is nil", "Bağlanmaya çalıştığın event nil"),
        "likely",
        tx(
          'Either the object before it is nil, or the event name is misspelled on a table/module (on an Instance a wrong name gives "is not a valid member" instead).',
          'Ya ondan önceki obje nil, ya da bir tablo/modülde event adı yanlış yazılmış (bir Instance üzerinde yanlış isim bunun yerine "is not a valid member" hatası verir).',
        ),
      ),
    ];
  }
  if (REMOTE_KEYS.has(key)) {
    return [
      cause(
        tx("The RemoteEvent/RemoteFunction wasn't found", "RemoteEvent/RemoteFunction bulunamadı"),
        "likely",
        tx(
          'Check the name and location in ReplicatedStorage. On the client, get it with :WaitForChild("Name") so it has time to replicate.',
          'ReplicatedStorage içindeki adını ve yerini kontrol et. İstemcide (client) yüklenmesine zaman tanımak için :WaitForChild("Ad") ile al.',
        ),
      ),
      cause(
        tx(
          "The remote is in ServerStorage/ServerScriptService, which the client can't see",
          "Remote, istemcinin göremediği ServerStorage/ServerScriptService içinde",
        ),
        "possible",
      ),
    ];
  }
  if (key === "Clone") {
    return [
      cause(
        tx(
          "The template object you're cloning wasn't found",
          "Kopyalamaya (Clone) çalıştığın şablon obje bulunamadı",
        ),
        "likely",
        tx(
          "Check its name/location. Clients can't see ServerStorage — keep client templates in ReplicatedStorage.",
          "Adını ve yerini kontrol et. İstemci ServerStorage'ı göremez — istemcide kullanılacak şablonları ReplicatedStorage'da tut.",
        ),
      ),
    ];
  }
  if (DATASTORE_KEYS.has(key)) {
    return [
      cause(
        tx("The DataStore variable is nil", "DataStore değişkeni nil"),
        "likely",
        tx(
          'Create it first: `local store = game:GetService("DataStoreService"):GetDataStore("PlayerData")`.',
          'Önce oluştur: `local store = game:GetService("DataStoreService"):GetDataStore("PlayerData")`.',
        ),
      ),
    ];
  }
  if (GUI_KEYS.has(key)) {
    return [
      cause(
        tx("The GUI object wasn't found", "Arayüz (GUI) objesi bulunamadı"),
        "likely",
        tx(
          'UI is copied into PlayerGui when the character spawns. From a LocalScript use player:WaitForChild("PlayerGui"):WaitForChild("MyGui").',
          'Arayüz, karakter doğunca PlayerGui içine kopyalanır. LocalScript\'te player:WaitForChild("PlayerGui"):WaitForChild("MyGui") kullan.',
        ),
      ),
      cause(
        tx(
          "The path points at StarterGui/another frame than where the object really is",
          "Yol, objenin gerçekte durduğu yer yerine StarterGui'yi ya da başka bir frame'i gösteriyor",
        ),
        "possible",
      ),
    ];
  }
  if (PART_KEYS.has(key)) {
    return [
      cause(
        tx("The part you're using wasn't found", "Kullandığın parça (part) bulunamadı"),
        "likely",
        tx(
          "FindFirstChild returned nil or the name differs. With StreamingEnabled, far-away parts may not exist on the client yet.",
          "FindFirstChild nil döndürdü ya da isim farklı. StreamingEnabled açıksa uzaktaki parçalar istemcide henüz olmayabilir.",
        ),
      ),
    ];
  }
  if (key === "Instance" || key === "Normal" || key === "Distance") {
    return [
      cause(
        tx(
          "workspace:Raycast returned nil because the ray hit nothing",
          "Işın hiçbir şeye çarpmadığı için workspace:Raycast nil döndürdü",
        ),
        "likely",
        tx(
          "Always check `if result then` before reading the raycast result.",
          "Raycast sonucunu okumadan önce her zaman `if result then` ile kontrol et.",
        ),
      ),
    ];
  }
  if (key === "Play" || key === "Stop") {
    return [
      cause(
        tx(
          "The Sound / AnimationTrack / Tween you're trying to play is nil",
          "Oynatmaya çalıştığın Sound / AnimationTrack / Tween nil",
        ),
        "likely",
      ),
    ];
  }
  return [
    cause(
      tx(`The value before ${q("." + key)} is nil`, `${q("." + key)} öncesindeki değer nil`),
      "likely",
      tx(
        "It was never assigned, a lookup (FindFirstChild, a table key, a function return) gave back nil, or the object was destroyed.",
        "Hiç atanmamış, bir arama (FindFirstChild, tablo anahtarı, fonksiyonun döndürdüğü değer) nil vermiş ya da obje silinmiş (Destroy).",
      ),
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
  const what = culprit ? q(culprit) : tx("the value", "değer");
  const keyText = key ? q(key) : tx("a field", "bir alan");

  const guardVar = culprit
    ? rootIdentifier(culprit) === culprit
      ? culprit
      : (lastSegment(culprit)?.replace(/^\w/, (c) => c.toLowerCase()) ?? "value")
    : "value";
  const isNil = tx("is nil", "yok (nil)");
  const defaultFix = culprit
    ? {
        before: located?.text,
        after:
          rootIdentifier(culprit) === culprit
            ? `if not ${culprit} then\n\twarn("${culprit} ${isNil}")\n\treturn\nend\n${located?.text ?? `${culprit}.${key}`}`
            : `local ${guardVar} = ${culprit}\nif not ${guardVar} then\n\twarn("${culprit} ${isNil}")\n\treturn\nend\n${tx("-- then use", "-- sonra şunu kullan:")} ${guardVar}.${key ?? "..."}`,
        caption: tx(
          "Stop early if the value is missing instead of crashing.",
          "Değer yoksa script çökmeden önce erkenden dur.",
        ),
      }
    : undefined;

  return result({
    title: key
      ? tx(`Tried to use .${key} on nothing (nil)`, `Hiçbir şeyin (nil) .${key} alanı kullanıldı`)
      : tx("Tried to index nil", "nil olan bir şeyin içine bakılmaya çalışıldı"),
    severity: "High",
    summary: culprit
      ? tx(
          `${what} is nil, so reading ${keyText} from it fails.`,
          `${what} nil, bu yüzden içinden ${keyText} okunamıyor.`,
        )
      : tx(
          `The object you tried to read ${keyText} from doesn't exist (it's nil).`,
          `İçinden ${keyText} okumaya çalıştığın obje yok (nil).`,
        ),
    explanation: tx(
      `In Luau, nil means "no value". Your code asked for ${keyText} on ${what}, but at that moment ${what} was nil — so there is nothing to read from. Find out why it's nil (see the causes below), then either make sure it exists or check for nil before using it.`,
      `Luau'da nil "değer yok" demektir. Kodun ${what} içinden ${keyText} istedi, ama o anda ${what} nil'di — yani okunacak bir şey yoktu. Neden nil olduğunu bul (aşağıdaki sebeplere bak), sonra ya var olduğundan emin ol ya da kullanmadan önce nil olup olmadığını kontrol et.`,
    ),
    location: locationOf(located, culprit),
    causes,
    steps: [
      ...(traced?.step ? [traced.step] : []),
      culprit
        ? tx(
            `Add \`print(${culprit})\` just above line ${located?.line ?? "?"} to confirm it prints nil.`,
            `nil yazdırdığını görmek için ${located?.line ?? "?"}. satırın hemen üstüne \`print(${culprit})\` ekle.`,
          )
        : tx(
            "Print the object right before the failing line to see which part is nil.",
            "Hangi kısmın nil olduğunu görmek için hatalı satırdan hemen önce objeyi print ile yazdır.",
          ),
      tx(
        "Make sure the object exists before this line runs (WaitForChild, CharacterAdded:Wait, default values).",
        "Bu satır çalışmadan önce objenin var olduğundan emin ol (WaitForChild, CharacterAdded:Wait, varsayılan değerler).",
      ),
      tx(
        "Guard the access with `if value then ... end` so a missing object can't crash the script.",
        "Eksik bir obje scripti çökertmesin diye kullanımı `if value then ... end` ile koru.",
      ),
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
  const typeTr = trType(type);

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
          tx(
            `${q(root!)} already holds the ${type} itself (line ${assignment.line} reads .Value)`,
            `${q(root!)} zaten değerin kendisini (${typeTr}) tutuyor (${assignment.line}. satır .Value okuyor)`,
          ),
          "likely",
          tx(
            `Line ${assignment.line} stores ${q(assignment.rhs)} — that's the plain ${type}, not the IntValue/BoolValue object. A ${type} has no ${q(key ?? "fields")}.`,
            `${assignment.line}. satır ${q(assignment.rhs)} saklıyor — bu IntValue/BoolValue objesi değil, düz bir ${typeTr}. Bir ${typeTr} içinde ${q(key ?? "alan")} yoktur.`,
          ),
          true,
        ),
      );
      fix = {
        before: `local ${root} = ${assignment.rhs}`,
        after: `local ${root} = ${assignment.rhs.replace(/\.\s*Value\s*$/, "")} ${tx("-- keep the object", "-- objenin kendisini sakla")}\n${tx("-- later:", "-- sonra:")} ${root}.Value`,
        caption: tx(
          "Store the object, and read .Value when you need the number.",
          "Objenin kendisini sakla, sayıya ihtiyacın olduğunda .Value oku.",
        ),
      };
      evidence.push(ev(18, tx(".Value was read twice", ".Value iki kez okunmuş")));
    }
  }
  if (type === "function") {
    causes.push(
      cause(
        tx(
          "You forgot the () to call a function before indexing its result",
          "Fonksiyonun sonucunu kullanmadan önce onu çağırmak için () yazmayı unuttun",
        ),
        "likely",
        tx(
          "Example: `player:GetMouse.Hit` should be `player:GetMouse().Hit`.",
          "Örnek: `player:GetMouse.Hit` yerine `player:GetMouse().Hit` olmalı.",
        ),
        Boolean(culprit),
      ),
    );
  }
  if (type === "number" || type === "boolean") {
    causes.push(
      cause(
        tx(
          `The variable holds a ${type}, not an object`,
          `Değişken bir obje değil, bir ${typeTr} tutuyor`,
        ),
        "likely",
        tx(
          "Maybe it was overwritten with a number earlier, or .Value was read too early.",
          "Belki daha önce üzerine bir sayı yazıldı ya da .Value çok erken okundu.",
        ),
      ),
    );
  }
  if (type === "string") {
    causes.push(
      cause(
        tx(
          "The variable holds a string (e.g. a name) instead of the object",
          "Değişken objenin yerine bir metin (örneğin bir isim) tutuyor",
        ),
        "likely",
        tx(
          "If you have a name, look the object up: `workspace:FindFirstChild(name)`.",
          "Elinde bir isim varsa objeyi onunla bul: `workspace:FindFirstChild(name)`.",
        ),
      ),
    );
  }
  if (causes.length === 0)
    causes.push(
      cause(
        tx(
          `The value is a ${type}, which has no ${q(key ?? "fields")}`,
          `Değer bir ${typeTr} ve onda ${q(key ?? "alan")} yok`,
        ),
        "likely",
      ),
    );

  return result({
    title: tx(
      `Tried to use .${key ?? "field"} on a ${type}`,
      `Bir ${typeTr} üzerinde .${key ?? "alan"} kullanıldı`,
    ),
    severity: "High",
    summary: tx(
      `${culprit ? q(culprit) : "The value"} is a ${type}, and a ${type} has no ${q(key ?? "fields")}.`,
      `${culprit ? q(culprit) : "Değer"} bir ${typeTr}, ve bir ${typeTr} içinde ${q(key ?? "alan")} yoktur.`,
    ),
    explanation: tx(
      `Only tables and Roblox objects have fields you can read with a dot. ${culprit ? q(culprit) : "This value"} turned out to be a ${type}, so ${q("." + (key ?? "field"))} doesn't exist on it.`,
      `Sadece tablolar ve Roblox objeleri nokta ile okunabilen alanlara sahiptir. ${culprit ? q(culprit) : "Bu değer"} bir ${typeTr} çıktı, bu yüzden üzerinde ${q("." + (key ?? "alan"))} yok.`,
    ),
    location: locationOf(located, culprit),
    causes: rankCauses(causes),
    steps: [
      culprit
        ? tx(
            `Print \`typeof(${culprit})\` before the line to see what it really is.`,
            `Gerçekte ne olduğunu görmek için satırdan önce \`typeof(${culprit})\` yazdır.`,
          )
        : tx(
            "Print typeof(value) before the failing line.",
            "Hatalı satırdan önce typeof(değer) yazdır.",
          ),
      tx(
        "Trace back to where the variable was assigned and make it hold the object you meant.",
        "Değişkenin atandığı yere geri git ve istediğin objeyi tutmasını sağla.",
      ),
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
              tx(
                `${q(name + "()")} is called on line ${lineIdx + 1} but only defined on line ${declIdx + 1}`,
                `${q(name + "()")} ${lineIdx + 1}. satırda çağrılıyor ama ancak ${declIdx + 1}. satırda tanımlanıyor`,
              ),
              "likely",
              tx(
                "A `local function` only exists from the line where it's written downwards. When line " +
                  (lineIdx + 1) +
                  " runs, the name is still nil.",
                "Bir `local function` sadece yazıldığı satırdan aşağısı için vardır. " +
                  (lineIdx + 1) +
                  ". satır çalıştığında bu isim hâlâ nil.",
              ),
              true,
            ),
            points: 26,
            reason: tx(
              "function is used above its local definition",
              "fonksiyon, local tanımının üstünde kullanılmış",
            ),
            fix: {
              after: `${tx(`-- move this block above line ${lineIdx + 1}:`, `-- bu bloğu ${lineIdx + 1}. satırın üstüne taşı:`)}\n${raw[declIdx].trim()}\n\t-- ...\nend`,
              caption: tx(
                "Define the function before the code that calls it.",
                "Fonksiyonu, onu çağıran koddan önce tanımla.",
              ),
            },
            line: lineIdx + 1,
            name,
          };
        }
        if (name === "loadstring") {
          return {
            cause: cause(
              tx("loadstring is disabled", "loadstring kapalı"),
              "likely",
              ctx.side === "client"
                ? tx(
                    "loadstring never works on the client.",
                    "loadstring istemcide (client) hiçbir zaman çalışmaz.",
                  )
                : tx(
                    "On the server it only works when ServerScriptService.LoadStringEnabled is turned on (and it's a security risk).",
                    "Sunucuda sadece ServerScriptService.LoadStringEnabled açıksa çalışır (ve bu bir güvenlik riskidir).",
                  ),
              true,
            ),
            points: 22,
            reason: tx("loadstring call found", "loadstring çağrısı bulundu"),
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
              tx(
                `${q(name)} doesn't exist — did you mean ${q(suggestion)}?`,
                `${q(name)} diye bir şey yok — ${q(suggestion)} mı demek istedin?`,
              ),
              "likely",
              tx(
                "Luau is case-sensitive: `Print`, `print` and `pritn` are three different names, and only `print` exists.",
                "Luau büyük/küçük harfe duyarlıdır: `Print`, `print` ve `pritn` üç farklı isimdir ve sadece `print` vardır.",
              ),
              true,
            )
          : cause(
              tx(
                `${q(name)} is never defined in this snippet`,
                `${q(name)} bu kodda hiç tanımlanmamış`,
              ),
              "possible",
              tx(
                "If it lives in another script, move it into a ModuleScript and require it — locals don't cross scripts.",
                "Başka bir scriptteyse onu bir ModuleScript'e taşı ve require ile al — local değişkenler scriptler arasında paylaşılmaz.",
              ),
              true,
            ),
        points: suggestion ? 24 : 8,
        reason: suggestion
          ? tx(
              `undefined function name close to \`${suggestion}\``,
              `tanımsız fonksiyon adı \`${suggestion}\` ile çok benzer`,
            )
          : tx(
              "called function isn't defined in the snippet",
              "çağrılan fonksiyon kodda tanımlı değil",
            ),
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
          ? tx(
              ' Luau has no string.trim — use `s:match("^%s*(.-)%s*$")`.',
              ' Luau\'da string.trim yok — `s:match("^%s*(.-)%s*$")` kullan.',
            )
          : "";
      return {
        cause: cause(
          tx(
            `${q(`${receiver}.${name}`)} doesn't exist${suggestion ? ` — did you mean ${q(`${receiver}.${suggestion}`)}?` : ""}`,
            `${q(`${receiver}.${name}`)} diye bir şey yok${suggestion ? ` — ${q(`${receiver}.${suggestion}`)} mı demek istedin?` : ""}`,
          ),
          "likely",
          tx(
            `The ${receiver} library has no function called ${q(name)}.${special}`,
            `${receiver} kütüphanesinde ${q(name)} adında bir fonksiyon yok.${special}`,
          ),
          true,
        ),
        points: 24,
        reason: tx(
          `\`${receiver}.${name}\` is not part of the ${receiver} library`,
          `\`${receiver}.${name}\`, ${receiver} kütüphanesinde yok`,
        ),
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
            tx(
              `The module ${q(recvRoot)} has no function called ${q(name)}`,
              `${q(recvRoot)} modülünde ${q(name)} adında bir fonksiyon yok`,
            ),
            "likely",
            tx(
              `Open the ModuleScript and check that it defines \`function ${recvRoot === "self" ? "Module" : "Module"}.${name}(...)\` (same spelling and case) and that it's on the returned table — a \`local function ${name}\` inside the module isn't exported.`,
              `ModuleScript'i aç ve \`function Module.${name}(...)\` tanımlı mı (aynı yazım ve büyük/küçük harf) ve döndürülen tablonun içinde mi kontrol et — modülün içindeki bir \`local function ${name}\` dışarıya verilmez.`,
            ),
            true,
          ),
          points: 16,
          reason: tx(
            "function is called on a required module",
            "fonksiyon require ile alınan bir modül üzerinde çağrılıyor",
          ),
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
        ? tx("a table", "bir tablo")
        : valueType === "Instance" || valueType === "userdata"
          ? tx("a Roblox object", "bir Roblox objesi")
          : tx(`a ${valueType}`, `bir ${trType(valueType)}`);
    return result({
      title: tx(
        `Tried to call ${kind} like a function`,
        `${kind[0].toUpperCase()}${kind.slice(1)} fonksiyon gibi çağrıldı`,
      ),
      severity: "High",
      summary: tx(
        `Something that is ${kind} was used with () as if it were a function.`,
        `${kind[0].toUpperCase()}${kind.slice(1)}, sanki bir fonksiyonmuş gibi () ile kullanıldı.`,
      ),
      explanation:
        valueType === "table"
          ? tx(
              "You wrote `name(...)` but `name` is a table. Usually you meant a function inside it, like `Module.doThing()`, or a ModuleScript returned a table instead of a function.",
              "`isim(...)` yazdın ama `isim` bir tablo. Genelde içindeki bir fonksiyonu kastetmişsindir, `Module.doThing()` gibi; ya da ModuleScript fonksiyon yerine tablo döndürmüştür.",
            )
          : valueType === "Instance" || valueType === "userdata"
            ? tx(
                "You put () after a Roblox object, e.g. `script.Parent()` or `game.Players.LocalPlayer()`. Objects aren't functions — call one of their methods with `:` instead.",
                "Bir Roblox objesinin arkasına () koydun, örneğin `script.Parent()` ya da `game.Players.LocalPlayer()`. Objeler fonksiyon değildir — bunun yerine `:` ile metotlarından birini çağır.",
              )
            : tx(
                `A ${valueType} value was followed by (). Check that you didn't overwrite a function variable with a ${valueType}.`,
                `Bir ${trType(valueType)} değerinin arkasına () yazılmış. Fonksiyon tutan bir değişkenin üzerine ${trType(valueType)} yazmadığından emin ol.`,
              ),
      location: locationOf(located),
      causes: [
        cause(
          tx(`The name you're calling holds ${kind}`, `Çağırdığın isim ${kind} tutuyor`),
          "likely",
          tx(
            "Look for a variable with the same name that gets reassigned, or a module that returns a table.",
            "Aynı isimde, sonradan değeri değiştirilen bir değişken ya da tablo döndüren bir modül ara.",
          ),
        ),
      ],
      steps: [
        tx(
          "Print `typeof(x)` for the thing you're calling.",
          "Çağırdığın şey için `typeof(x)` yazdır.",
        ),
        tx(
          "Call the function inside it (`Module.fn()`), or remove the extra ().",
          "İçindeki fonksiyonu çağır (`Module.fn()`) ya da fazladan yazılan ()'i sil.",
        ),
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
            tx(
              `${q(named)} is misspelled or doesn't exist on that object/table`,
              `${q(named)} yanlış yazılmış ya da o objede/tabloda yok`,
            ),
            "likely",
            tx(
              "Names are case-sensitive. Check the exact spelling where it's defined.",
              "İsimler büyük/küçük harfe duyarlıdır. Tanımlandığı yerdeki yazımı birebir kontrol et.",
            ),
          ),
        ]
      : []),
    cause(
      tx(
        "The function is defined below the line that calls it (local functions don't exist yet above their definition)",
        "Fonksiyon, onu çağıran satırın altında tanımlanmış (local fonksiyonlar tanımlarının üstünde henüz yoktur)",
      ),
      "possible",
    ),
    cause(
      tx(
        "A ModuleScript doesn't export that function (it's local inside the module, or has a different name)",
        "Bir ModuleScript bu fonksiyonu dışarıya vermiyor (modülün içinde local ya da adı farklı)",
      ),
      "possible",
    ),
    cause(
      tx(
        "A variable holding the function was overwritten with nil",
        "Fonksiyonu tutan değişkenin üzerine nil yazılmış",
      ),
      "unlikely",
    ),
  ]);

  const fnName = finding?.name ?? named;
  return result({
    title: fnName
      ? tx(`${fnName}() doesn't exist (nil)`, `${fnName}() diye bir şey yok (nil)`)
      : tx("Called something that doesn't exist (nil)", "Olmayan (nil) bir şey çağrıldı"),
    severity: "High",
    summary: fnName
      ? tx(
          `You called ${q(fnName + "()")}, but at that moment it was nil — not a function.`,
          `${q(fnName + "()")} çağırdın ama o anda bu bir fonksiyon değil, nil'di.`,
        )
      : tx(
          "You called a function that is nil at that moment.",
          "O anda nil olan bir fonksiyonu çağırdın.",
        ),
    explanation: tx(
      "Calling means putting () after a name. Luau looked the name up, found nothing (nil), and nil can't be run. The usual reasons are a typo, a function that's defined further down, or a module that doesn't export the function.",
      "Çağırmak, bir ismin arkasına () koymak demektir. Luau bu ismi aradı, hiçbir şey (nil) bulamadı ve nil çalıştırılamaz. Genelde sebep bir yazım hatası, daha aşağıda tanımlanan bir fonksiyon ya da fonksiyonu dışarıya vermeyen bir modüldür.",
    ),
    location: locationOf(located, finding?.name),
    causes,
    steps: [
      fnName
        ? tx(
            `Search your code for where ${q(fnName)} is defined and compare the spelling letter by letter.`,
            `Kodunda ${q(fnName)} nerede tanımlanmış bul ve yazımını harf harf karşılaştır.`,
          )
        : tx(
            "Find which call on the failing line is nil (print each part).",
            "Hatalı satırdaki hangi çağrının nil olduğunu bul (her parçayı print ile yazdır).",
          ),
      tx(
        "If it's a `local function`, make sure it's written above the code that calls it.",
        "Bir `local function` ise onu çağıran kodun üstünde yazıldığından emin ol.",
      ),
      tx(
        "If it comes from a ModuleScript, make sure it's `function Module.name()` and the module ends with `return Module`.",
        "Bir ModuleScript'ten geliyorsa `function Module.isim()` şeklinde yazıldığından ve modülün `return Module` ile bittiğinden emin ol.",
      ),
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
    const owner = trType(m[2]);
    return {
      ...r,
      title: tx(`Method :${m[1]}() doesn't exist`, `:${m[1]}() diye bir metot yok`),
      summary: tx(
        `You called ${q(":" + m[1] + "()")} on a ${m[2]}, but that ${m[2]} has no ${q(m[1])} function.`,
        `Bir ${owner} üzerinde ${q(":" + m[1] + "()")} çağırdın ama o ${owner} içinde ${q(m[1])} fonksiyonu yok.`,
      ),
      causes: rankCauses([
        cause(
          tx(
            `${q(m[1])} is misspelled, or it was never added to that ${m[2]}`,
            `${q(m[1])} yanlış yazılmış ya da o ${owner} içine hiç eklenmemiş`,
          ),
          "likely",
          tx(
            "For class-style tables, make sure the method is defined as `function Class:" +
              m[1] +
              "()` and the object has `setmetatable(obj, Class)` with `Class.__index = Class`.",
            "Sınıf gibi kullanılan tablolarda metodun `function Class:" +
              m[1] +
              "()` olarak tanımlandığından ve objede `Class.__index = Class` ile birlikte `setmetatable(obj, Class)` olduğundan emin ol.",
          ),
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

/** "an Instance" / "a string" in English, "bir Roblox objesi" / "bir metin" in Turkish. */
const an = (t: string) => tx(`${/^[AEIOU]/i.test(t) ? "an" : "a"} ${t}`, `bir ${trType(t)}`);

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
            tx(
              `${q(operand)} is an IntValue/NumberValue object — you forgot ${q(".Value")}`,
              `${q(operand)} bir IntValue/NumberValue objesi — ${q(".Value")} yazmayı unuttun`,
            ),
            "likely",
            tx(
              `${assignment ? `Line ${assignment.line} stores the value object itself. ` : ""}Math works on numbers, so use ${q(operand + ".Value")}.`,
              `${assignment ? `${assignment.line}. satır değer objesinin kendisini saklıyor. ` : ""}Matematik sayılarla yapılır, bu yüzden ${q(operand + ".Value")} kullan.`,
            ),
            true,
          ),
          fix: {
            before: lineText,
            after: lineText.replace(
              new RegExp(`\\b${escapeRegExp(operand)}\\b(?!\\s*\\.\\s*Value)`, "g"),
              `${operand}.Value`,
            ),
            caption: tx(
              `Use ${operand}.Value wherever you do math or comparisons with it.`,
              `Onunla matematik ya da karşılaştırma yaptığın her yerde ${operand}.Value kullan.`,
            ),
          },
          points: 22,
          reason: tx(
            "operand is a value object without .Value",
            "işlemdeki değer, .Value olmadan kullanılan bir değer objesi",
          ),
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
            tx(
              `${q(operand)} is text from a TextBox/TextLabel`,
              `${q(operand)} bir TextBox/TextLabel'dan gelen metin`,
            ),
            "likely",
            tx(
              "`.Text` is always a string. Convert it with tonumber() and handle the case where the player typed something that isn't a number.",
              "`.Text` her zaman metindir (string). tonumber() ile sayıya çevir ve oyuncunun sayı olmayan bir şey yazdığı durumu da ele al.",
            ),
            true,
          ),
          fix: {
            after: `local amount = tonumber(${assignment ? root : operand})\nif not amount then\n\treturn ${tx("-- not a number", "-- sayı değil")}\nend`,
          },
          points: 18,
          reason: tx("operand comes from .Text", "işlemdeki değer .Text'ten geliyor"),
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
          tx(
            "One of the values is nil — a variable that was never set, a missing table key, or GetAttribute/GetAsync returning nil",
            "Değerlerden biri nil — hiç atanmamış bir değişken, olmayan bir tablo anahtarı ya da nil döndüren GetAttribute/GetAsync",
          ),
          "likely",
          tx(
            "Give it a default: `local coins = data.Coins or 0`.",
            "Varsayılan bir değer ver: `local coins = data.Coins or 0`.",
          ),
        ),
      ];
    case "Instance":
      return [
        cause(
          tx(
            "You used an object instead of its number — usually a missing `.Value` (e.g. `coins.Value + 1`)",
            "Sayının yerine objenin kendisini kullandın — genelde `.Value` eksiktir (örneğin `coins.Value + 1`)",
          ),
          "likely",
        ),
      ];
    case "string":
      return [
        cause(
          tx(
            "One side is text that isn't a number (like TextBox.Text)",
            "Bir taraf sayı olmayan bir metin (TextBox.Text gibi)",
          ),
          "likely",
          tx(
            "Convert with tonumber(text) first. Luau only auto-converts strings that look exactly like numbers.",
            "Önce tonumber(metin) ile çevir. Luau sadece tam olarak sayı gibi görünen metinleri kendiliğinden çevirir.",
          ),
        ),
      ];
    case "table":
      return [
        cause(
          tx(
            "One side is a table — you probably meant one of its fields (e.g. `data.Coins`)",
            "Bir taraf tablo — muhtemelen içindeki bir alanı kastettin (örneğin `data.Coins`)",
          ),
          "likely",
        ),
      ];
    case "boolean":
      return [
        cause(
          tx("One side is true/false, not a number", "Bir taraf sayı değil, true/false"),
          "likely",
        ),
      ];
    case "Vector3":
    case "Vector2":
      return [
        cause(
          tx(
            `You can't ${op === "add" || op === "sub" ? "add/subtract" : "combine"} a ${t} and a plain number`,
            `Bir ${t} ile düz bir sayı ${op === "add" || op === "sub" ? "toplanamaz/çıkarılamaz" : "birleştirilemez"}`,
          ),
          "likely",
          tx(
            `Build a ${t} first, e.g. \`pos + Vector3.new(0, 5, 0)\`. Multiplying/dividing by a number is fine.`,
            `Önce bir ${t} oluştur, örneğin \`pos + Vector3.new(0, 5, 0)\`. Bir sayıyla çarpmak/bölmek sorun değil.`,
          ),
        ),
      ];
    case "UDim2":
      return [
        cause(
          tx(
            "UDim2 can't be combined with a plain number",
            "UDim2 düz bir sayıyla birleştirilemez",
          ),
          "likely",
          tx(
            "Use UDim2.fromScale / UDim2.fromOffset to build the amount you want to add.",
            "Eklemek istediğin miktarı UDim2.fromScale / UDim2.fromOffset ile oluştur.",
          ),
        ),
      ];
    case "CFrame":
      return [
        cause(
          tx(
            "CFrame math only works with Vector3 (+/-) or another CFrame (*)",
            "CFrame ile matematik sadece Vector3 (+/-) ya da başka bir CFrame (*) ile yapılır",
          ),
          "likely",
          tx(
            "E.g. `cf * CFrame.new(0, 5, 0)` or `cf + Vector3.new(0, 5, 0)`.",
            "Örneğin `cf * CFrame.new(0, 5, 0)` ya da `cf + Vector3.new(0, 5, 0)`.",
          ),
        ),
      ];
    default:
      return [
        cause(
          tx(
            `One side is a ${t}, which doesn't support this operation`,
            `Bir taraf ${trType(t)} ve bu işlemi desteklemiyor`,
          ),
          "likely",
        ),
      ];
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
    const opWordTr: Record<string, string> = {
      add: "toplamaya",
      sub: "çıkarmaya",
      mul: "çarpmaya",
      div: "bölmeye",
      mod: "bölümünden kalanı almaya",
      pow: "üssünü almaya",
      unm: "eksiye çevirmeye",
      idiv: "bölmeye",
    };
    const operandsTr = types.length === 2 ? `${an(left)} ile ${an(right!)}` : an(bad);
    return result({
      title: tx(
        `Math on ${bad === "nil" ? "nil" : `${/^[AEIOU]/.test(bad) ? "an" : "a"} ${bad}`}`,
        `${bad === "nil" ? "nil" : trType(bad)} ile matematik yapıldı`,
      ),
      severity: "Medium",
      summary: tx(
        `The code tried to ${opWord[op] ?? "do math with"} ${types.length === 2 ? `${an(left)} and ${an(right!)}` : an(bad)}, but math only works on numbers${bad === "Vector3" ? " (or matching vector types)" : ""}.`,
        `Kod ${operandsTr} değerini ${opWordTr[op] ?? "matematikte kullanmaya"} çalıştı, ama matematik sadece sayılarla${bad === "Vector3" ? " (ya da aynı türdeki vektörlerle)" : ""} yapılır.`,
      ),
      explanation: tx(
        `The ${q(symbol)} operator needs numbers on both sides. Here one side was ${bad === "nil" ? "nil (no value)" : an(bad)}. Find which variable that is and turn it into a real number first.`,
        `${q(symbol)} işlemi iki tarafta da sayı ister. Burada bir taraf ${bad === "nil" ? "nil (değer yok)" : an(bad)} idi. Bunun hangi değişken olduğunu bul ve önce gerçek bir sayıya çevir.`,
      ),
      location: locationOf(located),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        ...typeMathAdvice(bad === "userdata" ? "Instance" : bad, op),
      ]),
      steps: [
        tx(
          "Print each value used on that line to see which one isn't a number.",
          "Hangisinin sayı olmadığını görmek için o satırdaki her değeri print ile yazdır.",
        ),
        bad === "nil"
          ? tx(
              "Give missing values a default with `or 0`.",
              "Eksik olabilecek değerlere `or 0` ile varsayılan bir değer ver.",
            )
          : bad === "string"
            ? tx("Wrap text in tonumber(...).", "Metni tonumber(...) içine al.")
            : bad === "Instance"
              ? tx(
                  "Add .Value to IntValue/NumberValue objects.",
                  "IntValue/NumberValue objelerine .Value ekle.",
                )
              : tx(
                  "Convert the value to the right type before the math.",
                  "Matematikten önce değeri doğru türe çevir.",
                ),
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
              tx(
                `${q(culprit)} is a Roblox object — join its ${q(".Name")} instead`,
                `${q(culprit)} bir Roblox objesi — onun yerine ${q(".Name")} değerini birleştir`,
              ),
              "likely",
              tx(
                "You can't glue an object into text. Use `obj.Name` (or `player.DisplayName`).",
                "Bir objeyi metne yapıştıramazsın. `obj.Name` (ya da `player.DisplayName`) kullan.",
              ),
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
            reason: tx("object joined into a string", "obje bir metne eklenmiş"),
          };
        }
      }
      if (traced) evidence.push(ev(traced.points, traced.reason));
    }
    const fixes: Record<string, string> = {
      nil: tx(
        'wrap it: tostring(value) — or give a default: (value or "")',
        'tostring(değer) içine al — ya da varsayılan ver: (değer or "")',
      ),
      Instance: tx("use obj.Name", "obj.Name kullan"),
      userdata: tx("use obj.Name", "obj.Name kullan"),
      table: tx(
        'use table.concat(list, ", ") to join a list',
        'bir listeyi birleştirmek için table.concat(liste, ", ") kullan',
      ),
      boolean: tx("use tostring(flag)", "tostring(değer) kullan"),
    };
    const badText = bad === "nil" ? "nil" : an(bad);
    return result({
      title: tx(
        `Tried to join ${badText} into text`,
        `${bad === "nil" ? "nil" : trType(bad)} bir metne eklenmeye çalışıldı`,
      ),
      severity: "Medium",
      summary: tx(
        `The \`..\` operator only joins strings and numbers, but one side was ${badText}.`,
        `\`..\` işlemi sadece metinleri ve sayıları birleştirir, ama bir taraf ${badText} idi.`,
      ),
      explanation: tx(
        `\`..\` glues text together, e.g. \`"Hi " .. player.Name\`. One of the pieces was ${bad === "nil" ? "nil (it has no value)" : an(bad)}, which can't be turned into text automatically. Fix: ${fixes[bad] ?? "convert it with tostring()"}.`,
        `\`..\` metinleri birbirine yapıştırır, örneğin \`"Merhaba " .. player.Name\`. Parçalardan biri ${bad === "nil" ? "nil (değeri yok)" : an(bad)} idi ve bu kendiliğinden metne çevrilemez. Çözüm: ${fixes[bad] ?? "tostring() ile çevir"}.`,
      ),
      location: locationOf(located, culprit),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        bad === "nil"
          ? cause(
              tx(
                "A variable in the message is nil (not set, or a lookup failed)",
                "Mesajdaki bir değişken nil (atanmamış ya da bir arama başarısız olmuş)",
              ),
              "likely",
              tx(
                'Print each piece or use tostring(x), which turns nil into the text "nil" instead of crashing.',
                'Her parçayı yazdır ya da tostring(x) kullan; bu, çökmek yerine nil\'i "nil" metnine çevirir.',
              ),
            )
          : cause(
              tx(
                `A ${bad} was used directly in the text`,
                `Bir ${trType(bad)} doğrudan metnin içinde kullanılmış`,
              ),
              "likely",
              tx(
                `Convert it: ${fixes[bad] ?? "tostring(x)"}.`,
                `Çevir: ${fixes[bad] ?? "tostring(x)"}.`,
              ),
            ),
      ]),
      steps: [
        tx(
          "Wrap each non-text piece in tostring(...) while debugging.",
          "Hata ararken metin olmayan her parçayı tostring(...) içine al.",
        ),
        tx(
          "For objects use .Name; for lists use table.concat.",
          "Objeler için .Name, listeler için table.concat kullan.",
        ),
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
      title: tx(`Compared ${a} with ${b}`, `${trType(a)} ile ${trType(b)} karşılaştırıldı`),
      severity: "Medium",
      summary: tx(
        `<, >, <= and >= need two numbers (or two strings), but this compared a ${a} with a ${b}.`,
        `<, >, <= ve >= iki sayı (ya da iki metin) ister, ama burada bir ${trType(a)} ile bir ${trType(b)} karşılaştırıldı.`,
      ),
      explanation: tx(
        `Luau can't tell whether ${a === "nil" || b === "nil" ? "nothing (nil)" : an(bad)} is bigger or smaller than a number. Make sure both sides are numbers before comparing.`,
        `Luau, ${a === "nil" || b === "nil" ? "hiçbir şeyin (nil)" : `${an(bad)} değerinin`} bir sayıdan büyük mü küçük mü olduğunu bilemez. Karşılaştırmadan önce iki tarafın da sayı olduğundan emin ol.`,
      ),
      location: locationOf(located),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        ...(bad === "string"
          ? [
              cause(
                tx(
                  "One side is text (e.g. TextBox.Text or an attribute string)",
                  "Bir taraf metin (örneğin TextBox.Text ya da metin olan bir attribute)",
                ),
                "likely",
                tx("Use tonumber(text).", "tonumber(metin) kullan."),
              ),
            ]
          : bad === "Instance" || bad === "userdata"
            ? [
                cause(
                  tx(
                    "One side is an IntValue object — add .Value",
                    "Bir taraf IntValue objesi — .Value ekle",
                  ),
                  "likely",
                  tx("e.g. `if coins.Value >= 100 then`.", "örneğin `if coins.Value >= 100 then`."),
                ),
              ]
            : typeMathAdvice(bad, "compare")),
      ]),
      steps: [
        tx(
          "Print both sides of the comparison.",
          "Karşılaştırmanın iki tarafını da print ile yazdır.",
        ),
        tx(
          "Use `or 0` for values that can be missing, tonumber() for text, .Value for value objects.",
          "Eksik olabilecek değerler için `or 0`, metin için tonumber(), değer objeleri için .Value kullan.",
        ),
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
      title: tx(`Looped over ${m[1]}`, `${trType(m[1])} üzerinde döngü kuruldu`),
      severity: "Medium",
      summary: tx(
        `The for-loop expected a table to go through, but ${culprit ? q(culprit) : "the value"} was ${m[1]}.`,
        `for döngüsü üzerinden geçeceği bir tablo bekliyordu, ama ${culprit ? q(culprit) : "değer"} ${trType(m[1])} idi.`,
      ),
      explanation: tx(
        "`for _, item in list do` needs `list` to be a table (like the result of :GetChildren()). It was missing, so there's nothing to loop over.",
        "`for _, item in list do` için `list` bir tablo olmalı (:GetChildren() sonucu gibi). Tablo yoktu, bu yüzden döngünün geçeceği bir şey yok.",
      ),
      location: locationOf(located, culprit),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        cause(
          tx(
            "The list was never created or a function returned nil instead of a table",
            "Liste hiç oluşturulmamış ya da bir fonksiyon tablo yerine nil döndürmüş",
          ),
          "likely",
        ),
      ]),
      steps: [
        tx("Print the value before the loop.", "Döngüden önce değeri print ile yazdır."),
        tx(
          `Use a fallback: \`for _, item in (${culprit ?? "list"} or {}) do\`.`,
          `Yedek bir değer kullan: \`for _, item in (${culprit ?? "list"} or {}) do\`.`,
        ),
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
      title: nan
        ? tx("Used NaN as a table key", "Tablo anahtarı olarak NaN kullanıldı")
        : tx("Used nil as a table key", "Tablo anahtarı olarak nil kullanıldı"),
      severity: "Medium",
      summary: nan
        ? tx(
            "You stored something under a key that is NaN (the result of 0/0).",
            "Bir şeyi NaN (0/0 işleminin sonucu) olan bir anahtarın altına kaydettin.",
          )
        : tx(
            `You stored something in a table under ${key ? q(key) : "a key"}, but that key was nil.`,
            `Bir tabloya ${key ? q(key) : "bir anahtar"} altında bir şey kaydettin, ama o anahtar nil'di.`,
          ),
      explanation: nan
        ? tx(
            "NaN (not-a-number) comes from maths like 0/0. It can't be a table key. Guard the division.",
            "NaN (sayı-değil) 0/0 gibi işlemlerden çıkar. Tablo anahtarı olamaz. Bölme işlemini kontrol altına al.",
          )
        : tx(
            "Every table entry needs a key. `t[nil] = value` isn't allowed, so the variable you used as the key must have been nil.",
            "Tablodaki her kaydın bir anahtarı olmalı. `t[nil] = value` yazılamaz, yani anahtar olarak kullandığın değişken nil'miş.",
          ),
      location: locationOf(located, key),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        cause(
          tx(
            "The key variable is nil (e.g. player.UserId on a nil player, or a missing name)",
            "Anahtar değişkeni nil (örneğin nil olan bir oyuncunun player.UserId'si ya da eksik bir isim)",
          ),
          "likely",
        ),
      ]),
      steps: [
        key
          ? tx(`Print ${q(key)} right before that line.`, `O satırdan hemen önce ${q(key)} yazdır.`)
          : tx("Print the key before the assignment.", "Atamadan önce anahtarı yazdır."),
        tx(
          "Skip the assignment when the key is missing: `if key == nil then return end`.",
          "Anahtar yoksa atamayı atla: `if key == nil then return end`.",
        ),
      ],
      fixCode: key ? { after: `if ${key} ~= nil then\n\t${located?.text}\nend` } : undefined,
      docs: docs("table"),
      evidence,
    });
  },
};

const FOR_PART_TR: Record<string, string> = {
  "initial value": "başlangıç değeri",
  limit: "bitiş değeri",
  step: "artış miktarı",
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
    const partTr = FOR_PART_TR[m[1]] ?? m[1];
    return result({
      title: tx(`for-loop ${m[1]} is ${m[3]}`, `for döngüsünün ${partTr} ${trType(m[3])}`),
      severity: "Medium",
      summary: tx(
        `The ${m[1]} of a numeric for-loop must be a number, but it was ${m[3]}${culprit ? ` (${q(culprit)})` : ""}.`,
        `Sayılı bir for döngüsünün ${partTr} bir sayı olmalı, ama ${trType(m[3])} idi${culprit ? ` (${q(culprit)})` : ""}.`,
      ),
      explanation: tx(
        "In `for i = start, finish, step do`, all three parts must be numbers.",
        "`for i = başlangıç, bitiş, artış do` içinde üç kısım da sayı olmalı.",
      ),
      location: locationOf(located, culprit),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        cause(
          m[3] === "string"
            ? tx(
                "The value is text — convert it with tonumber()",
                "Değer bir metin — tonumber() ile sayıya çevir",
              )
            : tx("The value was never set", "Değer hiç atanmamış"),
          "likely",
        ),
      ]),
      steps: [
        tx(
          "Print the loop bounds before the loop.",
          "Döngüden önce başlangıç ve bitiş değerlerini yazdır.",
        ),
        tx(
          "Convert with tonumber() or give a default with `or 0`.",
          "tonumber() ile çevir ya da `or 0` ile varsayılan bir değer ver.",
        ),
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
        evidence.push(
          ev(
            8,
            tx(
              `the call on line ${located.line} passes fewer than ${n} arguments`,
              `${located.line}. satırdaki çağrıya ${n} değerden az değer veriliyor`,
            ),
          ),
        );
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
        tx(
          "math.random(min, max) was called with min bigger than max",
          "math.random(min, max) çağrısında min, max'tan büyük",
        ),
        "likely",
        tx(
          "e.g. math.random(10, 1). Swap them, or check the numbers you compute.",
          "örneğin math.random(10, 1). Yerlerini değiştir ya da hesapladığın sayıları kontrol et.",
        ),
        Boolean(located),
      ),
    );
  }
  if ((fn === "ipairs" || fn === "pairs") && got === "nil") {
    specific.push(
      cause(
        tx("The table you're looping over is nil", "Döngüyle gezdiğin tablo nil"),
        "likely",
        tx(
          "Maybe a function returned nothing or a data table is missing a field.",
          "Belki bir fonksiyon hiçbir şey döndürmedi ya da bir veri tablosunda bir alan eksik.",
        ),
      ),
    );
  }
  if (fn === "new" && got === "string") {
    specific.push(
      cause(
        tx(
          "A number was given as text (e.g. from a TextBox)",
          "Bir sayı metin olarak verilmiş (örneğin bir TextBox'tan)",
        ),
        "likely",
        tx("Wrap it in tonumber().", "tonumber() içine al."),
      ),
    );
  }
  if (fn === "insert" && got === "nil") {
    specific.push(
      cause(
        tx("The table you're inserting into doesn't exist yet", "Ekleme yaptığın tablo henüz yok"),
        "likely",
        tx("Create it first: `list = list or {}`.", "Önce oluştur: `list = list or {}`."),
      ),
    );
  }
  if (got === "Instance" && expected === "string") {
    specific.push(
      cause(
        tx(
          "You passed an object where a name/text is needed — use obj.Name",
          "İsim/metin gereken yere bir obje verdin — obj.Name kullan",
        ),
        "likely",
      ),
    );
  }

  const argText = arg ? ` (${q(arg)})` : "";
  const gotText = got
    ? got === "nil"
      ? tx("nil (missing)", "nil (eksik)")
      : an(got)
    : tx("missing", "eksik");
  return result({
    title: tx(`Wrong value passed to ${fn}()`, `${fn}() fonksiyonuna yanlış değer verildi`),
    severity: "Medium",
    summary:
      extra && !expected
        ? tx(
            `${fn}() rejected its ${ordinal(n)} argument: ${extra}.`,
            `${fn}() ${n}. değerini kabul etmedi ("${extra}").`,
          )
        : tx(
            `The ${ordinal(n)} value you gave to ${q(fn + "()")}${argText} should be a ${expected ?? "different type"}, but it was ${gotText}.`,
            `${q(fn + "()")} fonksiyonuna verdiğin ${n}. değer${argText} ${expected ? trType(expected) : "farklı bir türde"} olmalıydı, ama ${gotText} idi.`,
          ),
    explanation: tx(
      `Functions check what you pass in. ${q(fn)} needs a ${expected ?? "valid value"} as argument #${n}. Look at what you're passing and convert or check it before the call.`,
      `Fonksiyonlar kendilerine verilen değerleri kontrol eder. ${q(fn)}, ${n}. değer olarak ${expected ? trType(expected) : "geçerli bir değer"} ister. Ne verdiğine bak ve çağırmadan önce onu çevir ya da kontrol et.`,
    ),
    location: locationOf(located, arg),
    causes: rankCauses([
      ...(traced ? [traced.cause] : []),
      ...specific,
      cause(
        got === "nil"
          ? tx(
              "The variable you passed is nil (not set yet, or a lookup failed)",
              "Verdiğin değişken nil (henüz atanmamış ya da bir arama başarısız olmuş)",
            )
          : tx(
              `You passed a ${got ?? "wrong value"} instead of a ${expected ?? "valid value"}`,
              `${expected ? trType(expected) : "Geçerli bir değer"} yerine ${got ? trType(got) : "yanlış bir değer"} verdin`,
            ),
        "possible",
      ),
    ]),
    steps: [
      arg
        ? tx(
            `Print ${q(arg)} and \`typeof(${arg})\` right before the call.`,
            `Çağrıdan hemen önce ${q(arg)} ve \`typeof(${arg})\` yazdır.`,
          )
        : tx(
            "Print the arguments right before the call.",
            "Çağrıdan hemen önce verdiğin değerleri yazdır.",
          ),
      tx(
        "Convert or validate the value (tonumber, tostring, `or default`).",
        "Değeri çevir ya da kontrol et (tonumber, tostring, `or varsayılan`).",
      ),
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
        if (!arg)
          evidence.push(
            ev(
              10,
              tx(
                `${method}() is called with fewer than ${n} argument(s)`,
                `${method}() ${n} değerden az değerle çağrılıyor`,
              ),
            ),
          );
        else if (/^[A-Za-z_][\w.]*$/.test(arg))
          traced = traceNilExpression(arg, ctx.code, located.line, ctx.side);
        if (traced) evidence.push(ev(traced.points, traced.reason));
      }
    }
    const specific: DiagnosisCause[] = [];
    if (method === "FireClient" && n === 1)
      specific.push(
        cause(
          tx(
            "FireClient needs the Player as its first argument",
            "FireClient ilk değer olarak Player ister",
          ),
          "likely",
          tx(
            "`remote:FireClient(player, data)`. To send to everyone use FireAllClients(data).",
            "`remote:FireClient(player, data)`. Herkese göndermek için FireAllClients(data) kullan.",
          ),
          true,
        ),
      );
    if (method === "SetAsync" && n === 2)
      specific.push(
        cause(
          tx(
            "SetAsync(key, value) was called without a value (or the value is nil)",
            "SetAsync(key, value) değer verilmeden çağrıldı (ya da değer nil)",
          ),
          "likely",
          tx(
            "To delete a key use RemoveAsync(key) instead.",
            "Bir anahtarı silmek için bunun yerine RemoveAsync(key) kullan.",
          ),
          true,
        ),
      );
    return result({
      title: tx(
        `${method ? `${method}()` : "A Roblox function"} is missing argument #${n}`,
        `${method ? `${method}()` : "Bir Roblox fonksiyonu"} için ${n}. değer eksik`,
      ),
      severity: "Medium",
      summary: tx(
        `${method ? q(method + "()") : "A Roblox API call"} needs an argument #${n}, but it was missing or nil${arg ? ` (${q(arg)})` : ""}.`,
        `${method ? q(method + "()") : "Bir Roblox API çağrısı"} ${n}. değeri ister, ama bu değer eksik ya da nil${arg ? ` (${q(arg)})` : ""}.`,
      ),
      explanation: tx(
        "Roblox functions check their inputs. You either left the argument out, or the variable you passed was nil at that moment.",
        "Roblox fonksiyonları kendilerine verilen değerleri kontrol eder. Ya değeri hiç yazmadın, ya da verdiğin değişken o anda nil'di.",
      ),
      location: locationOf(located, arg),
      causes: rankCauses([
        ...(traced ? [traced.cause] : []),
        ...specific,
        cause(tx("The variable you passed is nil", "Verdiğin değişken nil"), "possible"),
        cause(tx("The argument was left out", "Değer hiç yazılmamış"), "possible"),
      ]),
      steps: [
        tx(
          "Check the function's parameters in the Roblox docs.",
          "Fonksiyonun parametrelerini Roblox belgelerinden kontrol et.",
        ),
        tx(
          "Print the value you pass right before the call.",
          "Verdiğin değeri çağrıdan hemen önce yazdır.",
        ),
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
