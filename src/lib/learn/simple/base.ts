/** Plain-language explanations for the first six units (lessons.ts). */
import { simple, type Simple } from "./types";

export const SIMPLE_BASE: Record<string, Simple> = {
  "studio-tour": simple(
    ["Studio is your workshop", "Studio senin atölyen"],
    [
      "Roblox Studio is the program where games are built. Think of it as a workshop full of tools.",
      "Roblox Studio, oyunların yapıldığı programdır. Onu aletlerle dolu bir atölye gibi düşün.",
    ],
    [
      [
        "The big middle window is your game world. You can fly around in it like a camera.",
        "Ortadaki büyük pencere oyun dünyandır. İçinde bir kamera gibi uçabilirsin.",
      ],
      [
        "Explorer (on the right) is a list of EVERYTHING in your game, like folders on a computer.",
        "Explorer (sağda) oyundaki HER ŞEYİN listesidir, bilgisayardaki klasörler gibi.",
      ],
      [
        "Properties shows the settings of the thing you clicked: its color, size, name…",
        "Properties, tıkladığın şeyin ayarlarını gösterir: rengi, boyutu, adı…",
      ],
      [
        "Output is where your scripts talk to you. Messages and errors appear there.",
        "Output, scriptlerinin seninle konuştuğu yerdir. Mesajlar ve hatalar orada çıkar.",
      ],
      [
        "The Play button starts your game so you can test it.",
        "Play butonu oyununu başlatır, böylece onu test edebilirsin.",
      ],
    ],
    [
      [
        "local floor = workspace.Baseplate",
        "workspace is the game world (the Workspace folder in Explorer). Baseplate is the big grey floor inside it. We give it the nickname floor.",
        "workspace oyun dünyasıdır (Explorer'daki Workspace klasörü). Baseplate onun içindeki büyük gri zemindir. Ona floor diye bir takma ad veriyoruz.",
      ],
      [
        "print(floor.Name)",
        "Writes the floor's name in Output: Baseplate.",
        "Zeminin adını Output'a yazar: Baseplate.",
      ],
      [
        "print(floor.Size)",
        "Writes one of its Properties — its size — in Output.",
        "Özelliklerinden (Properties) birini — boyutunu — Output'a yazar.",
      ],
    ],
  ),

  "first-script": simple(
    [
      "A script is a to-do list for the computer",
      "Script, bilgisayar için bir yapılacaklar listesi",
    ],
    [
      "A script is a list of instructions. The computer reads them from top to bottom and does them one by one.",
      "Script bir talimat listesidir. Bilgisayar onları yukarıdan aşağı okur ve tek tek yapar.",
    ],
    [
      [
        "Imagine giving a robot a note: 'say hello, then say goodbye'. It does exactly that, in that order.",
        "Bir robota bir not verdiğini düşün: 'merhaba de, sonra hoşça kal de'. Tam olarak bunu, bu sırayla yapar.",
      ],
      [
        "print( ) is the simplest instruction: it writes a message in the Output window.",
        "print( ) en basit talimattır: Output penceresine bir mesaj yazar.",
      ],
      [
        'Text goes inside quotes: "Hello!". Numbers don\'t need quotes.',
        'Yazı tırnak içine yazılır: "Hello!". Sayılar tırnak istemez.',
      ],
      [
        "If you make a typo, the script stops and Output shows a red error telling you which line is wrong.",
        "Yazım hatası yaparsan script durur ve Output hangi satırın yanlış olduğunu söyleyen kırmızı bir hata gösterir.",
      ],
    ],
    [
      ['print("Hello!")', "Writes Hello! in Output.", "Output'a Merhaba! yazar."],
      [
        'print("I am a script")',
        "Then the next line runs and writes this message.",
        "Sonra sıradaki satır çalışır ve bu mesajı yazar.",
      ],
      [
        "print(2 + 3)",
        "No quotes, so this is maths: the computer works out 2 + 3 and writes 5.",
        "Tırnak yok, yani bu matematik: bilgisayar 2 + 3'ü hesaplar ve 5 yazar.",
      ],
    ],
  ),

  "script-types": simple(
    ["Server = the kitchen, client = your table", "Sunucu = mutfak, istemci = senin masan"],
    [
      "A Roblox game is like a restaurant. There is one kitchen (the server) and many tables (each player's device).",
      "Bir Roblox oyunu bir restoran gibidir. Tek bir mutfak (sunucu) ve birçok masa (her oyuncunun cihazı) vardır.",
    ],
    [
      [
        "A Script runs in the kitchen — on the server. It controls things for EVERYONE: coins, doors, saving.",
        "Script mutfakta — sunucuda — çalışır. HERKES için olan şeyleri yönetir: coinler, kapılar, kayıt.",
      ],
      [
        "A LocalScript runs at one table — on one player's own device. It handles that player's screen, keyboard and camera.",
        "LocalScript tek bir masada — tek bir oyuncunun cihazında — çalışır. O oyuncunun ekranını, klavyesini ve kamerasını yönetir.",
      ],
      [
        "A ModuleScript is a recipe book: it doesn't do anything alone, other scripts borrow its code with require.",
        "ModuleScript bir tarif kitabıdır: tek başına bir şey yapmaz, diğer scriptler onun kodunu require ile ödünç alır.",
      ],
      [
        "Rule of thumb: important stuff (money, saving) = Script. Things only you see (buttons, camera) = LocalScript.",
        "Pratik kural: önemli şeyler (para, kayıt) = Script. Sadece senin gördüğün şeyler (butonlar, kamera) = LocalScript.",
      ],
    ],
    [
      [
        "local player = game.Players.LocalPlayer",
        "This only works in a LocalScript. LocalPlayer means 'the player sitting at THIS device' — me.",
        "Bu sadece LocalScript'te çalışır. LocalPlayer 'BU cihazda oturan oyuncu' demek — yani ben.",
      ],
      [
        "print(player.Name)",
        "Writes my own name. A server Script can't do this: the server serves everyone, so there is no single 'me' there.",
        "Kendi adımı yazar. Sunucudaki bir Script bunu yapamaz: sunucu herkese hizmet eder, orada tek bir 'ben' yoktur.",
      ],
    ],
  ),

  variables: simple(
    ["A variable is a box with a label", "Değişken, üstünde etiket olan bir kutu"],
    [
      "A variable is a box with a name written on it. You put a value inside and later look in the box by its name.",
      "Değişken, üstüne isim yazılmış bir kutudur. İçine bir değer koyarsın, sonra kutuya ismiyle bakarsın.",
    ],
    [
      [
        "local coins = 100 means: make a box, write 'coins' on it, put 100 inside.",
        "local coins = 100 şu demek: bir kutu yap, üstüne 'coins' yaz, içine 100 koy.",
      ],
      [
        "Later you can put something new in the same box: coins = 150. The old 100 is gone.",
        "Sonra aynı kutuya yeni bir şey koyabilirsin: coins = 150. Eski 100 gider.",
      ],
      [
        'Boxes can hold numbers (100), text ("Ann"), true/false, or nil (an empty box).',
        'Kutular sayı (100), yazı ("Ann"), true/false ya da nil (boş kutu) tutabilir.',
      ],
      [
        "Why bother? So you write the value once and use its name everywhere. Change it in one place, everything updates.",
        "Neden uğraşalım? Değeri bir kez yazıp ismini her yerde kullanmak için. Tek yerden değiştirirsin, her şey güncellenir.",
      ],
    ],
    [
      [
        "local coins = 100",
        "Make a box called coins and put 100 in it. 'local' means this box belongs to this script.",
        "coins adında bir kutu yap ve içine 100 koy. 'local' bu kutunun bu scripte ait olduğu anlamına gelir.",
      ],
      [
        "coins = coins + 50",
        "Look in the box (100), add 50, put the new number (150) back in the same box.",
        "Kutuya bak (100), 50 ekle, yeni sayıyı (150) aynı kutuya geri koy.",
      ],
      [
        "print(coins)",
        "Shows what's in the box now: 150.",
        "Kutuda şu an ne olduğunu gösterir: 150.",
      ],
    ],
  ),

  "math-strings": simple(
    ["Numbers do maths, strings are words", "Sayılar hesap yapar, string'ler kelimedir"],
    [
      "Computers keep numbers and text apart. Numbers can be added and multiplied. Text (called a string) is just letters.",
      "Bilgisayarlar sayıları ve yazıları ayrı tutar. Sayılar toplanıp çarpılabilir. Yazı (string denir) sadece harflerdir.",
    ],
    [
      [
        "+ - * / work like on a calculator: 3 * 2 is 6.",
        "+ - * / hesap makinesindeki gibi çalışır: 3 * 2 = 6.",
      ],
      [
        'A string is text in quotes: "Hello". The computer doesn\'t do maths with it.',
        'String tırnak içindeki yazıdır: "Hello". Bilgisayar onunla hesap yapmaz.',
      ],
      [
        'Two dots .. glue strings together, like sticking two pieces of paper: "Hi " .. "Ann" becomes "Hi Ann".',
        'İki nokta .. string\'leri birbirine yapıştırır, iki kâğıdı yapıştırmak gibi: "Hi " .. "Ann" → "Hi Ann".',
      ],
      [
        'Text typed by a player is always a string, even "5". tonumber("5") turns it into the number 5.',
        'Oyuncunun yazdığı şey her zaman string\'tir, "5" bile. tonumber("5") onu 5 sayısına çevirir.',
      ],
    ],
    [
      ["local apples = 3", "A box with the number 3.", "İçinde 3 sayısı olan bir kutu."],
      ["local price = 2", "A box with the number 2.", "İçinde 2 sayısı olan bir kutu."],
      ["print(apples * price)", "Maths: 3 times 2. Writes 6.", "Hesap: 3 çarpı 2. 6 yazar."],
      [
        'print("Total: " .. apples * price)',
        "First the maths (6), then .. glues it to the text. Writes Total: 6.",
        "Önce hesap (6), sonra .. onu yazıya yapıştırır. Toplam: 6 yazar.",
      ],
    ],
  ),

  "if-statements": simple(
    ["if is a question with two answers", "if, iki cevabı olan bir soru"],
    [
      "An if asks a yes/no question. If the answer is yes, the code inside runs. If no, it's skipped.",
      "if evet/hayır diye bir soru sorar. Cevap evetse içindeki kod çalışır. Hayırsa atlanır.",
    ],
    [
      [
        "Think of a bouncer at a club: IF you are on the list, THEN you go in, ELSE you go home.",
        "Bir kulüpteki görevliyi düşün: listedeysen (if) içeri girersin (then), değilsen (else) eve dönersin.",
      ],
      [
        "The question uses comparisons: == equal, ~= not equal, > bigger, < smaller, >= at least.",
        "Soru karşılaştırma kullanır: == eşit, ~= eşit değil, > büyük, < küçük, >= en az.",
      ],
      [
        "elseif asks another question if the first answer was no. else catches everything left.",
        "elseif, ilk cevap hayırsa başka bir soru sorar. else geriye kalan her şeyi yakalar.",
      ],
      [
        "Every if ends with the word end — it's the closing bracket of the question.",
        "Her if, end kelimesiyle biter — sorunun kapanış parantezi gibidir.",
      ],
    ],
    [
      ["local coins = 120", "The player has 120 coins.", "Oyuncunun 120 coini var."],
      [
        "if coins >= 100 then",
        "The question: is coins at least 100? 120 is, so the answer is yes.",
        "Soru: coins en az 100 mü? 120 öyle, yani cevap evet.",
      ],
      [
        '    print("You can buy it!")',
        "Runs because the answer was yes.",
        "Cevap evet olduğu için çalışır.",
      ],
      ["else", "This part is for a 'no' answer.", "Bu kısım 'hayır' cevabı içindir."],
      ['    print("Save up")', "Skipped this time.", "Bu sefer atlanır."],
      ["end", "The end of the question.", "Sorunun sonu."],
    ],
  ),

  loops: simple(
    ["A loop says 'do it again'", "Döngü 'tekrar yap' der"],
    [
      "A loop repeats code so you don't have to copy it. Like telling someone 'do 10 push-ups' instead of saying 'push-up' 10 times.",
      "Döngü kodu tekrar eder, böylece onu kopyalaman gerekmez. Birine 10 kez 'şınav' demek yerine '10 şınav çek' demek gibi.",
    ],
    [
      [
        "for i = 1, 5 do counts 1, 2, 3, 4, 5 and runs the code once for each number. i is the current number.",
        "for i = 1, 5 do 1, 2, 3, 4, 5 diye sayar ve kodu her sayı için bir kez çalıştırır. i o anki sayıdır.",
      ],
      [
        "while something do keeps going as long as the something is true.",
        "while bir_şey do, o şey doğru olduğu sürece devam eder.",
      ],
      [
        "Careful: a loop that never stops and never waits freezes the game. Put task.wait() inside endless loops.",
        "Dikkat: hiç durmayan ve hiç beklemeyen bir döngü oyunu dondurur. Sonsuz döngülere task.wait() koy.",
      ],
      [
        "for _, item in list do visits every item in a list, one by one.",
        "for _, item in list do bir listedeki her elemanı tek tek gezer.",
      ],
    ],
    [
      [
        "for i = 1, 3 do",
        "Count from 1 to 3. Each time, the box i holds the current number.",
        "1'den 3'e say. Her seferinde i kutusu o anki sayıyı tutar.",
      ],
      [
        '    print("Jump " .. i)',
        "Runs 3 times: Jump 1, Jump 2, Jump 3.",
        "3 kez çalışır: Zıpla 1, Zıpla 2, Zıpla 3.",
      ],
      ["end", "Go back to the top until the counting is done.", "Sayma bitene kadar başa dön."],
    ],
  ),

  functions: simple(
    ["A function is a little machine", "Fonksiyon küçük bir makinedir"],
    [
      "A function is a machine you build once and use many times. You put something in, it does its job, and it can give something back.",
      "Fonksiyon bir kez yapıp çok kez kullandığın bir makinedir. İçine bir şey koyarsın, işini yapar ve geri bir şey verebilir.",
    ],
    [
      [
        "Like a juicer: put in oranges (the input), get juice (the output).",
        "Meyve sıkacağı gibi: portakal koyarsın (girdi), meyve suyu alırsın (çıktı).",
      ],
      [
        "The inputs are called parameters. They go in the brackets: function double(n).",
        "Girdilere parametre denir. Parantezin içine yazılır: function double(n).",
      ],
      [
        "return is how the machine hands the result back to you.",
        "return, makinenin sonucu sana geri verme şeklidir.",
      ],
      [
        "Building the machine doesn't run it. You run it by calling its name with brackets: double(5).",
        "Makineyi yapmak onu çalıştırmaz. İsmini parantezle çağırarak çalıştırırsın: double(5).",
      ],
    ],
    [
      [
        "local function double(n)",
        "Build a machine called double. Whatever you put in will be called n inside it.",
        "double adında bir makine yap. İçine ne koyarsan, içeride ona n denir.",
      ],
      [
        "    return n * 2",
        "The machine's job: give back n times 2.",
        "Makinenin işi: n'nin 2 katını geri vermek.",
      ],
      [
        "end",
        "The machine is finished (but hasn't run yet).",
        "Makine bitti (ama henüz çalışmadı).",
      ],
      [
        "print(double(5))",
        "Now we use it: put 5 in, get 10 back, print it.",
        "Şimdi kullanıyoruz: 5 koy, 10 geri al, onu yazdır.",
      ],
    ],
  ),

  tables: simple(
    [
      "A table is a backpack with numbered pockets",
      "Tablo, numaralı cepleri olan bir sırt çantası",
    ],
    [
      "A variable holds one thing. A table holds many things together, in numbered pockets: 1, 2, 3…",
      "Bir değişken tek bir şey tutar. Tablo birçok şeyi numaralı ceplerde bir arada tutar: 1, 2, 3…",
    ],
    [
      [
        'Make a table with curly brackets: { "Apple", "Banana" }.',
        'Süslü parantezle tablo yaparsın: { "Apple", "Banana" }.',
      ],
      [
        "Get pocket 1 with fruits[1]. In Luau counting starts at 1, not 0.",
        "1. cebi fruits[1] ile alırsın. Luau'da sayma 0'dan değil 1'den başlar.",
      ],
      [
        "table.insert adds something to the next empty pocket. # tells you how many pockets are full.",
        "table.insert sıradaki boş cebe bir şey ekler. # kaç cebin dolu olduğunu söyler.",
      ],
      [
        "Games use tables for inventories, player lists, spawn points — anything that's 'a list of things'.",
        "Oyunlar tabloları envanterler, oyuncu listeleri, doğma noktaları için kullanır — 'bir şeylerin listesi' olan her şey.",
      ],
    ],
    [
      [
        'local fruits = { "Apple", "Banana" }',
        "A backpack with Apple in pocket 1 and Banana in pocket 2.",
        "1. cepte Apple, 2. cepte Banana olan bir sırt çantası.",
      ],
      [
        'table.insert(fruits, "Cherry")',
        "Put Cherry in the next free pocket: pocket 3.",
        "Cherry'yi sıradaki boş cebe koy: 3. cep.",
      ],
      ["print(fruits[1])", "Look in pocket 1: Apple.", "1. cebe bak: Apple."],
      ["print(#fruits)", "How many pockets are full? 3.", "Kaç cep dolu? 3."],
    ],
  ),

  parts: simple(
    ["Parts are LEGO bricks", "Part'lar LEGO tuğlalarıdır"],
    [
      "Everything you see in a Roblox world is built from Parts — like LEGO bricks. A script can make them, move them and paint them.",
      "Bir Roblox dünyasında gördüğün her şey Part'lardan yapılır — LEGO tuğlaları gibi. Bir script onları yapabilir, taşıyabilir ve boyayabilir.",
    ],
    [
      [
        "Every part has properties: Size, Color, Position, Transparency…",
        "Her parçanın özellikleri vardır: Size, Color, Position, Transparency…",
      ],
      [
        "Anchored = true glues the part in the air so it doesn't fall.",
        "Anchored = true parçayı havaya yapıştırır, düşmez.",
      ],
      [
        "A new part is invisible until you set its Parent to workspace — like taking a brick out of the box and putting it on the table.",
        "Yeni bir parça, Parent'ını workspace yapana kadar görünmez — tuğlayı kutudan çıkarıp masaya koymak gibi.",
      ],
    ],
    [
      [
        'local part = Instance.new("Part")',
        "Make a brand-new brick (still in the box).",
        "Yepyeni bir tuğla yap (hâlâ kutuda).",
      ],
      [
        "part.Size = Vector3.new(4, 1, 4)",
        "4 wide, 1 tall, 4 deep: a flat tile.",
        "4 genişlik, 1 yükseklik, 4 derinlik: düz bir karo.",
      ],
      ["part.Color = Color3.fromRGB(255, 0, 0)", "Paint it red.", "Onu kırmızıya boya."],
      ["part.Anchored = true", "Glue it so it doesn't fall.", "Düşmesin diye yapıştır."],
      [
        "part.Parent = workspace",
        "Put it in the world. Now everyone can see it!",
        "Onu dünyaya koy. Artık herkes görebilir!",
      ],
    ],
  ),

  events: simple(
    ["An event is a doorbell", "Olay (event) bir kapı zilidir"],
    [
      "An event is something that happens in the game: a part gets touched, a player joins, a button is clicked.",
      "Olay, oyunda olan bir şeydir: bir parçaya dokunulur, bir oyuncu girer, bir butona basılır.",
    ],
    [
      [
        "It works like a doorbell. You don't stand at the door all day — you wait for the bell.",
        "Kapı zili gibi çalışır. Bütün gün kapıda beklemezsin — zilin çalmasını beklersin.",
      ],
      [
        ":Connect(function() … end) means: 'when the bell rings, do this'.",
        ":Connect(function() … end) şu demek: 'zil çalınca bunu yap'.",
      ],
      [
        "The event can hand you information. Touched tells you WHAT touched the part.",
        "Olay sana bilgi verebilir. Touched, parçaya NEYİN dokunduğunu söyler.",
      ],
    ],
    [
      [
        "local brick = workspace.KillBrick",
        "Find the brick in the world.",
        "Dünyadaki tuğlayı bul.",
      ],
      [
        "brick.Touched:Connect(function(hit)",
        "When something touches it, run this. hit is the thing that touched it (like a foot).",
        "Ona bir şey dokununca bunu çalıştır. hit ona dokunan şeydir (mesela bir ayak).",
      ],
      [
        '    print(hit.Name .. " touched me")',
        "Writes who touched it, e.g. LeftFoot touched me.",
        "Kimin dokunduğunu yazar, örneğin LeftFoot touched me.",
      ],
      [
        "end)",
        "End of 'what to do when the bell rings'.",
        "'Zil çalınca ne yapılacak' kısmının sonu.",
      ],
    ],
  ),

  leaderstats: simple(
    ["leaderstats is the scoreboard", "leaderstats skor tabelasıdır"],
    [
      "The list in the top-right corner of a game (Coins, Wins…) is made by a folder called leaderstats inside each player.",
      "Oyunun sağ üst köşesindeki liste (Coins, Wins…), her oyuncunun içindeki leaderstats adlı bir klasörle yapılır.",
    ],
    [
      [
        "When a player joins, the server makes a folder, names it exactly leaderstats and puts it in the player.",
        "Bir oyuncu girince sunucu bir klasör yapar, adını tam olarak leaderstats koyar ve oyuncunun içine yerleştirir.",
      ],
      [
        "Every number value inside that folder becomes a column on the board.",
        "O klasörün içindeki her sayı değeri tabelada bir sütun olur.",
      ],
      [
        "Change coins.Value and the board updates by itself for everyone.",
        "coins.Value'yu değiştir, tabela herkes için kendiliğinden güncellenir.",
      ],
    ],
    [
      [
        "game.Players.PlayerAdded:Connect(function(player)",
        "Every time a player joins, run this for them.",
        "Bir oyuncu her girdiğinde bunu onun için çalıştır.",
      ],
      ['    local stats = Instance.new("Folder")', "Make a folder.", "Bir klasör yap."],
      [
        '    stats.Name = "leaderstats"',
        "This exact name (lowercase!) makes it a scoreboard.",
        "Bu tam isim (küçük harfle!) onu skor tabelası yapar.",
      ],
      ["    stats.Parent = player", "Put it inside the player.", "Onu oyuncunun içine koy."],
      [
        '    local coins = Instance.new("IntValue")',
        "Make a box that holds a whole number.",
        "Tam sayı tutan bir kutu yap.",
      ],
      ['    coins.Name = "Coins"', "The column will be called Coins.", "Sütunun adı Coins olacak."],
      [
        "    coins.Parent = stats",
        "Put it in the folder: now it's on the board.",
        "Onu klasöre koy: artık tabelada.",
      ],
      ["end)", "Done for this player.", "Bu oyuncu için bitti."],
    ],
  ),

  gui: simple(
    ["UI is stickers on the screen", "Arayüz, ekrandaki çıkartmalardır"],
    [
      "Buttons, health bars and menus are UI. They are flat stickers stuck on the player's screen, not things in the 3D world.",
      "Butonlar, can barları ve menüler arayüzdür (UI). Oyuncunun ekranına yapıştırılmış düz çıkartmalardır, 3B dünyadaki şeyler değil.",
    ],
    [
      [
        "A ScreenGui is the sticker sheet. Inside it you put Frames (boxes), TextLabels (text) and TextButtons (clickable text).",
        "ScreenGui çıkartma kâğıdıdır. İçine Frame'ler (kutular), TextLabel'lar (yazı) ve TextButton'lar (tıklanabilir yazı) koyarsın.",
      ],
      [
        "Put your UI in StarterGui. Every player gets their own copy when they join.",
        "Arayüzünü StarterGui'ye koy. Her oyuncu girince kendi kopyasını alır.",
      ],
      [
        "UI is controlled by a LocalScript, because it lives on that player's screen.",
        "Arayüzü bir LocalScript yönetir, çünkü o oyuncunun ekranında yaşar.",
      ],
    ],
    [
      [
        "local button = script.Parent",
        "The script sits inside the button, so its Parent is the button.",
        "Script butonun içinde duruyor, yani Parent'ı butondur.",
      ],
      [
        "button.MouseButton1Click:Connect(function()",
        "When the player clicks the button with the left mouse button…",
        "Oyuncu butona sol fare tuşuyla tıklayınca…",
      ],
      ['    button.Text = "Clicked!"', "…change the button's text.", "…butonun yazısını değiştir."],
      ["end)", "End of the click code.", "Tıklama kodunun sonu."],
    ],
  ),

  tweens: simple(
    ["A tween is a smooth slide", "Tween yumuşak bir kayma"],
    [
      "If you set a door's position, it teleports. A tween moves it smoothly from where it is to where you want, over time.",
      "Bir kapının konumunu ayarlarsan ışınlanır. Tween onu bulunduğu yerden istediğin yere zamanla yumuşakça götürür.",
    ],
    [
      [
        "You say: 'this object, this long, end up like this'. The computer draws all the frames in between.",
        "Sen şunu söylersin: 'bu nesne, bu kadar sürede, böyle olsun'. Aradaki bütün kareleri bilgisayar çizer.",
      ],
      [
        "You can tween almost any number property: Position, Size, Transparency, Color…",
        "Neredeyse her sayısal özelliği tween'leyebilirsin: Position, Size, Transparency, Color…",
      ],
      [
        "TweenInfo.new(2) means 'take 2 seconds'. Then :Play() starts it.",
        "TweenInfo.new(2) '2 saniye sürsün' demek. Sonra :Play() başlatır.",
      ],
    ],
    [
      [
        'local TweenService = game:GetService("TweenService")',
        "Get the service that does tweens.",
        "Tween yapan servisi al.",
      ],
      [
        "local door = workspace.Door",
        "The door we want to fade away.",
        "Yok etmek istediğimiz kapı.",
      ],
      ["local info = TweenInfo.new(2)", "How long: 2 seconds.", "Ne kadar sürsün: 2 saniye."],
      [
        "local tween = TweenService:Create(door, info, { Transparency = 1 })",
        "Plan it: the door slowly becomes fully see-through (Transparency 1).",
        "Planla: kapı yavaşça tamamen saydam olsun (Transparency 1).",
      ],
      [
        "tween:Play()",
        "Go! The door fades out over 2 seconds.",
        "Başla! Kapı 2 saniyede kaybolur.",
      ],
    ],
  ),

  prompts: simple(
    ["A ProximityPrompt is the 'Press E' bubble", "ProximityPrompt, 'E'ye bas' baloncuğu"],
    [
      "When you walk close to a door and see 'Press E to open', that's a ProximityPrompt. Put one inside a part and it appears by itself.",
      "Bir kapıya yaklaşınca 'Açmak için E'ye bas' yazısını görürsün; işte bu ProximityPrompt. Bir parçanın içine koy, kendiliğinden çıkar.",
    ],
    [
      [
        "It only shows when the player is close enough (MaxActivationDistance).",
        "Sadece oyuncu yeterince yakınken görünür (MaxActivationDistance).",
      ],
      [
        "ActionText is the word on the bubble, like Open or Buy.",
        "ActionText baloncuktaki kelimedir, Open ya da Buy gibi.",
      ],
      [
        "Triggered fires when the player presses the key — and tells you which player it was.",
        "Triggered, oyuncu tuşa basınca tetiklenir — ve hangi oyuncu olduğunu söyler.",
      ],
    ],
    [
      [
        "local prompt = workspace.Door.ProximityPrompt",
        "Find the prompt inside the door.",
        "Kapının içindeki prompt'u bul.",
      ],
      [
        "prompt.Triggered:Connect(function(player)",
        "When someone presses E on it… player is who pressed.",
        "Biri ona E'ye basınca… player basan kişidir.",
      ],
      ['    print(player.Name .. " pressed E")', "Write who it was.", "Kim olduğunu yaz."],
      ["end)", "Done.", "Bitti."],
    ],
  ),

  "remote-events": simple(
    ["A RemoteEvent is a walkie-talkie", "RemoteEvent bir telsizdir"],
    [
      "The player's device and the server are different computers. A RemoteEvent lets them send each other messages, like a walkie-talkie.",
      "Oyuncunun cihazı ve sunucu farklı bilgisayarlardır. RemoteEvent, telsiz gibi birbirlerine mesaj göndermelerini sağlar.",
    ],
    [
      [
        "Example: the player clicks Buy on their screen (LocalScript), but the coins live on the server. The click must travel to the server.",
        "Örnek: oyuncu ekranında Satın Al'a basar (LocalScript), ama coinler sunucuda yaşar. Tıklama sunucuya gitmeli.",
      ],
      [
        "The LocalScript calls remote:FireServer() — 'over, server!'",
        "LocalScript remote:FireServer() çağırır — 'tamam, sunucu!'",
      ],
      [
        "The server listens with remote.OnServerEvent. The first thing it hears is always WHO sent it.",
        "Sunucu remote.OnServerEvent ile dinler. Duyduğu ilk şey her zaman mesajı KİMİN gönderdiğidir.",
      ],
      [
        "Put the RemoteEvent in ReplicatedStorage, the shelf both sides can reach.",
        "RemoteEvent'i ReplicatedStorage'a koy, iki tarafın da uzanabildiği rafa.",
      ],
    ],
    [
      [
        "local remote = game.ReplicatedStorage.BuyItem",
        "The walkie-talkie on the shared shelf.",
        "Ortak raftaki telsiz.",
      ],
      [
        "remote.OnServerEvent:Connect(function(player, item)",
        "The server listens. player = who sent it (filled in by Roblox), item = what they said.",
        "Sunucu dinler. player = kim gönderdi (Roblox doldurur), item = ne dedi.",
      ],
      [
        '    print(player.Name .. " wants " .. item)',
        "e.g. Ann wants Sword.",
        "örneğin Ann wants Sword.",
      ],
      ["end)", "End of listening code.", "Dinleme kodunun sonu."],
    ],
  ),

  datastores: simple(
    ["A DataStore is Roblox's notebook", "DataStore, Roblox'un defteri"],
    [
      "When a player leaves, everything in the server's memory is forgotten. A DataStore is a notebook Roblox keeps for you, so coins are still there next time.",
      "Bir oyuncu çıkınca sunucunun hafızasındaki her şey unutulur. DataStore, Roblox'un senin için tuttuğu bir defterdir; böylece coinler bir dahaki sefere hâlâ orada olur.",
    ],
    [
      [
        "SetAsync writes in the notebook. GetAsync reads it.",
        "SetAsync deftere yazar. GetAsync defterden okur.",
      ],
      [
        'Each page has a name (a key), like "Player_123" — use the player\'s UserId so it never changes.',
        'Her sayfanın bir adı (anahtar) vardır, "Player_123" gibi — asla değişmesin diye oyuncunun UserId\'sini kullan.',
      ],
      [
        "The notebook is on Roblox's computers far away. Sometimes they're busy and the request fails — so wrap it in pcall.",
        "Defter uzaktaki Roblox bilgisayarlarında. Bazen meşguller ve istek başarısız olur — bu yüzden onu pcall ile sar.",
      ],
      [
        "Load when the player joins, save when they leave.",
        "Oyuncu girince yükle, çıkınca kaydet.",
      ],
    ],
    [
      [
        'local DataStoreService = game:GetService("DataStoreService")',
        "The service that manages notebooks.",
        "Defterleri yöneten servis.",
      ],
      [
        'local store = DataStoreService:GetDataStore("Coins")',
        "Open the notebook called Coins.",
        "Coins adlı defteri aç.",
      ],
      [
        "local ok, coins = pcall(function()",
        "Try something risky safely (pcall = safety net).",
        "Riskli bir şeyi güvenle dene (pcall = güvenlik ağı).",
      ],
      [
        '    return store:GetAsync("Player_1")',
        "Read the page called Player_1.",
        "Player_1 adlı sayfayı oku.",
      ],
      ["end)", "End of the risky part.", "Riskli kısmın sonu."],
      [
        "print(ok, coins)",
        "ok = did it work?, coins = what was on the page.",
        "ok = işe yaradı mı?, coins = sayfada ne yazıyordu.",
      ],
    ],
  ),

  modules: simple(
    ["A ModuleScript is a shared toolbox", "ModuleScript ortak bir alet çantası"],
    [
      "If three scripts need the same function, don't copy it three times. Put it in a ModuleScript once and let every script borrow it.",
      "Üç scriptin aynı fonksiyona ihtiyacı varsa onu üç kez kopyalama. Bir kez ModuleScript'e koy ve her script ödünç alsın.",
    ],
    [
      [
        "A module is a table full of tools (functions and values).",
        "Modül, aletlerle (fonksiyonlar ve değerler) dolu bir tablodur.",
      ],
      [
        "Its last line is always return — that's 'here is my toolbox'.",
        "Son satırı her zaman return'dür — 'işte alet çantam' demektir.",
      ],
      [
        "Other scripts get the toolbox with require(theModule).",
        "Diğer scriptler alet çantasını require(modül) ile alır.",
      ],
      [
        "Fix a bug in the module once, and every script that uses it is fixed.",
        "Modüldeki bir hatayı bir kez düzelt, onu kullanan her script düzelmiş olur.",
      ],
    ],
    [
      ["local Tools = {}", "An empty toolbox.", "Boş bir alet çantası."],
      [
        "function Tools.double(n)",
        "Put a tool called double in it…",
        "İçine double adında bir alet koy…",
      ],
      ["    return n * 2", "…that gives back twice the number.", "…sayının iki katını geri veren."],
      ["end", "The tool is done.", "Alet hazır."],
      [
        "return Tools",
        "Hand the toolbox to whoever requires this module.",
        "Bu modülü require eden kişiye alet çantasını ver.",
      ],
    ],
  ),

  "project-obby": simple(
    ["An obby is an obstacle course", "Obby bir engel parkuru"],
    [
      "An obby is a course of jumps and traps. You only need a few small scripts: kill bricks, checkpoints and a finish line.",
      "Obby atlamalardan ve tuzaklardan oluşan bir parkurdur. Sadece birkaç küçük script gerekir: öldüren tuğlalar, checkpoint'ler ve bitiş çizgisi.",
    ],
    [
      [
        "A kill brick sets the touching player's health to 0, so they restart.",
        "Öldüren tuğla, dokunan oyuncunun canını 0 yapar, böylece baştan başlar.",
      ],
      [
        "A checkpoint remembers where the player should come back to after falling.",
        "Checkpoint, oyuncunun düştükten sonra nereye döneceğini hatırlar.",
      ],
      [
        "Build one stage, test it, then copy it and make it harder.",
        "Bir bölüm yap, test et, sonra kopyalayıp zorlaştır.",
      ],
    ],
    [
      [
        "local checkpoint = workspace.Checkpoint",
        "The checkpoint pad (a SpawnLocation).",
        "Checkpoint pedi (bir SpawnLocation).",
      ],
      [
        "checkpoint.Touched:Connect(function(hit)",
        "When something touches the pad…",
        "Pede bir şey dokununca…",
      ],
      [
        "    local player = game.Players:GetPlayerFromCharacter(hit.Parent)",
        "…find out if it was a player's body. If it was a random part, player is nil.",
        "…bir oyuncunun bedeni mi diye bak. Rastgele bir parçaysa player nil olur.",
      ],
      ["    if player then", "Only for real players:", "Sadece gerçek oyuncular için:"],
      [
        "        player.RespawnLocation = checkpoint",
        "Next time they die, they come back here.",
        "Bir dahaki ölümde buraya geri gelirler.",
      ],
      ["    end", "End of the if.", "if'in sonu."],
      ["end)", "End of the touch code.", "Dokunma kodunun sonu."],
    ],
  ),

  debugging: simple(
    ["Errors are clues, not punishments", "Hatalar ceza değil, ipucudur"],
    [
      "Every programmer makes mistakes all day. A red error message isn't the computer being angry — it's a note telling you exactly where to look.",
      "Her programcı bütün gün hata yapar. Kırmızı hata mesajı bilgisayarın kızması değildir — tam olarak nereye bakacağını söyleyen bir nottur.",
    ],
    [
      [
        "An error says three things: which script, which line, and what went wrong.",
        "Bir hata üç şey söyler: hangi script, hangi satır ve ne ters gitti.",
      ],
      [
        "'attempt to index nil' means you used something that doesn't exist (yet) — often a typo in a name.",
        "'attempt to index nil', (henüz) var olmayan bir şeyi kullandın demektir — çoğu zaman bir isimde yazım hatası.",
      ],
      [
        "When you're not sure what's happening, print values to see them in Output.",
        "Ne olduğundan emin değilsen değerleri yazdır, Output'ta gör.",
      ],
      [
        "Paste any error into this site's analyzer and it explains it in plain words.",
        "Herhangi bir hatayı bu sitenin analizcisine yapıştır, sana sade bir dille açıklasın.",
      ],
    ],
    [
      ["local coins = nil", "A box with nothing in it.", "İçinde hiçbir şey olmayan bir kutu."],
      [
        'print("coins is", coins)',
        "Check before using it: writes coins is nil.",
        "Kullanmadan önce kontrol et: coins is nil yazar.",
      ],
      [
        "print(coins + 5)",
        "This crashes: you can't add 5 to nothing. Output shows the line number and 'attempt to perform arithmetic on nil'.",
        "Bu çöker: hiçbir şeye 5 eklenemez. Output satır numarasını ve 'attempt to perform arithmetic on nil' yazar.",
      ],
    ],
  ),

  "collection-service": simple(
    ["Tags are stickers", "Etiketler çıkartmadır"],
    [
      "If you have 50 lava parts, don't put 50 copies of the same script in them. Stick a 'Lava' tag on each part and write ONE script for all of them.",
      "50 lav parçan varsa içlerine aynı scriptten 50 kopya koyma. Her parçaya 'Lava' etiketi yapıştır ve hepsi için TEK bir script yaz.",
    ],
    [
      [
        "You add tags in the Properties window (Tags) or with CollectionService:AddTag.",
        "Etiketleri Properties penceresinden (Tags) ya da CollectionService:AddTag ile eklersin.",
      ],
      [
        'GetTagged("Lava") gives you a list of every part with that sticker.',
        'GetTagged("Lava") o çıkartmanın olduğu her parçanın listesini verir.',
      ],
      [
        "Fix the script once and all 50 lava parts are fixed.",
        "Scripti bir kez düzelt, 50 lav parçası birden düzelir.",
      ],
    ],
    [
      [
        'local CollectionService = game:GetService("CollectionService")',
        "The service that knows about tags.",
        "Etiketleri bilen servis.",
      ],
      [
        'for _, part in CollectionService:GetTagged("Lava") do',
        "Go through every part with the Lava sticker…",
        "Lava çıkartması olan her parçayı gez…",
      ],
      [
        "    part.Touched:Connect(function(hit)",
        "…and give each one a touch event.",
        "…ve her birine bir dokunma olayı ver.",
      ],
      ['        print("lava!")', "What happens when touched.", "Dokununca ne olacağı."],
      ["    end)", "End of the touch code.", "Dokunma kodunun sonu."],
      ["end", "Next part.", "Sıradaki parça."],
    ],
  ),

  runservice: simple(
    ["Heartbeat is the game's heartbeat", "Heartbeat oyunun kalp atışı"],
    [
      "The game redraws itself about 60 times a second. RunService lets you run a bit of code on every one of those beats.",
      "Oyun kendini saniyede yaklaşık 60 kez yeniden çizer. RunService her bir atışta biraz kod çalıştırmanı sağlar.",
    ],
    [
      [
        "Use it for smooth things: spinning parts, following the mouse, timers.",
        "Akıcı şeyler için kullan: dönen parçalar, fareyi takip etmek, sayaçlar.",
      ],
      [
        "dt is how much time passed since the last beat (about 0.016 seconds). Multiply by dt so speed is the same on fast and slow computers.",
        "dt son atıştan beri geçen zamandır (yaklaşık 0.016 saniye). Hız hızlı ve yavaş bilgisayarlarda aynı olsun diye dt ile çarp.",
      ],
      [
        "Keep the code inside short: it runs 60 times every second.",
        "İçindeki kodu kısa tut: her saniye 60 kez çalışır.",
      ],
    ],
    [
      [
        'local RunService = game:GetService("RunService")',
        "The service with the heartbeat.",
        "Kalp atışı olan servis.",
      ],
      [
        "local part = workspace.Spinner",
        "The part we want to spin.",
        "Döndürmek istediğimiz parça.",
      ],
      [
        "RunService.Heartbeat:Connect(function(dt)",
        "On every beat (~60 per second)…",
        "Her atışta (saniyede ~60)…",
      ],
      [
        "    part.CFrame = part.CFrame * CFrame.Angles(0, dt, 0)",
        "…turn the part a tiny bit more. Many tiny turns look like smooth spinning.",
        "…parçayı biraz daha döndür. Çok sayıda minik dönüş akıcı bir dönme gibi görünür.",
      ],
      ["end)", "End of the beat code.", "Atış kodunun sonu."],
    ],
  ),

  raycasting: simple(
    ["A ray is an invisible laser pointer", "Işın görünmez bir lazer işaretçi"],
    [
      "Raycasting shoots an invisible laser from a point in a direction and tells you the first thing it hits.",
      "Raycast, bir noktadan bir yöne görünmez bir lazer atar ve çarptığı ilk şeyi söyler.",
    ],
    [
      [
        "Guns use it to see what a bullet hits. Games use it to check what's under your feet.",
        "Silahlar merminin neye çarptığını görmek için kullanır. Oyunlar ayağının altında ne olduğunu kontrol etmek için kullanır.",
      ],
      [
        "You give a start point and a direction. The direction's length is how far the laser goes.",
        "Bir başlangıç noktası ve bir yön verirsin. Yönün uzunluğu lazerin ne kadar gideceğidir.",
      ],
      [
        "If it hits nothing, you get nil — always check before using the result.",
        "Hiçbir şeye çarpmazsa nil alırsın — sonucu kullanmadan önce hep kontrol et.",
      ],
    ],
    [
      [
        "local origin = Vector3.new(0, 50, 0)",
        "Start 50 studs up in the air.",
        "50 stud yukarıdan başla.",
      ],
      [
        "local direction = Vector3.new(0, -100, 0)",
        "Point straight down, 100 studs long.",
        "Dümdüz aşağı göster, 100 stud uzunluğunda.",
      ],
      ["local result = workspace:Raycast(origin, direction)", "Fire the laser!", "Lazeri ateşle!"],
      ["if result then", "Did it hit anything?", "Bir şeye çarptı mı?"],
      [
        "    print(result.Instance.Name)",
        "Yes: write what it hit, e.g. Baseplate.",
        "Evet: neye çarptığını yaz, örneğin Baseplate.",
      ],
      ["end", "Done.", "Bitti."],
    ],
  ),

  oop: simple(
    ["A class is a cookie cutter", "Sınıf (class) bir kurabiye kalıbıdır"],
    [
      "A class is a cookie cutter, and objects are the cookies. Every cookie has the same shape (methods) but its own toppings (data).",
      "Sınıf bir kurabiye kalıbıdır, nesneler de kurabiyeler. Her kurabiyenin şekli aynıdır (metotlar) ama süslemesi kendine aittir (veri).",
    ],
    [
      [
        'Pet.new("Dog") makes one cookie: a pet object with its own name.',
        'Pet.new("Dog") bir kurabiye yapar: kendi adı olan bir evcil hayvan nesnesi.',
      ],
      [
        "Methods are things every pet can do, like Speak. They're written once in the class.",
        "Metotlar her evcil hayvanın yapabildiği şeylerdir, Speak gibi. Sınıfta bir kez yazılırlar.",
      ],
      [
        "setmetatable links the cookie to the cutter, so the object finds the methods.",
        "setmetatable kurabiyeyi kalıba bağlar, böylece nesne metotları bulur.",
      ],
      [
        "Inside a method, self means 'this particular cookie'.",
        "Bir metodun içinde self 'bu kurabiye' demektir.",
      ],
    ],
    [
      ["local Pet = {}", "The cookie cutter (the class).", "Kurabiye kalıbı (sınıf)."],
      [
        "Pet.__index = Pet",
        "Objects look for missing things (methods) in Pet.",
        "Nesneler eksik şeyleri (metotları) Pet'te arar.",
      ],
      [
        "function Pet.new(name)",
        "The cutting machine: makes a new pet…",
        "Kesme makinesi: yeni bir evcil hayvan yapar…",
      ],
      [
        "    return setmetatable({ Name = name }, Pet)",
        "…with its own name, linked to the cutter.",
        "…kendi adıyla, kalıba bağlı olarak.",
      ],
      ["end", "Done.", "Bitti."],
      [
        "function Pet:Speak()",
        "Something every pet can do.",
        "Her evcil hayvanın yapabildiği bir şey.",
      ],
      [
        '    print(self.Name .. " says hi")',
        "self is the pet you called it on.",
        "self, onu çağırdığın evcil hayvandır.",
      ],
      ["end", "Done.", "Bitti."],
    ],
  ),

  tools: simple(
    ["A Tool is something you hold", "Tool elinde tuttuğun bir şey"],
    [
      "Swords, guns and flashlights are Tools. They sit in the player's backpack, and the player holds one when they equip it.",
      "Kılıçlar, silahlar ve fenerler Tool'dur. Oyuncunun sırt çantasında dururlar, oyuncu birini seçince eline alır.",
    ],
    [
      [
        "A tool needs a part called Handle: that's where the hand grabs it.",
        "Bir aracın Handle adında bir parçası olmalı: el onu oradan tutar.",
      ],
      [
        "Put tools in StarterPack so every player gets them.",
        "Herkes alsın diye araçları StarterPack'e koy.",
      ],
      [
        "Activated fires when the player clicks while holding the tool.",
        "Activated, oyuncu aracı tutarken tıklayınca tetiklenir.",
      ],
    ],
    [
      ["local tool = script.Parent", "The script is inside the tool.", "Script aracın içinde."],
      [
        "tool.Activated:Connect(function()",
        "When the player clicks while holding it…",
        "Oyuncu onu tutarken tıklayınca…",
      ],
      [
        '    print("Swing!")',
        "…swing the sword (here: just a message).",
        "…kılıcı salla (burada: sadece bir mesaj).",
      ],
      ["end)", "Done.", "Bitti."],
    ],
  ),

  "round-system": simple(
    ["A round loop is a match that repeats", "Tur döngüsü tekrar eden bir maç"],
    [
      "Many games repeat the same cycle forever: wait for players, play a round, show the winner, start again. That's one big loop.",
      "Birçok oyun aynı döngüyü sonsuza kadar tekrarlar: oyuncuları bekle, bir tur oyna, kazananı göster, yeniden başla. Bu büyük tek bir döngüdür.",
    ],
    [
      [
        "Like a football match: break time, then 90 minutes, then the result. Then the next match.",
        "Bir futbol maçı gibi: devre arası, sonra 90 dakika, sonra sonuç. Sonra sıradaki maç.",
      ],
      [
        "while true do … end repeats forever. task.wait inside it lets time pass.",
        "while true do … end sonsuza kadar tekrar eder. İçindeki task.wait zamanın geçmesini sağlar.",
      ],
      [
        "Show the time left to players with a value in ReplicatedStorage.",
        "Kalan süreyi oyunculara ReplicatedStorage'daki bir değerle göster.",
      ],
    ],
    [
      ["while true do", "Repeat forever:", "Sonsuza kadar tekrarla:"],
      ['    print("Intermission")', "Break time…", "Ara zamanı…"],
      ["    task.wait(10)", "…for 10 seconds.", "…10 saniye."],
      ['    print("Round started")', "Now the round begins…", "Şimdi tur başlıyor…"],
      ["    task.wait(60)", "…and lasts 60 seconds.", "…ve 60 saniye sürüyor."],
      ["end", "Then back to the top: a new break.", "Sonra başa dön: yeni bir ara."],
    ],
  ),
};
