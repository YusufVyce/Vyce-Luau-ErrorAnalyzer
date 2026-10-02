/** Turkish text for the homework in pro.ts. */
import type { ExerciseText } from "./exercises.tr";

export const PRO_TR: Record<string, ExerciseText> = {
  "type-checking": {
    title: "Tipli hasar",
    goal: "--!strict ile tamamen tipli bir hasar fonksiyonu yaz.",
    steps: [
      "İlk satırda --!strict kalsın",
      "name: string, damage: number ve isteğe bağlı critChance: number? alanları olan bir Weapon tipi yap",
      "getDamage(weapon: Weapon, isCrit: boolean): number yaz — kritikte iki kat, değilse normal hasar döndürsün",
      "Hasarı 15 olan bir Sword yap ve getDamage(sword, true) yazdır (30 yazar)",
    ],
    hints: [
      "type Weapon = { name: string, damage: number, critChance: number? }",
      "local function getDamage(weapon: Weapon, isCrit: boolean): number",
      "if isCrit then return weapon.damage * 2 end — sonra return weapon.damage",
    ],
  },
  metatables: {
    title: "Toplanabilen vektörler",
    goal: "Nesneleri + ile toplanabilen ve güzel yazdırılan küçük bir Vec sınıfı yap.",
    steps: [
      "Vec.new(x, y), metatablosu Vec olan { x = x, y = y } tablosunu döndürür",
      "Vec.__add iki parçası da toplanmış yeni bir Vec döndürür",
      'Vec.__tostring "(4, 6)" gibi bir metin döndürür',
      "tostring(Vec.new(1, 2) + Vec.new(3, 4)) yazdır — (4, 6) yazar",
    ],
    hints: [
      "function Vec.new(x, y) return setmetatable({ x = x, y = y }, Vec) end",
      "Vec.__add = function(a, b) return Vec.new(a.x + b.x, a.y + b.y) end",
      'Vec.__tostring = function(v) return "(" .. v.x .. ", " .. v.y .. ")" end',
    ],
  },
  inheritance: {
    title: "Boss savaşı",
    goal: "Enemy'den miras alan ve üç kat sert vuran bir Boss sınıfı yap.",
    steps: [
      "Enemy zaten yazılı. Altında Boss'u Enemy'den miras alacak şekilde yap (setmetatable(Boss, { __index = Enemy }))",
      "Boss.new(name, health) Enemy.new ile bir Enemy kurar ve onu Boss'a çevirir",
      "Boss:Attack(), Enemy.Attack(self)'in döndürdüğünün üç katını döndürür — üst sınıfı çağır, 30 yazma",
      'Boss.new("Mega Noob", 500):Attack() yazdır (30 yazar)',
    ],
    hints: [
      "local Boss = setmetatable({}, { __index = Enemy }) ve sonra Boss.__index = Boss",
      "function Boss.new(name, health) return setmetatable(Enemy.new(name, health), Boss) end",
      "function Boss:Attack() return Enemy.Attack(self) * 3 end",
    ],
  },
  closures: {
    title: "Sınırlı deneme",
    goal: "Sınırlayıcı üreten bir fonksiyon yaz: her biri birkaç kez evet der, sonra hayır.",
    steps: [
      "makeLimiter(max) yeni bir fonksiyon döndürür",
      "O fonksiyon ilk max çağrısında true, sonrasında false döndürür",
      "Her sınırlayıcı kendi başına sayar",
      "local tryOpen = makeLimiter(3), sonra print(tryOpen(), tryOpen(), tryOpen(), tryOpen()) — true true true false yazar",
    ],
    hints: [
      "makeLimiter'ın içinde: local used = 0, sonra return function() … end",
      "Döndürülen fonksiyonun içinde: used += 1 ve return used <= max",
      "used makeLimiter'ın içinde yaşadığı için her sınırlayıcının kendine ait bir tane olur.",
    ],
  },
  coroutines: {
    title: "Takım seçici",
    goal: "Bir coroutine ile takım renklerini tek tek ve sonsuza kadar dağıt.",
    steps: [
      'coroutine.wrap ile nextColor yap: önce "Red", sonra "Blue", sonra "Green" yield etsin ve baştan başlasın',
      "nextColor()'ı tek satırda dört kez yazdır — Red Blue Green Red yazar",
    ],
    hints: [
      "local nextColor = coroutine.wrap(function() … end)",
      "İçinde: while true do … end, böylece hiç bitmez",
      'Döngüde: for _, color in { "Red", "Blue", "Green" } do coroutine.yield(color) end',
    ],
  },
  "session-data": {
    title: "Oturum kaydedici",
    goal: "Her oyuncunun verisini bir kez yükle, sessions'ta tut ve çıkınca kaydet.",
    steps: [
      'Bir oyuncu girince verisini pcall ile "Player_" .. player.UserId anahtarından yükle ve sessions[player]\'a koy',
      "Yeni oyuncular (kayıtlı bir şeyi olmayan) { Coins = 0 } alır",
      "Bir oyuncu çıkınca sessions[player]'ı kaydet (UpdateAsync ya da SetAsync), sonra onu nil yap",
      "Verisi hiç yüklenmeyen bir oyuncuyu kaydetme",
    ],
    hints: [
      'Players.PlayerAdded:Connect(function(player) local ok, saved = pcall(store.GetAsync, store, "Player_" .. player.UserId) … end)',
      "if ok then sessions[player] = saved or { Coins = 0 } end",
      'PlayerRemoving\'de: local data = sessions[player]; if data then pcall(store.SetAsync, store, "Player_" .. player.UserId, data) end; sessions[player] = nil',
    ],
  },
  "global-leaderboards": {
    title: "Şöhretler salonu",
    goal: "Zaten skorlarla dolu bir OrderedDataStore'un ilk 3'ünü yazdır.",
    steps: [
      "Wins OrderedDataStore'unda zaten skorlar var (anahtarlar oyuncu isimleri)",
      "GetSortedAsync ve GetCurrentPage ile en yüksek 3'ü al",
      "Her kayıt için bir satır yazdır: #sıra isim galibiyet — örneğin #1 Ann 75",
    ],
    hints: [
      "local page = wins:GetSortedAsync(false, 3):GetCurrentPage()",
      "for rank, entry in ipairs(page) do … end",
      'print("#" .. rank .. " " .. entry.key .. " " .. entry.value) — ya da ters tırnakla',
    ],
  },
  serialization: {
    title: "Bir parçayı kaydet",
    goal: "Bir parçayı JSON'dan sağ çıkan düz veriye çevir ve geri kur.",
    steps: [
      "serialize(part), Name, Position (üç sayı) ve Color (hex metni ya da üç sayı) olan bir tablo döndürür",
      "deserialize(data), o Name, Position ve Color'la yeni bir Part döndürür",
      "Veri HttpService:JSONEncode ve JSONDecode'dan sağ çıkmalı — yani içinde Vector3 ya da Color3 olmamalı",
      "deserialize(serialize(workspace.Block)).Position yazdır",
    ],
    hints: [
      "Position = { part.Position.X, part.Position.Y, part.Position.Z }",
      "Color = part.Color:ToHex() — geri almak için Color3.fromHex(data.Color)",
      "part.Position = Vector3.new(table.unpack(data.Position))",
    ],
  },
  "cross-server": {
    title: "Global bağırış",
    goal: "Her sunucuya bir bağırış gönder ve aldığın bağırışları yazdır.",
    steps: [
      '"Shouts" konusuna abone ol. Her mesajın Data\'sı Player ve Text olan bir tablodur',
      "Her bağırışı şöyle yazdır: [Global] Player: Text — örneğin [Global] Ann: gg",
      '"Shouts"a { Player = playerName, Text = text } yayınlayan shout(playerName, text) yaz',
      'shout("Ann", "gg") çağır',
    ],
    hints: [
      'MessagingService:SubscribeAsync("Shouts", function(message) local data = message.Data … end)',
      'print("[Global] " .. data.Player .. ": " .. data.Text)',
      'local function shout(playerName, text) MessagingService:PublishAsync("Shouts", { Player = playerName, Text = text }) end',
    ],
  },
  "server-authority": {
    title: "Güvenli bağışlar",
    goal: "Bu bağış remote'u birçok şekilde exploit edilebilir. Sunucunun her şeyi kontrol etmesini sağla.",
    steps: [
      "Donate:FireServer(targetName, amount) coinlerinin bir kısmını başka bir oyuncuya verir",
      "En az 1 olan tam sayı olmayan miktarları reddet (negatif, NaN, metin, ondalık)",
      "Gerçek bir oyuncu olmayan ya da kendin olan bir hedefi reddet",
      "Sahip olduğundan büyük bağışları reddet — adil bir bağış yine çalışsın",
    ],
    hints: [
      'Önce: if typeof(targetName) ~= "string" or typeof(amount) ~= "number" then return end',
      "Sonra: if amount ~= amount or amount < 1 or amount % 1 ~= 0 then return end",
      "if not target or target == player or myCoins.Value < amount then return end",
    ],
  },
  "rate-limiting": {
    title: "Oto tıklayıcı durdurucu",
    goal: "Tıklamalar coin veriyor — ama oto tıklayıcı binlerce alıyor. Oyuncu başına bir bekleme süresi ekle.",
    steps: [
      "Her Click +1 coin verir, ama oyuncu başına en fazla 0.2 saniyede bir",
      "Bir oyuncunun spamı başka bir oyuncuyu engellememeli",
      "Zamanları lastClick'te tut ve oyuncu çıkınca kaydını sil",
    ],
    hints: [
      "local now = os.clock()",
      "if lastClick[player] and now - lastClick[player] < 0.2 then return end — sonra lastClick[player] = now",
      "Players.PlayerRemoving:Connect(function(player) lastClick[player] = nil end)",
    ],
  },
  replication: {
    title: "Günlük ödül butonu",
    goal: "Sunucunun gönderdiği coinleri göster ve günlük ödülü sunucudan iste.",
    steps: [
      "Bu LocalScript, CoinsLabel adında bir TextLabel ve DailyButton adında bir TextButton olan bir ScreenGui'de",
      "Oyuncunun leaderstats.Coins'ini Coins: <sayı> olarak göster ve değer her değiştiğinde güncelle",
      "DailyButton'a basılınca ReplicatedStorage.ClaimDaily'yi tetikle",
      "Coins'i kendin değiştirme — replike edilmez",
    ],
    hints: [
      'local coins = player:WaitForChild("leaderstats"):WaitForChild("Coins")',
      'local function show() label.Text = "Coins: " .. coins.Value end — bir kez ve coins.Changed\'de çağır',
      "button.MouseButton1Click:Connect(function() ReplicatedStorage.ClaimDaily:FireServer() end)",
    ],
  },
  "anti-cheat": {
    title: "Işınlanma yakalayıcı",
    goal: "Işınlanan oyuncuları geri çek ama dürüst hareketlere ve düşmeye dokunma.",
    steps: [
      "Her 0.5 saniyede her oyuncunun HumanoidRootPart'ına bak",
      "Son kontrolden beri yatayda 30 stud'dan fazla hareket ettiyse (Y'yi yok say), CFrame ile oraya geri taşı ve warn ile uyar",
      "Bir sonraki kontrol için her oyuncunun konumunu hatırla",
    ],
    hints: [
      "local lastPositions = {} ve bir while true do task.wait(0.5) … end döngüsü",
      "local moved = (root.Position - last) * Vector3.new(1, 0, 1)",
      "if moved.Magnitude > 30 then root.CFrame = CFrame.new(last) end — sonra lastPositions[player] = root.Position",
    ],
  },
  "inventory-system": {
    title: "Üç slotlu çanta",
    goal: "Yığınlaması ve 3 farklı eşya sınırı olan bir Inventory modülü yaz.",
    steps: [
      "Inventory.new() boş bir çanta yapar (her çanta ayrıdır)",
      "bag:Add(item, amount) yığına ekler (amount varsayılan 1) ve true döndürür — yeni bir eşyaysa ve içeride zaten 3 farklı eşya varsa false",
      "bag:Remove(item, amount) yeterli yoksa false döndürür ve hiçbir şeyi değiştirmez; yoksa çıkarır ve true döndürür. 0'a düşen eşya slotunu boşaltır",
      "bag:Count(item) kaç tane olduğunu döndürür (yoksa 0)",
    ],
    hints: [
      "function Inventory.new() return setmetatable({ items = {}, slots = 0 }, Inventory) end",
      "Add'de: if not self.items[item] then (slotları kontrol et, sonra self.items[item] = 0 ve self.slots += 1) end",
      "Remove'da: sayı 0'a ulaşınca self.items[item] = nil ve self.slots -= 1",
    ],
  },
  combat: {
    title: "Yere vuruş",
    goal: "Bir noktanın yakınındaki her düşmana bir hitbox ile tam bir kez hasar ver.",
    steps: [
      "areaAttack(center, radius, damage) yaz",
      "center'da, her yönde radius * 2 stud genişliğinde bir kutudaki parçaları bul (GetPartBoundsInBox)",
      "Bulduğun her Humanoid'e bir kez hasar ver — birkaç parçası içeride olsa bile",
      "areaAttack(Vector3.new(0, 3, 0), 10, 25) çağır",
    ],
    hints: [
      "local parts = workspace:GetPartBoundsInBox(CFrame.new(center), Vector3.one * radius * 2, OverlapParams.new())",
      'local humanoid = part.Parent and part.Parent:FindFirstChildOfClass("Humanoid")',
      "local hit = {} tut ve hit[humanoid] zaten true olan humanoid'leri atla",
    ],
  },
  "npc-ai": {
    title: "Nöbetteki muhafız",
    goal: "Bir muhafız menzildeki en yakın oyuncuyu kovalar, yakında kimse yoksa nöbet yerine döner.",
    steps: [
      "workspace.Guard bir NPC (Humanoid + HumanoidRootPart). Başlangıç konumu nöbet yeridir",
      "Her 0.5 saniyede HumanoidRootPart'ı muhafıza 40 stud'dan yakın olan en yakın oyuncuyu bul",
      "Biri varsa onun konumuna MoveTo yap; yoksa nöbet yerine MoveTo yap",
    ],
    hints: [
      "Döngü: while true do … task.wait(0.5) end",
      'Her oyuncu için: local target = player.Character and player.Character:FindFirstChild("HumanoidRootPart")',
      "humanoid:MoveTo(if best then best.Position else POST)",
    ],
  },
  quests: {
    title: "Görev takipçisi",
    goal: "Görev ilerlemesini oyun olaylarından takip et, her görevi bir kez bitir ve ödülünü öde.",
    steps: [
      "report(eventName, amount), o Event'e sahip her bitmemiş göreve amount (yoksa 1) ekler, Goal'u asla geçmez",
      "Bir görev Goal'una ulaşınca Görev tamamlandı: <Text> yazdır ve Reward'ını coins'e ekle — sadece bir kez",
      "İlerlemeyi progress[quest.Id]'de tut. Sonra report(\"CoinCollected\", 4)'ü üç kez çağır ve coins'i yazdır (50)",
    ],
    hints: [
      "for _, quest in QUESTS do local current = progress[quest.Id] or 0 … end",
      "if quest.Event == eventName and current < quest.Goal then current = math.min(quest.Goal, current + (amount or 1)) …",
      'progress[quest.Id] = current — ve if current == quest.Goal then print("Görev tamamlandı: " .. quest.Text) coins += quest.Reward end',
    ],
  },
  "wave-spawner": {
    title: "Üç dalga",
    goal: "Her biri bir öncekinin temizlenmesini bekleyen üç zombi dalgası çalıştır.",
    steps: [
      "runWave(wave), ServerStorage.Zombie'yi wave * 2 kez workspace.Enemies'e kopyalar",
      "Sonra workspace.Enemies boşalana kadar (task.wait ile) bekler ve Dalga <n> temizlendi! yazdırır",
      "1, 2 ve 3. dalgaları sırayla çalıştır — bir dalga öncekisi temizlenmeden asla başlamaz",
    ],
    hints: [
      "for _ = 1, wave * 2 do template:Clone().Parent = enemies end",
      "while #enemies:GetChildren() > 0 do task.wait(0.5) end",
      "print(`Wave {wave} cleared!`) — ve for wave = 1, 3 do runWave(wave) end",
    ],
  },
  "ui-layout": {
    title: "Dükkân listesi",
    goal: "Her ekrana uyan ve kendini dizen bir dükkân listesi yap.",
    steps: [
      "ScreenGui'de UDim2.fromScale(0.4, 0.6) boyutunda ShopList adında bir ScrollingFrame oluştur",
      "İçine bir UIListLayout koy",
      "ITEMS'taki her eşya için <isim> - <fiyat> metinli (Sword - 100 gibi) ve LayoutOrder = sırası olan bir TextButton ekle",
    ],
    hints: [
      'local list = Instance.new("ScrollingFrame") — sonra Name, Size = UDim2.fromScale(0.4, 0.6), Parent = gui',
      'Instance.new("UIListLayout").Parent = list',
      'for i, item in ITEMS do … button.Text = item[1] .. " - " .. item[2] … button.LayoutOrder = i … end',
    ],
  },
  sounds: {
    title: "Müzik kutusu",
    goal: "Döngüdeki müziği bir SoundGroup üzerinden çal ve oyuncuların açıp kapatmasını sağla.",
    steps: [
      "SoundService'te Music adında bir SoundGroup (Volume 0.5) oluştur",
      'SoundService\'te SoundId "rbxassetid://1837849285", Looped = true ve SoundGroup = Music grubu olan Theme adında bir Sound oluştur ve çal',
      "Müzik kutusunun ProximityPrompt'u tetiklenince: müzik çalıyorsa durdur, çalmıyorsa çal",
    ],
    hints: [
      'local music = Instance.new("SoundGroup") — Name, Volume = 0.5, Parent = SoundService',
      'local theme = Instance.new("Sound") — Name, SoundId, Looped, SoundGroup = music, Parent — sonra theme:Play()',
      "prompt.Triggered:Connect(function() if theme.IsPlaying then theme:Stop() else theme:Play() end end)",
    ],
  },
  animations: {
    title: "Emote remote'u",
    goal: "Bir oyuncu istediğinde karakterinde bir emote oynat — ama sadece gerçek emote'lar.",
    steps: [
      "PlayEmote:FireServer(emoteName) bir emote ister",
      "Sadece metin olan ve EMOTES'ta bulunan isimleri kabul et",
      "O AnimationId'li bir Animation'ı karakterin Animator'üne yükle ve oynat",
    ],
    hints: [
      'playEmote.OnServerEvent:Connect(function(player, emoteName) if typeof(emoteName) ~= "string" or not EMOTES[emoteName] then return end … end)',
      'local animator = player.Character.Humanoid:FindFirstChildOfClass("Animator")',
      'local animation = Instance.new("Animation"); animation.AnimationId = EMOTES[emoteName]; animator:LoadAnimation(animation):Play()',
    ],
  },
  camera: {
    title: "Giriş ara sahnesi",
    goal: "Giriş için kamerayı uçur, sonra oyuncuya geri ver.",
    steps: [
      "Kameranın CameraType'ını Scriptable yap",
      "Onu CFrame.lookAt(Vector3.new(0, 50, 50), Vector3.zero)'ya koy",
      "CFrame'ini 2 saniyede CFrame.lookAt(Vector3.new(0, 10, 20), Vector3.zero)'ya tween'le ve bitmesini bekle",
      "CameraType'ı tekrar Custom yap ve Ara sahne bitti yazdır",
    ],
    hints: [
      "camera.CameraType = Enum.CameraType.Scriptable",
      "local fly = TweenService:Create(camera, TweenInfo.new(2), { CFrame = … }) — fly:Play() ve fly.Completed:Wait()",
      'camera.CameraType = Enum.CameraType.Custom ve print("Cutscene over")',
    ],
  },
  "day-night": {
    title: "Sokak lambaları",
    goal: "Lambaları gece yak, gündüz söndür.",
    steps: [
      "workspace.Lamps lamba parçalarından oluşan bir klasör",
      "updateLights() yaz: gece (ClockTime 18 ya da sonrası, veya 6'dan önce) her lambanın Material'ı Neon, değilse Plastic",
      "Başta bir kez ve Lighting.ClockTime her değiştiğinde çağır",
    ],
    hints: [
      "local night = Lighting.ClockTime >= 18 or Lighting.ClockTime < 6",
      "for _, lamp in lamps:GetChildren() do lamp.Material = if night then Enum.Material.Neon else Enum.Material.Plastic end",
      'Lighting:GetPropertyChangedSignal("ClockTime"):Connect(updateLights)',
    ],
  },
  architecture: {
    title: "Yükleyici",
    goal: "Her servisi require eden, sonra hepsini başlatan tek Script'i yaz.",
    steps: [
      "ServerScriptService.Services, ModuleScript'leri (ve belki başka şeyleri) tutuyor",
      "Önce içindeki her ModuleScript'i require et",
      "Sonra Start'ı olan her serviste Start'ı çağır (task.spawn ile) — ancak hepsi require edildikten sonra",
    ],
    hints: [
      'for _, module in ServerScriptService.Services:GetChildren() do if module:IsA("ModuleScript") then … end end',
      "Her birini sakla: services[module.Name] = require(module)",
      "İkinci bir döngü: for _, service in services do if service.Start then task.spawn(service.Start) end end",
    ],
  },
  performance: {
    title: "Sızıntıyı tıka",
    goal: "Her oyuncu hiç temizlenmeyen bir Heartbeat bağlantısı alıyor. Sızıntıyı düzelt.",
    steps: [
      "Oyuncu oyundayken iz çalışmaya devam etsin",
      "Bir oyuncu çıkınca bağlantısını kes",
      "…ve kaydını trails'ten sil",
    ],
    hints: [
      "Players.PlayerRemoving:Connect(function(player) … end)",
      "local connection = trails[player]; if connection then connection:Disconnect() end",
      "trails[player] = nil",
    ],
  },
  monetization: {
    title: "Mağaza",
    goal: "Pass sahiplerine VIP ver ve coin product'larını güvenle sat.",
    steps: [
      "Bir oyuncu girince VIP_PASS_ID game pass'ine sahipse (pcall ile kontrol et) \"VIP\" attribute'unu true yap",
      "ProcessReceipt'te alıcının leaderstats.Coins'ine PRODUCTS[receipt.ProductId] coin ekle ve PurchaseGranted döndür",
      "Oyuncu oyunda değilse ya da ürün bilinmiyorsa NotProcessedYet döndür",
    ],
    hints: [
      "local ok, owns = pcall(MarketplaceService.UserOwnsGamePassAsync, MarketplaceService, player.UserId, VIP_PASS_ID)",
      "MarketplaceService.ProcessReceipt = function(receipt) local player = Players:GetPlayerByUserId(receipt.PlayerId) … end",
      "return Enum.ProductPurchaseDecision.PurchaseGranted (ya da .NotProcessedYet)",
    ],
  },
  teams: {
    title: "Adil takımlar",
    goal: "İki takım oluştur ve oyuncular girdikçe dengeli tut.",
    steps: [
      'Teams servisinde AutoAssignable = false olan bir "Red" (BrickColor "Bright red") ve bir "Blue" (BrickColor "Bright blue") Team\'i oluştur',
      "Her yeni oyuncuyu daha az oyuncusu olan takıma koy (eşitlikte Red)",
      "<isim> şu takıma katıldı: <takım> yazdır — örneğin Ann şu takıma katıldı: Red",
    ],
    hints: [
      'local red = Instance.new("Team") — Name, TeamColor = BrickColor.new("Bright red"), AutoAssignable = false, Parent = Teams',
      "player.Team = if #red:GetPlayers() <= #blue:GetPlayers() then red else blue",
      'print(player.Name .. " joined team " .. player.Team.Name)',
    ],
  },
  capstone: {
    title: "Coin koşusu",
    goal: "Tam bir tur çalıştır: coin çıkar, oyuncuların güvenle toplamasını sağla ve kazananı duyur.",
    steps: [
      "2 saniye sonra bir tur başlat: ServerStorage.Coin'i SPOTS'taki her konuma workspace.Coins içine kopyala",
      "Bir oyuncunun karakterinin dokunduğu coin o oyuncuya bir kez +1 leaderstats Coins verir, sonra kaybolur. Oyuncu olmayan parçalar hiçbir şey yapmaz",
      "ROUND_TIME saniye sonra kalan coinleri kaldır ve en çok coini olan oyuncu için <isim> <n> coinle kazandı! yazdır",
    ],
    hints: [
      "local coin = template:Clone(); coin.Position = spot; coin.Parent = folder — ve her coin için bir local taken = false",
      "coin.Touched: local player = Players:GetPlayerFromCharacter(hit.Parent); if not player or taken then return end",
      "task.wait(ROUND_TIME)'dan sonra: folder:ClearAllChildren(), en iyi oyuncuyu bul, print(`{best.Name} wins with {bestCoins} coins!`)",
    ],
  },
};
