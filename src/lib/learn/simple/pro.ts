/** Plain-language explanations for units 10–15 (lessons.pro.ts and lessons.pro2.ts). */
import { simple, type Simple } from "./types";

export const SIMPLE_PRO: Record<string, Simple> = {
  "type-checking": simple(
    ["Types are labels on boxes", "Tipler kutulardaki etiketlerdir"],
    [
      "A type says what kind of thing may go in a box: a number, some text, true/false. If you put the wrong thing in, Studio warns you BEFORE you play.",
      "Tip, bir kutuya ne tür bir şey konabileceğini söyler: sayı, yazı, true/false. Yanlış şey koyarsan Studio seni oyunu başlatmadan ÖNCE uyarır.",
    ],
    [
      [
        "Imagine boxes labelled 'only books'. If you try to put a shoe in, someone stops you right away.",
        "Üstünde 'sadece kitap' yazan kutular düşün. İçine ayakkabı koymaya çalışırsan biri seni hemen durdurur.",
      ],
      [
        "You write the type after a colon: local coins: number = 100.",
        "Tipi iki noktadan sonra yazarsın: local coins: number = 100.",
      ],
      [
        "--!strict on the first line turns the checking fully on.",
        "İlk satırdaki --!strict kontrolü tamamen açar.",
      ],
      [
        "Types never change what the game does. They only catch mistakes early — like a spell checker for code.",
        "Tipler oyunun ne yaptığını asla değiştirmez. Sadece hataları erken yakalar — kod için bir yazım denetleyicisi gibi.",
      ],
    ],
    [
      [
        "local coins: number = 100",
        "A box that may only hold numbers.",
        "Sadece sayı tutabilen bir kutu.",
      ],
      [
        'local name: string = "Ann"',
        "A box that may only hold text.",
        "Sadece yazı tutabilen bir kutu.",
      ],
      [
        "local function add(a: number, b: number): number",
        "A machine that takes two numbers and promises to give back a number.",
        "İki sayı alan ve bir sayı geri vereceğine söz veren bir makine.",
      ],
      ["    return a + b", "It keeps its promise.", "Sözünü tutuyor."],
      [
        "end",
        'Done. add(1, "hi") would now get a red underline.',
        'Bitti. add(1, "hi") artık kırmızıyla çizilir.',
      ],
    ],
  ),

  metatables: simple(
    ["A metatable is a secret instruction sheet", "Metatablo gizli bir talimat kâğıdı"],
    [
      "A metatable is a second table glued to the back of a table. It holds special instructions: what to do when a key is missing, when you use +, when you print it…",
      "Metatablo bir tablonun arkasına yapıştırılmış ikinci bir tablodur. Özel talimatlar tutar: bir anahtar eksik olunca, + kullanınca, yazdırınca ne yapılacağı…",
    ],
    [
      [
        "__index: 'if you don't have it, look over there'. Great for default settings.",
        "__index: 'sende yoksa şuraya bak'. Varsayılan ayarlar için harika.",
      ],
      [
        "__add: what + means for your table. __tostring: what print shows.",
        "__add: senin tablon için +'nın anlamı. __tostring: print'in ne göstereceği.",
      ],
      [
        "setmetatable(t, mt) glues the instruction sheet mt onto t.",
        "setmetatable(t, mt), mt talimat kâğıdını t'ye yapıştırır.",
      ],
    ],
    [
      ["local defaults = { Speed = 16 }", "The default settings.", "Varsayılan ayarlar."],
      [
        "local settings = setmetatable({}, { __index = defaults })",
        "An empty table with an instruction: 'if something is missing, look in defaults'.",
        "Talimatı olan boş bir tablo: 'bir şey eksikse defaults'a bak'.",
      ],
      [
        "print(settings.Speed)",
        "settings has no Speed, so it follows the instruction and finds 16 in defaults.",
        "settings'te Speed yok, talimata uyar ve defaults'ta 16'yı bulur.",
      ],
    ],
  ),

  inheritance: simple(
    [
      "Inheritance: children get their parent's skills",
      "Kalıtım: çocuk ebeveyninin yeteneklerini alır",
    ],
    [
      "A Boss is a kind of Enemy. Instead of writing everything again, Boss INHERITS all of Enemy's abilities and only adds or changes what's different.",
      "Boss bir tür Enemy'dir. Her şeyi baştan yazmak yerine Boss, Enemy'nin bütün yeteneklerini MİRAS ALIR ve sadece farklı olanı ekler ya da değiştirir.",
    ],
    [
      [
        "Like a child who inherits their parent's eye color but has their own hobbies.",
        "Ebeveyninin göz rengini alan ama kendi hobileri olan bir çocuk gibi.",
      ],
      [
        "If Boss doesn't have a method, Luau looks in Enemy. That's done with __index.",
        "Boss'ta bir metot yoksa Luau Enemy'ye bakar. Bu __index ile yapılır.",
      ],
      [
        "Boss can also write its own version of a method — that's called overriding.",
        "Boss bir metodun kendi sürümünü de yazabilir — buna override (ezme) denir.",
      ],
    ],
    [
      [
        "local Boss = setmetatable({}, { __index = Enemy })",
        "Make Boss, and say: 'whatever Boss doesn't have, get from Enemy'.",
        "Boss'u yap ve de ki: 'Boss'ta olmayanı Enemy'den al'.",
      ],
      [
        "Boss.__index = Boss",
        "Boss objects look in Boss first.",
        "Boss nesneleri önce Boss'a bakar.",
      ],
      [
        "function Boss:Attack()",
        "Boss's own Attack, replacing Enemy's…",
        "Boss'un kendi Attack'i, Enemy'ninkinin yerine…",
      ],
      [
        "    return Enemy.Attack(self) * 3",
        "…it asks the parent's Attack for the normal damage and triples it.",
        "…normal hasarı üst sınıfın Attack'ine sorar ve üçe katlar.",
      ],
      ["end", "Done.", "Bitti."],
    ],
  ),

  closures: simple(
    ["A closure is a function with a backpack", "Closure sırt çantası olan bir fonksiyon"],
    [
      "When you make a function inside another function, the inner one carries a backpack with the outer function's variables. It remembers them, even later.",
      "Bir fonksiyonun içinde başka bir fonksiyon yapınca, içteki fonksiyon dıştaki fonksiyonun değişkenlerini bir sırt çantasında taşır. Onları sonra bile hatırlar.",
    ],
    [
      [
        "Example: a counter that remembers how many times it was used.",
        "Örnek: kaç kez kullanıldığını hatırlayan bir sayaç.",
      ],
      [
        "Each time you make a new counter, it gets its own backpack. Two counters never mix up their numbers.",
        "Her yeni sayaç yaptığında kendi sırt çantasını alır. İki sayaç sayılarını asla karıştırmaz.",
      ],
      [
        "Functions are values: you can put them in boxes, give them to other functions and get them back.",
        "Fonksiyonlar değerdir: onları kutulara koyabilir, başka fonksiyonlara verebilir ve geri alabilirsin.",
      ],
    ],
    [
      [
        "local function makeCounter()",
        "A machine that builds counters.",
        "Sayaç üreten bir makine.",
      ],
      [
        "    local count = 0",
        "The number that goes in the backpack.",
        "Sırt çantasına giren sayı.",
      ],
      [
        "    return function()",
        "Build a little counter and hand it out…",
        "Küçük bir sayaç yap ve ver…",
      ],
      [
        "        count += 1",
        "…each time it's used, add 1 to the number in its backpack…",
        "…her kullanıldığında çantasındaki sayıya 1 ekle…",
      ],
      ["        return count", "…and say the new number.", "…ve yeni sayıyı söyle."],
      ["    end", "End of the little counter.", "Küçük sayacın sonu."],
      ["end", "End of the machine.", "Makinenin sonu."],
    ],
  ),

  coroutines: simple(
    ["A coroutine is a function you can pause", "Coroutine durdurulabilen bir fonksiyon"],
    [
      "Normally a function runs from start to end in one go. A coroutine can stop in the middle — like pausing a video — and continue later from the exact same spot.",
      "Normalde bir fonksiyon baştan sona tek seferde çalışır. Coroutine ise ortada durabilir — bir videoyu duraklatmak gibi — ve sonra tam aynı yerden devam eder.",
    ],
    [
      ["coroutine.yield() = press pause.", "coroutine.yield() = duraklata bas."],
      [
        "coroutine.resume(co) = press play. It continues right after the last pause.",
        "coroutine.resume(co) = oynata bas. Son duraklamanın hemen arkasından devam eder.",
      ],
      [
        "task.spawn and task.wait use coroutines behind the scenes. You use them every day without noticing.",
        "task.spawn ve task.wait perde arkasında coroutine kullanır. Farkında olmadan her gün kullanıyorsun.",
      ],
    ],
    [
      [
        "local co = coroutine.create(function()",
        "Make a pausable function (it doesn't start yet).",
        "Duraklatılabilir bir fonksiyon yap (henüz başlamaz).",
      ],
      ['    print("A")', "Part 1.", "1. kısım."],
      ["    coroutine.yield()", "Pause here.", "Burada duraklat."],
      ['    print("B")', "Part 2.", "2. kısım."],
      ["end)", "End of the function.", "Fonksiyonun sonu."],
      ["coroutine.resume(co)", "Play: prints A, then pauses.", "Oynat: A yazar, sonra durur."],
      [
        "coroutine.resume(co)",
        "Play again: continues and prints B.",
        "Tekrar oynat: devam eder ve B yazar.",
      ],
    ],
  ),

  "session-data": simple(
    ["Pencil during the day, pen at night", "Gün içinde kurşun kalem, akşam tükenmez"],
    [
      "Saving to Roblox after every coin is slow and gets blocked. Instead, keep the player's data in a table while they play, and save it to the DataStore once when they leave.",
      "Her coinden sonra Roblox'a kaydetmek yavaştır ve engellenir. Bunun yerine oyuncunun verisini oynarken bir tabloda tut ve çıkınca DataStore'a bir kez kaydet.",
    ],
    [
      [
        "Like writing your shopping list in pencil all day, then copying it into your notebook at night.",
        "Bütün gün alışveriş listeni kurşun kalemle yazıp akşam deftere geçirmek gibi.",
      ],
      [
        "The table is called the session: sessions[player] = their data.",
        "Bu tabloya oturum (session) denir: sessions[player] = verisi.",
      ],
      [
        "Save when they leave, when the server shuts down, and every few minutes just in case.",
        "Çıkınca, sunucu kapanınca ve her ihtimale karşı birkaç dakikada bir kaydet.",
      ],
      [
        "If loading failed, NEVER save — you'd write an empty page over their real progress.",
        "Yükleme başarısız olduysa ASLA kaydetme — gerçek ilerlemesinin üstüne boş bir sayfa yazarsın.",
      ],
    ],
    [
      [
        "local sessions = {}",
        "One table for everyone's data while they play.",
        "Oynarken herkesin verisi için tek bir tablo.",
      ],
      [
        "Players.PlayerAdded:Connect(function(player)",
        "When a player joins…",
        "Bir oyuncu girince…",
      ],
      [
        "    sessions[player] = { Coins = 0 }",
        "…give them a page (really: load it from the DataStore).",
        "…ona bir sayfa ver (gerçekte: DataStore'dan yükle).",
      ],
      ["end)", "Done.", "Bitti."],
      ["Players.PlayerRemoving:Connect(function(player)", "When they leave…", "Çıkınca…"],
      [
        "    save(player)",
        "…copy the page into the DataStore notebook…",
        "…sayfayı DataStore defterine geçir…",
      ],
      [
        "    sessions[player] = nil",
        "…and throw away the pencil page.",
        "…ve kurşun kalem sayfasını at.",
      ],
      ["end)", "Done.", "Bitti."],
    ],
  ),

  "global-leaderboards": simple(
    ["A league table for every player ever", "Gelmiş geçmiş bütün oyuncular için puan tablosu"],
    [
      "A normal DataStore is a pile of pages in no order. An OrderedDataStore keeps whole numbers SORTED, like a sports league table, so you can ask for the top 10.",
      "Normal bir DataStore sırasız bir sayfa yığınıdır. OrderedDataStore tam sayıları SIRALI tutar, bir spor ligi tablosu gibi; böylece ilk 10'u isteyebilirsin.",
    ],
    [
      ["SetAsync(name, wins) writes a score.", "SetAsync(isim, galibiyet) bir skor yazar."],
      [
        "GetSortedAsync(false, 10) asks for the 10 biggest (false = biggest first).",
        "GetSortedAsync(false, 10) en büyük 10'u ister (false = en büyük önce).",
      ],
      [
        "Refresh the board every minute or so — asking too often gets blocked.",
        "Panoyu yaklaşık dakikada bir yenile — çok sık sormak engellenir.",
      ],
    ],
    [
      [
        'local wins = DataStoreService:GetOrderedDataStore("Wins")',
        "Open the sorted notebook Wins.",
        "Sıralı Wins defterini aç.",
      ],
      ['wins:SetAsync("Ann", 75)', "Ann has 75 wins.", "Ann'in 75 galibiyeti var."],
      [
        "local page = wins:GetSortedAsync(false, 10):GetCurrentPage()",
        "Get the top 10, biggest first.",
        "En büyük önce, ilk 10'u al.",
      ],
      [
        "for rank, entry in ipairs(page) do",
        "Go through them in order: rank 1, 2, 3…",
        "Sırayla gez: 1., 2., 3…",
      ],
      ["    print(rank, entry.key, entry.value)", "e.g. 1 Ann 75.", "örneğin 1 Ann 75."],
      ["end", "Done.", "Bitti."],
    ],
  ),

  serialization: simple(
    ["Take it apart to save it", "Kaydetmek için parçalarına ayır"],
    [
      "A DataStore only understands simple things: numbers, text, true/false and tables of those. A Vector3 or Color3 must be taken apart into numbers first — like flat-pack furniture.",
      "DataStore sadece basit şeyleri anlar: sayılar, yazı, true/false ve bunların tabloları. Vector3 ya da Color3 önce sayılara ayrılmalı — demonte mobilya gibi.",
    ],
    [
      [
        "Save: Vector3 (10, 5, 3) → the table { 10, 5, 3 }.",
        "Kaydet: Vector3 (10, 5, 3) → { 10, 5, 3 } tablosu.",
      ],
      [
        "Load: { 10, 5, 3 } → Vector3.new(10, 5, 3) again.",
        "Yükle: { 10, 5, 3 } → tekrar Vector3.new(10, 5, 3).",
      ],
      [
        "Parts can't be saved at all. Save what you need to rebuild them: name, position, color.",
        "Parçalar hiç kaydedilemez. Onları yeniden kurmak için gerekenleri kaydet: isim, konum, renk.",
      ],
    ],
    [
      [
        "local pos = part.Position",
        "A Vector3 — can't be saved as it is.",
        "Bir Vector3 — olduğu gibi kaydedilemez.",
      ],
      [
        "local saved = { pos.X, pos.Y, pos.Z }",
        "Take it apart into three plain numbers. This CAN be saved.",
        "Onu üç düz sayıya ayır. Bu KAYDEDİLEBİLİR.",
      ],
      [
        "local back = Vector3.new(saved[1], saved[2], saved[3])",
        "After loading, build the Vector3 again from the numbers.",
        "Yükledikten sonra Vector3'ü sayılardan tekrar kur.",
      ],
    ],
  ),

  "cross-server": simple(
    ["Servers are separate rooms with a loudspeaker", "Sunucular hoparlörü olan ayrı odalar"],
    [
      "Your game runs in many servers at once, and they can't see each other. MessagingService is a loudspeaker system: one server announces, all the others hear it.",
      "Oyunun aynı anda birçok sunucuda çalışır ve birbirlerini göremezler. MessagingService bir hoparlör sistemidir: bir sunucu duyurur, diğerlerinin hepsi duyar.",
    ],
    [
      [
        "SubscribeAsync(\"News\", fn) = 'tune in to the News channel'.",
        "SubscribeAsync(\"News\", fn) = 'News kanalını aç'.",
      ],
      [
        "PublishAsync(\"News\", data) = 'announce this on the News channel'.",
        "PublishAsync(\"News\", data) = 'bunu News kanalında duyur'.",
      ],
      [
        "Use it for rare, big news — not for every coin, or it gets blocked.",
        "Nadir, büyük haberler için kullan — her coin için değil, yoksa engellenir.",
      ],
    ],
    [
      [
        'MessagingService:SubscribeAsync("News", function(message)',
        "Listen to the News channel…",
        "News kanalını dinle…",
      ],
      [
        "    print(message.Data)",
        "…and write what was announced (it's in message.Data).",
        "…ve duyurulanı yaz (message.Data'da).",
      ],
      ["end)", "Done listening.", "Dinleme kodu bitti."],
      [
        'MessagingService:PublishAsync("News", "Event starts!")',
        "Announce to every server.",
        "Her sunucuya duyur.",
      ],
    ],
  ),

  "server-authority": simple(
    ["The server is the cashier, not the customer", "Sunucu müşteri değil, kasiyerdir"],
    [
      "Cheaters can change anything on their own computer and send your server any message they want. So the server must check everything itself.",
      "Hileciler kendi bilgisayarlarındaki her şeyi değiştirebilir ve sunucuna istedikleri her mesajı gönderebilir. Bu yüzden sunucu her şeyi kendisi kontrol etmeli.",
    ],
    [
      [
        "Imagine a shop where customers write their own price on the receipt. Everything would cost 0!",
        "Müşterilerin fişe kendi fiyatlarını yazdığı bir dükkân düşün. Her şey 0'a olurdu!",
      ],
      [
        'So the player only says WHAT they want ("Sword"). The server looks up the price itself.',
        'Bu yüzden oyuncu sadece NE istediğini söyler ("Sword"). Fiyata sunucu kendisi bakar.',
      ],
      [
        "Check the type (is it really text?), that it exists, and that the player can afford it or is close enough.",
        "Tipi (gerçekten yazı mı?), var olduğunu ve oyuncunun parasının yettiğini ya da yeterince yakın olduğunu kontrol et.",
      ],
    ],
    [
      [
        "buy.OnServerEvent:Connect(function(player, item)",
        "A player asks to buy something.",
        "Bir oyuncu bir şey almak istiyor.",
      ],
      [
        '    if typeof(item) ~= "string" then return end',
        "Is item really text? If not, ignore it.",
        "item gerçekten yazı mı? Değilse yok say.",
      ],
      [
        "    local price = PRICES[item]",
        "The server looks up the real price.",
        "Gerçek fiyata sunucu bakar.",
      ],
      [
        "    if not price then return end",
        "Not a real item? Ignore it.",
        "Gerçek bir eşya değil mi? Yok say.",
      ],
      ["end)", "(then check the coins and sell)", "(sonra coinleri kontrol et ve sat)"],
    ],
  ),

  "rate-limiting": simple(
    ["A cooldown says 'wait your turn'", "Bekleme süresi 'sıranı bekle' der"],
    [
      "A cheater can press a button 1000 times a second. A cooldown remembers when each player last did something and ignores them if they come back too soon.",
      "Bir hileci bir butona saniyede 1000 kez basabilir. Bekleme süresi her oyuncunun en son ne zaman bir şey yaptığını hatırlar ve çok erken gelirse onu yok sayar.",
    ],
    [
      [
        "Like a water fountain that only gives one cup per second.",
        "Saniyede sadece bir bardak veren bir su sebili gibi.",
      ],
      [
        "Keep a table: last[player] = the time they last did it.",
        "Bir tablo tut: last[player] = en son ne zaman yaptığı.",
      ],
      [
        "Remove them from the table when they leave, or it grows forever.",
        "Çıkınca onları tablodan sil, yoksa tablo sonsuza kadar büyür.",
      ],
    ],
    [
      [
        "local last = {}",
        "A notebook of 'when did each player last do this'.",
        "'Her oyuncu bunu en son ne zaman yaptı' defteri.",
      ],
      [
        "remote.OnServerEvent:Connect(function(player)",
        "A player pressed the button.",
        "Bir oyuncu butona bastı.",
      ],
      [
        "    if last[player] and os.clock() - last[player] < 1 then return end",
        "Was their last press less than 1 second ago? Then ignore this one.",
        "Son basışı 1 saniyeden yeni miydi? O zaman bunu yok say.",
      ],
      ["    last[player] = os.clock()", "Write down: they did it now.", "Not al: şimdi yaptı."],
      ["end)", "(then do the real action)", "(sonra asıl işi yap)"],
    ],
  ),

  replication: simple(
    ["The server is the TV station", "Sunucu televizyon kanalıdır"],
    [
      "What the server changes is sent to every player, like a TV broadcast. What a player changes on their own device stays on their screen only.",
      "Sunucunun değiştirdiği şey bir TV yayını gibi her oyuncuya gönderilir. Bir oyuncunun kendi cihazında değiştirdiği şey sadece onun ekranında kalır.",
    ],
    [
      [
        "If you draw on your TV screen, the people watching at home don't see your drawing.",
        "Televizyon ekranına çizim yaparsan evde izleyen insanlar çizimini görmez.",
      ],
      [
        "So a LocalScript can make a wall invisible for one player — handy for VIP doors.",
        "Yani bir LocalScript bir duvarı tek bir oyuncu için görünmez yapabilir — VIP kapıları için kullanışlı.",
      ],
      [
        "If something should change for EVERYONE, the player asks the server with a RemoteEvent.",
        "Bir şey HERKES için değişecekse oyuncu bir RemoteEvent ile sunucudan ister.",
      ],
    ],
    [
      ["local wall = workspace.Wall", "In a LocalScript: the wall.", "Bir LocalScript'te: duvar."],
      [
        "wall.Transparency = 1",
        "Invisible — but ONLY on this player's screen.",
        "Görünmez — ama SADECE bu oyuncunun ekranında.",
      ],
      [
        "openDoor:FireServer()",
        "To open a door for everyone, ask the server instead.",
        "Kapıyı herkes için açmak içinse sunucudan iste.",
      ],
    ],
  ),

  "anti-cheat": simple(
    ["The server is the referee", "Sunucu hakemdir"],
    [
      "A player's character moves on their own computer, so a cheater can make it run super fast or teleport. The server can't stop that, but it can CHECK it, like a referee.",
      "Oyuncunun karakteri kendi bilgisayarında hareket eder, bu yüzden bir hileci onu çok hızlı koşturabilir ya da ışınlayabilir. Sunucu bunu durduramaz ama bir hakem gibi KONTROL edebilir.",
    ],
    [
      [
        "Every second, look where each player is. Then compare with where they were a second ago.",
        "Her saniye her oyuncunun nerede olduğuna bak. Sonra bir saniye önce nerede olduğuyla karşılaştır.",
      ],
      [
        "If they moved more than humanly possible, put them back.",
        "İnsanüstü bir mesafe gittiyse onları geri koy.",
      ],
      [
        "Be kind: lag and falling can look strange. Don't ban someone for one weird moment.",
        "Nazik ol: gecikme ve düşmek garip görünebilir. Tek bir tuhaf an yüzünden kimseyi banlama.",
      ],
    ],
    [
      [
        "local moved = (root.Position - lastPosition).Magnitude",
        "How far did they go since the last check?",
        "Son kontrolden beri ne kadar yol gitti?",
      ],
      [
        "if moved > 50 then",
        "More than 50 studs in a second? Impossible.",
        "Bir saniyede 50 stud'dan fazla mı? İmkânsız.",
      ],
      [
        "    root.CFrame = CFrame.new(lastPosition)",
        "Put them back where they were.",
        "Onu olduğu yere geri koy.",
      ],
      ["end", "Done.", "Bitti."],
    ],
  ),

  "inventory-system": simple(
    ["The inventory is a backpack with rules", "Envanter kuralları olan bir sırt çantası"],
    [
      "Instead of every script touching the items directly, one module holds the backpack and its rules. Everyone else just says Add, Remove or Count.",
      "Her scriptin eşyalara doğrudan dokunması yerine tek bir modül sırt çantasını ve kurallarını tutar. Diğer herkes sadece Add, Remove ya da Count der.",
    ],
    [
      [
        "Like a vending machine: you press buttons, you never reach inside.",
        "Bir otomat gibi: tuşlara basarsın, asla içine elini sokmazsın.",
      ],
      [
        "The rules live in one place: stacking, slot limits, 'you don't have enough'.",
        "Kurallar tek yerde yaşar: yığınlama, slot sınırı, 'yeterince yok'.",
      ],
      [
        "Fix a rule once and every system — shop, crafting, trading — gets the fix.",
        "Bir kuralı bir kez düzelt, her sistem — dükkân, üretim, takas — düzeltmeyi alır.",
      ],
    ],
    [
      [
        "local bag = Inventory.new()",
        "Get a new, empty backpack.",
        "Yeni, boş bir sırt çantası al.",
      ],
      ['bag:Add("Wood", 3)', "Put 3 wood in it.", "İçine 3 odun koy."],
      ['print(bag:Count("Wood"))', "How much wood? 3.", "Ne kadar odun var? 3."],
      ['bag:Remove("Wood", 1)', "Take 1 out. Now there are 2.", "1 tane çıkar. Şimdi 2 tane var."],
    ],
  ),

  combat: simple(
    ["A hitbox is an invisible box of 'who got hit'", "Hitbox, 'kim vuruldu'nun görünmez kutusu"],
    [
      "When you swing a sword, the game puts an invisible box in front of you for a moment and asks: 'which parts are inside?'. Those characters get hit.",
      "Kılıç salladığında oyun bir anlığına önüne görünmez bir kutu koyar ve sorar: 'içinde hangi parçalar var?'. O karakterler vurulur.",
    ],
    [
      [
        "GetPartBoundsInBox gives you every part inside the box.",
        "GetPartBoundsInBox kutunun içindeki her parçayı verir.",
      ],
      [
        "One character has many parts (head, arms, legs). Keep a list of who you already hit, so you hit each one only once.",
        "Bir karakterin birçok parçası var (kafa, kollar, bacaklar). Kime zaten vurduğunun listesini tut ki her birine bir kez vur.",
      ],
      [
        "The server does the hitbox and damage, so cheaters can't fake hits.",
        "Hitbox'ı ve hasarı sunucu yapar, böylece hileciler vuruş uyduramaz.",
      ],
    ],
    [
      [
        "local parts = workspace:GetPartBoundsInBox(boxCFrame, size, params)",
        "What's inside the invisible box?",
        "Görünmez kutunun içinde ne var?",
      ],
      ["local hit = {}", "A list of who we already hit.", "Zaten vurduklarımızın listesi."],
      ["for _, part in parts do", "Look at each part…", "Her parçaya bak…"],
      [
        '    local humanoid = part.Parent:FindFirstChildOfClass("Humanoid")',
        "…does it belong to a character? (Floors and walls don't.)",
        "…bir karaktere mi ait? (Zeminler ve duvarlar değil.)",
      ],
      [
        "    if humanoid and not hit[humanoid] then",
        "A character we haven't hit yet?",
        "Henüz vurmadığımız bir karakter mi?",
      ],
      ["        hit[humanoid] = true", "Write it on the list…", "Listeye yaz…"],
      ["        humanoid:TakeDamage(10)", "…and hurt it once.", "…ve ona bir kez hasar ver."],
      ["    end", "Done with this part.", "Bu parça bitti."],
      ["end", "Next part.", "Sıradaki parça."],
    ],
  ),

  "npc-ai": simple(
    ["Pathfinding is a GPS for NPCs", "Pathfinding NPC'ler için bir GPS"],
    [
      "An NPC is a robot actor with a Humanoid, just like a player's body. MoveTo tells it where to walk. PathfindingService is its GPS: it finds a way around walls.",
      "NPC, tıpkı bir oyuncunun bedeni gibi Humanoid'i olan bir robot oyuncudur. MoveTo ona nereye yürüyeceğini söyler. PathfindingService onun GPS'idir: duvarların etrafından bir yol bulur.",
    ],
    [
      [
        "The GPS gives a list of waypoints — little stops along the route.",
        "GPS bir ara nokta listesi verir — rota boyunca küçük duraklar.",
      ],
      [
        "The NPC walks to the first stop, waits until it arrives, then goes to the next.",
        "NPC ilk durağa yürür, varana kadar bekler, sonra sıradakine gider.",
      ],
      [
        "To chase players, find the nearest one every half second and walk toward them.",
        "Oyuncuları kovalamak için her yarım saniyede en yakınını bul ve ona doğru yürü.",
      ],
    ],
    [
      ["local path = PathfindingService:CreatePath()", "Open the GPS.", "GPS'i aç."],
      [
        "path:ComputeAsync(npc.HumanoidRootPart.Position, target)",
        "Find a route from the NPC to the target.",
        "NPC'den hedefe bir rota bul.",
      ],
      [
        "for _, point in path:GetWaypoints() do",
        "For every stop on the route…",
        "Rotadaki her durak için…",
      ],
      ["    humanoid:MoveTo(point.Position)", "…walk there…", "…oraya yürü…"],
      [
        "    humanoid.MoveToFinished:Wait()",
        "…and wait until you arrive.",
        "…ve varana kadar bekle.",
      ],
      ["end", "Next stop.", "Sıradaki durak."],
    ],
  ),

  quests: simple(
    ["A quest is a checklist item with a counter", "Görev, sayacı olan bir yapılacaklar maddesi"],
    [
      "'Collect 10 coins' is just: what to count (coins), how many (10) and the reward. A tracker adds 1 each time it happens and pays when the goal is reached.",
      "'10 coin topla' sadece şudur: neyi sayacağız (coin), kaç tane (10) ve ödül. Bir takipçi her olduğunda 1 ekler ve hedefe ulaşınca öder.",
    ],
    [
      [
        "Write quests as a list of data, so adding a new quest is one new line.",
        "Görevleri bir veri listesi olarak yaz, böylece yeni görev eklemek tek bir yeni satır olur.",
      ],
      [
        "Other systems just announce what happened ('a coin was collected'). The tracker listens.",
        "Diğer sistemler sadece ne olduğunu duyurur ('bir coin toplandı'). Takipçi dinler.",
      ],
      [
        "Pay the reward only once, exactly when progress reaches the goal.",
        "Ödülü sadece bir kez, tam ilerleme hedefe ulaştığında öde.",
      ],
    ],
    [
      ["local progress = 0", "How far the player is.", "Oyuncunun ne kadar ilerlediği."],
      ["local GOAL = 10", "The goal: 10.", "Hedef: 10."],
      [
        "local function coinCollected()",
        "Called every time a coin is picked up.",
        "Her coin alındığında çağrılır.",
      ],
      ["    progress += 1", "One step closer.", "Bir adım daha yakın."],
      ["    if progress == GOAL then", "Exactly at the goal?", "Tam hedefte mi?"],
      ['        print("Quest complete!")', "Celebrate and give the reward.", "Kutla ve ödülü ver."],
      ["    end", "Done.", "Bitti."],
      ["end", "Done.", "Bitti."],
    ],
  ),

  "wave-spawner": simple(
    ["Waves are levels in an arcade game", "Dalgalar atari oyunundaki seviyeler"],
    [
      "A wave game repeats: send some enemies, wait until they're all defeated, rest a little, then send MORE. Like arcade levels that get harder.",
      "Dalga oyunu tekrar eder: birkaç düşman gönder, hepsi yenilene kadar bekle, biraz dinlen, sonra DAHA FAZLASINI gönder. Zorlaşan atari seviyeleri gibi.",
    ],
    [
      [
        "Put every enemy in one folder. When the folder is empty, the wave is cleared.",
        "Her düşmanı tek bir klasöre koy. Klasör boşalınca dalga temizlenmiştir.",
      ],
      [
        "Spawn copies (Clone) of an enemy template, never the template itself.",
        "Düşman şablonunun kopyalarını (Clone) çıkar, asla şablonun kendisini değil.",
      ],
      [
        "Make each wave a bit bigger: wave * 2 enemies.",
        "Her dalgayı biraz büyüt: wave * 2 düşman.",
      ],
    ],
    [
      ["for wave = 1, 5 do", "Waves 1 to 5:", "1'den 5'e kadar dalgalar:"],
      ["    spawnZombies(wave * 2)", "Send 2, 4, 6… zombies.", "2, 4, 6… zombi gönder."],
      [
        "    repeat task.wait(1) until #enemies:GetChildren() == 0",
        "Check every second until the enemies folder is empty.",
        "Düşman klasörü boşalana kadar her saniye kontrol et.",
      ],
      ['    print("Wave cleared")', "Wave done!", "Dalga bitti!"],
      ["end", "Next, bigger wave.", "Sıradaki, daha büyük dalga."],
    ],
  ),

  "ui-layout": simple(
    ["Scale means 'percent of the screen'", "Scale 'ekranın yüzdesi' demek"],
    [
      "Phones are small and monitors are big. If you size UI in pixels, it looks huge on phones. Scale sizes it as a percentage, so it fits every screen.",
      "Telefonlar küçük, monitörler büyük. Arayüzü pikselle boyutlandırırsan telefonda dev görünür. Scale onu yüzde olarak boyutlandırır, böylece her ekrana uyar.",
    ],
    [
      [
        "UDim2.fromScale(0.5, 0.5) = half as wide and half as tall as the screen.",
        "UDim2.fromScale(0.5, 0.5) = ekranın yarısı genişliğinde ve yarısı yüksekliğinde.",
      ],
      [
        "AnchorPoint (0.5, 0.5) means 'measure from my middle'. With Position (0.5, 0.5) the frame sits in the center.",
        "AnchorPoint (0.5, 0.5) 'ortamdan ölç' demek. Position (0.5, 0.5) ile frame tam ortada durur.",
      ],
      [
        "UIListLayout lines up buttons by itself, like books on a shelf.",
        "UIListLayout butonları kendiliğinden dizer, raftaki kitaplar gibi.",
      ],
    ],
    [
      [
        "frame.Size = UDim2.fromScale(0.5, 0.5)",
        "Half the screen wide and tall — on any screen.",
        "Her ekranda, ekranın yarısı kadar geniş ve yüksek.",
      ],
      [
        "frame.AnchorPoint = Vector2.new(0.5, 0.5)",
        "Measure from the frame's middle.",
        "Frame'in ortasından ölç.",
      ],
      [
        "frame.Position = UDim2.fromScale(0.5, 0.5)",
        "Put that middle at the middle of the screen.",
        "O ortayı ekranın ortasına koy.",
      ],
    ],
  ),

  sounds: simple(
    ["A Sound is a little speaker", "Sound küçük bir hoparlör"],
    [
      "A Sound object is a speaker that plays one audio file. Where you put it matters: in a part, it's louder when you're close. In SoundService, everyone hears it the same.",
      "Sound nesnesi bir ses dosyası çalan bir hoparlördür. Nereye koyduğun önemlidir: bir parçanın içinde yakınken daha yüksek çalar. SoundService'te herkes aynı duyar.",
    ],
    [
      [
        "SoundId is which audio to play (rbxassetid://number).",
        "SoundId hangi sesin çalınacağıdır (rbxassetid://sayı).",
      ],
      [
        ":Play() starts it, :Stop() stops it, Looped = true repeats it forever (music).",
        ":Play() başlatır, :Stop() durdurur, Looped = true sonsuza kadar tekrarlar (müzik).",
      ],
      [
        "Short effects should be destroyed after they finish, or they pile up.",
        "Kısa efektler bittikten sonra yok edilmeli, yoksa birikirler.",
      ],
    ],
    [
      ['local sound = Instance.new("Sound")', "Make a speaker.", "Bir hoparlör yap."],
      ['sound.SoundId = "rbxassetid://9118823101"', "Which audio to play.", "Hangi ses çalınacak."],
      [
        "sound.Parent = workspace.Campfire",
        "Put it in the campfire: louder when you stand close.",
        "Onu kamp ateşine koy: yakın durunca daha yüksek.",
      ],
      ["sound:Play()", "Play!", "Çal!"],
    ],
  ),

  animations: simple(
    ["An animation is a recorded dance", "Animasyon kaydedilmiş bir dans"],
    [
      "An animation is a recording of how a character's arms and legs move. You load it onto the character's Animator — its 'dancing brain' — and press play.",
      "Animasyon, bir karakterin kollarının ve bacaklarının nasıl hareket ettiğinin kaydıdır. Onu karakterin Animator'üne — 'dans eden beynine' — yükler ve oynata basarsın.",
    ],
    [
      [
        "AnimationId is which recording (made in the Animation Editor).",
        "AnimationId hangi kayıt olduğudur (Animation Editor'da yapılır).",
      ],
      [
        "LoadAnimation gives you a track: a remote control with Play and Stop.",
        "LoadAnimation sana bir track verir: Play ve Stop'u olan bir kumanda.",
      ],
      [
        "Load each animation once and keep the track — don't load it again every time.",
        "Her animasyonu bir kez yükle ve track'i sakla — her seferinde tekrar yükleme.",
      ],
    ],
    [
      [
        'local anim = Instance.new("Animation")',
        "A box for an animation.",
        "Bir animasyon için kutu.",
      ],
      [
        'anim.AnimationId = "rbxassetid://507770239"',
        "Which recording (a wave).",
        "Hangi kayıt (el sallama).",
      ],
      [
        "local track = animator:LoadAnimation(anim)",
        "Load it onto the character's Animator: get the remote control.",
        "Karakterin Animator'üne yükle: kumandayı al.",
      ],
      ["track:Play()", "Press play: the character waves.", "Oynata bas: karakter el sallar."],
    ],
  ),

  camera: simple(
    ["The camera is the player's eyes", "Kamera oyuncunun gözleri"],
    [
      "Normally the game moves the camera behind your character. In a LocalScript you can take control of it — for cutscenes, shakes and zooms — and give it back after.",
      "Normalde oyun kamerayı karakterinin arkasında gezdirir. Bir LocalScript'te onun kontrolünü alabilirsin — ara sahneler, sarsıntılar ve yakınlaştırmalar için — sonra geri verirsin.",
    ],
    [
      [
        "CameraType = Scriptable: 'I'm driving now'.",
        "CameraType = Scriptable: 'şimdi ben sürüyorum'.",
      ],
      [
        "Set camera.CFrame to put the camera anywhere, looking anywhere.",
        "Kamerayı istediğin yere, istediğin yöne bakacak şekilde koymak için camera.CFrame'i ayarla.",
      ],
      [
        "CameraType = Custom: 'you can drive again'. Never forget this!",
        "CameraType = Custom: 'artık yine sen sür'. Bunu asla unutma!",
      ],
    ],
    [
      [
        "local camera = workspace.CurrentCamera",
        "This player's camera (in a LocalScript).",
        "Bu oyuncunun kamerası (bir LocalScript'te).",
      ],
      ["camera.CameraType = Enum.CameraType.Scriptable", "Take the wheel.", "Direksiyonu al."],
      [
        "camera.CFrame = CFrame.new(0, 20, 30)",
        "Move the camera up and back.",
        "Kamerayı yukarı ve geri götür.",
      ],
      [
        "camera.CameraType = Enum.CameraType.Custom",
        "Give the wheel back to the player.",
        "Direksiyonu oyuncuya geri ver.",
      ],
    ],
  ),

  "day-night": simple(
    ["ClockTime is the sky's clock", "ClockTime gökyüzünün saati"],
    [
      "Lighting.ClockTime is the time of day from 0 to 24. Change it and the sun, moon and shadows move. A day-night cycle just adds a little time again and again.",
      "Lighting.ClockTime 0'dan 24'e günün saatidir. Onu değiştir, güneş, ay ve gölgeler hareket etsin. Gece-gündüz döngüsü sadece tekrar tekrar biraz zaman ekler.",
    ],
    [
      [
        "6 = sunrise, 12 = noon, 18 = sunset, 0 = midnight.",
        "6 = gün doğumu, 12 = öğle, 18 = gün batımı, 0 = gece yarısı.",
      ],
      [
        "% 24 makes 24.5 go back to 0.5, like a clock passing midnight.",
        "% 24, 24.5'u tekrar 0.5 yapar, gece yarısını geçen bir saat gibi.",
      ],
      [
        "Run it on the server so everyone sees the same time.",
        "Herkes aynı saati görsün diye sunucuda çalıştır.",
      ],
    ],
    [
      [
        'local Lighting = game:GetService("Lighting")',
        "The service that controls the sky and light.",
        "Gökyüzünü ve ışığı yöneten servis.",
      ],
      ["while true do", "Forever:", "Sonsuza kadar:"],
      [
        "    Lighting.ClockTime = (Lighting.ClockTime + 0.1) % 24",
        "Move the clock forward a little; after 24 start again at 0.",
        "Saati biraz ileri al; 24'ten sonra 0'dan başla.",
      ],
      ["    task.wait(1)", "Wait a second.", "Bir saniye bekle."],
      ["end", "Repeat.", "Tekrarla."],
    ],
  ),

  architecture: simple(
    ["A big game is a company with departments", "Büyük bir oyun departmanları olan bir şirket"],
    [
      "When a game gets big, you split it into departments (services): one handles data, one the shop, one the rounds. One Main script is the boss that says 'everyone start'.",
      "Bir oyun büyüyünce onu departmanlara (servislere) ayırırsın: biri veriyi, biri dükkânı, biri turları yönetir. Tek bir Main scripti 'herkes başlasın' diyen patrondur.",
    ],
    [
      [
        "Each service is a ModuleScript with a Start function.",
        "Her servis Start fonksiyonu olan bir ModuleScript'tir.",
      ],
      [
        "Main first requires (hires) every service, then starts them all.",
        "Main önce her servisi require eder (işe alır), sonra hepsini başlatır.",
      ],
      [
        "Ask yourself 'which department owns this?' before writing code.",
        "Kod yazmadan önce 'bu hangi departmanın işi?' diye sor.",
      ],
    ],
    [
      ["local services = {}", "A list of departments.", "Departmanların listesi."],
      [
        "for _, module in Services:GetChildren() do",
        "For every module in the Services folder…",
        "Services klasöründeki her modül için…",
      ],
      [
        "    services[module.Name] = require(module)",
        "…hire it (load it).",
        "…onu işe al (yükle).",
      ],
      ["end", "Everyone is hired.", "Herkes işe alındı."],
      ["for _, service in services do", "Then, for every department…", "Sonra her departman için…"],
      ["    service.Start()", "…'start working!'", "…'çalışmaya başla!'"],
      ["end", "The game is running.", "Oyun çalışıyor."],
    ],
  ),

  performance: simple(
    ["Leaks are taps left running", "Sızıntılar açık bırakılmış musluklar"],
    [
      "Every connection, part and table entry uses a bit of memory. If you never clean them up, the server slowly fills up — like taps left running all night — and gets laggy.",
      "Her bağlantı, parça ve tablo kaydı biraz bellek kullanır. Onları hiç temizlemezsen sunucu yavaş yavaş dolar — bütün gece açık kalan musluklar gibi — ve kasmaya başlar.",
    ],
    [
      [
        ":Disconnect() turns off a connection you no longer need.",
        ":Disconnect(), artık gerekmeyen bir bağlantıyı kapatır.",
      ],
      [
        ":Destroy() removes a part (and its connections).",
        ":Destroy() bir parçayı (ve bağlantılarını) kaldırır.",
      ],
      [
        "Clear per-player data when they leave: data[player] = nil.",
        "Oyuncu çıkınca ona ait veriyi temizle: data[player] = nil.",
      ],
      [
        "And never loop forever without task.wait.",
        "Ve asla task.wait olmadan sonsuz döngü kurma.",
      ],
    ],
    [
      [
        "local connection = RunService.Heartbeat:Connect(update)",
        "Turn on a tap: update runs every frame.",
        "Bir musluğu aç: update her karede çalışır.",
      ],
      ["connection:Disconnect()", "Turn it off when you're done.", "İşin bitince kapat."],
      [
        "part:Destroy()",
        "Throw away parts you made and no longer need.",
        "Yaptığın ve artık gerekmeyen parçaları at.",
      ],
      [
        "data[player] = nil",
        "Forget the data of a player who left.",
        "Çıkan oyuncunun verisini unut.",
      ],
    ],
  ),

  monetization: simple(
    [
      "Game pass = membership card, product = snack",
      "Game pass = üyelik kartı, product = atıştırmalık",
    ],
    [
      "A game pass is bought once and kept forever (VIP). A developer product can be bought again and again (100 coins). Roblox handles the Robux; your server gives the reward.",
      "Game pass bir kez alınır ve sonsuza kadar sende kalır (VIP). Developer product tekrar tekrar alınabilir (100 coin). Robux'u Roblox halleder; ödülü senin sunucun verir.",
    ],
    [
      [
        "For passes: when a player joins, ask 'does this player own the pass?'.",
        "Pass'ler için: bir oyuncu girince 'bu oyuncunun pass'i var mı?' diye sor.",
      ],
      [
        "For products: Roblox calls your ProcessReceipt function with the receipt after every purchase.",
        "Product'lar için: Roblox her satın almadan sonra makbuzla senin ProcessReceipt fonksiyonunu çağırır.",
      ],
      [
        "Give the reward first, THEN say 'PurchaseGranted'. If something failed, say 'NotProcessedYet' and Roblox will try again.",
        "Önce ödülü ver, SONRA 'PurchaseGranted' de. Bir şey başarısız olduysa 'NotProcessedYet' de, Roblox tekrar dener.",
      ],
    ],
    [
      [
        "MarketplaceService.ProcessReceipt = function(receipt)",
        "Roblox calls this after every product purchase.",
        "Roblox bunu her product satın alımından sonra çağırır.",
      ],
      [
        "    local player = Players:GetPlayerByUserId(receipt.PlayerId)",
        "Who bought it?",
        "Kim satın aldı?",
      ],
      ["    if not player then", "They already left?", "Çoktan çıkmış mı?"],
      [
        "        return Enum.ProductPurchaseDecision.NotProcessedYet",
        "Then: 'try again later'.",
        "O zaman: 'sonra tekrar dene'.",
      ],
      ["    end", "Otherwise…", "Değilse…"],
      ["    player.leaderstats.Coins.Value += 100", "…give the reward…", "…ödülü ver…"],
      [
        "    return Enum.ProductPurchaseDecision.PurchaseGranted",
        "…and tell Roblox: done!",
        "…ve Roblox'a söyle: tamam!",
      ],
      ["end", "End.", "Son."],
    ],
  ),

  teams: simple(
    ["Teams are jerseys", "Takımlar formalardır"],
    [
      "A Team is like a jersey color. Put a player on a team and everyone sees which side they're on: in the player list, and at the team's spawn point.",
      "Takım bir forma rengi gibidir. Bir oyuncuyu bir takıma koy, herkes hangi tarafta olduğunu görsün: oyuncu listesinde ve takımın doğma noktasında.",
    ],
    [
      [
        "Make Team objects in the Teams service, each with a TeamColor.",
        "Teams servisinde her birinin TeamColor'ı olan Team nesneleri yap.",
      ],
      ["player.Team = red puts the jersey on.", "player.Team = red formayı giydirir."],
      [
        "Before dealing damage, check: same jersey? Then no friendly fire.",
        "Hasar vermeden önce kontrol et: aynı forma mı? O zaman dost ateşi yok.",
      ],
    ],
    [
      ['local red = Instance.new("Team")', "Make a team.", "Bir takım yap."],
      ['red.Name = "Red"', "Call it Red.", "Adını Red koy."],
      ['red.TeamColor = BrickColor.new("Bright red")', "Its jersey color.", "Forma rengi."],
      [
        'red.Parent = game:GetService("Teams")',
        "Add it to the game's teams.",
        "Onu oyunun takımlarına ekle.",
      ],
      ["player.Team = red", "Put a player on the red team.", "Bir oyuncuyu kırmızı takıma koy."],
    ],
  ),

  capstone: simple(
    ["Build a game like LEGO: one brick at a time", "Oyunu LEGO gibi yap: her seferinde bir tuğla"],
    [
      "A whole game feels huge, but it's just the pieces you already learned, joined together. Build a tiny version first, then add one piece at a time and test after each one.",
      "Koca bir oyun gözünü korkutur ama aslında öğrendiğin parçaların birleşimidir. Önce minicik bir sürüm yap, sonra her seferinde bir parça ekle ve her birinden sonra test et.",
    ],
    [
      [
        "Start with one service that works (saving), then add the next (rounds), then the next (coins).",
        "Çalışan tek bir servisle başla (kayıt), sonra sıradakini ekle (turlar), sonra bir sonrakini (coinler).",
      ],
      [
        "Test with 2 players in Studio — many bugs only appear with more than one player.",
        "Studio'da 2 oyuncuyla test et — birçok hata sadece birden fazla oyuncu varken çıkar.",
      ],
      [
        "Publish early, let friends play, watch what they do and keep improving.",
        "Erken yayınla, arkadaşların oynasın, ne yaptıklarını izle ve geliştirmeye devam et.",
      ],
    ],
    [
      [
        "local DataService = require(Services.DataService)",
        "Load the saving department.",
        "Kayıt departmanını yükle.",
      ],
      [
        "local RoundService = require(Services.RoundService)",
        "Load the rounds department.",
        "Tur departmanını yükle.",
      ],
      [
        "DataService.Start()",
        "Start saving first — everything else needs player data.",
        "Önce kaydı başlat — diğer her şey oyuncu verisine ihtiyaç duyar.",
      ],
      [
        "RoundService.Start()",
        "Then start the rounds. Test, then add the next piece!",
        "Sonra turları başlat. Test et, sonra sıradaki parçayı ekle!",
      ],
    ],
  ),
};
