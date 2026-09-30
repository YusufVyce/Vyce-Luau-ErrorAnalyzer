import { choice, fill, learn, lua, predict, t, type PathLesson } from "./types";

/** Chapters 4 (multiplayer & saving) and 5 (build a game). */
export const CH4: Record<string, PathLesson> = {
  "remote-events": {
    emoji: "📡",
    takeaway: t(
      "Client: FireServer(what I want). Server: OnServerEvent(player, …) checks everything.",
      "İstemci: FireServer(ne istiyorum). Sunucu: OnServerEvent(player, …) her şeyi kontrol eder.",
    ),
    steps: [
      learn(
        t("The client asks, the server decides", "İstemci ister, sunucu karar verir"),
        t(
          "A RemoteEvent is a walkie-talkie between a player's device and the server. The client sends with `FireServer`, the server listens with `OnServerEvent`.",
          "RemoteEvent, oyuncunun cihazı ile sunucu arasında bir telsizdir. İstemci `FireServer` ile gönderir, sunucu `OnServerEvent` ile dinler.",
        ),
        {
          visual: "remote",
          hook: t(
            "The client orders 🍔, the server is the kitchen: it checks the money before cooking.",
            "İstemci sipariş verir 🍔, sunucu mutfaktır: pişirmeden önce parayı kontrol eder.",
          ),
        },
      ),
      choice(
        t("Which side calls FireServer?", "FireServer'ı hangi taraf çağırır?"),
        [
          t("The client (a LocalScript)", "İstemci (bir LocalScript)"),
          t("The server (a Script)", "Sunucu (bir Script)"),
          t("Both of them", "İkisi de"),
          "ModuleScript",
        ],
        0,
        t(
          "FireServer = send TO the server, so the client calls it.",
          "FireServer = sunucuya gönder; yani onu istemci çağırır.",
        ),
      ),
      learn(
        t("The player comes first", "Önce oyuncu gelir"),
        t(
          "On the server, the first parameter is ALWAYS the player who fired. Roblox adds it for you, so it can't be faked.",
          "Sunucuda ilk parametre HER ZAMAN olayı gönderen oyuncudur. Roblox onu kendisi ekler, sahtesi yapılamaz.",
        ),
      ),
      fill(
        t("Receive the request on the server", "İsteği sunucuda al"),
        lua`
buyItem.OnServerEvent:Connect(function(___, itemName)
	print(itemName)
end)
`,
        ["player", "itemName", "self", "client"],
        0,
        t(
          "First the player, then whatever the client sent.",
          "Önce oyuncu, sonra istemcinin gönderdikleri.",
        ),
      ),
      learn(
        t("Never trust the client", "İstemciye asla güvenme"),
        t(
          'Send what the player WANTS ("buy Sword"), never the numbers ("give me 999 coins"). The server checks prices and coins itself.',
          'Oyuncunun ne İSTEDİĞİNİ gönder ("Sword al"), asla sayıları değil ("bana 999 coin ver"). Fiyatı ve parayı sunucu kendisi kontrol eder.',
        ),
      ),
      choice(
        t("Which request is safe to send?", "Hangi isteği göndermek güvenli?"),
        [
          'remote:FireServer("Sword")',
          "remote:FireServer(9999) -- coins to add",
          'remote:FireServer("setDamage", 1000)',
          'remote:FireServer("setWins", 50)',
        ],
        0,
        t(
          "Only the wish (which item). The server decides the price, the damage and the wins.",
          "Sadece istek (hangi eşya). Fiyata, hasara ve galibiyete sunucu karar verir.",
        ),
      ),
      choice(
        t(
          "The server wants to tell ONE player something. It uses…",
          "Sunucu TEK bir oyuncuya bir şey söylemek istiyor. Ne kullanır?",
        ),
        [
          "remote:FireClient(player, ...)",
          "remote:FireServer(...)",
          "print(...)",
          "remote:Invoke(...)",
        ],
        0,
        t(
          "FireClient(player, …) sends to one player. FireAllClients sends to everyone.",
          "FireClient(player, …) tek oyuncuya gönderir. FireAllClients herkese.",
        ),
      ),
    ],
  },

  datastores: {
    emoji: "💾",
    takeaway: t(
      "GetAsync loads, SetAsync saves. Wrap both in pcall. A new player gives nil → use or 0.",
      "GetAsync yükler, SetAsync kaydeder. İkisini de pcall'a sar. Yeni oyuncu nil verir → or 0 kullan.",
    ),
    steps: [
      learn(
        t("Saving between visits", "Ziyaretler arası kayıt"),
        t(
          "Leaderstats reset when a player leaves. A DataStore keeps values on Roblox's servers: `SetAsync` saves, `GetAsync` loads.",
          "Oyuncu çıkınca leaderstats sıfırlanır. DataStore değerleri Roblox'un sunucularında tutar: `SetAsync` kaydeder, `GetAsync` yükler.",
        ),
        {
          visual: "datastore",
          hook: t(
            "A save file 💾 in the cloud, named after the player's UserId.",
            "Bulutta, adı oyuncunun UserId'si olan bir kayıt dosyası 💾",
          ),
        },
      ),
      fill(
        t("Load the saved coins", "Kayıtlı coinleri yükle"),
        'local saved = store:___("Player_" .. player.UserId)',
        ["GetAsync", "SetAsync", "Load", "Get"],
        0,
        t("GetAsync reads, SetAsync writes.", "GetAsync okur, SetAsync yazar."),
      ),
      learn(
        t("New players have nothing", "Yeni oyuncunun kaydı yok"),
        t(
          "GetAsync returns nil for a brand-new player. `saved or 0` turns that nil into 0.",
          "GetAsync yepyeni bir oyuncu için nil döndürür. `saved or 0` o nil'i 0'a çevirir.",
        ),
      ),
      predict(
        lua`
local saved = nil
local coins = saved or 0
print(coins)
`,
        ["0", "nil", "saved", t("an error", "hata")],
        0,
        t(
          "or picks the right side when the left side is nil.",
          "Sol taraf nil ise or sağ tarafı seçer.",
        ),
      ),
      learn(
        t("pcall is a safety net", "pcall bir güvenlik ağıdır"),
        t(
          "Saving talks to the internet and can fail. `pcall` catches the error so your script keeps running.",
          "Kaydetmek internetle konuşur ve başarısız olabilir. `pcall` hatayı yakalar, scriptin çalışmaya devam eder.",
        ),
        {
          hook: t(
            "A trapeze net 🤸: if someone falls, the show goes on.",
            "Trapez ağı gibi 🤸: biri düşse de gösteri devam eder.",
          ),
        },
      ),
      predict(
        lua`
local ok, err = pcall(function()
	error("Server busy")
end)
print(ok)
`,
        ["false", "true", "Server busy", "nil"],
        0,
        t(
          "The function errored, so pcall returns false (and the message in err).",
          "Fonksiyon hata verdi, pcall false döndürür (mesaj err'de).",
        ),
      ),
      choice(
        t("When should you save?", "Ne zaman kaydetmelisin?"),
        [
          t(
            "When the player leaves (and when the server closes)",
            "Oyuncu çıkınca (ve sunucu kapanınca)",
          ),
          t("Every frame", "Her karede"),
          t("Only when they join", "Sadece girince"),
          t("Never, Roblox saves by itself", "Hiç, Roblox kendisi kaydeder"),
        ],
        0,
        t(
          "PlayerRemoving + BindToClose cover leaving and shutdowns.",
          "PlayerRemoving + BindToClose çıkışı ve kapanmayı karşılar.",
        ),
      ),
    ],
  },

  modules: {
    emoji: "🧰",
    takeaway: t(
      "A module is a shared toolbox. It returns a table; require() hands it to you.",
      "Modül ortak bir alet çantasıdır. Bir tablo döndürür; require() onu sana verir.",
    ),
    steps: [
      learn(
        t("One place for shared code", "Ortak kod için tek yer"),
        t(
          "A ModuleScript holds a table of data and functions. Other scripts get it with `require()`.",
          "ModuleScript veri ve fonksiyonlardan oluşan bir tablo tutar. Diğer scriptler onu `require()` ile alır.",
        ),
        {
          visual: "module",
          hook: t(
            "A shared toolbox 🧰: build the tools once, every script borrows them.",
            "Ortak alet çantası 🧰: aletleri bir kez yap, her script ödünç alsın.",
          ),
        },
      ),
      learn(
        t("return is the key", "Anahtar return"),
        t(
          "Whatever the module returns is what require gives you. Almost always: `return ModuleName` on the last line.",
          "Modül ne döndürürse require sana onu verir. Neredeyse hep: son satırda `return ModülAdı`.",
        ),
        {
          code: lua`
local Config = {}
Config.MaxHealth = 150
return Config
`,
        },
      ),
      fill(
        t("Finish the module", "Modülü bitir"),
        lua`
local PetConfig = {}
PetConfig.Speed = 20
___ PetConfig
`,
        ["return", "print", "export", "require"],
        0,
        t(
          "Without return, require gets nothing and errors.",
          "return olmadan require bir şey alamaz ve hata verir.",
        ),
      ),
      predict(
        lua`
local Config = {}
Config.Pets = { Dog = 1.5, Dragon = 10 }
function Config.multiplier(name)
	return Config.Pets[name] or 1
end
print(Config.multiplier("Dragon"))
print(Config.multiplier("Rock"))
`,
        ["10\n1", "10\nnil", "1.5\n1", "Dragon\nRock"],
        0,
        t(
          "Rock isn't in the table, so or 1 kicks in.",
          "Rock tabloda yok, bu yüzden or 1 devreye girer.",
        ),
      ),
      choice(
        t("How does a Script load a ModuleScript?", "Bir Script, ModuleScript'i nasıl yükler?"),
        ["require(module)", "module:Run()", "import module", "module.Parent = script"],
        0,
        t(
          "require runs the module once and gives you what it returned.",
          "require modülü bir kez çalıştırır ve döndürdüğünü sana verir.",
        ),
      ),
      choice(
        t(
          "Secret, server-only logic should live in…",
          "Gizli, sadece sunucuya ait kod nerede durmalı?",
        ),
        [
          t("ServerScriptService or ServerStorage", "ServerScriptService ya da ServerStorage"),
          "ReplicatedStorage",
          "StarterGui",
          "StarterPack",
        ],
        0,
        t(
          "Players' devices can see ReplicatedStorage. They can't see server storage.",
          "Oyuncu cihazları ReplicatedStorage'ı görebilir, sunucu tarafını göremez.",
        ),
      ),
    ],
  },

  "project-obby": {
    emoji: "🏁",
    takeaway: t(
      "Kill bricks + checkpoints + coins + a finish line = a real game. Test with 2 players.",
      "Öldüren bloklar + checkpoint'ler + coinler + bitiş çizgisi = gerçek bir oyun. 2 oyuncuyla test et.",
    ),
    steps: [
      learn(
        t("Plan the game", "Oyunu planla"),
        t(
          "An obby is 4 small systems: kill bricks, checkpoints, coins and a finish line. You already know every piece!",
          "Bir obby 4 küçük sistemdir: öldüren bloklar, checkpoint'ler, coinler ve bitiş çizgisi. Her parçasını zaten biliyorsun!",
        ),
        {
          visual: "obby",
          hook: t(
            "Big games are small scripts stacked like LEGO 🧱",
            "Büyük oyunlar, LEGO gibi üst üste dizilmiş küçük scriptlerdir 🧱",
          ),
        },
      ),
      choice(
        t(
          "What lets ONE script control every kill brick?",
          "TEK bir scriptin bütün öldüren blokları yönetmesini ne sağlar?",
        ),
        [
          t("Tags with CollectionService", "CollectionService ile etiketler"),
          t("A copy of the script in every part", "Her parçada scriptin bir kopyası"),
          t("A LocalScript", "Bir LocalScript"),
          t("Anchoring them", "Onları Anchored yapmak"),
        ],
        0,
        t(
          "Tag every deadly part KillBrick and loop over GetTagged.",
          "Her tehlikeli parçayı KillBrick diye etiketle ve GetTagged üzerinde döngü kur.",
        ),
      ),
      learn(
        t("Checkpoints", "Checkpoint'ler"),
        t(
          "When a player touches a checkpoint, set `player.RespawnLocation = checkpoint`. They'll come back there after dying.",
          "Oyuncu bir checkpoint'e dokununca `player.RespawnLocation = checkpoint` yap. Ölünce oradan doğar.",
        ),
      ),
      fill(
        t("Save the checkpoint", "Checkpoint'i kaydet"),
        lua`
checkpoint.Touched:Connect(function(hit)
	local player = game.Players:GetPlayerFromCharacter(hit.Parent)
	if player then
		player.___ = checkpoint
	end
end)
`,
        ["RespawnLocation", "Checkpoint", "SpawnPoint", "Position"],
        0,
        t(
          "RespawnLocation is the SpawnLocation a player respawns at.",
          "RespawnLocation, oyuncunun yeniden doğduğu SpawnLocation'dır.",
        ),
      ),
      learn(
        t("The finish line counts once", "Bitiş çizgisi bir kez sayar"),
        t(
          "Touching the finish fires many times. A cooldown makes sure one run gives exactly one win.",
          "Bitişe dokunmak defalarca tetiklenir. Bir cooldown, her koşunun tam bir galibiyet vermesini sağlar.",
        ),
      ),
      predict(
        lua`
local wins = 0
local cooldown = false
local function finish()
	if cooldown then return end
	cooldown = true
	wins += 1
end
finish()
finish()
finish()
print(wins)
`,
        ["1", "3", "0", "2"],
        0,
        t(
          "After the first call, cooldown is true, so the next calls return early.",
          "İlk çağrıdan sonra cooldown true olur, sonrakiler erkenden döner.",
        ),
      ),
      choice(
        t("Best way to test it with 2 players?", "2 oyuncuyla test etmenin en iyi yolu?"),
        [
          t(
            "Test tab → Clients and Servers → 2 Players",
            "Test sekmesi → Clients and Servers → 2 Players",
          ),
          t("Publish and hope", "Yayınla ve umut et"),
          t("Press Play twice", "Play'e iki kez bas"),
          t("Ask a friend to guess", "Bir arkadaşına tahmin ettir"),
        ],
        0,
        t(
          "Studio can start a server and several players on your own PC.",
          "Studio kendi bilgisayarında bir sunucu ve birkaç oyuncu başlatabilir.",
        ),
      ),
    ],
  },

  debugging: {
    emoji: "🐞",
    takeaway: t(
      "Fix the first error first. print() to prove it. Fix where the nil came from.",
      "Önce ilk hatayı düzelt. print() ile kanıtla. nil'in geldiği yeri düzelt.",
    ),
    steps: [
      learn(
        t("Read the FIRST red line", "İLK kırmızı satırı oku"),
        t(
          "The first error in Output usually causes the rest. Click it to jump straight to the line.",
          "Output'taki ilk hata genelde diğerlerine sebep olur. Tıkla, doğrudan o satıra git.",
        ),
        {
          visual: "output",
          hook: t("Dominoes 🁢: find the first one that fell.", "Domino taşları 🁢: ilk düşeni bul."),
        },
      ),
      choice(
        t(
          "Error: Script:12: attempt to index nil with 'Humanoid'. What is nil?",
          "Hata: Script:12: attempt to index nil with 'Humanoid'. nil olan ne?",
        ),
        [
          t("The thing before .Humanoid", ".Humanoid'den önceki şey"),
          t("Humanoid itself", "Humanoid'in kendisi"),
          t("Line 12 is empty", "12. satır boş"),
          t("The whole script", "Bütün script"),
        ],
        0,
        t(
          '"index nil with Humanoid" = you wrote x.Humanoid and x was nil.',
          '"index nil with Humanoid" = x.Humanoid yazdın ve x nil\'di.',
        ),
      ),
      learn(
        t("Prove it with print", "print ile kanıtla"),
        t(
          "Not sure what a value is? print it right above the line that breaks. `typeof()` tells you its type.",
          "Bir değerin ne olduğundan emin değil misin? Bozulan satırın hemen üstünde print et. `typeof()` tipini söyler.",
        ),
      ),
      predict(
        lua`
print(typeof(nil))
print(typeof(42))
print(typeof("hi"))
`,
        ["nil\nnumber\nstring", "nil\n42\nhi", "nil\nint\ntext", "number\nnumber\nstring"],
        0,
        t("typeof returns the type's name as text.", "typeof tipin adını metin olarak döndürür."),
      ),
      choice(
        t(
          'FindFirstChild("boss") returns nil, but the model is called Boss. Why?',
          'FindFirstChild("boss") nil döndürüyor ama modelin adı Boss. Neden?',
        ),
        [
          t("Names are case-sensitive", "İsimler büyük-küçük harfe duyarlı"),
          t("FindFirstChild is broken", "FindFirstChild bozuk"),
          t("Models can't be found", "Modeller bulunamaz"),
          t("It needs a task.wait()", "task.wait() gerekiyor"),
        ],
        0,
        t("boss and Boss are different names.", "boss ve Boss farklı isimlerdir."),
      ),
      learn(
        t("Fix the source, not the symptom", "Belirtiyi değil, kaynağı düzelt"),
        t(
          "Don't just wrap the crash in an if. Ask WHERE the nil came from: a typo? Not loaded yet? The wrong kind of script?",
          "Çöken satırı bir if'e sarıp geçme. nil'in NEREDEN geldiğini sor: yazım hatası mı? Henüz yüklenmedi mi? Yanlış script türü mü?",
        ),
        {
          hook: t(
            "Stuck? Paste the error into the Error Analyzer on this site 🔎",
            "Takıldın mı? Hatayı bu sitedeki Error Analyzer'a yapıştır 🔎",
          ),
        },
      ),
    ],
  },
};
