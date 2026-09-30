import { choice, fill, learn, lua, order, predict, t, type PathLesson } from "./types";

export const CH3: Record<string, PathLesson> = {
  parts: {
    emoji: "🧱",
    takeaway: t(
      "Instance.new → set properties → Parent last. Y is up. CFrame also turns.",
      "Instance.new → özellikleri ayarla → Parent en son. Y yukarıdır. CFrame döndürür de.",
    ),
    steps: [
      learn(
        t("Parts from code", "Koddan parça yap"),
        t(
          '`Instance.new("Part")` creates a part. Set its properties, then set `Parent = workspace` to make it appear.',
          '`Instance.new("Part")` bir parça oluşturur. Özelliklerini ayarla, sonra görünmesi için `Parent = workspace` yap.',
        ),
        {
          code: lua`
local part = Instance.new("Part")
part.Size = Vector3.new(8, 1, 8)
part.Anchored = true
part.Parent = workspace
`,
          hook: t(
            "Like baking 🍰: mix everything first, put it on the table (Parent) last.",
            "Pasta yapmak gibi 🍰: önce her şeyi karıştır, masaya (Parent) en son koy.",
          ),
        },
      ),
      fill(
        t("Stop the platform from falling", "Platformun düşmesini engelle"),
        lua`
local part = Instance.new("Part")
part.___ = true
part.Parent = workspace
`,
        ["Anchored", "Locked", "Frozen", "CanFall"],
        0,
        t(
          "Anchored parts ignore gravity and stay where you put them.",
          "Anchored parçalar yer çekimini umursamaz, koyduğun yerde kalır.",
        ),
      ),
      learn(
        t("Vector3 = X, Y, Z", "Vector3 = X, Y, Z"),
        t(
          "Positions and sizes use three numbers: X (left/right), Y (up/down), Z (forward/back).",
          "Konum ve boyut üç sayı kullanır: X (sağ/sol), Y (yukarı/aşağı), Z (ileri/geri).",
        ),
        {
          visual: "coordinates",
          hook: t(
            "Y is the elevator ⬆️: bigger Y = higher up.",
            "Y asansördür ⬆️: Y büyüdükçe daha yukarı.",
          ),
        },
      ),
      choice(
        t("Which position is highest in the sky?", "Hangi konum gökyüzünde en yüksekte?"),
        [
          "Vector3.new(50, 5, 0)",
          "Vector3.new(0, 80, 0)",
          "Vector3.new(0, 10, 90)",
          "Vector3.new(-100, 0, 0)",
        ],
        1,
        t(
          "The middle number is Y (height). 80 is the biggest.",
          "Ortadaki sayı Y'dir (yükseklik). En büyüğü 80.",
        ),
      ),
      predict(
        lua`
local part = Instance.new("Part")
part.Name = "Platform"
part.Parent = workspace
print(part.Name, part.Parent.Name)
`,
        ["Platform Workspace", "Part Workspace", "Platform nil", "Part Platform"],
        0,
        t(
          "We renamed it Platform and put it in Workspace.",
          "Adını Platform yaptık ve Workspace'e koyduk.",
        ),
      ),
      learn(
        t("CFrame = position + rotation", "CFrame = konum + dönüş"),
        t(
          "Position only moves a part. CFrame can also turn it. Multiply by `CFrame.Angles` to spin.",
          "Position parçayı sadece taşır. CFrame döndürebilir de. Döndürmek için `CFrame.Angles` ile çarp.",
        ),
      ),
      choice(
        t("Which line spins a part a little?", "Hangi satır parçayı biraz döndürür?"),
        [
          "part.Position += 2",
          "part.CFrame = part.CFrame * CFrame.Angles(0, math.rad(2), 0)",
          "part.Spin = true",
          "part.Size = Vector3.new(0, 2, 0)",
        ],
        1,
        t(
          "Multiplying a CFrame by an angle rotates it.",
          "Bir CFrame'i açıyla çarpmak onu döndürür.",
        ),
      ),
    ],
  },

  events: {
    emoji: "⚡",
    takeaway: t(
      "event:Connect(function). Touched gives a body part: hit.Parent is the character.",
      "olay:Connect(function). Touched bir vücut parçası verir: hit.Parent karakterdir.",
    ),
    steps: [
      learn(
        t('Events mean "when this happens…"', 'Olay "bu olunca…" demektir'),
        t(
          "An event fires when something happens: a touch, a click, a player joining. `:Connect(function)` tells Roblox what to do then.",
          "Bir şey olunca olay tetiklenir: dokunma, tıklama, oyuncunun girmesi. `:Connect(function)` Roblox'a o an ne yapacağını söyler.",
        ),
        {
          visual: "touched",
          hook: t(
            "A doorbell 🔔: you don't stare at the door, you wait for the ring.",
            "Kapı zili gibi 🔔: kapıya bakıp durmazsın, zilin çalmasını beklersin.",
          ),
        },
      ),
      fill(
        t("Run code when the part is touched", "Parçaya dokununca kod çalıştır"),
        lua`
local part = script.Parent
part.Touched:___(function(hit)
	print(hit.Name)
end)
`,
        ["Connect", "Fire", "Wait", "On"],
        0,
        t("Connect links your function to the event.", "Connect, fonksiyonunu olaya bağlar."),
      ),
      learn(
        t("hit is a body part", "hit bir vücut parçasıdır"),
        t(
          "Touched gives you the part that touched: a leg, an arm, a hat… `hit.Parent` is the character. Find its Humanoid with `FindFirstChildOfClass`.",
          "Touched sana dokunan parçayı verir: bacak, kol, şapka… `hit.Parent` karakterdir. Humanoid'i `FindFirstChildOfClass` ile bul.",
        ),
      ),
      order(
        t("Build a kill brick", "Öldüren blok yap"),
        [
          "script.Parent.Touched:Connect(function(hit)",
          '\tlocal humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")',
          "\tif humanoid then",
          "\t\thumanoid.Health = 0",
          "\tend",
          "end)",
        ],
        t(
          "Connect → find the Humanoid → check it → set Health → close the if, then the function.",
          "Connect → Humanoid'i bul → kontrol et → Health'i ayarla → önce if'i, sonra fonksiyonu kapat.",
        ),
      ),
      learn(
        t("Debounce = only once", "Debounce = sadece bir kez"),
        t(
          "Touched fires many times per second. A true/false variable makes sure the reward happens once.",
          "Touched saniyede defalarca tetiklenir. Bir true/false değişkeni ödülün bir kez verilmesini sağlar.",
        ),
        {
          hook: t("A turnstile 🚧: one person, one click.", "Turnike gibi 🚧: bir kişi, bir tık."),
        },
      ),
      choice(
        t(
          "A coin gives 7 coins per touch instead of 1. What's missing?",
          "Bir coin, dokununca 1 yerine 7 coin veriyor. Eksik olan ne?",
        ),
        [
          t("A debounce", "Debounce"),
          t("Anchored = true", "Anchored = true"),
          t("A LocalScript", "Bir LocalScript"),
          t("A bigger coin", "Daha büyük bir coin"),
        ],
        0,
        t(
          "Without a debounce, every touch event in that second gives a coin.",
          "Debounce olmadan o saniyedeki her dokunma bir coin verir.",
        ),
      ),
      choice(
        t("Why check if humanoid then?", "Neden if humanoid then diye kontrol ederiz?"),
        [
          t(
            "Hats and random parts touch things too, and they have no Humanoid",
            "Şapkalar ve rastgele parçalar da dokunur, onların Humanoid'i yok",
          ),
          t("It makes the script faster", "Scripti hızlandırır"),
          t("Humanoids are always nil", "Humanoid her zaman nil'dir"),
          t("Luau requires it", "Luau bunu zorunlu tutar"),
        ],
        0,
        t(
          "If nothing was found, humanoid is nil, and nil.Health would crash.",
          "Bulunamazsa humanoid nil olur ve nil.Health çöker.",
        ),
      ),
    ],
  },

  leaderstats: {
    emoji: "🏆",
    takeaway: t(
      'A Folder named "leaderstats" + IntValues = a leaderboard. The number is in .Value.',
      "\"leaderstats\" adlı Folder + IntValue'lar = skor tablosu. Sayı .Value'da.",
    ),
    steps: [
      learn(
        t("The magic folder", "Sihirli klasör"),
        t(
          "Put a Folder named exactly `leaderstats` inside a player, with IntValues inside it. Roblox shows them on the leaderboard by itself.",
          "Oyuncunun içine tam olarak `leaderstats` adlı bir Folder koy, içine IntValue'lar ekle. Roblox onları skor tablosunda kendisi gösterir.",
        ),
        {
          visual: "leaderboard",
          hook: t(
            "A scoreboard 📋 Roblox finds by name, so the name must be perfect.",
            "Roblox'un isimle bulduğu bir skor tabelası 📋: isim kusursuz olmalı.",
          ),
        },
      ),
      fill(
        t("Name the folder correctly", "Klasöre doğru adı ver"),
        lua`
local folder = Instance.new("Folder")
folder.Name = "___"
`,
        ["leaderstats", "Leaderstats", "LeaderStats", "stats"],
        0,
        t(
          "All lowercase: leaderstats. Names are case-sensitive.",
          "Hepsi küçük harf: leaderstats. İsimler büyük-küçük harfe duyarlıdır.",
        ),
      ),
      learn(
        t("PlayerAdded", "PlayerAdded"),
        t(
          "`Players.PlayerAdded:Connect(function(player) … end)` runs for every player who joins. That's where you make their stats.",
          "`Players.PlayerAdded:Connect(function(player) … end)` giren her oyuncu için çalışır. İstatistikleri orada oluşturursun.",
        ),
      ),
      learn(
        t(".Value holds the number", "Sayı .Value'da durur"),
        t(
          "Coins is an IntValue object. The number itself lives in `coins.Value`.",
          "Coins bir IntValue nesnesi. Sayının kendisi `coins.Value` içinde.",
        ),
        {
          hook: t(
            "The IntValue is a jar 🫙, .Value is the candy inside.",
            "IntValue bir kavanoz 🫙, .Value içindeki şeker.",
          ),
        },
      ),
      fill(
        t("Add 10 coins", "10 coin ekle"),
        lua`
local coins = Instance.new("IntValue")
coins.___ += 10
print(coins.Value)
`,
        ["Value", "Coins", "Number", "Amount"],
        0,
        t(
          "You change the number with .Value, not the object itself.",
          "Sayıyı nesnenin kendisiyle değil, .Value ile değiştirirsin.",
        ),
      ),
      predict(
        lua`
local coins = Instance.new("IntValue")
coins.Value = 5
coins.Value += 10
print(coins.Value)
`,
        ["15", "10", "5", "510"],
        0,
        t("5 + 10 = 15.", "5 + 10 = 15."),
      ),
      choice(
        t(
          'The leaderboard doesn\'t show up. The folder is named "Leaderstats". Why?',
          'Skor tablosu görünmüyor. Klasörün adı "Leaderstats". Neden?',
        ),
        [
          t(
            "Names are case-sensitive: it must be leaderstats",
            "İsimler harfe duyarlı: leaderstats olmalı",
          ),
          t("IntValues can't be shown", "IntValue'lar gösterilemez"),
          t("You must publish first", "Önce yayınlaman gerekir"),
          t("Only VIPs can see it", "Sadece VIP'ler görebilir"),
        ],
        0,
        t(
          "Roblox looks for exactly leaderstats, all lowercase.",
          "Roblox tam olarak küçük harfli leaderstats'ı arar.",
        ),
      ),
    ],
  },

  gui: {
    emoji: "🖱️",
    takeaway: t(
      "UI = LocalScript. TextButton clicks, TextLabel shows. Size with Scale.",
      "Arayüz = LocalScript. TextButton tıklanır, TextLabel gösterir. Boyutu Scale ile ver.",
    ),
    steps: [
      learn(
        t("UI lives in StarterGui", "Arayüz StarterGui'de yaşar"),
        t(
          "ScreenGui → TextLabel (shows text) or TextButton (can be clicked). Every player gets a copy in their PlayerGui, so UI scripts are LocalScripts.",
          "ScreenGui → TextLabel (metin gösterir) ya da TextButton (tıklanabilir). Her oyuncu PlayerGui'sine bir kopya alır, bu yüzden arayüz scriptleri LocalScript'tir.",
        ),
        {
          hook: t(
            "StarterGui is a stamp 🖨️: every player gets their own print.",
            "StarterGui bir mühür 🖨️: her oyuncu kendi baskısını alır.",
          ),
        },
      ),
      choice(
        t("Which object can be clicked?", "Hangi nesne tıklanabilir?"),
        ["TextLabel", "TextButton", "Frame", "ScreenGui"],
        1,
        t(
          "Buttons (TextButton, ImageButton) have click events. Labels don't.",
          "Butonların (TextButton, ImageButton) tıklama olayı var. Label'ların yok.",
        ),
      ),
      learn(
        t("Clicks are events", "Tıklama bir olaydır"),
        t(
          "`MouseButton1Click` fires when the player clicks. `not` flips a frame open or closed.",
          "`MouseButton1Click` oyuncu tıklayınca tetiklenir. `not` bir çerçeveyi açıp kapatır.",
        ),
        {
          code: lua`
button.MouseButton1Click:Connect(function()
	shopFrame.Visible = not shopFrame.Visible
end)
`,
        },
      ),
      fill(
        t("Toggle the shop open", "Mağazayı aç/kapat"),
        lua`
local shop = Instance.new("Frame")
shop.Visible = false
shop.Visible = ___ shop.Visible
print(shop.Visible)
`,
        ["not", "!", "~", "-"],
        0,
        t(
          'Luau writes "not", not "!". not false is true.',
          'Luau\'da "!" değil "not" yazılır. not false, true olur.',
        ),
      ),
      predict(
        lua`
local visible = false
visible = not visible
visible = not visible
visible = not visible
print(visible)
`,
        ["true", "false", "nil", "not"],
        0,
        t(
          "false → true → false → true. Three flips.",
          "false → true → false → true. Üç kez çevrildi.",
        ),
      ),
      learn(
        t("Scale fits every screen", "Scale her ekrana uyar"),
        t(
          "`UDim2.fromScale(0.5, 0.1)` = half the screen wide, a tenth tall. Scale looks right on phones and PCs.",
          "`UDim2.fromScale(0.5, 0.1)` = ekranın yarısı genişlik, onda biri yükseklik. Scale telefonda da PC'de de doğru görünür.",
        ),
      ),
      choice(
        t(
          "Which size works on both phones and PCs?",
          "Hangi boyut hem telefonda hem PC'de düzgün durur?",
        ),
        [
          "UDim2.fromOffset(800, 100)",
          "UDim2.fromScale(0.5, 0.1)",
          "Vector3.new(5, 1, 0)",
          '"big"',
        ],
        1,
        t(
          "Scale is a fraction of the screen, so it grows and shrinks with it.",
          "Scale ekranın bir oranıdır; ekranla büyüyüp küçülür.",
        ),
      ),
    ],
  },

  tweens: {
    emoji: "🎞️",
    takeaway: t(
      "TweenService:Create(object, TweenInfo, goal):Play(). The goal's type = the property's type.",
      "TweenService:Create(nesne, TweenInfo, hedef):Play(). Hedefin tipi = özelliğin tipi.",
    ),
    steps: [
      learn(
        t("A tween is a smooth change", "Tween yumuşak bir değişimdir"),
        t(
          "Instead of jumping from A to B, a tween slides there over time. `TweenService:Create(object, info, goal):Play()`.",
          "A'dan B'ye zıplamak yerine tween oraya zamanla kayar. `TweenService:Create(nesne, info, hedef):Play()`.",
        ),
        {
          visual: "tween",
          hook: t(
            "Like an animator 🎬 drawing every frame between the start and the end.",
            "Başla bitiş arasındaki her kareyi çizen bir animatör gibi 🎬",
          ),
        },
      ),
      order(
        t("Make a door slide up", "Kapıyı yukarı kaydır"),
        [
          "local door = workspace.Door",
          "local goal = { Position = door.Position + Vector3.new(0, 10, 0) }",
          "local tween = TweenService:Create(door, TweenInfo.new(1), goal)",
          "tween:Play()",
        ],
        t(
          "Each line needs the one before it: door → goal → tween → Play.",
          "Her satır bir öncekine ihtiyaç duyar: kapı → hedef → tween → Play.",
        ),
      ),
      learn(
        t("TweenInfo = how", "TweenInfo = nasıl"),
        t(
          "`TweenInfo.new(1, Enum.EasingStyle.Quad)` = take 1 second, start fast and slow down gently.",
          "`TweenInfo.new(1, Enum.EasingStyle.Quad)` = 1 saniye sürsün, hızlı başlayıp yumuşakça yavaşlasın.",
        ),
      ),
      fill(
        t("Make the tween take 2 seconds", "Tween 2 saniye sürsün"),
        "local info = TweenInfo.new(___)",
        ["2", '"2s"', "2000", "two"],
        0,
        t("The first number is the time in seconds.", "İlk sayı saniye cinsinden süredir."),
      ),
      learn(
        t("Match the property's type", "Özelliğin tipine uy"),
        t(
          "The goal must be the same type as the property: Vector3 for part Position/Size, UDim2 for UI, Color3 for colors.",
          "Hedef, özellikle aynı tipte olmalı: parçanın Position/Size'ı için Vector3, arayüz için UDim2, renk için Color3.",
        ),
      ),
      choice(
        t(
          "Tween a part's Color to red. Which goal?",
          "Bir parçanın Color'ını kırmızıya tween'le. Hangi hedef?",
        ),
        [
          "{ Color = Color3.fromRGB(255, 0, 0) }",
          '{ Color = "red" }',
          "{ Color = Vector3.new(255, 0, 0) }",
          "{ Red = true }",
        ],
        0,
        t(
          "Color is a Color3, so the goal must be a Color3.",
          "Color bir Color3'tür, hedef de Color3 olmalı.",
        ),
      ),
      choice(
        t("What actually starts a tween?", "Bir tween'i gerçekte ne başlatır?"),
        [
          "tween:Play()",
          "tween:Start()",
          "tween.Run = true",
          t("It starts by itself", "Kendiliğinden başlar"),
        ],
        0,
        t(
          "Create only prepares it. :Play() starts it.",
          "Create sadece hazırlar. :Play() başlatır.",
        ),
      ),
    ],
  },

  prompts: {
    emoji: "⌨️",
    takeaway: t(
      "The prompt goes inside the part. Triggered(player) tells you who pressed E.",
      "Prompt parçanın içine konur. Triggered(player) E'ye kimin bastığını söyler.",
    ),
    steps: [
      learn(
        t("Press E to…", "E'ye bas ve…"),
        t(
          'A ProximityPrompt inside a part shows "E  Open" when a player comes close. Keyboard, touch and controller all work.',
          'Parçanın içindeki ProximityPrompt, oyuncu yaklaşınca "E  Aç" gösterir. Klavye, dokunmatik ve oyun kolu hepsi çalışır.',
        ),
        {
          visual: "prompt",
          hook: t(
            "A shop bell 🛎️ that only rings when you stand right next to it.",
            "Sadece yanına gelince çalan bir dükkân zili 🛎️",
          ),
        },
      ),
      choice(
        t("Where does the ProximityPrompt go?", "ProximityPrompt nereye konur?"),
        [
          t("Inside the part (like the door)", "Parçanın içine (kapı gibi)"),
          "StarterGui",
          "Lighting",
          t("The player's Backpack", "Oyuncunun Backpack'i"),
        ],
        0,
        t(
          "The prompt appears at its parent part's position.",
          "Prompt, içinde olduğu parçanın yerinde görünür.",
        ),
      ),
      learn(
        t("Triggered gives the player", "Triggered oyuncuyu verir"),
        t(
          "`prompt.Triggered:Connect(function(player) … end)` so you always know who pressed it.",
          "`prompt.Triggered:Connect(function(player) … end)`: böylece kimin bastığını hep bilirsin.",
        ),
      ),
      fill(
        t("React when someone presses E", "Biri E'ye basınca tepki ver"),
        lua`
prompt.___:Connect(function(player)
	print(player.Name .. " opened the door")
end)
`,
        ["Triggered", "Touched", "Activated", "Pressed"],
        0,
        t("ProximityPrompt's event is Triggered.", "ProximityPrompt'un olayı Triggered'dır."),
      ),
      predict(
        lua`
local isOpen = false
isOpen = not isOpen
print(if isOpen then "Close" else "Open")
`,
        ["Close", "Open", "true", "false"],
        0,
        t(
          "The door is now open, so the button should offer to Close it.",
          "Kapı artık açık, bu yüzden buton kapatmayı (Kapat) önermeli.",
        ),
      ),
      choice(
        t("ActionText changes…", "ActionText neyi değiştirir?"),
        [
          t('The word on the prompt, like "Open"', 'Prompttaki kelimeyi, örneğin "Aç"'),
          t("The key to press", "Basılacak tuşu"),
          t("How far away it shows", "Ne kadar uzaktan göründüğünü"),
          t("The player's name", "Oyuncunun adını"),
        ],
        0,
        t(
          "ActionText is the verb; ObjectText is the thing (Door).",
          "ActionText fiildir; ObjectText ise nesnedir (Kapı).",
        ),
      ),
    ],
  },
};
