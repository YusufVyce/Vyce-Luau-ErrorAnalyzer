/**
 * Coding challenges (like Codewars, but for Roblox Luau). Function challenges
 * call the student's function with test arguments and compare the result with
 * the reference solution's result — both run in the same offline simulator,
 * so the expected values can never drift from the solutions. Roblox
 * challenges check what happened in a simulated world.
 */
import type { Harness } from "@/lib/learn/homework/harness";
import { fmtValue } from "@/lib/learn/homework/harness";
import type { CFrame } from "@/lib/luau/roblox/datatypes";
import { Vector3 } from "@/lib/luau/roblox/datatypes";
import type { Instance } from "@/lib/luau/roblox/instance";
import { F } from "./define";
import { ALGORITHM_CHALLENGES } from "./algorithms";
import { EXTRA_CHALLENGES } from "./extra";

export type Difficulty = "easy" | "medium" | "hard";
export type Tag =
  | "algorithms"
  | "basics"
  | "math"
  | "strings"
  | "tables"
  | "loops"
  | "game"
  | "roblox";
type Text = { en: string; tr: string };

interface ChallengeBase {
  id: string;
  title: Text;
  difficulty: Difficulty;
  tags: Tag[];
  prompt: Text;
  starter: string;
  solution: string;
  hints: { en: string[]; tr: string[] };
}

export interface FunctionChallenge extends ChallengeBase {
  kind: "function";
  /** Name of the function the student writes. */
  fn: string;
  /** Lua argument lists. Hidden tests aren't shown before running. */
  tests: Array<{ args: string; hidden?: boolean }>;
}

export interface WorldChallenge extends ChallengeBase {
  kind: "world";
  grade(h: Harness): void;
}

export type Challenge = FunctionChallenge | WorldChallenge;

const BASE: Challenge[] = [
  // ------------------------------------------------------------------ easy
  F({
    id: "add",
    fn: "add",
    params: "a, b",
    title: { en: "Warm-up: add two numbers", tr: "Isınma: iki sayıyı topla" },
    difficulty: "easy",
    tags: ["basics", "math"],
    prompt: {
      en: "Write `add(a, b)` that returns the sum of two numbers.",
      tr: "İki sayının toplamını döndüren `add(a, b)` fonksiyonunu yaz.",
    },
    tests: [
      { args: "2, 3" },
      { args: "-5, 10" },
      { args: "0, 0", hidden: true },
      { args: "1.5, 2.25", hidden: true },
    ],
    solution: "local function add(a, b)\n\treturn a + b\nend\n",
    hints: {
      en: ["Use `return` to send the result back: return a + b"],
      tr: ["Sonucu geri göndermek için `return` kullan: return a + b"],
    },
  }),
  F({
    id: "is-even",
    fn: "isEven",
    params: "n",
    title: { en: "Even or odd?", tr: "Çift mi tek mi?" },
    difficulty: "easy",
    tags: ["basics", "math"],
    prompt: {
      en: "Write `isEven(n)` that returns `true` if n is even and `false` otherwise.",
      tr: "n çiftse `true`, değilse `false` döndüren `isEven(n)` fonksiyonunu yaz.",
    },
    tests: [
      { args: "4" },
      { args: "7" },
      { args: "0", hidden: true },
      { args: "-2", hidden: true },
      { args: "13", hidden: true },
    ],
    solution: "local function isEven(n)\n\treturn n % 2 == 0\nend\n",
    hints: {
      en: [
        "`n % 2` is the remainder after dividing by 2.",
        "A comparison like `x == 0` is already true or false.",
      ],
      tr: [
        "`n % 2`, 2'ye bölümden kalandır.",
        "`x == 0` gibi bir karşılaştırma zaten true ya da false'tur.",
      ],
    },
  }),
  F({
    id: "greet",
    fn: "greet",
    params: "name",
    title: { en: "Welcome message", tr: "Hoş geldin mesajı" },
    difficulty: "easy",
    tags: ["basics", "strings"],
    prompt: {
      en: 'Write `greet(name)` that returns `"Hello, <name>!"` — for example `greet("Noob")` gives `"Hello, Noob!"`.',
      tr: '`"Hello, <isim>!"` döndüren `greet(name)` fonksiyonunu yaz — örneğin `greet("Noob")` sonucu `"Hello, Noob!"`.',
    },
    tests: [{ args: '"Builderman"' }, { args: '"Noob"' }, { args: '""', hidden: true }],
    solution: 'local function greet(name)\n\treturn "Hello, " .. name .. "!"\nend\n',
    hints: { en: ["Join strings with `..`"], tr: ["Metinleri `..` ile birleştir"] },
  }),
  F({
    id: "max-of",
    fn: "maxOf",
    params: "list",
    title: { en: "Highest score", tr: "En yüksek skor" },
    difficulty: "easy",
    tags: ["tables", "loops"],
    prompt: {
      en: "Write `maxOf(list)` that returns the largest number in a non-empty list — without using `math.max(unpack(...))`.",
      tr: "Boş olmayan bir listedeki en büyük sayıyı döndüren `maxOf(list)` fonksiyonunu yaz — `math.max(unpack(...))` kullanmadan.",
    },
    tests: [
      { args: "{3, 9, 2}" },
      { args: "{-5, -2, -9}" },
      { args: "{42}", hidden: true },
      { args: "{0, -1, 100, 99}", hidden: true },
    ],
    solution:
      "local function maxOf(list)\n\tlocal best = list[1]\n\tfor _, n in list do\n\t\tif n > best then\n\t\t\tbest = n\n\t\tend\n\tend\n\treturn best\nend\n",
    hints: {
      en: [
        "Start with `local best = list[1]`.",
        "Loop over the list and replace best when you find a bigger number.",
      ],
      tr: [
        "`local best = list[1]` ile başla.",
        "Listede dön ve daha büyük bir sayı bulunca best'i değiştir.",
      ],
    },
  }),
  F({
    id: "sum",
    fn: "sum",
    params: "list",
    title: { en: "Total coins", tr: "Toplam coin" },
    difficulty: "easy",
    tags: ["tables", "loops"],
    prompt: {
      en: "Write `sum(list)` that adds up every number in the list. An empty list gives 0.",
      tr: "Listedeki bütün sayıları toplayan `sum(list)` fonksiyonunu yaz. Boş liste 0 verir.",
    },
    tests: [{ args: "{1, 2, 3}" }, { args: "{}" }, { args: "{10, -4, 0.5}", hidden: true }],
    solution:
      "local function sum(list)\n\tlocal total = 0\n\tfor _, n in list do\n\t\ttotal += n\n\tend\n\treturn total\nend\n",
    hints: {
      en: ["Keep a running total that starts at 0."],
      tr: ["0'dan başlayan bir toplam değişkeni tut."],
    },
  }),
  F({
    id: "countdown",
    fn: "countdown",
    params: "n",
    title: { en: "Countdown list", tr: "Geri sayım listesi" },
    difficulty: "easy",
    tags: ["loops", "tables"],
    prompt: {
      en: "Write `countdown(n)` that returns a list from n down to 1. `countdown(3)` gives `{3, 2, 1}`; `countdown(0)` gives an empty table.",
      tr: "n'den 1'e kadar inen bir liste döndüren `countdown(n)` fonksiyonunu yaz. `countdown(3)` sonucu `{3, 2, 1}`; `countdown(0)` boş tablo verir.",
    },
    tests: [{ args: "3" }, { args: "1" }, { args: "5", hidden: true }, { args: "0", hidden: true }],
    solution:
      "local function countdown(n)\n\tlocal out = {}\n\tfor i = n, 1, -1 do\n\t\ttable.insert(out, i)\n\tend\n\treturn out\nend\n",
    hints: {
      en: ["`for i = n, 1, -1 do` counts down.", "Add each number with `table.insert(out, i)`."],
      tr: ["`for i = n, 1, -1 do` geriye sayar.", "Her sayıyı `table.insert(out, i)` ile ekle."],
    },
  }),
  F({
    id: "reverse",
    fn: "reverse",
    params: "s",
    title: { en: "Backwards text", tr: "Ters metin" },
    difficulty: "easy",
    tags: ["strings"],
    prompt: {
      en: 'Write `reverse(s)` that returns the text backwards: `"abc"` → `"cba"`.',
      tr: 'Metni tersine çeviren `reverse(s)` fonksiyonunu yaz: `"abc"` → `"cba"`.',
    },
    tests: [
      { args: '"Roblox"' },
      { args: '"abc"' },
      { args: '""', hidden: true },
      { args: '"racecar"', hidden: true },
    ],
    solution: "local function reverse(s)\n\treturn string.reverse(s)\nend\n",
    hints: {
      en: [
        "Luau has `string.reverse(s)`.",
        "Or build it yourself with a loop from #s down to 1 and `string.sub`.",
      ],
      tr: [
        "Luau'da `string.reverse(s)` var.",
        "Ya da #s'den 1'e inen bir döngü ve `string.sub` ile kendin oluştur.",
      ],
    },
  }),
  F({
    id: "clamp",
    fn: "clamp",
    params: "x, low, high",
    title: { en: "Keep it in range", tr: "Aralıkta tut" },
    difficulty: "easy",
    tags: ["math", "game"],
    prompt: {
      en: "Write `clamp(x, low, high)`: return low if x is below it, high if x is above it, otherwise x. Games use this to keep health between 0 and MaxHealth.",
      tr: "`clamp(x, low, high)` yaz: x low'dan küçükse low, high'dan büyükse high, yoksa x döndür. Oyunlar canı 0 ile MaxHealth arasında tutmak için bunu kullanır.",
    },
    tests: [
      { args: "5, 0, 10" },
      { args: "-3, 0, 10" },
      { args: "15, 0, 10", hidden: true },
      { args: "0, 0, 0", hidden: true },
    ],
    solution:
      "local function clamp(x, low, high)\n\tif x < low then\n\t\treturn low\n\telseif x > high then\n\t\treturn high\n\tend\n\treturn x\nend\n",
    hints: {
      en: ["Two ifs are enough: one for too small, one for too big."],
      tr: ["İki if yeterli: biri çok küçük, biri çok büyük için."],
    },
  }),
  F({
    id: "format-time",
    fn: "formatTime",
    params: "seconds",
    title: { en: "Round timer text", tr: "Tur zamanlayıcı yazısı" },
    difficulty: "easy",
    tags: ["strings", "math", "game"],
    prompt: {
      en: 'Write `formatTime(seconds)` that turns seconds into `"m:ss"` for a round timer: `75` → `"1:15"`, `5` → `"0:05"`.',
      tr: 'Saniyeyi tur zamanlayıcısı için `"d:ss"` biçimine çeviren `formatTime(seconds)` yaz: `75` → `"1:15"`, `5` → `"0:05"`.',
    },
    tests: [
      { args: "75" },
      { args: "5" },
      { args: "600", hidden: true },
      { args: "59", hidden: true },
      { args: "3599", hidden: true },
    ],
    solution:
      'local function formatTime(seconds)\n\tlocal m = math.floor(seconds / 60)\n\tlocal s = seconds % 60\n\treturn string.format("%d:%02d", m, s)\nend\n',
    hints: {
      en: [
        "Minutes: `math.floor(seconds / 60)`. Seconds: `seconds % 60`.",
        'Pad with a zero: `string.format("%d:%02d", m, s)`',
      ],
      tr: [
        "Dakika: `math.floor(seconds / 60)`. Saniye: `seconds % 60`.",
        'Sıfırla doldur: `string.format("%d:%02d", m, s)`',
      ],
    },
  }),
  // ---------------------------------------------------------------- medium
  F({
    id: "abbreviate",
    fn: "abbreviate",
    params: "n",
    title: { en: "Simulator number format", tr: "Simülatör sayı biçimi" },
    difficulty: "medium",
    tags: ["strings", "math", "game"],
    prompt: {
      en: 'Simulator games show big numbers short. Write `abbreviate(n)`: below 1000 return the number as text; otherwise use K (thousand), M (million) or B (billion) with at most one decimal: `1500` → `"1.5K"`, `2000000` → `"2M"`, `999` → `"999"`.',
      tr: 'Simülatör oyunları büyük sayıları kısa gösterir. `abbreviate(n)` yaz: 1000\'den küçükse sayıyı metin olarak döndür; değilse en fazla bir ondalıkla K (bin), M (milyon) ya da B (milyar) kullan: `1500` → `"1.5K"`, `2000000` → `"2M"`, `999` → `"999"`.',
    },
    tests: [
      { args: "999" },
      { args: "1500" },
      { args: "2000000" },
      { args: "1000", hidden: true },
      { args: "12345", hidden: true },
      { args: "1250000000", hidden: true },
    ],
    solution:
      'local function abbreviate(n)\n\tlocal units = { { 1e9, "B" }, { 1e6, "M" }, { 1e3, "K" } }\n\tfor _, u in units do\n\t\tif n >= u[1] then\n\t\t\tlocal v = math.floor(n / u[1] * 10 + 0.5) / 10\n\t\t\treturn tostring(v) .. u[2]\n\t\tend\n\tend\n\treturn tostring(n)\nend\n',
    hints: {
      en: [
        "Check the biggest unit first (B, then M, then K).",
        "Round to one decimal: `math.floor(x * 10 + 0.5) / 10`",
      ],
      tr: [
        "Önce en büyük birimi kontrol et (B, sonra M, sonra K).",
        "Bir ondalığa yuvarla: `math.floor(x * 10 + 0.5) / 10`",
      ],
    },
  }),
  F({
    id: "count-vowels",
    fn: "countVowels",
    params: "s",
    title: { en: "Count the vowels", tr: "Sesli harfleri say" },
    difficulty: "medium",
    tags: ["strings"],
    prompt: {
      en: "Write `countVowels(s)` that returns how many a, e, i, o, u the text has (upper or lower case).",
      tr: "Metinde kaç tane a, e, i, o, u (büyük ya da küçük) olduğunu döndüren `countVowels(s)` yaz.",
    },
    tests: [
      { args: '"Roblox Studio"' },
      { args: '"hello"' },
      { args: '"RHYTHM"', hidden: true },
      { args: '"AEIOU aeiou"', hidden: true },
    ],
    solution:
      'local function countVowels(s)\n\tlocal _, n = string.gsub(string.lower(s), "[aeiou]", "")\n\treturn n\nend\n',
    hints: {
      en: [
        "Lower-case the text first with `string.lower`.",
        "`string.gsub` returns how many replacements it made as its second value.",
      ],
      tr: [
        "Önce metni `string.lower` ile küçült.",
        "`string.gsub` ikinci değer olarak kaç değişiklik yaptığını döndürür.",
      ],
    },
  }),
  F({
    id: "capitalize",
    fn: "capitalize",
    params: "s",
    title: { en: "Capital first letter", tr: "İlk harf büyük" },
    difficulty: "medium",
    tags: ["strings"],
    prompt: {
      en: 'Write `capitalize(s)` that makes only the first letter upper-case and keeps the rest: `"dragon"` → `"Dragon"`.',
      tr: 'Sadece ilk harfi büyük yapan, gerisini aynı bırakan `capitalize(s)` yaz: `"dragon"` → `"Dragon"`.',
    },
    tests: [
      { args: '"dragon"' },
      { args: '"hELLO"' },
      { args: '""', hidden: true },
      { args: '"a"', hidden: true },
    ],
    solution:
      "local function capitalize(s)\n\treturn string.upper(string.sub(s, 1, 1)) .. string.sub(s, 2)\nend\n",
    hints: {
      en: ["`string.sub(s, 1, 1)` is the first letter; `string.sub(s, 2)` is the rest."],
      tr: ["`string.sub(s, 1, 1)` ilk harf; `string.sub(s, 2)` gerisi."],
    },
  }),
  F({
    id: "remove-duplicates",
    fn: "removeDuplicates",
    params: "list",
    title: { en: "No duplicates", tr: "Tekrarları sil" },
    difficulty: "medium",
    tags: ["tables", "loops"],
    prompt: {
      en: "Write `removeDuplicates(list)` that returns a new list with each value only once, in the order they first appear.",
      tr: "Her değeri sadece bir kez, ilk göründükleri sırayla içeren yeni bir liste döndüren `removeDuplicates(list)` yaz.",
    },
    tests: [
      { args: "{1, 2, 2, 3, 1}" },
      { args: '{"Dog", "Cat", "Dog"}' },
      { args: "{}", hidden: true },
      { args: "{5, 5, 5}", hidden: true },
    ],
    solution:
      "local function removeDuplicates(list)\n\tlocal seen, out = {}, {}\n\tfor _, v in list do\n\t\tif not seen[v] then\n\t\t\tseen[v] = true\n\t\t\ttable.insert(out, v)\n\t\tend\n\tend\n\treturn out\nend\n",
    hints: {
      en: [
        "Keep a `seen` table: `seen[value] = true`.",
        "Only insert values you haven't seen yet.",
      ],
      tr: [
        "Bir `seen` tablosu tut: `seen[value] = true`.",
        "Sadece daha önce görmediğin değerleri ekle.",
      ],
    },
  }),
  F({
    id: "count-items",
    fn: "countItems",
    params: "list",
    title: { en: "Inventory counter", tr: "Envanter sayacı" },
    difficulty: "medium",
    tags: ["tables", "game"],
    prompt: {
      en: 'Write `countItems(list)` that returns a dictionary of how many times each item appears: `{"Sword", "Shield", "Sword"}` → `{Shield = 1, Sword = 2}`.',
      tr: 'Her eşyanın kaç kez geçtiğini gösteren bir sözlük döndüren `countItems(list)` yaz: `{"Sword", "Shield", "Sword"}` → `{Shield = 1, Sword = 2}`.',
    },
    tests: [
      { args: '{"Sword", "Shield", "Sword"}' },
      { args: "{}" },
      { args: '{"Apple"}', hidden: true },
      { args: '{"a", "b", "a", "c", "a"}', hidden: true },
    ],
    solution:
      "local function countItems(list)\n\tlocal counts = {}\n\tfor _, item in list do\n\t\tcounts[item] = (counts[item] or 0) + 1\n\tend\n\treturn counts\nend\n",
    hints: {
      en: ["`counts[item] = (counts[item] or 0) + 1`"],
      tr: ["`counts[item] = (counts[item] or 0) + 1`"],
    },
  }),
  F({
    id: "top-player",
    fn: "topPlayer",
    params: "scores",
    title: { en: "Who's winning?", tr: "Kim kazanıyor?" },
    difficulty: "medium",
    tags: ["tables", "game"],
    prompt: {
      en: "`scores` is a dictionary of player name → score. Return the name with the highest score. On a tie, return the name that comes first alphabetically. An empty table gives nil.",
      tr: "`scores`, oyuncu adı → skor sözlüğüdür. En yüksek skorlu adı döndür. Eşitlikte alfabede önce geleni döndür. Boş tablo nil verir.",
    },
    tests: [
      { args: "{Ann = 50, Bob = 80, Cid = 20}" },
      { args: "{Zed = 10, Amy = 10}" },
      { args: "{Solo = 0}", hidden: true },
      { args: "{}", hidden: true },
    ],
    solution:
      "local function topPlayer(scores)\n\tlocal best, bestScore = nil, -math.huge\n\tfor name, score in scores do\n\t\tif score > bestScore or (score == bestScore and name < best) then\n\t\t\tbest, bestScore = name, score\n\t\tend\n\tend\n\treturn best\nend\n",
    hints: {
      en: ["Loop with `for name, score in scores do`.", "Strings compare alphabetically with `<`."],
      tr: [
        "`for name, score in scores do` ile dön.",
        "Metinler `<` ile alfabetik karşılaştırılır.",
      ],
    },
  }),
  F({
    id: "is-palindrome",
    fn: "isPalindrome",
    params: "s",
    title: { en: "Palindrome check", tr: "Palindrom kontrolü" },
    difficulty: "medium",
    tags: ["strings"],
    prompt: {
      en: 'Write `isPalindrome(s)`: true if the text reads the same backwards, ignoring spaces and capital letters. `"Never odd or even"` is a palindrome.',
      tr: '`isPalindrome(s)` yaz: boşlukları ve büyük harfleri saymadan metin tersten de aynı okunuyorsa true. `"Never odd or even"` bir palindromdur.',
    },
    tests: [
      { args: '"racecar"' },
      { args: '"Roblox"' },
      { args: '"Never odd or even"', hidden: true },
      { args: '""', hidden: true },
    ],
    solution:
      'local function isPalindrome(s)\n\tlocal clean = s:gsub("%s", ""):lower()\n\treturn clean == clean:reverse()\nend\n',
    hints: {
      en: ['Remove spaces with `s:gsub("%s", "")`.', "Compare the cleaned text with its reverse."],
      tr: ['Boşlukları `s:gsub("%s", "")` ile sil.', "Temizlenmiş metni tersiyle karşılaştır."],
    },
  }),
  F({
    id: "fizzbuzz",
    fn: "fizzbuzz",
    params: "n",
    title: { en: "FizzBuzz", tr: "FizzBuzz" },
    difficulty: "medium",
    tags: ["loops", "strings"],
    prompt: {
      en: 'Return a list of strings for 1..n: "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for both, otherwise the number as text.',
      tr: '1..n için bir metin listesi döndür: 3\'ün katları için "Fizz", 5\'in katları için "Buzz", ikisi için "FizzBuzz", yoksa sayının kendisi (metin olarak).',
    },
    tests: [{ args: "5" }, { args: "15", hidden: true }, { args: "1", hidden: true }],
    solution:
      'local function fizzbuzz(n)\n\tlocal out = {}\n\tfor i = 1, n do\n\t\tif i % 15 == 0 then\n\t\t\ttable.insert(out, "FizzBuzz")\n\t\telseif i % 3 == 0 then\n\t\t\ttable.insert(out, "Fizz")\n\t\telseif i % 5 == 0 then\n\t\t\ttable.insert(out, "Buzz")\n\t\telse\n\t\t\ttable.insert(out, tostring(i))\n\t\tend\n\tend\n\treturn out\nend\n',
    hints: {
      en: ["Check 15 (both) before 3 and 5.", "Numbers must be text: `tostring(i)`."],
      tr: ["3 ve 5'ten önce 15'i (ikisi) kontrol et.", "Sayılar metin olmalı: `tostring(i)`."],
    },
  }),
  F({
    id: "hatch",
    fn: "hatch",
    params: "weights, roll",
    title: { en: "Egg hatching odds", tr: "Yumurta açma şansı" },
    difficulty: "medium",
    tags: ["tables", "math", "game"],
    prompt: {
      en: '`weights` is a list like `{{"Dog", 50}, {"Cat", 30}, {"Dragon", 20}}` (they add up to 100) and `roll` is a number from 1 to 100. Return the pet that roll lands on: 1–50 Dog, 51–80 Cat, 81–100 Dragon. This is how pet games pick a pet.',
      tr: '`weights`, `{{"Dog", 50}, {"Cat", 30}, {"Dragon", 20}}` gibi bir liste (toplamı 100) ve `roll` 1 ile 100 arasında bir sayı. Zarın geldiği peti döndür: 1–50 Dog, 51–80 Cat, 81–100 Dragon. Pet oyunları peti böyle seçer.',
    },
    tests: [
      { args: '{{"Dog", 50}, {"Cat", 30}, {"Dragon", 20}}, 10' },
      { args: '{{"Dog", 50}, {"Cat", 30}, {"Dragon", 20}}, 51' },
      { args: '{{"Dog", 50}, {"Cat", 30}, {"Dragon", 20}}, 50', hidden: true },
      { args: '{{"Dog", 50}, {"Cat", 30}, {"Dragon", 20}}, 81', hidden: true },
      { args: '{{"Dog", 50}, {"Cat", 30}, {"Dragon", 20}}, 100', hidden: true },
      { args: '{{"Common", 90}, {"Mythic", 10}}, 91', hidden: true },
    ],
    solution:
      "local function hatch(weights, roll)\n\tlocal total = 0\n\tfor _, entry in weights do\n\t\ttotal += entry[2]\n\t\tif roll <= total then\n\t\t\treturn entry[1]\n\t\tend\n\tend\n\treturn nil\nend\n",
    hints: {
      en: ["Keep a running total of the weights.", "Return the first pet where roll <= total."],
      tr: ["Ağırlıkların birikimli toplamını tut.", "roll <= total olan ilk peti döndür."],
    },
  }),
  F({
    id: "level-from-xp",
    fn: "levelFromXp",
    params: "xp",
    title: { en: "XP to level", tr: "XP'den seviyeye" },
    difficulty: "medium",
    tags: ["math", "game"],
    prompt: {
      en: "Level = floor(√(xp ÷ 100)) + 1. Write `levelFromXp(xp)`: 0 XP is level 1, 100 XP is level 2, 400 XP is level 3.",
      tr: "Seviye = floor(√(xp ÷ 100)) + 1. `levelFromXp(xp)` yaz: 0 XP seviye 1, 100 XP seviye 2, 400 XP seviye 3.",
    },
    tests: [
      { args: "0" },
      { args: "100" },
      { args: "399", hidden: true },
      { args: "400", hidden: true },
      { args: "10000", hidden: true },
    ],
    solution: "local function levelFromXp(xp)\n\treturn math.floor(math.sqrt(xp / 100)) + 1\nend\n",
    hints: {
      en: ["Use `math.sqrt` and `math.floor`."],
      tr: ["`math.sqrt` ve `math.floor` kullan."],
    },
  }),
  F({
    id: "rank-names",
    fn: "rankNames",
    params: "players",
    title: { en: "Leaderboard order", tr: "Skor tablosu sırası" },
    difficulty: "medium",
    tags: ["tables", "game"],
    prompt: {
      en: '`players` is a list like `{{name = "Ann", score = 5}, ...}`. Return the names sorted by score (highest first); equal scores are sorted by name (A→Z).',
      tr: '`players`, `{{name = "Ann", score = 5}, ...}` gibi bir liste. İsimleri skora göre (yüksekten düşüğe) sıralı döndür; eşit skorlar isme göre (A→Z) sıralanır.',
    },
    tests: [
      { args: '{{name = "Ann", score = 5}, {name = "Bob", score = 9}}' },
      {
        args: '{{name = "Zed", score = 3}, {name = "Amy", score = 3}, {name = "Max", score = 7}}',
        hidden: true,
      },
      { args: "{}", hidden: true },
    ],
    solution:
      "local function rankNames(players)\n\tlocal sorted = table.clone(players)\n\ttable.sort(sorted, function(a, b)\n\t\tif a.score ~= b.score then\n\t\t\treturn a.score > b.score\n\t\tend\n\t\treturn a.name < b.name\n\tend)\n\tlocal names = {}\n\tfor _, p in sorted do\n\t\ttable.insert(names, p.name)\n\tend\n\treturn names\nend\n",
    hints: {
      en: [
        "`table.sort(list, function(a, b) return ... end)` — return true when a should come first.",
        "Then collect the names into a new list.",
      ],
      tr: [
        "`table.sort(list, function(a, b) return ... end)` — a önce gelmeliyse true döndür.",
        "Sonra isimleri yeni bir listeye topla.",
      ],
    },
  }),
  // ------------------------------------------------------------------ hard
  F({
    id: "fibonacci",
    fn: "fibonacci",
    params: "n",
    title: { en: "Fast Fibonacci", tr: "Hızlı Fibonacci" },
    difficulty: "hard",
    tags: ["math", "loops"],
    prompt: {
      en: "fib(0) = 0, fib(1) = 1 and every next number is the sum of the two before it. Write `fibonacci(n)` — it must be fast enough for n = 50 (hint: a simple recursive version is far too slow).",
      tr: "fib(0) = 0, fib(1) = 1 ve sonraki her sayı önceki ikisinin toplamı. `fibonacci(n)` yaz — n = 50 için yeterince hızlı olmalı (ipucu: basit özyinelemeli sürüm çok yavaş).",
    },
    tests: [
      { args: "1" },
      { args: "10" },
      { args: "0", hidden: true },
      { args: "40", hidden: true },
      { args: "50", hidden: true },
    ],
    solution:
      "local function fibonacci(n)\n\tlocal a, b = 0, 1\n\tfor _ = 1, n do\n\t\ta, b = b, a + b\n\tend\n\treturn a\nend\n",
    hints: {
      en: [
        "Keep the last two numbers in variables and loop n times.",
        "`a, b = b, a + b` moves one step forward.",
      ],
      tr: [
        "Son iki sayıyı değişkenlerde tut ve n kez dön.",
        "`a, b = b, a + b` bir adım ilerletir.",
      ],
    },
  }),
  F({
    id: "most-common-word",
    fn: "mostCommonWord",
    params: "s",
    title: { en: "Most common word", tr: "En sık kelime" },
    difficulty: "hard",
    tags: ["strings", "tables"],
    prompt: {
      en: "Return the word that appears most often (compare in lower case, return it in lower case). Ties go to the alphabetically first word.",
      tr: "En sık geçen kelimeyi döndür (küçük harfle karşılaştır, küçük harfle döndür). Eşitlikte alfabede önce gelen kazanır.",
    },
    tests: [
      { args: '"the cat and the hat"' },
      { args: '"Dog dog CAT cat cat"', hidden: true },
      { args: '"b a"', hidden: true },
    ],
    solution:
      'local function mostCommonWord(s)\n\tlocal counts = {}\n\tfor word in string.gmatch(string.lower(s), "%a+") do\n\t\tcounts[word] = (counts[word] or 0) + 1\n\tend\n\tlocal best, bestCount = nil, 0\n\tfor word, n in counts do\n\t\tif n > bestCount or (n == bestCount and word < best) then\n\t\t\tbest, bestCount = word, n\n\t\tend\n\tend\n\treturn best\nend\n',
    hints: {
      en: [
        '`for word in string.gmatch(s, "%a+") do` gives every word.',
        "Count them in a dictionary, then find the biggest count.",
      ],
      tr: [
        '`for word in string.gmatch(s, "%a+") do` her kelimeyi verir.',
        "Bir sözlükte say, sonra en büyük sayıyı bul.",
      ],
    },
  }),
  F({
    id: "merge-inventories",
    fn: "mergeInventories",
    params: "a, b",
    title: { en: "Merge two inventories", tr: "İki envanteri birleştir" },
    difficulty: "hard",
    tags: ["tables", "game"],
    prompt: {
      en: "Both arguments are dictionaries of item → amount. Return a NEW dictionary with the amounts added together. Don't change a or b.",
      tr: "İki argüman da eşya → miktar sözlüğü. Miktarları toplanmış YENİ bir sözlük döndür. a ve b'yi değiştirme.",
    },
    tests: [
      { args: "{Sword = 1, Gem = 5}, {Gem = 2, Shield = 1}" },
      { args: "{}, {}" },
      { args: "{Coin = 10}, {}", hidden: true },
      { args: "{}, {Coin = 3}", hidden: true },
    ],
    solution:
      "local function mergeInventories(a, b)\n\tlocal out = {}\n\tfor item, n in a do\n\t\tout[item] = (out[item] or 0) + n\n\tend\n\tfor item, n in b do\n\t\tout[item] = (out[item] or 0) + n\n\tend\n\treturn out\nend\n",
    hints: {
      en: ["Loop over a, then over b, adding into a new table."],
      tr: ["Önce a'da, sonra b'de dönüp yeni bir tabloya ekle."],
    },
  }),
  F({
    id: "valid-name",
    fn: "isValidName",
    params: "s",
    title: { en: "Pet name filter", tr: "Pet adı filtresi" },
    difficulty: "hard",
    tags: ["strings"],
    prompt: {
      en: "A valid pet name has 3–20 characters, only letters, digits and _, and doesn't start with a digit. Write `isValidName(s)` using string patterns.",
      tr: "Geçerli bir pet adı 3–20 karakterdir, sadece harf, rakam ve _ içerir ve rakamla başlamaz. String kalıplarıyla `isValidName(s)` yaz.",
    },
    tests: [
      { args: '"Builderman"' },
      { args: '"ab"' },
      { args: '"9lives"', hidden: true },
      { args: '"cool_name_2"', hidden: true },
      { args: '"has space"', hidden: true },
      { args: '"abcdefghijklmnopqrstu"', hidden: true },
    ],
    solution:
      'local function isValidName(s)\n\treturn #s >= 3 and #s <= 20 and string.match(s, "^[%a_][%w_]*$") ~= nil\nend\n',
    hints: {
      en: [
        "`#s` is the length.",
        "`^[%a_][%w_]*$` matches: a letter or _ first, then letters, digits or _ until the end.",
      ],
      tr: [
        "`#s` uzunluktur.",
        "`^[%a_][%w_]*$` şunu eşler: önce harf ya da _, sonra sona kadar harf, rakam ya da _.",
      ],
    },
  }),
  F({
    id: "roman",
    fn: "toRoman",
    params: "n",
    title: { en: "Roman numerals", tr: "Roma rakamları" },
    difficulty: "hard",
    tags: ["strings", "math"],
    prompt: {
      en: 'Write `toRoman(n)` for 1–3999: `4` → `"IV"`, `9` → `"IX"`, `58` → `"LVIII"`, `1994` → `"MCMXCIV"`.',
      tr: '1–3999 için `toRoman(n)` yaz: `4` → `"IV"`, `9` → `"IX"`, `58` → `"LVIII"`, `1994` → `"MCMXCIV"`.',
    },
    tests: [
      { args: "4" },
      { args: "58" },
      { args: "9", hidden: true },
      { args: "1994", hidden: true },
      { args: "3999", hidden: true },
    ],
    solution:
      'local function toRoman(n)\n\tlocal map = { { 1000, "M" }, { 900, "CM" }, { 500, "D" }, { 400, "CD" }, { 100, "C" }, { 90, "XC" }, { 50, "L" }, { 40, "XL" }, { 10, "X" }, { 9, "IX" }, { 5, "V" }, { 4, "IV" }, { 1, "I" } }\n\tlocal out = ""\n\tfor _, pair in map do\n\t\twhile n >= pair[1] do\n\t\t\tout ..= pair[2]\n\t\t\tn -= pair[1]\n\t\tend\n\tend\n\treturn out\nend\n',
    hints: {
      en: [
        "Use a list of value/letter pairs from 1000 down to 1, including 900, 400, 90, 40, 9 and 4.",
        "While n is at least the value, add the letters and subtract.",
      ],
      tr: [
        "1000'den 1'e değer/harf çiftlerinden bir liste kullan; 900, 400, 90, 40, 9 ve 4 dahil.",
        "n değerden büyük ya da eşitken harfleri ekle ve çıkar.",
      ],
    },
  }),
  F({
    id: "binary-search",
    fn: "binarySearch",
    params: "list, target",
    title: { en: "Binary search", tr: "İkili arama" },
    difficulty: "hard",
    tags: ["tables", "loops"],
    prompt: {
      en: "`list` is sorted from small to big. Return the index of `target`, or nil if it isn't there — by halving the search range each step instead of checking every item.",
      tr: "`list` küçükten büyüğe sıralı. `target`'ın indeksini, yoksa nil döndür — her öğeye bakmak yerine her adımda arama aralığını yarıya indirerek.",
    },
    tests: [
      { args: "{1, 3, 5, 7, 9}, 7" },
      { args: "{1, 3, 5, 7, 9}, 1" },
      { args: "{1, 3, 5, 7, 9}, 4", hidden: true },
      { args: "{}, 1", hidden: true },
      { args: "{2, 4, 6, 8, 10, 12, 14, 16}, 16", hidden: true },
    ],
    solution:
      "local function binarySearch(list, target)\n\tlocal low, high = 1, #list\n\twhile low <= high do\n\t\tlocal mid = (low + high) // 2\n\t\tif list[mid] == target then\n\t\t\treturn mid\n\t\telseif list[mid] < target then\n\t\t\tlow = mid + 1\n\t\telse\n\t\t\thigh = mid - 1\n\t\tend\n\tend\n\treturn nil\nend\n",
    hints: {
      en: [
        "Keep `low` and `high` indexes and look at the middle one.",
        "If the middle is too small, search the right half; otherwise the left half.",
      ],
      tr: [
        "`low` ve `high` indekslerini tut ve ortadakine bak.",
        "Ortadaki çok küçükse sağ yarıda, değilse sol yarıda ara.",
      ],
    },
  }),
  // ------------------------------------------------------------- roblox
  {
    kind: "world",
    id: "speed-pad",
    title: { en: "Speed pad", tr: "Hız pedi" },
    difficulty: "easy",
    tags: ["roblox", "game"],
    prompt: {
      en: "workspace.SpeedPad already exists. When a player's character touches it, set their Humanoid's WalkSpeed to 50. After 3 seconds, set it back to 16. Other parts touching the pad must not cause errors.",
      tr: "workspace.SpeedPad zaten var. Bir oyuncunun karakteri ona dokununca Humanoid'inin WalkSpeed değerini 50 yap. 3 saniye sonra tekrar 16 yap. Pede başka parçaların değmesi hata vermemeli.",
    },
    starter: "local pad = workspace.SpeedPad\n\n",
    solution:
      'local pad = workspace.SpeedPad\n\npad.Touched:Connect(function(hit)\n\tlocal humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")\n\tif not humanoid then return end\n\thumanoid.WalkSpeed = 50\n\ttask.wait(3)\n\thumanoid.WalkSpeed = 16\nend)\n',
    hints: {
      en: [
        '`local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")`',
        "Use `task.wait(3)` before resetting WalkSpeed.",
      ],
      tr: [
        '`local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")`',
        "WalkSpeed'i geri almadan önce `task.wait(3)` kullan.",
      ],
    },
    grade(h) {
      const w = h.newWorld();
      const pad = w.create(
        "Part",
        { Name: "SpeedPad", Anchored: true, Position: new Vector3(10, 0.5, 0) },
        w.workspace,
      );
      h.addStudentScript(w, w.service("ServerScriptService"));
      const p = w.addPlayer("Builderman");
      w.run(1);
      const rock = w.create("Part", { Name: "Rock" }, w.workspace);
      const before = h.studentErrors(w).length;
      w.touch(pad, rock);
      w.run(0.2);
      h.check(
        h.t("A rock touching the pad doesn't cause an error", "Pede kaya değince hata çıkmıyor"),
        h.studentErrors(w).length === before,
        h.studentErrors(w)[before]?.message,
      );
      const hum = (p.props.get("Character") as Instance | undefined)?.findFirstChild("Humanoid");
      w.touchWithCharacter(pad, p, "LeftFoot");
      w.run(0.5);
      const fast = hum?.props.get("WalkSpeed");
      h.check(
        h.t("Touching the pad sets WalkSpeed to 50", "Pede dokunmak WalkSpeed'i 50 yapıyor"),
        fast === 50,
        `WalkSpeed = ${fmtValue(fast)}`,
      );
      w.run(3);
      const back = hum?.props.get("WalkSpeed");
      h.check(
        h.t("After 3 seconds WalkSpeed is 16 again", "3 saniye sonra WalkSpeed tekrar 16"),
        back === 16,
        `WalkSpeed = ${fmtValue(back)}`,
      );
    },
  },
  {
    kind: "world",
    id: "player-counter",
    title: { en: "Live player counter", tr: "Canlı oyuncu sayacı" },
    difficulty: "medium",
    tags: ["roblox"],
    prompt: {
      en: "Create an IntValue named PlayerCount in ReplicatedStorage. Keep its Value equal to the number of players in the server — update it when players join and when they leave.",
      tr: "ReplicatedStorage içinde PlayerCount adında bir IntValue oluştur. Value değerini sunucudaki oyuncu sayısına eşit tut — oyuncular girince ve çıkınca güncelle.",
    },
    starter:
      'local Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\n\n',
    solution:
      'local Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\n\nlocal count = Instance.new("IntValue")\ncount.Name = "PlayerCount"\ncount.Parent = ReplicatedStorage\n\nlocal function update()\n\tcount.Value = #Players:GetPlayers()\nend\n\nPlayers.PlayerAdded:Connect(update)\nPlayers.PlayerRemoving:Connect(function()\n\ttask.wait()\n\tupdate()\nend)\n',
    hints: {
      en: [
        "`#Players:GetPlayers()` is the number of players.",
        "PlayerRemoving fires before the player is gone — wait a moment (`task.wait()`) or subtract 1.",
      ],
      tr: [
        "`#Players:GetPlayers()` oyuncu sayısıdır.",
        "PlayerRemoving oyuncu gitmeden önce çalışır — biraz bekle (`task.wait()`) ya da 1 çıkar.",
      ],
    },
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"));
      w.run(0.5);
      const value = () => w.service("ReplicatedStorage").findFirstChild("PlayerCount");
      if (
        !h.check(
          h.t("ReplicatedStorage.PlayerCount exists", "ReplicatedStorage.PlayerCount var"),
          value()?.className === "IntValue",
          h.t(
            "Create an IntValue named PlayerCount in ReplicatedStorage.",
            "ReplicatedStorage içinde PlayerCount adında bir IntValue oluştur.",
          ),
        )
      )
        return;
      const a = w.addPlayer("Ann");
      w.addPlayer("Bob");
      w.run(0.5);
      h.check(
        h.t("Two players → 2", "İki oyuncu → 2"),
        value()?.props.get("Value") === 2,
        `Value = ${fmtValue(value()?.props.get("Value"))}`,
      );
      w.removePlayer(a);
      w.run(0.5);
      h.check(
        h.t("One leaves → 1", "Biri çıkınca → 1"),
        value()?.props.get("Value") === 1,
        `Value = ${fmtValue(value()?.props.get("Value"))}`,
      );
    },
  },
  {
    kind: "world",
    id: "spinner",
    title: { en: "Spinning obstacle", tr: "Dönen engel" },
    difficulty: "medium",
    tags: ["roblox", "game"],
    prompt: {
      en: "Make workspace.Spinner rotate around the Y axis forever, smoothly (every frame or every small wait), without moving from its position.",
      tr: "workspace.Spinner'ı Y ekseni etrafında sonsuza kadar, yumuşakça (her karede ya da küçük beklemelerle) döndür; konumu değişmesin.",
    },
    starter:
      'local RunService = game:GetService("RunService")\nlocal spinner = workspace.Spinner\n\n',
    solution:
      'local RunService = game:GetService("RunService")\nlocal spinner = workspace.Spinner\n\nRunService.Heartbeat:Connect(function(dt)\n\tspinner.CFrame = spinner.CFrame * CFrame.Angles(0, math.rad(90) * dt, 0)\nend)\n',
    hints: {
      en: [
        "`RunService.Heartbeat:Connect(function(dt) ... end)` runs every frame.",
        "`part.CFrame = part.CFrame * CFrame.Angles(0, speed * dt, 0)`",
      ],
      tr: [
        "`RunService.Heartbeat:Connect(function(dt) ... end)` her karede çalışır.",
        "`part.CFrame = part.CFrame * CFrame.Angles(0, hız * dt, 0)`",
      ],
    },
    grade(h) {
      const w = h.newWorld();
      const sp = w.create(
        "Part",
        {
          Name: "Spinner",
          Anchored: true,
          Size: new Vector3(20, 1, 1),
          Position: new Vector3(0, 5, 0),
        },
        w.workspace,
      );
      h.addStudentScript(w, w.service("ServerScriptService"));
      const snap = () => {
        const cf = sp.props.get("CFrame") as CFrame | undefined;
        const o = sp.props.get("Orientation") as Vector3 | undefined;
        return {
          rot: cf ? cf.r.map((x) => x.toFixed(3)).join(",") + (o ? `|${o.y.toFixed(2)}` : "") : "",
          pos: cf?.p,
        };
      };
      w.run(1);
      const a = snap();
      w.run(0.5);
      const b = snap();
      w.run(0.5);
      const c = snap();
      h.check(
        h.t("It keeps rotating", "Dönmeye devam ediyor"),
        a.rot !== b.rot && b.rot !== c.rot,
        h.t("The rotation didn't change between checks.", "Kontroller arasında dönüş değişmedi."),
      );
      const still =
        a.pos &&
        c.pos &&
        Math.abs(a.pos.x - c.pos.x) + Math.abs(a.pos.y - c.pos.y) + Math.abs(a.pos.z - c.pos.z) <
          0.01;
      h.check(
        h.t("It stays in place", "Yerinde duruyor"),
        Boolean(still),
        `${fmtValue(a.pos)} → ${fmtValue(c.pos)}`,
      );
    },
  },
  {
    kind: "world",
    id: "lava-tags",
    title: { en: "One script, every lava", tr: "Tek script, bütün lavlar" },
    difficulty: "hard",
    tags: ["roblox", "game"],
    prompt: {
      en: 'Workspace has several parts tagged "Lava" (with CollectionService). With ONE script, make every tagged part kill the player who touches it — including lava parts tagged later while the game runs.',
      tr: 'Workspace\'te CollectionService ile "Lava" etiketlenmiş birkaç parça var. TEK bir scriptle, etiketli her parça ona dokunan oyuncuyu öldürsün — oyun çalışırken sonradan etiketlenen lavlar dahil.',
    },
    starter: 'local CollectionService = game:GetService("CollectionService")\n\n',
    solution:
      'local CollectionService = game:GetService("CollectionService")\n\nlocal function setup(part)\n\tpart.Touched:Connect(function(hit)\n\t\tlocal humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")\n\t\tif humanoid then\n\t\t\thumanoid.Health = 0\n\t\tend\n\tend)\nend\n\nfor _, part in CollectionService:GetTagged("Lava") do\n\tsetup(part)\nend\nCollectionService:GetInstanceAddedSignal("Lava"):Connect(setup)\n',
    hints: {
      en: [
        '`CollectionService:GetTagged("Lava")` returns the tagged parts.',
        '`CollectionService:GetInstanceAddedSignal("Lava")` fires for parts tagged later.',
      ],
      tr: [
        '`CollectionService:GetTagged("Lava")` etiketli parçaları döndürür.',
        '`CollectionService:GetInstanceAddedSignal("Lava")` sonradan etiketlenen parçalar için çalışır.',
      ],
    },
    grade(h) {
      const w = h.newWorld();
      const lavas = [0, 1, 2].map((i) => {
        const part = w.create(
          "Part",
          { Name: `Lava${i}`, Anchored: true, Position: new Vector3(i * 10, 0.5, 20) },
          w.workspace,
        );
        w.addTag(part, "Lava");
        return part;
      });
      h.addStudentScript(w, w.service("ServerScriptService"));
      w.run(0.5);
      const kills = (lava: Instance, name: string) => {
        const p = w.addPlayer(name);
        w.run(0.5);
        const hum = (p.props.get("Character") as Instance | undefined)?.findFirstChild("Humanoid");
        w.touchWithCharacter(lava, p, "LeftFoot");
        w.run(0.3);
        return hum?.props.get("Health") === 0;
      };
      h.check(
        h.t("The first lava part kills", "İlk lav parçası öldürüyor"),
        kills(lavas[0], "Ann"),
      );
      h.check(
        h.t("Every tagged lava part kills", "Etiketli her lav parçası öldürüyor"),
        kills(lavas[2], "Bob"),
      );
      const late = w.create(
        "Part",
        { Name: "LateLava", Anchored: true, Position: new Vector3(40, 0.5, 20) },
        w.workspace,
      );
      w.addTag(late, "Lava");
      w.run(0.3);
      h.check(
        h.t("Lava tagged later also kills", "Sonradan etiketlenen lav da öldürüyor"),
        kills(late, "Cid"),
        h.t(
          "Use GetInstanceAddedSignal for parts tagged later.",
          "Sonradan etiketlenenler için GetInstanceAddedSignal kullan.",
        ),
      );
    },
  },
  {
    kind: "world",
    id: "drop-cleanup",
    title: { en: "Coin drops with cleanup", tr: "Temizlenen coin düşüşleri" },
    difficulty: "hard",
    tags: ["roblox", "loops"],
    prompt: {
      en: 'Every second, 5 times, create a Part named "Drop" in workspace. Each Drop must disappear 2 seconds after it was created — use the Debris service so your loop never waits for it.',
      tr: 'Her saniye, 5 kez, workspace içinde "Drop" adında bir Part oluştur. Her Drop oluşturulduktan 2 saniye sonra kaybolmalı — döngün beklemesin diye Debris servisini kullan.',
    },
    starter: 'local Debris = game:GetService("Debris")\n\n',
    solution:
      'local Debris = game:GetService("Debris")\n\nfor i = 1, 5 do\n\tlocal drop = Instance.new("Part")\n\tdrop.Name = "Drop"\n\tdrop.Parent = workspace\n\tDebris:AddItem(drop, 2)\n\ttask.wait(1)\nend\n',
    hints: {
      en: [
        "`Debris:AddItem(part, 2)` destroys the part after 2 seconds.",
        "`task.wait(1)` inside the loop spaces the drops out.",
      ],
      tr: [
        "`Debris:AddItem(part, 2)` parçayı 2 saniye sonra yok eder.",
        "Döngü içindeki `task.wait(1)` düşüşleri aralıklandırır.",
      ],
    },
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"));
      const drops = () => w.workspace.children.filter((c) => c.name === "Drop").length;
      let maxSeen = 0;
      for (let i = 0; i < 12; i++) {
        w.run(0.5);
        maxSeen = Math.max(maxSeen, drops());
      }
      const atEnd = drops();
      h.check(
        h.t("Drops are created over time", "Drop'lar zamanla oluşuyor"),
        maxSeen >= 2,
        h.t(
          `At most ${maxSeen} drop(s) existed at once.`,
          `Aynı anda en fazla ${maxSeen} drop vardı.`,
        ),
      );
      h.check(
        h.t(
          "Never more than 3 at once (old ones get removed)",
          "Aynı anda 3'ten fazla yok (eskiler siliniyor)",
        ),
        maxSeen <= 3,
        h.t(`${maxSeen} drops existed at once.`, `Aynı anda ${maxSeen} drop vardı.`),
      );
      h.check(
        h.t("All drops are gone at the end", "Sonunda bütün drop'lar gitmiş"),
        atEnd === 0,
        h.t(
          `${atEnd} drop(s) still exist after 6 seconds.`,
          `6 saniye sonra hâlâ ${atEnd} drop var.`,
        ),
      );
      h.check(
        h.t("Uses the Debris service", "Debris servisi kullanılıyor"),
        h.codeHas(/Debris\s*:\s*AddItem/),
        h.t(
          "Remove each drop with Debris:AddItem(drop, 2).",
          "Her drop'u Debris:AddItem(drop, 2) ile sil.",
        ),
      );
    },
  },
];

const ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/** Every challenge, easiest first (the original ones keep their place within each level). */
/** Older challenges that are really algorithm problems get the algorithms tag too. */
const ALGORITHMIC = new Set([
  "fibonacci",
  "binary-search",
  "roman",
  "primes",
  "is-anagram",
  "second-largest",
  "longest-streak",
  "two-sum",
  "balanced",
  "merge-intervals",
  "shortest-path",
  "rpn",
  "spiral",
  "transpose",
  "rotate",
  "compress",
  "decompress",
  "competition-ranks",
  "is-palindrome",
  "remove-duplicates",
]);

export const CHALLENGES: Challenge[] = [...BASE, ...EXTRA_CHALLENGES, ...ALGORITHM_CHALLENGES]
  .map((c) =>
    ALGORITHMIC.has(c.id) && !c.tags.includes("algorithms")
      ? { ...c, tags: ["algorithms" as Tag, ...c.tags] }
      : c,
  )
  .sort((a, b) => ORDER[a.difficulty] - ORDER[b.difficulty]);

export function challengeById(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

export const CHALLENGE_XP: Record<Difficulty, number> = { easy: 30, medium: 60, hard: 100 };
