/**
 * Turkish for the words *inside* code samples: comments and the text that
 * scripts print or show to players. Code itself (keywords, variable names,
 * Roblox classes, services, properties and object names like "Door" or
 * "leaderstats") stays exactly the same, so every sample still runs.
 *
 * i18n.test.ts checks that no English comment is left in Turkish mode.
 */
import type { Lang } from "./path/types";
import { EXTRA_COMMENTS, EXTRA_STRINGS } from "./codeTr.extra";

/** Whole lines whose Turkish needs a different word order. Matched after trimming. */
const LINES: Record<string, string> = {
  'print(playerName, "has", coins, "coins")':
    'print(playerName, "oyuncusunun", coins, "coini var")',
  'prompt.ObjectText = "Door"': 'prompt.ObjectText = "Kapı"',
  'print(player.Name .. " got " .. coins .. " coins")':
    'print(player.Name .. " " .. coins .. " coin kazandı")',
  'print(player.Name .. " got " .. coins.Value .. " coins")':
    'print(player.Name .. " " .. coins.Value .. " coin kazandı")',
};

/** Comment text (after `--`, trimmed). */
const COMMENTS: Record<string, string> = {
  ...EXTRA_COMMENTS,
  "This line is ignored": "Bu satır yok sayılır",
  "a comment can also go at the end": "yorum satırın sonuna da yazılabilir",
  number: "sayı (number)",
  "string (text, in quotes)": "metin (string), tırnak içinde",
  "boolean (true or false)": "boolean: true ya da false",
  'nil means "nothing"': 'nil "hiçbir şey" demek',
  "change it: now 150": "değiştir: artık 150",
  "2 (what's left after dividing)": "2 (bölünce kalan)",
  "short for reward = reward + 100": "reward = reward + 100 demenin kısası",
  "join text with ..": "metinleri .. ile birleştir",
  "string interpolation (backticks)": "metnin içine değer koy (ters tırnak)",
  "e.g. from a TextBox": "örneğin bir TextBox'tan",
  "the number 42 (nil if not a number)": "42 sayısı (sayı değilse nil)",
  "number -> text": "sayı -> metin",
  "start, stop, step": "başla, bitir, adım",
  "pause 1 second": "1 saniye bekle",
  "ALWAYS wait inside a forever-loop": "sonsuz döngüde HER ZAMAN bekle",
  "Dog (lists start at 1!)": "Dog (listeler 1'den başlar!)",
  "4 (# = how many)": "4 (# = kaç tane)",
  "set Parent last: now it appears": "Parent'ı en son ayarla: şimdi görünür",
  "an anchored part you made": "senin yaptığın, Anchored bir parça",
  "touched by something that isn't a player": "oyuncu olmayan bir şey dokundu",
  "see the next lesson for leaderstats": "leaderstats için sonraki derse bak",
  "must be exactly this, lowercase": "tam olarak bu olmalı, küçük harfle",
  "an anchored Part": "Anchored bir Part",
  "duration in seconds": "süre (saniye)",
  "The first parameter is ALWAYS the player who fired the event.":
    "İlk parametre HER ZAMAN olayı gönderen oyuncudur.",
  "unknown item: ignore": "bilinmeyen eşya: yok say",
  "only save players whose data loaded correctly":
    "sadece verisi düzgün yüklenen oyuncuları kaydet",
  "saved is nil for brand-new players": "yeni oyuncularda saved nil olur",
  "nil? then the name is wrong or it isn't loaded": "nil mi? isim yanlış ya da henüz yüklenmemiş",
  "Instance, nil, number, string…": "Instance, nil, number, string…",
  "Parts that already have the tag": "Etiketi zaten olan parçalar",
  "Parts tagged later (cloned, spawned or streamed in)":
    "Sonradan etiketlenen parçalar (kopyalanan ya da sonradan yüklenen)",
  "straight down, 100 studs": "dümdüz aşağı, 100 stud",
  "Dog (level 2, power 15)": "Dog (seviye 2, güç 15)",
  "Dragon (level 1, power 200)": "Dragon (seviye 1, güç 200)",
  "this is a note, it doesn't run": "bu bir not, çalışmaz",
  "a note at the end": "sonda bir not",
  "coins to add": "eklenecek coin",
  "The Baseplate is at workspace.Baseplate": "Baseplate burada: workspace.Baseplate",
  "Write your code below": "Kodunu aşağıya yaz",
  "Create your variables here": "Değişkenlerini burada oluştur",
  "text typed by the player": "oyuncunun yazdığı metin",
  "1) Turn amountText into a number": "1) amountText'i sayıya çevir",
  "2) Calculate the coins left after buying": "2) Satın aldıktan sonra kalan coini hesapla",
  "3) Print: Coins left: 250": "3) Şunu yazdır: Kalan coin: 250",
  "the checker will try other numbers too": "kontrol eden başka sayıları da deneyecek",
  "write your if / elseif / else here": "if / elseif / else kodunu buraya yaz",
  "1) Count down 5, 4, 3, 2, 1 (one per second)": "1) 5, 4, 3, 2, 1 diye geri say (saniyede bir)",
  '2) print "Go!"': '2) "Başla!" yazdır',
  "3) print every name in players": "3) players listesindeki her ismi yazdır",
  "1) write the function calculateDamage(baseDamage, level)":
    "1) calculateDamage(baseDamage, level) fonksiyonunu yaz",
  "2) print the damage for baseDamage 10 and level 50":
    "2) baseDamage 10 ve level 50 için hasarı yazdır",
  "your inventory code here": "envanter kodun buraya",
  "Write your function here": "Fonksiyonunu buraya yaz",
};

/**
 * Text inside quotes that players or the Output see. Names Roblox or other
 * code looks up (object names, tags, item and pet names) are not here.
 */
const STRINGS: Record<string, string> = {
  ...EXTRA_STRINGS,
  "Hello world!": "Merhaba dünya!",
  "This line runs": "Bu satır çalışır",
  "This runs": "Bu çalışır",
  Hi: "Selam",
  "Hi ": "Selam ",
  hi: "selam",
  ", this runs on your device": ", bu senin cihazında çalışıyor",
  "Welcome ": "Hoş geldin ",
  "Welcome, ": "Hoş geldin, ",
  "Your fruit: ": "Meyven: ",
  "{name} has {coins} coins": "{name} oyuncusunun {coins} coini var",
  " coins": " coin",
  ten: "on",
  "You beat the tower!": "Kuleyi bitirdin!",
  "Halfway there": "Yarıyı geçtin",
  "Keep climbing": "Tırmanmaya devam",
  "Buy VIP for a bonus!": "Bonus için VIP al!",
  "Win!": "Kazandın!",
  "Winner!": "Kazandın!",
  "Almost there": "Az kaldı",
  "Disaster in ": "Felakete kalan: ",
  "Here it comes!": "İşte geliyor!",
  " is in the game": " oyunda",
  "Spawning a coin": "Coin çıkıyor",
  " joined!": " oyuna girdi!",
  "Coins: ": "Coin: ",
  "open shop": "dükkânı aç",
  Open: "Aç",
  Close: "Kapat",
  Shop: "Dükkân",
  open: "açıldı",
  " used the door": " kapıyı kullandı",
  " opened the door": " kapıyı açtı",
  "Could not load data for ": "Veri yüklenemedi: ",
  "Could not save data for ": "Veri kaydedilemedi: ",
  "Server busy": "Sunucu meşgul",
  "target is": "hedef:",
  "type:": "tür:",
  "health:": "can:",
  Hit: "Çarptı:",
  at: "konum:",
  "Distance:": "Mesafe:",
  "Nothing below": "Altta hiçbir şey yok",
  "Only the Baseplate was below": "Altta sadece Baseplate vardı",
  " (level ": " (seviye ",
  ", power ": ", güç ",
  "healed to": "iyileşti, can:",
  swing: "savur",
  "Swing!": "Savur!",
  "Waiting for players...": "Oyuncular bekleniyor...",
  "Waiting for players": "Oyuncular bekleniyor",
  "Waiting...": "Bekleniyor...",
  "Intermission:": "Ara:",
  Intermission: "Ara",
  "Round ends in": "Tur bitiyor:",
  "Round over!": "Tur bitti!",
  Round: "Tur",
  "You can buy it!": "Alabilirsin!",
  Buy: "Al",
  "Save up": "Biriktir",
  "Top!": "Zirve!",
  Halfway: "Yarı yol",
  Start: "Başlangıç",
  "The door opens": "Kapı açılıyor",
  "Jump ": "Zıpla ",
  "Go!": "Başla!",
  "Let's go!": "Hadi başlayalım!",
  "Hello Roblox!": "Merhaba Roblox!",
  " is level ": " seviye ",
  "Coins left: ": "Kalan coin: ",
  "Door open": "Kapı açık",
};

const QUOTES = new Set(['"', "'", "`"]);

/** Index just past the closing quote of the string starting at `i`. */
function stringEnd(line: string, i: number): number {
  let j = i + 1;
  while (j < line.length && line[j] !== line[i]) j += line[j] === "\\" ? 2 : 1;
  return j + 1;
}

/** The text after `--` on this line (quotes are skipped), or undefined. */
function commentOf(line: string): string | undefined {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "-" && line[i + 1] === "-") return line.slice(i + 2);
    if (QUOTES.has(line[i])) i = stringEnd(line, i) - 1;
  }
  return undefined;
}

function translateLine(line: string): string {
  const trimmed = line.trim();
  const whole = LINES[trimmed];
  if (whole) return line.slice(0, line.indexOf(trimmed)) + whole;

  let out = "";
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === "-" && line[i + 1] === "-") {
      // Comment: keep the spacing after "--", translate the words.
      const body = line.slice(i + 2);
      const text = body.trim();
      const tr = COMMENTS[text];
      out += tr ? `--${body.slice(0, body.indexOf(text))}${tr}` : line.slice(i);
      break;
    }
    if (QUOTES.has(c)) {
      const end = stringEnd(line, i);
      const inner = line.slice(i + 1, Math.min(end - 1, line.length));
      out += c + (STRINGS[inner] ?? inner) + (end <= line.length ? c : "");
      i = end;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** A code sample with its comments and player-facing text in the given language. */
export function localizeCode(code: string, lang: Lang): string {
  if (lang !== "tr" || !code) return code;
  return code.split("\n").map(translateLine).join("\n");
}

// Pieces of a line: only texts with a space or punctuation, so a lone word
// like "Open" is never replaced inside another word. Longest first.
const FRAGMENTS = Object.entries(STRINGS)
  .filter(([en]) => en.length >= 3 && /[^A-Za-z]/.test(en))
  .sort((a, b) => b[0].length - a[0].length);

/**
 * What the translated code prints: used for "What does Output show?" answers,
 * which are written as the English Output. Each line is translated as a whole
 * when it's a known text, otherwise known pieces (like "Hi " or " joined!").
 */
/** Wrong answers that no translated string produces on its own. */
const OUTPUT_LINES: Record<string, string> = { "HiVy!": "SelamVy!" };

export function localizeOutput(text: string, lang: Lang): string {
  if (lang !== "tr") return text;
  return text
    .split("\n")
    .map((line) => {
      if (STRINGS[line] ?? OUTPUT_LINES[line]) return STRINGS[line] ?? OUTPUT_LINES[line];
      let out = line;
      for (const [en, tr] of FRAGMENTS) out = out.split(en).join(tr);
      return out;
    })
    .join("\n");
}

const TURKISH_COMMENTS = new Set(Object.values(COMMENTS));

/**
 * Comments in already-translated code that aren't Turkish, i.e. English with
 * no entry in COMMENTS yet (for the translation tests).
 */
export function untranslatedComments(code: string): string[] {
  const missing: string[] = [];
  for (const line of code.split("\n")) {
    const text = commentOf(line)?.trim();
    // Comments that are just code or output (print("A"), 500, true…) need no translation.
    const looksLikeCode = /^(local\s+\w+\s*=|[\w.:]+\(.*\)$)/.test(text ?? "");
    if (!text || !/[a-z]{3}/i.test(text) || looksLikeCode) continue;
    if (/^(true|false|nil|Legendary|Rare|Common)$/.test(text)) continue;
    if (!TURKISH_COMMENTS.has(text)) missing.push(text);
  }
  return missing;
}
