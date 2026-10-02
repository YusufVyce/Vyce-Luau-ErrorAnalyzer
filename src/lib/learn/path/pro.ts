import { choice, fill, learn, order, predict, t, type PathLesson } from "./types";

/** Code: drops the first newline and turns 4-space indents into tabs. */
const lua = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values)
    .replace(/^\n/, "")
    .replace(/^( {4})+/gm, (m) => "\t".repeat(m.length / 4))
    .replace(/\s+$/, "");

const ERR = t("An error", "Bir hata");

/** Bite-sized steps for units 10–12 (lessons.pro.ts). */
export const CH_PRO: Record<string, PathLesson> = {
  // ------------------------------------------------------------------ 10 · Pro Luau
  "type-checking": {
    emoji: "🏷️",
    takeaway: t(
      "Add --!strict, write types after colons and use ? for values that can be nil.",
      "--!strict ekle, tipleri iki noktadan sonra yaz, nil olabilen değerler için ? kullan.",
    ),
    steps: [
      learn(
        t("Types after a colon", "İki noktadan sonra tip"),
        t(
          "`local coins: number = 100` — the part after the colon is the type. Studio warns you when a value doesn't match it.",
          "`local coins: number = 100` — iki noktadan sonraki kısım tiptir. Bir değer uymazsa Studio seni uyarır.",
        ),
        {
          code: lua`
--!strict
local coins: number = 100
local name: string = "Ann"
`,
          hook: t(
            "Labels on boxes 📦: you know what's inside before you open them.",
            "Kutulardaki etiketler 📦: açmadan içinde ne olduğunu bilirsin.",
          ),
        },
      ),
      choice(
        t("Which line turns on full type checking?", "Hangi satır tam tip kontrolünü açar?"),
        ["--!strict", "local strict = true", "type strict = true", "strict()"],
        0,
        t(
          "--!strict must be the very first line of the script.",
          "--!strict scriptin en ilk satırı olmalı.",
        ),
      ),
      fill(
        t("This function returns a number", "Bu fonksiyon bir sayı döndürür"),
        lua`
local function double(n: number): ___
    return n * 2
end
`,
        ["number", "string", "boolean", "nil"],
        0,
        t(
          "The type after the parentheses is the return type.",
          "Parantezlerden sonraki tip dönüş tipidir.",
        ),
      ),
      learn(
        t("Optional with ?", "? ile isteğe bağlı"),
        t(
          "`string?` means a string or nil. Use it for fields that might be missing, and give a default with `or`.",
          "`string?` bir metin ya da nil demek. Eksik olabilecek alanlarda kullan ve `or` ile varsayılan ver.",
        ),
        { code: "type Pet = { name: string, nickname: string? }" },
      ),
      predict(
        lua`
type Pet = { name: string, nickname: string? }
local pet: Pet = { name = "Dog" }
print(pet.nickname or pet.name)
`,
        ["Dog", "nil", "nickname", ERR],
        0,
        t(
          "nickname is nil, so `or` falls back to the name.",
          "nickname nil, bu yüzden `or` isme döner.",
        ),
      ),
      choice(
        t(
          'Which type allows only "Rock", "Paper" or "Scissors"?',
          'Hangi tip sadece "Rock", "Paper" ya da "Scissors"a izin verir?',
        ),
        ['"Rock" | "Paper" | "Scissors"', "{ string }", "string?", "{ [string]: boolean }"],
        0,
        t(
          "A union of exact strings: nothing else fits.",
          "Kesin metinlerin birleşimi: başka hiçbir şey uymaz.",
        ),
      ),
      predict(
        lua`
--!strict
local function add(a: number, b: number): number
    return a + b
end
print(add(2, 3))
`,
        ["5", "23", "nil", ERR],
        0,
        t(
          "Types never change how the code runs: 2 + 3 is still 5.",
          "Tipler kodun çalışmasını asla değiştirmez: 2 + 3 yine 5.",
        ),
      ),
    ],
  },

  metatables: {
    emoji: "🧙",
    takeaway: t(
      "Metatables add behavior: __index for defaults, __add/__eq/__tostring for operators, table.freeze for read-only.",
      "Metatablolar davranış ekler: varsayılanlar için __index, operatörler için __add/__eq/__tostring, salt okunur için table.freeze.",
    ),
    steps: [
      learn(
        t("A table's hidden settings", "Bir tablonun gizli ayarları"),
        t(
          "`setmetatable(t, mt)` gives t a metatable. Special keys in mt — like `__index` or `__add` — change how t behaves.",
          "`setmetatable(t, mt)` t'ye bir metatablo verir. mt'deki özel anahtarlar — `__index` ya da `__add` gibi — t'nin davranışını değiştirir.",
        ),
        {
          code: lua`
local t = setmetatable({}, { __index = { Speed = 16 } })
print(t.Speed)
`,
          hook: t(
            "The backstage crew 🎭: invisible, but running the show.",
            "Kulis ekibi 🎭: görünmez ama gösteriyi o yönetir.",
          ),
        },
      ),
      predict(
        lua`
local defaults = { Speed = 16, Jump = 50 }
local s = setmetatable({ Speed = 20 }, { __index = defaults })
print(s.Speed, s.Jump)
`,
        ["20 50", "16 50", "20 nil", "nil nil"],
        0,
        t(
          "Speed is in the table itself; Jump is missing, so __index finds it in defaults.",
          "Speed tablonun kendisinde; Jump eksik, bu yüzden __index onu defaults'ta bulur.",
        ),
      ),
      fill(
        t("Make + work for Money objects", "Money nesnelerinde + çalışsın"),
        lua`
Money.___ = function(a, b)
    return Money.new(a.amount + b.amount)
end
`,
        ["__add", "__plus", "__index", "__sum"],
        0,
        t("+ looks for __add.", "+ işareti __add arar."),
      ),
      predict(
        lua`
local V = {}
V.__tostring = function(v)
    return "V(" .. v.x .. ")"
end
local v = setmetatable({ x = 3 }, V)
print(v)
`,
        ["V(3)", "table", "3", "x"],
        0,
        t(
          "print uses __tostring when the metatable has one.",
          "Metatabloda varsa print __tostring kullanır.",
        ),
      ),
      learn(
        t("Frozen tables", "Dondurulmuş tablolar"),
        t(
          "`table.freeze(t)` makes t read-only. Changing it afterwards is an error — great for config tables nobody should edit.",
          "`table.freeze(t)` t'yi salt okunur yapar. Sonradan değiştirmek hata verir — kimsenin düzenlememesi gereken ayar tabloları için birebir.",
        ),
      ),
      predict(
        lua`
local CONFIG = table.freeze({ Max = 10 })
local ok = pcall(function()
    CONFIG.Max = 99
end)
print(ok, CONFIG.Max)
`,
        ["false 10", "true 99", "false 99", "true 10"],
        0,
        t(
          "The write errors (pcall returns false) and the value stays 10.",
          "Yazma hata verir (pcall false döndürür) ve değer 10 kalır.",
        ),
      ),
      choice(
        t(
          "Which metamethod runs when you print an object?",
          "Bir nesneyi yazdırınca hangi metametot çalışır?",
        ),
        ["__tostring", "__print", "__index", "__call"],
        0,
        t("tostring and print both use __tostring.", "tostring de print de __tostring kullanır."),
      ),
    ],
  },

  inheritance: {
    emoji: "🧬",
    takeaway: t(
      "A child class sets __index to its parent; override methods and call Parent.Method(self) to build on them.",
      "Alt sınıf __index'ini üst sınıfa bağlar; metotları ez ve üstüne kurmak için Parent.Method(self) çağır.",
    ),
    steps: [
      learn(
        t("Is-a", "Bir şeydir"),
        t(
          "A Boss is an Enemy with extras. Link the classes so Boss finds Enemy's methods: `setmetatable(Boss, { __index = Enemy })`.",
          "Bir Boss ekstraları olan bir Enemy'dir. Boss, Enemy'nin metotlarını bulsun diye sınıfları bağla: `setmetatable(Boss, { __index = Enemy })`.",
        ),
        {
          code: lua`
local Boss = setmetatable({}, { __index = Enemy })
Boss.__index = Boss
`,
          hook: t(
            "A family tree 🌳: what you don't have, you borrow from your parent.",
            "Soy ağacı 🌳: sende olmayanı ebeveyninden ödünç alırsın.",
          ),
        },
      ),
      order(
        t("Put the Boss class setup in order", "Boss sınıfının kurulumunu sıraya koy"),
        [
          "local Boss = setmetatable({}, { __index = Enemy })",
          "Boss.__index = Boss",
          "function Boss.new(name)",
          "    local self = Enemy.new(name)",
          "    return setmetatable(self, Boss)",
          "end",
        ],
        t(
          "Create Boss, point it at itself for objects, then build objects from the Enemy constructor.",
          "Boss'u oluştur, nesneler için kendine bağla, sonra nesneleri Enemy kurucusuyla oluştur.",
        ),
      ),
      predict(
        lua`
local Enemy = {}
Enemy.__index = Enemy
function Enemy.new() return setmetatable({ hp = 100 }, Enemy) end
function Enemy:Attack() return 10 end

local Boss = setmetatable({}, { __index = Enemy })
Boss.__index = Boss
function Boss.new() return setmetatable(Enemy.new(), Boss) end

local b = Boss.new()
print(b.hp, b:Attack())
`,
        ["100 10", "nil 10", "100 nil", ERR],
        0,
        t(
          "hp comes from Enemy.new, and Attack is found through Boss → Enemy.",
          "hp Enemy.new'den gelir, Attack da Boss → Enemy yoluyla bulunur.",
        ),
      ),
      learn(
        t("Overriding", "Ezmek (override)"),
        t(
          "Define a method with the same name on Boss and it wins. Call the parent's version with `Enemy.Attack(self)` to build on it.",
          "Boss'ta aynı isimde bir metot tanımlarsan o kazanır. Üstüne kurmak için üst sınıfın sürümünü `Enemy.Attack(self)` ile çağır.",
        ),
        {
          code: lua`
function Boss:Attack()
    return Enemy.Attack(self) * 3
end
`,
        },
      ),
      predict(
        lua`
local Enemy = {}
Enemy.__index = Enemy
function Enemy:Attack() return 10 end

local Boss = setmetatable({}, { __index = Enemy })
Boss.__index = Boss
function Boss:Attack() return Enemy.Attack(self) * 3 end

local b = setmetatable({}, Boss)
print(b:Attack())
`,
        ["30", "10", "13", ERR],
        0,
        t(
          "Boss's own Attack runs and triples the parent's 10.",
          "Boss'un kendi Attack'i çalışır ve üst sınıfın 10'unu üçe katlar.",
        ),
      ),
      fill(
        t("Link Boss to its parent", "Boss'u üst sınıfına bağla"),
        "local Boss = setmetatable({}, { ___ = Enemy })",
        ["__index", "__parent", "__add", "__call"],
        0,
        t(
          "Missing keys are looked up through __index.",
          "Eksik anahtarlar __index üzerinden aranır.",
        ),
      ),
      choice(
        t(
          "When is composition better than inheritance?",
          "Kompozisyon ne zaman kalıtımdan iyidir?",
        ),
        [
          t(
            "When classes would form long chains of parents",
            "Sınıflar uzun ebeveyn zincirleri oluşturacaksa",
          ),
          t("Never", "Asla"),
          t("Only for numbers", "Sadece sayılar için"),
          t("When you have just one class", "Tek bir sınıfın varsa"),
        ],
        0,
        t(
          "Deep chains get confusing. Give objects parts (has-a) instead.",
          "Derin zincirler kafa karıştırır. Bunun yerine nesnelere parçalar ver (sahip olma).",
        ),
      ),
    ],
  },

  closures: {
    emoji: "🎒",
    takeaway: t(
      "Functions are values; closures remember their locals; ... takes any number of arguments.",
      "Fonksiyonlar değerdir; closure'lar local'lerini hatırlar; ... istediğin kadar argüman alır.",
    ),
    steps: [
      learn(
        t("Functions are values", "Fonksiyonlar değerdir"),
        t(
          "Store functions in variables and tables, pass them to other functions, return them. A function is just a value.",
          "Fonksiyonları değişkenlerde ve tablolarda sakla, başka fonksiyonlara ver, döndür. Fonksiyon sadece bir değerdir.",
        ),
        {
          code: lua`
local actions = {
    double = function(n) return n * 2 end,
}
print(actions.double(21))
`,
          hook: t(
            "A recipe card 📜: you can hand the recipe to someone else.",
            "Tarif kartı 📜: tarifi başkasına verebilirsin.",
          ),
        },
      ),
      predict(
        lua`
local function makeCounter()
    local count = 0
    return function()
        count += 1
        return count
    end
end
local a = makeCounter()
a()
a()
print(a())
`,
        ["3", "1", "0", "2"],
        0,
        t("The closure keeps its own count: 1, 2, 3.", "Closure kendi sayacını tutar: 1, 2, 3."),
      ),
      predict(
        lua`
local function makeCounter()
    local count = 0
    return function()
        count += 1
        return count
    end
end
local a = makeCounter()
local b = makeCounter()
a()
a()
print(a(), b())
`,
        ["3 1", "3 3", "1 1", "2 1"],
        0,
        t(
          "Every makeCounter call makes a new, separate count.",
          "Her makeCounter çağrısı yeni ve ayrı bir sayaç oluşturur.",
        ),
      ),
      learn(
        t("Closures remember", "Closure'lar hatırlar"),
        t(
          "The inner function keeps using `count` even after makeCounter has finished. That remembered variable is called an upvalue.",
          "İçteki fonksiyon, makeCounter bittikten sonra bile `count`'u kullanmaya devam eder. Hatırlanan bu değişkene upvalue denir.",
        ),
      ),
      fill(
        t("Pass a function to map", "map'e bir fonksiyon ver"),
        "local doubled = map({ 1, 2, 3 }, ___(n) return n * 2 end)",
        ["function", "func", "def", "lambda"],
        0,
        t(
          "An anonymous function starts with function.",
          "İsimsiz bir fonksiyon function ile başlar.",
        ),
      ),
      predict(
        lua`
local function apply(list, fn)
    local out = {}
    for i, v in ipairs(list) do
        out[i] = fn(v)
    end
    return out
end
print(table.concat(apply({ 1, 2, 3 }, function(n) return n * 10 end), " "))
`,
        ["10 20 30", "1 2 3", "60", "10"],
        0,
        t("apply calls fn on every item.", "apply her elemanda fn'i çağırır."),
      ),
      predict(
        lua`
local function count(...)
    return select("#", ...)
end
print(count("a", "b", "c"))
`,
        ["3", "1", "abc", "0"],
        0,
        t('select("#", ...) counts the arguments.', 'select("#", ...) argümanları sayar.'),
      ),
      choice(
        t("What does ... mean in function(...)?", "function(...) içindeki ... ne demek?"),
        [
          t("Any number of arguments", "İstediğin kadar argüman"),
          t("The function isn't finished", "Fonksiyon bitmemiş"),
          t("No arguments allowed", "Argüman verilemez"),
          t("A comment", "Bir yorum"),
        ],
        0,
        t(
          "... (varargs) collects every extra argument.",
          "... (varargs) her ekstra argümanı toplar.",
        ),
      ),
    ],
  },

  coroutines: {
    emoji: "⏸️",
    takeaway: t(
      "yield pauses, resume continues; wrap makes generators; task.spawn is for everyday threads.",
      "yield duraklatır, resume devam ettirir; wrap üreteç yapar; günlük iş parçacıkları için task.spawn.",
    ),
    steps: [
      learn(
        t("Pause and continue", "Durdur ve devam et"),
        t(
          "`coroutine.create(fn)` makes a coroutine. `coroutine.resume(co)` runs it until `coroutine.yield()`; the next resume continues from there.",
          "`coroutine.create(fn)` bir coroutine yapar. `coroutine.resume(co)` onu `coroutine.yield()`'e kadar çalıştırır; sonraki resume oradan devam eder.",
        ),
        {
          code: lua`
local co = coroutine.create(function()
    print("A")
    coroutine.yield()
    print("B")
end)
coroutine.resume(co)
`,
          hook: t(
            "A bookmark 🔖: stop reading, come back to the exact same line.",
            "Kitap ayracı 🔖: okumayı bırak, tam aynı satıra geri dön.",
          ),
        },
      ),
      predict(
        lua`
local co = coroutine.create(function()
    print("A")
    coroutine.yield()
    print("B")
end)
coroutine.resume(co)
print("C")
coroutine.resume(co)
`,
        ["A\nC\nB", "A\nB\nC", "C\nA\nB", "A\nC"],
        0,
        t(
          "The first resume prints A and pauses; C prints; the second resume prints B.",
          "İlk resume A yazar ve durur; C yazılır; ikinci resume B yazar.",
        ),
      ),
      predict(
        lua`
local co = coroutine.create(function()
    coroutine.yield()
end)
coroutine.resume(co)
print(coroutine.status(co))
coroutine.resume(co)
print(coroutine.status(co))
`,
        ["suspended\ndead", "dead\ndead", "running\ndead", "suspended\nsuspended"],
        0,
        t(
          "Paused at yield = suspended. Function finished = dead.",
          "yield'de duraklamış = suspended. Fonksiyon bitti = dead.",
        ),
      ),
      learn(
        t("Generators with wrap", "wrap ile üreteçler"),
        t(
          "`coroutine.wrap(fn)` returns a plain function. Each call resumes it and returns what it yields.",
          "`coroutine.wrap(fn)` düz bir fonksiyon döndürür. Her çağrı onu devam ettirir ve yield ettiği değeri döndürür.",
        ),
      ),
      predict(
        lua`
local gen = coroutine.wrap(function()
    for i = 1, 3 do
        coroutine.yield(i * 10)
    end
end)
print(gen(), gen())
`,
        ["10 20", "1 2", "10 10", "30"],
        0,
        t(
          "Each call continues the loop and yields the next value.",
          "Her çağrı döngüye devam eder ve sıradaki değeri verir.",
        ),
      ),
      fill(
        t("Pause the coroutine here", "Coroutine'i burada duraklat"),
        lua`
local co = coroutine.create(function()
    print("Ready")
    coroutine.___()
    print("Set")
end)
`,
        ["yield", "wait", "pause", "stop"],
        0,
        t(
          "coroutine.yield pauses until the next resume.",
          "coroutine.yield bir sonraki resume'a kadar duraklatır.",
        ),
      ),
      predict(
        lua`
task.spawn(function()
    task.wait(1)
    print("later")
end)
print("now")
`,
        ["now\nlater", "later\nnow", "now", "later"],
        0,
        t(
          "task.spawn runs until its wait, then the main script carries on.",
          "task.spawn wait'e kadar çalışır, sonra ana script devam eder.",
        ),
      ),
    ],
  },

  // ------------------------------------------------------------------ 11 · Data like a pro
  "session-data": {
    emoji: "💾",
    takeaway: t(
      "One session table per player: load on join, save on leave, on shutdown and on a timer — with pcall and UpdateAsync.",
      "Oyuncu başına bir oturum tablosu: girişte yükle; çıkışta, kapanışta ve zamanlayıcıyla kaydet — pcall ve UpdateAsync ile.",
    ),
    steps: [
      learn(
        t("Load once, save on leave", "Bir kez yükle, çıkışta kaydet"),
        t(
          "Keep each player's data in a table while they play (`sessions[player]`). Load it in PlayerAdded; save it in PlayerRemoving and BindToClose.",
          "Her oyuncunun verisini oynarken bir tabloda tut (`sessions[player]`). PlayerAdded'da yükle; PlayerRemoving ve BindToClose'da kaydet.",
        ),
        {
          code: lua`
local sessions = {}
Players.PlayerAdded:Connect(load)
Players.PlayerRemoving:Connect(save)
`,
          hook: t(
            "A shopping cart 🛒: fill it while you shop, pay once at the end.",
            "Alışveriş sepeti 🛒: gezerken doldur, sonunda bir kez öde.",
          ),
        },
      ),
      order(
        t("Put the leave handler in order", "Çıkış işleyicisini sıraya koy"),
        [
          "Players.PlayerRemoving:Connect(function(player)",
          "    save(player)",
          "    sessions[player] = nil",
          "end)",
        ],
        t(
          "Save first, then forget the session — the other way round saves nothing.",
          "Önce kaydet, sonra oturumu unut — tersi hiçbir şey kaydetmez.",
        ),
      ),
      choice(
        t(
          "When should the server NOT save a player's data?",
          "Sunucu bir oyuncunun verisini ne zaman KAYDETMEMELİ?",
        ),
        [
          t("When their data failed to load", "Verisi yüklenemediyse"),
          t("When they leave", "Çıktığında"),
          t("When the server shuts down", "Sunucu kapanırken"),
          t("During autosave", "Otomatik kayıtta"),
        ],
        0,
        t(
          "Saving empty defaults would overwrite their real progress.",
          "Boş varsayılanları kaydetmek gerçek ilerlemesinin üstüne yazar.",
        ),
      ),
      learn(
        t("UpdateAsync", "UpdateAsync"),
        t(
          "`store:UpdateAsync(key, function(old) … end)` gives you what's saved right now. Return the new value — or nil to cancel.",
          "`store:UpdateAsync(key, function(old) … end)` sana şu an kayıtlı olanı verir. Yeni değeri döndür — iptal için nil.",
        ),
      ),
      predict(
        lua`
local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("Test")
store:UpdateAsync("k", function(old)
    return (old or 0) + 10
end)
local value = store:GetAsync("k")
print(value)
`,
        ["10", "nil", "0", "20"],
        0,
        t(
          "Nothing was saved, so old is nil: 0 + 10.",
          "Hiçbir şey kayıtlı değildi, old nil: 0 + 10.",
        ),
      ),
      fill(
        t("A failure mustn't crash the script", "Bir hata scripti çökertmemeli"),
        'local ok, data = ___(store.GetAsync, store, "Player_1")',
        ["pcall", "print", "require", "tostring"],
        0,
        t(
          "pcall catches the error and returns ok = false.",
          "pcall hatayı yakalar ve ok = false döndürür.",
        ),
      ),
      predict(
        lua`
local function retry(times, fn)
    for i = 1, times do
        if pcall(fn) then
            return i
        end
    end
    return 0
end
local calls = 0
print(retry(3, function()
    calls += 1
    if calls < 2 then
        error("busy")
    end
end))
`,
        ["2", "1", "3", "0"],
        0,
        t(
          "The first try fails, the second works: retry returns 2.",
          "İlk deneme başarısız, ikincisi çalışır: retry 2 döndürür.",
        ),
      ),
      choice(
        t("Why autosave every few minutes?", "Neden birkaç dakikada bir otomatik kayıt?"),
        [
          t(
            "So a crash loses only a few minutes of progress",
            "Bir çökme sadece birkaç dakikalık ilerlemeyi kaybettirsin diye",
          ),
          t("Because PlayerRemoving never fires", "Çünkü PlayerRemoving hiç tetiklenmez"),
          t("To make the game faster", "Oyun hızlansın diye"),
          t("Roblox requires it", "Roblox zorunlu tutar"),
        ],
        0,
        t(
          "Servers can crash; autosaves limit the damage.",
          "Sunucular çökebilir; otomatik kayıt zararı sınırlar.",
        ),
      ),
    ],
  },

  "global-leaderboards": {
    emoji: "🏆",
    takeaway: t(
      "OrderedDataStores keep whole numbers and return them sorted — refresh boards every minute or two.",
      "OrderedDataStore'lar tam sayı tutar ve sıralı verir — panoları bir iki dakikada bir yenile.",
    ),
    steps: [
      learn(
        t("Sorted saves", "Sıralı kayıtlar"),
        t(
          '`DataStoreService:GetOrderedDataStore("Wins")` stores whole numbers and can return the keys sorted by value.',
          '`DataStoreService:GetOrderedDataStore("Wins")` tam sayı saklar ve anahtarları değere göre sıralı verebilir.',
        ),
        {
          code: lua`
local wins = DataStoreService:GetOrderedDataStore("Wins")
wins:SetAsync("123", 40)
`,
          hook: t(
            "A finish line 🏁: it only cares about the order.",
            "Bitiş çizgisi 🏁: sadece sıralamayı umursar.",
          ),
        },
      ),
      fill(
        t("Top 10, highest first", "İlk 10, en yüksek önce"),
        "local pages = wins:GetSortedAsync(___, 10)",
        ["false", "true", "10", "nil"],
        0,
        t(
          "The first argument asks: ascending? false = highest first.",
          "İlk argüman artan mı diye sorar: false = en yüksek önce.",
        ),
      ),
      predict(
        lua`
local DataStoreService = game:GetService("DataStoreService")
local wins = DataStoreService:GetOrderedDataStore("Wins")
wins:SetAsync("Ann", 5)
wins:SetAsync("Bob", 9)
wins:SetAsync("Cat", 7)
local top = wins:GetSortedAsync(false, 2):GetCurrentPage()
for rank, entry in ipairs(top) do
    print(rank, entry.key)
end
`,
        ["1 Bob\n2 Cat", "1 Ann\n2 Bob", "1 Bob\n2 Ann", "1 Cat\n2 Bob"],
        0,
        t(
          "Highest first, and only 2 per page: Bob (9), Cat (7).",
          "En yüksek önce ve sayfada sadece 2: Bob (9), Cat (7).",
        ),
      ),
      learn(
        t("Pages", "Sayfalar"),
        t(
          "GetSortedAsync returns pages. `pages:GetCurrentPage()` is a list of `{ key = …, value = … }` entries, already in order.",
          "GetSortedAsync sayfalar döndürür. `pages:GetCurrentPage()`, zaten sıralı `{ key = …, value = … }` kayıtlarının listesidir.",
        ),
      ),
      choice(
        t(
          "Your game ranks fastest times (lowest is best). Which call?",
          "Oyunun en hızlı süreleri sıralıyor (en düşük en iyi). Hangi çağrı?",
        ),
        [
          "GetSortedAsync(true, 10)",
          "GetSortedAsync(false, 10)",
          "GetAsync(10)",
          "GetSortedAsync(10)",
        ],
        0,
        t("Ascending = lowest first.", "Artan = en düşük önce."),
      ),
      predict(
        lua`
local seconds = 12.345
local saved = math.floor(seconds * 1000)
print(saved, saved / 1000)
`,
        ["12345 12.345", "12 12", "12.345 12.345", "12345 12"],
        0,
        t(
          "Save whole milliseconds, divide when showing.",
          "Tam milisaniye kaydet, gösterirken böl.",
        ),
      ),
      choice(
        t("How often should a global board refresh?", "Global bir pano ne sıklıkla yenilenmeli?"),
        [
          t("Every minute or two", "Bir iki dakikada bir"),
          t("Every frame", "Her karede"),
          t("Every time a coin changes", "Her coin değiştiğinde"),
          t("Never", "Hiçbir zaman"),
        ],
        0,
        t("Every GetSortedAsync uses request budget.", "Her GetSortedAsync istek bütçesi harcar."),
      ),
    ],
  },

  serialization: {
    emoji: "📦",
    takeaway: t(
      "Save plain data only: turn Vector3s and Color3s into numbers or text, and keep a Version for upgrades.",
      "Sadece düz veri kaydet: Vector3 ve Color3'ü sayıya ya da metne çevir, güncellemeler için bir Version tut.",
    ),
    steps: [
      learn(
        t("Only plain data", "Sadece düz veri"),
        t(
          "DataStores save numbers, strings, booleans and tables of those. Turn a Vector3 into `{ X, Y, Z }` before saving, and back with Vector3.new.",
          "DataStore'lar sayıları, metinleri, boolean'ları ve bunların tablolarını kaydeder. Kaydetmeden önce Vector3'ü `{ X, Y, Z }` yap, Vector3.new ile geri çevir.",
        ),
        {
          code: lua`
local function pack(v)
    return { v.X, v.Y, v.Z }
end
`,
          hook: t(
            "Flat-pack furniture 🪑: take it apart to ship it, build it again at home.",
            "Demonte mobilya 🪑: taşımak için sök, evde tekrar kur.",
          ),
        },
      ),
      predict(
        lua`
local v = Vector3.new(4, 5, 6)
local packed = { v.X, v.Y, v.Z }
print(#packed, packed[2])
`,
        ["3 5", "3 4", "1 5", "6 5"],
        0,
        t("Three numbers; the second is Y = 5.", "Üç sayı; ikincisi Y = 5."),
      ),
      choice(
        t(
          "Which value can go straight into a DataStore?",
          "Hangi değer doğrudan DataStore'a girebilir?",
        ),
        [
          '{ Coins = 10, Items = { "Sword" } }',
          "Vector3.new(1, 2, 3)",
          "workspace.Baseplate",
          "Color3.fromRGB(255, 0, 0)",
        ],
        0,
        t("Tables of numbers and strings are plain data.", "Sayı ve metin tabloları düz veridir."),
      ),
      fill(
        t("Rebuild the vector", "Vektörü yeniden kur"),
        "local position = Vector3.new(table.___(saved))",
        ["unpack", "pack", "insert", "concat"],
        0,
        t(
          "table.unpack turns { 1, 2, 3 } into 1, 2, 3.",
          "table.unpack { 1, 2, 3 }'ü 1, 2, 3 yapar.",
        ),
      ),
      predict(
        lua`
local HttpService = game:GetService("HttpService")
local json = HttpService:JSONEncode({ Coins = 5 })
local back = HttpService:JSONDecode(json)
print(json, back.Coins)
`,
        ['{"Coins":5} 5', "Coins 5", "{Coins = 5} 5", "5 5"],
        0,
        t(
          "JSON is text; decoding gives the table back.",
          "JSON bir metindir; çözünce tablo geri gelir.",
        ),
      ),
      learn(
        t("Versions", "Sürümler"),
        t(
          "Store a Version number in every save. When an old save loads, upgrade it step by step so nobody loses progress after an update.",
          "Her kayda bir Version numarası koy. Eski bir kayıt yüklenince onu adım adım güncelle; böylece bir güncellemeden sonra kimse ilerleme kaybetmez.",
        ),
      ),
      predict(
        lua`
local function migrate(data)
    if (data.Version or 1) < 2 then
        data.Gems = 0
        data.Version = 2
    end
    return data
end
local d = migrate({ Coins = 50 })
print(d.Version, d.Gems)
`,
        ["2 0", "1 nil", "2 nil", "nil 0"],
        0,
        t(
          "No Version means version 1, so it gets upgraded.",
          "Version yoksa sürüm 1'dir, bu yüzden güncellenir.",
        ),
      ),
    ],
  },

  "cross-server": {
    emoji: "📡",
    takeaway: t(
      "SubscribeAsync listens on a topic, PublishAsync sends to every server; the data is in message.Data.",
      "SubscribeAsync bir konuyu dinler, PublishAsync her sunucuya gönderir; veri message.Data'dadır.",
    ),
    steps: [
      learn(
        t("Topics", "Konular"),
        t(
          "`MessagingService:SubscribeAsync(topic, fn)` listens; `PublishAsync(topic, data)` sends to every server listening on that topic.",
          "`MessagingService:SubscribeAsync(topic, fn)` dinler; `PublishAsync(topic, data)` o konuyu dinleyen her sunucuya gönderir.",
        ),
        {
          code: lua`
MessagingService:SubscribeAsync("News", function(message)
    print(message.Data)
end)
`,
          hook: t(
            "A radio channel 📻: tune in once, hear every broadcast.",
            "Radyo kanalı 📻: bir kez ayarla, her yayını duy.",
          ),
        },
      ),
      predict(
        lua`
local MessagingService = game:GetService("MessagingService")
MessagingService:SubscribeAsync("News", function(message)
    print(message.Data)
end)
MessagingService:PublishAsync("News", 42)
`,
        ["42", "News", "nil", t("Nothing", "Hiçbir şey")],
        0,
        t(
          "The subscriber gets what was published, in message.Data.",
          "Abone, yayınlananı message.Data'da alır.",
        ),
      ),
      fill(
        t("Where is the published value?", "Yayınlanan değer nerede?"),
        "print(message.___)",
        ["Data", "Text", "Value", "Message"],
        0,
        t(
          "message.Data is the value; message.Sent is the time.",
          "message.Data değerdir; message.Sent zamandır.",
        ),
      ),
      predict(
        lua`
local MessagingService = game:GetService("MessagingService")
MessagingService:SubscribeAsync("Drops", function(message)
    print(message.Data.Player, message.Data.Item)
end)
MessagingService:PublishAsync("Drops", { Player = "Ann", Item = "Dragon" })
`,
        ["Ann Dragon", "Player Item", "Dragon Ann", "nil nil"],
        0,
        t("Small tables travel too.", "Küçük tablolar da taşınır."),
      ),
      learn(
        t("Use it rarely", "Seyrek kullan"),
        t(
          "Each server can only send a limited number of messages a minute. Publish rare, important events — never every frame or every coin.",
          "Her sunucu dakikada sınırlı sayıda mesaj gönderebilir. Nadir ve önemli olayları yayınla — asla her karede ya da her coin'de değil.",
        ),
      ),
      choice(
        t(
          "Which is a good use of MessagingService?",
          "Hangisi MessagingService'in iyi bir kullanımı?",
        ),
        [
          t(
            "Telling every server someone hatched a Legendary pet",
            "Her sunucuya birinin Efsanevi hayvan çıkardığını söylemek",
          ),
          t("Sending every coin pickup", "Her coin toplamayı göndermek"),
          t("Moving a part every frame", "Her karede bir parça taşımak"),
          t("Saving player data", "Oyuncu verisini kaydetmek"),
        ],
        0,
        t("Rare, game-wide news is what it's for.", "Nadir, oyun çapında haberler için var."),
      ),
      choice(
        t("Players in two different servers…", "İki farklı sunucudaki oyuncular…"),
        [
          t("can't see each other's world", "birbirinin dünyasını göremez"),
          t("share one workspace", "tek bir workspace paylaşır"),
          t("can fire RemoteEvents to each other", "birbirine RemoteEvent tetikleyebilir"),
          t("always play together", "hep birlikte oynar"),
        ],
        0,
        t(
          "Each server is its own world; MessagingService bridges them.",
          "Her sunucu kendi dünyasıdır; MessagingService onları bağlar.",
        ),
      ),
    ],
  },

  // ------------------------------------------------------------------ 12 · Security
  "server-authority": {
    emoji: "🛡️",
    takeaway: t(
      "The client asks, the server decides: check types, ranges, NaN and distance, and look up prices yourself.",
      "İstemci ister, sunucu karar verir: tipleri, aralıkları, NaN'ı ve mesafeyi kontrol et, fiyatlara kendin bak.",
    ),
    steps: [
      learn(
        t("The client asks, the server decides", "İstemci ister, sunucu karar verir"),
        t(
          "Exploiters can fire any RemoteEvent with any values. The server checks every argument and looks up prices and rewards itself.",
          "Exploit kullananlar her RemoteEvent'i her değerle tetikleyebilir. Sunucu her argümanı kontrol eder, fiyatlara ve ödüllere kendisi bakar.",
        ),
        {
          code: lua`
buyItem.OnServerEvent:Connect(function(player, itemName)
    local price = PRICES[itemName]
end)
`,
          hook: t(
            "A bank teller 🏦: you ask for money, they check your balance.",
            "Banka gişesi 🏦: sen para istersin, onlar bakiyene bakar.",
          ),
        },
      ),
      choice(
        t("Which remote is safe?", "Hangi remote güvenli?"),
        [
          "claim.OnServerEvent:Connect(function(player) giveDaily(player) end)",
          "give.OnServerEvent:Connect(function(player, amount) addCoins(player, amount) end)",
          "setLevel.OnServerEvent:Connect(function(player, level) setLevel(player, level) end)",
          "buy.OnServerEvent:Connect(function(player, item, price) charge(player, price) end)",
        ],
        0,
        t(
          "Only the first lets the server decide everything; the others trust a number from the client.",
          "Sadece ilki her şeye sunucunun karar vermesine izin veriyor; diğerleri istemciden gelen bir sayıya güveniyor.",
        ),
      ),
      fill(
        t("Reject anything that isn't text", "Metin olmayan her şeyi reddet"),
        lua`
if typeof(itemName) ~= ___ then
    return
end
`,
        ['"string"', '"number"', '"table"', '"Instance"'],
        0,
        t(
          "Item names are strings — anything else is suspicious.",
          "Eşya isimleri metindir — başka her şey şüphelidir.",
        ),
      ),
      predict(
        lua`
local function isValid(n)
    return typeof(n) == "number" and n == n and n > 0 and n <= 100
end
print(isValid(50), isValid(-5), isValid(0 / 0), isValid("50"))
`,
        [
          "true false false false",
          "true false true false",
          "true true false true",
          "false false false false",
        ],
        0,
        t("Only 50 is a real number in range.", "Sadece 50 aralıkta gerçek bir sayı."),
      ),
      learn(
        t("NaN is sneaky", "NaN sinsidir"),
        t(
          "0/0 is NaN: every comparison with it is false, so `n < 0` doesn't catch it. `n == n` is false only for NaN — check it.",
          "0/0 NaN'dır: onunla her karşılaştırma false'tur, bu yüzden `n < 0` onu yakalamaz. `n == n` sadece NaN için false'tur — onu kontrol et.",
        ),
      ),
      predict(
        lua`
local n = 0 / 0
print(n < 0, n > 0, n == n)
`,
        ["false false false", "true false true", "false false true", "true true false"],
        0,
        t(
          "Every comparison with NaN is false — even with itself.",
          "NaN ile her karşılaştırma false'tur — kendisiyle bile.",
        ),
      ),
      predict(
        lua`
local a = Vector3.new(0, 0, 0)
local b = Vector3.new(30, 0, 40)
print((a - b).Magnitude <= 12)
`,
        ["false", "true", "50", "12"],
        0,
        t(
          "The distance is 50 studs — too far to interact.",
          "Mesafe 50 stud — etkileşim için çok uzak.",
        ),
      ),
    ],
  },

  "rate-limiting": {
    emoji: "⏱️",
    takeaway: t(
      "Remember when each player last acted, ignore requests that come too soon, and clear the table in PlayerRemoving.",
      "Her oyuncunun en son ne zaman bir şey yaptığını hatırla, çok erken gelen istekleri yok say ve tabloyu PlayerRemoving'de temizle.",
    ),
    steps: [
      learn(
        t("One time per player", "Oyuncu başına bir zaman"),
        t(
          "Store when each player last did something: `last[player] = os.clock()`. Ignore requests that arrive sooner than the cooldown.",
          "Her oyuncunun en son ne zaman bir şey yaptığını sakla: `last[player] = os.clock()`. Bekleme süresinden önce gelen istekleri yok say.",
        ),
        {
          code: lua`
if last[player] and os.clock() - last[player] < 0.5 then
    return
end
last[player] = os.clock()
`,
          hook: t("A turnstile 🚇: one person per beep.", "Turnike 🚇: her bipte bir kişi."),
        },
      ),
      fill(
        t("Forget players when they leave", "Çıkan oyuncuları unut"),
        lua`
Players.___:Connect(function(player)
    last[player] = nil
end)
`,
        ["PlayerRemoving", "PlayerAdded", "ChildRemoved", "Destroying"],
        0,
        t("Clear their entry when they leave.", "Çıkınca kayıtlarını sil."),
      ),
      predict(
        lua`
local last = {}
local function allowed(name, now)
    if last[name] and now - last[name] < 1 then
        return false
    end
    last[name] = now
    return true
end
print(allowed("Ann", 0), allowed("Ann", 0.5), allowed("Ann", 1.2), allowed("Bob", 1.2))
`,
        [
          "true false true true",
          "true true true true",
          "true false false true",
          "false false true true",
        ],
        0,
        t(
          "0.5 is too soon for Ann, 1.2 is fine, and Bob has his own timer.",
          "0.5 Ann için çok erken, 1.2 uygun, Bob'un da kendi sayacı var.",
        ),
      ),
      learn(
        t("Budgets", "Bütçeler"),
        t(
          "A token bucket lets a player do a few things quickly, then limits the average: tokens refill over time and each request spends one.",
          "Jeton kovası oyuncunun birkaç şeyi hızlıca yapmasına izin verir, sonra ortalamayı sınırlar: jetonlar zamanla dolar ve her istek bir tane harcar.",
        ),
      ),
      predict(
        lua`
local tokens = 3
local function spend()
    if tokens < 1 then
        return false
    end
    tokens -= 1
    return true
end
print(spend(), spend(), spend(), spend())
`,
        [
          "true true true false",
          "true true true true",
          "true false true false",
          "false false false false",
        ],
        0,
        t(
          "Three tokens, three requests; the fourth has to wait.",
          "Üç jeton, üç istek; dördüncüsü beklemek zorunda.",
        ),
      ),
      choice(
        t(
          "Lag makes an honest player's two clicks arrive together. What should the server do?",
          "Gecikme yüzünden dürüst bir oyuncunun iki tıklaması birlikte geliyor. Sunucu ne yapmalı?",
        ),
        [
          t("Quietly ignore the extra one", "Fazlasını sessizce yok say"),
          t("Ban them", "Banla"),
          t("Kick them", "At"),
          t("Crash the server", "Sunucuyu çökert"),
        ],
        0,
        t(
          "Punish only players far over the limit.",
          "Sadece sınırın çok üstündeki oyuncuları cezalandır.",
        ),
      ),
      choice(
        t("Why clear the table in PlayerRemoving?", "Tablo neden PlayerRemoving'de temizlenir?"),
        [
          t(
            "Otherwise it keeps every player forever — a memory leak",
            "Yoksa her oyuncuyu sonsuza kadar tutar — bellek sızıntısı",
          ),
          t("Roblox needs it to save", "Roblox kaydetmek için ister"),
          t("It makes cooldowns shorter", "Bekleme sürelerini kısaltır"),
          t("It isn't needed", "Gerek yok"),
        ],
        0,
        t(
          "Tables keyed by player grow until you remove entries.",
          "Oyuncuya göre anahtarlanan tablolar sen silene kadar büyür.",
        ),
      ),
    ],
  },

  replication: {
    emoji: "🔁",
    takeaway: t(
      "Server changes reach everyone; client changes stay local. Secrets in ServerStorage, shared things in ReplicatedStorage.",
      "Sunucu değişiklikleri herkese ulaşır; istemci değişiklikleri yerel kalır. Gizliler ServerStorage'a, ortak şeyler ReplicatedStorage'a.",
    ),
    steps: [
      learn(
        t("Server to everyone", "Sunucudan herkese"),
        t(
          "Changes the server makes replicate to every client. Changes a client makes stay on that client — that's FilteringEnabled.",
          "Sunucunun yaptığı değişiklikler her istemciye replike edilir. İstemcinin yaptıkları o istemcide kalır — işte FilteringEnabled.",
        ),
        {
          hook: t(
            "A TV broadcast 📺: the station sends to everyone; drawing on your screen changes nothing for others.",
            "TV yayını 📺: kanal herkese gönderir; senin ekranına çizim yapmak başkaları için hiçbir şey değiştirmez.",
          ),
        },
      ),
      choice(
        t("Where do RemoteEvents go?", "RemoteEvent'ler nereye konur?"),
        ["ReplicatedStorage", "ServerStorage", "ServerScriptService", "Lighting"],
        0,
        t("Both sides must see them.", "İki taraf da onları görmeli."),
      ),
      choice(
        t(
          "Where do you keep templates the client should never read?",
          "İstemcinin asla okumaması gereken şablonları nerede tutarsın?",
        ),
        ["ServerStorage", "ReplicatedStorage", "Workspace", "StarterGui"],
        0,
        t("ServerStorage never reaches clients.", "ServerStorage istemcilere hiç ulaşmaz."),
      ),
      learn(
        t("Ask, don't change", "Değiştirme, iste"),
        t(
          "If a change should happen for everyone, the LocalScript fires a RemoteEvent and the server makes the change. Then it replicates to all players.",
          "Bir değişiklik herkes için olacaksa LocalScript bir RemoteEvent tetikler ve değişikliği sunucu yapar. Sonra bütün oyunculara replike edilir.",
        ),
      ),
      choice(
        t(
          "A LocalScript sets Coins.Value = 9999. What happens on the server?",
          "Bir LocalScript Coins.Value = 9999 yapıyor. Sunucuda ne olur?",
        ),
        [
          t("Nothing: the server keeps the real value", "Hiçbir şey: sunucu gerçek değeri tutar"),
          t("Everyone sees 9999", "Herkes 9999 görür"),
          t("The value is saved", "Değer kaydedilir"),
          t("The server crashes", "Sunucu çöker"),
        ],
        0,
        t(
          "Client changes don't replicate to the server.",
          "İstemci değişiklikleri sunucuya replike edilmez.",
        ),
      ),
      fill(
        t("Ask the server to open the door", "Sunucudan kapıyı açmasını iste"),
        "openDoor:___()",
        ["FireServer", "FireClient", "Fire", "InvokeClient"],
        0,
        t("From a LocalScript you call FireServer.", "LocalScript'ten FireServer çağırırsın."),
      ),
      choice(
        t("What can exploiters read?", "Exploit kullananlar neyi okuyabilir?"),
        [
          t(
            "The code of LocalScripts and modules in ReplicatedStorage",
            "LocalScript'lerin ve ReplicatedStorage'daki modüllerin kodunu",
          ),
          t("Scripts in ServerScriptService", "ServerScriptService'teki scriptleri"),
          t("Everything in ServerStorage", "ServerStorage'daki her şeyi"),
          t("Other players' DataStore data", "Diğer oyuncuların DataStore verilerini"),
        ],
        0,
        t(
          "Anything sent to their device can be read.",
          "Cihazlarına gönderilen her şey okunabilir.",
        ),
      ),
    ],
  },

  "anti-cheat": {
    emoji: "🚨",
    takeaway: t(
      "Check movement and hit claims on the server, ignore falling, and pull players back instead of banning on one reading.",
      "Hareketi ve vuruş iddialarını sunucuda kontrol et, düşmeyi yok say ve tek bir ölçümde banlamak yerine oyuncuyu geri çek.",
    ),
    steps: [
      learn(
        t("Check what's possible", "Mümkün olanı kontrol et"),
        t(
          "The server sees where characters end up. If one moved farther than its speed allows, pull it back instead of trusting it.",
          "Sunucu karakterlerin nereye vardığını görür. Biri hızının izin verdiğinden uzağa gittiyse ona güvenmek yerine geri çek.",
        ),
        {
          code: lua`
local moved = (root.Position - lastPosition).Magnitude
if moved > MAX_SPEED * CHECK_EVERY then
    root.CFrame = CFrame.new(lastPosition)
end
`,
          hook: t(
            "A speed camera 📸: it doesn't stop you driving, it checks afterwards.",
            "Hız kamerası 📸: sürmeni engellemez, sonradan kontrol eder.",
          ),
        },
      ),
      predict(
        lua`
local last = Vector3.new(0, 0, 0)
local now = Vector3.new(60, -100, 0)
local flat = (now - last) * Vector3.new(1, 0, 1)
print(flat.Magnitude)
`,
        ["60", "100", "160", "0"],
        0,
        t(
          "Multiplying by (1, 0, 1) drops the fall; only 60 sideways is left.",
          "(1, 0, 1) ile çarpmak düşüşü atar; sadece 60 yatay kalır.",
        ),
      ),
      fill(
        t("Ignore falling: keep only X and Z", "Düşmeyi yok say: sadece X ve Z kalsın"),
        "local flat = moved * Vector3.new(1, ___, 1)",
        ["0", "1", "-1", "2"],
        0,
        t("A 0 in the middle removes the Y part.", "Ortadaki 0, Y kısmını siler."),
      ),
      learn(
        t("Check hit claims", "Vuruş iddialarını kontrol et"),
        t(
          "When a client says it hit a target, check it's a Model with a living Humanoid and close enough. Damage numbers stay on the server.",
          "Bir istemci bir hedefi vurduğunu söylerse, onun yaşayan bir Humanoid'i olan bir Model olduğunu ve yeterince yakın olduğunu kontrol et. Hasar sayıları sunucuda kalır.",
        ),
      ),
      predict(
        lua`
local function canHit(distance, alive)
    return alive and distance <= 10
end
print(canHit(5, true), canHit(15, true), canHit(5, false))
`,
        ["true false false", "true true false", "false false false", "true false true"],
        0,
        t("Close and alive only.", "Sadece yakın ve canlı."),
      ),
      choice(
        t(
          "A client fires HitEnemy with a target 200 studs away. What should the server do?",
          "Bir istemci HitEnemy'yi 200 stud uzaktaki bir hedefle tetikliyor. Sunucu ne yapmalı?",
        ),
        [
          t("Ignore it — too far to have hit", "Yok say — vurmuş olamayacak kadar uzak"),
          t("Deal double damage", "Çift hasar ver"),
          t("Teleport the target", "Hedefi ışınla"),
          t("Ban instantly", "Hemen banla"),
        ],
        0,
        t("Reject impossible claims quietly.", "İmkânsız iddiaları sessizce reddet."),
      ),
      choice(
        t("Which value should the client decide?", "Hangi değere istemci karar vermeli?"),
        [
          t("Which target it aimed at", "Hangi hedefe nişan aldığına"),
          t("How much damage it deals", "Ne kadar hasar verdiğine"),
          t("How many coins it earns", "Kaç coin kazandığına"),
          t("Its weapon's cooldown", "Silahının bekleme süresine"),
        ],
        0,
        t(
          "The client says what the player did; the server works out the result.",
          "İstemci oyuncunun ne yaptığını söyler; sonucu sunucu hesaplar.",
        ),
      ),
    ],
  },
};
