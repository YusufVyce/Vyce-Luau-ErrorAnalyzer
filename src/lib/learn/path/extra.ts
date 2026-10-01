import { choice, fill, learn, order, predict, t, type PathLesson } from "./types";

/** Code: drops the first newline and turns 4-space indents into tabs. */
const lua = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values)
    .replace(/^\n/, "")
    .replace(/^( {4})+/gm, (m) => "\t".repeat(m.length / 4))
    .replace(/\s+$/, "");

const BT = "`";

/** Bite-sized steps for the lessons in lessons.extra.ts. */
export const CH_EXTRA: Record<string, PathLesson> = {
  dictionaries: {
    emoji: "📖",
    takeaway: t(
      "Dictionaries use names as keys. Loop them with pairs; # is 0 for them.",
      "Sözlükler anahtar olarak isim kullanır. pairs ile dön; onlar için # 0'dır.",
    ),
    steps: [
      learn(
        t("Keys with names", "İsimli anahtarlar"),
        t(
          "A dictionary stores values under names: `prices.Sword` instead of `items[1]`.",
          "Bir sözlük değerleri isimlerin altında saklar: `items[1]` yerine `prices.Sword`.",
        ),
        {
          code: lua`
local prices = { Sword = 100, Bow = 60 }
print(prices.Sword)
`,
          hook: t(
            "Like the contacts on a phone 📇: you look them up by name, not by number.",
            "Telefondaki rehber gibi 📇: numarayla değil, isimle ararsın.",
          ),
        },
      ),
      predict(
        lua`
local prices = { Sword = 100, Bow = 60 }
prices.Bow = 75
print(prices.Bow)
`,
        ["75", "60", "nil", "135"],
        0,
        t(
          "Setting a key again replaces its value.",
          "Bir anahtarı tekrar ayarlamak değerini değiştirir.",
        ),
      ),
      fill(
        t("Visit every key and value", "Her anahtarı ve değeri gez"),
        lua`
for item, price in ___(prices) do
    print(item, price)
end
`,
        ["pairs", "ipairs", "next", "each"],
        0,
        t(
          "pairs visits named keys too. ipairs only walks 1, 2, 3…",
          "pairs isimli anahtarları da gezer. ipairs sadece 1, 2, 3… diye ilerler.",
        ),
      ),
      learn(
        t("# is for lists", "# listeler içindir"),
        t(
          "`#` only counts the keys 1, 2, 3… A table with only named keys has length 0, so count those with a pairs loop.",
          "`#` sadece 1, 2, 3… anahtarlarını sayar. Sadece isimli anahtarları olan bir tablonun uzunluğu 0'dır; onları bir pairs döngüsüyle say.",
        ),
      ),
      predict(
        lua`
local stats = { Coins = 5, Gems = 2 }
print(#stats)
`,
        ["0", "2", "7", "nil"],
        0,
        t(
          "Coins and Gems are named keys, so # counts nothing.",
          "Coins ve Gems isimli anahtarlar, bu yüzden # hiçbir şey saymaz.",
        ),
      ),
      choice(
        t(
          "How do you remove the key Bow from prices?",
          "prices'tan Bow anahtarını nasıl silersin?",
        ),
        ["prices.Bow = nil", "prices.Bow = 0", 'table.remove(prices, "Bow")', "prices.Bow = false"],
        0,
        t("Setting a key to nil removes it.", "Bir anahtarı nil yapmak onu siler."),
      ),
      predict(
        lua`
local data = { Settings = { Volume = 0.5 } }
print(data.Settings.Volume)
`,
        ["0.5", "nil", "Settings", "Volume"],
        0,
        t(
          "data.Settings is a table, and .Volume is inside it.",
          "data.Settings bir tablodur, .Volume da onun içindedir.",
        ),
      ),
    ],
  },

  "string-tools": {
    emoji: "🔤",
    takeaway: t(
      "upper, lower, sub, find, gsub, split — and backticks to put values inside text.",
      "upper, lower, sub, find, gsub, split — ve değerleri metne koymak için ters tırnak.",
    ),
    steps: [
      learn(
        t("The string library", "string kütüphanesi"),
        t(
          "`string.upper`, `lower`, `sub`, `find`, `gsub` and `split` work on text. Each also works as `text:upper()`.",
          "`string.upper`, `lower`, `sub`, `find`, `gsub` ve `split` metinle çalışır. Her biri `text:upper()` şeklinde de çalışır.",
        ),
        {
          code: lua`
local name = "noob"
print(name:upper())
`,
          hook: t("A Swiss army knife for text 🔪", "Metin için çakı 🔪"),
        },
      ),
      predict(
        `print(string.upper("roblox"))`,
        ["ROBLOX", "roblox", "Roblox", "R"],
        0,
        t("upper makes every letter a capital.", "upper her harfi büyük yapar."),
      ),
      predict(
        `print(string.sub("Builderman", 1, 5))`,
        ["Build", "Builde", "uilde", "man"],
        0,
        t(
          "sub(text, 1, 5) keeps characters 1 through 5.",
          "sub(metin, 1, 5) 1'den 5'e kadar olan karakterleri tutar.",
        ),
      ),
      learn(
        t("Split and build", "Böl ve oluştur"),
        t(
          '`string.split(text, ",")` cuts text into a list. Text in backticks puts values inside: {coins} becomes the number.',
          '`string.split(metin, ",")` metni bir listeye böler. Ters tırnaklı metin değerleri içine koyar: {coins} sayıya dönüşür.',
        ),
      ),
      predict(
        lua`
local items = string.split("Sword,Bow,Potion", ",")
print(#items)
`,
        ["3", "1", "2", "16"],
        0,
        t("Two commas make three pieces.", "İki virgül üç parça yapar."),
      ),
      fill(
        t("Make every letter a capital", "Her harfi büyük yap"),
        `local loud = string.___("hello")`,
        ["upper", "lower", "rep", "len"],
        0,
        t("upper is the one for capitals.", "Büyük harf için upper kullanılır."),
      ),
      choice(
        t('What does string.find("Roblox", "lox") give?', 'string.find("Roblox", "lox") ne verir?'),
        ["4 6", "true", "lox", "nil"],
        0,
        t(
          "find gives where the match starts and ends: 4 and 6.",
          "find eşleşmenin başladığı ve bittiği yeri verir: 4 ve 6.",
        ),
      ),
      predict(
        lua`
local coins = 5
print(${BT}{coins}+{coins}={coins * 2}${BT})
`,
        ["5+5=10", "{coins}+{coins}={coins * 2}", "10", "55"],
        0,
        t(
          "Every {…} inside backticks is replaced by its value.",
          "Ters tırnak içindeki her {…} değeriyle değiştirilir.",
        ),
      ),
    ],
  },

  instances: {
    emoji: "🧱",
    takeaway: t(
      "Instance.new to make, Clone to copy, FindFirstChild to look, Destroy to remove.",
      "Yapmak için Instance.new, kopyalamak için Clone, aramak için FindFirstChild, silmek için Destroy.",
    ),
    steps: [
      learn(
        t("Instance.new", "Instance.new"),
        t(
          '`Instance.new("Part")` makes a new object. Set its properties, then set Parent last so it appears.',
          '`Instance.new("Part")` yeni bir obje yapar. Özelliklerini ayarla, sonra görünsün diye Parent\'ı en son ayarla.',
        ),
        {
          code: lua`
local part = Instance.new("Part")
part.Anchored = true
part.Parent = workspace
`,
          hook: t(
            "Like 3D printing 🖨️: design it first, then place it in the world.",
            "3D yazıcı gibi 🖨️: önce tasarla, sonra dünyaya koy.",
          ),
        },
      ),
      order(
        t(
          "Put the lines in order to make a red platform",
          "Kırmızı bir platform yapmak için satırları sırala",
        ),
        ['local p = Instance.new("Part")', "p.Color = Color3.new(1, 0, 0)", "p.Parent = workspace"],
        t("Make it, set it up, then parent it.", "Yap, ayarla, sonra yerine koy."),
      ),
      learn(
        t("Clone and Destroy", "Clone ve Destroy"),
        t(
          "`template:Clone()` copies an object with everything inside it. `part:Destroy()` deletes it for good.",
          "`template:Clone()` bir objeyi içindeki her şeyle kopyalar. `part:Destroy()` onu kalıcı olarak siler.",
        ),
      ),
      predict(
        lua`
local a = Instance.new("Part")
a.Name = "X1"
local b = a:Clone()
b.Name = "X2"
print(a.Name, b.Name)
`,
        ["X1 X2", "X2 X2", "X1 X1", "X2 X1"],
        0,
        t(
          "A clone is a separate object: renaming it doesn't change the original.",
          "Kopya ayrı bir objedir: onu yeniden adlandırmak aslını değiştirmez.",
        ),
      ),
      predict(
        lua`
local folder = Instance.new("Folder")
for i = 1, 3 do
    Instance.new("Part").Parent = folder
end
print(#folder:GetChildren())
`,
        ["3", "0", "1", "4"],
        0,
        t("Three parts were put inside the folder.", "Klasörün içine üç parça kondu."),
      ),
      choice(
        t(
          'What does workspace:FindFirstChild("Door") give when there is no Door?',
          'Door yokken workspace:FindFirstChild("Door") ne verir?',
        ),
        [
          t("nil, so check it before using it", "nil, bu yüzden kullanmadan önce kontrol et"),
          t("An error", "Bir hata"),
          t("A new Door", "Yeni bir Door"),
          t("An empty Part", "Boş bir Part"),
        ],
        0,
        t(
          "FindFirstChild returns nil when nothing has that name.",
          "O isimde hiçbir şey yoksa FindFirstChild nil döndürür.",
        ),
      ),
      fill(
        t("Wait until Map exists", "Map var olana kadar bekle"),
        `local map = workspace:___("Map")`,
        ["WaitForChild", "FindFirstChild", "GetChildren", "Clone"],
        0,
        t(
          "WaitForChild pauses until the object appears.",
          "WaitForChild obje görünene kadar bekler.",
        ),
      ),
    ],
  },

  "task-library": {
    emoji: "⏲️",
    takeaway: t(
      "task.wait pauses, task.delay schedules, task.spawn runs alongside, Debris cleans up.",
      "task.wait bekletir, task.delay zamanlar, task.spawn yan yana çalıştırır, Debris temizler.",
    ),
    steps: [
      learn(
        t("task.delay", "task.delay"),
        t(
          "`task.delay(3, fn)` runs fn in 3 seconds — and the script keeps going right away.",
          "`task.delay(3, fn)` fn'i 3 saniye sonra çalıştırır — ve script hemen devam eder.",
        ),
        {
          hook: t(
            "Like an oven timer ⏲️: set it and walk away.",
            "Fırın zamanlayıcısı gibi ⏲️: kur ve git.",
          ),
        },
      ),
      predict(
        lua`
task.delay(1, function()
    print(2)
end)
print(1)
`,
        ["1\n2", "2\n1", "1", "2"],
        0,
        t(
          "The delayed function runs later, so 1 comes first.",
          "Gecikmeli fonksiyon sonra çalışır, bu yüzden önce 1 gelir.",
        ),
      ),
      choice(
        t("Which one pauses the current script?", "Hangisi şu anki scripti duraklatır?"),
        ["task.wait(2)", "task.delay(2, fn)", "task.spawn(fn)", "Debris:AddItem(part, 2)"],
        0,
        t(
          "Only task.wait stops this script; the others schedule something.",
          "Sadece task.wait bu scripti durdurur; diğerleri bir şey zamanlar.",
        ),
      ),
      learn(
        t("Debris", "Debris"),
        t(
          "`Debris:AddItem(part, 5)` destroys the part after 5 seconds without making your script wait.",
          "`Debris:AddItem(part, 5)` scriptini bekletmeden parçayı 5 saniye sonra yok eder.",
        ),
      ),
      fill(
        t("Remove the spark after 2 seconds", "Kıvılcımı 2 saniye sonra sil"),
        `Debris:___(spark, 2)`,
        ["AddItem", "Destroy", "Wait", "Delay"],
        0,
        t(
          "AddItem(object, seconds) schedules the clean-up.",
          "AddItem(obje, saniye) temizliği zamanlar.",
        ),
      ),
      predict(
        lua`
task.spawn(function()
    print("A")
end)
print("B")
`,
        ["A\nB", "B\nA", "A", "B"],
        0,
        t(
          "task.spawn starts the function right away, before the next line.",
          "task.spawn fonksiyonu hemen, sonraki satırdan önce başlatır.",
        ),
      ),
    ],
  },

  attributes: {
    emoji: "📝",
    takeaway: t(
      "SetAttribute to store, GetAttribute to read, GetAttributeChangedSignal to react.",
      "Saklamak için SetAttribute, okumak için GetAttribute, tepki için GetAttributeChangedSignal.",
    ),
    steps: [
      learn(
        t("Your own properties", "Kendi özelliklerin"),
        t(
          '`part:SetAttribute("Damage", 25)` stores your own value on a part. `part:GetAttribute("Damage")` reads it back.',
          '`part:SetAttribute("Damage", 25)` bir parçaya kendi değerini kaydeder. `part:GetAttribute("Damage")` onu geri okur.',
        ),
        { hook: t("A sticky note on the part 📝", "Parçaya yapıştırılmış bir not 📝") },
      ),
      predict(
        lua`
local p = Instance.new("Part")
p:SetAttribute("Damage", 25)
print(p:GetAttribute("Damage") * 2)
`,
        ["50", "25", "nil", "Damage"],
        0,
        t("The attribute holds 25, and 25 * 2 = 50.", "Attribute 25 tutuyor ve 25 * 2 = 50."),
      ),
      predict(
        lua`
local p = Instance.new("Part")
print(p:GetAttribute("Speed"))
`,
        ["nil", "0", "Speed", "false"],
        0,
        t("An attribute that was never set is nil.", "Hiç ayarlanmamış bir attribute nil'dir."),
      ),
      learn(
        t("Watching for changes", "Değişiklikleri izlemek"),
        t(
          '`part:GetAttributeChangedSignal("Locked")` fires every time that attribute changes.',
          '`part:GetAttributeChangedSignal("Locked")` o attribute her değiştiğinde tetiklenir.',
        ),
      ),
      fill(
        t("Run update whenever Locked changes", "Locked her değiştiğinde update çalışsın"),
        `door:___("Locked"):Connect(update)`,
        ["GetAttributeChangedSignal", "GetPropertyChangedSignal", "SetAttribute", "GetAttribute"],
        0,
        t(
          "Attributes have their own changed signal.",
          "Attribute'ların kendi değişiklik sinyali vardır.",
        ),
      ),
      choice(
        t("Which can NOT be stored in an attribute?", "Hangisi bir attribute'ta SAKLANAMAZ?"),
        [
          t("A table", "Bir tablo"),
          t("A number", "Bir sayı"),
          t("Text", "Metin"),
          t("true or false", "true ya da false"),
        ],
        0,
        t(
          "Attributes hold simple values, not tables or objects.",
          "Attribute'lar tablo ya da obje değil, basit değerler tutar.",
        ),
      ),
    ],
  },

  characters: {
    emoji: "🧍",
    takeaway: t(
      "Set characters up in CharacterAdded; the Humanoid has Health, WalkSpeed and JumpPower.",
      "Karakterleri CharacterAdded içinde ayarla; Humanoid'de Health, WalkSpeed ve JumpPower var.",
    ),
    steps: [
      learn(
        t("The character", "Karakter"),
        t(
          "Each player's character is a Model in workspace. Its Humanoid has Health, WalkSpeed and JumpPower.",
          "Her oyuncunun karakteri workspace'te bir Model'dir. Humanoid'inde Health, WalkSpeed ve JumpPower vardır.",
        ),
        {
          hook: t("The Humanoid is the character's engine 🏎️", "Humanoid, karakterin motorudur 🏎️"),
        },
      ),
      choice(
        t("When does player.CharacterAdded fire?", "player.CharacterAdded ne zaman tetiklenir?"),
        [
          t(
            "Every time the player spawns or respawns",
            "Oyuncu her doğduğunda ya da yeniden doğduğunda",
          ),
          t("Only once, when they join", "Sadece bir kez, oyuna girdiğinde"),
          t("When they leave", "Oyundan çıktığında"),
          t("When they jump", "Zıpladığında"),
        ],
        0,
        t("A new character is made at every spawn.", "Her doğuşta yeni bir karakter yapılır."),
      ),
      fill(
        t("Make the player run faster", "Oyuncuyu daha hızlı koştur"),
        `humanoid.___ = 30`,
        ["WalkSpeed", "JumpPower", "Health", "MaxHealth"],
        0,
        t(
          "WalkSpeed is the running speed (16 by default).",
          "WalkSpeed koşma hızıdır (varsayılan 16).",
        ),
      ),
      learn(
        t("Back to the player", "Oyuncuya geri dönmek"),
        t(
          "`Players:GetPlayerFromCharacter(hit.Parent)` gives the player who touched a part, or nil for anything else.",
          "`Players:GetPlayerFromCharacter(hit.Parent)` bir parçaya dokunan oyuncuyu verir, başka her şey için nil döner.",
        ),
      ),
      order(
        t("Heal the player who touches the pad", "Pede dokunan oyuncuyu iyileştir"),
        [
          "pad.Touched:Connect(function(hit)",
          "local player = Players:GetPlayerFromCharacter(hit.Parent)",
          "if player then hit.Parent.Humanoid.Health = 100 end",
          "end)",
        ],
        t(
          "Find the player first, then heal only if it's a real player.",
          "Önce oyuncuyu bul, sonra sadece gerçek bir oyuncuysa iyileştir.",
        ),
      ),
      choice(
        t("What is the default WalkSpeed?", "Varsayılan WalkSpeed kaç?"),
        ["16", "50", "100", "10"],
        0,
        t("16 studs per second. JumpPower is 50.", "Saniyede 16 stud. JumpPower 50'dir."),
      ),
    ],
  },

  "user-input": {
    emoji: "⌨️",
    takeaway: t(
      "Read keys in a LocalScript with InputBegan, and skip them when gameProcessed is true.",
      "Tuşları bir LocalScript'te InputBegan ile oku ve gameProcessed true ise atla.",
    ),
    steps: [
      learn(
        t("InputBegan", "InputBegan"),
        t(
          "In a LocalScript, `UserInputService.InputBegan` fires for every key press and click. `input.KeyCode` says which key.",
          "Bir LocalScript'te `UserInputService.InputBegan` her tuş basışında ve tıklamada tetiklenir. `input.KeyCode` hangi tuş olduğunu söyler.",
        ),
        { hook: t("A doorbell 🔔 for every key", "Her tuş için bir kapı zili 🔔") },
      ),
      fill(
        t("React to the E key", "E tuşuna tepki ver"),
        lua`
if input.KeyCode == Enum.KeyCode.___ then
    print("E")
end
`,
        ["E", "Q", "Space", "LeftShift"],
        0,
        t("Enum.KeyCode.E is the E key.", "Enum.KeyCode.E, E tuşudur."),
      ),
      choice(
        t("Where does keyboard code go?", "Klavye kodu nereye konur?"),
        [
          t(
            "A LocalScript, e.g. in StarterPlayerScripts",
            "Bir LocalScript, örn. StarterPlayerScripts'te",
          ),
          t("A Script in ServerScriptService", "ServerScriptService'teki bir Script"),
          t("A ModuleScript in ServerStorage", "ServerStorage'daki bir ModuleScript"),
          t("A Part in Workspace", "Workspace'teki bir Part"),
        ],
        0,
        t(
          "Input only exists on the player's device, so it's read on the client.",
          "Giriş sadece oyuncunun cihazında vardır, bu yüzden istemcide okunur.",
        ),
      ),
      learn(
        t("gameProcessed", "gameProcessed"),
        t(
          "The second parameter, `gameProcessed`, is true when the player was typing in chat or a TextBox. Ignore those presses.",
          "İkinci parametre `gameProcessed`, oyuncu sohbete ya da bir TextBox'a yazarken true'dur. O basışları yok say.",
        ),
      ),
      choice(
        t(
          'A player types "hello" in chat and your E ability fires. What\'s missing?',
          'Bir oyuncu sohbete "hello" yazıyor ve E yeteneğin tetikleniyor. Ne eksik?',
        ),
        [
          t("A gameProcessed check", "Bir gameProcessed kontrolü"),
          t("A RemoteEvent", "Bir RemoteEvent"),
          t("A task.wait()", "Bir task.wait()"),
          t("A server Script", "Bir sunucu Script'i"),
        ],
        0,
        t(
          "Typing in chat sets gameProcessed to true, so check it and return.",
          "Sohbete yazmak gameProcessed'i true yapar, kontrol et ve çık.",
        ),
      ),
      choice(
        t(
          "Which event fires when a key is released?",
          "Bir tuş bırakılınca hangi olay tetiklenir?",
        ),
        ["InputEnded", "InputBegan", "InputChanged", "TouchEnded"],
        0,
        t(
          "InputBegan on press, InputEnded on release.",
          "Basınca InputBegan, bırakınca InputEnded.",
        ),
      ),
    ],
  },

  "remote-functions": {
    emoji: "📞",
    takeaway: t(
      "InvokeServer asks and waits; OnServerInvoke = function(player, ...) answers.",
      "InvokeServer sorar ve bekler; OnServerInvoke = function(player, ...) cevaplar.",
    ),
    steps: [
      learn(
        t("A question, not a message", "Mesaj değil, soru"),
        t(
          "`InvokeServer` sends a question and waits. The server's `OnServerInvoke` function returns the answer.",
          "`InvokeServer` bir soru gönderir ve bekler. Sunucunun `OnServerInvoke` fonksiyonu cevabı döndürür.",
        ),
        {
          hook: t("A phone call 📞, not a text message", "Kısa mesaj değil, telefon görüşmesi 📞"),
        },
      ),
      fill(
        t("Answer the question on the server", "Soruyu sunucuda cevapla"),
        lua`
getPrice.___ = function(player, item)
    return PRICES[item]
end
`,
        ["OnServerInvoke", "OnServerEvent", "InvokeServer", "OnClientInvoke"],
        0,
        t(
          "OnServerInvoke is assigned a function that returns the answer.",
          "OnServerInvoke'a cevabı döndüren bir fonksiyon atanır.",
        ),
      ),
      choice(
        t(
          "What is the first parameter of OnServerInvoke?",
          "OnServerInvoke'un ilk parametresi nedir?",
        ),
        [
          t("The player who asked", "Soran oyuncu"),
          t("The item name", "Eşya adı"),
          t("The RemoteFunction itself", "RemoteFunction'ın kendisi"),
          t("Nothing", "Hiçbir şey"),
        ],
        0,
        t(
          "Roblox always adds the player first, just like OnServerEvent.",
          "Roblox oyuncuyu her zaman başa ekler, OnServerEvent'teki gibi.",
        ),
      ),
      learn(
        t("Event or Function?", "Event mi Function mı?"),
        t(
          "Use a RemoteEvent when nobody needs an answer. Use a RemoteFunction when the client needs data back.",
          "Kimse cevap beklemiyorsa RemoteEvent kullan. İstemci geri veri istiyorsa RemoteFunction kullan.",
        ),
      ),
      choice(
        t(
          "A Buy button only tells the server to buy a sword. Which fits?",
          "Bir Satın Al butonu sunucuya sadece kılıç almasını söylüyor. Hangisi uygun?",
        ),
        ["RemoteEvent", "RemoteFunction", "BindableEvent", "ModuleScript"],
        0,
        t(
          "No answer is needed, so a one-way RemoteEvent is enough.",
          "Cevap gerekmiyor, tek yönlü bir RemoteEvent yeterli.",
        ),
      ),
      choice(
        t("Why avoid InvokeClient on the server?", "Sunucuda neden InvokeClient'tan kaçınılır?"),
        [
          t(
            "A client might never answer, and the server would wait forever",
            "Bir istemci hiç cevap vermeyebilir ve sunucu sonsuza kadar bekler",
          ),
          t("It's slower than InvokeServer", "InvokeServer'dan yavaştır"),
          t("It only works in Studio", "Sadece Studio'da çalışır"),
          t("It can't send numbers", "Sayı gönderemez"),
        ],
        0,
        t("Never let the server wait on a client.", "Sunucuyu asla bir istemciye bekletme."),
      ),
    ],
  },

  bindables: {
    emoji: "🔔",
    takeaway: t(
      "Server to server: event:Fire(...) and event.Event:Connect(...).",
      "Sunucudan sunucuya: event:Fire(...) ve event.Event:Connect(...).",
    ),
    steps: [
      learn(
        t("Same-side messages", "Aynı taraf mesajları"),
        t(
          "A BindableEvent lets two server scripts talk: one calls `event:Fire(...)`, the other listens with `event.Event:Connect(...)`.",
          "Bir BindableEvent iki sunucu scriptinin konuşmasını sağlar: biri `event:Fire(...)` çağırır, diğeri `event.Event:Connect(...)` ile dinler.",
        ),
        {
          hook: t(
            "An intercom between rooms of one house 🏠",
            "Aynı evin odaları arasında dahili telefon 🏠",
          ),
        },
      ),
      predict(
        lua`
local ev = Instance.new("BindableEvent")
ev.Event:Connect(function(n)
    print(n * 2)
end)
ev:Fire(21)
`,
        ["42", "21", "nil", "2"],
        0,
        t(
          "Fire(21) runs the connected function with n = 21.",
          "Fire(21) bağlı fonksiyonu n = 21 ile çalıştırır.",
        ),
      ),
      fill(
        t("Listen for the round ending", "Turun bitişini dinle"),
        lua`
roundEnded.___:Connect(function(winner)
    print(winner)
end)
`,
        ["Event", "OnEvent", "Fired", "Signal"],
        0,
        t("You connect to the BindableEvent's Event.", "BindableEvent'in Event'ine bağlanırsın."),
      ),
      learn(
        t("BindableFunction", "BindableFunction"),
        t(
          "A BindableFunction returns an answer: set `OnInvoke = function(...)` and call `:Invoke(...)`.",
          "Bir BindableFunction cevap döndürür: `OnInvoke = function(...)` ayarla ve `:Invoke(...)` çağır.",
        ),
      ),
      predict(
        lua`
local bf = Instance.new("BindableFunction")
bf.OnInvoke = function(a, b)
    return a + b
end
print(bf:Invoke(2, 3))
`,
        ["5", "23", "nil", "2"],
        0,
        t(
          "Invoke runs OnInvoke and gives back what it returns.",
          "Invoke OnInvoke'u çalıştırır ve döndürdüğünü verir.",
        ),
      ),
      choice(
        t(
          "Server script to server script: which do you use?",
          "Sunucu scriptinden sunucu scriptine: hangisini kullanırsın?",
        ),
        ["BindableEvent", "RemoteEvent", "RemoteFunction", "ProximityPrompt"],
        0,
        t(
          "Remotes are for client ↔ server; bindables stay on one side.",
          "Remote'lar istemci ↔ sunucu içindir; bindable'lar tek tarafta kalır.",
        ),
      ),
    ],
  },

  "project-shop": {
    emoji: "🛒",
    takeaway: t(
      "The client names the item; the server checks the price, coins and ownership.",
      "İstemci eşyanın adını söyler; sunucu fiyatı, coinleri ve sahipliği kontrol eder.",
    ),
    steps: [
      learn(
        t("Who decides?", "Kim karar verir?"),
        t(
          "The client only says which item. The server checks the price and the coins, then gives the item.",
          "İstemci sadece hangi eşya olduğunu söyler. Sunucu fiyatı ve coinleri kontrol eder, sonra eşyayı verir.",
        ),
        {
          hook: t(
            "The client is the customer, the server is the cashier 🧾",
            "İstemci müşteri, sunucu kasiyer 🧾",
          ),
        },
      ),
      order(
        t("Order the server's checks", "Sunucunun kontrollerini sırala"),
        [
          "local price = PRICES[itemName]",
          "if not price then return end",
          "if coins.Value < price then return end",
          "coins.Value -= price",
        ],
        t(
          "Find the price, check it exists, check the coins, then take them.",
          "Fiyatı bul, var mı bak, coinleri kontrol et, sonra al.",
        ),
      ),
      choice(
        t(
          'A hacker fires BuyItem("Sword", 0) hoping to pay 0. What stops it?',
          'Bir hileci 0 ödemeyi umarak BuyItem("Sword", 0) tetikliyor. Onu ne durdurur?',
        ),
        [
          t(
            "The server ignores extra arguments and uses its own PRICES",
            "Sunucu fazla argümanları yok sayar ve kendi PRICES tablosunu kullanır",
          ),
          t("RemoteEvents can't send numbers", "RemoteEvent'ler sayı gönderemez"),
          t("The button is disabled", "Buton devre dışı"),
          t("Nothing can stop it", "Hiçbir şey durduramaz"),
        ],
        0,
        t(
          "Prices live on the server, so whatever the client sends doesn't matter.",
          "Fiyatlar sunucuda durur, istemcinin ne gönderdiği önemli değildir.",
        ),
      ),
      learn(
        t("Owning it only once", "Sadece bir kez sahip olmak"),
        t(
          "Before giving a tool, check `player.Backpack:FindFirstChild(itemName)` so nobody buys the same item twice.",
          "Bir tool vermeden önce `player.Backpack:FindFirstChild(itemName)` kontrol et, böylece kimse aynı eşyayı iki kez almasın.",
        ),
      ),
      fill(
        t("Stop a second purchase", "İkinci satın almayı durdur"),
        `if player.Backpack:___(itemName) then return end`,
        ["FindFirstChild", "WaitForChild", "Clone", "Destroy"],
        0,
        t(
          "FindFirstChild is nil when they don't own it yet.",
          "Henüz sahip değilse FindFirstChild nil'dir.",
        ),
      ),
      predict(
        lua`
local PRICES = { Sword = 100 }
local coins = 150
local function buy(item)
    local price = PRICES[item]
    if not price or coins < price then
        return false
    end
    coins -= price
    return true
end
print(buy("Sword"), buy("Sword"), coins)
`,
        ["true false 50", "true true -50", "false false 150", "true false 150"],
        0,
        t(
          "The first buy leaves 50 coins, so the second is refused.",
          "İlk alım 50 coin bırakır, bu yüzden ikincisi reddedilir.",
        ),
      ),
    ],
  },

  "project-tycoon": {
    emoji: "🏭",
    takeaway: t(
      "Droppers make ore, the collector pays for ore with a Value, cash buys more droppers.",
      "Damlatıcılar maden yapar, toplayıcı Value'su olan madene para öder, para daha çok damlatıcı alır.",
    ),
    steps: [
      learn(
        t("The tycoon loop", "Tycoon döngüsü"),
        t(
          "Droppers make ore, the collector turns ore into cash, and cash buys more droppers.",
          "Damlatıcılar maden yapar, toplayıcı madeni paraya çevirir ve para daha çok damlatıcı alır.",
        ),
        {
          hook: t(
            "Plant seeds 🌱, harvest, buy more seeds",
            "Tohum ek 🌱, hasat et, daha çok tohum al",
          ),
        },
      ),
      choice(
        t(
          "The dropper's while true loop has no task.wait. What happens?",
          "Damlatıcının while true döngüsünde task.wait yok. Ne olur?",
        ),
        [
          t("The server freezes (script timeout)", "Sunucu donar (script zaman aşımı)"),
          t("Ore drops very fast, but it's fine", "Maden çok hızlı düşer ama sorun olmaz"),
          t("Nothing drops", "Hiçbir şey düşmez"),
          t("Roblox adds a wait for you", "Roblox senin yerine bekleme ekler"),
        ],
        0,
        t(
          "A loop that never waits never lets anything else run.",
          "Hiç beklemeyen bir döngü başka hiçbir şeyin çalışmasına izin vermez.",
        ),
      ),
      fill(
        t("Read the ore's value", "Madenin değerini oku"),
        `local value = hit:___("Value")`,
        ["GetAttribute", "SetAttribute", "FindFirstChild", "GetChildren"],
        0,
        t(
          "The ore's value is stored as an attribute.",
          "Madenin değeri bir attribute olarak saklanır.",
        ),
      ),
      learn(
        t("Only ore pays", "Sadece maden kazandırır"),
        t(
          "Checking the Value attribute means feet and other parts touching the collector are ignored.",
          "Value attribute'unu kontrol etmek, toplayıcıya değen ayakların ve diğer parçaların yok sayılması demektir.",
        ),
      ),
      predict(
        lua`
local cash = 0
local ores = { 5, 5, 20 }
for _, value in ipairs(ores) do
    cash += value
end
print(cash)
`,
        ["30", "20", "10", "3"],
        0,
        t("5 + 5 + 20 = 30.", "5 + 5 + 20 = 30."),
      ),
      predict(
        lua`
local cash = 120
local price = 100
if cash >= price then
    cash -= price
end
print(cash)
`,
        ["20", "120", "100", "-80"],
        0,
        t(
          "There was enough cash, so the price was taken.",
          "Yeterli para vardı, bu yüzden fiyat düşüldü.",
        ),
      ),
    ],
  },

  pcall: {
    emoji: "🛟",
    takeaway: t(
      "local ok, result = pcall(fn): ok is false when fn errored, and result is the message.",
      "local ok, result = pcall(fn): fn hata verdiyse ok false'tur ve result mesajdır.",
    ),
    steps: [
      learn(
        t("Catching errors", "Hataları yakalamak"),
        t(
          "`pcall(fn)` runs fn safely. It returns true and the results, or false and the error message.",
          "`pcall(fn)` fn'i güvenle çalıştırır. true ve sonuçları ya da false ve hata mesajını döndürür.",
        ),
        { hook: t("A safety net under a tightrope 🎪", "İp cambazının altındaki güvenlik ağı 🎪") },
      ),
      predict(
        lua`
local ok, result = pcall(function()
    return 6 * 7
end)
print(ok, result)
`,
        ["true 42", "false 42", "42", "true nil"],
        0,
        t(
          "No error, so pcall gives true and the result.",
          "Hata yok, bu yüzden pcall true ve sonucu verir.",
        ),
      ),
      predict(
        lua`
local ok = pcall(function()
    error("nope")
end)
print(ok)
`,
        ["false", "true", "nope", "nil"],
        0,
        t(
          "The function errored, so the first value is false.",
          "Fonksiyon hata verdi, bu yüzden ilk değer false'tur.",
        ),
      ),
      learn(
        t("Only the risky part", "Sadece riskli kısım"),
        t(
          "Wrap just the call that can fail, like DataStores and web requests. A pcall around everything hides your own bugs.",
          "Sadece başarısız olabilecek çağrıyı sar, DataStore'lar ve web istekleri gibi. Her şeyin etrafındaki bir pcall kendi hatalarını saklar.",
        ),
      ),
      fill(
        t("Load safely", "Güvenle yükle"),
        lua`
local ok, data = ___(function()
    return store:GetAsync(key)
end)
`,
        ["pcall", "error", "assert", "print"],
        0,
        t(
          "pcall catches the error if the DataStore fails.",
          "DataStore başarısız olursa pcall hatayı yakalar.",
        ),
      ),
      choice(
        t("local data = pcall(fn) — what is data?", "local data = pcall(fn) — data nedir?"),
        [
          t("true or false, not the result", "Sonuç değil, true ya da false"),
          t("The result of fn", "fn'in sonucu"),
          t("The error message", "Hata mesajı"),
          t("Always nil", "Her zaman nil"),
        ],
        0,
        t(
          "The first value is the success flag. Use local ok, data = pcall(fn).",
          "İlk değer başarı bayrağıdır. local ok, data = pcall(fn) kullan.",
        ),
      ),
    ],
  },

  cframes: {
    emoji: "🧭",
    takeaway: t(
      "CFrame = position + direction. lookAt aims, Angles turns (radians), * moves in the part's own directions.",
      "CFrame = konum + yön. lookAt nişan alır, Angles döndürür (radyan), * parçanın kendi yönlerinde taşır.",
    ),
    steps: [
      learn(
        t("Position + direction", "Konum + yön"),
        t(
          "A CFrame is where a part is AND which way it faces. Setting `part.CFrame` moves and turns it at once.",
          "CFrame, bir parçanın nerede olduğu VE hangi yöne baktığıdır. `part.CFrame` ayarlamak onu aynı anda taşır ve döndürür.",
        ),
        { hook: t("A map pin with an arrow 📍", "Oklu bir harita iğnesi 📍") },
      ),
      predict(
        lua`
local cf = CFrame.new(1, 2, 3)
print(cf.Y)
`,
        ["2", "1", "3", "6"],
        0,
        t("CFrame.new(x, y, z): Y is the second number.", "CFrame.new(x, y, z): Y ikinci sayıdır."),
      ),
      fill(
        t("Aim the turret at the target", "Kuleyi hedefe çevir"),
        `turret.CFrame = CFrame.___(turret.Position, target.Position)`,
        ["lookAt", "Angles", "new", "fromAxisAngle"],
        0,
        t("lookAt(from, to) faces from → to.", "lookAt(nereden, nereye) nereden → nereye bakar."),
      ),
      learn(
        t("Radians", "Radyan"),
        t(
          "`CFrame.Angles(x, y, z)` turns using radians. `math.rad(90)` converts 90 degrees into radians.",
          "`CFrame.Angles(x, y, z)` radyan kullanarak döndürür. `math.rad(90)` 90 dereceyi radyana çevirir.",
        ),
      ),
      predict(
        lua`
local cf = CFrame.new(0, 5, 0) + Vector3.new(0, 3, 0)
print(cf.Y)
`,
        ["8", "5", "3", "0"],
        0,
        t(
          "Adding a Vector3 moves the CFrame up by 3.",
          "Bir Vector3 eklemek CFrame'i 3 yukarı taşır.",
        ),
      ),
      choice(
        t(
          "part.Position = CFrame.new(0, 10, 0) errors. What's the fix?",
          "part.Position = CFrame.new(0, 10, 0) hata veriyor. Düzeltmesi ne?",
        ),
        [
          "part.CFrame = CFrame.new(0, 10, 0)",
          "part.Position = CFrame.Angles(0, 10, 0)",
          "part.Size = CFrame.new(0, 10, 0)",
          "part.CFrame = Vector3.new(0, 10, 0)",
        ],
        0,
        t(
          "A CFrame goes into .CFrame; .Position takes a Vector3.",
          "CFrame .CFrame'e gider; .Position Vector3 alır.",
        ),
      ),
      predict(
        `print(math.floor(math.deg(math.pi)))`,
        ["180", "90", "360", "3"],
        0,
        t("π radians is half a turn: 180 degrees.", "π radyan yarım turdur: 180 derece."),
      ),
    ],
  },
};
