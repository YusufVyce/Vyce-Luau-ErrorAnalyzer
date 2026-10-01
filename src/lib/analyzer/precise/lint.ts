/**
 * Static checks over a pasted Luau snippet. Each rule targets a specific,
 * well-known Roblox mistake and is written to stay quiet unless the pattern is
 * clearly present — a noisy linter trains people to ignore it.
 */
import {
  closest,
  declaredNames,
  escapeRegExp,
  KNOWN_GLOBALS,
  sanitizeCode,
  sideFromCode,
  sideFromPath,
  splitLines,
  type Side,
} from "./codeTools";
import { parse } from "@/lib/luau/parser";
import { tx } from "./lang";
import type { CodeWarning } from "./types";

const OPENERS = /\b(function|do|if|repeat)\b/g;
const CLOSERS = /\b(end|until)\b/g;

function blockDelta(line: string): number {
  // `elseif` contains `if` but doesn't open a block; strip it first.
  const cleaned = line.replace(/\belseif\b/g, " ");
  const opens = (cleaned.match(OPENERS) ?? []).length;
  const closes = (cleaned.match(CLOSERS) ?? []).length;
  // `while x do` / `for ... do` count once via `do`; `if` opens, `then` doesn't.
  return opens - closes;
}

/** Index (0-based) of the line that closes the block opened on `start`, or -1. */
export function findBlockEnd(cleanLines: string[], start: number): number {
  let depth = 0;
  for (let i = start; i < cleanLines.length; i++) {
    depth += blockDelta(cleanLines[i]);
    if (i === start && depth <= 0) return i; // one-line block: `while x do task.wait() end`
    if (depth <= 0) return i;
  }
  return -1;
}

const YIELD =
  /\b(task\.wait|wait|task\.delay)\s*\(|:Wait\s*\(|\.Heartbeat:Wait|\.RenderStepped:Wait|\.Stepped:Wait|WaitForChild\s*\(|Async\s*\(|:Invoke(Server|Client)\s*\(/;

export interface LoopWithoutYield {
  line: number;
  text: string;
}

export function findLoopsWithoutYield(code: string): LoopWithoutYield[] {
  const raw = splitLines(code);
  const clean = splitLines(sanitizeCode(code));
  const out: LoopWithoutYield[] = [];
  for (let i = 0; i < clean.length; i++) {
    const text = clean[i];
    const isWhile = /^\s*while\b.*\bdo\b/.test(text);
    const isRepeat = /^\s*repeat\b/.test(text);
    if (!isWhile && !isRepeat) continue;
    // `while task.wait() do` / `while wait(1) do` yield in the condition itself.
    if (isWhile && YIELD.test(text.replace(/\bdo\b.*$/, ""))) continue;
    let endIdx: number;
    if (isRepeat) {
      endIdx = -1;
      let depth = 0;
      for (let j = i; j < clean.length; j++) {
        depth += blockDelta(clean[j]);
        if (depth <= 0) {
          endIdx = j;
          break;
        }
      }
    } else {
      endIdx = findBlockEnd(clean, i);
    }
    if (endIdx === -1) continue;
    const body = clean.slice(i, endIdx + 1).join("\n");
    const bodyWithoutCondition = isWhile ? body.replace(/^\s*while\b[\s\S]*?\bdo\b/, "") : body;
    if (!YIELD.test(bodyWithoutCondition) && !/\bbreak\b|\breturn\b/.test(bodyWithoutCondition)) {
      out.push({ line: i + 1, text: raw[i].trim() });
    }
  }
  return out;
}

const TYPE_NAMES = new Set([
  "number",
  "boolean",
  "any",
  "never",
  "unknown",
  "nil",
  "userdata",
  "thread",
  "vector",
  "self",
]);

const PLAYER_PARAM =
  /^(_|p|plr|player\w*|\w*player|sender|client|who|user|caller|localplayer|owner)$/i;

export function lintCode(code: string, scriptPath?: string): CodeWarning[] {
  if (!code || !code.trim()) return [];
  const raw = splitLines(code);
  const clean = splitLines(sanitizeCode(code));
  const cleanAll = clean.join("\n");
  const warnings: CodeWarning[] = [];
  const push = (w: CodeWarning) => {
    if (!warnings.some((x) => x.id === w.id && x.line === w.line)) warnings.push(w);
  };
  const pathSide = sideFromPath(scriptPath);
  const codeSide: Side = pathSide !== "unknown" ? pathSide : sideFromCode(code);

  // --- Syntax slips people bring over from other languages -----------------
  clean.forEach((line, i) => {
    const ln = i + 1;
    if (
      /^\s*(if|elseif|while)\b/.test(line) &&
      /[^=~<>!]=[^=]/.test(
        line.replace(/^\s*(if|elseif|while)\b/, " ").replace(/\b(then|do)\b.*$/, ""),
      )
    ) {
      push({
        id: "single-equals-condition",
        title: tx("`=` used inside a condition", "Koşulun içinde `=` kullanılmış"),
        message: tx(
          "Inside if/while you compare with `==`. A single `=` is assignment and is a syntax error here.",
          "if/while içinde `==` ile karşılaştırılır. Tek `=` atama demektir ve burada yazım hatasıdır.",
        ),
        line: ln,
        severity: "error",
        fix: raw[i].trim().replace(/([^=~<>!])=([^=])/, "$1==$2"),
      });
    }
    if (/!=/.test(line)) {
      push({
        id: "not-equals",
        title: tx("`!=` isn't Luau", "`!=` Luau'da yok"),
        message: tx('Luau writes "not equal" as `~=`.', 'Luau\'da "eşit değil" `~=` ile yazılır.'),
        line: ln,
        severity: "error",
        fix: raw[i].trim().replace(/!=/g, "~="),
      });
    }
    if (/&&|\|\|/.test(line)) {
      push({
        id: "js-logic",
        title: tx("`&&` / `||` aren't Luau", "`&&` / `||` Luau'da yok"),
        message: tx(
          "Use the words `and` / `or` instead.",
          "Bunların yerine `and` / `or` kelimelerini kullan.",
        ),
        line: ln,
        severity: "error",
        fix: raw[i].trim().replace(/&&/g, "and").replace(/\|\|/g, "or"),
      });
    }
    if (/^\s*\/\//.test(raw[i])) {
      push({
        id: "js-comment",
        title: tx("`//` is not a comment", "`//` yorum satırı değildir"),
        message: tx(
          "Luau comments start with `--`. `//` is the floor-division operator.",
          "Luau'da yorumlar `--` ile başlar. `//` tam sayı bölme işaretidir.",
        ),
        line: ln,
        severity: "error",
        fix: raw[i].replace("//", "--").trim(),
      });
    }
  });

  // --- Real syntax check (same parser the simulator uses) -------------------
  const syntax = parse(code);
  if (syntax.error) {
    const partial = /<eof>|'end'|'until'/.test(syntax.error.message);
    push({
      id: "syntax-error",
      title: tx(
        `Luau can't read line ${syntax.error.line}`,
        `Luau ${syntax.error.line}. satırı okuyamıyor`,
      ),
      message: tx(
        `${syntax.error.message}.${partial ? " (If you pasted only part of a script, this can be expected — otherwise a block is missing its end.)" : " The whole script won't run until this is fixed."}`,
        `${syntax.error.message}.${partial ? " (Scriptin sadece bir kısmını yapıştırdıysan bu normal olabilir — yoksa bir bloğun end'i eksik.)" : " Bu düzeltilene kadar scriptin hiçbir kısmı çalışmaz."}`,
      ),
      line: syntax.error.line,
      severity: "error",
    });
  }

  // --- Loops that never yield ------------------------------------------------
  for (const loop of findLoopsWithoutYield(code)) {
    push({
      id: "loop-without-yield",
      title: tx("Loop never waits", "Döngü hiç beklemiyor"),
      message: tx(
        'This loop has no task.wait() inside, so it can freeze the game and end with "Script timeout: exhausted allowed execution time".',
        'Bu döngünün içinde task.wait() yok, bu yüzden oyunu dondurabilir ve "Script timeout: exhausted allowed execution time" hatasıyla bitebilir.',
      ),
      line: loop.line,
      severity: "error",
      fix: tx(
        "Add task.wait() inside the loop (for example at the end of each iteration).",
        "Döngünün içine task.wait() ekle (örneğin her turun sonuna).",
      ),
    });
  }

  // --- Deprecated APIs ------------------------------------------------------
  clean.forEach((line, i) => {
    const ln = i + 1;
    if (/(^|[^.:\w])wait\s*\(/.test(line)) {
      push({
        id: "deprecated-wait",
        title: tx("wait() is deprecated", "wait() artık kullanılmıyor"),
        message: tx(
          "Use task.wait() — it's more accurate and doesn't throttle.",
          "task.wait() kullan — daha doğru çalışır ve yavaşlamaz.",
        ),
        line: ln,
        severity: "info",
        fix: raw[i].trim().replace(/(^|[^.:\w])wait\s*\(/, "$1task.wait("),
      });
    }
    if (/(^|[^.:\w])(spawn|delay)\s*\(/.test(line)) {
      push({
        id: "deprecated-spawn",
        title: tx("spawn()/delay() are deprecated", "spawn()/delay() artık kullanılmıyor"),
        message: tx("Use task.spawn() / task.delay().", "task.spawn() / task.delay() kullan."),
        line: ln,
        severity: "info",
      });
    }
    if (/humanoid\w*\s*:\s*LoadAnimation\s*\(/i.test(line)) {
      push({
        id: "humanoid-loadanimation",
        title: tx(
          "Humanoid:LoadAnimation is deprecated",
          "Humanoid:LoadAnimation artık kullanılmıyor",
        ),
        message: tx(
          "Load animations on the Animator inside the Humanoid instead.",
          "Animasyonları bunun yerine Humanoid'in içindeki Animator'a yükle.",
        ),
        line: ln,
        severity: "info",
        fix: 'local animator = humanoid:WaitForChild("Animator")\nlocal track = animator:LoadAnimation(animation)',
      });
    }
  });

  // --- Nil-prone patterns ---------------------------------------------------
  clean.forEach((line, i) => {
    const ln = i + 1;
    if (/FindFirstChild\w*\s*\([^()]*\)\s*[.:]\s*\w/.test(line)) {
      push({
        id: "findfirstchild-chain",
        title: tx(
          "FindFirstChild result used without a check",
          "FindFirstChild sonucu kontrol edilmeden kullanılmış",
        ),
        message: tx(
          'FindFirstChild returns nil when the child doesn\'t exist, so chaining straight off it can throw "attempt to index nil".',
          'Alt obje yoksa FindFirstChild nil döndürür, bu yüzden sonucunu doğrudan kullanmak "attempt to index nil" hatası verebilir.',
        ),
        line: ln,
        severity: "warning",
        fix: tx(
          "Store it in a variable and check `if child then ... end` first.",
          "Sonucu bir değişkene koy ve önce `if child then ... end` ile kontrol et.",
        ),
      });
    }
    if (
      /LocalPlayer\s*\.\s*Character\s*[.:]/.test(line) ||
      /=\s*[\w.]*Player\w*\s*\.\s*Character\s*$/.test(line.trim())
    ) {
      if (!/CharacterAdded/.test(line)) {
        push({
          id: "character-not-ready",
          title: tx("Character may not exist yet", "Karakter henüz olmayabilir"),
          message: tx(
            "player.Character is nil until the character spawns (and for a moment after respawning).",
            "Karakter doğana kadar (ve yeniden doğduktan sonra kısa bir süre) player.Character nil'dir.",
          ),
          line: ln,
          severity: "warning",
          fix: "local character = player.Character or player.CharacterAdded:Wait()",
        });
      }
    }
  });

  if (codeSide === "server" && /\bLocalPlayer\b/.test(cleanAll)) {
    const idx = clean.findIndex((l) => /\bLocalPlayer\b/.test(l));
    push({
      id: "localplayer-on-server",
      title: tx("LocalPlayer on the server", "Sunucuda LocalPlayer"),
      message: tx(
        "Players.LocalPlayer only exists in LocalScripts. In a server Script it is always nil — get the player from an event (PlayerAdded, OnServerEvent, Touched → GetPlayerFromCharacter).",
        "Players.LocalPlayer sadece LocalScript'lerde vardır. Bir sunucu Script'inde her zaman nil'dir — oyuncuyu bir event'ten al (PlayerAdded, OnServerEvent, Touched → GetPlayerFromCharacter).",
      ),
      line: idx + 1,
      severity: "error",
    });
  }

  // --- Remotes --------------------------------------------------------------
  clean.forEach((line, i) => {
    const handler = line.match(
      /OnServerEvent\s*:\s*Connect\s*\(\s*function\s*\(\s*([A-Za-z_]\w*)?/,
    );
    if (handler && handler[1] && !PLAYER_PARAM.test(handler[1])) {
      push({
        id: "onserverevent-player-param",
        title: tx(
          "OnServerEvent's first parameter is the player",
          "OnServerEvent'in ilk parametresi oyuncudur",
        ),
        message: tx(
          `Roblox always passes the player who fired the event first. Here \`${handler[1]}\` will be that Player, not your data.`,
          `Roblox, event'i gönderen oyuncuyu her zaman ilk sırada verir. Burada \`${handler[1]}\` senin verin değil, o Player olacak.`,
        ),
        line: i + 1,
        severity: "error",
        fix: raw[i].trim().replace(/function\s*\(\s*/, "function(player, "),
      });
    }
    const fire = line.match(/:\s*FireServer\s*\(\s*(\w+)/);
    if (fire && /^(player|plr|localplayer)$/i.test(fire[1])) {
      push({
        id: "fireserver-player-arg",
        title: tx("Don't pass the player to FireServer", "FireServer'a oyuncuyu verme"),
        message: tx(
          "The server already receives the player automatically as the first argument, so it will get the player twice and your data shifts by one.",
          "Sunucu oyuncuyu zaten otomatik olarak ilk değer olarak alır; oyuncuyu iki kez almış olur ve verilerin bir sıra kayar.",
        ),
        line: i + 1,
        severity: "warning",
      });
    }
  });

  // Server trusting a number sent by the client.
  clean.forEach((line, i) => {
    const handler = line.match(/OnServerEvent\s*:\s*Connect\s*\(\s*function\s*\(([^)]*)\)/);
    if (!handler) return;
    const params = handler[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(1);
    if (params.length === 0) return;
    const end = findBlockEnd(clean, i);
    const body = clean.slice(i + 1, end === -1 ? Math.min(clean.length, i + 20) : end).join("\n");
    const trusted = params.find((p) =>
      new RegExp(`\\.Value\\s*(?:[+-]?=)\\s*[^\\n]*\\b${escapeRegExp(p)}\\b`).test(body),
    );
    if (trusted) {
      push({
        id: "trusts-client-value",
        title: tx(
          "Server trusts a value from the client",
          "Sunucu istemciden gelen bir değere güveniyor",
        ),
        message: tx(
          `\`${trusted}\` comes straight from the client. Exploiters can send any number, so never add it to stats directly — compute rewards on the server.`,
          `\`${trusted}\` doğrudan istemciden geliyor. Hile yapanlar istedikleri sayıyı gönderebilir, bu yüzden onu asla doğrudan istatistiklere ekleme — ödülleri sunucuda hesapla.`,
        ),
        line: i + 1,
        severity: "warning",
      });
    }
  });

  // --- DataStores -----------------------------------------------------------
  clean.forEach((line, i) => {
    if (!/:\s*(GetAsync|SetAsync|UpdateAsync|RemoveAsync|IncrementAsync)\s*\(/.test(line)) return;
    if (/HttpService|http/i.test(line)) return;
    const window = clean.slice(Math.max(0, i - 3), i + 1).join("\n");
    if (!/pcall\s*\(/.test(window)) {
      push({
        id: "datastore-no-pcall",
        title: tx("DataStore call without pcall", "pcall olmadan DataStore çağrısı"),
        message: tx(
          "DataStore requests can fail (outages, rate limits). Without pcall one failure errors the whole script — and can lose player data.",
          "DataStore istekleri başarısız olabilir (kesintiler, istek sınırları). pcall olmadan tek bir hata bütün scripti durdurur — ve oyuncu verisinin kaybolmasına yol açabilir.",
        ),
        line: i + 1,
        severity: "warning",
        fix: "local ok, result = pcall(function()\n\treturn store:GetAsync(key)\nend)",
      });
    }
  });
  if (
    /PlayerRemoving/.test(cleanAll) &&
    /(SetAsync|UpdateAsync)/.test(cleanAll) &&
    !/BindToClose/.test(cleanAll)
  ) {
    push({
      id: "no-bindtoclose",
      title: tx("No game:BindToClose", "game:BindToClose yok"),
      message: tx(
        "When a server shuts down, PlayerRemoving may not finish saving. Save everyone in game:BindToClose too.",
        "Bir sunucu kapanırken PlayerRemoving kaydetmeyi bitiremeyebilir. Herkesi game:BindToClose içinde de kaydet.",
      ),
      severity: "info",
    });
  }

  // --- leaderstats naming ---------------------------------------------------
  raw.forEach((line, i) => {
    const m = line.match(/\.Name\s*=\s*["']([^"']+)["']/);
    if (m && m[1] !== "leaderstats" && m[1].toLowerCase().replace(/[\s_]/g, "") === "leaderstats") {
      push({
        id: "leaderstats-name",
        title: tx(`"${m[1]}" should be "leaderstats"`, `"${m[1]}" yerine "leaderstats" olmalı`),
        message: tx(
          "The leaderboard only appears if the folder is named exactly `leaderstats` (all lowercase).",
          "Skor tablosu sadece Folder'ın adı tam olarak `leaderstats` (hepsi küçük harf) ise görünür.",
        ),
        line: i + 1,
        severity: "error",
        fix: line.trim().replace(m[1], "leaderstats"),
      });
    }
  });

  // --- Forgot .Value on a value object --------------------------------------
  const valueVars = new Map<string, number>();
  clean.forEach((line, i) => {
    const m = line.match(
      /^\s*local\s+(\w+)\s*=\s*.*(?:leaderstats\s*\.\s*\w+|leaderstats\s*:\s*(?:WaitForChild|FindFirstChild)\s*\([^)]*\))\s*$/,
    );
    if (m) valueVars.set(m[1], i);
  });
  for (const [name, declaredAt] of valueVars) {
    const n = escapeRegExp(name);
    const misuse = new RegExp(
      `(?:\\b${n}\\b\\s*(?:[+\\-*/%<>]=?|\\.\\.)(?!\\s*\\.)|(?:[+\\-*/%<>]=?|\\.\\.)\\s*\\b${n}\\b(?!\\s*[.:]))`,
    );
    for (let i = declaredAt + 1; i < clean.length; i++) {
      if (misuse.test(clean[i]) && !new RegExp(`\\b${n}\\s*\\.\\s*Value`).test(clean[i])) {
        push({
          id: "missing-value",
          title: tx(`Use ${name}.Value`, `${name}.Value kullan`),
          message: tx(
            `\`${name}\` is an IntValue/NumberValue object, not a number. Read and change its \`.Value\`.`,
            `\`${name}\` bir sayı değil, bir IntValue/NumberValue objesi. Onun \`.Value\` değerini oku ve değiştir.`,
          ),
          line: i + 1,
          severity: "error",
          fix: raw[i].trim().replace(new RegExp(`\\b${n}\\b(?!\\s*\\.)`, "g"), `${name}.Value`),
        });
        break;
      }
    }
  }

  // --- StarterGui edits at runtime ------------------------------------------
  clean.forEach((line, i) => {
    if (/StarterGui\s*\.\s*\w+[\w.]*\s*\.\s*(Visible|Text|Enabled|Image)\s*=/.test(line)) {
      push({
        id: "startergui-runtime",
        title: tx(
          "Editing StarterGui doesn't change the player's screen",
          "StarterGui'yi değiştirmek oyuncunun ekranını değiştirmez",
        ),
        message: tx(
          "StarterGui is only a template copied into each player's PlayerGui when they spawn. Change player.PlayerGui instead.",
          "StarterGui sadece, oyuncu doğduğunda onun PlayerGui'sine kopyalanan bir şablondur. Bunun yerine player.PlayerGui'yi değiştir.",
        ),
        line: i + 1,
        severity: "warning",
        fix: 'local gui = player:WaitForChild("PlayerGui")',
      });
    }
  });

  // --- Modules --------------------------------------------------------------
  const moduleTable = cleanAll.match(/^local\s+(\w+)\s*=\s*\{\s*\}/m);
  if (
    moduleTable &&
    new RegExp(`^function\\s+${moduleTable[1]}[.:]`, "m").test(cleanAll) &&
    !/^return\b/m.test(cleanAll)
  ) {
    push({
      id: "module-no-return",
      title: tx("ModuleScript never returns its table", "ModuleScript tablosunu hiç döndürmüyor"),
      message: tx(
        `Add \`return ${moduleTable[1]}\` as the last line, otherwise require() fails with "Module code did not return exactly one value".`,
        `Son satıra \`return ${moduleTable[1]}\` ekle, yoksa require() "Module code did not return exactly one value" hatası verir.`,
      ),
      severity: "warning",
      fix: `return ${moduleTable[1]}`,
    });
  }

  // --- Names used before they exist ----------------------------------------
  const declared = declaredNames(code);
  const localFnDecl = new Map<string, number>();
  clean.forEach((line, i) => {
    const m = line.match(/^\s*local\s+function\s+(\w+)|^\s*local\s+(\w+)\s*=\s*function\b/);
    if (m) {
      const name = m[1] ?? m[2];
      if (!localFnDecl.has(name)) localFnDecl.set(name, i);
    }
  });
  for (const [name, declLine] of localFnDecl) {
    const call = new RegExp(`(^|[^.:\\w])${escapeRegExp(name)}\\s*\\(`);
    for (let i = 0; i < declLine; i++) {
      if (
        call.test(clean[i]) &&
        !new RegExp(`\\blocal\\s+${escapeRegExp(name)}\\b`).test(clean[i])
      ) {
        push({
          id: "used-before-defined",
          title: tx(
            `${name}() is called before it's defined`,
            `${name}() tanımlanmadan önce çağrılıyor`,
          ),
          message: tx(
            `\`local function ${name}\` is on line ${declLine + 1}, but it's used on line ${i + 1}. Locals only exist below their declaration, so the call hits nil ("attempt to call a nil value").`,
            `\`local function ${name}\` ${declLine + 1}. satırda, ama ${i + 1}. satırda kullanılıyor. Local'ler sadece tanımlandıkları satırın altında vardır, bu yüzden çağrı nil'e denk gelir ("attempt to call a nil value").`,
          ),
          line: i + 1,
          severity: "error",
          fix: tx(
            `Move \`local function ${name}\` above line ${i + 1}.`,
            `\`local function ${name}\` tanımını ${i + 1}. satırın üstüne taşı.`,
          ),
        });
        break;
      }
    }
  }

  // Typos: identifiers that are never declared but are one or two letters off a declared one.
  const usedIds = new Map<string, number>();
  clean.forEach((line, i) => {
    const noTableKeys = line.replace(/([{,]\s*)[A-Za-z_]\w*\s*=(?!=)/g, "$1");
    for (const m of noTableKeys.matchAll(/(^|[^.:\w])([A-Za-z_]\w*)\b(?!\s*=[^=])/g)) {
      const id = m[2];
      if (!usedIds.has(id)) usedIds.set(id, i);
    }
  });
  for (const [id, lineIdx] of usedIds) {
    if (declared.has(id) || KNOWN_GLOBALS.has(id) || TYPE_NAMES.has(id) || id.length < 3) continue;
    const suggestion = closest(id, declared) ?? closest(id, KNOWN_GLOBALS);
    // `items` vs `item` is usually two different variables, not a typo.
    const pluralPair = suggestion && (suggestion === `${id}s` || id === `${suggestion}s`);
    if (suggestion && suggestion.length >= 3 && !pluralPair) {
      push({
        id: "possible-typo",
        title: tx(
          `\`${id}\` is never defined — typo of \`${suggestion}\`?`,
          `\`${id}\` hiç tanımlanmamış — \`${suggestion}\` yanlış mı yazıldı?`,
        ),
        message: tx(
          `Nothing in the snippet creates \`${id}\`, so it's nil. Names in Luau are case-sensitive.`,
          `Kodda \`${id}\` adında bir şey oluşturulmuyor, bu yüzden nil. Luau'da isimler büyük/küçük harfe duyarlıdır.`,
        ),
        line: lineIdx + 1,
        severity: "error",
        fix: raw[lineIdx].trim().replace(new RegExp(`\\b${escapeRegExp(id)}\\b`), suggestion),
      });
    }
  }

  // Connections created inside a loop pile up.
  clean.forEach((line, i) => {
    if (!/^\s*(while\b.*\bdo|for\b.*\bdo)\b/.test(line)) return;
    const end = findBlockEnd(clean, i);
    if (end <= i) return;
    const inner = clean.slice(i + 1, end);
    const idx = inner.findIndex((l) => /:\s*Connect\s*\(/.test(l));
    if (idx !== -1 && /^\s*while\b/.test(line)) {
      push({
        id: "connect-in-loop",
        title: tx("Connecting an event inside a loop", "Döngünün içinde event bağlanıyor"),
        message: tx(
          "Every loop iteration adds another connection, so the handler runs more and more times and leaks memory. Connect once, outside the loop.",
          "Döngünün her turu yeni bir bağlantı ekler, bu yüzden fonksiyon gittikçe daha çok kez çalışır ve bellek boşa harcanır. Döngünün dışında bir kez bağla.",
        ),
        line: i + 2 + idx,
        severity: "warning",
      });
    }
  });

  const order = { error: 0, warning: 1, info: 2 } as const;
  return warnings.sort(
    (a, b) => order[a.severity] - order[b.severity] || (a.line ?? 0) - (b.line ?? 0),
  );
}
