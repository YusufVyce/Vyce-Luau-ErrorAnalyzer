/**
 * More challenges: everyday game maths, text and table puzzles, and Roblox
 * world tasks. Same rules as challenges.ts — function challenges are graded
 * against the reference solution in the simulator.
 */
import { fmtValue } from "@/lib/learn/homework/harness";
import { Vector3 } from "@/lib/luau/roblox/datatypes";
import type { Instance } from "@/lib/luau/roblox/instance";
import type { Challenge } from "./challenges";
import { F, T } from "./define";

/** Lua source: drops the first newline and turns 4-space indents into tabs. */
const lua = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values)
    .replace(/^\n/, "")
    .replace(/^( {4})+/gm, (m) => "\t".repeat(m.length / 4))
    .replace(/\s+$/, "") + "\n";

const LOOT =
  '{{name = "Common", weight = 70}, {name = "Rare", weight = 25}, {name = "Legendary", weight = 5}}';

export const EXTRA_CHALLENGES: Challenge[] = [
  // ------------------------------------------------------------------ easy
  F({
    id: "can-afford",
    fn: "canAfford",
    params: "coins, price",
    title: { en: "Can I buy it?", tr: "Alabilir miyim?" },
    difficulty: "easy",
    tags: ["basics", "game"],
    prompt: {
      en: "Write `canAfford(coins, price)` that returns `true` when the player has enough coins to buy the item, otherwise `false`.",
      tr: "Oyuncunun eşyayı almaya yetecek kadar coini varsa `true`, yoksa `false` döndüren `canAfford(coins, price)` fonksiyonunu yaz.",
    },
    tests: T(["100, 50", "20, 50"], ["50, 50", "0, 0"]),
    solution: lua`
local function canAfford(coins, price)
    return coins >= price
end`,
    hints: {
      en: ["Exactly enough is enough: use `>=`."],
      tr: ["Tam yetecek kadar da yeter: `>=` kullan."],
    },
  }),
  F({
    id: "vip-bonus",
    fn: "vipBonus",
    params: "coins, isVip",
    title: { en: "VIP double coins", tr: "VIP çift coin" },
    difficulty: "easy",
    tags: ["basics", "game"],
    prompt: {
      en: "VIP players get double coins. Write `vipBonus(coins, isVip)` that returns `coins * 2` for VIPs and `coins` for everyone else.",
      tr: "VIP oyuncular çift coin alır. VIP'ler için `coins * 2`, diğer herkes için `coins` döndüren `vipBonus(coins, isVip)` fonksiyonunu yaz.",
    },
    tests: T(["100, true", "100, false"], ["0, true", "7, true", "15, false"]),
    solution: lua`
local function vipBonus(coins, isVip)
    if isVip then
        return coins * 2
    end
    return coins
end`,
    hints: {
      en: ["`if isVip then ... end` — isVip is already true or false."],
      tr: ["`if isVip then ... end` — isVip zaten true ya da false."],
    },
  }),
  F({
    id: "stars",
    fn: "stars",
    params: "n",
    title: { en: "Star rating", tr: "Yıldız puanı" },
    difficulty: "easy",
    tags: ["strings", "loops"],
    prompt: {
      en: 'Write `stars(n)` that returns a text with `n` stars, e.g. `stars(3)` → `"***"`. `stars(0)` is an empty text.',
      tr: '`n` tane yıldızdan oluşan bir metin döndüren `stars(n)` fonksiyonunu yaz, örneğin `stars(3)` → `"***"`. `stars(0)` boş metindir.',
    },
    tests: T(["3", "1"], ["0", "10"]),
    solution: lua`
local function stars(n)
    return string.rep("*", n)
end`,
    hints: {
      en: ['`string.rep("*", n)` repeats a text n times — or build it in a loop.'],
      tr: ['`string.rep("*", n)` bir metni n kez tekrarlar — ya da döngüyle oluştur.'],
    },
  }),
  F({
    id: "last-item",
    fn: "lastItem",
    params: "list",
    title: { en: "Last in the backpack", tr: "Çantadaki son eşya" },
    difficulty: "easy",
    tags: ["tables"],
    prompt: {
      en: "Write `lastItem(list)` that returns the last item of a list, or `nil` when the list is empty.",
      tr: "Bir listenin son elemanını, liste boşsa `nil` döndüren `lastItem(list)` fonksiyonunu yaz.",
    },
    tests: T(['{"Sword", "Shield", "Bow"}', '{"Apple"}'], ["{}", "{1, 2, 3, 4}"]),
    solution: lua`
local function lastItem(list)
    return list[#list]
end`,
    hints: {
      en: ["`#list` is the length; the last item is `list[#list]`."],
      tr: ["`#list` uzunluktur; son eleman `list[#list]`."],
    },
  }),
  F({
    id: "health-text",
    fn: "healthText",
    params: "hp, maxHp",
    title: { en: "Health bar label", tr: "Can barı yazısı" },
    difficulty: "easy",
    tags: ["math", "strings", "game"],
    prompt: {
      en: 'Write `healthText(hp, maxHp)` that returns the health as a whole percent with a % sign, rounded down — `healthText(75, 100)` → `"75%"`, `healthText(33, 99)` → `"33%"`.',
      tr: 'Canı aşağı yuvarlanmış tam yüzde olarak, % işaretiyle döndüren `healthText(hp, maxHp)` fonksiyonunu yaz — `healthText(75, 100)` → `"75%"`, `healthText(33, 99)` → `"33%"`.',
    },
    tests: T(["75, 100", "50, 200"], ["0, 100", "33, 99", "100, 100"]),
    solution: lua`
local function healthText(hp, maxHp)
    return math.floor(hp / maxHp * 100) .. "%"
end`,
    hints: {
      en: ["Percent = hp / maxHp * 100. `math.floor` rounds down.", 'Join with `.. "%"`.'],
      tr: ["Yüzde = hp / maxHp * 100. `math.floor` aşağı yuvarlar.", '`.. "%"` ile birleştir.'],
    },
  }),
  F({
    id: "sum-to",
    fn: "sumTo",
    params: "n",
    title: { en: "Add up to n", tr: "n'e kadar topla" },
    difficulty: "easy",
    tags: ["loops", "math"],
    prompt: {
      en: "Write `sumTo(n)` that returns 1 + 2 + … + n. `sumTo(0)` is 0.",
      tr: "1 + 2 + … + n toplamını döndüren `sumTo(n)` fonksiyonunu yaz. `sumTo(0)` 0'dır.",
    },
    tests: T(["5", "10"], ["1", "0", "100"]),
    solution: lua`
local function sumTo(n)
    local total = 0
    for i = 1, n do
        total += i
    end
    return total
end`,
    hints: {
      en: ["Start with `local total = 0` and add `i` in a `for i = 1, n do` loop."],
      tr: ["`local total = 0` ile başla ve `for i = 1, n do` döngüsünde `i` ekle."],
    },
  }),
  F({
    id: "count-positive",
    fn: "countPositive",
    params: "list",
    title: { en: "Count the positives", tr: "Pozitifleri say" },
    difficulty: "easy",
    tags: ["loops", "tables"],
    prompt: {
      en: "Write `countPositive(list)` that returns how many numbers in the list are greater than 0.",
      tr: "Listedeki sayılardan kaç tanesinin 0'dan büyük olduğunu döndüren `countPositive(list)` fonksiyonunu yaz.",
    },
    tests: T(["{1, -2, 3, 0}", "{-1, -5}"], ["{}", "{4, 4, 4}"]),
    solution: lua`
local function countPositive(list)
    local count = 0
    for _, n in ipairs(list) do
        if n > 0 then
            count += 1
        end
    end
    return count
end`,
    hints: {
      en: ["Loop with `for _, n in ipairs(list) do` and count when `n > 0`."],
      tr: ["`for _, n in ipairs(list) do` ile dön ve `n > 0` olunca say."],
    },
  }),
  F({
    id: "average",
    fn: "average",
    params: "list",
    title: { en: "Average score", tr: "Ortalama skor" },
    difficulty: "easy",
    tags: ["math", "tables"],
    prompt: {
      en: "Write `average(list)` that returns the average of the numbers. An empty list has an average of 0.",
      tr: "Sayıların ortalamasını döndüren `average(list)` fonksiyonunu yaz. Boş listenin ortalaması 0'dır.",
    },
    tests: T(["{2, 4, 6}", "{5}"], ["{}", "{1, 2}", "{-3, 3, 9}"]),
    solution: lua`
local function average(list)
    if #list == 0 then
        return 0
    end
    local total = 0
    for _, n in ipairs(list) do
        total += n
    end
    return total / #list
end`,
    hints: {
      en: ["Average = sum ÷ count.", "Check `#list == 0` first so you never divide by zero."],
      tr: ["Ortalama = toplam ÷ adet.", "Sıfıra bölmemek için önce `#list == 0` kontrol et."],
    },
  }),
  F({
    id: "letter-grade",
    fn: "grade",
    params: "score",
    title: { en: "Letter grade", tr: "Harf notu" },
    difficulty: "easy",
    tags: ["basics"],
    prompt: {
      en: 'Write `grade(score)` that returns `"A"` for 90 and up, `"B"` for 80–89, `"C"` for 70–79, `"D"` for 60–69 and `"F"` below 60.',
      tr: '90 ve üstü için `"A"`, 80–89 için `"B"`, 70–79 için `"C"`, 60–69 için `"D"` ve 60\'ın altı için `"F"` döndüren `grade(score)` fonksiyonunu yaz.',
    },
    tests: T(["95", "72"], ["60", "59", "80", "100", "0"]),
    solution: lua`
local function grade(score)
    if score >= 90 then
        return "A"
    elseif score >= 80 then
        return "B"
    elseif score >= 70 then
        return "C"
    elseif score >= 60 then
        return "D"
    end
    return "F"
end`,
    hints: {
      en: ["Check from the top: `if score >= 90 ... elseif score >= 80 ...`"],
      tr: ["Yukarıdan başla: `if score >= 90 ... elseif score >= 80 ...`"],
    },
  }),
  F({
    id: "to-fahrenheit",
    fn: "toFahrenheit",
    params: "c",
    title: { en: "Celsius to Fahrenheit", tr: "Celsius'tan Fahrenheit'a" },
    difficulty: "easy",
    tags: ["math"],
    prompt: {
      en: "Write `toFahrenheit(c)` that converts Celsius to Fahrenheit: `c * 9 / 5 + 32`.",
      tr: "Celsius'u Fahrenheit'a çeviren `toFahrenheit(c)` fonksiyonunu yaz: `c * 9 / 5 + 32`.",
    },
    tests: T(["0", "100"], ["-40", "37"]),
    solution: lua`
local function toFahrenheit(c)
    return c * 9 / 5 + 32
end`,
    hints: { en: ["Just return the formula."], tr: ["Formülü döndürmen yeterli."] },
  }),
  F({
    id: "contains",
    fn: "contains",
    params: "list, value",
    title: { en: "Do I own it?", tr: "Bende var mı?" },
    difficulty: "easy",
    tags: ["tables", "loops"],
    prompt: {
      en: "Write `contains(list, value)` that returns `true` if the value is in the list, otherwise `false` — without `table.find`.",
      tr: "Değer listede varsa `true`, yoksa `false` döndüren `contains(list, value)` fonksiyonunu yaz — `table.find` kullanmadan.",
    },
    tests: T(
      ['{"Sword", "Bow"}, "Bow"', '{"Sword", "Bow"}, "Axe"'],
      ['{}, "Sword"', "{1, 2, 3}, 3"],
    ),
    solution: lua`
local function contains(list, value)
    for _, item in ipairs(list) do
        if item == value then
            return true
        end
    end
    return false
end`,
    hints: {
      en: ["Return `true` as soon as you find it; after the loop return `false`."],
      tr: ["Bulur bulmaz `true` döndür; döngüden sonra `false` döndür."],
    },
  }),
  F({
    id: "armor-damage",
    fn: "damage",
    params: "attack, armor",
    title: { en: "Damage after armor", tr: "Zırhtan sonra hasar" },
    difficulty: "easy",
    tags: ["math", "game"],
    prompt: {
      en: "Armor blocks damage, but every hit does at least 1. Write `damage(attack, armor)` that returns `attack - armor`, but never less than 1.",
      tr: "Zırh hasarı engeller ama her vuruş en az 1 vurur. `attack - armor` döndüren ama asla 1'den az döndürmeyen `damage(attack, armor)` fonksiyonunu yaz.",
    },
    tests: T(["50, 20", "10, 30"], ["5, 5", "100, 0", "2, 1"]),
    solution: lua`
local function damage(attack, armor)
    return math.max(attack - armor, 1)
end`,
    hints: {
      en: ["`math.max(a, b)` gives the bigger one."],
      tr: ["`math.max(a, b)` büyük olanı verir."],
    },
  }),
  F({
    id: "cooldown-ready",
    fn: "isReady",
    params: "lastUsed, now, cooldown",
    title: { en: "Ability cooldown", tr: "Yetenek bekleme süresi" },
    difficulty: "easy",
    tags: ["basics", "game"],
    prompt: {
      en: "An ability was last used at time `lastUsed`. Write `isReady(lastUsed, now, cooldown)` that returns `true` when at least `cooldown` seconds have passed.",
      tr: "Bir yetenek en son `lastUsed` anında kullanıldı. En az `cooldown` saniye geçtiyse `true` döndüren `isReady(lastUsed, now, cooldown)` fonksiyonunu yaz.",
    },
    tests: T(["10, 15, 3", "10, 12, 3"], ["0, 5, 5", "100, 100, 0", "7, 9.9, 3"]),
    solution: lua`
local function isReady(lastUsed, now, cooldown)
    return now - lastUsed >= cooldown
end`,
    hints: {
      en: ["Time passed = `now - lastUsed`."],
      tr: ["Geçen süre = `now - lastUsed`."],
    },
  }),
  F({
    id: "distance",
    fn: "distance",
    params: "x1, y1, x2, y2",
    title: { en: "How far away?", tr: "Ne kadar uzakta?" },
    difficulty: "easy",
    tags: ["math"],
    prompt: {
      en: "Write `distance(x1, y1, x2, y2)` that returns the straight-line distance between two points (Pythagoras).",
      tr: "İki nokta arasındaki düz çizgi uzaklığını (Pisagor) döndüren `distance(x1, y1, x2, y2)` fonksiyonunu yaz.",
    },
    tests: T(["0, 0, 3, 4", "1, 1, 4, 5"], ["2, 2, 2, 2", "-1, -1, 2, 3"]),
    solution: lua`
local function distance(x1, y1, x2, y2)
    local dx = x2 - x1
    local dy = y2 - y1
    return math.sqrt(dx * dx + dy * dy)
end`,
    hints: {
      en: ["distance = √(dx² + dy²) — use `math.sqrt`."],
      tr: ["uzaklık = √(dx² + dy²) — `math.sqrt` kullan."],
    },
  }),
  F({
    id: "kd-ratio",
    fn: "kdRatio",
    params: "kills, deaths",
    title: { en: "K/D ratio", tr: "K/D oranı" },
    difficulty: "easy",
    tags: ["math", "game"],
    prompt: {
      en: "Write `kdRatio(kills, deaths)` that returns kills ÷ deaths rounded to 2 decimals. With 0 deaths, divide by 1 instead.",
      tr: "Öldürme ÷ ölüm oranını 2 ondalığa yuvarlanmış döndüren `kdRatio(kills, deaths)` fonksiyonunu yaz. Ölüm 0 ise 1'e böl.",
    },
    tests: T(["10, 4", "7, 0"], ["3, 9", "0, 5", "2, 3"]),
    solution: lua`
local function kdRatio(kills, deaths)
    local ratio = kills / math.max(deaths, 1)
    return math.floor(ratio * 100 + 0.5) / 100
end`,
    hints: {
      en: [
        "`math.max(deaths, 1)` never lets you divide by 0.",
        "Round to 2 decimals: `math.floor(x * 100 + 0.5) / 100`.",
      ],
      tr: [
        "`math.max(deaths, 1)` sıfıra bölmeyi engeller.",
        "2 ondalığa yuvarla: `math.floor(x * 100 + 0.5) / 100`.",
      ],
    },
  }),
  F({
    id: "word-count",
    fn: "wordCount",
    params: "text",
    title: { en: "Count the words", tr: "Kelimeleri say" },
    difficulty: "easy",
    tags: ["strings"],
    prompt: {
      en: "Write `wordCount(text)` that returns how many words the text has. Words are separated by one or more spaces.",
      tr: "Metinde kaç kelime olduğunu döndüren `wordCount(text)` fonksiyonunu yaz. Kelimeler bir ya da daha fazla boşlukla ayrılır.",
    },
    tests: T(['"I love Roblox"', '"  spaced   out  "'], ['""', '"one"']),
    solution: lua`
local function wordCount(text)
    local count = 0
    for _ in string.gmatch(text, "%S+") do
        count += 1
    end
    return count
end`,
    hints: {
      en: ['`string.gmatch(text, "%S+")` gives each run of non-space characters.'],
      tr: ['`string.gmatch(text, "%S+")` boşluk olmayan her karakter grubunu verir.'],
    },
  }),
  F({
    id: "round-to",
    fn: "roundTo",
    params: "n, step",
    title: { en: "Snap to the grid", tr: "Izgaraya oturt" },
    difficulty: "easy",
    tags: ["math", "game"],
    prompt: {
      en: "Building games snap positions to a grid. Write `roundTo(n, step)` that rounds n to the nearest multiple of step (halves round up) — `roundTo(47, 10)` → 50.",
      tr: "Yapı oyunları konumları bir ızgaraya oturtur. n'i step'in en yakın katına yuvarlayan (yarımlar yukarı) `roundTo(n, step)` fonksiyonunu yaz — `roundTo(47, 10)` → 50.",
    },
    tests: T(["47, 10", "12, 5"], ["7.4, 1", "250, 100", "-3, 4"]),
    solution: lua`
local function roundTo(n, step)
    return math.floor(n / step + 0.5) * step
end`,
    hints: {
      en: ["Divide by step, round with `math.floor(x + 0.5)`, multiply back."],
      tr: ["step'e böl, `math.floor(x + 0.5)` ile yuvarla, tekrar çarp."],
    },
  }),

  // ------------------------------------------------------------------ medium
  F({
    id: "initials",
    fn: "initials",
    params: "fullName",
    title: { en: "Initials", tr: "Baş harfler" },
    difficulty: "medium",
    tags: ["strings"],
    prompt: {
      en: 'Write `initials(fullName)` that returns the first letter of every word, in capitals — `initials("ada byron lovelace")` → `"ABL"`.',
      tr: 'Her kelimenin ilk harfini büyük harfle döndüren `initials(fullName)` fonksiyonunu yaz — `initials("ada byron lovelace")` → `"ABL"`.',
    },
    tests: T(['"john smith"', '"Ada Byron Lovelace"'], ['"vyce"', '"  two   spaces "']),
    solution: lua`
local function initials(fullName)
    local out = ""
    for word in string.gmatch(fullName, "%S+") do
        out = out .. string.upper(string.sub(word, 1, 1))
    end
    return out
end`,
    hints: {
      en: [
        'Loop over words with `string.gmatch(fullName, "%S+")`.',
        "`string.sub(word, 1, 1)` is the first letter; `string.upper` makes it a capital.",
      ],
      tr: [
        'Kelimeler üzerinde `string.gmatch(fullName, "%S+")` ile dön.',
        "`string.sub(word, 1, 1)` ilk harftir; `string.upper` onu büyük harf yapar.",
      ],
    },
  }),
  F({
    id: "top-three",
    fn: "topThree",
    params: "scores",
    title: { en: "Podium", tr: "Kürsü" },
    difficulty: "medium",
    tags: ["tables", "game"],
    prompt: {
      en: "`scores` maps names to points, like `{Ann = 50, Bob = 80}`. Write `topThree(scores)` that returns a list of the 3 best names, highest first. Equal scores go in alphabetical order. Fewer than 3 players → return them all.",
      tr: "`scores` isimleri puanlara eşler, örneğin `{Ann = 50, Bob = 80}`. En iyi 3 ismin listesini en yüksekten başlayarak döndüren `topThree(scores)` fonksiyonunu yaz. Eşit puanlar alfabetik sırayla gelir. 3'ten az oyuncu varsa hepsini döndür.",
    },
    tests: T(
      ["{Ann = 50, Bob = 80, Cid = 20, Dan = 70}", "{Zed = 10, Amy = 10}"],
      ["{}", "{A = 1, B = 2, C = 3, D = 3}"],
    ),
    solution: lua`
local function topThree(scores)
    local names = {}
    for name in pairs(scores) do
        table.insert(names, name)
    end
    table.sort(names, function(a, b)
        if scores[a] ~= scores[b] then
            return scores[a] > scores[b]
        end
        return a < b
    end)
    local top = {}
    for i = 1, math.min(3, #names) do
        top[i] = names[i]
    end
    return top
end`,
    hints: {
      en: [
        "Put the names in a list with `pairs`, then `table.sort` it.",
        "In the sort function compare scores first, then names.",
      ],
      tr: [
        "İsimleri `pairs` ile bir listeye koy, sonra `table.sort` ile sırala.",
        "Sıralama fonksiyonunda önce puanları, sonra isimleri karşılaştır.",
      ],
    },
  }),
  F({
    id: "chunk",
    fn: "chunk",
    params: "list, size",
    title: { en: "Split into groups", tr: "Gruplara böl" },
    difficulty: "medium",
    tags: ["tables", "loops"],
    prompt: {
      en: "Write `chunk(list, size)` that splits a list into smaller lists of `size` items (the last one can be shorter) — `chunk({1, 2, 3, 4, 5}, 2)` → `{{1, 2}, {3, 4}, {5}}`.",
      tr: "Bir listeyi `size` elemanlı küçük listelere bölen (sonuncusu daha kısa olabilir) `chunk(list, size)` fonksiyonunu yaz — `chunk({1, 2, 3, 4, 5}, 2)` → `{{1, 2}, {3, 4}, {5}}`.",
    },
    tests: T(["{1, 2, 3, 4, 5}, 2", '{"a", "b", "c"}, 3'], ["{}, 2", "{1, 2, 3}, 1"]),
    solution: lua`
local function chunk(list, size)
    local out = {}
    for i = 1, #list, size do
        local part = {}
        for j = i, math.min(i + size - 1, #list) do
            table.insert(part, list[j])
        end
        table.insert(out, part)
    end
    return out
end`,
    hints: {
      en: ["`for i = 1, #list, size do` jumps to the start of every group."],
      tr: ["`for i = 1, #list, size do` her grubun başına atlar."],
    },
  }),
  F({
    id: "flatten",
    fn: "flatten",
    params: "lists",
    title: { en: "Empty the chests", tr: "Sandıkları boşalt" },
    difficulty: "medium",
    tags: ["tables", "loops"],
    prompt: {
      en: 'Write `flatten(lists)` that turns a list of lists into one list, in order — `flatten({{"Sword"}, {"Bow", "Axe"}})` → `{"Sword", "Bow", "Axe"}`.',
      tr: 'Listelerden oluşan bir listeyi sırayla tek bir listeye çeviren `flatten(lists)` fonksiyonunu yaz — `flatten({{"Sword"}, {"Bow", "Axe"}})` → `{"Sword", "Bow", "Axe"}`.',
    },
    tests: T(["{{1, 2}, {3}, {}}", '{{"Sword"}, {"Bow", "Axe"}}'], ["{}", "{{}, {}}"]),
    solution: lua`
local function flatten(lists)
    local out = {}
    for _, list in ipairs(lists) do
        for _, item in ipairs(list) do
            table.insert(out, item)
        end
    end
    return out
end`,
    hints: {
      en: ["Two loops: one over the lists, one over each list's items."],
      tr: ["İki döngü: biri listeler üzerinde, biri her listenin elemanları üzerinde."],
    },
  }),
  F({
    id: "letter-count",
    fn: "letterCount",
    params: "text",
    title: { en: "Letter counter", tr: "Harf sayacı" },
    difficulty: "medium",
    tags: ["strings", "tables"],
    prompt: {
      en: 'Write `letterCount(text)` that returns a table counting each letter, in lowercase, ignoring everything that isn\'t a letter — `letterCount("Noob")` → `{b = 1, n = 1, o = 2}`.',
      tr: 'Her harfi küçük harfle sayan, harf olmayan her şeyi yok sayan bir tablo döndüren `letterCount(text)` fonksiyonunu yaz — `letterCount("Noob")` → `{b = 1, n = 1, o = 2}`.',
    },
    tests: T(['"Noob"', '"Hi, Hi!"'], ['""', '"123"', '"AaA"']),
    solution: lua`
local function letterCount(text)
    local counts = {}
    for ch in string.gmatch(string.lower(text), "%a") do
        counts[ch] = (counts[ch] or 0) + 1
    end
    return counts
end`,
    hints: {
      en: [
        '`string.gmatch(text, "%a")` gives one letter at a time.',
        "`counts[ch] = (counts[ch] or 0) + 1` counts it.",
      ],
      tr: [
        '`string.gmatch(text, "%a")` her seferinde bir harf verir.',
        "`counts[ch] = (counts[ch] or 0) + 1` onu sayar.",
      ],
    },
  }),
  F({
    id: "snake-to-camel",
    fn: "toCamel",
    params: "name",
    title: { en: "snake_case to camelCase", tr: "snake_case'ten camelCase'e" },
    difficulty: "medium",
    tags: ["strings"],
    prompt: {
      en: 'Write `toCamel(name)` that turns `"max_jump_power"` into `"maxJumpPower"`: remove each `_` and make the letter after it a capital.',
      tr: '`"max_jump_power"` metnini `"maxJumpPower"` yapan `toCamel(name)` fonksiyonunu yaz: her `_` işaretini sil ve ondan sonraki harfi büyük yap.',
    },
    tests: T(['"max_jump_power"', '"walk_speed"'], ['"health"', '"a_b_c"']),
    solution: lua`
local function toCamel(name)
    local result = string.gsub(name, "_(%a)", function(letter)
        return string.upper(letter)
    end)
    return result
end`,
    hints: {
      en: [
        '`string.gsub(name, "_(%a)", fn)` finds every _ followed by a letter.',
        "Return `string.upper(letter)` from fn.",
      ],
      tr: [
        '`string.gsub(name, "_(%a)", fn)` harften önceki her _ işaretini bulur.',
        "fn'den `string.upper(letter)` döndür.",
      ],
    },
  }),
  F({
    id: "format-duration",
    fn: "formatDuration",
    params: "seconds",
    title: { en: "Play time", tr: "Oynama süresi" },
    difficulty: "medium",
    tags: ["math", "strings"],
    prompt: {
      en: 'Write `formatDuration(seconds)` that returns text like `"1h 2m 5s"`. Leave out parts that are 0 (`3600` → `"1h"`), but `0` seconds is `"0s"`.',
      tr: '`"1h 2m 5s"` gibi bir metin döndüren `formatDuration(seconds)` fonksiyonunu yaz. 0 olan parçaları yazma (`3600` → `"1h"`), ama `0` saniye `"0s"` olur.',
    },
    tests: T(["3725", "45"], ["0", "3600", "7201", "60"]),
    solution: lua`
local function formatDuration(seconds)
    if seconds == 0 then
        return "0s"
    end
    local h = math.floor(seconds / 3600)
    local m = math.floor(seconds % 3600 / 60)
    local s = seconds % 60
    local parts = {}
    if h > 0 then
        table.insert(parts, h .. "h")
    end
    if m > 0 then
        table.insert(parts, m .. "m")
    end
    if s > 0 then
        table.insert(parts, s .. "s")
    end
    return table.concat(parts, " ")
end`,
    hints: {
      en: [
        "Hours: `math.floor(seconds / 3600)`. Minutes: `math.floor(seconds % 3600 / 60)`.",
        'Collect the parts in a list and join them with `table.concat(parts, " ")`.',
      ],
      tr: [
        "Saat: `math.floor(seconds / 3600)`. Dakika: `math.floor(seconds % 3600 / 60)`.",
        'Parçaları bir listede topla ve `table.concat(parts, " ")` ile birleştir.',
      ],
    },
  }),
  F({
    id: "add-item",
    fn: "addItem",
    params: "inventory, item, amount",
    title: { en: "Add to inventory", tr: "Envantere ekle" },
    difficulty: "medium",
    tags: ["tables", "game"],
    prompt: {
      en: "`inventory` maps item names to counts. Write `addItem(inventory, item, amount)` that adds `amount` (1 when it's nil) of the item and returns the inventory.",
      tr: "`inventory` eşya isimlerini adetlere eşler. Eşyadan `amount` kadar (nil ise 1) ekleyen ve envanteri döndüren `addItem(inventory, item, amount)` fonksiyonunu yaz.",
    },
    tests: T(
      ['{Sword = 1}, "Sword", 2', '{}, "Potion"'],
      ['{Bow = 1}, "Arrow", 20', '{Gem = 5}, "Gem"'],
    ),
    solution: lua`
local function addItem(inventory, item, amount)
    inventory[item] = (inventory[item] or 0) + (amount or 1)
    return inventory
end`,
    hints: {
      en: [
        "A missing item is nil — `(inventory[item] or 0)` starts it at 0.",
        "`amount or 1` gives 1 when amount is nil.",
      ],
      tr: [
        "Olmayan eşya nil'dir — `(inventory[item] or 0)` onu 0'dan başlatır.",
        "`amount or 1`, amount nil ise 1 verir.",
      ],
    },
  }),
  F({
    id: "xp-to-next",
    fn: "xpToNext",
    params: "xp",
    title: { en: "XP to the next level", tr: "Sonraki seviyeye kalan XP" },
    difficulty: "medium",
    tags: ["math", "loops", "game"],
    prompt: {
      en: "Level 2 costs 100 XP, level 3 another 200 (300 in total), level 4 another 300 (600 in total), and so on. Write `xpToNext(xp)` that returns how much XP is still needed for the next level.",
      tr: "Seviye 2 100 XP, seviye 3 200 XP daha (toplam 300), seviye 4 300 XP daha (toplam 600) tutar ve böyle devam eder. Sonraki seviyeye daha ne kadar XP gerektiğini döndüren `xpToNext(xp)` fonksiyonunu yaz.",
    },
    tests: T(["0", "150"], ["300", "599", "100", "1000"]),
    solution: lua`
local function xpToNext(xp)
    local reached = 0
    local cost = 100
    while xp >= reached + cost do
        reached += cost
        cost += 100
    end
    return reached + cost - xp
end`,
    hints: {
      en: [
        "Keep two numbers: the XP where the current level starts, and the cost of the next one.",
        "While xp reaches the next level, move both forward.",
      ],
      tr: [
        "İki sayı tut: şu anki seviyenin başladığı XP ve sonrakinin bedeli.",
        "xp sonraki seviyeye ulaştıkça ikisini de ilerlet.",
      ],
    },
  }),
  F({
    id: "cart-total",
    fn: "cartTotal",
    params: "cart, prices",
    title: { en: "Shopping cart", tr: "Alışveriş sepeti" },
    difficulty: "medium",
    tags: ["tables", "game"],
    prompt: {
      en: "`cart` is a list of item names (they can repeat) and `prices` maps names to prices. Write `cartTotal(cart, prices)` that returns the total cost. Items without a price are free.",
      tr: "`cart` eşya isimlerinin listesi (tekrar edebilir), `prices` isimleri fiyatlara eşler. Toplam fiyatı döndüren `cartTotal(cart, prices)` fonksiyonunu yaz. Fiyatı olmayan eşyalar bedavadır.",
    },
    tests: T(
      ['{"Sword", "Bow", "Sword"}, {Sword = 100, Bow = 60}', '{"Cake"}, {Sword = 100}'],
      ["{}, {}", '{"Gem", "Gem", "Gem"}, {Gem = 25}'],
    ),
    solution: lua`
local function cartTotal(cart, prices)
    local total = 0
    for _, item in ipairs(cart) do
        total += prices[item] or 0
    end
    return total
end`,
    hints: {
      en: ["`prices[item] or 0` is 0 when the item has no price."],
      tr: ["Eşyanın fiyatı yoksa `prices[item] or 0` 0 olur."],
    },
  }),
  F({
    id: "index-of",
    fn: "indexOf",
    params: "list, value",
    title: { en: "Where is it?", tr: "Nerede?" },
    difficulty: "medium",
    tags: ["tables", "loops"],
    prompt: {
      en: "Write `indexOf(list, value)` that returns the position of the first matching item, or `nil` if it isn't there — without `table.find`.",
      tr: "İlk eşleşen elemanın sırasını, yoksa `nil` döndüren `indexOf(list, value)` fonksiyonunu yaz — `table.find` kullanmadan.",
    },
    tests: T(['{"a", "b", "c"}, "b"', "{1, 2, 3}, 9"], ["{5, 5}, 5", '{}, "x"']),
    solution: lua`
local function indexOf(list, value)
    for i, item in ipairs(list) do
        if item == value then
            return i
        end
    end
    return nil
end`,
    hints: {
      en: ["`for i, item in ipairs(list)` gives the position `i` too."],
      tr: ["`for i, item in ipairs(list)` sırayı (`i`) da verir."],
    },
  }),
  F({
    id: "rotate",
    fn: "rotate",
    params: "list, k",
    title: { en: "Turn order", tr: "Sıra çevir" },
    difficulty: "medium",
    tags: ["tables", "math"],
    prompt: {
      en: "Write `rotate(list, k)` that returns a new list moved k places to the right (items that fall off the end come back at the start) — `rotate({1, 2, 3, 4, 5}, 2)` → `{4, 5, 1, 2, 3}`. k can be bigger than the list.",
      tr: "Listeyi k adım sağa kaydırılmış yeni bir liste olarak döndüren (sondan düşen elemanlar başa gelir) `rotate(list, k)` fonksiyonunu yaz — `rotate({1, 2, 3, 4, 5}, 2)` → `{4, 5, 1, 2, 3}`. k listeden büyük olabilir.",
    },
    tests: T(["{1, 2, 3, 4, 5}, 2", "{1, 2, 3}, 0"], ["{1, 2, 3}, 4", "{}, 3", '{"a", "b"}, 1']),
    solution: lua`
local function rotate(list, k)
    local n = #list
    local out = {}
    if n == 0 then
        return out
    end
    k = k % n
    for i = 1, n do
        out[(i + k - 1) % n + 1] = list[i]
    end
    return out
end`,
    hints: {
      en: ["`k % n` removes full turns.", "Item i lands at `(i + k - 1) % n + 1`."],
      tr: ["`k % n` tam turları atar.", "i. eleman `(i + k - 1) % n + 1` sırasına gider."],
    },
  }),
  F({
    id: "is-anagram",
    fn: "isAnagram",
    params: "a, b",
    title: { en: "Anagram check", tr: "Anagram kontrolü" },
    difficulty: "medium",
    tags: ["strings", "tables"],
    prompt: {
      en: 'Write `isAnagram(a, b)` that returns `true` when both texts use exactly the same letters, ignoring capitals and spaces — `isAnagram("Listen", "Silent")` → `true`.',
      tr: 'İki metin büyük harf ve boşlukları saymazsak tam olarak aynı harflerden oluşuyorsa `true` döndüren `isAnagram(a, b)` fonksiyonunu yaz — `isAnagram("Listen", "Silent")` → `true`.',
    },
    tests: T(
      ['"Listen", "Silent"', '"abc", "abd"'],
      ['"Dormitory", "Dirty room"', '"a", "aa"', '"", ""'],
    ),
    solution: lua`
local function isAnagram(a, b)
    local function key(text)
        local chars = {}
        for ch in string.gmatch(string.lower(text), "%S") do
            table.insert(chars, ch)
        end
        table.sort(chars)
        return table.concat(chars)
    end
    return key(a) == key(b)
end`,
    hints: {
      en: ["Sort the letters of each text and compare the results."],
      tr: ["Her metnin harflerini sırala ve sonuçları karşılaştır."],
    },
  }),
  F({
    id: "compress",
    fn: "compress",
    params: "text",
    title: { en: "Shrink the text", tr: "Metni küçült" },
    difficulty: "medium",
    tags: ["strings", "loops"],
    prompt: {
      en: 'Write `compress(text)` that writes each run of the same letter once, followed by its count when it\'s more than 1 — `compress("aaabcc")` → `"a3bc2"`.',
      tr: 'Aynı harften oluşan her grubu bir kez yazan, 1\'den fazlaysa yanına adedini ekleyen `compress(text)` fonksiyonunu yaz — `compress("aaabcc")` → `"a3bc2"`.',
    },
    tests: T(['"aaabcc"', '"abc"'], ['""', '"zzzzzzzzzzzz"', '"aabbaa"']),
    solution: lua`
local function compress(text)
    local out = {}
    local i = 1
    while i <= #text do
        local ch = string.sub(text, i, i)
        local j = i
        while string.sub(text, j + 1, j + 1) == ch do
            j += 1
        end
        local count = j - i + 1
        table.insert(out, if count > 1 then ch .. count else ch)
        i = j + 1
    end
    return table.concat(out)
end`,
    hints: {
      en: [
        "Walk with an index. From each letter, move forward while the next letter is the same.",
        "The run length is `j - i + 1`.",
      ],
      tr: [
        "Bir sırayla ilerle. Her harften, sonraki harf aynı olduğu sürece ileri git.",
        "Grubun uzunluğu `j - i + 1`.",
      ],
    },
  }),
  F({
    id: "decompress",
    fn: "decompress",
    params: "text",
    title: { en: "Unpack the text", tr: "Metni aç" },
    difficulty: "medium",
    tags: ["strings"],
    prompt: {
      en: 'The opposite of compress: write `decompress(text)` where a letter followed by a number repeats that many times — `decompress("a3bc2")` → `"aaabcc"`. Numbers can have more than one digit.',
      tr: 'compress\'in tersi: bir harften sonra gelen sayı o harfi o kadar tekrarlar — `decompress("a3bc2")` → `"aaabcc"`. `decompress(text)` fonksiyonunu yaz. Sayılar birden fazla basamaklı olabilir.',
    },
    tests: T(['"a3bc2"', '"abc"'], ['""', '"z12"', '"x1y2"']),
    solution: lua`
local function decompress(text)
    local out = {}
    for letter, count in string.gmatch(text, "(%a)(%d*)") do
        table.insert(out, string.rep(letter, tonumber(count) or 1))
    end
    return table.concat(out)
end`,
    hints: {
      en: [
        '`string.gmatch(text, "(%a)(%d*)")` gives each letter with the digits after it.',
        '`tonumber("")` is nil, so use `tonumber(count) or 1`.',
      ],
      tr: [
        '`string.gmatch(text, "(%a)(%d*)")` her harfi arkasındaki rakamlarla verir.',
        '`tonumber("")` nil\'dir, bu yüzden `tonumber(count) or 1` kullan.',
      ],
    },
  }),
  F({
    id: "second-largest",
    fn: "secondLargest",
    params: "list",
    title: { en: "Runner-up", tr: "İkinci olan" },
    difficulty: "medium",
    tags: ["tables", "loops"],
    prompt: {
      en: "Write `secondLargest(list)` that returns the second-biggest different number, or `nil` when there isn't one — `{10, 10, 8}` → 8, `{3, 3}` → nil.",
      tr: "Birbirinden farklı sayılar arasında ikinci en büyüğü, yoksa `nil` döndüren `secondLargest(list)` fonksiyonunu yaz — `{10, 10, 8}` → 8, `{3, 3}` → nil.",
    },
    tests: T(["{5, 1, 9, 7}", "{3, 3, 3}"], ["{10, 10, 8}", "{}", "{-1, -5}"]),
    solution: lua`
local function secondLargest(list)
    local first, second
    for _, n in ipairs(list) do
        if first == nil or n > first then
            second = first
            first = n
        elseif n < first and (second == nil or n > second) then
            second = n
        end
    end
    return second
end`,
    hints: {
      en: [
        "Keep the biggest and the second biggest while you loop.",
        "Skip numbers equal to the biggest.",
      ],
      tr: ["Dönerken en büyüğü ve ikinci en büyüğü tut.", "En büyüğe eşit sayıları atla."],
    },
  }),
  F({
    id: "zip",
    fn: "zip",
    params: "names, scores",
    title: { en: "Pair them up", tr: "Eşleştir" },
    difficulty: "medium",
    tags: ["tables"],
    prompt: {
      en: 'Write `zip(names, scores)` that returns a table mapping each name to the score at the same position — `zip({"Ann", "Bob"}, {10, 20})` → `{Ann = 10, Bob = 20}`.',
      tr: 'Her ismi aynı sıradaki skora eşleyen bir tablo döndüren `zip(names, scores)` fonksiyonunu yaz — `zip({"Ann", "Bob"}, {10, 20})` → `{Ann = 10, Bob = 20}`.',
    },
    tests: T(['{"Ann", "Bob"}, {10, 20}'], ["{}, {}", '{"Solo"}, {99}']),
    solution: lua`
local function zip(names, scores)
    local out = {}
    for i, name in ipairs(names) do
        out[name] = scores[i]
    end
    return out
end`,
    hints: {
      en: ["Loop over names with their index; the score is `scores[i]`."],
      tr: ["İsimler üzerinde sırasıyla dön; skor `scores[i]`."],
    },
  }),
  F({
    id: "split-teams",
    fn: "splitTeams",
    params: "players",
    title: { en: "Red vs Blue", tr: "Kırmızı - Mavi" },
    difficulty: "medium",
    tags: ["tables", "game"],
    prompt: {
      en: "Write `splitTeams(players)` that returns `{Red = {...}, Blue = {...}}`: the 1st, 3rd, 5th… player go to Red, the 2nd, 4th… to Blue, keeping their order.",
      tr: "`{Red = {...}, Blue = {...}}` döndüren `splitTeams(players)` fonksiyonunu yaz: 1., 3., 5.… oyuncu Red'e, 2., 4.… oyuncu Blue'ya gider; sıraları korunur.",
    },
    tests: T(['{"A", "B", "C", "D", "E"}'], ["{}", '{"Solo"}']),
    solution: lua`
local function splitTeams(players)
    local teams = { Red = {}, Blue = {} }
    for i, name in ipairs(players) do
        if i % 2 == 1 then
            table.insert(teams.Red, name)
        else
            table.insert(teams.Blue, name)
        end
    end
    return teams
end`,
    hints: {
      en: ["`i % 2 == 1` is true for odd positions."],
      tr: ["`i % 2 == 1` tek sıralar için true'dur."],
    },
  }),
  F({
    id: "primes",
    fn: "primesUpTo",
    params: "n",
    title: { en: "Prime numbers", tr: "Asal sayılar" },
    difficulty: "medium",
    tags: ["math", "loops"],
    prompt: {
      en: "Write `primesUpTo(n)` that returns a list of every prime number from 2 to n.",
      tr: "2'den n'e kadar bütün asal sayıların listesini döndüren `primesUpTo(n)` fonksiyonunu yaz.",
    },
    tests: T(["10", "2"], ["1", "30"]),
    solution: lua`
local function primesUpTo(n)
    local primes = {}
    for x = 2, n do
        local isPrime = true
        for d = 2, math.floor(math.sqrt(x)) do
            if x % d == 0 then
                isPrime = false
                break
            end
        end
        if isPrime then
            table.insert(primes, x)
        end
    end
    return primes
end`,
    hints: {
      en: ["A number is prime when nothing from 2 to √x divides it (`x % d == 0`)."],
      tr: ["2'den √x'e kadar hiçbir sayı onu bölmüyorsa (`x % d == 0`) sayı asaldır."],
    },
  }),
  F({
    id: "transpose",
    fn: "transpose",
    params: "grid",
    title: { en: "Flip the grid", tr: "Izgarayı çevir" },
    difficulty: "medium",
    tags: ["tables", "loops"],
    prompt: {
      en: "Write `transpose(grid)` that swaps rows and columns — `{{1, 2, 3}, {4, 5, 6}}` → `{{1, 4}, {2, 5}, {3, 6}}`.",
      tr: "Satırlarla sütunların yerini değiştiren `transpose(grid)` fonksiyonunu yaz — `{{1, 2, 3}, {4, 5, 6}}` → `{{1, 4}, {2, 5}, {3, 6}}`.",
    },
    tests: T(["{{1, 2, 3}, {4, 5, 6}}"], ["{{7}}", "{}", "{{1, 2}, {3, 4}}"]),
    solution: lua`
local function transpose(grid)
    local out = {}
    if #grid == 0 then
        return out
    end
    for c = 1, #grid[1] do
        out[c] = {}
        for r = 1, #grid do
            out[c][r] = grid[r][c]
        end
    end
    return out
end`,
    hints: {
      en: ["`out[c][r] = grid[r][c]` for every row r and column c."],
      tr: ["Her r satırı ve c sütunu için `out[c][r] = grid[r][c]`."],
    },
  }),
  F({
    id: "commas",
    fn: "commas",
    params: "n",
    title: { en: "Big numbers", tr: "Büyük sayılar" },
    difficulty: "medium",
    tags: ["strings", "math"],
    prompt: {
      en: 'Write `commas(n)` that writes a whole number with commas between thousands — `1234567` → `"1,234,567"`, `-1000` → `"-1,000"`.',
      tr: 'Bir tam sayıyı binlerin arasına virgül koyarak yazan `commas(n)` fonksiyonunu yaz — `1234567` → `"1,234,567"`, `-1000` → `"-1,000"`.',
    },
    tests: T(["1234567", "999"], ["-1000", "0", "1000000"]),
    solution: lua`
local function commas(n)
    local digits = tostring(math.abs(n))
    local out = ""
    while #digits > 3 do
        out = "," .. string.sub(digits, -3) .. out
        digits = string.sub(digits, 1, -4)
    end
    local sign = if n < 0 then "-" else ""
    return sign .. digits .. out
end`,
    hints: {
      en: [
        "Work on the digits of `math.abs(n)` from the right: `string.sub(digits, -3)` is the last three.",
      ],
      tr: ["`math.abs(n)` rakamlarıyla sağdan çalış: `string.sub(digits, -3)` son üç rakamdır."],
    },
  }),
  F({
    id: "longest-streak",
    fn: "longestStreak",
    params: "days",
    title: { en: "Longest streak", tr: "En uzun seri" },
    difficulty: "medium",
    tags: ["loops", "game"],
    prompt: {
      en: "`days` is a list of `true` (played that day) and `false`. Write `longestStreak(days)` that returns the longest run of `true` in a row.",
      tr: "`days`, `true` (o gün oynadı) ve `false` değerlerinden oluşan bir liste. Art arda gelen en uzun `true` serisini döndüren `longestStreak(days)` fonksiyonunu yaz.",
    },
    tests: T(
      ["{true, true, false, true}", "{false}"],
      ["{}", "{true, true, true}", "{true, false, true, true, true, false}"],
    ),
    solution: lua`
local function longestStreak(days)
    local best, current = 0, 0
    for _, played in ipairs(days) do
        if played then
            current += 1
            best = math.max(best, current)
        else
            current = 0
        end
    end
    return best
end`,
    hints: {
      en: ["Count the current run; reset it on `false`; remember the best."],
      tr: ["Şu anki seriyi say; `false` gelince sıfırla; en iyisini hatırla."],
    },
  }),
  F({
    id: "sort-players",
    fn: "sortPlayers",
    params: "players",
    title: { en: "Sort the scoreboard", tr: "Skor tablosunu sırala" },
    difficulty: "medium",
    tags: ["tables", "game"],
    prompt: {
      en: "`players` is a list of `{name = ..., score = ...}`. Write `sortPlayers(players)` that returns just the names, highest score first; equal scores in alphabetical order.",
      tr: "`players`, `{name = ..., score = ...}` tablolarından oluşan bir liste. En yüksek skordan başlayarak sadece isimleri döndüren `sortPlayers(players)` fonksiyonunu yaz; eşit skorlar alfabetik sırada.",
    },
    tests: T(
      ['{{name = "Ann", score = 5}, {name = "Bob", score = 9}, {name = "Cid", score = 5}}'],
      ["{}", '{{name = "Zoe", score = 1}, {name = "Amy", score = 2}}'],
    ),
    solution: lua`
local function sortPlayers(players)
    table.sort(players, function(a, b)
        if a.score ~= b.score then
            return a.score > b.score
        end
        return a.name < b.name
    end)
    local names = {}
    for _, p in ipairs(players) do
        table.insert(names, p.name)
    end
    return names
end`,
    hints: {
      en: ["`table.sort(players, function(a, b) ... end)` with the score first, then the name."],
      tr: ["`table.sort(players, function(a, b) ... end)` ile önce skoru, sonra ismi karşılaştır."],
    },
  }),
  F({
    id: "caesar",
    fn: "caesar",
    params: "text, shift",
    title: { en: "Secret code", tr: "Gizli şifre" },
    difficulty: "medium",
    tags: ["strings", "math"],
    prompt: {
      en: 'Write `caesar(text, shift)` that moves every letter `shift` places in the alphabet, wrapping around (z → a) and keeping capitals; other characters stay the same — `caesar("Hello, World!", 3)` → `"Khoor, Zruog!"`. shift can be negative.',
      tr: 'Her harfi alfabede `shift` kadar kaydıran, sona gelince başa dönen (z → a) ve büyük harfleri koruyan `caesar(text, shift)` fonksiyonunu yaz; diğer karakterler aynı kalır — `caesar("Hello, World!", 3)` → `"Khoor, Zruog!"`. shift negatif olabilir.',
    },
    tests: T(['"abc", 1', '"Hello, World!", 3'], ['"xyz", 3', '"Abc", -1', '"Roblox", 26']),
    solution: lua`
local function caesar(text, shift)
    local result = string.gsub(text, "%a", function(ch)
        local base = if string.byte(ch) >= 97 then 97 else 65
        return string.char((string.byte(ch) - base + shift) % 26 + base)
    end)
    return result
end`,
    hints: {
      en: [
        "`string.byte` turns a letter into a number; `string.char` turns it back.",
        "Lowercase letters start at 97, capitals at 65. Use `% 26` to wrap around.",
      ],
      tr: [
        "`string.byte` harfi sayıya, `string.char` sayıyı harfe çevirir.",
        "Küçük harfler 97'den, büyükler 65'ten başlar. Başa dönmek için `% 26` kullan.",
      ],
    },
  }),
  F({
    id: "two-sum",
    fn: "twoSum",
    params: "list, target",
    title: { en: "Exact change", tr: "Tam para üstü" },
    difficulty: "medium",
    tags: ["tables", "loops"],
    prompt: {
      en: "Write `twoSum(list, target)` that returns `{i, j}` (i < j) for the first two positions whose numbers add up to target — check i = 1 with every j first, then i = 2… Return `nil` when no pair works.",
      tr: "Sayıları toplamı target eden ilk iki sıra için `{i, j}` (i < j) döndüren `twoSum(list, target)` fonksiyonunu yaz — önce i = 1'i her j ile dene, sonra i = 2… Uyan çift yoksa `nil` döndür.",
    },
    tests: T(["{2, 7, 11, 15}, 9", "{3, 2, 4}, 6"], ["{1, 2}, 10", "{5, 5}, 10", "{}, 0"]),
    solution: lua`
local function twoSum(list, target)
    for i = 1, #list do
        for j = i + 1, #list do
            if list[i] + list[j] == target then
                return { i, j }
            end
        end
    end
    return nil
end`,
    hints: {
      en: ["Two nested loops: `for i = 1, #list` and `for j = i + 1, #list`."],
      tr: ["İç içe iki döngü: `for i = 1, #list` ve `for j = i + 1, #list`."],
    },
  }),
  F({
    id: "loot-pick",
    fn: "pickLoot",
    params: "loot, roll",
    title: { en: "Loot table", tr: "Ganimet tablosu" },
    difficulty: "medium",
    tags: ["game", "tables"],
    prompt: {
      en: "`loot` is a list of `{name, weight}`; `roll` is a number from 0 up to (not including) the total weight. Walk the list adding weights; return the name of the first item whose running total is bigger than roll. With weights 70, 25, 5: roll 0–69.9 → first, 70–94.9 → second, 95+ → third.",
      tr: "`loot`, `{name, weight}` listesi; `roll` 0'dan toplam ağırlığa kadar (dahil değil) bir sayı. Listede ağırlıkları toplayarak ilerle; ara toplamı roll'dan büyük olan ilk eşyanın adını döndür. 70, 25, 5 ağırlıklarında: roll 0–69.9 → ilk, 70–94.9 → ikinci, 95+ → üçüncü.",
    },
    tests: T(
      [`${LOOT}, 0`, `${LOOT}, 80`],
      [`${LOOT}, 69.9`, `${LOOT}, 70`, `${LOOT}, 95`, `${LOOT}, 99.99`],
    ),
    solution: lua`
local function pickLoot(loot, roll)
    local total = 0
    for _, entry in ipairs(loot) do
        total += entry.weight
        if roll < total then
            return entry.name
        end
    end
    return nil
end`,
    hints: {
      en: ["Add each weight to a running total; the first time `roll < total`, that's the item."],
      tr: ["Her ağırlığı ara toplama ekle; `roll < total` olduğu ilk an o eşyadır."],
    },
  }),
  F({
    id: "competition-ranks",
    fn: "ranks",
    params: "scores",
    title: { en: "Tie ranks", tr: "Beraberlik sıraları" },
    difficulty: "medium",
    tags: ["tables", "game"],
    prompt: {
      en: "`scores` is sorted highest first. Write `ranks(scores)` that returns each player's place; equal scores share a place and the next place is skipped — `{100, 90, 90, 80}` → `{1, 2, 2, 4}`.",
      tr: "`scores` en yüksekten sıralı. Her oyuncunun derecesini döndüren `ranks(scores)` fonksiyonunu yaz; eşit skorlar aynı dereceyi paylaşır ve sonraki derece atlanır — `{100, 90, 90, 80}` → `{1, 2, 2, 4}`.",
    },
    tests: T(["{100, 90, 90, 80}", "{50}"], ["{}", "{7, 7, 7}", "{9, 8, 8, 8, 1}"]),
    solution: lua`
local function ranks(scores)
    local out = {}
    for i, score in ipairs(scores) do
        if i > 1 and score == scores[i - 1] then
            out[i] = out[i - 1]
        else
            out[i] = i
        end
    end
    return out
end`,
    hints: {
      en: ["A player's place is their position i — unless they tie with the one before."],
      tr: ["Bir oyuncunun derecesi sırası i'dir — öncekiyle berabere değilse."],
    },
  }),

  // ------------------------------------------------------------------ hard
  F({
    id: "balanced",
    fn: "isBalanced",
    params: "text",
    title: { en: "Balanced brackets", tr: "Dengeli parantezler" },
    difficulty: "hard",
    tags: ["strings", "tables"],
    prompt: {
      en: 'Write `isBalanced(text)` that returns `true` when every `(`, `[` and `{` is closed by the right bracket in the right order. Other characters don\'t matter — `"{[()]}()"` → true, `"(]"` → false.',
      tr: 'Her `(`, `[` ve `{` doğru parantezle doğru sırada kapanıyorsa `true` döndüren `isBalanced(text)` fonksiyonunu yaz. Diğer karakterler önemli değil — `"{[()]}()"` → true, `"(]"` → false.',
    },
    tests: T(['"(a[b]{c})"', '"(]"'], ['""', '"(("', '"{[()]}()"', '")("']),
    solution: lua`
local function isBalanced(text)
    local closes = { [")"] = "(", ["]"] = "[", ["}"] = "{" }
    local stack = {}
    for ch in string.gmatch(text, ".") do
        if ch == "(" or ch == "[" or ch == "{" then
            table.insert(stack, ch)
        elseif closes[ch] then
            if table.remove(stack) ~= closes[ch] then
                return false
            end
        end
    end
    return #stack == 0
end`,
    hints: {
      en: [
        "Use a list as a stack: push opening brackets, pop on closing ones.",
        "A closing bracket must match the last opening one. At the end the stack must be empty.",
      ],
      tr: [
        "Bir listeyi yığın olarak kullan: açılanları ekle, kapananlarda çıkar.",
        "Kapanan parantez son açılanla eşleşmeli. Sonunda yığın boş olmalı.",
      ],
    },
  }),
  F({
    id: "merge-intervals",
    fn: "mergeIntervals",
    params: "list",
    title: { en: "Merge time slots", tr: "Zaman aralıklarını birleştir" },
    difficulty: "hard",
    tags: ["tables"],
    prompt: {
      en: "`list` holds intervals like `{1, 3}`. Write `mergeIntervals(list)` that returns them sorted by start, merging any that overlap or touch — `{{1, 3}, {2, 6}, {8, 10}}` → `{{1, 6}, {8, 10}}`.",
      tr: "`list`, `{1, 3}` gibi aralıklar tutar. Onları başlangıca göre sıralı, çakışan ya da değenleri birleştirerek döndüren `mergeIntervals(list)` fonksiyonunu yaz — `{{1, 3}, {2, 6}, {8, 10}}` → `{{1, 6}, {8, 10}}`.",
    },
    tests: T(
      ["{{1, 3}, {2, 6}, {8, 10}}", "{{5, 7}, {1, 2}}"],
      ["{}", "{{1, 4}, {4, 5}}", "{{1, 10}, {2, 3}}"],
    ),
    solution: lua`
local function mergeIntervals(list)
    table.sort(list, function(a, b)
        return a[1] < b[1]
    end)
    local out = {}
    for _, interval in ipairs(list) do
        local last = out[#out]
        if last and interval[1] <= last[2] then
            last[2] = math.max(last[2], interval[2])
        else
            table.insert(out, { interval[1], interval[2] })
        end
    end
    return out
end`,
    hints: {
      en: [
        "Sort by start first.",
        "If an interval starts before the last merged one ends, stretch the last one; otherwise add it.",
      ],
      tr: [
        "Önce başlangıca göre sırala.",
        "Bir aralık son birleşenin bitişinden önce başlıyorsa sonuncuyu uzat; yoksa ekle.",
      ],
    },
  }),
  F({
    id: "tic-tac-toe",
    fn: "winner",
    params: "board",
    title: { en: "Tic-tac-toe judge", tr: "XOX hakemi" },
    difficulty: "hard",
    tags: ["game", "strings", "loops"],
    prompt: {
      en: '`board` is 3 rows like `{"XO.", "X.O", "X.."}` (`.` is empty). Write `winner(board)` that returns `"X"` or `"O"` for three in a row (row, column or diagonal), `"draw"` when the board is full with no winner, and `"none"` otherwise.',
      tr: '`board`, `{"XO.", "X.O", "X.."}` gibi 3 satır (`.` boş). Satır, sütun ya da çaprazda üçleyen için `"X"` veya `"O"`, tahta dolu ve kazanan yoksa `"draw"`, diğer durumlarda `"none"` döndüren `winner(board)` fonksiyonunu yaz.',
    },
    tests: T(
      ['{"XXX", "OO.", "..."}', '{"XO.", "XO.", ".O."}', '{"XOX", "XOO", "OXX"}'],
      ['{"X..", ".X.", "..X"}', '{"...", "...", "..."}', '{"..O", ".O.", "O.."}'],
    ),
    solution: lua`
local function winner(board)
    local function at(r, c)
        return string.sub(board[r], c, c)
    end
    local lines = {
        { { 1, 1 }, { 1, 2 }, { 1, 3 } },
        { { 2, 1 }, { 2, 2 }, { 2, 3 } },
        { { 3, 1 }, { 3, 2 }, { 3, 3 } },
        { { 1, 1 }, { 2, 1 }, { 3, 1 } },
        { { 1, 2 }, { 2, 2 }, { 3, 2 } },
        { { 1, 3 }, { 2, 3 }, { 3, 3 } },
        { { 1, 1 }, { 2, 2 }, { 3, 3 } },
        { { 1, 3 }, { 2, 2 }, { 3, 1 } },
    }
    for _, line in ipairs(lines) do
        local a = at(line[1][1], line[1][2])
        if a ~= "." and a == at(line[2][1], line[2][2]) and a == at(line[3][1], line[3][2]) then
            return a
        end
    end
    for r = 1, 3 do
        if string.find(board[r], ".", 1, true) then
            return "none"
        end
    end
    return "draw"
end`,
    hints: {
      en: [
        "List the 8 lines (3 rows, 3 columns, 2 diagonals) as cell positions.",
        "`string.sub(board[r], c, c)` reads one cell.",
      ],
      tr: [
        "8 çizgiyi (3 satır, 3 sütun, 2 çapraz) hücre konumları olarak listele.",
        "`string.sub(board[r], c, c)` bir hücreyi okur.",
      ],
    },
  }),
  F({
    id: "shortest-path",
    fn: "shortestPath",
    params: "grid",
    title: { en: "Maze runner", tr: "Labirent koşucusu" },
    difficulty: "hard",
    tags: ["game", "tables", "loops"],
    prompt: {
      en: '`grid` is a list of rows like `{"S.#", "..#", "#.E"}`: `S` start, `E` exit, `#` wall, `.` floor. Moving up, down, left or right takes 1 step. Write `shortestPath(grid)` that returns the fewest steps from S to E, or -1 if E can\'t be reached.',
      tr: '`grid`, `{"S.#", "..#", "#.E"}` gibi satırlardan oluşur: `S` başlangıç, `E` çıkış, `#` duvar, `.` zemin. Yukarı, aşağı, sola ya da sağa gitmek 1 adımdır. S\'den E\'ye en az adım sayısını, E\'ye ulaşılamıyorsa -1 döndüren `shortestPath(grid)` fonksiyonunu yaz.',
    },
    tests: T(
      ['{"S.#", "..#", "#.E"}', '{"S#E"}'],
      ['{"SE"}', '{"S...", "###.", "E..."}', '{"S.", "#.", "E#"}'],
    ),
    solution: lua`
local function shortestPath(grid)
    local rows, cols = #grid, #grid[1]
    local function cell(r, c)
        return string.sub(grid[r], c, c)
    end
    local startR, startC
    for r = 1, rows do
        for c = 1, cols do
            if cell(r, c) == "S" then
                startR, startC = r, c
            end
        end
    end
    local steps = { [startR * 1000 + startC] = 0 }
    local queue = { { startR, startC } }
    local head = 1
    while head <= #queue do
        local r, c = queue[head][1], queue[head][2]
        head += 1
        if cell(r, c) == "E" then
            return steps[r * 1000 + c]
        end
        for _, d in ipairs({ { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }) do
            local nr, nc = r + d[1], c + d[2]
            local key = nr * 1000 + nc
            if nr >= 1 and nr <= rows and nc >= 1 and nc <= cols and cell(nr, nc) ~= "#" and steps[key] == nil then
                steps[key] = steps[r * 1000 + c] + 1
                table.insert(queue, { nr, nc })
            end
        end
    end
    return -1
end`,
    hints: {
      en: [
        "Breadth-first search: explore all cells 1 step away, then 2 steps, and so on, using a queue.",
        "Remember the steps to each visited cell so you never visit it twice.",
      ],
      tr: [
        "Genişlik öncelikli arama: bir kuyruk kullanarak önce 1 adım uzaktaki bütün hücreleri, sonra 2 adımı gez.",
        "Ziyaret ettiğin her hücrenin adım sayısını hatırla ki iki kez gitmeyesin.",
      ],
    },
  }),
  F({
    id: "word-wrap",
    fn: "wrap",
    params: "text, width",
    title: { en: "Word wrap", tr: "Satır kaydır" },
    difficulty: "hard",
    tags: ["strings", "tables"],
    prompt: {
      en: 'Write `wrap(text, width)` that splits text into lines of at most `width` characters, never cutting a word: fill each line with as many words as fit (joined by one space). A word longer than width gets a line of its own. Return the list of lines — `wrap("the quick brown fox", 10)` → `{"the quick", "brown fox"}`.',
      tr: 'Metni en fazla `width` karakterlik satırlara bölen, hiçbir kelimeyi kesmeyen `wrap(text, width)` fonksiyonunu yaz: her satıra sığabildiği kadar kelime koy (tek boşlukla). width\'ten uzun kelime kendi satırına geçer. Satır listesini döndür — `wrap("the quick brown fox", 10)` → `{"the quick", "brown fox"}`.',
    },
    tests: T(
      ['"the quick brown fox", 10', '"Roblox is fun", 6'],
      ['"", 5', '"supercalifragilistic word", 5', '"a b c d", 3'],
    ),
    solution: lua`
local function wrap(text, width)
    local lines = {}
    local line = ""
    for word in string.gmatch(text, "%S+") do
        if line == "" then
            line = word
        elseif #line + 1 + #word <= width then
            line = line .. " " .. word
        else
            table.insert(lines, line)
            line = word
        end
    end
    if line ~= "" then
        table.insert(lines, line)
    end
    return lines
end`,
    hints: {
      en: [
        "Build the current line word by word.",
        "If adding a space and the next word would pass `width`, save the line and start a new one.",
      ],
      tr: [
        "Şu anki satırı kelime kelime oluştur.",
        "Bir boşluk ve sonraki kelime `width`'i aşacaksa satırı kaydet ve yenisine başla.",
      ],
    },
  }),
  F({
    id: "rpn",
    fn: "evalRPN",
    params: "tokens",
    title: { en: "Stack calculator", tr: "Yığın hesap makinesi" },
    difficulty: "hard",
    tags: ["math", "tables"],
    prompt: {
      en: 'Write `evalRPN(tokens)` for a calculator where operators come after their numbers: `{"2", "3", "+", "4", "*"}` means (2 + 3) * 4 = 20. Support `+ - * /`. Numbers go on a stack; an operator takes the top two, applies itself and pushes the result.',
      tr: 'İşlemlerin sayılardan sonra geldiği bir hesap makinesi için `evalRPN(tokens)` fonksiyonunu yaz: `{"2", "3", "+", "4", "*"}` (2 + 3) * 4 = 20 demek. `+ - * /` desteklensin. Sayılar bir yığına girer; işlem en üstteki iki sayıyı alır, uygular ve sonucu yığına koyar.',
    },
    tests: T(
      ['{"2", "3", "+", "4", "*"}', '{"10", "2", "/"}'],
      ['{"5"}', '{"4", "2", "-", "3", "*"}', '{"1", "2", "3", "*", "+"}'],
    ),
    solution: lua`
local function evalRPN(tokens)
    local stack = {}
    for _, token in ipairs(tokens) do
        local n = tonumber(token)
        if n then
            table.insert(stack, n)
        else
            local b = table.remove(stack)
            local a = table.remove(stack)
            if token == "+" then
                table.insert(stack, a + b)
            elseif token == "-" then
                table.insert(stack, a - b)
            elseif token == "*" then
                table.insert(stack, a * b)
            else
                table.insert(stack, a / b)
            end
        end
    end
    return stack[1]
end`,
    hints: {
      en: [
        "`tonumber(token)` is nil for operators.",
        "Pop b first, then a — order matters for - and /.",
      ],
      tr: [
        "İşlemler için `tonumber(token)` nil'dir.",
        "Önce b'yi, sonra a'yı çıkar — - ve / için sıra önemli.",
      ],
    },
  }),
  F({
    id: "spiral",
    fn: "spiral",
    params: "grid",
    title: { en: "Spiral walk", tr: "Sarmal yürüyüş" },
    difficulty: "hard",
    tags: ["tables", "loops"],
    prompt: {
      en: "Write `spiral(grid)` that returns the values of a grid walked clockwise from the top-left, spiralling inwards — `{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}` → `{1, 2, 3, 6, 9, 8, 7, 4, 5}`.",
      tr: "Bir ızgaranın değerlerini sol üstten başlayıp saat yönünde içe doğru sarmal gezerek döndüren `spiral(grid)` fonksiyonunu yaz — `{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}` → `{1, 2, 3, 6, 9, 8, 7, 4, 5}`.",
    },
    tests: T(
      ["{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}", "{{1, 2}, {3, 4}}"],
      ["{{1, 2, 3, 4}}", "{}", "{{1}, {2}, {3}}"],
    ),
    solution: lua`
local function spiral(grid)
    local out = {}
    if #grid == 0 then
        return out
    end
    local top, bottom, left, right = 1, #grid, 1, #grid[1]
    while top <= bottom and left <= right do
        for c = left, right do
            table.insert(out, grid[top][c])
        end
        top += 1
        for r = top, bottom do
            table.insert(out, grid[r][right])
        end
        right -= 1
        if top <= bottom then
            for c = right, left, -1 do
                table.insert(out, grid[bottom][c])
            end
            bottom -= 1
        end
        if left <= right then
            for r = bottom, top, -1 do
                table.insert(out, grid[r][left])
            end
            left += 1
        end
    end
    return out
end`,
    hints: {
      en: [
        "Keep four edges: top, bottom, left, right.",
        "Walk the top row, right column, bottom row, left column, and move each edge inwards.",
      ],
      tr: [
        "Dört kenar tut: top, bottom, left, right.",
        "Üst satırı, sağ sütunu, alt satırı, sol sütunu gez ve her kenarı içeri kaydır.",
      ],
    },
  }),

  // ------------------------------------------------------------------ Roblox world
  {
    kind: "world",
    id: "kill-brick",
    title: { en: "Kill brick", tr: "Öldüren blok" },
    difficulty: "easy",
    tags: ["roblox", "game"],
    prompt: {
      en: "workspace.KillBrick already exists. When a player's character touches it, set their Humanoid's Health to 0. Other parts touching it must not cause errors.",
      tr: "workspace.KillBrick zaten var. Bir oyuncunun karakteri ona dokununca Humanoid'inin Health değerini 0 yap. Ona başka parçaların değmesi hata vermemeli.",
    },
    starter: "local brick = workspace.KillBrick\n\n",
    solution: lua`
local brick = workspace.KillBrick

brick.Touched:Connect(function(hit)
    local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
    if humanoid then
        humanoid.Health = 0
    end
end)`,
    hints: {
      en: [
        "`brick.Touched:Connect(function(hit) ... end)`",
        '`hit.Parent:FindFirstChildOfClass("Humanoid")` is nil for parts that aren\'t a character.',
      ],
      tr: [
        "`brick.Touched:Connect(function(hit) ... end)`",
        '`hit.Parent:FindFirstChildOfClass("Humanoid")` karakter olmayan parçalar için nil\'dir.',
      ],
    },
    grade(h) {
      const w = h.newWorld();
      const brick = w.create(
        "Part",
        { Name: "KillBrick", Anchored: true, Position: new Vector3(10, 0.5, 0) },
        w.workspace,
      );
      h.addStudentScript(w, w.service("ServerScriptService"));
      const p = w.addPlayer("Builderman");
      w.run(1);
      const rock = w.create("Part", { Name: "Rock" }, w.workspace);
      const before = h.studentErrors(w).length;
      w.touch(brick, rock);
      w.run(0.2);
      h.check(
        h.t("A rock touching it doesn't cause an error", "Kaya değince hata çıkmıyor"),
        h.studentErrors(w).length === before,
        h.studentErrors(w)[before]?.message,
      );
      const hum = (p.props.get("Character") as Instance | undefined)?.findFirstChild("Humanoid");
      w.touchWithCharacter(brick, p, "LeftFoot");
      w.run(0.3);
      const hp = hum?.props.get("Health");
      h.check(
        h.t("Touching it sets Health to 0", "Dokunmak Health'i 0 yapıyor"),
        hp === 0,
        `Health = ${fmtValue(hp)}`,
      );
    },
  },
  {
    kind: "world",
    id: "leaderstats-setup",
    title: { en: "Leaderboard stats", tr: "Lider tablosu değerleri" },
    difficulty: "easy",
    tags: ["roblox"],
    prompt: {
      en: 'When a player joins, give them a Folder named "leaderstats" with two IntValues: "Coins" starting at 0 and "Level" starting at 1.',
      tr: 'Bir oyuncu oyuna girince ona "leaderstats" adında bir Folder ver; içinde iki IntValue olsun: 0\'dan başlayan "Coins" ve 1\'den başlayan "Level".',
    },
    starter: 'local Players = game:GetService("Players")\n\n',
    solution: lua`
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player

    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Value = 0
    coins.Parent = leaderstats

    local level = Instance.new("IntValue")
    level.Name = "Level"
    level.Value = 1
    level.Parent = leaderstats
end)`,
    hints: {
      en: [
        "`Players.PlayerAdded:Connect(function(player) ... end)`",
        'The folder must be named exactly "leaderstats" (lowercase) and parented to the player.',
      ],
      tr: [
        "`Players.PlayerAdded:Connect(function(player) ... end)`",
        'Klasörün adı tam olarak "leaderstats" (küçük harf) olmalı ve oyuncunun içine konmalı.',
      ],
    },
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"));
      for (const name of ["Ann", "Bob"]) {
        const p = w.addPlayer(name);
        w.run(0.5);
        const ls = p.findFirstChild("leaderstats");
        if (
          !h.check(
            h.t(`${name} has a leaderstats folder`, `${name} için leaderstats klasörü var`),
            ls?.className === "Folder",
            h.t(
              'Create a Folder named "leaderstats" inside the player.',
              'Oyuncunun içinde "leaderstats" adında bir Folder oluştur.',
            ),
          )
        )
          return;
        const coins = ls?.findFirstChild("Coins");
        const level = ls?.findFirstChild("Level");
        h.check(
          h.t(`${name}: Coins is an IntValue at 0`, `${name}: Coins 0 değerinde bir IntValue`),
          coins?.className === "IntValue" && coins.props.get("Value") === 0,
          `Coins = ${coins ? `${coins.className} ${fmtValue(coins.props.get("Value"))}` : "nil"}`,
        );
        h.check(
          h.t(`${name}: Level is an IntValue at 1`, `${name}: Level 1 değerinde bir IntValue`),
          level?.className === "IntValue" && level.props.get("Value") === 1,
          `Level = ${level ? `${level.className} ${fmtValue(level.props.get("Value"))}` : "nil"}`,
        );
      }
    },
  },
  {
    kind: "world",
    id: "coin-pickup",
    title: { en: "Collect the coin", tr: "Coini topla" },
    difficulty: "medium",
    tags: ["roblox", "game"],
    prompt: {
      en: 'Give every player a "leaderstats" Folder with an IntValue "Coins" at 0. workspace.Coin already exists: when a character touches it, give that player 5 coins and destroy the coin, so it can only be collected once.',
      tr: 'Her oyuncuya içinde 0 değerinde "Coins" IntValue\'su olan bir "leaderstats" Folder\'ı ver. workspace.Coin zaten var: bir karakter ona dokununca o oyuncuya 5 coin ver ve coini yok et, böylece sadece bir kez toplanabilsin.',
    },
    starter: 'local Players = game:GetService("Players")\nlocal coin = workspace.Coin\n\n',
    solution: lua`
local Players = game:GetService("Players")
local coin = workspace.Coin

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Parent = leaderstats
end)

local collected = false
coin.Touched:Connect(function(hit)
    if collected then
        return
    end
    local player = Players:GetPlayerFromCharacter(hit.Parent)
    if not player then
        return
    end
    collected = true
    player.leaderstats.Coins.Value += 5
    coin:Destroy()
end)`,
    hints: {
      en: [
        "`Players:GetPlayerFromCharacter(hit.Parent)` gives the player, or nil for other parts.",
        "Use a `collected` flag so two touches in a row can't pay twice.",
      ],
      tr: [
        "`Players:GetPlayerFromCharacter(hit.Parent)` oyuncuyu verir, başka parçalar için nil döner.",
        "Arka arkaya iki dokunuş iki kez ödeme yapmasın diye bir `collected` bayrağı kullan.",
      ],
    },
    grade(h) {
      const w = h.newWorld();
      const coin = w.create(
        "Part",
        { Name: "Coin", Anchored: true, Position: new Vector3(8, 1, 8) },
        w.workspace,
      );
      h.addStudentScript(w, w.service("ServerScriptService"));
      const p = w.addPlayer("Ann");
      w.run(1);
      const coins = () => p.findFirstChild("leaderstats")?.findFirstChild("Coins");
      if (
        !h.check(
          h.t("The player has leaderstats.Coins", "Oyuncunun leaderstats.Coins değeri var"),
          coins()?.className === "IntValue",
          h.t(
            'Create leaderstats with an IntValue "Coins" when a player joins.',
            'Oyuncu girince içinde "Coins" IntValue\'su olan leaderstats oluştur.',
          ),
        )
      )
        return;
      const rock = w.create("Part", { Name: "Rock" }, w.workspace);
      const before = h.studentErrors(w).length;
      w.touch(coin, rock);
      w.run(0.2);
      h.check(
        h.t("A rock touching the coin does nothing", "Coine kaya değmesi bir şey yapmıyor"),
        h.studentErrors(w).length === before && coin.parent === w.workspace,
        h.studentErrors(w)[before]?.message ??
          h.t("The coin disappeared without a player.", "Coin oyuncu olmadan kayboldu."),
      );
      w.touchWithCharacter(coin, p, "LeftFoot");
      w.touchWithCharacter(coin, p, "RightFoot");
      w.run(0.3);
      const value = coins()?.props.get("Value");
      h.check(
        h.t("Touching the coin gives exactly 5 coins", "Coine dokunmak tam 5 coin veriyor"),
        value === 5,
        `Coins = ${fmtValue(value)}`,
      );
      h.check(
        h.t("The coin is gone after being collected", "Toplandıktan sonra coin yok oluyor"),
        coin.parent !== w.workspace,
        h.t("workspace.Coin is still there.", "workspace.Coin hâlâ orada."),
      );
    },
  },
  {
    kind: "world",
    id: "click-door",
    title: { en: "Click to open", tr: "Tıkla aç" },
    difficulty: "medium",
    tags: ["roblox", "game"],
    prompt: {
      en: "workspace.Door has a ClickDetector. Each click toggles the door: open means Transparency 0.5 and CanCollide false; closed means Transparency 0 and CanCollide true. It starts closed.",
      tr: "workspace.Door içinde bir ClickDetector var. Her tıklama kapıyı açıp kapatsın: açık demek Transparency 0.5 ve CanCollide false; kapalı demek Transparency 0 ve CanCollide true. Kapı kapalı başlar.",
    },
    starter: "local door = workspace.Door\nlocal detector = door.ClickDetector\n\n",
    solution: lua`
local door = workspace.Door
local detector = door.ClickDetector
local open = false

detector.MouseClick:Connect(function(player)
    open = not open
    door.Transparency = if open then 0.5 else 0
    door.CanCollide = not open
end)`,
    hints: {
      en: [
        "`detector.MouseClick:Connect(function(player) ... end)` runs on each click.",
        "Keep an `open` variable and flip it with `open = not open`.",
      ],
      tr: [
        "`detector.MouseClick:Connect(function(player) ... end)` her tıklamada çalışır.",
        "Bir `open` değişkeni tut ve `open = not open` ile tersine çevir.",
      ],
    },
    grade(h) {
      const w = h.newWorld();
      const door = w.create(
        "Part",
        {
          Name: "Door",
          Anchored: true,
          Size: new Vector3(4, 8, 1),
          Position: new Vector3(0, 4, 10),
        },
        w.workspace,
      );
      const detector = w.create("ClickDetector", { Name: "ClickDetector" }, door);
      h.addStudentScript(w, w.service("ServerScriptService"));
      const p = w.addPlayer("Ann");
      w.run(0.5);
      const state = () => ({
        t: door.props.get("Transparency"),
        c: door.props.get("CanCollide"),
      });
      w.click(detector, p);
      w.run(0.2);
      const opened = state();
      h.check(
        h.t("First click opens it", "İlk tıklama açıyor"),
        opened.t === 0.5 && opened.c === false,
        `Transparency = ${fmtValue(opened.t)}, CanCollide = ${fmtValue(opened.c)}`,
      );
      w.click(detector, p);
      w.run(0.2);
      const closed = state();
      h.check(
        h.t("Second click closes it", "İkinci tıklama kapatıyor"),
        closed.t === 0 && closed.c === true,
        `Transparency = ${fmtValue(closed.t)}, CanCollide = ${fmtValue(closed.c)}`,
      );
      w.click(detector, p);
      w.run(0.2);
      h.check(
        h.t("Third click opens it again", "Üçüncü tıklama tekrar açıyor"),
        state().t === 0.5 && state().c === false,
        `Transparency = ${fmtValue(state().t)}, CanCollide = ${fmtValue(state().c)}`,
      );
    },
  },
  {
    kind: "world",
    id: "heal-station",
    title: { en: "Healing station", tr: "İyileştirme istasyonu" },
    difficulty: "medium",
    tags: ["roblox", "game"],
    prompt: {
      en: "workspace.HealStation has a ProximityPrompt. When a player triggers it, set their character's Humanoid Health back to its MaxHealth.",
      tr: "workspace.HealStation içinde bir ProximityPrompt var. Bir oyuncu onu tetikleyince karakterinin Humanoid Health değerini MaxHealth'e geri getir.",
    },
    starter: "local prompt = workspace.HealStation.ProximityPrompt\n\n",
    solution: lua`
local prompt = workspace.HealStation.ProximityPrompt

prompt.Triggered:Connect(function(player)
    local character = player.Character
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    if humanoid then
        humanoid.Health = humanoid.MaxHealth
    end
end)`,
    hints: {
      en: [
        "`prompt.Triggered:Connect(function(player) ... end)` gives you the player.",
        "The Humanoid is inside `player.Character`.",
      ],
      tr: [
        "`prompt.Triggered:Connect(function(player) ... end)` sana oyuncuyu verir.",
        "Humanoid, `player.Character` içindedir.",
      ],
    },
    grade(h) {
      const w = h.newWorld();
      const station = w.create(
        "Part",
        { Name: "HealStation", Anchored: true, Position: new Vector3(6, 1, 0) },
        w.workspace,
      );
      const prompt = w.create("ProximityPrompt", { Name: "ProximityPrompt" }, station);
      h.addStudentScript(w, w.service("ServerScriptService"));
      const p = w.addPlayer("Ann");
      w.run(1);
      const hum = (p.props.get("Character") as Instance | undefined)?.findFirstChild("Humanoid");
      hum?.props.set("Health", 20);
      w.trigger(prompt, p);
      w.run(0.3);
      const hp = hum?.props.get("Health");
      const max = hum?.props.get("MaxHealth");
      h.check(
        h.t("Triggering the prompt heals to full", "İstemi tetiklemek canı fulleyiyor"),
        hp !== undefined && hp === max,
        `Health = ${fmtValue(hp)}, MaxHealth = ${fmtValue(max)}`,
      );
    },
  },
  {
    kind: "world",
    id: "remote-shop",
    title: { en: "Safe shop remote", tr: "Güvenli mağaza remote'u" },
    difficulty: "hard",
    tags: ["roblox", "game"],
    prompt: {
      en: 'Players get leaderstats with an IntValue "Coins" starting at 100. ReplicatedStorage.BuyItem is a RemoteEvent. When a client fires it with "Sword" and has at least 50 coins, take 50 coins and put a Tool named "Sword" in their Backpack. Never trust the client: ignore unknown items and never let coins go below 0.',
      tr: 'Oyunculara 100\'den başlayan "Coins" IntValue\'su olan leaderstats ver. ReplicatedStorage.BuyItem bir RemoteEvent. Bir istemci onu "Sword" ile tetiklediğinde en az 50 coini varsa 50 coin al ve Backpack\'ine "Sword" adında bir Tool koy. İstemciye asla güvenme: bilinmeyen eşyaları yok say ve coinlerin 0\'ın altına inmesine izin verme.',
    },
    starter:
      'local Players = game:GetService("Players")\nlocal buyItem = game.ReplicatedStorage.BuyItem\n\n',
    solution: lua`
local Players = game:GetService("Players")
local buyItem = game.ReplicatedStorage.BuyItem
local PRICES = { Sword = 50 }

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Value = 100
    coins.Parent = leaderstats
end)

buyItem.OnServerEvent:Connect(function(player, item)
    local price = PRICES[item]
    local coins = player.leaderstats.Coins
    if not price or coins.Value < price then
        return
    end
    coins.Value -= price
    local tool = Instance.new("Tool")
    tool.Name = item
    tool.Parent = player.Backpack
end)`,
    hints: {
      en: [
        "`buyItem.OnServerEvent:Connect(function(player, item) ... end)` — the first argument is always the player.",
        "Keep prices on the server, e.g. `local PRICES = { Sword = 50 }`, and check them there.",
      ],
      tr: [
        "`buyItem.OnServerEvent:Connect(function(player, item) ... end)` — ilk argüman her zaman oyuncudur.",
        "Fiyatları sunucuda tut, örneğin `local PRICES = { Sword = 50 }`, ve kontrolü orada yap.",
      ],
    },
    grade(h) {
      const w = h.newWorld();
      const remote = w.create("RemoteEvent", { Name: "BuyItem" }, w.service("ReplicatedStorage"));
      h.addStudentScript(w, w.service("ServerScriptService"));
      const p = w.addPlayer("Ann");
      w.run(1);
      const coins = () => p.findFirstChild("leaderstats")?.findFirstChild("Coins");
      const swords = () =>
        p
          .findFirstChild("Backpack")
          ?.children.filter((c) => c.name === "Sword" && c.className === "Tool").length ?? 0;
      if (
        !h.check(
          h.t("Players start with 100 coins", "Oyuncular 100 coinle başlıyor"),
          coins()?.props.get("Value") === 100,
          `Coins = ${fmtValue(coins()?.props.get("Value"))}`,
        )
      )
        return;
      w.fireServer(remote, p, "Sword");
      w.run(0.2);
      h.check(
        h.t(
          "Buying a sword costs 50 and gives a Tool",
          "Kılıç almak 50 tutuyor ve bir Tool veriyor",
        ),
        coins()?.props.get("Value") === 50 && swords() === 1,
        `Coins = ${fmtValue(coins()?.props.get("Value"))}, Sword × ${swords()}`,
      );
      w.fireServer(remote, p, "Nuke");
      w.run(0.2);
      h.check(
        h.t("Unknown items are ignored", "Bilinmeyen eşyalar yok sayılıyor"),
        coins()?.props.get("Value") === 50 &&
          swords() === 1 &&
          !p.findFirstChild("Backpack")?.findFirstChild("Nuke"),
        `Coins = ${fmtValue(coins()?.props.get("Value"))}`,
      );
      w.fireServer(remote, p, "Sword");
      w.fireServer(remote, p, "Sword");
      w.run(0.2);
      h.check(
        h.t("Coins never go below 0", "Coinler asla 0'ın altına inmiyor"),
        coins()?.props.get("Value") === 0 && swords() === 2,
        `Coins = ${fmtValue(coins()?.props.get("Value"))}, Sword × ${swords()}`,
      );
    },
  },
];
