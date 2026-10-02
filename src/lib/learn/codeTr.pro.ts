/** Turkish for the comments and printed text in the lessons from lessons.pro.ts and lessons.pro2.ts. */
export const PRO_COMMENTS: Record<string, string> = {
  "!strict": "!strict",
  // type-checking
  "the ? means it can be nil": "? nil olabileceği anlamına gelir",
  // metatables
  "false: the table has it": "false: tabloda var",
  "16: missing, so it comes from defaults": "16: eksik, bu yüzden defaults'tan gelir",
  "false: frozen tables can't change": "false: dondurulmuş tablolar değişemez",
  // inheritance
  "build the Enemy part first": "önce Enemy kısmını kur",
  "then make it a Boss": "sonra onu bir Boss yap",
  "call the parent's version": "üst sınıfın sürümünü çağır",
  "inherited from Enemy": "Enemy'den miras",
  "30: Boss's own version": "30: Boss'un kendi sürümü",
  // closures
  "a fresh count of its own": "kendine ait yepyeni bir sayaç",
  "prints Hello! and then true": "Merhaba! yazar, sonra true",
  "false: still cooling down": "false: bekleme süresi bitmedi",
  // coroutines
  "Step 1": "Adım 1",
  "Step 2": "Adım 2",
  "Step 3": "Adım 3",
  suspended: "suspended (duraklatılmış)",
  dead: "dead (bitmiş)",
  "Red Blue Green Red": "Red Blue Green Red",
  "prints first": "ilk bu yazılır",
  // session-data
  "wait a bit longer each time": "her seferinde biraz daha uzun bekle",
  "[player] = their data while they play": "[player] = oynarken verisi",
  "never save data that didn't load": "yüklenmemiş veriyi asla kaydetme",
  "autosave every 2 minutes": "2 dakikada bir otomatik kayıt",
  "add to whatever is saved now": "şu an kayıtlı olana ekle",
  // global-leaderboards
  "whole numbers only": "sadece tam sayılar",
  "false = highest first": "false = en yüksek önce",
  // serialization
  "a Vector3 again": "yine bir Vector3",
  '"ffaa00": a string saves fine': '"ffaa00": metin sorunsuz kaydedilir',
  "what the DataStore would store": "DataStore'un saklayacağı şey",
  "version 2 added gems": "2. sürüm gems ekledi",
  "saved before gems existed": "gems yokken kaydedilmiş",
  // cross-server
  'every server listens on the "Announcements" topic': 'her sunucu "Announcements" konusunu dinler',
  "any server can send to all of them": "herhangi bir sunucu hepsine gönderebilir",
  // server-authority
  "DON'T: the client chooses how many coins it gets": "YAPMA: kaç coin alacağını istemci seçiyor",
  "1. the type: exploiters can send tables, numbers or nothing":
    "1. tip: exploit kullananlar tablo, sayı ya da hiçbir şey gönderebilir",
  "2. it exists: the server's own table decides the price":
    "2. var mı: fiyata sunucunun kendi tablosu karar verir",
  "3. the player can afford it": "3. oyuncunun parası yetiyor mu",
  "n == n is false only for NaN": "n == n sadece NaN için false olur",
  "false: NaN": "false: NaN",
  // rate-limiting
  "[player] = when they last swung": "[player] = en son ne zaman vurduğu",
  "too soon: ignore it": "çok erken: yok say",
  "forget players who left": "çıkan oyuncuları unut",
  "five trues, then false false": "beş true, sonra false false",
  // replication
  "only this player sees the wall vanish": "duvarın kaybolduğunu sadece bu oyuncu görür",
  "the server changed it: everyone sees it": "sunucu değiştirdi: herkes görür",
  // anti-cheat
  seconds: "saniye",
  "studs per second, well above WalkSpeed 16": "saniyede stud, WalkSpeed 16'nın epey üstü",
  "ignore up and down, so falling doesn't count": "yukarı ve aşağıyı yok say, düşmek sayılmasın",
  "too far away to have hit it": "vurmuş olamayacak kadar uzak",
  // inventory-system
  full: "dolu",
  "false: only 3": "false: sadece 3 tane var",
  "missing something": "bir şey eksik",
  "true 1 2": "true 1 2",
  // combat
  "put the attacker's character here": "saldıranın karakterini buraya koy",
  "1: the target is inside the box": "1: hedef kutunun içinde",
  "don't hit yourself": "kendine vurma",
  "in front of you": "önünde",
  "each humanoid only once, even if many of its parts are inside":
    "her humanoid sadece bir kez, birçok parçası içeride olsa bile",
  "stand in front": "öne geç",
  "so attacks don't find the drawing itself": "saldırılar çizimin kendisini bulmasın diye",
  // npc-ai
  "nil: nobody has joined yet": "nil: henüz kimse girmedi",
  "no path: try walking straight there": "yol yok: oraya düz yürümeyi dene",
  "Idle Chase Attack": "Idle Chase Attack",
  // quests
  "[quest id] = how far the player is": "[görev id] = oyuncunun ne kadar ilerlediği",
  "a BindableEvent": "bir BindableEvent",
  "the quest tracker listens…": "görev takipçisi dinler…",
  "…and the zombie script just announces": "…zombi scripti de sadece duyurur",
  // wave-spawner
  "tougher every wave": "her dalgada daha dayanıklı",
  "stands in for players defeating it": "oyuncuların onu yenmesinin yerine",
  "wait until every enemy is gone": "her düşman gidene kadar bekle",
  "a short break": "kısa bir mola",
  "13 174 true": "13 174 true",
  // ui-layout
  "the middle of any screen": "her ekranın ortası",
  "40% wide, 60% tall": "%40 genişlik, %60 yükseklik",
  "keeps its shape on wide and tall screens": "geniş ve uzun ekranlarda şeklini korur",
  "grows with its content": "içeriğiyle birlikte büyür",
  "full width, 40 pixels tall": "tam genişlik, 40 piksel yükseklik",
  "3 buttons + the layout": "3 buton + düzen",
  // sounds
  "silent beyond 60 studs": "60 stud'dan ötesinde sessiz",
  "clean up when it's done": "bitince temizle",
  "the group's volume applies on top": "grubun ses seviyesi üstüne uygulanır",
  "a settings button can mute all music at once":
    "bir ayar butonu bütün müziği tek seferde susturabilir",
  // animations
  "load once, play many times": "bir kez yükle, çok kez oynat",
  "beats walking and idle": "yürüme ve beklemeyi bastırır",
  "fade in over 0.1 seconds": "0.1 saniyede yavaşça başla",
  "50% faster": "%50 daha hızlı",
  function: "function",
  // camera
  "back to normal": "normale dön",
  "sprint feel: widen the view": "koşma hissi: görüşü genişlet",
  "menu feel: blur the world": "menü hissi: dünyayı bulanıklaştır",
  // day-night
  "one full day takes 10 minutes": "tam bir gün 10 dakika sürer",
  "true Enum.Material.Neon": "true Enum.Material.Neon",
  "haze in the distance": "uzakta pus",
  "a warm sunset tint": "sıcak bir gün batımı tonu",
  // architecture
  "require every service first, so they can find each other":
    "önce her servisi require et, birbirlerini bulabilsinler",
  "then start them all": "sonra hepsini başlat",
  ShopService: "ShopService",
  DataService: "DataService",
  // performance
  "stop updating it": "güncellemeyi durdur",
  "Destroy also disconnects the part's own events": "Destroy parçanın kendi olaylarını da keser",
  "[player] = their connections": "[player] = bağlantıları",
  "or this table grows forever": "yoksa bu tablo sonsuza kadar büyür",
  // monetization
  "100 coins": "100 coin",
  "full health": "tam can",
  "try again later": "daha sonra tekrar dene",
  // teams
  "join whichever team has fewer players": "hangi takımda daha az oyuncu varsa ona katıl",
  "NPCs can always be hit": "NPC'lere her zaman vurulabilir",
  "true: not a player": "true: oyuncu değil",
  // capstone
  "can't grab a coin from across the map": "haritanın öbür ucundan coin alınamaz",
  // homework
  "Write the Boss class below": "Boss sınıfını aşağıya yaz",
  "Make nextColor with coroutine.wrap": "coroutine.wrap ile nextColor yap",
  "[player] = when they last clicked": "[player] = en son ne zaman tıkladığı",
  "Write new, Add, Remove and Count here": "new, Add, Remove ve Count'u buraya yaz",
  "[player] = their Heartbeat connection": "[player] = Heartbeat bağlantısı",
  "update the player's trail effect here": "oyuncunun iz efektini burada güncelle",
};

export const PRO_STRINGS: Record<string, string> = {
  "{item.name} ({rarity}) - {item.price} coins": "{item.name} ({rarity}) - {item.price} coin",
  "is now": "artık",
  "Hello!": "Merhaba!",
  "Again!": "Tekrar!",
  done: "bitti",
  "Step 1": "Adım 1",
  "Step 2": "Adım 2",
  "Step 3": "Adım 3",
  Timer: "Sayaç",
  "All timers started": "Bütün sayaçlar başladı",
  "Couldn't load your data, please rejoin.": "Verin yüklenemedi, lütfen yeniden gir.",
  Unknown: "Bilinmiyor",
  "Double coins for the next hour!": "Önümüzdeki bir saat boyunca çift coin!",
  " found a ": " şunu buldu: ",
  "News: ": "Haberler: ",
  " bought ": " satın aldı: ",
  " swings!": " vuruyor!",
  " sees the wall open": " duvarın açıldığını görüyor",
  " opened the door for everyone": " kapıyı herkes için açtı",
  " moved too fast": " çok hızlı hareket etti",
  "Arrived!": "Vardım!",
  "Collect 10 coins": "10 coin topla",
  "Defeat 3 zombies": "3 zombi yen",
  "Quest complete! +{quest.Reward} coins": "Görev tamamlandı! +{quest.Reward} coin",
  "Wave {wave}: {count} zombies": "Dalga {wave}: {count} zombi",
  "Wave {wave} cleared!": "Dalga {wave} temizlendi!",
  "You survived!": "Hayatta kaldın!",
  "{item[1]} - {item[2]} coins": "{item[1]} - {item[2]} coin",
  "Slash finished": "Kesme bitti",
  "Cutscene over": "Ara sahne bitti",
  "ShopService started": "ShopService başladı",
  "Server ready": "Sunucu hazır",
  " is VIP": " VIP oyuncu",
  " bought product ": " şu ürünü aldı: ",
  " joined team ": " şu takıma katıldı: ",
  " wins!": " kazandı!",
  "Quest complete: ": "Görev tamamlandı: ",
  "{best.Name} wins with {bestCoins} coins!": "{best.Name} {bestCoins} coinle kazandı!",
};
