/**
 * Extra explanations aimed at people who are new to scripting: an everyday
 * analogy, a step-by-step walk through the failing expression, a mini
 * glossary, and the user's whole script with the fix applied.
 */
import { parse } from "@/lib/luau/parser";
import { escapeRegExp, sanitizeCode, splitLines } from "./codeTools";
import type { DiagnosisCategory, PreciseDiagnosis } from "./types";

export interface BreakdownStep {
  code: string;
  state: "ok" | "nil" | "error";
  note: string;
}

export interface GlossaryTerm {
  term: string;
  meaning: string;
}

const ANALOGIES: Partial<Record<DiagnosisCategory, string>> = {
  "index-nil":
    "It's like asking “what's written on the box?” when there is no box at all. Luau can't read a label from nothing.",
  "call-nil":
    "It's like pressing a button that was never built. The name exists in your code, but nothing is behind it yet.",
  arithmetic:
    "It's like trying to add 10 to a jar instead of to the number of coins inside the jar.",
  concatenate:
    "Joining text is like gluing words together — you can glue words and numbers, but not an empty space or an object.",
  compare: "It's like asking “is 5 bigger than nothing?” — there's no answer, so Luau stops.",
  "invalid-argument":
    "Functions are like machines with slots. You put the wrong thing (or nothing) into one of the slots.",
  "invalid-member":
    "It's like asking your backpack for a “Sword” when the item is called “sword”, or is still in the shop. Names must match exactly and the thing must be there.",
  "invalid-type":
    "Every property accepts one kind of value — like a USB slot that only fits USB plugs. You tried to plug in the wrong kind.",
  wait: "WaitForChild is like waiting at the door for a friend with a specific name. If nobody with that exact name ever comes, you wait forever.",
  timeout:
    "Roblox runs scripts one at a time. A loop that never pauses is like a person who never stops talking — nobody else gets a turn, so Roblox stops it.",
  "stack-overflow":
    "It's like two mirrors facing each other: the function keeps calling itself until there is no room left.",
  table:
    "A table is like a set of labeled drawers. You tried to use a drawer label that doesn't exist (nil), or a drawer that isn't there.",
  syntax:
    "A syntax error is a grammar mistake. Like a sentence missing a word, Luau can't understand the script, so none of it runs.",
  module:
    "A ModuleScript is like a recipe book other scripts borrow. If the book is empty (no return) or has a mistake, nobody can use it.",
  remote:
    "Remotes are one-way mail slots between the server and players. Each side has its own slot — you used the other side's.",
  datastore:
    "A DataStore is a locker in Roblox's cloud. Sometimes the locker room is closed (Studio settings) or too busy (too many requests).",
  http: "HttpService talks to websites outside Roblox. It needs permission, and the website has to answer correctly.",
  tween:
    "A tween slides a property from A to B. The goal has to be the same kind of value as the property, like sliding a size to another size.",
  animation:
    "Animations can only play on characters that are actually in the game world, and only if your game is allowed to use that animation.",
};

const GLOSSARY: Array<{ term: string; match: RegExp; meaning: string }> = [
  {
    term: "nil",
    match: /\bnil\b/i,
    meaning:
      "Luau's word for “nothing / no value”. Variables that were never set, missing table keys and failed lookups are nil.",
  },
  {
    term: "index",
    match: /\bindex(ing)?\b/i,
    meaning: 'Reading something with a dot or brackets, like player.Name or data["Coins"].',
  },
  {
    term: "property",
    match: /\bpropert(y|ies)\b/i,
    meaning: "A setting of an object shown in the Properties window, like Size, Color or Anchored.",
  },
  {
    term: "Instance",
    match: /\binstance\b/i,
    meaning: "Any object in the Explorer: parts, folders, scripts, players, GUIs…",
  },
  {
    term: "server",
    match: /\bserver\b/i,
    meaning: "Roblox's computer that runs the game for everyone. Script objects run here.",
  },
  {
    term: "client",
    match: /\bclient|LocalScript\b/i,
    meaning: "One player's device. LocalScripts run here and can use Players.LocalPlayer.",
  },
  {
    term: "LocalPlayer",
    match: /LocalPlayer/,
    meaning: "The player using this device. Only exists in LocalScripts — it's nil on the server.",
  },
  {
    term: "event",
    match: /\bevent|Touched|PlayerAdded|:Connect\b/i,
    meaning:
      "Something that happens in the game (a touch, a player joining). :Connect(function) runs your code when it happens.",
  },
  {
    term: "FindFirstChild",
    match: /FindFirstChild/,
    meaning: "Looks for a child by name and returns nil if it isn't there (it never waits).",
  },
  {
    term: "WaitForChild",
    match: /WaitForChild/,
    meaning:
      "Waits until a child with that exact name exists — useful for things that load a moment later.",
  },
  {
    term: "Character",
    match: /\bcharacter\b/i,
    meaning: "The 3D avatar model of a player in Workspace. It's nil until it spawns.",
  },
  {
    term: "Humanoid",
    match: /Humanoid/,
    meaning:
      "The object inside a character that has Health, WalkSpeed and makes it a living character.",
  },
  {
    term: "leaderstats",
    match: /leaderstats/i,
    meaning: "A Folder inside a Player; the values in it show on the leaderboard.",
  },
  {
    term: "RemoteEvent",
    match: /remote/i,
    meaning: "Lets LocalScripts and server Scripts send messages to each other.",
  },
  {
    term: "pcall",
    match: /pcall/,
    meaning:
      "Runs a function “safely”: if it errors, your script keeps running and you get the error message back.",
  },
  {
    term: "DataStore",
    match: /DataStore/,
    meaning: "Roblox's cloud storage for saving player progress between sessions.",
  },
  {
    term: "loop",
    match: /\bloop\b|while true/i,
    meaning: "Code that repeats (for, while, repeat). Endless loops need task.wait() inside.",
  },
  {
    term: "function",
    match: /\bfunction\b/i,
    meaning: "A named block of code you can run again and again by calling it with ().",
  },
  {
    term: "table",
    match: /\btable\b/i,
    meaning: "Luau's container for lists and key/value data, written with { }.",
  },
  { term: "string", match: /\bstring|text\b/i, meaning: 'Text in quotes, like "Hello".' },
  {
    term: "ModuleScript",
    match: /module/i,
    meaning:
      "A script that other scripts load with require(). It must return one value (usually a table).",
  },
  {
    term: "syntax",
    match: /syntax/i,
    meaning: "The grammar rules of the language: keywords, brackets, `end`s…",
  },
  {
    term: "tween",
    match: /tween/i,
    meaning: "A smooth animation of a property from one value to another over time.",
  },
];

const TOUCH_ANALOGY =
  "Touched is like a doorbell that rings for anyone — the mail carrier, a cat, a ball. Your code assumed it was always a player and asked for their Humanoid, but this time something else rang.";

export function analogyFor(category: DiagnosisCategory, title = ""): string | undefined {
  if (title.startsWith("hit.Parent isn't a character")) return TOUCH_ANALOGY;
  return ANALOGIES[category];
}

export function glossaryFor(
  d: Pick<PreciseDiagnosis, "title" | "summary" | "explanation" | "causes">,
): GlossaryTerm[] {
  const text = [
    d.title,
    d.summary,
    d.explanation,
    ...d.causes.map((c) => `${c.text} ${c.detail ?? ""}`),
  ].join(" ");
  return GLOSSARY.filter((g) => g.match.test(text))
    .slice(0, 6)
    .map(({ term, meaning }) => ({ term, meaning }));
}

/** Splits `player.Character:FindFirstChild("X").Humanoid` into its steps. */
function chainSegments(expr: string): string[] {
  const out: string[] = [];
  const re = /^[A-Za-z_]\w*|\.\s*[A-Za-z_]\w*|:\s*[A-Za-z_]\w*\s*\([^()]*\)|\[[^\]]+\]|\([^()]*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr))) out.push(m[0].replace(/\s+/g, ""));
  return out;
}

export function breakdownFor(d: PreciseDiagnosis, key?: string): BreakdownStep[] | undefined {
  const loc = d.location;
  if (!loc) return undefined;
  if (d.category === "index-nil" && loc.culprit && key) {
    const parts = chainSegments(loc.culprit);
    if (parts.length === 0) return undefined;
    const steps: BreakdownStep[] = [];
    parts.forEach((p, i) => {
      const last = i === parts.length - 1;
      steps.push({
        code: p,
        state: last ? "nil" : "ok",
        note: last
          ? i === 0
            ? `\`${p}\` has no value (nil) at this point`
            : `\`${parts.slice(0, i + 1).join("")}\` turned out to be nil`
          : i === 0
            ? `\`${p}\` exists`
            : `→ found \`${parts.slice(0, i + 1).join("")}\``,
      });
    });
    steps.push({
      code: `.${key}`,
      state: "error",
      note: `Luau can't read .${key} from nil → error`,
    });
    return steps;
  }
  if (d.category === "invalid-member" && loc.culprit) {
    const member = loc.culprit;
    const clean = loc.code;
    const re = new RegExp(`([A-Za-z_][\\w.:()"'\\[\\] ]*?)\\s*[.:]\\s*${escapeRegExp(member)}\\b`);
    const m = clean.match(re);
    const before = m ? chainSegments(m[1].trim()) : [];
    if (before.length === 0) return undefined;
    const steps: BreakdownStep[] = before.map((p, i) => ({
      code: p,
      state: "ok" as const,
      note: i === 0 ? `\`${p}\` exists` : `→ found \`${before.slice(0, i + 1).join("")}\``,
    }));
    // The error names the object Luau actually looked inside — show it.
    const owner = d.message.match(/is not a valid member of (\w+)(?: "([^"]*)")?/);
    if (owner) {
      const last = steps[steps.length - 1];
      last.note += ` — it's the ${owner[1]}${owner[2] && owner[2] !== owner[1] ? ` \`${owner[2]}\`` : ""}`;
    }
    steps.push({
      code: `.${member}`,
      state: "error",
      note: `there is nothing called “${member}” inside it → error`,
    });
    return steps;
  }
  return undefined;
}

/**
 * Applies the suggested fix to the user's whole script when the fix replaces
 * one concrete line. Returns undefined unless the patched script still parses.
 */
export function patchScript(
  code: string,
  d: PreciseDiagnosis,
): { code: string; changed: number[] } | undefined {
  const fix = d.fixCode;
  if (!fix?.before || !code.trim()) return undefined;
  if (fix.after.startsWith("--") && !fix.after.includes("\n")) return undefined;
  const lines = splitLines(code);
  const target = fix.before.trim();
  const idx = lines.findIndex((l) => l.trim() === target);
  if (idx === -1) return undefined;
  // Don't rename variables: if the old line declares `local x`, the new code must too.
  const declared = target.match(/^local\s+([A-Za-z_]\w*)/)?.[1];
  if (
    declared &&
    !new RegExp(`\\blocal\\s+(?:[A-Za-z_]\\w*\\s*,\\s*)*${escapeRegExp(declared)}\\b`).test(
      fix.after,
    ) &&
    !fix.after.trim().startsWith(target.split("=")[0].trim())
  ) {
    return undefined;
  }
  const indent = lines[idx].match(/^\s*/)![0];
  const replacement = fix.after.split("\n").map((l) => (l ? indent + l : l));
  const next = [...lines.slice(0, idx), ...replacement, ...lines.slice(idx + 1)];
  const patched = next.join("\n");
  if (patched === code) return undefined;
  if (parse(patched).error && !parse(code).error) return undefined;
  if (parse(patched).error) return undefined;
  return { code: patched, changed: replacement.map((_, i) => idx + i + 1) };
}

/** Real Luau syntax check for the pasted snippet. */
export function syntaxProblem(code: string): { line: number; message: string } | undefined {
  if (!code.trim()) return undefined;
  const r = parse(code);
  return r.error ? { line: r.error.line, message: r.error.message } : undefined;
}

export function lineText(code: string, line: number): string {
  return splitLines(code)[line - 1]?.trim() ?? "";
}

export { sanitizeCode };

// ---------------------------------------------------------------- Turkish

const ANALOGIES_TR: Partial<Record<DiagnosisCategory, string>> = {
  "index-nil":
    "Ortada hiç kutu yokken “kutunun üstünde ne yazıyor?” diye sormak gibi. Luau hiçlikten (nil) bir etiket okuyamaz.",
  "call-nil":
    "Hiç yapılmamış bir düğmeye basmak gibi. İsim kodunda var ama arkasında henüz hiçbir şey yok.",
  arithmetic:
    "Kavanozun içindeki para sayısına değil, kavanozun kendisine 10 eklemeye çalışmak gibi.",
  concatenate:
    "Metin birleştirmek kelimeleri yapıştırmak gibidir — kelime ve sayı yapıştırabilirsin ama boşluğu (nil) ya da bir objeyi yapıştıramazsın.",
  compare: "“5, hiçlikten büyük mü?” diye sormak gibi — cevabı yok, o yüzden Luau durur.",
  "invalid-argument":
    "Fonksiyonlar yuvaları olan makineler gibidir. Yuvalardan birine yanlış şeyi (ya da hiçbir şeyi) koydun.",
  "invalid-member":
    "Çantandan “Sword” isteyip eşyanın adının “sword” olması ya da hâlâ dükkânda durması gibi. İsimler birebir aynı olmalı ve eşya orada olmalı.",
  "invalid-type":
    "Her özellik tek bir türde değer kabul eder — sadece USB takılan bir yuva gibi. Yanlış türde bir şey takmaya çalıştın.",
  wait: "WaitForChild, kapıda belli bir isimdeki arkadaşını beklemek gibidir. O isimde kimse gelmezse sonsuza kadar beklersin.",
  timeout:
    "Roblox scriptleri sırayla çalıştırır. Hiç durmayan bir döngü, hiç susmayan biri gibidir — kimse söz alamaz, Roblox da onu durdurur.",
  "stack-overflow":
    "Karşılıklı duran iki ayna gibi: fonksiyon kendini çağırıp durur, sonunda yer kalmaz.",
  table:
    "Tablo etiketli çekmecelere benzer. Olmayan bir etiket (nil) ya da olmayan bir çekmece kullandın.",
  syntax:
    "Sözdizimi hatası bir dil bilgisi hatasıdır. Kelimesi eksik bir cümle gibi, Luau scripti anlayamaz ve hiçbir kısmı çalışmaz.",
  module:
    "ModuleScript, diğer scriptlerin ödünç aldığı bir tarif kitabı gibidir. Kitap boşsa (return yoksa) ya da hatalıysa kimse kullanamaz.",
  remote:
    "Remote'lar sunucu ile oyuncular arasındaki tek yönlü posta kutularıdır. Her tarafın kendi kutusu var — sen diğer tarafınkini kullandın.",
  datastore:
    "DataStore, Roblox bulutundaki bir dolap gibidir. Bazen dolap odası kapalıdır (Studio ayarları) ya da çok kalabalıktır (çok fazla istek).",
  http: "HttpService Roblox dışındaki sitelerle konuşur. İzin gerekir ve sitenin düzgün cevap vermesi gerekir.",
  tween:
    "Tween bir özelliği A'dan B'ye kaydırır. Hedef, özellikle aynı türde olmalı — bir boyutu başka bir boyuta kaydırmak gibi.",
  animation:
    "Animasyonlar sadece oyun dünyasında gerçekten bulunan karakterlerde ve oyunun kullanmasına izin verilen animasyonlarla oynar.",
};

const TOUCH_ANALOGY_TR =
  "Touched herkes için çalan bir kapı zili gibidir — postacı, kedi, top. Kodun gelenin her zaman oyuncu olduğunu varsayıp Humanoid'ini istedi, ama bu sefer zili başka bir şey çaldı.";

export function analogyTr(d: Pick<PreciseDiagnosis, "category" | "title">): string | undefined {
  if (d.title.startsWith("hit.Parent isn't a character")) return TOUCH_ANALOGY_TR;
  return ANALOGIES_TR[d.category];
}

const GLOSSARY_TR: Record<string, string> = {
  nil: "Luau'da “hiçbir şey / değer yok” demek. Hiç atanmamış değişkenler, olmayan tablo anahtarları ve bulunamayan aramalar nil olur.",
  index: 'Nokta ya da köşeli parantezle bir şey okumak: player.Name veya data["Coins"] gibi.',
  property: "Bir objenin Properties penceresinde görünen ayarı: Size, Color, Anchored gibi.",
  Instance:
    "Explorer'daki herhangi bir obje: parçalar, klasörler, scriptler, oyuncular, arayüzler…",
  server: "Oyunu herkes için çalıştıran Roblox bilgisayarı. Script objeleri burada çalışır.",
  client:
    "Tek bir oyuncunun cihazı. LocalScript'ler burada çalışır ve Players.LocalPlayer'ı kullanabilir.",
  LocalPlayer: "Bu cihazı kullanan oyuncu. Sadece LocalScript'lerde vardır — sunucuda nil'dir.",
  event:
    "Oyunda olan bir şey (dokunma, oyuncunun girmesi). :Connect(function) o olduğunda kodunu çalıştırır.",
  FindFirstChild: "İsmiyle bir alt obje arar; yoksa nil döndürür (hiç beklemez).",
  WaitForChild:
    "O isimde bir alt obje oluşana kadar bekler — biraz geç yüklenen şeyler için kullanışlı.",
  Character: "Oyuncunun Workspace'teki 3D avatar modeli. Doğana kadar nil'dir.",
  Humanoid: "Karakterin içindeki, Health ve WalkSpeed'i olan ve onu canlı bir karakter yapan obje.",
  leaderstats: "Oyuncunun içindeki bir Folder; içindeki değerler skor tablosunda görünür.",
  RemoteEvent: "LocalScript'lerle sunucu Script'lerinin birbirine mesaj göndermesini sağlar.",
  pcall:
    "Bir fonksiyonu “güvenli” çalıştırır: hata verirse scriptin devam eder ve hata mesajını geri alırsın.",
  DataStore: "Oyuncu ilerlemesini oturumlar arasında saklamak için Roblox'un bulut deposu.",
  loop: "Tekrar eden kod (for, while, repeat). Sonsuz döngülerin içinde task.wait() olmalı.",
  function: "() ile çağırarak tekrar tekrar çalıştırabildiğin isimli kod bloğu.",
  table: "Luau'nun liste ve anahtar/değer verisi için kabı, { } ile yazılır.",
  string: 'Tırnak içindeki metin, "Merhaba" gibi.',
  ModuleScript:
    "Diğer scriptlerin require() ile yüklediği script. Tek bir değer (genelde tablo) döndürmeli.",
  syntax: "Dilin dil bilgisi kuralları: anahtar kelimeler, parantezler, end'ler…",
  tween: "Bir özelliğin bir değerden diğerine zamanla yumuşakça değişmesi.",
};

export function glossaryTr(term: string): string | undefined {
  return GLOSSARY_TR[term];
}
