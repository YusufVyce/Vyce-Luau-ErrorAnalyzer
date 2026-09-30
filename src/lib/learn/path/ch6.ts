import { choice, fill, learn, lua, order, predict, t, type PathLesson } from "./types";

export const CH6: Record<string, PathLesson> = {
  "collection-service": {
    emoji: "🏷️",
    takeaway: t(
      "Tag it, then loop over GetTagged(tag). One script rules them all.",
      "Etiketle, sonra GetTagged(etiket) üzerinde döngü kur. Tek script hepsini yönetir.",
    ),
    steps: [
      learn(
        t("Tags instead of copies", "Kopya yerine etiket"),
        t(
          "Give 200 parts the tag KillBrick and ONE script can control them all. Fix a bug once and every part is fixed.",
          "200 parçaya KillBrick etiketini ver, TEK bir script hepsini yönetsin. Hatayı bir kez düzelt, bütün parçalar düzelsin.",
        ),
        {
          hook: t(
            'Name tags at a party 🏷️: shout "everyone tagged KillBrick!" and they all answer.',
            'Partideki isim kartları 🏷️: "KillBrick etiketliler!" diye seslen, hepsi cevap versin.',
          ),
        },
      ),
      fill(
        t("Find every tagged part", "Etiketli bütün parçaları bul"),
        lua`
for _, part in CollectionService:___("KillBrick") do
	print(part.Name)
end
`,
        ["GetTagged", "GetTag", "FindTagged", "GetChildren"],
        0,
        t(
          "GetTagged returns a list of every object with that tag.",
          "GetTagged o etikete sahip her nesnenin listesini döndürür.",
        ),
      ),
      learn(
        t("Tagging from code", "Koddan etiketlemek"),
        t(
          '`CollectionService:AddTag(part, "Coin")` adds a tag. `HasTag` checks one. Tags are plain text, so spell them carefully.',
          '`CollectionService:AddTag(part, "Coin")` etiket ekler. `HasTag` kontrol eder. Etiketler düz metindir, dikkatli yaz.',
        ),
      ),
      predict(
        lua`
local CollectionService = game:GetService("CollectionService")
local a = Instance.new("Part")
local b = Instance.new("Part")
a.Parent = workspace
b.Parent = workspace
CollectionService:AddTag(a, "Coin")
CollectionService:AddTag(b, "Coin")
print(#CollectionService:GetTagged("Coin"))
`,
        ["2", "1", "0", "Coin"],
        0,
        t(
          "Two parts got the Coin tag, and # counts the list.",
          "İki parça Coin etiketi aldı, # da listeyi sayar.",
        ),
      ),
      choice(
        t(
          'local bricks = CollectionService:GetTagged("KillBrick") then bricks.Touched errors. Why?',
          'local bricks = CollectionService:GetTagged("KillBrick") sonra bricks.Touched hata veriyor. Neden?',
        ),
        [
          t(
            "GetTagged returns a list: loop over it",
            "GetTagged bir liste döndürür: üzerinde döngü kur",
          ),
          t("Tagged parts can't be touched", "Etiketli parçalara dokunulamaz"),
          t("It needs WaitForChild", "WaitForChild gerekiyor"),
          t("Touched only works on the client", "Touched sadece istemcide çalışır"),
        ],
        0,
        t(
          "A list has no Touched event. Each part in it does.",
          "Bir listenin Touched olayı yoktur. İçindeki her parçanın vardır.",
        ),
      ),
      choice(
        t(
          'You tagged parts "Killbrick" but the script looks for "KillBrick". What happens?',
          'Parçaları "Killbrick" diye etiketledin ama script "KillBrick" arıyor. Ne olur?',
        ),
        [
          t("Nothing is found, and there's no error", "Hiçbir şey bulunmaz ve hata da çıkmaz"),
          t("A red error in Output", "Output'ta kırmızı bir hata"),
          t("It works the same", "Aynı şekilde çalışır"),
          t("The parts get deleted", "Parçalar silinir"),
        ],
        0,
        t(
          "A wrong tag is silent: GetTagged just returns an empty list.",
          "Yanlış etiket sessizdir: GetTagged boş bir liste döndürür.",
        ),
      ),
    ],
  },

  runservice: {
    emoji: "⏱️",
    takeaway: t(
      "Heartbeat runs every frame. Multiply speeds by dt. Never task.wait() inside it.",
      "Heartbeat her karede çalışır. Hızı dt ile çarp. İçine asla task.wait() koyma.",
    ),
    steps: [
      learn(
        t("Heartbeat = every frame", "Heartbeat = her kare"),
        t(
          "`RunService.Heartbeat` fires about 60 times a second and gives you `dt`: the seconds since the last frame.",
          "`RunService.Heartbeat` saniyede yaklaşık 60 kez tetiklenir ve `dt` verir: son kareden beri geçen saniye.",
        ),
        {
          hook: t(
            "A heartbeat 💓: steady, all the time, while the game runs.",
            "Kalp atışı gibi 💓: oyun çalıştıkça hep, düzenli.",
          ),
        },
      ),
      learn(
        t("Speed × dt", "Hız × dt"),
        t(
          "Move by `speed * dt` each frame. On a fast PC or a slow phone, the speed per second is the same.",
          "Her karede `hız * dt` kadar hareket et. Hızlı PC'de de yavaş telefonda da saniyedeki hız aynı olur.",
        ),
        {
          code: lua`
RunService.Heartbeat:Connect(function(dt)
	part.CFrame = part.CFrame * CFrame.Angles(0, math.rad(90 * dt), 0)
end)
`,
        },
      ),
      predict(
        lua`
local speed = 90
local dt = 0.5
print(speed * dt)
`,
        ["45", "90", "180", "0.5"],
        0,
        t("Half a second at 90 per second = 45.", "Saniyede 90 hızla yarım saniye = 45."),
      ),
      fill(
        t("Get the frame time", "Kare süresini al"),
        lua`
RunService.Heartbeat:Connect(function(___)
	print(dt)
end)
`,
        ["dt", "wait", "frame", "self"],
        0,
        t(
          "The parameter name must match what you use inside: dt.",
          "Parametre adı içeride kullandığınla aynı olmalı: dt.",
        ),
      ),
      choice(
        t(
          "What must NEVER go inside a Heartbeat function?",
          "Heartbeat fonksiyonunun içine ASLA ne konmaz?",
        ),
        ["task.wait()", "math.rad()", "part.CFrame", t("a comment", "bir yorum")],
        0,
        t(
          "Heartbeat already runs every frame. Waiting inside it piles up threads.",
          "Heartbeat zaten her karede çalışır. İçinde beklemek iş parçacıklarını yığar.",
        ),
      ),
      predict(
        lua`
local elapsed = 0
for frame = 1, 60 do
	elapsed += 1 / 60
end
print(math.round(elapsed))
`,
        ["1", "60", "0", "3600"],
        0,
        t("60 frames × 1/60 second each ≈ 1 second.", "60 kare × 1/60 saniye ≈ 1 saniye."),
      ),
    ],
  },

  raycasting: {
    emoji: "🔦",
    takeaway: t(
      "workspace:Raycast(origin, direction) → a result or nil. Check for nil first!",
      "workspace:Raycast(başlangıç, yön) → sonuç ya da nil. Önce nil kontrolü!",
    ),
    steps: [
      learn(
        t("A ray is a laser", "Ray bir lazerdir"),
        t(
          "`workspace:Raycast(origin, direction)` shoots an invisible line. It returns what it hit, or nil.",
          "`workspace:Raycast(origin, direction)` görünmez bir çizgi atar. Neye çarptığını ya da nil döndürür.",
        ),
        {
          hook: t(
            "A laser pointer 🔦: where does the dot land?",
            "Lazer işaretçi 🔦: nokta nereye düşüyor?",
          ),
        },
      ),
      choice(
        t(
          "Which direction shoots 100 studs straight down?",
          "Hangi yön 100 stud dümdüz aşağı atar?",
        ),
        [
          "Vector3.new(0, -100, 0)",
          "Vector3.new(0, 100, 0)",
          "Vector3.new(100, 0, 0)",
          "Vector3.new(0, 0, -100)",
        ],
        0,
        t(
          "Y is up and down, and negative Y points down.",
          "Y yukarı-aşağıdır; negatif Y aşağıyı gösterir.",
        ),
      ),
      learn(
        t("Always check for nil", "Her zaman nil kontrolü"),
        t(
          "A ray that misses returns nil. Write `if result then` before you read `result.Instance` or `result.Position`.",
          "Iskalayan ray nil döndürür. `result.Instance` ya da `result.Position` okumadan önce `if result then` yaz.",
        ),
      ),
      fill(
        t("Make it safe", "Güvenli hale getir"),
        lua`
local result = workspace:Raycast(Vector3.new(0, 50, 0), Vector3.new(0, -100, 0))
___ result then
	print(result.Instance.Name)
end
`,
        ["if", "while", "for", "when"],
        0,
        t(
          "if result then only reads it when something was hit.",
          "if result then, sadece bir şeye çarptıysa okur.",
        ),
      ),
      predict(
        lua`
local result = workspace:Raycast(Vector3.new(0, 50, 0), Vector3.new(0, 10, 0))
print(result)
`,
        ["nil", "Baseplate", "SpawnLocation", "0"],
        0,
        t(
          "The ray points UP into empty sky, so it hits nothing.",
          "Ray YUKARI, boş gökyüzüne bakıyor; hiçbir şeye çarpmaz.",
        ),
      ),
      learn(
        t("Ignore things with RaycastParams", "RaycastParams ile yok say"),
        t(
          "RaycastParams with `FilterType = Exclude` makes a ray pass through things, like the shooter's own character.",
          "`FilterType = Exclude` olan RaycastParams, ray'in bazı şeylerin içinden geçmesini sağlar; örneğin ateş edenin kendi karakteri.",
        ),
      ),
      choice(
        t("Which one is NOT inside a RaycastResult?", "Hangisi RaycastResult'ın içinde YOK?"),
        ["Instance", "Position", "Distance", "Speed"],
        3,
        t(
          "A result has Instance, Position, Normal and Distance. No Speed.",
          "Sonuçta Instance, Position, Normal ve Distance var. Speed yok.",
        ),
      ),
    ],
  },

  oop: {
    emoji: "🍪",
    takeaway: t(
      "Class table + __index + setmetatable. Methods: define with a colon, call with a colon.",
      "Sınıf tablosu + __index + setmetatable. Metotlar: iki nokta ile tanımla, iki nokta ile çağır.",
    ),
    steps: [
      learn(
        t("A class is a blueprint", "Sınıf bir kalıptır"),
        t(
          "Each object made from a class has its own data (name, level) but shares the same functions (methods).",
          "Bir sınıftan yapılan her nesnenin kendi verisi (isim, seviye) olur ama aynı fonksiyonları (metotları) paylaşırlar.",
        ),
        {
          hook: t(
            "A cookie cutter 🍪: one shape, many cookies, each with its own sprinkles.",
            "Kurabiye kalıbı 🍪: tek şekil, bir sürü kurabiye, her birinin kendi süsü.",
          ),
        },
      ),
      learn(
        t("The magic lines", "Sihirli satırlar"),
        t(
          "`Pet.__index = Pet` lets objects find missing keys (the methods) in Pet. `setmetatable({}, Pet)` links a new object to the class.",
          "`Pet.__index = Pet`, nesnelerin eksik anahtarları (metotları) Pet'te bulmasını sağlar. `setmetatable({}, Pet)` yeni nesneyi sınıfa bağlar.",
        ),
        {
          code: lua`
local Pet = {}
Pet.__index = Pet

function Pet.new(name)
	local self = setmetatable({}, Pet)
	self.Name = name
	return self
end
`,
        },
      ),
      fill(
        t("Let objects find their methods", "Nesneler metotlarını bulabilsin"),
        lua`
local Pet = {}
Pet.___ = Pet
`,
        ["__index", "__class", "index", "self"],
        0,
        t(
          "__index is where Luau looks when a key is missing.",
          "__index, bir anahtar eksik olunca Luau'nun baktığı yerdir.",
        ),
      ),
      learn(
        t("The colon passes self", "İki nokta self'i geçirir"),
        t(
          "`dog:LevelUp()` means `Pet.LevelUp(dog)`: the colon passes the object in as `self`.",
          "`dog:LevelUp()`, `Pet.LevelUp(dog)` demektir: iki nokta nesneyi `self` olarak içeri geçirir.",
        ),
      ),
      predict(
        lua`
local Pet = {}
Pet.__index = Pet

function Pet.new(name)
	local self = setmetatable({}, Pet)
	self.Name = name
	self.Level = 1
	return self
end

function Pet:LevelUp()
	self.Level += 1
end

local dog = Pet.new("Dog")
dog:LevelUp()
dog:LevelUp()
print(dog.Name, dog.Level)
`,
        ["Dog 3", "Dog 1", "Dog 2", "Pet 3"],
        0,
        t(
          "It starts at level 1 and levels up twice.",
          "Seviye 1'den başlar ve iki kez seviye atlar.",
        ),
      ),
      choice(
        t(
          "dog.LevelUp() (with a dot) errors: self is nil. The fix?",
          "dog.LevelUp() (noktayla) hata veriyor: self nil. Çözüm?",
        ),
        ["dog:LevelUp()", "Pet.LevelUp()", "dog.LevelUp(nil)", "dog::LevelUp()"],
        0,
        t("The colon passes dog in as self.", "İki nokta dog'u self olarak geçirir."),
      ),
    ],
  },

  tools: {
    emoji: "🗡️",
    takeaway: t(
      "Tool + Handle in StarterPack. Activated = click. Damage happens on the server.",
      "StarterPack'te Tool + Handle. Activated = tıklama. Hasar sunucuda verilir.",
    ),
    steps: [
      learn(
        t("Tools are items you hold", "Tool'lar elde tutulan eşyalardır"),
        t(
          "A Tool in StarterPack is copied into every player's Backpack. The part named `Handle` is what the hand holds.",
          "StarterPack'teki bir Tool her oyuncunun Backpack'ine kopyalanır. `Handle` adlı parça elde tutulan kısımdır.",
        ),
        {
          hook: t(
            "StarterPack is the starter kit 🎒 every player gets at spawn.",
            "StarterPack, her oyuncunun doğunca aldığı başlangıç çantasıdır 🎒",
          ),
        },
      ),
      choice(
        t("What must the part you hold be named?", "Elde tutulan parçanın adı ne olmalı?"),
        ["Handle", "Grip", "Main", "Part"],
        0,
        t("The character grabs the part named Handle.", "Karakter, Handle adlı parçayı tutar."),
      ),
      learn(
        t("Activated = click", "Activated = tıklama"),
        t(
          "`tool.Activated` fires when the player clicks while holding the tool. While it's held, `tool.Parent` is the character.",
          "`tool.Activated`, oyuncu tool elindeyken tıklayınca tetiklenir. Elde tutulurken `tool.Parent` karakterdir.",
        ),
      ),
      fill(
        t("Swing when the player clicks", "Oyuncu tıklayınca savur"),
        lua`
local tool = script.Parent
tool.___:Connect(function()
	print("Swing!")
end)
`,
        ["Activated", "Clicked", "Triggered", "Touched"],
        0,
        t(
          "Tools use Activated. Triggered is for ProximityPrompts.",
          "Tool'lar Activated kullanır. Triggered ProximityPrompt'lar içindir.",
        ),
      ),
      predict(
        lua`
local health = 60
local maxHealth = 100
health = math.min(maxHealth, health + 25)
print(health)
health = math.min(maxHealth, health + 25)
print(health)
`,
        ["85\n100", "85\n110", "60\n85", "100\n100"],
        0,
        t(
          "math.min stops the potion at MaxHealth: 110 becomes 100.",
          "math.min iksiri MaxHealth'te durdurur: 110, 100 olur.",
        ),
      ),
      choice(
        t(
          "Why check hit.Parent ~= tool.Parent in a sword?",
          "Kılıçta neden hit.Parent ~= tool.Parent kontrol edilir?",
        ),
        [
          t("So you don't hit yourself", "Kendine vurmamak için"),
          t("To make it faster", "Hızlandırmak için"),
          t("To find the Handle", "Handle'ı bulmak için"),
          t("Roblox requires it", "Roblox zorunlu tutar"),
        ],
        0,
        t(
          "tool.Parent is the character holding it: the owner.",
          "tool.Parent onu tutan karakterdir: yani sahibi.",
        ),
      ),
    ],
  },

  "round-system": {
    emoji: "🚦",
    takeaway: t(
      "The server runs the loop, a StringValue shares it, the UI listens with .Changed.",
      "Döngüyü sunucu çalıştırır, StringValue paylaşır, arayüz .Changed ile dinler.",
    ),
    steps: [
      learn(
        t("Games run in states", "Oyunlar durumlarla ilerler"),
        t(
          "Waiting → Intermission → Round → Results → repeat. A timer moves the game from one state to the next.",
          "Bekleme → Ara → Tur → Sonuçlar → tekrar. Bir zamanlayıcı oyunu bir durumdan diğerine geçirir.",
        ),
        {
          hook: t(
            "A traffic light 🚦: always in exactly one state, and a timer switches it.",
            "Trafik ışığı 🚦: her an tek bir durumda, bir zamanlayıcı değiştirir.",
          ),
        },
      ),
      order(
        t("Put one round in order", "Bir turu sıraya koy"),
        [
          'countdown("Intermission:", 10)',
          'countdown("Round ends in", 30)',
          'status.Value = "Round over!"',
          "task.wait(3)",
        ],
        t(
          "Lobby countdown, the round itself, the result, then a short pause.",
          "Lobi geri sayımı, turun kendisi, sonuç ve kısa bir mola.",
        ),
      ),
      learn(
        t("One source of truth", "Tek doğru kaynağı"),
        t(
          "The server keeps the state in a StringValue in ReplicatedStorage. Every player's UI just shows it, using `.Changed`.",
          "Sunucu durumu ReplicatedStorage'daki bir StringValue'da tutar. Her oyuncunun arayüzü `.Changed` ile onu gösterir.",
        ),
      ),
      predict(
        lua`
local function countdown(label, seconds)
	for t = seconds, 1, -1 do
		print(label .. " " .. t)
	end
end
countdown("Round ends in", 3)
`,
        [
          "Round ends in 3\nRound ends in 2\nRound ends in 1",
          "Round ends in 1\nRound ends in 2\nRound ends in 3",
          "Round ends in 3",
          "Round ends in 0",
        ],
        0,
        t("The loop counts down from 3 to 1.", "Döngü 3'ten 1'e geri sayar."),
      ),
      fill(
        t("Update the label when the status changes", "Durum değişince yazıyı güncelle"),
        lua`
status.___:Connect(function(value)
	label.Text = value
end)
`,
        ["Changed", "Touched", "Updated", "OnChange"],
        0,
        t(
          "A value object's Changed event gives you the new value.",
          "Bir değer nesnesinin Changed olayı yeni değeri verir.",
        ),
      ),
      choice(
        t(
          "In a while true round loop with 0 players, you should…",
          "0 oyuncu varken while true tur döngüsünde ne yapmalısın?",
        ),
        [
          t(
            "still task.wait(): every path needs a wait",
            "yine task.wait(): her yolda bekleme olmalı",
          ),
          t("skip waiting to save time", "zaman kazanmak için beklemeyi atla"),
          t("stop the whole server", "bütün sunucuyu durdur"),
          t("call error()", "error() çağır"),
        ],
        0,
        t(
          "A path with no wait spins forever and times out.",
          "Beklemesiz bir yol sonsuza kadar döner ve zaman aşımına uğrar.",
        ),
      ),
    ],
  },
};
