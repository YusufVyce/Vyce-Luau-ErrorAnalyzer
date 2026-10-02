/**
 * Algorithm challenges: searching, sorting, number theory, two pointers,
 * dynamic programming, backtracking and grids. Hidden tests use bigger
 * inputs, so a slow brute-force answer runs out of time.
 */
import type { FunctionChallenge } from "./challenges";
import { F, T } from "./define";

/** Lua for a list 1..n (or with a step) used in big hidden tests. */
const range = (n: number, f = "i") =>
  `(function() local t = {} for i = 1, ${n} do t[i] = ${f} end return t end)()`;

export const ALGORITHM_CHALLENGES: FunctionChallenge[] = [
  // ------------------------------------------------------------------ easy
  F({
    id: "sum-digits",
    fn: "sumDigits",
    params: "n",
    title: { en: "Sum of digits", tr: "Rakamların toplamı" },
    difficulty: "easy",
    tags: ["algorithms", "math"],
    prompt: {
      en: "Write `sumDigits(n)` that adds up the digits of a non-negative whole number. `sumDigits(1234)` is `10`. Use `%` and division, not strings.",
      tr: "Negatif olmayan bir tam sayının rakamlarını toplayan `sumDigits(n)` fonksiyonunu yaz. `sumDigits(1234)` sonucu `10`. Metin değil, `%` ve bölme kullan.",
    },
    tests: T(["1234", "7"], ["0", "99999", "1000001"]),
    solution:
      "local function sumDigits(n)\n\tlocal total = 0\n\twhile n > 0 do\n\t\ttotal += n % 10\n\t\tn = math.floor(n / 10)\n\tend\n\treturn total\nend\n",
    hints: {
      en: [
        "`n % 10` is the last digit.",
        "`math.floor(n / 10)` removes the last digit. Repeat while n > 0.",
      ],
      tr: [
        "`n % 10` son rakamdır.",
        "`math.floor(n / 10)` son rakamı atar. n > 0 olduğu sürece tekrarla.",
      ],
    },
  }),
  F({
    id: "is-sorted",
    fn: "isSorted",
    params: "list",
    title: { en: "Already sorted?", tr: "Zaten sıralı mı?" },
    difficulty: "easy",
    tags: ["algorithms", "tables"],
    prompt: {
      en: "Write `isSorted(list)` that returns `true` if every number is less than or equal to the next one. An empty list is sorted.",
      tr: "Her sayı bir sonrakinden küçük ya da ona eşitse `true` döndüren `isSorted(list)` fonksiyonunu yaz. Boş liste sıralıdır.",
    },
    tests: T(["{ 1, 2, 2, 5 }", "{ 3, 1, 2 }"], ["{}", "{ 7 }", "{ 1, 2, 3, 4, 0 }"]),
    solution:
      "local function isSorted(list)\n\tfor i = 2, #list do\n\t\tif list[i - 1] > list[i] then\n\t\t\treturn false\n\t\tend\n\tend\n\treturn true\nend\n",
    hints: {
      en: [
        "Compare each item with the one before it: list[i - 1] and list[i].",
        "Return false as soon as one pair is out of order.",
      ],
      tr: [
        "Her elemanı bir öncekiyle karşılaştır: list[i - 1] ve list[i].",
        "Sırası bozuk ilk çiftte hemen false döndür.",
      ],
    },
  }),
  F({
    id: "gcd",
    fn: "gcd",
    params: "a, b",
    title: { en: "Greatest common divisor", tr: "En büyük ortak bölen" },
    difficulty: "easy",
    tags: ["algorithms", "math"],
    prompt: {
      en: "Write `gcd(a, b)` with Euclid's algorithm: while b isn't 0, replace (a, b) with (b, a % b). Then a is the answer. `gcd(12, 18)` is `6`.",
      tr: "`gcd(a, b)` fonksiyonunu Öklid algoritmasıyla yaz: b 0 olmadığı sürece (a, b)'yi (b, a % b) yap. Sonra cevap a'dır. `gcd(12, 18)` sonucu `6`.",
    },
    tests: T(["12, 18", "7, 5"], ["100, 75", "0, 9", "1071, 462"]),
    solution:
      "local function gcd(a, b)\n\twhile b ~= 0 do\n\t\ta, b = b, a % b\n\tend\n\treturn a\nend\n",
    hints: {
      en: ["Luau can swap in one line: a, b = b, a % b", "Loop with while b ~= 0 do … end"],
      tr: ["Luau tek satırda takas yapabilir: a, b = b, a % b", "while b ~= 0 do … end ile dön"],
    },
  }),
  F({
    id: "power-of-two",
    fn: "isPowerOfTwo",
    params: "n",
    title: { en: "Power of two", tr: "İkinin kuvveti" },
    difficulty: "easy",
    tags: ["algorithms", "math"],
    prompt: {
      en: "Write `isPowerOfTwo(n)` that returns `true` for 1, 2, 4, 8, 16… and `false` for every other number (including 0 and negatives).",
      tr: "1, 2, 4, 8, 16… için `true`, diğer her sayı için (0 ve negatifler dahil) `false` döndüren `isPowerOfTwo(n)` fonksiyonunu yaz.",
    },
    tests: T(["8", "12"], ["1", "0", "-4", "1024", "1000"]),
    solution:
      "local function isPowerOfTwo(n)\n\tif n < 1 then\n\t\treturn false\n\tend\n\twhile n % 2 == 0 do\n\t\tn /= 2\n\tend\n\treturn n == 1\nend\n",
    hints: {
      en: [
        "Numbers below 1 are never powers of two.",
        "Keep dividing by 2 while the number is even. Did you end at 1?",
      ],
      tr: [
        "1'den küçük sayılar asla ikinin kuvveti değildir.",
        "Sayı çift olduğu sürece 2'ye bölmeye devam et. 1'de mi bittin?",
      ],
    },
  }),
  F({
    id: "missing-number",
    fn: "missingNumber",
    params: "list",
    title: { en: "The missing ticket", tr: "Kayıp bilet" },
    difficulty: "easy",
    tags: ["algorithms", "math"],
    prompt: {
      en: "A list holds every number from 1 to n except one, in any order. Write `missingNumber(list)` that finds it in one pass. Hint: what should the total be?",
      tr: "Bir liste, biri hariç 1'den n'ye kadar her sayıyı herhangi bir sırada tutuyor. Onu tek geçişte bulan `missingNumber(list)` fonksiyonunu yaz. İpucu: toplam ne olmalıydı?",
    },
    tests: T(
      ["{ 3, 1, 4 }", "{ 2 }"],
      ["{ 1 }", "{ 5, 2, 3, 1 }", range(4999, "i < 777 and i or i + 1")],
    ),
    solution:
      "local function missingNumber(list)\n\tlocal n = #list + 1\n\tlocal expected = n * (n + 1) / 2\n\tlocal total = 0\n\tfor _, v in list do\n\t\ttotal += v\n\tend\n\treturn expected - total\nend\n",
    hints: {
      en: [
        "The full list would have #list + 1 numbers.",
        "1 + 2 + … + n = n * (n + 1) / 2. Subtract what you actually have.",
      ],
      tr: [
        "Tam liste #list + 1 sayı tutardı.",
        "1 + 2 + … + n = n * (n + 1) / 2. Elindekilerin toplamını çıkar.",
      ],
    },
  }),

  // ------------------------------------------------------------------ medium
  F({
    id: "lcm",
    fn: "lcm",
    params: "a, b",
    title: { en: "When do the timers meet?", tr: "Sayaçlar ne zaman buluşur?" },
    difficulty: "medium",
    tags: ["algorithms", "math"],
    prompt: {
      en: "One event repeats every a seconds, another every b seconds. Write `lcm(a, b)`: the first time (after 0) both happen together — the least common multiple. Use gcd: lcm = a * b / gcd(a, b).",
      tr: "Bir olay her a saniyede, diğeri her b saniyede tekrarlanıyor. İkisinin (0'dan sonra) ilk kez birlikte olduğu anı veren `lcm(a, b)`'yi yaz — en küçük ortak kat. gcd kullan: lcm = a * b / gcd(a, b).",
    },
    tests: T(["4, 6", "5, 7"], ["12, 12", "1, 99", "84, 36"]),
    solution:
      "local function gcd(a, b)\n\twhile b ~= 0 do\n\t\ta, b = b, a % b\n\tend\n\treturn a\nend\n\nlocal function lcm(a, b)\n\treturn a * b / gcd(a, b)\nend\n",
    hints: {
      en: ["Write a small gcd helper first (Euclid).", "lcm(a, b) = a * b / gcd(a, b)"],
      tr: ["Önce küçük bir gcd yardımcısı yaz (Öklid).", "lcm(a, b) = a * b / gcd(a, b)"],
    },
  }),
  F({
    id: "count-primes",
    fn: "countPrimes",
    params: "n",
    title: { en: "Sieve of Eratosthenes", tr: "Eratosthenes kalburu" },
    difficulty: "medium",
    tags: ["algorithms", "math", "loops"],
    prompt: {
      en: "Write `countPrimes(n)` that counts the primes ≤ n. The hidden tests use n = 5000, so checking every number one by one is too slow — use a sieve: cross out multiples of each prime.",
      tr: "n'ye eşit ya da küçük asal sayıları sayan `countPrimes(n)` fonksiyonunu yaz. Gizli testler n = 5000 kullanıyor; her sayıyı tek tek denemek çok yavaş — kalbur kullan: her asalın katlarını üstünü çiz.",
    },
    tests: T(["10", "2"], ["1", "100", "5000"]),
    solution:
      "local function countPrimes(n)\n\tlocal composite = {}\n\tlocal count = 0\n\tfor i = 2, n do\n\t\tif not composite[i] then\n\t\t\tcount += 1\n\t\t\tfor j = i * i, n, i do\n\t\t\t\tcomposite[j] = true\n\t\t\tend\n\t\tend\n\tend\n\treturn count\nend\n",
    hints: {
      en: [
        "Keep a table composite[i] = true for numbers that are not prime.",
        "When i is prime, mark i*i, i*i+i, i*i+2i… — for j = i * i, n, i do",
      ],
      tr: [
        "Asal olmayan sayılar için composite[i] = true tutan bir tablo kullan.",
        "i asalsa i*i, i*i+i, i*i+2i… işaretle — for j = i * i, n, i do",
      ],
    },
  }),
  F({
    id: "to-decimal",
    fn: "toDecimal",
    params: "bits",
    title: { en: "Binary to decimal", tr: "İkilikten onluğa" },
    difficulty: "medium",
    tags: ["algorithms", "strings", "math"],
    prompt: {
      en: 'Write `toDecimal(bits)` that turns a binary string into a number without tonumber(…, 2). `toDecimal("1011")` is `11`.',
      tr: 'Bir ikilik (binary) metni tonumber(…, 2) kullanmadan sayıya çeviren `toDecimal(bits)` fonksiyonunu yaz. `toDecimal("1011")` sonucu `11`.',
    },
    tests: T(['"1011"', '"0"'], ['"1"', '"11111111"', '"1000000000"']),
    solution:
      'local function toDecimal(bits)\n\tlocal n = 0\n\tfor i = 1, #bits do\n\t\tn = n * 2 + (if bits:sub(i, i) == "1" then 1 else 0)\n\tend\n\treturn n\nend\n',
    hints: {
      en: [
        "Go left to right. Each step: n = n * 2 + digit.",
        'bits:sub(i, i) is the i-th character: "0" or "1".',
      ],
      tr: [
        "Soldan sağa git. Her adımda: n = n * 2 + rakam.",
        'bits:sub(i, i), i. karakterdir: "0" ya da "1".',
      ],
    },
  }),
  F({
    id: "to-binary",
    fn: "toBinary",
    params: "n",
    title: { en: "Decimal to binary", tr: "Onluktan ikiliğe" },
    difficulty: "medium",
    tags: ["algorithms", "strings", "math"],
    prompt: {
      en: 'Write `toBinary(n)` that returns the binary form of a non-negative whole number as a string. `toBinary(11)` is `"1011"`, `toBinary(0)` is `"0"`.',
      tr: 'Negatif olmayan bir tam sayının ikilik halini metin olarak döndüren `toBinary(n)` fonksiyonunu yaz. `toBinary(11)` sonucu `"1011"`, `toBinary(0)` sonucu `"0"`.',
    },
    tests: T(["11", "0"], ["1", "255", "1024"]),
    solution:
      'local function toBinary(n)\n\tif n == 0 then\n\t\treturn "0"\n\tend\n\tlocal bits = ""\n\twhile n > 0 do\n\t\tbits = (n % 2) .. bits\n\t\tn = math.floor(n / 2)\n\tend\n\treturn bits\nend\n',
    hints: {
      en: [
        "n % 2 is the last bit; math.floor(n / 2) drops it.",
        "Put each new bit in front: bits = (n % 2) .. bits",
      ],
      tr: [
        "n % 2 son bittir; math.floor(n / 2) onu atar.",
        "Her yeni biti öne ekle: bits = (n % 2) .. bits",
      ],
    },
  }),
  F({
    id: "max-subarray",
    fn: "maxSubarray",
    params: "list",
    title: { en: "Best winning streak (Kadane)", tr: "En iyi seri (Kadane)" },
    difficulty: "medium",
    tags: ["algorithms", "tables"],
    prompt: {
      en: "A list holds the coins won or lost each round. Write `maxSubarray(list)`: the biggest total of any run of consecutive rounds (at least one round). It must be O(n) — the hidden test has 3000 rounds.",
      tr: "Bir liste her turda kazanılan ya da kaybedilen coinleri tutuyor. Ardışık turlardan oluşan herhangi bir serinin (en az bir tur) en büyük toplamını veren `maxSubarray(list)`'i yaz. O(n) olmalı — gizli testte 3000 tur var.",
    },
    tests: T(
      ["{ -2, 1, -3, 4, -1, 2, 1, -5, 4 }", "{ -3, -1, -2 }"],
      ["{ 5 }", "{ 2, -1, 2, -1, 2 }", range(3000, "(i % 7) - 3")],
    ),
    solution:
      "local function maxSubarray(list)\n\tlocal best = list[1]\n\tlocal current = 0\n\tfor _, v in list do\n\t\tcurrent = math.max(v, current + v)\n\t\tbest = math.max(best, current)\n\tend\n\treturn best\nend\n",
    hints: {
      en: [
        "Walk once. Keep `current`: the best run that ends at this item.",
        "current = math.max(v, current + v) — either start fresh or keep going.",
        "Track the biggest current you ever saw.",
      ],
      tr: [
        "Bir kez dolaş. `current` tut: bu elemanda biten en iyi seri.",
        "current = math.max(v, current + v) — ya baştan başla ya devam et.",
        "Gördüğün en büyük current'ı sakla.",
      ],
    },
  }),
  F({
    id: "move-zeros",
    fn: "moveZeros",
    params: "list",
    title: { en: "Empty slots to the back", tr: "Boş slotlar sona" },
    difficulty: "medium",
    tags: ["algorithms", "tables"],
    prompt: {
      en: "An inventory list uses 0 for empty slots. Write `moveZeros(list)` that returns a new list with every non-zero item in its original order, followed by all the zeros.",
      tr: "Bir envanter listesi boş slotlar için 0 kullanıyor. Sıfır olmayan her elemanı orijinal sırasıyla, ardından bütün sıfırları içeren yeni bir liste döndüren `moveZeros(list)`'i yaz.",
    },
    tests: T(["{ 0, 1, 0, 3, 12 }", "{ 0, 0, 1 }"], ["{}", "{ 4, 5 }", "{ 0, 0, 0 }"]),
    solution:
      "local function moveZeros(list)\n\tlocal result = {}\n\tlocal zeros = 0\n\tfor _, v in list do\n\t\tif v == 0 then\n\t\t\tzeros += 1\n\t\telse\n\t\t\ttable.insert(result, v)\n\t\tend\n\tend\n\tfor _ = 1, zeros do\n\t\ttable.insert(result, 0)\n\tend\n\treturn result\nend\n",
    hints: {
      en: [
        "Copy the non-zero items first and count the zeros.",
        "Then add that many zeros at the end.",
      ],
      tr: ["Önce sıfır olmayanları kopyala ve sıfırları say.", "Sonra o kadar sıfırı sona ekle."],
    },
  }),
  F({
    id: "pascal-row",
    fn: "pascalRow",
    params: "n",
    title: { en: "Pascal's triangle", tr: "Pascal üçgeni" },
    difficulty: "medium",
    tags: ["algorithms", "math", "tables"],
    prompt: {
      en: "Write `pascalRow(n)` that returns row n of Pascal's triangle (row 0 is `{ 1 }`, row 3 is `{ 1, 3, 3, 1 }`). Each number is the sum of the two above it.",
      tr: "Pascal üçgeninin n. satırını döndüren `pascalRow(n)`'i yaz (0. satır `{ 1 }`, 3. satır `{ 1, 3, 3, 1 }`). Her sayı üstündeki ikisinin toplamıdır.",
    },
    tests: T(["3", "0"], ["1", "6", "20"]),
    solution:
      "local function pascalRow(n)\n\tlocal row = { 1 }\n\tfor _ = 1, n do\n\t\tlocal nextRow = { 1 }\n\t\tfor i = 2, #row do\n\t\t\tnextRow[i] = row[i - 1] + row[i]\n\t\tend\n\t\ttable.insert(nextRow, 1)\n\t\trow = nextRow\n\tend\n\treturn row\nend\n",
    hints: {
      en: [
        "Start with { 1 } and build the next row n times.",
        "nextRow[i] = row[i - 1] + row[i], with a 1 at both ends.",
      ],
      tr: [
        "{ 1 } ile başla ve sonraki satırı n kez oluştur.",
        "nextRow[i] = row[i - 1] + row[i], iki ucunda da 1.",
      ],
    },
  }),
  F({
    id: "majority",
    fn: "majority",
    params: "votes",
    title: { en: "Map vote winner", tr: "Harita oylamasının kazananı" },
    difficulty: "medium",
    tags: ["algorithms", "tables", "game"],
    prompt: {
      en: "More than half of the votes are for one map. Write `majority(votes)` that returns it. Try Boyer–Moore voting: one candidate and a counter, no extra table.",
      tr: "Oyların yarıdan fazlası tek bir harita için. Onu döndüren `majority(votes)`'u yaz. Boyer–Moore oylamasını dene: tek bir aday ve bir sayaç, ekstra tablo yok.",
    },
    tests: T(
      ['{ "Lava", "Ice", "Lava" }', '{ "Sky" }'],
      ['{ "A", "B", "A", "C", "A", "A", "B" }', '{ "X", "X", "Y", "Y", "X" }'],
    ),
    solution:
      "local function majority(votes)\n\tlocal candidate, count = nil, 0\n\tfor _, v in votes do\n\t\tif count == 0 then\n\t\t\tcandidate = v\n\t\tend\n\t\tcount += if v == candidate then 1 else -1\n\tend\n\treturn candidate\nend\n",
    hints: {
      en: [
        "When the counter is 0, the current vote becomes the candidate.",
        "Same as the candidate: +1. Different: -1. The majority always survives.",
      ],
      tr: [
        "Sayaç 0 olunca mevcut oy aday olur.",
        "Adayla aynıysa +1, farklıysa -1. Çoğunluk her zaman ayakta kalır.",
      ],
    },
  }),
  F({
    id: "climb-stairs",
    fn: "ways",
    params: "n",
    title: { en: "Obby stairs (dynamic programming)", tr: "Obby merdiveni (dinamik programlama)" },
    difficulty: "medium",
    tags: ["algorithms", "math"],
    prompt: {
      en: "You climb n steps, jumping 1 or 2 steps at a time. Write `ways(n)`: how many different ways reach the top? The hidden test uses n = 60 — plain recursion is far too slow, so build the answer up from small n.",
      tr: "n basamak çıkıyorsun, her seferinde 1 ya da 2 basamak zıplayarak. `ways(n)`'i yaz: zirveye kaç farklı yolla ulaşılır? Gizli test n = 60 kullanıyor — düz özyineleme çok yavaş, cevabı küçük n'lerden yukarı doğru kur.",
    },
    tests: T(["3", "1"], ["2", "10", "60"]),
    solution:
      "local function ways(n)\n\tlocal a, b = 1, 1\n\tfor _ = 2, n do\n\t\ta, b = b, a + b\n\tend\n\treturn b\nend\n",
    hints: {
      en: [
        "To stand on step n you came from n-1 or n-2: ways(n) = ways(n-1) + ways(n-2).",
        "Keep only the last two answers and loop upward.",
      ],
      tr: [
        "n. basamağa n-1'den ya da n-2'den gelirsin: ways(n) = ways(n-1) + ways(n-2).",
        "Sadece son iki cevabı tut ve yukarı doğru dön.",
      ],
    },
  }),
  F({
    id: "common-prefix",
    fn: "commonPrefix",
    params: "words",
    title: { en: "Longest common prefix", tr: "En uzun ortak önek" },
    difficulty: "medium",
    tags: ["algorithms", "strings"],
    prompt: {
      en: 'Write `commonPrefix(words)` that returns the longest text every word starts with. `{ "speedrun", "speedcoil", "speed" }` gives `"speed"`; no common start gives `""`.',
      tr: 'Her kelimenin başladığı en uzun metni döndüren `commonPrefix(words)`\'ü yaz. `{ "speedrun", "speedcoil", "speed" }` sonucu `"speed"`; ortak başlangıç yoksa `""`.',
    },
    tests: T(
      ['{ "speedrun", "speedcoil", "speed" }', '{ "dog", "cat" }'],
      ['{ "solo" }', '{ "abc", "abd", "ab" }', "{}"],
    ),
    solution:
      'local function commonPrefix(words)\n\tlocal prefix = words[1] or ""\n\tfor _, w in words do\n\t\twhile w:sub(1, #prefix) ~= prefix do\n\t\t\tprefix = prefix:sub(1, #prefix - 1)\n\t\tend\n\tend\n\treturn prefix\nend\n',
    hints: {
      en: [
        "Start with the first word as the prefix.",
        "While a word doesn't start with it, chop the last letter off the prefix.",
      ],
      tr: [
        "İlk kelimeyi önek olarak al.",
        "Bir kelime onunla başlamadığı sürece önekin son harfini kes.",
      ],
    },
  }),
  F({
    id: "merge-sorted",
    fn: "mergeSorted",
    params: "a, b",
    title: { en: "Merge two sorted lists", tr: "İki sıralı listeyi birleştir" },
    difficulty: "medium",
    tags: ["algorithms", "tables"],
    prompt: {
      en: "Two leaderboards are already sorted from low to high. Write `mergeSorted(a, b)` that returns one sorted list in a single pass with two pointers — don't use table.sort.",
      tr: "İki liderlik tablosu zaten küçükten büyüğe sıralı. Tek geçişte, iki işaretçiyle tek bir sıralı liste döndüren `mergeSorted(a, b)`'yi yaz — table.sort kullanma.",
    },
    tests: T(
      ["{ 1, 4, 9 }, { 2, 3, 10 }", "{}, { 5 }"],
      ["{ 1, 1 }, { 1 }", "{ 7, 8 }, {}", "{ 1, 2, 3 }, { 4, 5, 6 }"],
    ),
    solution:
      "local function mergeSorted(a, b)\n\tlocal result = {}\n\tlocal i, j = 1, 1\n\twhile i <= #a or j <= #b do\n\t\tif j > #b or (i <= #a and a[i] <= b[j]) then\n\t\t\ttable.insert(result, a[i])\n\t\t\ti += 1\n\t\telse\n\t\t\ttable.insert(result, b[j])\n\t\t\tj += 1\n\t\tend\n\tend\n\treturn result\nend\n",
    hints: {
      en: [
        "Keep an index into each list: i for a, j for b.",
        "Take the smaller front item each time; when one list runs out, take from the other.",
      ],
      tr: [
        "Her liste için bir indeks tut: a için i, b için j.",
        "Her seferinde öndeki küçük elemanı al; bir liste bitince diğerinden al.",
      ],
    },
  }),
  F({
    id: "unique-paths",
    fn: "uniquePaths",
    params: "rows, cols",
    title: { en: "Paths across the grid", tr: "Izgarada yollar" },
    difficulty: "medium",
    tags: ["algorithms", "math"],
    prompt: {
      en: "A robot starts in the top-left of a rows × cols grid and only moves right or down. Write `uniquePaths(rows, cols)`: how many paths reach the bottom-right? Hidden tests go up to 15 × 15.",
      tr: "Bir robot rows × cols bir ızgaranın sol üstünden başlıyor ve sadece sağa ya da aşağı gidiyor. `uniquePaths(rows, cols)`'u yaz: sağ alta kaç yol var? Gizli testler 15 × 15'e kadar çıkıyor.",
    },
    tests: T(["3, 3", "1, 5"], ["2, 2", "3, 7", "15, 15"]),
    solution:
      "local function uniquePaths(rows, cols)\n\tlocal row = {}\n\tfor c = 1, cols do\n\t\trow[c] = 1\n\tend\n\tfor _ = 2, rows do\n\t\tfor c = 2, cols do\n\t\t\trow[c] += row[c - 1]\n\t\tend\n\tend\n\treturn row[cols]\nend\n",
    hints: {
      en: [
        "Paths to a cell = paths to the cell above + paths to the cell on the left.",
        "The first row and column have exactly 1 path each. Fill the grid row by row.",
      ],
      tr: [
        "Bir hücreye giden yollar = üstündekine giden yollar + solundakine giden yollar.",
        "İlk satırda ve sütunda her hücreye tam 1 yol var. Izgarayı satır satır doldur.",
      ],
    },
  }),
  F({
    id: "valid-sudoku",
    fn: "validSudoku",
    params: "board",
    title: { en: "Sudoku checker", tr: "Sudoku kontrolcüsü" },
    difficulty: "medium",
    tags: ["algorithms", "strings", "tables"],
    prompt: {
      en: 'The board is 9 strings of 9 characters: digits or "." for empty. Write `validSudoku(board)`: `true` if no digit repeats in any row, column or 3×3 box (empty cells are fine).',
      tr: 'Tahta 9 karakterlik 9 metinden oluşuyor: rakamlar ya da boş için ".". `validSudoku(board)`\'u yaz: hiçbir satırda, sütunda ya da 3×3 kutuda bir rakam tekrar etmiyorsa `true` (boş hücreler sorun değil).',
    },
    tests: T(
      [
        '{ "53..7....", "6..195...", ".98....6.", "8...6...3", "4..8.3..1", "7...2...6", ".6....28.", "...419..5", "....8..79" }',
        '{ "83..7....", "6..195...", ".98....6.", "8...6...3", "4..8.3..1", "7...2...6", ".6....28.", "...419..5", "....8..79" }',
      ],
      [
        '{ ".........", ".........", ".........", ".........", ".........", ".........", ".........", ".........", "........." }',
        '{ "1........", ".1.......", ".........", ".........", ".........", ".........", ".........", ".........", "........." }',
        '{ "12.......", ".........", ".........", ".........", ".........", ".........", ".........", ".........", "........2" }',
      ],
    ),
    solution:
      'local function validSudoku(board)\n\tlocal seen = {}\n\tfor r = 1, 9 do\n\t\tfor c = 1, 9 do\n\t\t\tlocal d = board[r]:sub(c, c)\n\t\t\tif d ~= "." then\n\t\t\t\tlocal box = math.floor((r - 1) / 3) * 3 + math.floor((c - 1) / 3)\n\t\t\t\tfor _, key in { "r" .. r .. d, "c" .. c .. d, "b" .. box .. d } do\n\t\t\t\t\tif seen[key] then\n\t\t\t\t\t\treturn false\n\t\t\t\t\tend\n\t\t\t\t\tseen[key] = true\n\t\t\t\tend\n\t\t\tend\n\t\tend\n\tend\n\treturn true\nend\n',
    hints: {
      en: [
        'Use one "seen" table with keys like "r3" .. digit, "c5" .. digit and "b4" .. digit.',
        "The box number is math.floor((r - 1) / 3) * 3 + math.floor((c - 1) / 3).",
      ],
      tr: [
        'Tek bir "seen" tablosu kullan; anahtarlar "r3" .. rakam, "c5" .. rakam ve "b4" .. rakam gibi olsun.',
        "Kutu numarası math.floor((r - 1) / 3) * 3 + math.floor((c - 1) / 3).",
      ],
    },
  }),

  // ------------------------------------------------------------------ hard
  F({
    id: "coin-change",
    fn: "minCoins",
    params: "coins, amount",
    title: { en: "Fewest coins", tr: "En az coin" },
    difficulty: "hard",
    tags: ["algorithms", "math"],
    prompt: {
      en: "Write `minCoins(coins, amount)`: the fewest coins (any number of each kind) that add up to exactly `amount`, or `-1` if it can't be done. Greedy fails for `{ 1, 3, 4 }, 6` (answer 2: 3 + 3). Use dynamic programming.",
      tr: "`minCoins(coins, amount)`'u yaz: toplamı tam olarak `amount` olan en az coin sayısı (her türden istediğin kadar), yapılamıyorsa `-1`. Açgözlü yöntem `{ 1, 3, 4 }, 6` için yanılır (cevap 2: 3 + 3). Dinamik programlama kullan.",
    },
    tests: T(
      ["{ 1, 3, 4 }, 6", "{ 2 }, 3"],
      ["{ 1 }, 0", "{ 5, 10, 25 }, 30", "{ 1, 5, 10, 25 }, 999", "{ 7, 11 }, 1"],
    ),
    solution:
      "local function minCoins(coins, amount)\n\tlocal best = { [0] = 0 }\n\tfor total = 1, amount do\n\t\tlocal m = math.huge\n\t\tfor _, c in coins do\n\t\t\tif c <= total and best[total - c] + 1 < m then\n\t\t\t\tm = best[total - c] + 1\n\t\t\tend\n\t\tend\n\t\tbest[total] = m\n\tend\n\treturn if best[amount] == math.huge then -1 else best[amount]\nend\n",
    hints: {
      en: [
        "best[t] = fewest coins for total t. best[0] = 0.",
        "best[t] = 1 + the smallest best[t - c] over every coin c ≤ t.",
        "Use math.huge for impossible totals and turn it into -1 at the end.",
      ],
      tr: [
        "best[t] = t toplamı için en az coin. best[0] = 0.",
        "best[t] = t'den küçük ya da eşit her c coini için en küçük best[t - c] + 1.",
        "İmkânsız toplamlar için math.huge kullan, sonda -1'e çevir.",
      ],
    },
  }),
  F({
    id: "knapsack",
    fn: "knapsack",
    params: "weights, values, capacity",
    title: { en: "Backpack loot (0/1 knapsack)", tr: "Sırt çantası ganimeti (0/1 sırt çantası)" },
    difficulty: "hard",
    tags: ["algorithms", "game"],
    prompt: {
      en: "Each item has a weight and a value; you can take each item at most once. Write `knapsack(weights, values, capacity)`: the highest total value whose total weight fits in `capacity`.",
      tr: "Her eşyanın bir ağırlığı ve değeri var; her eşyayı en fazla bir kez alabilirsin. `knapsack(weights, values, capacity)`'yi yaz: toplam ağırlığı `capacity`'ye sığan en yüksek toplam değer.",
    },
    tests: T(
      ["{ 1, 3, 4 }, { 15, 20, 30 }, 4", "{ 5 }, { 10 }, 4"],
      ["{ 1, 2, 3 }, { 6, 10, 12 }, 5", "{}, {}, 10", "{ 2, 3, 4, 5, 9 }, { 3, 4, 5, 8, 10 }, 20"],
    ),
    solution:
      "local function knapsack(weights, values, capacity)\n\tlocal best = {}\n\tfor w = 0, capacity do\n\t\tbest[w] = 0\n\tend\n\tfor i = 1, #weights do\n\t\tfor w = capacity, weights[i], -1 do\n\t\t\tbest[w] = math.max(best[w], best[w - weights[i]] + values[i])\n\t\tend\n\tend\n\treturn best[capacity]\nend\n",
    hints: {
      en: [
        "best[w] = the best value with weight limit w, using the items seen so far.",
        "For each item, update best[w] = max(best[w], best[w - weight] + value).",
        "Loop w downward, so an item isn't used twice.",
      ],
      tr: [
        "best[w] = şimdiye kadar görülen eşyalarla w ağırlık sınırındaki en iyi değer.",
        "Her eşya için best[w] = max(best[w], best[w - ağırlık] + değer) güncelle.",
        "w'yi aşağı doğru döndür ki bir eşya iki kez kullanılmasın.",
      ],
    },
  }),
  F({
    id: "longest-increasing",
    fn: "longestIncreasing",
    params: "list",
    title: { en: "Longest rising run of levels", tr: "Yükselen en uzun seviye dizisi" },
    difficulty: "hard",
    tags: ["algorithms", "tables"],
    prompt: {
      en: "Write `longestIncreasing(list)`: the length of the longest strictly increasing subsequence (items keep their order but don't have to be next to each other). `{ 10, 9, 2, 5, 3, 7, 101, 18 }` gives `4` (2, 3, 7, 18).",
      tr: "`longestIncreasing(list)`'i yaz: kesin artan en uzun alt dizinin uzunluğu (elemanlar sırasını korur ama yan yana olmak zorunda değil). `{ 10, 9, 2, 5, 3, 7, 101, 18 }` sonucu `4` (2, 3, 7, 18).",
    },
    tests: T(
      ["{ 10, 9, 2, 5, 3, 7, 101, 18 }", "{ 5, 4, 3 }"],
      ["{}", "{ 1, 2, 3, 4, 5 }", "{ 0, 8, 4, 12, 2, 10, 6, 14, 1, 9 }"],
    ),
    solution:
      "local function longestIncreasing(list)\n\tlocal len = {}\n\tlocal best = 0\n\tfor i = 1, #list do\n\t\tlen[i] = 1\n\t\tfor j = 1, i - 1 do\n\t\t\tif list[j] < list[i] then\n\t\t\t\tlen[i] = math.max(len[i], len[j] + 1)\n\t\t\tend\n\t\tend\n\t\tbest = math.max(best, len[i])\n\tend\n\treturn best\nend\n",
    hints: {
      en: [
        "len[i] = the longest increasing run that ends at item i.",
        "len[i] = 1 + the biggest len[j] for every earlier j with list[j] < list[i].",
      ],
      tr: [
        "len[i] = i. elemanda biten en uzun artan dizi.",
        "len[i] = list[j] < list[i] olan her önceki j için en büyük len[j] + 1.",
      ],
    },
  }),
  F({
    id: "edit-distance",
    fn: "editDistance",
    params: "a, b",
    title: { en: "Typo distance (Levenshtein)", tr: "Yazım hatası mesafesi (Levenshtein)" },
    difficulty: "hard",
    tags: ["algorithms", "strings"],
    prompt: {
      en: 'Chat commands should forgive typos. Write `editDistance(a, b)`: the fewest single-letter inserts, deletes or replacements that turn a into b. `editDistance("kick", "kik")` is `1`.',
      tr: 'Sohbet komutları yazım hatalarını affetmeli. `editDistance(a, b)`\'yi yaz: a\'yı b\'ye çeviren en az tek harf ekleme, silme ya da değiştirme sayısı. `editDistance("kick", "kik")` sonucu `1`.',
    },
    tests: T(
      ['"kick", "kik"', '"horse", "ros"'],
      ['"", "abc"', '"same", "same"', '"intention", "execution"'],
    ),
    solution:
      "local function editDistance(a, b)\n\tlocal prev = {}\n\tfor j = 0, #b do\n\t\tprev[j] = j\n\tend\n\tfor i = 1, #a do\n\t\tlocal cur = { [0] = i }\n\t\tfor j = 1, #b do\n\t\t\tlocal cost = if a:sub(i, i) == b:sub(j, j) then 0 else 1\n\t\t\tcur[j] = math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)\n\t\tend\n\t\tprev = cur\n\tend\n\treturn prev[#b]\nend\n",
    hints: {
      en: [
        "d[i][j] = distance between the first i letters of a and the first j letters of b.",
        "d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (same letter and 0 or 1)).",
        "Row 0 is 0, 1, 2… and column 0 is 0, 1, 2…",
      ],
      tr: [
        "d[i][j] = a'nın ilk i harfi ile b'nin ilk j harfi arasındaki mesafe.",
        "d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (harf aynıysa 0, değilse 1)).",
        "0. satır 0, 1, 2… ve 0. sütun 0, 1, 2…",
      ],
    },
  }),
  F({
    id: "count-islands",
    fn: "countIslands",
    params: "grid",
    title: { en: "Count the islands (flood fill)", tr: "Adaları say (flood fill)" },
    difficulty: "hard",
    tags: ["algorithms", "game"],
    prompt: {
      en: 'The map is a list of strings: "#" is land, "." is water. Land cells touching up, down, left or right form one island. Write `countIslands(grid)` with a flood fill (DFS or BFS).',
      tr: 'Harita metinlerden oluşan bir liste: "#" kara, "." su. Yukarı, aşağı, sola ya da sağa değen kara hücreleri tek bir ada oluşturur. `countIslands(grid)`\'i bir flood fill (DFS ya da BFS) ile yaz.',
    },
    tests: T(
      ['{ "##..", "#...", "..##", "...#" }', '{ "...", "..." }'],
      ['{ "#" }', '{ "#.#.#", ".#.#.", "#.#.#" }', '{ "####", "#..#", "####" }'],
    ),
    solution:
      'local function countIslands(grid)\n\tlocal seen = {}\n\tlocal rows = #grid\n\tlocal cols = if rows > 0 then #grid[1] else 0\n\tlocal function land(r, c)\n\t\treturn r >= 1 and r <= rows and c >= 1 and c <= cols and grid[r]:sub(c, c) == "#"\n\tend\n\tlocal function fill(r, c)\n\t\tif not land(r, c) or seen[r * 1000 + c] then\n\t\t\treturn\n\t\tend\n\t\tseen[r * 1000 + c] = true\n\t\tfill(r + 1, c)\n\t\tfill(r - 1, c)\n\t\tfill(r, c + 1)\n\t\tfill(r, c - 1)\n\tend\n\tlocal count = 0\n\tfor r = 1, rows do\n\t\tfor c = 1, cols do\n\t\t\tif land(r, c) and not seen[r * 1000 + c] then\n\t\t\t\tcount += 1\n\t\t\t\tfill(r, c)\n\t\t\tend\n\t\tend\n\tend\n\treturn count\nend\n',
    hints: {
      en: [
        "Scan every cell. When you find land you haven't visited, that's a new island.",
        "Then visit the whole island: a fill(r, c) function that marks the cell and calls itself on its 4 neighbours.",
      ],
      tr: [
        "Her hücreyi tara. Ziyaret etmediğin bir kara bulunca, bu yeni bir adadır.",
        "Sonra bütün adayı gez: hücreyi işaretleyen ve 4 komşusunda kendini çağıran bir fill(r, c) fonksiyonu.",
      ],
    },
  }),
  F({
    id: "permutations",
    fn: "permutations",
    params: "letters",
    title: { en: "Every order (backtracking)", tr: "Her sıralama (geri izleme)" },
    difficulty: "hard",
    tags: ["algorithms", "strings"],
    prompt: {
      en: 'Write `permutations(letters)` that returns every ordering of a string\'s (different) letters, in alphabetical order. `permutations("abc")` gives `{ "abc", "acb", "bac", "bca", "cab", "cba" }`.',
      tr: 'Bir metnin (farklı) harflerinin her sıralamasını alfabetik sırayla döndüren `permutations(letters)`\'ı yaz. `permutations("abc")` sonucu `{ "abc", "acb", "bac", "bca", "cab", "cba" }`.',
    },
    tests: T(['"abc"', '"ba"'], ['"x"', '"dcba"']),
    solution:
      "local function permutations(letters)\n\tlocal chars = {}\n\tfor i = 1, #letters do\n\t\tchars[i] = letters:sub(i, i)\n\tend\n\ttable.sort(chars)\n\tlocal result, used, current = {}, {}, {}\n\tlocal function build()\n\t\tif #current == #chars then\n\t\t\ttable.insert(result, table.concat(current))\n\t\t\treturn\n\t\tend\n\t\tfor i, ch in chars do\n\t\t\tif not used[i] then\n\t\t\t\tused[i] = true\n\t\t\t\ttable.insert(current, ch)\n\t\t\t\tbuild()\n\t\t\t\ttable.remove(current)\n\t\t\t\tused[i] = false\n\t\t\tend\n\t\tend\n\tend\n\tbuild()\n\treturn result\nend\n",
    hints: {
      en: [
        "Sort the letters first; then building in order gives alphabetical results.",
        "Backtracking: pick an unused letter, recurse, then undo the pick (table.remove).",
      ],
      tr: [
        "Önce harfleri sırala; sonra sırayla kurmak alfabetik sonuç verir.",
        "Geri izleme: kullanılmamış bir harf seç, özyinele, sonra seçimi geri al (table.remove).",
      ],
    },
  }),
  F({
    id: "can-sum",
    fn: "canSum",
    params: "list, target",
    title: { en: "Exact price (subset sum)", tr: "Tam fiyat (alt küme toplamı)" },
    difficulty: "hard",
    tags: ["algorithms", "math"],
    prompt: {
      en: "You have gift cards with these values and may use each at most once. Write `canSum(list, target)`: can some of them add up to exactly `target`? The hidden test has 40 cards, so trying every subset is too slow.",
      tr: "Bu değerlerde hediye kartların var ve her birini en fazla bir kez kullanabilirsin. `canSum(list, target)`'ı yaz: bazıları tam olarak `target` eder mi? Gizli testte 40 kart var; her alt kümeyi denemek çok yavaş.",
    },
    tests: T(
      ["{ 3, 34, 4, 12, 5, 2 }, 9", "{ 3, 34, 4 }, 30"],
      ["{}, 0", "{ 7 }, 7", `${range(40, "i * 2")}, 1001`, `${range(40, "i * 2")}, 1000`],
    ),
    solution:
      "local function canSum(list, target)\n\tlocal possible = { [0] = true }\n\tfor _, v in list do\n\t\tfor t = target, v, -1 do\n\t\t\tif possible[t - v] then\n\t\t\t\tpossible[t] = true\n\t\t\tend\n\t\tend\n\tend\n\treturn possible[target] == true\nend\n",
    hints: {
      en: [
        "possible[t] = true when some cards seen so far add up to t. possible[0] = true.",
        "For each card v, go t from target down to v: if possible[t - v] then possible[t] = true.",
      ],
      tr: [
        "Şimdiye kadarki kartlardan bazıları t ediyorsa possible[t] = true. possible[0] = true.",
        "Her v kartı için t'yi target'tan v'ye inerek dön: possible[t - v] ise possible[t] = true.",
      ],
    },
  }),
  F({
    id: "n-queens",
    fn: "nQueens",
    params: "n",
    title: { en: "N queens", tr: "N vezir" },
    difficulty: "hard",
    tags: ["algorithms"],
    prompt: {
      en: "Write `nQueens(n)`: in how many ways can n queens stand on an n × n board so that no two share a row, column or diagonal? Place one queen per row and backtrack.",
      tr: "`nQueens(n)`'i yaz: n vezir, n × n bir tahtada hiçbiri aynı satırı, sütunu ya da çaprazı paylaşmadan kaç farklı şekilde durabilir? Her satıra bir vezir koy ve geri izle.",
    },
    tests: T(["4", "1"], ["2", "5", "6"]),
    solution:
      "local function nQueens(n)\n\tlocal cols, d1, d2 = {}, {}, {}\n\tlocal count = 0\n\tlocal function place(r)\n\t\tif r > n then\n\t\t\tcount += 1\n\t\t\treturn\n\t\tend\n\t\tfor c = 1, n do\n\t\t\tif not cols[c] and not d1[r + c] and not d2[r - c] then\n\t\t\t\tcols[c], d1[r + c], d2[r - c] = true, true, true\n\t\t\t\tplace(r + 1)\n\t\t\t\tcols[c], d1[r + c], d2[r - c] = nil, nil, nil\n\t\t\tend\n\t\tend\n\tend\n\tplace(1)\n\treturn count\nend\n",
    hints: {
      en: [
        "Put exactly one queen in each row, trying every column.",
        "Two queens share a diagonal when r + c or r - c is equal — keep tables for used columns and both diagonals.",
      ],
      tr: [
        "Her satıra tam bir vezir koy, her sütunu dene.",
        "İki vezir r + c ya da r - c eşitse aynı çaprazdadır — kullanılan sütunlar ve iki çapraz için tablolar tut.",
      ],
    },
  }),
  F({
    id: "kth-smallest",
    fn: "kthSmallest",
    params: "list, k",
    title: { en: "K-th place (quickselect)", tr: "K. sıra (quickselect)" },
    difficulty: "hard",
    tags: ["algorithms", "tables"],
    prompt: {
      en: "Write `kthSmallest(list, k)` that returns the k-th smallest number (k = 1 is the smallest) without sorting the whole list: split around a pivot and only keep the part that holds the answer.",
      tr: "Bütün listeyi sıralamadan k. en küçük sayıyı döndüren `kthSmallest(list, k)`'yi yaz (k = 1 en küçüğü): bir pivot etrafında böl ve sadece cevabı tutan kısmı sakla.",
    },
    tests: T(
      ["{ 7, 10, 4, 3, 20, 15 }, 3", "{ 5 }, 1"],
      [
        "{ 2, 2, 1 }, 2",
        "{ 9, 8, 7, 6, 5, 4, 3, 2, 1 }, 9",
        `${range(2000, "(i * 37) % 2003")}, 1000`,
      ],
    ),
    solution:
      "local function kthSmallest(list, k)\n\tlocal pivot = list[math.ceil(#list / 2)]\n\tlocal less, equal, more = {}, 0, {}\n\tfor _, v in list do\n\t\tif v < pivot then\n\t\t\ttable.insert(less, v)\n\t\telseif v > pivot then\n\t\t\ttable.insert(more, v)\n\t\telse\n\t\t\tequal += 1\n\t\tend\n\tend\n\tif k <= #less then\n\t\treturn kthSmallest(less, k)\n\telseif k <= #less + equal then\n\t\treturn pivot\n\tend\n\treturn kthSmallest(more, k - #less - equal)\nend\n",
    hints: {
      en: [
        "Pick a pivot and split the list into smaller, equal and bigger.",
        "If k fits in the smaller part, search there; if it lands on the equal part, the pivot is the answer; otherwise search the bigger part with a smaller k.",
      ],
      tr: [
        "Bir pivot seç ve listeyi küçükler, eşitler ve büyükler diye böl.",
        "k küçükler kısmına sığıyorsa orada ara; eşitlere denk geliyorsa cevap pivot; yoksa büyüklerde daha küçük bir k ile ara.",
      ],
    },
  }),
  F({
    id: "min-path-sum",
    fn: "minPathSum",
    params: "grid",
    title: { en: "Cheapest route through the dungeon", tr: "Zindanda en ucuz yol" },
    difficulty: "hard",
    tags: ["algorithms", "game"],
    prompt: {
      en: "Each room of a grid costs some health. Start top-left, end bottom-right, moving only right or down. Write `minPathSum(grid)`: the smallest total cost (count the start and end rooms too).",
      tr: "Bir ızgaranın her odası biraz can harcatıyor. Sol üstten başla, sağ altta bitir, sadece sağa ya da aşağı git. `minPathSum(grid)`'i yaz: en küçük toplam maliyet (başlangıç ve bitiş odaları dahil).",
    },
    tests: T(
      ["{ { 1, 3, 1 }, { 1, 5, 1 }, { 4, 2, 1 } }", "{ { 5 } }"],
      [
        "{ { 1, 2, 3 } }",
        "{ { 1 }, { 2 }, { 3 } }",
        "{ { 1, 9, 1, 1 }, { 1, 1, 1, 9 }, { 9, 9, 1, 1 } }",
      ],
    ),
    solution:
      "local function minPathSum(grid)\n\tlocal cost = {}\n\tfor r, row in grid do\n\t\tcost[r] = {}\n\t\tfor c, v in row do\n\t\t\tlocal up = if r > 1 then cost[r - 1][c] else math.huge\n\t\t\tlocal left = if c > 1 then cost[r][c - 1] else math.huge\n\t\t\tlocal from = math.min(up, left)\n\t\t\tcost[r][c] = v + (if from == math.huge then 0 else from)\n\t\tend\n\tend\n\treturn cost[#grid][#grid[1]]\nend\n",
    hints: {
      en: [
        "cost[r][c] = grid[r][c] + the cheaper of the room above and the room to the left.",
        "Fill row by row; the first room has nothing before it.",
      ],
      tr: [
        "cost[r][c] = grid[r][c] + üstteki ve soldaki odadan ucuz olanı.",
        "Satır satır doldur; ilk odanın öncesinde bir şey yok.",
      ],
    },
  }),
  F({
    id: "word-break",
    fn: "wordBreak",
    params: "text, words",
    title: { en: "Split the code word", tr: "Kod kelimesini böl" },
    difficulty: "hard",
    tags: ["algorithms", "strings"],
    prompt: {
      en: 'Write `wordBreak(text, words)`: can `text` be split into pieces that are all in the `words` list (words can repeat)? `wordBreak("freepetcode", { "free", "pet", "code" })` is `true`.',
      tr: '`wordBreak(text, words)`\'ü yaz: `text`, hepsi `words` listesinde olan parçalara bölünebilir mi (kelimeler tekrar edebilir)? `wordBreak("freepetcode", { "free", "pet", "code" })` sonucu `true`.',
    },
    tests: T(
      [
        '"freepetcode", { "free", "pet", "code" }',
        '"catsandog", { "cats", "dog", "sand", "and", "cat" }',
      ],
      [
        '"", { "a" }',
        '"aaaaaaa", { "aaa", "aaaa" }',
        '"' + "a".repeat(60) + 'b", { "a", "aa", "aaa" }',
      ],
    ),
    solution:
      "local function wordBreak(text, words)\n\tlocal dict = {}\n\tfor _, w in words do\n\t\tdict[w] = true\n\tend\n\tlocal ok = { [0] = true }\n\tfor i = 1, #text do\n\t\tfor j = 0, i - 1 do\n\t\t\tif ok[j] and dict[text:sub(j + 1, i)] then\n\t\t\t\tok[i] = true\n\t\t\t\tbreak\n\t\t\tend\n\t\tend\n\tend\n\treturn ok[#text] == true\nend\n",
    hints: {
      en: [
        "ok[i] = true when the first i letters can be split. ok[0] = true.",
        "ok[i] is true if some j < i has ok[j] and text:sub(j + 1, i) is a word.",
        "Put the words in a dictionary table so lookups are instant.",
      ],
      tr: [
        "İlk i harf bölünebiliyorsa ok[i] = true. ok[0] = true.",
        "ok[j] olan ve text:sub(j + 1, i) bir kelime olan bir j < i varsa ok[i] true'dur.",
        "Aramalar anında olsun diye kelimeleri bir sözlük tablosuna koy.",
      ],
    },
  }),
];
