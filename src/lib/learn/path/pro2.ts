import { choice, fill, learn, order, predict, t, type PathLesson } from "./types";

/** Code: drops the first newline and turns 4-space indents into tabs. */
const lua = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values)
    .replace(/^\n/, "")
    .replace(/^( {4})+/gm, (m) => "\t".repeat(m.length / 4))
    .replace(/\s+$/, "");

/** Bite-sized steps for units 13–15 (lessons.pro2.ts). */
export const CH_PRO2: Record<string, PathLesson> = {
  // ------------------------------------------------------------------ 13 · Game systems
  "inventory-system": {
    emoji: "🧰",
    takeaway: t(
      "One inventory module with Add, Remove and Count; craft by checking every ingredient before removing any.",
      "Add, Remove ve Count'u olan tek bir envanter modülü; üretirken hiçbirini çıkarmadan önce her malzemeyi kontrol et.",
    ),
    steps: [
      learn(
        t("One module, clear functions", "Tek modül, net fonksiyonlar"),
        t(
          "An inventory module with Add, Remove and Count keeps the item rules in one place. Every other system just calls those functions.",
          "Add, Remove ve Count'u olan bir envanter modülü eşya kurallarını tek yerde tutar. Diğer her sistem sadece bu fonksiyonları çağırır.",
        ),
        {
          code: lua`
local bag = Inventory.new()
bag:Add("Wood", 3)
print(bag:Count("Wood"))
`,
          hook: t(
            "A vending machine 🥤: you press buttons; you don't reach inside.",
            "Otomat 🥤: tuşlara basarsın; içine elini sokmazsın.",
          ),
        },
      ),
      predict(
        lua`
local items = {}
local function add(item, n)
    items[item] = (items[item] or 0) + n
end
add("Wood", 3)
add("Wood", 2)
print(items.Wood)
`,
        ["5", "3", "2", "nil"],
        0,
        t(
          "The second add stacks on the first: 3 + 2.",
          "İkinci add birincinin üstüne yığılır: 3 + 2.",
        ),
      ),
      fill(
        t("Start new items at 0", "Yeni eşyalar 0'dan başlasın"),
        "items[item] = (items[item] ___ 0) + amount",
        ["or", "and", "not", "=="],
        0,
        t("nil or 0 is 0.", "nil or 0, 0'dır."),
      ),
      predict(
        lua`
local items = { Stone = 3 }
local function remove(item, n)
    local have = items[item] or 0
    if have < n then
        return false
    end
    items[item] = have - n
    return true
end
print(remove("Stone", 5), items.Stone)
`,
        ["false 3", "true -2", "false 0", "true 3"],
        0,
        t(
          "Not enough stone, so nothing changes.",
          "Yeterli taş yok, bu yüzden hiçbir şey değişmez.",
        ),
      ),
      learn(
        t("Crafting: check, remove, add", "Üretim: kontrol et, çıkar, ekle"),
        t(
          "A recipe lists ingredients. First check Count for all of them; only then remove them and add the result — never remove half and fail.",
          "Bir tarif malzemeleri listeler. Önce hepsi için Count'u kontrol et; ancak sonra onları çıkar ve sonucu ekle — asla yarısını çıkarıp başarısız olma.",
        ),
      ),
      order(
        t("Put craft in the right order", "craft'ı doğru sıraya koy"),
        [
          "for name, n in recipe do",
          "    if bag:Count(name) < n then return false end",
          "end",
          "for name, n in recipe do bag:Remove(name, n) end",
          "bag:Add(itemName)",
          "return true",
        ],
        t(
          "Check everything, then remove, then add.",
          "Önce her şeyi kontrol et, sonra çıkar, sonra ekle.",
        ),
      ),
      choice(
        t("Where should the real inventory live?", "Gerçek envanter nerede durmalı?"),
        [
          t("On the server, in the player's session data", "Sunucuda, oyuncunun oturum verisinde"),
          t("In a LocalScript", "Bir LocalScript'te"),
          t("In the player's GUI", "Oyuncunun arayüzünde"),
          t(
            "In ReplicatedStorage so clients can edit it",
            "İstemciler düzenleyebilsin diye ReplicatedStorage'da",
          ),
        ],
        0,
        t("The client only gets a copy to draw.", "İstemci sadece çizmek için bir kopya alır."),
      ),
    ],
  },

  combat: {
    emoji: "⚔️",
    takeaway: t(
      "Make a hitbox on the server with GetPartBoundsInBox, skip the attacker and damage each humanoid once.",
      "Hitbox'ı sunucuda GetPartBoundsInBox ile yap, saldıranı atla ve her humanoid'e bir kez hasar ver.",
    ),
    steps: [
      learn(
        t("Hitboxes", "Hitbox'lar"),
        t(
          "At the moment of an attack, ask the engine which parts are inside a box: `workspace:GetPartBoundsInBox(cframe, size, params)`.",
          "Saldırı anında motora bir kutunun içinde hangi parçaların olduğunu sor: `workspace:GetPartBoundsInBox(cframe, size, params)`.",
        ),
        {
          code: "local parts = workspace:GetPartBoundsInBox(boxCFrame, Vector3.new(5, 5, 6), params)",
          hook: t(
            "A camera flash 📸: one snapshot of who's standing in the frame.",
            "Fotoğraf flaşı 📸: karede kimin durduğunun tek bir anlık görüntüsü.",
          ),
        },
      ),
      fill(
        t("Don't hit yourself", "Kendine vurma"),
        "params.FilterDescendantsInstances = { ___ }",
        ["character", "workspace", "params", "hit"],
        0,
        t(
          "With Exclude, everything inside the attacker's character is skipped.",
          "Exclude ile saldıranın karakterindeki her şey atlanır.",
        ),
      ),
      predict(
        lua`
local params = OverlapParams.new()
local p = Instance.new("Part")
p.Anchored = true
p.Position = Vector3.new(0, 50, 0)
p.Parent = workspace
local inside = workspace:GetPartBoundsInBox(CFrame.new(0, 50, 0), Vector3.new(4, 4, 4), params)
local far = workspace:GetPartBoundsInBox(CFrame.new(0, 50, 30), Vector3.new(4, 4, 4), params)
print(#inside, #far)
`,
        ["1 0", "0 1", "1 1", "0 0"],
        0,
        t("Only the first box covers the part.", "Parçayı sadece ilk kutu kapsıyor."),
      ),
      learn(
        t("Once per humanoid", "Humanoid başına bir kez"),
        t(
          "A character has many parts, so the box can find the same Humanoid several times. Keep a `hit` table and skip humanoids you already damaged.",
          "Bir karakterin birçok parçası var, bu yüzden kutu aynı Humanoid'i birkaç kez bulabilir. Bir `hit` tablosu tut ve zaten hasar verdiğin humanoid'leri atla.",
        ),
      ),
      predict(
        lua`
local hit = {}
local damaged = 0
for _, owner in { "Zombie", "Zombie", "Boss", "Zombie" } do
    if not hit[owner] then
        hit[owner] = true
        damaged += 1
    end
end
print(damaged)
`,
        ["2", "4", "3", "1"],
        0,
        t("Zombie and Boss, each once.", "Zombie ve Boss, her biri bir kez."),
      ),
      choice(
        t(
          'Why use FindFirstChildOfClass("Humanoid") on part.Parent?',
          'part.Parent üzerinde neden FindFirstChildOfClass("Humanoid") kullanılır?',
        ),
        [
          t(
            "The floor and walls have no Humanoid — it skips them safely",
            "Zemin ve duvarlarda Humanoid yok — onları güvenle atlar",
          ),
          t("It's faster than TakeDamage", "TakeDamage'den hızlıdır"),
          t("It heals the target", "Hedefi iyileştirir"),
          t("It creates a Humanoid", "Bir Humanoid oluşturur"),
        ],
        0,
        t("It returns nil instead of erroring.", "Hata vermek yerine nil döndürür."),
      ),
      choice(
        t(
          "Who should make the hitbox and deal damage?",
          "Hitbox'ı kim yapmalı ve hasarı kim vermeli?",
        ),
        [
          t("The server", "Sunucu"),
          t("The attacker's LocalScript", "Saldıranın LocalScript'i"),
          t("The target's LocalScript", "Hedefin LocalScript'i"),
          t("Nobody — use Touched", "Kimse — Touched kullan"),
        ],
        0,
        t(
          "The client plays the animation; the server decides who's hit.",
          "İstemci animasyonu oynatır; kimin vurulduğuna sunucu karar verir.",
        ),
      ),
    ],
  },

  "npc-ai": {
    emoji: "🧟",
    takeaway: t(
      "Pick the nearest player, compute a path with PathfindingService, walk the waypoints and switch states by distance.",
      "En yakın oyuncuyu seç, PathfindingService ile yol hesapla, ara noktaları yürü ve mesafeye göre durum değiştir.",
    ),
    steps: [
      learn(
        t("MoveTo", "MoveTo"),
        t(
          "`humanoid:MoveTo(position)` walks an NPC there. `humanoid.MoveToFinished:Wait()` waits until it arrives.",
          "`humanoid:MoveTo(position)` bir NPC'yi oraya yürütür. `humanoid.MoveToFinished:Wait()` varana kadar bekler.",
        ),
        {
          code: lua`
humanoid:MoveTo(Vector3.new(20, 3, 0))
humanoid.MoveToFinished:Wait()
`,
          hook: t(
            "Giving directions 🧭: walk there, then tell me when you've arrived.",
            "Yol tarifi 🧭: oraya yürü, varınca bana söyle.",
          ),
        },
      ),
      predict(
        lua`
local players = { Ann = 30, Bob = 12, Cat = 50 }
local best, bestDistance = nil, math.huge
for name, distance in players do
    if distance < bestDistance then
        best, bestDistance = name, distance
    end
end
print(best)
`,
        ["Bob", "Ann", "Cat", "nil"],
        0,
        t("Bob is the closest at 12 studs.", "Bob 12 stud ile en yakın."),
      ),
      fill(
        t("Ask for a path around walls", "Duvarların etrafından bir yol iste"),
        "local path = PathfindingService:___()",
        ["CreatePath", "ComputeAsync", "GetWaypoints", "MoveTo"],
        0,
        t(
          "CreatePath makes the Path object; ComputeAsync fills it.",
          "CreatePath Path nesnesini yapar; ComputeAsync onu doldurur.",
        ),
      ),
      learn(
        t("Waypoints", "Ara noktalar"),
        t(
          "`path:ComputeAsync(from, to)` finds a route. `path:GetWaypoints()` lists the points to walk, in order. A Jump action means: jump here.",
          "`path:ComputeAsync(from, to)` bir rota bulur. `path:GetWaypoints()` yürünecek noktaları sırayla listeler. Jump eylemi şu demek: burada zıpla.",
        ),
      ),
      order(
        t("Walk the path", "Yolu yürü"),
        [
          "path:ComputeAsync(root.Position, target)",
          "for _, waypoint in path:GetWaypoints() do",
          "    humanoid:MoveTo(waypoint.Position)",
          "    humanoid.MoveToFinished:Wait()",
          "end",
        ],
        t(
          "Compute first, then walk each waypoint and wait.",
          "Önce hesapla, sonra her ara noktayı yürü ve bekle.",
        ),
      ),
      predict(
        lua`
local function think(distance)
    if distance > 60 then
        return "Idle"
    elseif distance > 5 then
        return "Chase"
    end
    return "Attack"
end
print(think(100), think(20), think(2))
`,
        ["Idle Chase Attack", "Chase Chase Attack", "Idle Idle Attack", "Attack Chase Idle"],
        0,
        t(
          "Far: Idle. In range: Chase. Very close: Attack.",
          "Uzak: Idle. Menzilde: Chase. Çok yakın: Attack.",
        ),
      ),
      choice(
        t(
          "How often should an NPC recompute its path?",
          "Bir NPC yolunu ne sıklıkla yeniden hesaplamalı?",
        ),
        [
          t("About every 0.5–1 seconds", "Yaklaşık 0.5–1 saniyede bir"),
          t("Every frame", "Her karede"),
          t("Once, when the server starts", "Bir kez, sunucu açılınca"),
          t("Only when a player chats", "Sadece bir oyuncu yazınca"),
        ],
        0,
        t(
          "Often enough to follow players, rarely enough not to lag.",
          "Oyuncuları izleyecek kadar sık, kastırmayacak kadar seyrek.",
        ),
      ),
    ],
  },

  quests: {
    emoji: "📜",
    takeaway: t(
      "Quests are rows of data; one tracker listens to game events, counts progress with (x or 0) and pays the reward at the goal.",
      "Görevler veri satırlarıdır; tek bir takipçi oyun olaylarını dinler, ilerlemeyi (x or 0) ile sayar ve hedefte ödülü verir.",
    ),
    steps: [
      learn(
        t("Quests are data", "Görevler veridir"),
        t(
          "A quest is a row: which event counts, the goal and the reward. One tracker loops over the rows — new quests need no new code.",
          "Bir görev bir satırdır: hangi olay sayılır, hedef ve ödül. Tek bir takipçi satırlarda döner — yeni görevler yeni kod istemez.",
        ),
        {
          code: lua`
local QUESTS = {
    { Id = "Coins10", Event = "CoinCollected", Goal = 10, Reward = 50 },
}
`,
          hook: t(
            "A to-do list ✅: the list changes, the pen stays the same.",
            "Yapılacaklar listesi ✅: liste değişir, kalem aynı kalır.",
          ),
        },
      ),
      predict(
        lua`
local progress = {}
local function report(id, goal)
    progress[id] = math.min(goal, (progress[id] or 0) + 1)
    return progress[id]
end
report("Zombies", 3)
report("Zombies", 3)
report("Zombies", 3)
print(report("Zombies", 3))
`,
        ["3", "4", "1", "0"],
        0,
        t("math.min stops the count at the goal.", "math.min sayımı hedefte durdurur."),
      ),
      fill(
        t("Count unstarted quests as 0", "Başlanmamış görevleri 0 say"),
        "local current = progress[quest.Id] ___ 0",
        ["or", "and", "+", "=="],
        0,
        t("nil or 0 gives 0.", "nil or 0, 0 verir."),
      ),
      learn(
        t("Announce, don't call", "Çağırma, duyur"),
        t(
          'Game systems fire an event ("ZombieDefeated") instead of calling the quest code. The tracker listens, so the systems stay independent.',
          'Oyun sistemleri görev kodunu çağırmak yerine bir olay tetikler ("ZombieDefeated"). Takipçi dinler, böylece sistemler bağımsız kalır.',
        ),
      ),
      predict(
        lua`
local event = Instance.new("BindableEvent")
local count = 0
event.Event:Connect(function(kind)
    if kind == "Coin" then
        count += 1
    end
end)
event:Fire("Coin")
event:Fire("Zombie")
event:Fire("Coin")
task.wait()
print(count)
`,
        ["2", "3", "1", "0"],
        0,
        t("Only the two Coin events count.", "Sadece iki Coin olayı sayılır."),
      ),
      choice(
        t("A quest is complete when…", "Bir görev ne zaman tamamlanır…"),
        [
          t("its progress reaches the Goal", "ilerlemesi Goal'a ulaşınca"),
          t("the player rejoins", "oyuncu yeniden girince"),
          t("the server restarts", "sunucu yeniden başlayınca"),
          t("the tracker prints something", "takipçi bir şey yazdırınca"),
        ],
        0,
        t(
          "Compare progress with Goal after every report.",
          "Her report'tan sonra ilerlemeyi Goal ile karşılaştır.",
        ),
      ),
      choice(
        t(
          "Where should each player's quest progress live?",
          "Her oyuncunun görev ilerlemesi nerede durmalı?",
        ),
        [
          t("In their session data, so it's saved", "Oturum verisinde, kaydedilsin diye"),
          t("In a LocalScript", "Bir LocalScript'te"),
          t("In the quest table itself", "Görev tablosunun kendisinde"),
          t("In a TextLabel", "Bir TextLabel'da"),
        ],
        0,
        t(
          "Session data is loaded and saved with everything else.",
          "Oturum verisi her şeyle birlikte yüklenir ve kaydedilir.",
        ),
      ),
    ],
  },

  "wave-spawner": {
    emoji: "🌊",
    takeaway: t(
      "Spawn clones into a folder, wait until it's empty, rest, then spawn a bigger wave.",
      "Kopyaları bir klasöre çıkar, boşalana kadar bekle, dinlen, sonra daha büyük bir dalga çıkar.",
    ),
    steps: [
      learn(
        t("The loop", "Döngü"),
        t(
          "Spawn enemies, wait until the Enemies folder is empty, take a short break, repeat with more.",
          "Düşmanları çıkar, Enemies klasörü boşalana kadar bekle, kısa bir mola ver, daha fazlasıyla tekrarla.",
        ),
        {
          code: lua`
for wave = 1, 10 do
    spawnWave(wave)
    while #enemies:GetChildren() > 0 do
        task.wait(0.5)
    end
end
`,
          hook: t(
            "Arcade levels 👾: clear the screen and the next one starts.",
            "Atari seviyeleri 👾: ekranı temizle, sıradaki başlasın.",
          ),
        },
      ),
      predict(
        lua`
for wave = 1, 3 do
    print(wave * 2)
end
`,
        ["2\n4\n6", "1\n2\n3", "6", "2\n4"],
        0,
        t(
          "Each wave has twice its number of enemies.",
          "Her dalgada numarasının iki katı düşman var.",
        ),
      ),
      fill(
        t("Always spawn a copy", "Her zaman bir kopya çıkar"),
        "local enemy = template:___()",
        ["Clone", "Copy", "Destroy", "Spawn"],
        0,
        t(
          "Clone keeps the template safe in ServerStorage.",
          "Clone şablonu ServerStorage'da güvende tutar.",
        ),
      ),
      predict(
        lua`
local folder = Instance.new("Folder")
for i = 1, 3 do
    local z = Instance.new("Model")
    z.Parent = folder
    task.delay(i - 0.5, function()
        z:Destroy()
    end)
end
local waited = 0
while #folder:GetChildren() > 0 do
    task.wait(1)
    waited += 1
end
print(waited)
`,
        ["3", "1", "0", "6"],
        0,
        t(
          "The last enemy is gone after 2.5 seconds, so the loop waits 3 times.",
          "Son düşman 2.5 saniyede gider, bu yüzden döngü 3 kez bekler.",
        ),
      ),
      learn(
        t("Scale slowly", "Yavaşça zorlaştır"),
        t(
          "Each wave: a few more enemies, a bit more health, a boss now and then. Keep the numbers in one function so balancing is easy.",
          "Her dalga: birkaç düşman daha, biraz daha can, arada bir boss. Sayıları tek bir fonksiyonda tut ki dengelemek kolay olsun.",
        ),
      ),
      predict(
        lua`
local function count(wave)
    return 3 + wave * 2
end
print(count(1), count(5))
`,
        ["5 13", "3 5", "5 10", "13 5"],
        0,
        t("3 + 2 = 5 and 3 + 10 = 13.", "3 + 2 = 5 ve 3 + 10 = 13."),
      ),
      choice(
        t("Why count enemies with a folder?", "Düşmanlar neden bir klasörle sayılır?"),
        [
          t(
            "A missed -1 can't freeze the wave: the folder is always right",
            "Unutulan bir -1 dalgayı donduramaz: klasör hep doğrudur",
          ),
          t("Folders are faster", "Klasörler daha hızlı"),
          t("Variables can't hold numbers", "Değişkenler sayı tutamaz"),
          t("Roblox requires folders", "Roblox klasör zorunlu tutar"),
        ],
        0,
        t(
          "Destroyed enemies leave the folder by themselves.",
          "Yok edilen düşmanlar klasörden kendiliğinden çıkar.",
        ),
      ),
    ],
  },

  // ------------------------------------------------------------------ 14 · Polish & feel
  "ui-layout": {
    emoji: "📐",
    takeaway: t(
      "Size with Scale, center with AnchorPoint (0.5, 0.5), let UIListLayout arrange lists and test on a phone.",
      "Scale ile boyutlandır, AnchorPoint (0.5, 0.5) ile ortala, listeleri UIListLayout dizsin ve telefonda test et.",
    ),
    steps: [
      learn(
        t("Scale vs Offset", "Scale ve Offset"),
        t(
          "`UDim2.fromScale(0.5, 0.5)` is half the parent on any screen. `UDim2.fromOffset(200, 100)` is always 200×100 pixels — tiny on a PC, huge on a phone.",
          "`UDim2.fromScale(0.5, 0.5)` her ekranda parent'ın yarısıdır. `UDim2.fromOffset(200, 100)` hep 200×100 pikseldir — PC'de minik, telefonda dev.",
        ),
        {
          code: "frame.Size = UDim2.fromScale(0.4, 0.6)",
          hook: t(
            "Percentages 📏: half a pizza is half, whatever its size.",
            "Yüzdeler 📏: pizzanın yarısı, boyutu ne olursa olsun yarısıdır.",
          ),
        },
      ),
      predict(
        lua`
local size = UDim2.fromScale(0.4, 0.6)
print(size.X.Scale, size.Y.Scale, size.X.Offset)
`,
        ["0.4 0.6 0", "0 0 0.4", "40 60 0", "0.4 0.6 400"],
        0,
        t(
          "fromScale sets only the Scale parts; Offset stays 0.",
          "fromScale sadece Scale kısımlarını ayarlar; Offset 0 kalır.",
        ),
      ),
      fill(
        t("Center the frame on its Position", "Frame'i Position'ında ortala"),
        "frame.AnchorPoint = Vector2.new(___, 0.5)",
        ["0.5", "0", "1", "50"],
        0,
        t("0.5, 0.5 is the middle of the frame.", "0.5, 0.5 frame'in ortasıdır."),
      ),
      learn(
        t("Layouts do the math", "Hesabı düzenler yapar"),
        t(
          "Put a UIListLayout in a frame and every child lines up automatically. LayoutOrder decides who goes first.",
          "Bir frame'e UIListLayout koy, her çocuk otomatik dizilir. Kimin önce geleceğine LayoutOrder karar verir.",
        ),
      ),
      predict(
        lua`
local frame = Instance.new("Frame")
Instance.new("UIListLayout").Parent = frame
for i = 1, 4 do
    Instance.new("TextButton").Parent = frame
end
print(#frame:GetChildren())
`,
        ["5", "4", "1", "0"],
        0,
        t("Four buttons plus the layout itself.", "Dört buton artı düzenin kendisi."),
      ),
      choice(
        t("Which size works on every screen?", "Hangi boyut her ekranda çalışır?"),
        [
          "UDim2.fromScale(0.3, 0.1)",
          "UDim2.fromOffset(300, 100)",
          "UDim2.new(0, 300, 0, 100)",
          "Vector2.new(0.3, 0.1)",
        ],
        0,
        t("Only Scale grows with the screen.", "Sadece Scale ekranla büyür."),
      ),
      choice(
        t(
          "How do you test UI on a phone without one?",
          "Telefonun yokken arayüzü telefonda nasıl test edersin?",
        ),
        [
          t(
            "Studio's device emulator (Test → Device)",
            "Studio'nun cihaz emülatörü (Test → Device)",
          ),
          t("Make the Studio window smaller", "Studio penceresini küçült"),
          t("You can't", "Yapamazsın"),
          t("Publish and hope", "Yayınla ve umut et"),
        ],
        0,
        t(
          "The emulator shows real phone and tablet screens.",
          "Emülatör gerçek telefon ve tablet ekranlarını gösterir.",
        ),
      ),
    ],
  },

  sounds: {
    emoji: "🔊",
    takeaway: t(
      "Sounds in parts are 3D, in SoundService everywhere; loop music, clean up one-shots and use SoundGroups for volume.",
      "Parçalardaki sesler 3B, SoundService'tekiler her yerde; müziği döngüye al, tek seferlikleri temizle ve ses için SoundGroup kullan.",
    ),
    steps: [
      learn(
        t("Where a sound lives", "Bir ses nerede durur"),
        t(
          "Inside a Part: 3D, louder when close. In SoundService or a GUI: the same volume everywhere. `sound:Play()` starts it.",
          "Bir Part'ın içinde: 3B, yakındayken daha yüksek. SoundService'te ya da bir GUI'de: her yerde aynı ses. `sound:Play()` başlatır.",
        ),
        {
          code: lua`
local sound = Instance.new("Sound")
sound.SoundId = "rbxassetid://9118823101"
sound.Parent = workspace.Campfire
sound:Play()
`,
          hook: t(
            "A speaker on a wall 🔈 vs. headphones 🎧.",
            "Duvardaki hoparlör 🔈 ve kulaklık 🎧.",
          ),
        },
      ),
      choice(
        t("Where should background music go?", "Arka plan müziği nereye konur?"),
        ["SoundService", "workspace.Baseplate", "ServerStorage", "ReplicatedFirst"],
        0,
        t("It should sound the same wherever you stand.", "Nerede durursan dur aynı duyulmalı."),
      ),
      predict(
        lua`
local sound = Instance.new("Sound")
sound.Parent = workspace
print(sound.IsPlaying)
sound:Play()
print(sound.IsPlaying)
`,
        ["false\ntrue", "true\ntrue", "false\nfalse", "true\nfalse"],
        0,
        t("New sounds are silent until Play.", "Yeni sesler Play'e kadar sessizdir."),
      ),
      fill(
        t("Loop the music forever", "Müziği sonsuza kadar döngüye al"),
        "music.___ = true",
        ["Looped", "Playing", "Repeat", "Forever"],
        0,
        t("Looped restarts the sound when it ends.", "Looped ses bitince onu yeniden başlatır."),
      ),
      learn(
        t("Clean up one-shots", "Tek seferlikleri temizle"),
        t(
          "A sound made for one effect should be destroyed when it ends: `sound.Ended:Once(function() sound:Destroy() end)`.",
          "Tek bir efekt için yapılan ses bitince yok edilmeli: `sound.Ended:Once(function() sound:Destroy() end)`.",
        ),
      ),
      predict(
        lua`
local sound = Instance.new("Sound")
sound.Volume = 2
sound.Volume /= 4
print(sound.Volume)
`,
        ["0.5", "2", "8", "0.25"],
        0,
        t("2 divided by 4 is 0.5.", "2 bölü 4, 0.5'tir."),
      ),
      choice(
        t(
          "Who hears a sound a LocalScript plays in the player's GUI?",
          "Bir LocalScript'in oyuncunun arayüzünde çaldığı sesi kim duyar?",
        ),
        [
          t("Only that player", "Sadece o oyuncu"),
          t("Everyone", "Herkes"),
          t("Only the server", "Sadece sunucu"),
          t("Players nearby", "Yakındaki oyuncular"),
        ],
        0,
        t(
          "Things made on a client stay on that client.",
          "İstemcide yapılan şeyler o istemcide kalır.",
        ),
      ),
    ],
  },

  animations: {
    emoji: "💃",
    takeaway: t(
      "Load an Animation on the Animator once, keep the track, set Priority and play it — markers time the action.",
      "Bir Animation'ı Animator'e bir kez yükle, track'i sakla, Priority'yi ayarla ve oynat — işaretçiler eylemin zamanlamasını yapar.",
    ),
    steps: [
      learn(
        t("Load, then play", "Yükle, sonra oynat"),
        t(
          "Make an Animation with an AnimationId, load it onto the Humanoid's Animator and play the track you get back.",
          "AnimationId'si olan bir Animation yap, onu Humanoid'in Animator'üne yükle ve geri aldığın track'i oynat.",
        ),
        {
          code: lua`
local track = animator:LoadAnimation(animation)
track:Play()
`,
          hook: t(
            "A record 💿: load it once, play it whenever you want.",
            "Plak 💿: bir kez yükle, istediğin zaman çal.",
          ),
        },
      ),
      fill(
        t("Load it on the Animator", "Animator'e yükle"),
        "local track = animator:___(slash)",
        ["LoadAnimation", "Play", "GetAnimation", "Animate"],
        0,
        t("LoadAnimation returns an AnimationTrack.", "LoadAnimation bir AnimationTrack döndürür."),
      ),
      predict(
        lua`
local animation = Instance.new("Animation")
animation.AnimationId = "rbxassetid://507770239"
game.Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function(character)
        local animator = character:WaitForChild("Humanoid"):WaitForChild("Animator")
        local track = animator:LoadAnimation(animation)
        print(track.IsPlaying)
        track:Play()
        print(track.IsPlaying)
    end)
end)
`,
        ["false\ntrue", "true\ntrue", "false\nfalse", "true\nfalse"],
        0,
        t("Loading doesn't play it; Play does.", "Yüklemek oynatmaz; Play oynatır."),
      ),
      learn(
        t("Priority and speed", "Öncelik ve hız"),
        t(
          "`track.Priority = Enum.AnimationPriority.Action` makes an attack beat walking. `track:AdjustSpeed(2)` plays it twice as fast.",
          "`track.Priority = Enum.AnimationPriority.Action` bir saldırının yürümeyi bastırmasını sağlar. `track:AdjustSpeed(2)` onu iki kat hızlı oynatır.",
        ),
      ),
      choice(
        t("Which priority fits a sword slash?", "Kılıç vuruşuna hangi öncelik uyar?"),
        [
          "Enum.AnimationPriority.Action",
          "Enum.AnimationPriority.Idle",
          "Enum.AnimationPriority.Core",
          "Enum.AnimationPriority.Movement",
        ],
        0,
        t(
          "Action beats idle and walking animations.",
          "Action, bekleme ve yürüme animasyonlarını bastırır.",
        ),
      ),
      choice(
        t("When should you call LoadAnimation?", "LoadAnimation ne zaman çağrılmalı?"),
        [
          t(
            "Once per character, then reuse the track",
            "Karakter başına bir kez, sonra track'i tekrar kullan",
          ),
          t("Every time you play it", "Her oynattığında"),
          t("Every frame", "Her karede"),
          t("Never on the server", "Sunucuda asla"),
        ],
        0,
        t("Loading again and again piles up tracks.", "Tekrar tekrar yüklemek track biriktirir."),
      ),
      fill(
        t("Run code at the marker", "İşaretçide kod çalıştır"),
        'track:___("Impact"):Connect(dealDamage)',
        ["GetMarkerReachedSignal", "GetMarker", "AdjustSpeed", "Play"],
        0,
        t(
          "It fires exactly when the animation reaches that marker.",
          "Animasyon o işaretçiye ulaştığı anda tetiklenir.",
        ),
      ),
    ],
  },

  camera: {
    emoji: "🎥",
    takeaway: t(
      "In a LocalScript: Scriptable to take the camera, tween its CFrame, shake with RenderStepped and give it back with Custom.",
      "Bir LocalScript'te: kamerayı almak için Scriptable, CFrame'ini tween'le, RenderStepped ile salla ve Custom ile geri ver.",
    ),
    steps: [
      learn(
        t("Take the camera", "Kamerayı al"),
        t(
          "In a LocalScript, set `camera.CameraType = Enum.CameraType.Scriptable`, then set camera.CFrame wherever you want. Set it back to Custom when you're done.",
          "Bir LocalScript'te `camera.CameraType = Enum.CameraType.Scriptable` yap, sonra camera.CFrame'i istediğin yere koy. Bitince tekrar Custom yap.",
        ),
        {
          code: lua`
local camera = workspace.CurrentCamera
camera.CameraType = Enum.CameraType.Scriptable
`,
          hook: t(
            'A film director 🎬: "action!" and the camera is yours.',
            'Film yönetmeni 🎬: "motor!" ve kamera senin.',
          ),
        },
      ),
      fill(
        t("Aim the camera at the origin", "Kamerayı merkeze çevir"),
        "camera.CFrame = CFrame.___(Vector3.new(0, 20, 30), Vector3.zero)",
        ["lookAt", "new", "Angles", "fromHex"],
        0,
        t(
          "lookAt(from, to) places it at from, facing to.",
          "lookAt(from, to) onu from'a koyar ve to'ya baktırır.",
        ),
      ),
      predict(
        lua`
local camera = workspace.CurrentCamera
camera.CFrame = CFrame.new(0, 10, 0)
camera.CFrame *= CFrame.new(0, 5, 0)
print(camera.CFrame.Y)
`,
        ["15", "10", "5", "0"],
        0,
        t("*= moves it 5 more studs up.", "*= onu 5 stud daha yukarı taşır."),
      ),
      learn(
        t("Shake", "Sarsıntı"),
        t(
          "On every RenderStepped, nudge the camera by a small random offset. Add up dt to know how long it has shaken, and disconnect at the end.",
          "Her RenderStepped'de kamerayı küçük, rastgele bir kaydırmayla it. Ne kadar sallandığını bilmek için dt'yi topla ve sonunda bağlantıyı kes.",
        ),
      ),
      predict(
        lua`
local elapsed = 0
for _, dt in { 0.1, 0.2, 0.3 } do
    elapsed += dt
end
print(elapsed > 0.5)
`,
        ["true", "false"],
        0,
        t("0.1 + 0.2 + 0.3 is 0.6.", "0.1 + 0.2 + 0.3, 0.6 eder."),
      ),
      choice(
        t("Which FieldOfView feels fastest?", "Hangi FieldOfView en hızlı hissettirir?"),
        ["90", "70", "50", "30"],
        0,
        t("A wider view feels like speed.", "Daha geniş görüş hız gibi hissettirir."),
      ),
      choice(
        t("A BlurEffect made in a LocalScript…", "Bir LocalScript'te yapılan BlurEffect…"),
        [
          t("only blurs that player's screen", "sadece o oyuncunun ekranını bulanıklaştırır"),
          t("blurs everyone", "herkesi bulanıklaştırır"),
          t("errors", "hata verir"),
          t("only works on the server", "sadece sunucuda çalışır"),
        ],
        0,
        t(
          "Client-made objects stay on that client.",
          "İstemcide yapılan nesneler o istemcide kalır.",
        ),
      ),
    ],
  },

  "day-night": {
    emoji: "🌗",
    takeaway: t(
      "Add a little to Lighting.ClockTime in a server loop, react to its change signal and set the mood with Atmosphere.",
      "Bir sunucu döngüsünde Lighting.ClockTime'a biraz ekle, değişim sinyaline tepki ver ve havayı Atmosphere ile ayarla.",
    ),
    steps: [
      learn(
        t("ClockTime", "ClockTime"),
        t(
          "`Lighting.ClockTime` is hours from 0 to 24: 6 sunrise, 12 noon, 18 sunset. Add a little to it in a loop for a day-night cycle.",
          "`Lighting.ClockTime` 0'dan 24'e saattir: 6 gün doğumu, 12 öğle, 18 gün batımı. Gece-gündüz döngüsü için bir döngüde ona biraz ekle.",
        ),
        {
          code: "Lighting.ClockTime = (Lighting.ClockTime + 0.1) % 24",
          hook: t(
            "A sundial ☀️: move the hour, the shadows follow.",
            "Güneş saati ☀️: saati oynat, gölgeler takip etsin.",
          ),
        },
      ),
      predict(
        "print((23.5 + 1) % 24)",
        ["0.5", "24.5", "1", "23.5"],
        0,
        t("% 24 wraps past midnight back to the start.", "% 24, gece yarısını geçince başa sarar."),
      ),
      predict(
        lua`
local function isNight(hour)
    return hour >= 18 or hour < 6
end
print(isNight(20), isNight(12), isNight(3))
`,
        ["true false true", "true false false", "false false true", "true true true"],
        0,
        t("20 and 3 are night, 12 is noon.", "20 ve 3 gece, 12 öğle."),
      ),
      learn(
        t("React to the time", "Saate tepki ver"),
        t(
          '`Lighting:GetPropertyChangedSignal("ClockTime")` fires whenever the time changes — switch lamps, music or spawns there.',
          '`Lighting:GetPropertyChangedSignal("ClockTime")` saat her değiştiğinde tetiklenir — lambaları, müziği ya da çıkışları orada değiştir.',
        ),
      ),
      fill(
        t("Turn the lamp on", "Lambayı yak"),
        "lamp.Material = Enum.Material.___",
        ["Neon", "Plastic", "Grass", "Glass"],
        0,
        t("Neon glows in the dark.", "Neon karanlıkta parlar."),
      ),
      choice(
        t("Where should the day-night loop run?", "Gece-gündüz döngüsü nerede çalışmalı?"),
        [
          t(
            "On the server, so everyone shares the time",
            "Sunucuda, herkes aynı saati paylaşsın diye",
          ),
          t("In each LocalScript", "Her LocalScript'te"),
          t("In a ModuleScript nobody requires", "Kimsenin require etmediği bir ModuleScript'te"),
          t("In StarterGui", "StarterGui'de"),
        ],
        0,
        t(
          "Server changes to Lighting replicate to all players.",
          "Sunucunun Lighting değişiklikleri bütün oyunculara replike edilir.",
        ),
      ),
      choice(
        t("Which adds haze in the distance?", "Uzakta pusu hangisi ekler?"),
        ["Atmosphere", "BlurEffect", "UICorner", "SoundGroup"],
        0,
        t(
          "Atmosphere's Density makes far-away things hazy.",
          "Atmosphere'in Density'si uzaktaki şeyleri puslu yapar.",
        ),
      ),
    ],
  },

  // ------------------------------------------------------------------ 15 · Ship your game
  architecture: {
    emoji: "🏗️",
    takeaway: t(
      "Services are ModuleScripts with Start; one Main script requires them all, then starts them; shared code lives in ReplicatedStorage.",
      "Servisler Start'ı olan ModuleScript'lerdir; tek bir Main scripti hepsini require eder, sonra başlatır; ortak kod ReplicatedStorage'da yaşar.",
    ),
    steps: [
      learn(
        t("Services and a loader", "Servisler ve bir yükleyici"),
        t(
          "Each system is a ModuleScript (a service) with a Start function. One Main script requires them all, then starts them.",
          "Her sistem Start fonksiyonu olan bir ModuleScript'tir (servis). Tek bir Main scripti hepsini require eder, sonra başlatır.",
        ),
        {
          code: lua`
for _, module in Services:GetChildren() do
    services[module.Name] = require(module)
end
`,
          hook: t(
            'A team 👷: each worker has one job, and the manager says "go".',
            'Bir ekip 👷: her işçinin tek bir işi var, yönetici de "başla" der.',
          ),
        },
      ),
      choice(
        t("Where do server services live?", "Sunucu servisleri nerede durur?"),
        ["ServerScriptService", "ReplicatedStorage", "StarterPlayerScripts", "Workspace"],
        0,
        t(
          "Server code stays where clients can't read it.",
          "Sunucu kodu istemcilerin okuyamadığı yerde kalır.",
        ),
      ),
      choice(
        t("Where does code both sides use go?", "İki tarafın da kullandığı kod nereye gider?"),
        ["ReplicatedStorage", "ServerStorage", "ServerScriptService", "StarterGui"],
        0,
        t(
          "Only ReplicatedStorage is visible to both.",
          "İkisine de sadece ReplicatedStorage görünür.",
        ),
      ),
      predict(
        lua`
local services = {
    Inventory = { Start = function() print("Inventory") end },
    Data = { Start = function() print("Data") end },
}
for _, name in { "Data", "Inventory" } do
    services[name].Start()
end
`,
        ["Data\nInventory", "Inventory\nData", "Data", "Inventory"],
        0,
        t("The list decides the order: Data first.", "Sırayı liste belirler: önce Data."),
      ),
      learn(
        t("Two phases", "İki aşama"),
        t(
          "Require everything first, then call Start on each. That way services can find each other inside Start, and no module waits on another at the top.",
          "Önce her şeyi require et, sonra her birinde Start'ı çağır. Böylece servisler Start içinde birbirini bulabilir ve hiçbir modül en üstte diğerini beklemez.",
        ),
      ),
      fill(
        t("Start every service in its own thread", "Her servisi kendi iş parçacığında başlat"),
        "task.___(service.Start)",
        ["spawn", "wait", "cancel", "desynchronize"],
        0,
        t(
          "task.spawn so one slow Start doesn't hold up the rest.",
          "Yavaş bir Start diğerlerini bekletmesin diye task.spawn.",
        ),
      ),
      choice(
        t(
          "Two modules require each other at the top. What happens?",
          "İki modül en üstte birbirini require ediyor. Ne olur?",
        ),
        [
          t("A recursive require error", "Özyinelemeli require hatası"),
          t("It works fine", "Sorunsuz çalışır"),
          t("The game gets faster", "Oyun hızlanır"),
          t("Roblox merges them", "Roblox onları birleştirir"),
        ],
        0,
        t("Each waits for the other forever.", "Her biri diğerini sonsuza kadar bekler."),
      ),
    ],
  },

  performance: {
    emoji: "⚡",
    takeaway: t(
      "Disconnect what you connect, destroy what you create, clear per-player tables and never loop without a wait.",
      "Bağladığının bağlantısını kes, oluşturduğunu yok et, oyuncu başına tabloları temizle ve asla beklemesiz döngü kurma.",
    ),
    steps: [
      learn(
        t("Connections cost", "Bağlantıların bir bedeli var"),
        t(
          "Every :Connect keeps a function alive until you :Disconnect it or the object is destroyed. Disconnect what you no longer need.",
          "Her :Connect, sen :Disconnect edene ya da nesne yok edilene kadar bir fonksiyonu canlı tutar. Artık gerekmeyenin bağlantısını kes.",
        ),
        {
          code: lua`
local connection = RunService.Heartbeat:Connect(update)
connection:Disconnect()
`,
          hook: t(
            "A dripping tap 🚰: a little waste, all night long.",
            "Damlayan musluk 🚰: azıcık israf, bütün gece boyunca.",
          ),
        },
      ),
      predict(
        lua`
local event = Instance.new("BindableEvent")
local connection = event.Event:Connect(function() end)
print(connection.Connected)
connection:Disconnect()
print(connection.Connected)
`,
        ["true\nfalse", "true\ntrue", "false\nfalse", "false\ntrue"],
        0,
        t("Disconnect turns Connected off.", "Disconnect, Connected'ı kapatır."),
      ),
      fill(
        t("Clear the player's entry", "Oyuncunun kaydını sil"),
        "connections[player] = ___",
        ["nil", "0", "false", "{}"],
        0,
        t(
          "Setting a key to nil removes it from the table.",
          "Bir anahtarı nil yapmak onu tablodan siler.",
        ),
      ),
      learn(
        t("Memory leaks", "Bellek sızıntıları"),
        t(
          "A table keyed by player that's never cleared keeps every player who ever joined. Clear it in PlayerRemoving — and destroy parts you create when you're done.",
          "Oyuncuya göre anahtarlanan ve hiç temizlenmeyen bir tablo şimdiye kadar giren her oyuncuyu tutar. PlayerRemoving'de temizle — ve oluşturduğun parçaları işin bitince yok et.",
        ),
      ),
      predict(
        lua`
local part = Instance.new("Part")
part.Parent = workspace
local connection = part.Touched:Connect(function() end)
part:Destroy()
print(connection.Connected, part.Parent)
`,
        ["false nil", "true nil", "false Workspace", "true Workspace"],
        0,
        t(
          "Destroy removes the part and disconnects its events.",
          "Destroy parçayı kaldırır ve olaylarının bağlantısını keser.",
        ),
      ),
      choice(
        t("Which loop is fine?", "Hangi döngü sorunsuz?"),
        [
          "while true do task.wait(1) check() end",
          "while true do check() end",
          "repeat check() until false",
          "for i = 1, math.huge do check() end",
        ],
        0,
        t(
          "Only the first ever lets the rest of the game run.",
          "Sadece ilki oyunun geri kalanının çalışmasına izin veriyor.",
        ),
      ),
      choice(
        t("What should you do before optimizing?", "Optimize etmeden önce ne yapmalısın?"),
        [
          t(
            "Measure with the MicroProfiler or Developer Console",
            "MicroProfiler ya da Developer Console ile ölç",
          ),
          t("Rewrite everything", "Her şeyi baştan yaz"),
          t("Delete half the scripts", "Scriptlerin yarısını sil"),
          t("Add task.wait everywhere", "Her yere task.wait ekle"),
        ],
        0,
        t(
          "Fix what's really slow, not what you guess.",
          "Tahmin ettiğini değil, gerçekten yavaş olanı düzelt.",
        ),
      ),
    ],
  },

  monetization: {
    emoji: "💎",
    takeaway: t(
      "Check passes with UserOwnsGamePassAsync in pcall; grant products in ProcessReceipt and return PurchaseGranted only after the reward is given.",
      "Pass'leri pcall içinde UserOwnsGamePassAsync ile kontrol et; product'ları ProcessReceipt'te ver ve PurchaseGranted'ı sadece ödül verildikten sonra döndür.",
    ),
    steps: [
      learn(
        t("Passes vs products", "Pass'ler ve product'lar"),
        t(
          "Game pass: bought once, owned forever — check it with UserOwnsGamePassAsync. Developer product: bought many times — grant it in ProcessReceipt.",
          "Game pass: bir kez alınır, sonsuza kadar sahip olunur — UserOwnsGamePassAsync ile kontrol et. Developer product: çok kez alınır — ProcessReceipt'te ver.",
        ),
        {
          hook: t("A season ticket 🎟️ vs. a snack 🍿.", "Sezonluk bilet 🎟️ ve atıştırmalık 🍿."),
        },
      ),
      choice(
        t(
          'You sell "100 coins" that players can buy again and again. What is it?',
          'Oyuncuların tekrar tekrar alabildiği "100 coin" satıyorsun. Bu nedir?',
        ),
        [
          t("A developer product", "Bir developer product"),
          t("A game pass", "Bir game pass"),
          t("A badge", "Bir rozet"),
          t("A group rank", "Bir grup rütbesi"),
        ],
        0,
        t(
          "Repeatable purchases are developer products.",
          "Tekrarlanabilen satın almalar developer product'tır.",
        ),
      ),
      fill(
        t("Tell Roblox the reward was given", "Roblox'a ödülün verildiğini söyle"),
        "return Enum.ProductPurchaseDecision.___",
        ["PurchaseGranted", "NotProcessedYet", "Success", "Done"],
        0,
        t("PurchaseGranted closes the receipt.", "PurchaseGranted makbuzu kapatır."),
      ),
      learn(
        t("ProcessReceipt rules", "ProcessReceipt kuralları"),
        t(
          "Assign it once, on the server. Find the player, give the reward, and only then return PurchaseGranted. If anything fails, return NotProcessedYet and Roblox retries.",
          "Onu bir kez, sunucuda ata. Oyuncuyu bul, ödülü ver ve ancak sonra PurchaseGranted döndür. Bir şey başarısız olursa NotProcessedYet döndür, Roblox tekrar dener.",
        ),
      ),
      predict(
        lua`
local PRODUCTS = {
    [111] = 100,
    [222] = 500,
}
local function coinsFor(productId)
    return PRODUCTS[productId] or 0
end
print(coinsFor(222), coinsFor(999))
`,
        ["500 0", "100 0", "500 nil", "0 0"],
        0,
        t(
          "Look the reward up by product id; unknown ids give nothing.",
          "Ödülü product id ile bul; bilinmeyen id'ler hiçbir şey vermez.",
        ),
      ),
      choice(
        t("Where do you call PromptProductPurchase?", "PromptProductPurchase nerede çağrılır?"),
        [
          t(
            "In a LocalScript, e.g. when a button is clicked",
            "Bir LocalScript'te, örneğin bir butona basılınca",
          ),
          t("Inside ProcessReceipt", "ProcessReceipt'in içinde"),
          t("In a DataStore", "Bir DataStore'da"),
          t("Nowhere — purchases are automatic", "Hiçbir yerde — satın almalar otomatik"),
        ],
        0,
        t(
          "The client opens the window; the server handles the receipt.",
          "Pencereyi istemci açar; makbuzu sunucu işler.",
        ),
      ),
      choice(
        t(
          "Why wrap UserOwnsGamePassAsync in pcall?",
          "UserOwnsGamePassAsync neden pcall ile sarılır?",
        ),
        [
          t("It's a web request that can fail", "Başarısız olabilen bir web isteği"),
          t("It's slow on purpose", "Kasıtlı olarak yavaş"),
          t("It returns a table", "Bir tablo döndürür"),
          t("It only works in Studio", "Sadece Studio'da çalışır"),
        ],
        0,
        t("Every …Async call can fail.", "Her …Async çağrısı başarısız olabilir."),
      ),
    ],
  },

  teams: {
    emoji: "🚩",
    takeaway: t(
      "Create Team objects, put players on the smaller team, compare teams before damage and keep a score per team.",
      "Team nesneleri oluştur, oyuncuları küçük takıma koy, hasardan önce takımları karşılaştır ve takım başına skor tut.",
    ),
    steps: [
      learn(
        t("player.Team", "player.Team"),
        t(
          "Create Team objects in the Teams service and set `player.Team = red`. The player list colors and team SpawnLocations follow.",
          "Teams servisinde Team nesneleri oluştur ve `player.Team = red` yap. Oyuncu listesi renkleri ve takım SpawnLocation'ları takip eder.",
        ),
        {
          code: lua`
local red = Instance.new("Team")
red.Name = "Red"
red.TeamColor = BrickColor.new("Bright red")
red.Parent = game:GetService("Teams")
`,
          hook: t(
            "Team jerseys 👕: everyone knows whose side you're on.",
            "Takım formaları 👕: herkes hangi tarafta olduğunu bilir.",
          ),
        },
      ),
      predict(
        lua`
local Teams = game:GetService("Teams")
local red = Instance.new("Team")
red.Name = "Red"
red.Parent = Teams
local blue = Instance.new("Team")
blue.Name = "Blue"
blue.Parent = Teams
print(#Teams:GetTeams())
`,
        ["2", "0", "1", "3"],
        0,
        t("Two Team objects in the Teams service.", "Teams servisinde iki Team nesnesi."),
      ),
      fill(
        t("Put the player on red", "Oyuncuyu kırmızıya koy"),
        "player.___ = red",
        ["Team", "TeamColor", "Parent", "Name"],
        0,
        t("player.Team takes the Team object.", "player.Team, Team nesnesini alır."),
      ),
      predict(
        lua`
local red, blue = 2, 3
local pick = if red <= blue then "Red" else "Blue"
print(pick)
`,
        ["Red", "Blue", "2", "3"],
        0,
        t(
          "Red has fewer players, so the newcomer joins Red.",
          "Red'de daha az oyuncu var, yeni gelen Red'e katılır.",
        ),
      ),
      learn(
        t("Friendly fire", "Dost ateşi"),
        t(
          "Before dealing damage, compare teams: if `victim.Team == attacker.Team`, skip it. NPCs (no player) can always be hit.",
          "Hasar vermeden önce takımları karşılaştır: `victim.Team == attacker.Team` ise atla. NPC'lere (oyuncu değil) her zaman vurulabilir.",
        ),
      ),
      predict(
        lua`
local function canDamage(attackerTeam, victimTeam)
    return victimTeam == nil or victimTeam ~= attackerTeam
end
print(canDamage("Red", "Blue"), canDamage("Red", "Red"), canDamage("Red", nil))
`,
        ["true false true", "true true true", "false false true", "true false false"],
        0,
        t(
          "Same team: no damage. No team (an NPC): damage.",
          "Aynı takım: hasar yok. Takım yok (NPC): hasar var.",
        ),
      ),
      choice(
        t('Why does player.Team = "Red" error?', 'player.Team = "Red" neden hata verir?'),
        [
          t("Team needs a Team object, not a name", "Team bir isim değil, Team nesnesi ister"),
          t("Red is not a color", "Red bir renk değil"),
          t("Scripts can't set teams", "Scriptler takım ayarlayamaz"),
          t("It needs a LocalScript", "LocalScript gerekir"),
        ],
        0,
        t("Use player.Team = Teams.Red.", "player.Team = Teams.Red kullan."),
      ),
    ],
  },

  capstone: {
    emoji: "🚀",
    takeaway: t(
      "Plan services, ship a small version, check everything on the server, test with several players, publish and keep improving.",
      "Servisleri planla, küçük bir sürüm yayınla, her şeyi sunucuda kontrol et, birkaç oyuncuyla test et, yayınla ve geliştirmeye devam et.",
    ),
    steps: [
      learn(
        t("Small first", "Önce küçük"),
        t(
          "Ship a tiny version (one round, coins, saving), then add one feature at a time and test after each. Most great games started small.",
          "Minicik bir sürüm yayınla (bir tur, coinler, kayıt), sonra özellikleri tek tek ekle ve her birinden sonra test et. Harika oyunların çoğu küçük başladı.",
        ),
        {
          hook: t(
            "Building with bricks 🧱: one at a time, check that it holds.",
            "Tuğlayla inşa 🧱: her seferinde bir tane, tuttuğundan emin ol.",
          ),
        },
      ),
      choice(
        t("What belongs in DataService?", "DataService'e ne aittir?"),
        [
          t("Loading and saving player data", "Oyuncu verisini yüklemek ve kaydetmek"),
          t("Drawing the shop UI", "Dükkân arayüzünü çizmek"),
          t("Camera shake", "Kamera sarsıntısı"),
          t("Playing music", "Müzik çalmak"),
        ],
        0,
        t("One service, one job.", "Bir servis, bir iş."),
      ),
      predict(
        lua`
local MAX = 10
local function canPickUp(distance, taken)
    return not taken and distance <= MAX
end
print(canPickUp(4, false), canPickUp(4, true), canPickUp(40, false))
`,
        ["true false false", "true true false", "false false false", "true false true"],
        0,
        t(
          "Only a close coin that nobody took yet.",
          "Sadece yakın ve henüz kimsenin almadığı bir coin.",
        ),
      ),
      learn(
        t("Test like players", "Oyuncu gibi test et"),
        t(
          "Use Test → Clients and Servers with 2+ players. Bugs with several players — replication, teams, leaderboards — show up there, not in solo Play.",
          "Test → Clients and Servers'ı 2+ oyuncuyla kullan. Birkaç oyunculu hatalar — replikasyon, takımlar, liderlik tabloları — tek başına Play'de değil, orada çıkar.",
        ),
      ),
      fill(
        t("Each coin pays only once", "Her coin sadece bir kez öder"),
        lua`
if not player or ___ then
    return
end
`,
        ["taken", "coin", "MAX", "hit"],
        0,
        t("The taken flag stops double pickups.", "taken bayrağı çift toplamayı durdurur."),
      ),
      choice(
        t("Which is NOT on the launch checklist?", "Hangisi yayın kontrol listesinde DEĞİL?"),
        [
          t("Delete every pcall", "Her pcall'ı sil"),
          t("Test the UI on phone and PC", "Arayüzü telefonda ve PC'de test et"),
          t("Every remote checks its arguments", "Her remote argümanlarını kontrol ediyor"),
          t("Data saves on shutdown", "Veri kapanışta kaydediliyor"),
        ],
        0,
        t(
          "pcall is what keeps DataStore failures from crashing your game.",
          "DataStore hatalarının oyununu çökertmesini önleyen pcall'dur.",
        ),
      ),
      choice(
        t(
          "After launch, what tells you what to fix next?",
          "Yayından sonra sırada neyi düzelteceğini ne söyler?",
        ),
        [
          t(
            "Analytics: retention and session length",
            "Analizler: geri dönme oranı ve oturum süresi",
          ),
          t("Nothing — the game is done", "Hiçbir şey — oyun bitti"),
          t("The number of scripts", "Script sayısı"),
          t("Your line count", "Satır sayın"),
        ],
        0,
        t(
          "Players' behavior shows where the game loses them.",
          "Oyuncuların davranışı oyunun onları nerede kaybettiğini gösterir.",
        ),
      ),
    ],
  },
};
