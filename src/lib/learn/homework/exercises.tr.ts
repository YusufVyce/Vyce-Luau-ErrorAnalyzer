/** Turkish text for the homework (the graders produce Turkish checks via Harness.t). */
import { localizeCode } from "../codeTr";
import { EXTRA_TR } from "./extra.tr";
import type { Exercise } from "./harness";

export type ExerciseText = Pick<Exercise, "title" | "goal" | "steps" | "hints">;

const TR_BASE: Record<string, ExerciseText> = {
  "studio-tour": {
    title: "Bir özelliği kodla değiştir",
    goal: "Properties penceresindeki her şey bir scriptle de değiştirilebilir. Baseplate üzerinde dene.",
    steps: [
      "Baseplate'i yarı saydam yap: Transparency değerini 0.5 yap.",
      "Baseplate'in Name değerini Output'a yazdır.",
    ],
    hints: [
      "workspace.Baseplate.Transparency = 0.5 özelliği değiştirir. İsim, Properties penceresindekiyle aynıdır.",
      "print(workspace.Baseplate.Name) adını yazdırır. Tırnak yok: parçanın gerçek adını istiyorsun, senin yazdığın metni değil.",
    ],
  },
  "first-script": {
    title: "Merhaba de",
    goal: "Output'a yazı yazdıran iki satır kod yaz.",
    steps: [
      "Tam olarak şunu yazdır: Merhaba Roblox!",
      "7 * 6'nın sonucunu yazdır — hesabı Luau yapsın, 42'yi kendin yazma.",
    ],
    hints: [
      'print("bir metin") Output\'a yazı yazar. Metnin etrafında tırnak olmalı.',
      "Matematik için tırnak gerekmez: print(2 + 2) 4 yazdırır.",
    ],
  },
  "script-types": {
    title: "Her oyuncuya hoş geldin de",
    goal: "Bu sunucu Script'i çöküyor. Giren her oyuncuya hoş geldin diyecek şekilde düzelt.",
    steps: [
      "Şunu yazdırmalı: Hoş geldin, <oyuncu adı>!  (örneğin Hoş geldin, Builderman!)",
      "Sadece bir oyuncu için değil, her oyuncu için çalışmalı.",
      "İpucu: bu sunucudaki bir Script — orada LocalPlayer'ın ne olduğunu düşün.",
    ],
    hints: [
      "Sunucuda Players.LocalPlayer her zaman nil'dir — tek bir oyuncu değil, birçok oyuncu var.",
      "game.Players.PlayerAdded:Connect(function(player) ... end) kullan — Roblox giren her oyuncuyu sana verir.",
    ],
  },
  variables: {
    title: "Seviye atla!",
    goal: "Bir oyuncunun bilgilerini değişkenlerde sakla, seviye atlat ve onlardan oluşan bir mesaj yazdır.",
    steps: [
      'playerName adında, içinde "Builderman" metni olan bir değişken oluştur',
      "level adında, içinde 5 sayısı olan bir değişken oluştur",
      "isVip adında, değeri true olan bir değişken oluştur",
      "Seviye atla: level'a 1 ekle (değişkeni değiştir, 6 yazma)",
      "Şunu yazdır: Builderman seviye 6 — değişkenleri .. ile birleştir",
    ],
    hints: [
      'local playerName = "Builderman" bir metin değişkeni oluşturur.',
      "level = level + 1 (ya da level += 1) bir ekler.",
      'print(playerName .. " seviye " .. level)',
    ],
  },
  "math-strings": {
    title: "Yumurta dükkânı hesabı",
    goal: "Bir oyuncu yumurta alıyor. Geriye kaç coini kaldığını hesapla.",
    steps: [
      "amountText oyuncunun yazdığı bir metin — tonumber ile sayıya çevir",
      "Kalan coini hesapla: coins eksi (amount × eggPrice)",
      "Şunu yazdır: Kalan coin: 250",
    ],
    hints: [
      "local amount = tonumber(amountText)",
      "local left = coins - amount * eggPrice",
      'print("Kalan coin: " .. left)',
    ],
  },
  "if-statements": {
    title: "Tower of Hell bitiş çizgisi",
    goal: "Aşamaya (stage) göre farklı bir mesaj yazdır.",
    steps: [
      'stage 10 ise: "Kazandın!" yazdır',
      'Değilse, stage 7 veya daha fazlaysa: "Az kaldı" yazdır',
      'Hiçbiri değilse: "Tırmanmaya devam" yazdır',
      "Her aşama için SADECE BİR mesaj yazdırılabilir.",
    ],
    hints: [
      "En özel durumla başla: if stage == 10 then",
      "İkinci durum için elseif stage >= 7 then kullan",
      "else ve end ile bitir.",
    ],
  },
  loops: {
    title: "Tur geri sayımı",
    goal: "Tur tabanlı bir oyun gibi geri say, sonra oyuncuları listele.",
    steps: [
      "5, 4, 3, 2, 1 yazdır — her saniye bir sayı (for döngüsü ve task.wait(1) kullan)",
      'Sonra "Başla!" yazdır',
      "Sonra players listesindeki her ismi for … in döngüsüyle yazdır",
    ],
    hints: [
      "for i = 5, 1, -1 do ... end geriye doğru sayar.",
      "task.wait(1)'i geri sayım döngüsünün içine koy.",
      "for _, name in players do print(name) end",
    ],
  },
  functions: {
    title: "Hasar hesaplayıcı",
    goal: "Hasarı hesaplayan, tekrar kullanılabilir bir fonksiyon yaz.",
    steps: [
      "local function calculateDamage(baseDamage, level) oluştur",
      "baseDamage + level * 2 değerini RETURN etmeli",
      "calculateDamage(10, 50) yazdır — 110 göstermeli",
    ],
    hints: [
      "local function calculateDamage(baseDamage, level)\n\treturn ...\nend",
      "return baseDamage + level * 2",
      "print(calculateDamage(10, 50))",
    ],
  },
  tables: {
    title: "Pet envanteri",
    goal: "Bir liste ve bir sözlükle pet envanteri oluştur.",
    steps: [
      'İçinde "Dog" ve "Cat" olan pets adında bir liste oluştur',
      'table.insert ile listeye "Dragon" ekle',
      'Name = "Shadow Dragon", Rarity = "Legendary", Power = 950 olan dragon adında bir sözlük oluştur',
      "Her peti bir for döngüsüyle yazdır",
      "dragon.Rarity'yi yazdır",
    ],
    hints: [
      'local pets = {"Dog", "Cat"}',
      'table.insert(pets, "Dragon")',
      "for _, pet in pets do print(pet) end",
    ],
  },
  parts: {
    title: "Kodla platform yap",
    goal: "Bir scriptle parlayan bir platform oluştur.",
    steps: [
      "Platform adında bir Part oluştur",
      "Size 8, 1, 8 ve Position 0, 10, 0",
      "Düşmemesi için Anchored",
      "Kırmızı (Color3.fromRGB(255, 0, 0)) ve Neon materyal",
      "workspace'e koy",
    ],
    hints: [
      'local part = Instance.new("Part")',
      "part.Size = Vector3.new(8, 1, 8)",
      "part.Material = Enum.Material.Neon",
      "part.Parent = workspace (bunu en son yap)",
    ],
  },
  events: {
    title: "Lav zemin",
    goal: "Lava parçası ona dokunan her oyuncuyu öldürsün — ama çökmeden.",
    steps: [
      "Lava'ya bir şey dokununca hit.Parent içinde bir Humanoid ara",
      "Varsa Health değerini 0 yap",
      "Kayalar, NPC parçaları ve şapkalar da lava'ya değer — scriptin çökmemeli",
    ],
    hints: [
      "lava.Touched:Connect(function(hit) ... end)",
      'local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")',
      "if humanoid then humanoid.Health = 0 end",
    ],
  },
  leaderstats: {
    title: "Simülatör istatistikleri",
    goal: "Her oyuncuya skor tablosunda Coins ve Wins ver, üstüne pasif gelir ekle.",
    steps: [
      "Bir oyuncu girince içinde adı tam olarak leaderstats olan bir Folder oluştur",
      "İçine: 100'den başlayan Coins adında bir IntValue ve 0'dan başlayan Wins adında bir IntValue",
      "Her 5 saniyede her oyuncuya 10 coin ver",
    ],
    hints: [
      "Players.PlayerAdded:Connect(function(player) ... end)",
      'local coins = Instance.new("IntValue") ... coins.Parent = leaderstats',
      "while true do task.wait(5) for _, p in Players:GetPlayers() do ... end end",
    ],
  },
  gui: {
    title: "Dükkân butonu",
    goal: "ShopButton, ShopFrame'i açıp kapatsın.",
    steps: [
      "ShopButton'a tıklamak ShopFrame gizliyse gösterir, görünüyorsa gizler",
      'Dükkân açıkken butonda "Kapat", kapalıyken "Dükkân" yazar',
    ],
    hints: [
      "button.MouseButton1Click:Connect(function() ... end)",
      "shopFrame.Visible = not shopFrame.Visible",
      'button.Text = if shopFrame.Visible then "Kapat" else "Dükkân"',
    ],
  },
  tweens: {
    title: "Kayan kapı",
    goal: "Kapıyı korku oyunlarındaki gibi yumuşakça yukarı kaydır.",
    steps: [
      "workspace.Door'u TweenService ile 8 stud yukarı taşı (Y 5'ten Y 13'e)",
      "Tween 1 saniye sürsün",
      'Tween bitince "Kapı açık" yazdır',
    ],
    hints: [
      "local info = TweenInfo.new(1)",
      "local tween = TweenService:Create(door, info, { Position = door.Position + Vector3.new(0, 8, 0) })",
      'tween:Play() sonra tween.Completed:Wait() sonra print("Kapı açık")',
    ],
  },
  prompts: {
    title: "Brookhaven kapısı",
    goal: "Bir ev kapısını açıp kapatan \"E'ye bas\" prompt'u ekle.",
    steps: [
      'workspace.HouseDoor içinde ActionText değeri "Aç" olan bir ProximityPrompt oluştur',
      'Tetiklenince: Transparency 0.8, CanCollide false, ActionText "Kapat"',
      'Tekrar tetiklenince: Transparency 0, CanCollide true, ActionText "Aç"',
    ],
    hints: [
      'local prompt = Instance.new("ProximityPrompt")\nprompt.ActionText = "Aç"\nprompt.Parent = door',
      "prompt.Triggered:Connect(function(player) ... end)",
      "isOpen = false diye bir değişken tut ve isOpen = not isOpen ile tersine çevir",
    ],
  },
  "remote-events": {
    title: "Güvenli kılıç dükkânı",
    goal: "BuyItem RemoteEvent'ini sunucuda işle — hilecilerin kandırmasına izin verme.",
    steps: [
      "ReplicatedStorage.BuyItem.OnServerEvent'i dinle (ilk parametre oyuncudur!)",
      "Bir Sword 100 coin (leaderstats.Coins). Oyuncunun parası yetiyorsa: coinleri al ve ServerStorage.Items.Sword'un bir kopyasını Backpack'ine koy",
      "Bilinmeyen eşyaları ve parası yetmeyen oyuncuları yok say",
      "Fiyat sunucudan gelmeli — bir hileci fazladan istediği argümanı gönderebilir",
    ],
    hints: [
      "buyItem.OnServerEvent:Connect(function(player, itemName) ... end)",
      "local price = PRICES[itemName]  if not price then return end",
      "ServerStorage.Items[itemName]:Clone().Parent = player.Backpack",
    ],
  },
  datastores: {
    title: "Coinlerimi kaydet",
    goal: "Oyuncu girince coinleri yükle, çıkınca kaydet.",
    steps: [
      '"PlayerCoins" adlı DataStore\'u ve "Player_" .. player.UserId anahtarını kullan',
      "Girişte: Coins adında IntValue içeren leaderstats oluştur ve kayıtlı değeri yükle (yeni oyuncular için 0)",
      "Çıkışta: güncel Coins değerini kaydet",
      "GetAsync/SetAsync'i pcall içine al",
    ],
    hints: [
      'local ok, saved = pcall(function() return coinStore:GetAsync("Player_" .. player.UserId) end)',
      "coins.Value = saved or 0",
      "Players.PlayerRemoving:Connect(function(player) pcall(function() coinStore:SetAsync(key, value) end) end)",
    ],
  },
  modules: {
    title: "Pet ayar modülü",
    goal: "Diğer scriptlerin require ettiği PetConfig ModuleScript'ini yaz.",
    steps: [
      "Modülden bir tablo döndür",
      'Pets olsun: Dog = { Rarity = "Common", Multiplier = 1.5 }, Cat = { Rarity = "Rare", Multiplier = 2 }, Dragon = { Rarity = "Legendary", Multiplier = 10 }',
      "Petin Multiplier değerini, bilinmeyen petler için 1 döndüren getMultiplier(petName) fonksiyonu olsun",
    ],
    hints: [
      'PetConfig.Pets = { Dog = { Rarity = "Common", Multiplier = 1.5 }, ... }',
      "function PetConfig.getMultiplier(petName) ... end",
      "Son satır şu olmalı: return PetConfig",
    ],
  },
  "project-obby": {
    title: "Yeniden doğan coinler",
    goal: "workspace.Coins içindeki her coin toplanabilsin — bir kez — ve 5 saniye sonra geri gelsin.",
    steps: [
      "workspace.Coins:GetChildren() üzerinde döngü kur ve her coine Touched bağla",
      "Bir oyuncu görünür bir coine dokununca: leaderstats.Coins +1 ve coin görünmez olsun (Transparency 1)",
      "Görünmez coin toplanamaz (tek dokunuştan çift coin yok)",
      "5 saniye sonra coin geri gelsin (Transparency 0)",
      "Oyuncu olmayan parçalar hiçbir şeyi bozmamalı",
    ],
    hints: [
      "for _, coin in coinsFolder:GetChildren() do ... end",
      "Her coin için bir değişken kullan: local available = true",
      "task.wait(5) sonra coin.Transparency = 0 ve available = true",
    ],
  },
  debugging: {
    title: "Ödül scriptini düzelt",
    goal: "Bu scriptte 3 hata var. Düzeltmek için Output'taki hataları (istersen analizciyi de) kullan.",
    steps: [
      "Builderman girince 50 coin almalı",
      "Şunu yazdırmalı: Builderman 50 coin kazandı",
      "Output'ta hata olmamalı",
    ],
    hints: [
      'İsimler büyük/küçük harfe duyarlıdır: IntValue\'nun adı "coins" mi "Coins" mi?',
      "Bir objeyi metne ekleyemezsin — coins.Value kullan.",
      "İkinci PlayerAdded'da çağrılan fonksiyonun adına dikkatlice bak.",
    ],
  },
  "collection-service": {
    title: "Kristal mağarası",
    goal: "Crystal etiketli her parça parlasın — oyun çalışırken etiketlenen kristaller dahil.",
    steps: [
      'CollectionService:GetTagged ile "Crystal" etiketli bütün parçaları al',
      "Material'ını Neon, Color'ını Color3.fromRGB(0, 255, 255) yap",
      "Sonradan etiketlenen kristaller de parlamalı (GetInstanceAddedSignal)",
    ],
    hints: [
      "İki özelliği ayarlayan bir glow(part) fonksiyonu yaz.",
      'CollectionService:GetTagged("Crystal") içindeki her parça için çağır.',
      'Ayrıca bağla: CollectionService:GetInstanceAddedSignal("Crystal"):Connect(glow)',
    ],
  },
  runservice: {
    title: "Süzülen platform",
    goal: "workspace.Platform, Y 7 ile Y 13 arasında sonsuza kadar yumuşakça aşağı yukarı süzülsün.",
    steps: [
      "RunService.Heartbeat kullan ve dt'yi bir değişkende (elapsed) topla",
      "Her karede Y'yi 10 + math.sin(elapsed) * 3 yap",
      "X ve Z aynı kalmalı",
    ],
    hints: [
      "Fonksiyonun dışında local elapsed = 0, içinde elapsed += dt.",
      "platform.Position = Vector3.new(platform.Position.X, 10 + math.sin(elapsed) * 3, platform.Position.Z)",
    ],
  },
  raycasting: {
    title: "Yere olan mesafe",
    goal: "Bir konumun yerden ne kadar yüksekte olduğunu raycast ile söyleyen bir fonksiyon yaz.",
    steps: [
      "local function distanceToGround(position) oluştur",
      "position'dan dümdüz aşağı, 100 stud'lık bir ışın at (Vector3.new(0, -100, 0))",
      "Bir şeye çarptıysa result.Distance'ı, yoksa nil döndür",
    ],
    hints: [
      "local result = workspace:Raycast(position, Vector3.new(0, -100, 0))",
      "return if result then result.Distance else nil",
    ],
  },
  oop: {
    title: "Enemy sınıfı",
    goal: "Metatable'larla bir Enemy sınıfı yaz: her düşmanın kendi canı olsun ama aynı metotları paylaşsınlar.",
    steps: [
      "Enemy.new(name, health), Name, Health ve MaxHealth'i olan bir obje döndürür",
      "enemy:TakeDamage(amount) Health'i düşürür ama asla 0'ın altına değil",
      "enemy:IsDead() Health 0 olunca true döndürür",
      "enemy:Heal(amount) Health'i artırır ama asla MaxHealth'in üstüne değil",
    ],
    hints: [
      "function Enemy.new(name, health)\n\tlocal self = setmetatable({}, Enemy)\n\t...\n\treturn self\nend",
      "self.Health = math.max(0, self.Health - amount)",
      "self.Health = math.min(self.MaxHealth, self.Health + amount)",
    ],
  },
  tools: {
    title: "3 kullanımlık iksir",
    goal: "Potion aletini yaz: onu tutanı iyileştirsin ve 3 yudumdan sonra bitsin.",
    steps: [
      "Alet kullanılınca tutanın Humanoid'ini 25 iyileştir",
      "Health asla MaxHealth'i geçmemeli",
      "3. kullanımdan sonra aleti yok et",
    ],
    hints: [
      "tool.Activated:Connect(function() ... end) — alet tutulurken tool.Parent karakterdir.",
      'local humanoid = tool.Parent:FindFirstChildOfClass("Humanoid")',
      "Fonksiyonun dışında local uses = 3 tut; 0'a inince tool:Destroy() çağır.",
    ],
  },
  "round-system": {
    title: "Tur döngüsü",
    goal: "Tur tabanlı bir oyunun döngüsünü yap ve durumunu ReplicatedStorage.Status'ta göster.",
    steps: [
      "ReplicatedStorage içinde Status adında bir StringValue oluştur",
      'Sunucuda kimse yokken: Status = "Oyuncular bekleniyor" (her saniye tekrar kontrol et)',
      'En az bir oyuncu varken: 5 saniye "Ara", sonra 10 saniye "Tur", sonra tekrar',
    ],
    hints: [
      'local status = Instance.new("StringValue") … status.Parent = ReplicatedStorage',
      "while true do … end ve oyuncuları saymak için #Players:GetPlayers()",
      "Döngünün her dalında bir task.wait() olmalı — yoksa sunucu donar.",
    ],
  },
};

const TR: Record<string, ExerciseText> = { ...TR_BASE, ...EXTRA_TR };

/** The exercise with its visible text in the chosen language. */
export function localizeExercise(ex: Exercise, lang: "en" | "tr"): Exercise {
  if (lang !== "tr") return ex;
  const t = TR[ex.lessonId];
  return {
    ...ex,
    ...t,
    starter: localizeCode(ex.starter, lang),
    solution: localizeCode(ex.solution, lang),
  };
}
