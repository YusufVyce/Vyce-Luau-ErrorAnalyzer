/** Plain-language explanations for units 7–9 (lessons.extra.ts). */
import { simple, type Simple } from "./types";

export const SIMPLE_EXTRA: Record<string, Simple> = {
  dictionaries: simple(
    ["A dictionary is a phone book", "Sözlük bir telefon rehberi"],
    [
      "A list finds things by number (item 1, item 2). A dictionary finds things by NAME, like looking up a friend in your phone's contacts.",
      "Liste şeyleri numarayla bulur (1. eleman, 2. eleman). Sözlük ise İSİMLE bulur, telefon rehberinde bir arkadaşını aramak gibi.",
    ],
    [
      [
        "You write name = value pairs: { Sword = 100, Bow = 60 }.",
        "isim = değer çiftleri yazarsın: { Sword = 100, Bow = 60 }.",
      ],
      [
        "prices.Sword gives 100. A name that isn't there gives nil (nothing).",
        "prices.Sword 100 verir. Olmayan bir isim nil (hiçbir şey) verir.",
      ],
      [
        "Add a new name any time: prices.Shield = 75. Remove one with = nil.",
        "İstediğin zaman yeni isim ekle: prices.Shield = 75. = nil ile birini sil.",
      ],
      [
        "pairs() lets you visit every name and value. # does NOT count them (it's only for lists).",
        "pairs() her ismi ve değeri gezmeni sağlar. # onları SAYMAZ (sadece listeler içindir).",
      ],
    ],
    [
      [
        "local prices = { Sword = 100, Bow = 60 }",
        "A phone book with two entries: Sword → 100 and Bow → 60.",
        "İki kayıtlı bir rehber: Sword → 100 ve Bow → 60.",
      ],
      ["print(prices.Sword)", "Look up Sword: 100.", "Sword'a bak: 100."],
      ["prices.Shield = 75", "Add a new entry.", "Yeni bir kayıt ekle."],
      ["for name, price in pairs(prices) do", "Go through every entry…", "Her kaydı gez…"],
      ["    print(name, price)", "…and write its name and value.", "…ve adını ve değerini yaz."],
      ["end", "Done.", "Bitti."],
    ],
  ),

  "string-tools": simple(
    ["Text has its own toolbox", "Yazının kendi alet çantası var"],
    [
      "Players type names, chat and codes. The string library has tools to change that text: make it CAPITAL, cut a piece out, find a word, swap words.",
      "Oyuncular isim, sohbet ve kod yazar. string kütüphanesinde o yazıyı değiştiren aletler var: BÜYÜK harf yap, bir parça kes, bir kelime bul, kelimeleri değiştir.",
    ],
    [
      [
        "name:upper() makes all letters capital. name:lower() makes them small.",
        "name:upper() bütün harfleri büyük yapar. name:lower() küçük yapar.",
      ],
      ["#name tells you how many letters there are.", "#name kaç harf olduğunu söyler."],
      [
        "string.sub(name, 1, 2) cuts out letters 1 to 2, like scissors.",
        "string.sub(name, 1, 2) 1'den 2'ye kadar harfleri keser, makas gibi.",
      ],
      [
        'Why? So "FREEPET", "freepet" and "FreePet" can all count as the same code.',
        'Neden? "FREEPET", "freepet" ve "FreePet" aynı kod sayılabilsin diye.',
      ],
    ],
    [
      ['local name = "noob"', "Some text in a box.", "Bir kutuda biraz yazı."],
      ["print(name:upper())", "All capitals: NOOB.", "Hepsi büyük harf: NOOB."],
      ["print(#name)", "How many letters: 4.", "Kaç harf: 4."],
      [
        "print(string.sub(name, 1, 2))",
        "Cut out letters 1 to 2: no.",
        "1'den 2'ye kadar harfleri kes: no.",
      ],
    ],
  ),

  pcall: simple(
    ["pcall is a safety net", "pcall bir güvenlik ağıdır"],
    [
      "Some code can fail even when you wrote it perfectly. pcall lets you TRY it: if it fails, your script doesn't crash — you just get told 'that didn't work'.",
      "Bazı kodlar mükemmel yazsan bile başarısız olabilir. pcall onu DENEMENİ sağlar: başarısız olursa scriptin çökmez — sadece 'bu işe yaramadı' diye haber alırsın.",
    ],
    [
      [
        "Example: asking Roblox for a player's saved coins. Roblox's computers are far away and sometimes busy. Not your fault — but the request can fail.",
        "Örnek: Roblox'tan bir oyuncunun kayıtlı coinlerini istemek. Roblox'un bilgisayarları uzakta ve bazen meşgul. Senin suçun değil — ama istek başarısız olabilir.",
      ],
      [
        "Without pcall, a failure is an error, and an error STOPS the script right there. Every line below it never runs. The player might get no coins at all.",
        "pcall olmadan başarısızlık bir hatadır ve hata scripti tam orada DURDURUR. Altındaki hiçbir satır çalışmaz. Oyuncu hiç coin alamayabilir.",
      ],
      [
        "pcall means 'protected call'. Think of a tightrope walker with a net under them: if they fall, the net catches them and the show goes on.",
        "pcall 'korumalı çağrı' demek. Altında ağ olan bir ip cambazını düşün: düşerse ağ onu yakalar ve gösteri devam eder.",
      ],
      [
        "You give pcall a function. It tries to run it and gives you TWO answers: ok (true = it worked, false = it failed) and result (the answer, or the error message).",
        "pcall'a bir fonksiyon verirsin. Onu çalıştırmayı dener ve sana İKİ cevap verir: ok (true = işe yaradı, false = başarısız oldu) ve result (cevap ya da hata mesajı).",
      ],
      [
        "Then YOU decide: if it worked, use the result. If it failed, try again later, use a default, or warn.",
        "Sonra SEN karar verirsin: işe yaradıysa sonucu kullan. Başarısız olduysa sonra tekrar dene, varsayılan bir değer kullan ya da uyar.",
      ],
      [
        "Use it only around things that can fail by themselves (DataStores, web requests, buying). Don't wrap your whole script — then you'd hide your own typos.",
        "Onu sadece kendiliğinden başarısız olabilen şeylerin etrafında kullan (DataStore'lar, web istekleri, satın almalar). Bütün scriptini sarma — o zaman kendi yazım hatalarını gizlersin.",
      ],
    ],
    [
      [
        "local ok, result = pcall(function()",
        "Try the code inside, with a safety net. Afterwards, ok will say if it worked and result will hold the answer.",
        "İçerideki kodu güvenlik ağıyla dene. Sonra ok işe yarayıp yaramadığını söyleyecek, result da cevabı tutacak.",
      ],
      [
        '    return store:GetAsync("Player_1")',
        "The risky part: ask Roblox for the saved data. This might fail if Roblox is busy.",
        "Riskli kısım: Roblox'tan kayıtlı veriyi iste. Roblox meşgulse başarısız olabilir.",
      ],
      ["end)", "End of the 'try this' part.", "'Bunu dene' kısmının sonu."],
      ["if ok then", "Did it work?", "İşe yaradı mı?"],
      [
        '    print("Loaded:", result)',
        "Yes: result is the saved data. Use it!",
        "Evet: result kayıtlı veridir. Kullan!",
      ],
      ["else", "No, it failed…", "Hayır, başarısız oldu…"],
      [
        '    warn("Failed:", result)',
        "…result is now the error message. The script did NOT crash — we can warn and try again later.",
        "…result artık hata mesajıdır. Script ÇÖKMEDİ — uyarıp sonra tekrar deneyebiliriz.",
      ],
      ["end", "Either way, the script keeps going.", "Her iki durumda da script devam eder."],
    ],
  ),

  "task-library": simple(
    ["task is the game's timer", "task oyunun zamanlayıcısıdır"],
    [
      "The task library is about WHEN code runs: wait a bit, do something later, or do two things at the same time.",
      "task kütüphanesi kodun NE ZAMAN çalışacağıyla ilgilidir: biraz bekle, bir şeyi sonra yap ya da iki şeyi aynı anda yap.",
    ],
    [
      [
        "task.wait(2) pauses THIS script for 2 seconds, then continues.",
        "task.wait(2) BU scripti 2 saniye durdurur, sonra devam eder.",
      ],
      [
        "task.delay(3, fn) is like setting an alarm: 'in 3 seconds, do this' — and the script keeps going right away.",
        "task.delay(3, fn) alarm kurmak gibidir: '3 saniye sonra bunu yap' — ve script hemen devam eder.",
      ],
      [
        "task.spawn(fn) starts fn right now, side by side with the rest of the script.",
        "task.spawn(fn), fn'i şimdi, scriptin geri kalanıyla yan yana başlatır.",
      ],
    ],
    [
      ['print("Bomb planted")', "Happens first.", "Önce bu olur."],
      [
        "task.delay(3, function()",
        "Set an alarm for 3 seconds from now…",
        "3 saniye sonrasına alarm kur…",
      ],
      ['    print("BOOM")', "…this runs when the alarm rings.", "…bu, alarm çalınca çalışır."],
      ["end)", "End of the alarm code.", "Alarm kodunun sonu."],
      [
        'print("Run!")',
        "Runs immediately — the script didn't wait. So the order is: Bomb planted, Run!, then 3 seconds later BOOM.",
        "Hemen çalışır — script beklemedi. Yani sıra: Bomba kuruldu, Kaç!, 3 saniye sonra da BOOM.",
      ],
    ],
  ),

  attributes: simple(
    [
      "Attributes are name tags you stick on things",
      "Attribute'lar şeylere yapıştırdığın isim etiketleri",
    ],
    [
      "Every part has built-in settings (Color, Size). Attributes are YOUR own extra settings, like a sticky note: 'Locked: true', 'Price: 50'.",
      "Her parçanın hazır ayarları vardır (Color, Size). Attribute'lar SENİN ekstra ayarlarındır, bir yapışkan not gibi: 'Locked: true', 'Price: 50'.",
    ],
    [
      [
        "SetAttribute writes the note. GetAttribute reads it.",
        "SetAttribute notu yazar. GetAttribute okur.",
      ],
      [
        "You can see and edit them in Properties, at the bottom — no script needed to change a price.",
        "Onları Properties'te, en altta görüp düzenleyebilirsin — bir fiyatı değiştirmek için script gerekmez.",
      ],
      [
        "GetAttributeChangedSignal tells you when a note changes, so things react by themselves.",
        "GetAttributeChangedSignal bir not değişince haber verir, böylece şeyler kendiliğinden tepki verir.",
      ],
    ],
    [
      ["local door = workspace.Door", "The door.", "Kapı."],
      [
        'door:SetAttribute("Locked", true)',
        "Stick a note on it: Locked = true.",
        "Üstüne bir not yapıştır: Locked = true.",
      ],
      ['print(door:GetAttribute("Locked"))', "Read the note: true.", "Notu oku: true."],
    ],
  ),

  instances: simple(
    ["Make, copy, delete", "Yap, kopyala, sil"],
    [
      "Everything in Explorer is an Instance. Scripts can make new ones, copy existing ones and throw them away.",
      "Explorer'daki her şey bir Instance'tır. Scriptler yenilerini yapabilir, var olanları kopyalayabilir ve atabilir.",
    ],
    [
      [
        'Instance.new("Part") makes something new, like taking a fresh brick out of the box.',
        'Instance.new("Part") yeni bir şey yapar, kutudan yepyeni bir tuğla çıkarmak gibi.',
      ],
      [
        ":Clone() makes a copy — a photocopy of an existing thing, with all its settings.",
        ":Clone() bir kopya yapar — var olan bir şeyin bütün ayarlarıyla birlikte fotokopisi.",
      ],
      [
        "Parent decides WHERE it lives. Until it has a parent in the world, nobody sees it.",
        "Parent, NEREDE yaşayacağına karar verir. Dünyada bir parent'ı olana kadar kimse onu görmez.",
      ],
      [":Destroy() throws it away for good.", ":Destroy() onu kalıcı olarak çöpe atar."],
    ],
    [
      ['local coin = Instance.new("Part")', "Make a new part.", "Yeni bir parça yap."],
      ['coin.Name = "Coin"', "Name it Coin.", "Adını Coin koy."],
      ["coin.Parent = workspace", "Put it in the world.", "Onu dünyaya koy."],
      ["local copy = coin:Clone()", "Photocopy it.", "Fotokopisini çek."],
      ["copy.Parent = workspace", "Put the copy in the world too.", "Kopyayı da dünyaya koy."],
      [
        "coin:Destroy()",
        "Throw away the first one. The copy stays.",
        "İlkini çöpe at. Kopya kalır.",
      ],
    ],
  ),

  characters: simple(
    ["The character is the player's body", "Karakter oyuncunun bedenidir"],
    [
      "The Player is the person. The Character is their avatar body in the world. Every time they die, they get a NEW body.",
      "Player kişinin kendisidir. Character onun dünyadaki avatar bedenidir. Her öldüğünde YENİ bir beden alır.",
    ],
    [
      [
        "The body is a Model with a Humanoid inside. The Humanoid holds health, walk speed and jump power.",
        "Beden, içinde Humanoid olan bir Model'dir. Humanoid canı, yürüme hızını ve zıplama gücünü tutar.",
      ],
      [
        "Because the body is replaced on respawn, use CharacterAdded: it runs for every new body.",
        "Beden yeniden doğunca değiştiği için CharacterAdded kullan: her yeni beden için çalışır.",
      ],
      [
        "WaitForChild waits until a part of the body has loaded, instead of crashing because it isn't there yet.",
        "WaitForChild, bedenin bir parçası yüklenene kadar bekler; henüz orada olmadığı için çökmek yerine.",
      ],
    ],
    [
      [
        "game.Players.PlayerAdded:Connect(function(player)",
        "When a person joins…",
        "Bir kişi girince…",
      ],
      [
        "    player.CharacterAdded:Connect(function(character)",
        "…every time they get a body (also after dying)…",
        "…her beden aldığında (öldükten sonra da)…",
      ],
      [
        '        local humanoid = character:WaitForChild("Humanoid")',
        "…wait for the Humanoid…",
        "…Humanoid'i bekle…",
      ],
      [
        "        humanoid.WalkSpeed = 30",
        "…and make them faster (normal is 16).",
        "…ve onu hızlandır (normali 16).",
      ],
      ["    end)", "End of the body code.", "Beden kodunun sonu."],
      ["end)", "End of the join code.", "Giriş kodunun sonu."],
    ],
  ),

  "user-input": simple(
    ["UserInputService listens to the keyboard", "UserInputService klavyeyi dinler"],
    [
      "UserInputService tells your LocalScript when the player presses a key, clicks or touches the screen.",
      "UserInputService, oyuncu bir tuşa basınca, tıklayınca ya da ekrana dokununca LocalScript'ine haber verir.",
    ],
    [
      [
        "It only works in a LocalScript, because the keyboard is on the player's own device.",
        "Sadece LocalScript'te çalışır, çünkü klavye oyuncunun kendi cihazındadır.",
      ],
      [
        "InputBegan = a key went down. InputEnded = it came back up.",
        "InputBegan = bir tuşa basıldı. InputEnded = tuş bırakıldı.",
      ],
      [
        "The second value tells you if the player was typing in chat. Ignore those presses, or chatting 'e' would open doors!",
        "İkinci değer oyuncunun sohbete yazıp yazmadığını söyler. O basışları yok say, yoksa sohbette 'e' yazmak kapıları açar!",
      ],
    ],
    [
      [
        'local UserInputService = game:GetService("UserInputService")',
        "The keyboard-and-mouse listener.",
        "Klavye ve fare dinleyicisi.",
      ],
      [
        "UserInputService.InputBegan:Connect(function(input, typing)",
        "When a key goes down…",
        "Bir tuşa basılınca…",
      ],
      [
        "    if typing then return end",
        "…ignore it if they were typing in chat.",
        "…sohbete yazıyorlarsa yok say.",
      ],
      ["    if input.KeyCode == Enum.KeyCode.E then", "Was it the E key?", "E tuşu muydu?"],
      ['        print("E pressed")', "Yes: do something.", "Evet: bir şey yap."],
      ["    end", "End of the check.", "Kontrolün sonu."],
      ["end)", "Done.", "Bitti."],
    ],
  ),

  cframes: simple(
    [
      "A CFrame is where you stand AND where you look",
      "CFrame, nerede durduğun VE nereye baktığın",
    ],
    [
      "Position only says WHERE something is. A CFrame says where it is AND which way it faces — like a person standing on a spot and looking somewhere.",
      "Position sadece bir şeyin NEREDE olduğunu söyler. CFrame nerede olduğunu VE hangi yöne baktığını söyler — bir noktada durup bir yere bakan bir kişi gibi.",
    ],
    [
      [
        "CFrame.new(0, 10, 0) = stand at that point, facing the default way.",
        "CFrame.new(0, 10, 0) = o noktada dur, varsayılan yöne bak.",
      ],
      [
        "CFrame.lookAt(from, to) = stand at from and turn to face to. Great for turrets and cameras.",
        "CFrame.lookAt(from, to) = from'da dur ve to'ya dön. Kuleler ve kameralar için harika.",
      ],
      [
        "Adding a Vector3 to a CFrame moves it without changing where it looks.",
        "Bir CFrame'e Vector3 eklemek onu baktığı yönü değiştirmeden taşır.",
      ],
    ],
    [
      ["local part = workspace.Block", "The block.", "Blok."],
      ["part.CFrame = CFrame.new(0, 10, 0)", "Put it 10 studs up.", "Onu 10 stud yukarı koy."],
      [
        "part.CFrame = CFrame.lookAt(part.Position, Vector3.new(0, 10, 50))",
        "Keep it where it is, but turn it to face the point (0, 10, 50).",
        "Olduğu yerde tut ama (0, 10, 50) noktasına dönsün.",
      ],
    ],
  ),

  "remote-functions": simple(
    [
      "RemoteFunction = a phone call with an answer",
      "RemoteFunction = cevabı olan bir telefon görüşmesi",
    ],
    [
      "A RemoteEvent is like sending a text: you send it and move on. A RemoteFunction is like a phone call: you ask a question and WAIT for the answer.",
      "RemoteEvent mesaj atmak gibidir: gönderirsin ve devam edersin. RemoteFunction telefon görüşmesi gibidir: bir soru sorarsın ve cevabı BEKLERSİN.",
    ],
    [
      [
        "The client asks with InvokeServer(…) and gets back whatever the server returns.",
        "İstemci InvokeServer(…) ile sorar ve sunucunun return ettiği şeyi geri alır.",
      ],
      [
        "The server answers by setting OnServerInvoke to a function.",
        "Sunucu, OnServerInvoke'u bir fonksiyona ayarlayarak cevap verir.",
      ],
      [
        "Use it for questions: 'what does this cost?', 'what's in my inventory?'.",
        "Sorular için kullan: 'bu ne kadar?', 'envanterimde ne var?'.",
      ],
    ],
    [
      [
        "local getPrice = game.ReplicatedStorage.GetPrice",
        "The phone line, on the shared shelf.",
        "Ortak raftaki telefon hattı.",
      ],
      [
        "getPrice.OnServerInvoke = function(player, item)",
        "The server picks up: who called (player) and what they asked about (item).",
        "Sunucu telefonu açar: kim aradı (player) ve neyi sordu (item).",
      ],
      ["    return 100", "The answer the caller gets back.", "Arayanın geri aldığı cevap."],
      ["end", "Hang up.", "Telefonu kapat."],
    ],
  ),

  bindables: simple(
    [
      "A BindableEvent connects scripts on the same side",
      "BindableEvent aynı taraftaki scriptleri bağlar",
    ],
    [
      "RemoteEvents talk between a player's device and the server. A BindableEvent talks between two scripts on the SAME side, like an intercom between rooms of one house.",
      "RemoteEvent'ler oyuncunun cihazı ile sunucu arasında konuşur. BindableEvent ise AYNI taraftaki iki script arasında konuşur, bir evin odaları arasındaki interkom gibi.",
    ],
    [
      [
        "One script calls :Fire(…) to announce something.",
        "Bir script bir şeyi duyurmak için :Fire(…) çağırır.",
      ],
      [
        "Other scripts listen with .Event:Connect(…).",
        "Diğer scriptler .Event:Connect(…) ile dinler.",
      ],
      [
        "This keeps scripts separate: the round script doesn't need to know about the reward script.",
        "Bu, scriptleri ayrı tutar: tur scriptinin ödül scriptini bilmesi gerekmez.",
      ],
    ],
    [
      ["local roundEnded = game.ServerStorage.RoundEnded", "The intercom.", "İnterkom."],
      [
        "roundEnded.Event:Connect(function(winner)",
        "When someone announces on it…",
        "Biri ondan bir şey duyurunca…",
      ],
      ["    print(winner)", "…write who won.", "…kimin kazandığını yaz."],
      ["end)", "End of listening.", "Dinlemenin sonu."],
      ['roundEnded:Fire("Ann")', "Announce: Ann won!", "Duyur: Ann kazandı!"],
    ],
  ),

  "project-shop": simple(
    ["The shop: the player asks, the server checks", "Dükkân: oyuncu ister, sunucu kontrol eder"],
    [
      "In a shop, the player only clicks Buy. The server is the cashier: it checks the price, checks the coins, takes the money and gives the item.",
      "Bir dükkânda oyuncu sadece Satın Al'a basar. Sunucu kasiyerdir: fiyatı kontrol eder, coinleri kontrol eder, parayı alır ve eşyayı verir.",
    ],
    [
      [
        "Prices live on the server. Never trust a price sent by the player — they could send 0.",
        "Fiyatlar sunucuda yaşar. Oyuncunun gönderdiği bir fiyata asla güvenme — 0 gönderebilir.",
      ],
      [
        "If the player can't afford it, the server just does nothing.",
        "Oyuncunun parası yetmiyorsa sunucu hiçbir şey yapmaz.",
      ],
      [
        "The item is a copy (Clone) of a template kept in ServerStorage.",
        "Eşya, ServerStorage'da tutulan bir şablonun kopyasıdır (Clone).",
      ],
    ],
    [
      [
        "buy.OnServerEvent:Connect(function(player, item)",
        "A player clicked Buy for some item.",
        "Bir oyuncu bir eşya için Satın Al'a bastı.",
      ],
      [
        "    local price = PRICES[item]",
        "The cashier looks up the real price.",
        "Kasiyer gerçek fiyata bakar.",
      ],
      ["    local coins = player.leaderstats.Coins", "The player's wallet.", "Oyuncunun cüzdanı."],
      [
        "    if price and coins.Value >= price then",
        "Is it a real item, and can they afford it?",
        "Gerçek bir eşya mı ve parası yetiyor mu?",
      ],
      [
        "        coins.Value -= price",
        "Take the money (then give the item).",
        "Parayı al (sonra eşyayı ver).",
      ],
      ["    end", "Otherwise: nothing happens.", "Yoksa: hiçbir şey olmaz."],
      ["end)", "Done.", "Bitti."],
    ],
  ),

  "project-tycoon": simple(
    ["A tycoon is a little factory", "Tycoon küçük bir fabrika"],
    [
      "In a tycoon, a dropper makes ore, a conveyor carries it, and a collector turns it into cash. Cash buys more droppers. That's the whole game loop!",
      "Bir tycoon'da dropper cevher üretir, konveyör onu taşır, toplayıcı da paraya çevirir. Para daha fazla dropper alır. Bütün oyun döngüsü bu!",
    ],
    [
      [
        "The dropper is a loop: make a part, wait, make another.",
        "Dropper bir döngüdür: bir parça yap, bekle, bir tane daha yap.",
      ],
      [
        "Each ore remembers how much it's worth with an attribute.",
        "Her cevher ne kadar değerli olduğunu bir attribute ile hatırlar.",
      ],
      [
        "The collector's Touched event reads that value, adds it to the cash and destroys the ore.",
        "Toplayıcının Touched olayı o değeri okur, paraya ekler ve cevheri yok eder.",
      ],
    ],
    [
      ["while true do", "Forever:", "Sonsuza kadar:"],
      ['    local ore = Instance.new("Part")', "Make a piece of ore.", "Bir cevher parçası yap."],
      ['    ore:SetAttribute("Value", 5)', "It's worth 5 cash.", "5 para değerinde."],
      ["    ore.Parent = workspace", "Drop it into the world.", "Onu dünyaya bırak."],
      [
        "    task.wait(2)",
        "Wait 2 seconds before the next one.",
        "Sıradakinden önce 2 saniye bekle.",
      ],
      ["end", "Repeat.", "Tekrarla."],
    ],
  ),
};
