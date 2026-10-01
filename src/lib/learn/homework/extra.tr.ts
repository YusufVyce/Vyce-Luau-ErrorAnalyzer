/** Turkish text for the homework in extra.ts. */
import type { ExerciseText } from "./exercises.tr";

export const EXTRA_TR: Record<string, ExerciseText> = {
  dictionaries: {
    title: "Dükkân fiyat listesi",
    goal: "Dükkânın fiyatlarını bir sözlükte tut ve bir pairs döngüsüyle topla.",
    steps: [
      "prices adında, içinde Sword = 100, Shield = 75 ve Bow = 60 olan bir sözlük oluştur",
      "Ayrı bir satırda ona Potion = 25 ekle",
      "prices üzerinde pairs ile dön ve her fiyatı total adında bir değişkene ekle",
      "Tam olarak şunu yazdır: Toplam: 260",
    ],
    hints: [
      "local prices = { Sword = 100, Shield = 75, Bow = 60 } sözlüğü oluşturur.",
      "prices.Potion = 25 yeni bir anahtar ekler.",
      'for item, price in pairs(prices) do total += price end, sonra print("Toplam: " .. total)',
    ],
  },
  "string-tools": {
    title: "İsim etiketi yapıcı",
    goal: "Bir ismi ve seviyeyi isim etiketine çeviren bir fonksiyon yaz.",
    steps: [
      'makeTag(name, level) fonksiyonunu "[Lv 5] BUILDERMAN" gibi bir metin döndürecek şekilde tamamla: önce seviye, sonra büyük harfle isim',
      'makeTag("builderman", 5) sonucunu yazdır',
      "Büyük harfleri string.upper (ya da :upper()) ile yap — kendin yazma",
    ],
    hints: [
      'string.upper(name), "ann" metnini "ANN" yapar.',
      'return "[Lv " .. level .. "] " .. string.upper(name)',
      "Ya da ters tırnakla: return `[Lv {level}] {name:upper()}`",
    ],
  },
  instances: {
    title: "Coin yağmuru",
    goal: "Haritayı ServerStorage'daki coin şablonunun kopyalarıyla doldur.",
    steps: [
      "ServerStorage'da Coin adında bir Part var. Onu 5 kez Clone ile kopyala",
      "Kopyaları workspace'e (0, 10, 0), (5, 10, 0), (10, 10, 0), (15, 10, 0) ve (20, 10, 0) konumlarına koy",
      "Aslını ServerStorage'da bırak",
    ],
    hints: [
      "for i = 0, 4 do … end, i = 0, 1, 2, 3, 4 ile 5 kez çalışır.",
      "local coin = template:Clone() bir kopya yapar.",
      "coin.Position = Vector3.new(i * 5, 10, 0) ve sonra coin.Parent = workspace",
    ],
  },
  "task-library": {
    title: "Saatli bomba",
    goal: "Scripti durdurmadan task.delay ile bir patlama zamanla.",
    steps: [
      "Şunu yazdır: Bomba kuruldu",
      "task.delay kullan ki 3 saniye sonra BOOM yazsın ve workspace.Bomb'u yok etsin",
      "Zamanladıktan hemen sonra şunu yazdır: Kaç! — BOOM'dan önce görünmeli",
    ],
    hints: [
      "task.delay(3, function() … end) fonksiyonu 3 saniye sonra çalıştırır.",
      'Fonksiyonun içinde: print("BOOM") ve bomb:Destroy()',
      'print("Kaç!") task.delay satırından sonra gelir, içine değil.',
    ],
  },
  attributes: {
    title: "Kilitli kapı",
    goal: "Locked attribute'una uyan bir kapı yap.",
    steps: [
      "workspace.Door'un Locked adında bir attribute'u var (başta true)",
      "Locked her değiştiğinde: false ise Transparency'yi 0.6 ve CanCollide'ı false yap; true ise Transparency 0 ve CanCollide true",
      "GetAttributeChangedSignal ile tepki ver — bir döngüde kontrol etme",
    ],
    hints: [
      'door:GetAttributeChangedSignal("Locked"):Connect(function() … end)',
      'local locked = door:GetAttribute("Locked")',
      "door.Transparency = if locked then 0 else 0.6 ve door.CanCollide = locked",
    ],
  },
  characters: {
    title: "Herkese zıplama botu",
    goal: "Her karaktere daha yüksek zıplama ve biraz daha hız ver — yeniden doğduktan sonra bile.",
    steps: [
      "Bir oyuncunun karakteri her doğduğunda Humanoid'inin JumpPower'ını 80, WalkSpeed'ini 20 yap",
      "Oyuncu ölüp yeniden doğduktan sonra da çalışmalı",
    ],
    hints: [
      "Players.PlayerAdded:Connect(function(player) … end)",
      "İçinde: player.CharacterAdded:Connect(function(character) … end)",
      'local humanoid = character:WaitForChild("Humanoid")',
    ],
  },
  "user-input": {
    title: "Koşma tuşu",
    goal: "Oyuncu LeftShift'i basılı tutarken koşabilsin.",
    steps: [
      "Bu, StarterPlayerScripts'teki bir LocalScript",
      "LeftShift inince oyuncunun Humanoid WalkSpeed'ini 28 yap",
      "LeftShift geri kalkınca tekrar 16 yap",
      "gameProcessed true olan basışları yok say",
    ],
    hints: [
      "UserInputService.InputBegan:Connect(function(input, gameProcessed) … end)",
      "if input.KeyCode == Enum.KeyCode.LeftShift then …",
      "player.Character.Humanoid.WalkSpeed = 28 — ve tekrar 16 yapmak için InputEnded",
    ],
  },
  "remote-functions": {
    title: "Fiyat sorgulayıcı",
    goal: "Dükkânın fiyat sorularını sunucuda bir RemoteFunction ile cevapla.",
    steps: [
      "ReplicatedStorage.GetPrice bir RemoteFunction",
      "OnServerInvoke'unu, istemcinin sorduğu eşyanın fiyatını PRICES'tan döndürecek şekilde ayarla",
      "Bilinmeyen eşyalar nil döndürür (hata yok)",
    ],
    hints: [
      "getPrice.OnServerInvoke = function(player, itemName) … end",
      "İlk parametre her zaman soran oyuncudur.",
      "return PRICES[itemName]",
    ],
  },
  bindables: {
    title: "Tur sonuçları",
    goal: "Tur scriptinin tetiklediği bir BindableEvent'i dinle.",
    steps: [
      "ServerStorage.RoundEnded bir BindableEvent; başka bir script onu kazananın adıyla tetikliyor",
      "Onu dinle ve şunu yazdır: <kazanan> turu kazandı!  (örneğin Ann turu kazandı!)",
      "Her seferinde workspace.RoundsPlayed'e (bir IntValue) de 1 ekle",
    ],
    hints: [
      "roundEnded.Event:Connect(function(winner) … end)",
      'print(winner .. " turu kazandı!")',
      "roundsPlayed.Value += 1",
    ],
  },
  "project-shop": {
    title: "Hız bobini dükkânı",
    goal: "SpeedCoil'i güvenle sat: sunucu fiyatı, coinleri ve sahipliği kontrol eder.",
    steps: [
      "Oyuncular zaten leaderstats.Coins = 200 alıyor",
      "BuyItem \"SpeedCoil\" ile tetiklenince ve oyuncunun en az 150 coini varsa: 150 al ve Backpack'ine ServerStorage.Items.SpeedCoil'in bir kopyasını koy",
      "Zaten SpeedCoil'i olan bir oyuncu bir tane daha alamaz",
      "Bilinmeyen eşyalar bir şey yapmaz",
    ],
    hints: [
      "buyItem.OnServerEvent:Connect(function(player, itemName) … end)",
      "if not price or coins.Value < price then return end",
      "if player.Backpack:FindFirstChild(itemName) then return end",
    ],
  },
  "project-tycoon": {
    title: "Maden toplayıcı",
    goal: "Maden toplayıcıya ulaşınca onu paraya çevir.",
    steps: [
      "workspace.Collector bir parça, workspace.Cash bir IntValue",
      "Value attribute'u olan bir parça toplayıcıya değince o Value'yu Cash'e ekle ve parçayı yok et",
      "Value attribute'u olmayan parçalar (oyuncunun ayağı gibi) yok sayılır",
    ],
    hints: [
      "collector.Touched:Connect(function(hit) … end)",
      'local value = hit:GetAttribute("Value")',
      "if value then cash.Value += value hit:Destroy() end",
    ],
  },
  pcall: {
    title: "Güvenli yükleyici",
    goal: "loadCoins bazen hata veriyor (DataStore meşgul). safeLoad bundan sağ çıksın.",
    steps: [
      "loadCoins'i değiştirme",
      "safeLoad içinde loadCoins'i pcall ile çağır",
      "Çalıştıysa coinleri döndür; başarısız olduysa hata mesajını warn ile yazdır ve 0 döndür",
      "Script çökmeden önce 120, sonra 0 yazdırmalı",
    ],
    hints: [
      "local ok, result = pcall(loadCoins, key)",
      "if ok then return result end",
      "warn(result) sonra return 0",
    ],
  },
  cframes: {
    title: "Nişan al ve kaldır",
    goal: "Bir kuleyi hedefine çevir, sonra bir platformu kaldır — ikisini de CFrame ile.",
    steps: [
      "workspace.Turret'in CFrame.lookAt ile workspace.Target'a bakmasını sağla — kule yerinde kalmalı",
      "workspace.Platform'u CFrame'ine Vector3.new(0, 10, 0) ekleyerek 10 stud yukarı taşı",
    ],
    hints: [
      "turret.CFrame = CFrame.lookAt(turret.Position, target.Position)",
      "platform.CFrame = platform.CFrame + Vector3.new(0, 10, 0)",
    ],
  },
};
