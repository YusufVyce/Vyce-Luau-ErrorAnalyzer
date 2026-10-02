/** Turkish text for the lessons in lessons.pro.ts and lessons.pro2.ts (sections are matched by index). */
import type { LessonTr } from "./lessons.tr";

export const TR_PRO: Record<string, LessonTr> = {
  // ------------------------------------------------------------------ 10 · Pro Luau
  "type-checking": {
    title: "Tipler: hataları çalışmadan yakala",
    summary:
      "--!strict ve tip açıklamaları ekle ki Studio hataları sen yazarken bulsun — profesyonel ekiplerin büyük oyunları hatasız tutma yolu.",
    sections: [
      {
        t: [
          "Luau'da tipler isteğe bağlıdır: değişkenlere, parametrelere ve dönüş değerlerine tip ekleyebilirsin. Oyun tamamen aynı çalışır, ama Studio'nun Script Analysis penceresi hataların altını sen Play'e basmadan çizer.",
          "Tam tip kontrolünü açmak için scriptin en ilk satırına --!strict yaz. Büyük kod tabanı olan ekipler bunu her scriptte kullanır.",
        ],
      },
      {
        h: "Değişkenlere ve fonksiyonlara tip vermek",
        t: [
          'Tip iki noktadan sonra yazılır. Fonksiyonun parantezlerinden sonraki tip, döndürdüğü değerdir. Bu tiplerle addCoins(coins, "50") kırmızıyla çizilir: "50" bir metin, sayı değil.',
        ],
      },
      {
        h: "Kendi tiplerin ve isteğe bağlı değerler",
        tip: "Tip hataları oyunun çalışmasını asla durdurmaz — Script Analysis'te uyarı olarak çıkarlar. Yine de düzelt: her biri olmayı bekleyen bir hatadır.",
      },
      {
        h: "Diziler, sözlükler ve birleşimler",
        t: [
          '{ number } sayılardan oluşan bir dizidir. { [string]: number } metinden sayıya bir sözlüktür. "Rock" | "Paper" | "Scissors" (birleşim) sadece bu değerlere izin verir.',
        ],
      },
    ],
    game: {
      name: "Büyük ekiplerin yaptığı oyunlar",
      text: "Birçok scripter'ı olan stüdyolar --!strict'i her yerde açar. Biri bir fonksiyonun aldığı değerleri değiştirince, Studio onu artık yanlış çağıran her scripti anında çizer — hata oyunculardan önce, saniyeler içinde yakalanır.",
    },
    tryIt: [
      "Bir scripte --!strict ekle ve her local'e bir tip ver.",
      "Bir Item tipi ve Item alan bir fonksiyon yaz.",
      "Fonksiyonunu eksik alanlı bir tabloyla çağır ve Script Analysis'teki uyarıyı oku.",
    ],
    mistake:
      '--!strict ile Studio her atamayı kontrol eder. Tırnak içindeki "100" bir metindir, sayı değil. Tırnaksız 100 yaz — metin bir oyuncudan geliyorsa tonumber() kullan.',
    quiz: {
      q: "Bir tipte rarity: string? ne demek?",
      o: [
        "rarity bir metin ya da nil",
        "rarity bir soru olmalı",
        "rarity asla nil olamayan bir metin",
        "rarity bir sayı",
      ],
      why: "? bir tipi isteğe bağlı yapar: değer o tipte ya da nil olabilir.",
    },
  },

  metatables: {
    title: "Metatablolar: tablolara yeni numaralar öğret",
    summary:
      "Tablolara varsayılan değerler, kendi matematiğini ve koruma ver — sınıfların ve birçok profesyonel kalıbın motor odası.",
    sections: [
      {
        t: [
          "Her tablonun bir metatablosu olabilir: ilk tablonun nasıl davranacağını değiştiren özel anahtarlarla (metametotlarla) dolu ikinci bir tablo.",
          "__index'i sınıflar dersinde zaten gördün. Daha fazlası var: + için __add, == için __eq, < için __lt, yazdırmak için __tostring, yeni anahtarları izlemek için __newindex ve bir tabloyu fonksiyon gibi çağırmak için __call.",
        ],
      },
      { h: "__index ile varsayılan değerler" },
      { h: "Kendi matematiğin ve yazdırma" },
      {
        h: "Tabloları izlemek ve korumak",
        t: [
          "__newindex, biri tabloda henüz olmayan bir anahtarı ayarladığında çalışır — kayıt tutmak için birebir. Bir tabloyu salt okunur yapmak için table.freeze daha basittir: ondan sonraki her değişiklik hata verir.",
        ],
        tip: "rawget(t, key) ve rawset(t, key, value) metametotları atlar — sonsuz döngüye girmemek için __index ve __newindex içinde onları kullan.",
      },
    ],
    game: {
      name: "Simülatör oyunları",
      text: "Dev simülatör sayıları (1.5Qa coin!) genelde metatablosunda __add, __lt ve __tostring olan bir BigNum sınıfında tutulur. Oyunun geri kalanı sadece a + b ve print(a) yazar; sayının nasıl saklandığını bilmesine gerek kalmaz.",
    },
    tryIt: [
      "__index ile varsayılanlara dönen bir ayarlar tablosu yap.",
      "Money sınıfına __lt ekle ki Money.new(5) < Money.new(9) çalışsın.",
      "Bir ayar tablosunu dondur ve pcall içinde değiştirmeyi dene.",
    ],
    mistake:
      "Düz tablolar toplama yapmayı bilmez. Onlara __add olan bir metatablo ver — ya da alanları kendin topla: a.amount + b.amount.",
    quiz: {
      q: "İki tabloda + kullanınca hangi metametot çalışır?",
      o: ["__add", "__plus", "__index", "__sum"],
      why: "a + b, a'nın (ya da b'nin) metatablosunda __add arar ve onu iki değerle çağırır.",
    },
  },

  inheritance: {
    title: "Kalıtım: sınıfların üstüne kurulan sınıflar",
    summary:
      "Bir Enemy sınıfı yap, sonra her şeyini tekrar kullanan ve sadece farklı olanı değiştiren bir Boss sınıfı yaz.",
    sections: [
      {
        t: [
          "Sınıflar dersinde her Pet tek bir sınıfın metotlarını paylaşıyordu. Kalıtım bir adım öteye gider: bir Boss ekstra güçleri olan bir Enemy'dir, bu yüzden Enemy'nin zaten yaptığı her şeyi tekrar kullanmalı.",
          "Hilesi bir __index daha: alt sınıf eksik metotları üst sınıfta arar. Yani Luau önce nesneye, sonra Boss'a, sonra Enemy'ye bakar.",
        ],
      },
      { h: "Üst sınıf" },
      {
        h: "Bir alt sınıf",
        tip: "Enemy.Attack(self), üst sınıfın metodunu bu nesne üzerinde çağırır. Bir alt sınıf bir metodu tamamen değiştirmek yerine ona bir şey eklemek istediğinde böyle yapar.",
      },
      {
        h: 'Kompozisyon: "bir şeydir" yerine "bir şeyi vardır"',
        t: [
          "Kalıtım zincirleri iki üç seviyeden sonra karışır. Birçok profesyonel kompozisyonu tercih eder: Boss uzun bir sınıf zincirinden miras almak yerine bir can parçasına ve bir saldırı düzenine sahiptir.",
          "İyi bir kural: küçük, net aileler için kalıtım (Enemy → Zombie, Boss), geri kalan her şey için kompozisyon.",
        ],
      },
    ],
    game: {
      name: "Kule savunma oyunları",
      text: "Her kule bir Tower sınıfından miras alır (menzil, fiyat, Upgrade, Sell) ve her tür — keskin nişancı, çiftlik, dondurucu — sadece nasıl saldıracağını değiştirir. Yeni bir kule eklemek dakikalar sürer, çünkü ortak kod zaten yazılmıştır.",
    },
    tryIt: [
      "Enemy'den miras alan ve 15 hasarla saldıran bir Zombie sınıfı yap.",
      "Boss'a Health'ini ikiye katlayan yeni bir Enrage metodu ekle.",
      "getmetatable(boss) == Boss ve getmetatable(boss) == Enemy yazdır — hangisi true?",
    ],
    mistake:
      "Boss hiç Enemy'ye bağlanmamış, bu yüzden TakeDamage bulunamıyor. Boss'a kendi metatablosunu ver: setmetatable(Boss, { __index = Enemy }).",
    quiz: {
      q: "Boss, TakeDamage'i tanımlamıyorsa bir Boss nesnesi onu nasıl bulur?",
      o: [
        "Hata verir",
        "Boss'un metatablosunda __index = Enemy var, Luau sonra oraya bakar",
        "Boss oluşturulurken her fonksiyon kopyalanır",
        "TakeDamage global bir fonksiyondur",
      ],
      why: "Eksik anahtarlar nesne → Boss (__index'i) → Enemy (Boss'un metatablosunun __index'i) diye aranır.",
    },
  },

  closures: {
    title: "Closure'lar ve değer olarak fonksiyonlar",
    summary:
      "Hatırlayan fonksiyonlar, fonksiyon alan fonksiyonlar ve istediğin kadar argüman — callback'lerin ve temiz kodun arkasındaki araçlar.",
    sections: [
      {
        t: [
          "Luau'da bir fonksiyon bir sayı gibi bir değerdir: bir değişkende saklayabilir, bir tabloya koyabilir, başka bir fonksiyona verebilir ya da döndürebilirsin.",
          "Closure, etrafındaki local değişkenleri hatırlayan bir fonksiyondur — onları oluşturan kod bittikten sonra bile.",
        ],
      },
      { h: "Hatırlayan fonksiyonlar" },
      { h: "Fonksiyon göndermek" },
      {
        h: "Tekrar kullanılabilir bir bekleme süresi",
        t: [
          "Closure'lar böyle küçük araçlarda parlar: bu, herhangi bir fonksiyonu birkaç saniyede bir çalışabilecek şekilde sarar. Sarılan her fonksiyonun kendi ready değişkeni olur.",
        ],
        tip: '... (varargs) "istediğin kadar argüman" demektir. action(...) ile aktar, { ... } ile topla ve select("#", ...) ile say.',
      },
    ],
    game: {
      name: "Admin komut sistemleri",
      text: "Admin sistemleri her komutu bir tabloda fonksiyon olarak saklar: commands.kick = function(player, target) … end. Bir sohbet mesajı gelince ilk kelimeye bakıp o fonksiyonu çağırırlar — komut eklemek tabloya bir satır eklemekten ibarettir.",
    },
    tryIt: [
      "makeCounter ile bir sayaç yap ve onu üç kez çağır.",
      "Bir listedeki her sayıyı ikiye katlamak için map kullan.",
      "İstediğin kadar sayıyı toplayan, ... kullanan bir fonksiyon yaz.",
    ],
    mistake:
      'print("bitti") hemen çalışır ve sonucunu (hiçbir şey) run\'a verir. Bunun yerine bir fonksiyon gönder: run(function() print("bitti") end).',
    quiz: {
      q: "local f = makeCounter(); f(); f(); print(f()) — ne yazar?",
      o: ["1", "2", "3", "0"],
      why: "Closure, çağrılar arasında kendi sayısını tutar: 1, 2, sonra 3.",
    },
  },

  coroutines: {
    title: "Coroutine'ler: duraklayan fonksiyonlar",
    summary:
      "Bir fonksiyonu yarıda durdur ve sonra devam ettir — task.spawn'ın üstüne kurulduğu fikir; üreteçler ve diyaloglar için bir araç.",
    sections: [
      {
        t: [
          "Coroutine, durdurup devam ettirebildiğin bir fonksiyondur. coroutine.yield onu durdurur; coroutine.resume tam kaldığı yerden, bütün local değişkenleriyle birlikte devam ettirir.",
          "Roblox'un task kütüphanesi coroutine'lerle çalışır: her task.spawn, motorun senin yerine devam ettirdiği bir coroutine'dir.",
        ],
      },
      { h: "Durdur ve devam ettir" },
      {
        h: "coroutine.wrap ile üreteçler",
        t: [
          "coroutine.wrap sana düz bir fonksiyon verir. Her çağrı coroutine'i devam ettirir ve yield ettiği değeri döndürür — değerleri tek tek dağıtmak için birebir.",
        ],
      },
      {
        h: "Coroutine mi, task.spawn mı?",
        t: [
          "Oyun kodunda çoğunlukla task.spawn ve task.delay kullanırsın: bir fonksiyonu yeni bir iş parçacığı olarak başlatırlar ve beklemeyi motor halleder. Bir fonksiyonun tam olarak ne zaman devam edeceğine sen karar vermek istediğinde coroutine.* kullan.",
        ],
        tip: "Bir coroutine içindeki hata scriptini durdurmaz: coroutine.resume false ve hata mesajını döndürür. Döndürdüğü ilk değeri her zaman kontrol et.",
      },
    ],
    game: {
      name: "Diyalog ve ara sahne sistemleri",
      text: "Diyalog sistemleri genelde her konuşmayı bir coroutine olarak çalıştırır: bir satır göster, oyuncu İleri'ye basana kadar yield et, sonraki satırı göster. Kod bir tiyatro metni gibi yukarıdan aşağı okunur.",
    },
    tryIt: [
      "Üç adım yazdıran bir coroutine yap ve onu üç kez devam ettir.",
      "Son resume'dan önce ve sonra coroutine.status yazdır.",
      "1, 2, 3, 1, 2, 3… diye sayı dağıtan bir coroutine.wrap üreteci yaz.",
    ],
    mistake:
      "Fonksiyonu bitince coroutine ölür (dead) ve tekrar çalışamaz. Önce coroutine.status(co) kontrol et ya da yeni bir coroutine oluştur.",
    quiz: {
      q: "coroutine.yield() ne yapar?",
      o: [
        "Coroutine'i sonsuza kadar bitirir",
        "Coroutine'i tekrar devam ettirilene kadar duraklatır",
        "Tam 1 saniye bekler",
        "Fonksiyonu baştan başlatır",
      ],
      why: "yield duraklatır; sonraki resume yield'in hemen arkasından devam eder.",
    },
  },

  // ------------------------------------------------------------------ 11 · Data like a pro
  "session-data": {
    title: "Profesyonel kayıt: oturum verisi",
    summary:
      "Oyuncunun verisini bir kez yükle, oynarken bir tabloda tut ve UpdateAsync, tekrar denemeler ve otomatik kayıtla güvenle kaydet.",
    sections: [
      {
        t: [
          "Her coin değiştiğinde GetAsync ya da SetAsync çağırmak dakikalar içinde DataStore sınırlarına takılır. Profesyoneller veriyi oyuncu girince bir kez yükler, oynarken bir tabloda tutar (oturum) ve çıkınca kaydeder — arada da birkaç dakikada bir otomatik kayıt yapar.",
          "Her DataStore çağrısı başarısız olabilir, bu yüzden her biri pcall ile sarılır ve tekrar denenir.",
        ],
      },
      { h: "Bir çağrıyı tekrar denemek" },
      {
        h: "Oturum kalıbı",
        tip: 'Yüklenemeyen veriyi asla kaydetme: oyuncunun gerçek ilerlemesinin üstüne boş varsayılanları yazarsın. Bu tek kural "bütün eşyalarımı kaybettim!" şikâyetlerinin çoğunu önler.',
      },
      {
        h: "SetAsync yerine UpdateAsync",
        t: [
          "SetAsync körü körüne üstüne yazar. UpdateAsync sana şu an kayıtlı olan değeri verir ve ne yazılacağına sen karar verirsin — böylece aynı oyuncuyu kaydeden iki sunucu birbirinin ilerlemesini silemez. Kaydı iptal etmek için fonksiyondan nil döndür.",
        ],
      },
    ],
    game: {
      name: "Her büyük RPG ve simülatör",
      text: "Milyonlarca ziyareti olan oyunlar tam bu kalıbı kullanır, çoğu zaman ProfileStore gibi topluluk modülleriyle: oyuncu başına bir oturum tablosu, çıkışta ve kapanışta kayıt, arada otomatik kayıt ve Roblox sunucuları tekleyince tekrar deneme.",
    },
    tryIt: [
      "newData'ya bir Gems alanı ekle ve yeni oyunculara 5 ver.",
      "Otomatik kaydı 30 saniyeye indir ve kaydettiğinde bir şey yazdır.",
      "load'un oyuncuyu atmadan önce üç kez denemesini sağla.",
    ],
    mistake:
      "Her değer değiştiğinde kaydetmek çok fazla istek gönderir. Veriyi bir oturum tablosunda tut ve çıkışta, kapanışta ve bir zamanlayıcıyla kaydet.",
    quiz: {
      q: "Kaydederken neden SetAsync yerine UpdateAsync kullanılır?",
      o: [
        "Daha hızlıdır",
        "Şu an kayıtlı değeri görür, böylece daha yeni veriyi körü körüne ezmez",
        "pcall gerektirmez",
        "Aynı anda her sunucuya kaydeder",
      ],
      why: "UpdateAsync okuma ve yazmayı tek adımda yapar, yani gerçekten kayıtlı olana göre karar verirsin.",
    },
  },

  "global-leaderboards": {
    title: "Global liderlik tabloları",
    summary: "Oynamış her oyuncuyu bir OrderedDataStore ile sırala ve ilk 10'u bir panoda göster.",
    sections: [
      {
        t: [
          'Normal bir DataStore sıralama yapamaz. OrderedDataStore sadece tam sayı saklar ama anahtarları değerlerine göre sıralı verebilir — "tüm zamanların ilk 10\'u" panosunun ihtiyacı tam olarak bu.',
        ],
      },
      { h: "Bir skoru kaydetmek" },
      { h: "İlk 10'u okumak" },
      {
        h: "İsimler ve yenileme",
        t: [
          "Anahtarlar UserId'dir; onları Players:GetNameFromUserIdAsync ile isme çevir — bir web isteği olduğu için pcall içinde.",
          "Panoyu bir iki dakikada bir yenile, asla her karede değil: her GetSortedAsync istek bütçenden yer.",
        ],
        tip: "OrderedDataStore sadece tam sayı alır. 12.5 saniye gibi bir süreyi sıralamak için math.floor(time * 1000) kaydet ve gösterirken 1000'e böl.",
      },
    ],
    game: {
      name: "Speedrun obby'leri ve dövüş oyunları",
      text: 'Lobilerdeki parlayan "En Çok Galibiyet" ve "En Hızlı Süreler" panoları OrderedDataStore\'dur. Bir döngü onları her 60 saniyede yeniler ve en iyi oyuncuların her biri için bir satır şablonunu kopyalar.',
    },
    tryIt: [
      "Uydurma beş oyuncu için skor kaydet ve ilk üçü yazdır.",
      "GetSortedAsync(true, 10) ile önce en düşük değerleri göster — en hızlı süreler için birebir.",
      "12.345 saniye gibi bir süreyi tam sayıya çevir ve geri çevir.",
    ],
    mistake:
      'Sadece bir OrderedDataStore sıralama yapabilir. Onu DataStoreService:GetOrderedDataStore("Wins") ile oluştur.',
    quiz: {
      q: "Hangi çağrı en yüksek 10 skoru verir?",
      o: [
        "store:GetSortedAsync(false, 10)",
        'store:GetAsync("top10")',
        "store:GetSortedAsync(true, 10)",
        "store:GetTop(10)",
      ],
      why: "İlk argüman artan sıra mı diye sorar: false, en yüksek önce demektir.",
    },
  },

  serialization: {
    title: "Her şeyi kaydetmek: serileştirme",
    summary:
      "DataStore'lar sadece düz veri kaydeder. Vector3'leri, Color3'leri ve koca yapıları tablolara çevir — ve geri.",
    sections: [
      {
        t: [
          "DataStore'lar JSON kaydeder: sayılar, metinler, boolean'lar ve bunlardan oluşan tablolar. Vector3, Color3, CFrame gibi Roblox tipleri ve Instance'lar doğrudan kaydedilemez.",
          "Serileştirmek, bir şeyi düz veriye çevirmek demektir; seriden çıkarmak onu geri çevirir. Her inşa oyunu ve kaydedilen her ev bunu yapar.",
        ],
      },
      { h: "Düz veri olarak vektörler ve renkler" },
      { h: "Koca bir yapıyı kaydetmek" },
      {
        h: "Verine sürüm vermek",
        t: [
          "Oyun büyüdükçe kayıt biçimin değişecek. Bir sürüm numarası sakla ve eski kayıtları yüklenirken güncelle; böylece geçen yıldan bir oyuncu hiçbir şey kaybetmez.",
        ],
        tip: "Bir şeyi yeniden kurmak için gerekenleri kaydet (isimler, konumlar, renkler), nesnelerin kendisini asla. Bir anahtar en fazla 4 MB tutar, kayıtları küçük tut.",
      },
    ],
    game: {
      name: "İnşa oyunları",
      text: "Bir inşa oyunundan çıkınca yerleştirdiğin her duvar, sandalye ve lamba eşya isimleri, konumlar ve renklerden oluşan bir tabloya serileştirilir. Arsanı yüklemek o tabloyu okur ve her eşyayı kopyalayıp yerine koyar.",
    },
    tryIt: [
      "Bir Color3'ü hex metnine çevir ve tekrar geri aç.",
      "Üç parçalı bir klasörü serileştir ve JSON'u yazdır.",
      "migrate'e her kayda bir Level alanı ekleyen 3. sürümü ekle.",
    ],
    mistake:
      "Vector3 düz veri değil, bir Roblox tipidir. Onun yerine X, Y ve Z sayılarını kaydet ve yüklerken Vector3.new ile yeniden kur.",
    quiz: {
      q: "Bir parçanın Color'ını DataStore'a nasıl kaydedersin?",
      o: [
        "part.Color'ı doğrudan kaydet",
        "Düz veri olarak (hex metni ya da R, G, B sayıları) kaydet ve yüklerken Color3'ü yeniden kur",
        "Bütün parçayı kaydet",
        "Renkler kaydedilemez",
      ],
      why: "Sadece düz veri kaydedilebilir, bu yüzden rengi önce metne ya da sayılara çevir.",
    },
  },

  "cross-server": {
    title: "Sunucular arası konuşmak",
    summary:
      "MessagingService ile oyununun bütün sunucularına aynı anda mesaj gönder — global duyurular, nadir düşen eşyalar ve etkinlikler.",
    sections: [
      {
        t: [
          "Her Roblox sunucusu kendi küçük dünyasıdır: A sunucusundaki bir oyuncu B sunucusunda olan hiçbir şeyi göremez.",
          "MessagingService onları bağlar. Bir sunucu bir konuya (topic) mesaj yayınlar ve o konuya abone olan her sunucu onu genelde bir saniye içinde alır.",
        ],
      },
      { h: "Abone ol ve yayınla" },
      {
        h: "Tablo göndermek",
        t: [
          "Bir mesaj küçük bir tablo taşıyabilir (en fazla 1 KB). Bir Kind alanı ekle ki tek bir konu birkaç farklı özelliği taşıyabilsin.",
        ],
        tip: "MessagingService'in sınırları var (sunucu başına dakikada kabaca 150 + 60 × oyuncu mesaj). Nadir ve önemli olayları yayınla — asla her karede ya da her coin'de değil.",
      },
      {
        h: "Profesyoneller ne için kullanır",
        l: [
          "Adminlerden global duyurular",
          'Her sunucuda "Biri az önce Efsanevi çıkardı!" bantları',
          "Her yerde aynı anda başlayan canlı etkinlikler",
          "Bir güncelleme için bütün sunuculara kapanmalarını söylemek",
        ],
      },
    ],
    game: {
      name: "Evcil hayvan simülatörleri",
      text: "Biri süper nadir bir evcil hayvan çıkardığında her sunucuda bir bant görünür. Çıkışı gören sunucu bir konuya yayınlar; diğerleri abonedir ve mesajı kendi oyuncularına gösterir.",
    },
    tryIt: [
      "Bir konuya abone ol ve aynı scriptten ona bir mesaj yayınla.",
      "Kind alanı olan bir tablo gönder ve iki farklı türü işle.",
      "PublishAsync'i pcall ile sar ve başarısız olursa warn ile uyar.",
    ],
    mistake:
      "Callback sana metnini değil, bir tablo verir. Yayınladığın şey message.Data'da (message.Sent de ne zaman gönderildiğini söyler).",
    quiz: {
      q: "SubscribeAsync'in callback'inde yayınladığın veri nerededir?",
      o: ["message", "message.Data", "message.Text", "message[1]"],
      why: "Mesaj bir tablodur: Data yayınlanan şey, Sent ise zamandır.",
    },
  },

  // ------------------------------------------------------------------ 12 · Security
  "server-authority": {
    title: "İstemciye asla güvenme",
    summary:
      "Exploit kullananlar her remote'u her değerle tetikleyebilir. Sunucuda her argümanı kontrol etmeyi öğren.",
    sections: [
      {
        t: [
          "Oyuncunun cihazında çalışan her şey — LocalScript'ler, arayüz, hatta karakterinin konumu — bir exploit kullanan tarafından değiştirilebilir. RemoteEvent'lerini de istedikleri argümanlarla, istedikleri sıklıkta tetikleyebilirler.",
          "Profesyonellerin kuralı: istemci ister, sunucu karar verir. Sunucu bir şey yapmadan önce her değeri kontrol eder.",
        ],
      },
      {
        h: "Tehlikeli bir remote neye benzer",
        t: [
          "Bu scriptte miktarı istemci seçiyor. Bir exploit kullanan sadece GiveCoins:FireServer(999999999) çalıştırır ve anında zengin olur — miktara sunucunun kendisi karar vermeli.",
        ],
      },
      { h: "Her argümanı kontrol etmek" },
      {
        h: "Mesafeler ve sayılar",
        t: [
          'Bir oyuncu "sandık açtığını" söylüyorsa karakterinin gerçekten yakında olduğunu kontrol et. Bir sayı gönderiyorsa NaN\'ı, sonsuzu ve beklediğin aralığın dışındaki her şeyi reddet.',
        ],
        tip: 'İstemciden gelen isimlere, fiyatlara ve miktarlara asla güvenme. Oyuncunun ne yapmak istediğini gönder ("Sword"), gerisini sunucu kendisi baksın.',
      },
    ],
    game: {
      name: "Popüler kalan her oyun",
      text: "Başarılı oyunların sunucuları her şeyi iki kez kontrol eder: dükkânlar fiyatı sunucuda bakar, silahlar menzili ve bekleme süresini kontrol eder, toplanabilir eşyalar mesafeyi kontrol eder. İstemciye güvenen oyunlar günler içinde sonsuz para exploit'leriyle dolar.",
    },
    tryIt: [
      "Sayı alan bir remote'a tip kontrolü ekle.",
      "Oyuncu dükkân tezgâhından 12 stud'dan uzaktaysa satın almayı reddet.",
      "isValidNumber'ın bir metin için ne döndürdüğüne bak.",
    ],
    mistake:
      "Fiyat istemciden geliyor, yani bir exploit kullanan onu hiç göndermeyebilir (bu hata) — ya da daha kötüsü, -1000000 gönderip coin kazanabilir. Fiyatı sunucuda bak: local price = PRICES[itemName].",
    quiz: {
      q: 'Bir istemci BuyItem\'ı ("Sword", 0) ile tetikliyor. Sunucu fiyat olarak neyi kullanmalı?',
      o: [
        "0, istemcinin gönderdiği",
        "Sunucunun kendi PRICES tablosundaki fiyatı",
        "İkisinin ortalamasını",
        "İstemciye tekrar sor",
      ],
      why: "İstemci sadece ne istediğini söyler. Ne kadar tuttuğuna sunucu karar verir.",
    },
  },

  "rate-limiting": {
    title: "Hız sınırları ve bekleme süreleri",
    summary:
      "Oyuncuların remote'ları spamlamasını durdur: oyuncu başına bekleme süreleri, istek bütçeleri ve çıkınca temizlik.",
    sections: [
      {
        t: [
          "Mükemmel kontrol edilmiş bir remote bile saniyede 1.000 kez tetiklenerek kötüye kullanılabilir — ödül kasmak ya da sunucunu kastırmak için. Hız sınırı, her oyuncunun bir şeyi ne sıklıkla yapabileceğine karar verir.",
        ],
      },
      { h: "Oyuncu başına bekleme süresi" },
      {
        h: "İstek bütçesi",
        t: [
          "Bekleme süresi her ani seriyi engeller. Bütçe ise birkaç hızlı harekete izin verir ama ortalamayı sınırlar: her oyuncunun zamanla dolan jetonları vardır ve her istek bir tane harcar.",
        ],
      },
      {
        h: "Hemen cezalandırma",
        t: [
          "Gecikme, dürüst bir oyuncunun isteklerinin ikişer ikişer gelmesine yol açabilir. Atmak yerine fazla istekleri sessizce yok say. Sadece biri sınırın çok üstündeyse — saniyede 50 istek gibi — kayda geç ya da at.",
        ],
        tip: "Oyuncuya göre anahtarlanan her tablonun PlayerRemoving'de temizlenmesi gerekir. Yoksa sunucu çalıştığı sürece büyür — bellek sızıntısı.",
      },
    ],
    game: {
      name: "Clicker ve simülatör oyunları",
      text: "Oto tıklayıcılar saniyede 100 kez tıklayabilir. Simülatör oyunları tıklamaları sunucuda sınırlar (genelde saniyede 10–20), böylece liderlik tablosu hile programını değil oynamayı ödüllendirir.",
    },
    tryIt: [
      "COOLDOWN'u 2 yap ve remote'u bir LocalScript'ten hızlıca tetikle.",
      "Her allow çağrısından sonra kaç jeton kaldığını yazdır.",
      "Bir oyuncu art arda 20 kez engellenince bir uyarı ekle.",
    ],
    mistake:
      "Bir oyuncu ilk kez vurduğunda last[player] hâlâ nil. Önce var olduğunu kontrol et: if last[player] and os.clock() - last[player] < 0.5 then.",
    quiz: {
      q: "Bir oyuncunun kaydını bekleme süresi tablosundan nerede silmelisin?",
      o: ["Hiçbir zaman", "Players.PlayerRemoving'de", "Her karede", "Bir LocalScript'te"],
      why: "Oyuncu çıkınca kaydı işe yaramaz — tablo sonsuza kadar büyümesin diye sil.",
    },
  },

  replication: {
    title: "Replikasyon: kim neyi görür",
    summary:
      "Sunucunun istemcilere ne gönderdiği, istemcilerin neyi değiştirebildiği, scriptleri ve varlıkları güvende kalacak yere koymak.",
    sections: [
      {
        t: [
          "Gerçek oyunu sunucu tutar. Sunucunun workspace'te, ReplicatedStorage'da ve oyuncularda yaptığı değişiklikler her istemciye otomatik kopyalanır (replike edilir).",
          "İstemcinin yaptığı değişiklikler o istemcide kalır. Bir LocalScript bir duvarı silerse, duvar sadece o oyuncu için kaybolur — diğer herkes hâlâ görür. Buna FilteringEnabled denir ve her zaman açıktır.",
        ],
      },
      {
        h: "Her şey nerede durur",
        l: [
          "ServerScriptService ve ServerStorage: onları sadece sunucu görebilir. Oyun mantığını, gizli değerleri ve şablonları buraya koy.",
          "ReplicatedStorage: sunucu da her istemci de görür. RemoteEvent'leri, ortak ModuleScript'leri ve istemcinin ihtiyaç duyduğu varlıkları buraya koy.",
          "Workspace: herkese replike edilen 3B dünya.",
          "StarterGui ve StarterPlayerScripts: her oyuncu girince ona kopyalanır ve onun cihazında çalışır.",
          "Bir oyuncunun PlayerGui'si: sadece o oyuncu (ve sunucu) görebilir.",
        ],
        tip: "Exploit kullananlar cihazlarına ulaşan her şeyi okuyabilir — ReplicatedStorage'ı, Workspace'i ve her LocalScript'in ve ortak ModuleScript'in kodunu. Admin listelerini ya da gizli anahtarları asla oraya koyma.",
      },
      { h: "İstemci değişiklikleri yerel kalır" },
      {
        h: "Sunucudan istemek",
        t: [
          "Bir değişikliğin herkes için olması gerekiyorsa istemci bir RemoteEvent tetikler ve değişikliği sunucu yapar. Sunucunun değişikliği sonra bütün oyunculara replike edilir.",
        ],
      },
    ],
    game: {
      name: "VIP kapılı obby'ler",
      text: "VIP kapısı genelde yerel olarak açılır: bir LocalScript game pass'i kontrol eder ve kapıyı sadece o oyuncu için içinden geçilebilir yapar. Diğer herkes hâlâ kapıya çarpar — remote'a gerek yok.",
    },
    tryIt: [
      "Bir LocalScript ile bir parçayı görünmez yap, sonra Studio'da Sunucu görünümüne geçip hâlâ orada olduğunu gör.",
      "Bir parçayı ServerStorage'dan ReplicatedStorage'a taşı ve bir LocalScript'ten oku.",
      "Onun yerine parçayı sunucuda değiştiren bir RemoteEvent tetikle.",
    ],
    mistake:
      "Bu satır bir LocalScript'te. ServerStorage istemcilere hiç gönderilmez, bu yüzden orada boş görünür. İstemcinin ihtiyaç duyduğu şeyleri ReplicatedStorage'a koy.",
    quiz: {
      q: "Bir LocalScript workspace.Wall.Transparency = 1 yapıyor. Duvarın kaybolduğunu kim görür?",
      o: ["Herkes", "Sadece o oyuncu", "Sadece sunucu", "Hiç kimse"],
      why: "İstemci değişiklikleri replike edilmez. Sadece o oyuncunun cihazı değişti.",
    },
  },

  "anti-cheat": {
    title: "Hilecileri sunucuda yakalamak",
    summary:
      "Hız hilelerini ve ışınlanmaları sunucudan fark et ve istemcinin iddia ettiği her vuruşu kontrol et.",
    sections: [
      {
        t: [
          "Her karakter kendi oyuncusunun cihazında fizikle simüle edilir, bu yüzden bir exploit kullanan WalkSpeed'inden hızlı koşabilir ya da ışınlanabilir. Ama sunucu karakterin nereye vardığını yine de görür — yani o hareketin mümkün olup olmadığını kontrol edebilir.",
          "İyi bir anti-hile cömerttir: gecikme ve düşmek büyük sıçramalar için dürüst sebeplerdir. Şüpheli oyuncuları ilk tuhaf ölçümde banlamak yerine geri çek.",
        ],
      },
      { h: "Hız kontrolü" },
      {
        h: "Vuruşları kontrol etmek",
        t: [
          'Bir istemci "o düşmanı vurdum" derse sunucu iddiayı kontrol eder: gerçekten yaşayan bir karakter mi, ve vurulabilecek kadar yakın mı?',
        ],
      },
      {
        h: "Sadece sunucu tarafı değerler",
        t: [
          "Bazı değerlere istemci hiç karar vermemeli: hasar, ödüller, fiyatlar, bekleme süreleri ve tur süreleri sunucu scriptlerinde yaşar. İstemci sadece oyuncunun ne yaptığını söyler — hangi tuş, hangi hedef — ve sonucu sunucu hesaplar.",
        ],
        tip: "Şüpheli olayları oyuncunun adıyla ve ne olduğuyla kaydet. Sadece tekrar eden, net ihlallerden sonra at — tek bir tuhaf ölçüm yüzünden asla.",
      },
    ],
    game: {
      name: "Rekabetçi nişancı oyunları",
      text: "Nişancı oyunları oyun akıcı hissettirsin diye mermileri istemcide anında çizer, ama sunucu her atışı yeniden kontrol eder: mesafe, görüş hattı ve atış hızı. Hileli bir istemci yine ateş edebilir — sadece sunucunun onaylamadığı hasarı veremez.",
    },
    tryIt: [
      "MAX_SPEED'i 20'ye indir ve kendine WalkSpeed 30 ver — kontrol seni yakalıyor mu?",
      "Bir oyuncunun saniyede sadece iki kez vurabilmesi için bekleme süresi ekle.",
      "Bir vuruş çok uzaksa mesafeyle birlikte warn ile uyar.",
    ],
    mistake:
      'Bir exploit kullanan hedef olarak herhangi bir nesne (ya da nil) gönderebilir. Kullanmadan önce typeof(target) == "Instance" olduğunu ve Humanoid\'in var olduğunu kontrol et.',
    quiz: {
      q: "Hız kontrolü neden Y eksenini yok sayar?",
      o: [
        "Çünkü Y hep 0'dır",
        "Düşmek ve zıplamak hız hilesi gibi görünmesin diye",
        "Çünkü exploit kullananlar Y'yi değiştiremez",
        "Kontrol daha hızlı çalışsın diye",
      ],
      why: "Yüksek bir binadan düşmek seni aşağı doğru hızla hareket ettirir — bu hile değil.",
    },
  },

  // ------------------------------------------------------------------ 13 · Game systems
  "inventory-system": {
    title: "Bir envanter sistemi",
    summary:
      "Yığınlama ve slot sınırı olan, tekrar kullanılabilir bir envanter modülü yap, sonra üstüne üretim (crafting) kur.",
    sections: [
      {
        t: [
          "Neredeyse her oyunda envanter vardır. Profesyoneller eşya kodunu her yere dağıtmak yerine birkaç net fonksiyonu olan tek bir ModuleScript yazar — Add, Remove, Count — ve diğer her sistem onları kullanır.",
        ],
      },
      { h: "Modül" },
      { h: "Kullanmak" },
      {
        h: "Üstüne üretim",
        t: [
          "Envanterin net bir fonksiyon seti olduğu için yeni özellikler kısa kalır. Bir üretim tarifi her malzeme için Count'u kontrol eder, onları çıkarır ve sonucu ekler.",
        ],
        tip: "Gerçek envanteri sunucuda tut (her oyuncunun oturum verisinin içinde) ve arayüzü çizmesi için istemciye bir kopyasını gönder. İstemci onu asla doğrudan değiştirmez.",
      },
    ],
    game: {
      name: "Hayatta kalma ve üretim oyunları",
      text: "Hayatta kalma oyunları tek bir Inventory modülünü toplama, üretim, takas ve kayıt arasında paylaşır. Bir ağaç bag:Add(\"Wood\") çağırır, üretim tezgâhı craft'ı çağırır, kayıt sistemi bag.items'ı saklar — hiçbir sistemin diğerlerinin nasıl çalıştığını bilmesi gerekmez.",
    },
    tryIt: [
      "2 Stone ve 1 Wood isteyen bir Sword tarifi ekle.",
      "Inventory:Add'in 1'den küçük miktarları reddetmesini sağla.",
      "Her eşya adını döndüren bir Inventory:List() yaz.",
    ],
    mistake:
      "Yeni bir eşya nil olarak başlar ve nil + 1 hata verir. Önce 0 yap (items.Wood = items.Wood or 0) — ya da bunu senin yerine yapan Inventory:Add gibi bir fonksiyon kullan.",
    quiz: {
      q: "Envanter neden tek bir ModuleScript'e konur?",
      o: [
        "ModuleScript'ler daha hızlı çalışır",
        "Her sistem aynı Add/Remove/Count'u kullanır, yani kurallar tek bir yerde durur",
        "Scriptler tablo kullanamaz",
        "Otomatik kaydeder",
      ],
      why: "Tek modül tek kural seti demek: orada bir hatayı düzelt, her sistem düzeltmeyi alsın.",
    },
  },

  combat: {
    title: "Dövüş: hitbox'lar ve hasar",
    summary:
      "Bir saldırının hitbox'ındaki her şeyi GetPartBoundsInBox ile bul, her düşmana bir kez hasar ver ve test ederken hitbox'ı göster.",
    sections: [
      {
        t: [
          "Touched olayları hızlı saldırılar için güvenilmezdir. Çoğu dövüş oyunu bunun yerine saldırı anında bir hitbox oluşturur: oyuncunun önünde görünmez bir kutu, ve motora içinde hangi parçaların olduğunu sorar.",
        ],
      },
      { h: "Bir kutuda ne olduğunu sormak" },
      { h: "Her düşmana bir kez hasar vermek" },
      {
        h: "Hitbox'ını görmek",
        t: [
          "Hitbox'lar görünmezdir, bu yüzden ayarlamaları zordur. Geliştirirken her birini yarı saydam kırmızı bir parça olarak çiz ve bir an sonra sil.",
        ],
        tip: "Hitbox'ı oluşturmadan önce bekleme süresini sunucuda kontrol et. Akıcı bir his için istemci vuruş animasyonunu ve sesini hemen çalar; hitbox'ı ve hasarı sunucu yapar, böylece taklit edilemezler.",
      },
    ],
    game: {
      name: "Battlegrounds oyunları",
      text: "Dövüş oyunları her yumruk ve yetenek için bir hitbox yapar, saldıranı filtreler, her karaktere bir kez hasar verir ve onları saldıranın baktığı yöne iter. Oyuncular animasyonu anında görür; kimin gerçekten vurulduğuna sunucu karar verir.",
    },
    tryIt: [
      "Hitbox'ı iki kat genişlet ve nasıl hissettirdiğine bak.",
      "attack'e 0.5 saniyelik bir bekleme süresi ekle.",
      "Vurulan karakterleri HumanoidRootPart'larına ApplyImpulse ile geri it.",
    ],
    mistake:
      'Kutu zemini ve duvarları da bulur, onların parent\'ında Humanoid yoktur. FindFirstChildOfClass("Humanoid") kullan ve nil döndüğü parçaları atla.',
    quiz: {
      q: "Parçalar üzerinde dönerken neden bir hit tablosu tutulur?",
      o: [
        "Daha hızlı olsun diye",
        "Bir karakterin birçok parçası var — o olmadan ona birkaç kez hasar verirsin",
        "GetPartBoundsInBox bunu ister",
        "Vuruşları DataStore'a kaydetmek için",
      ],
      why: "Kafa, gövde, kollar ve bacakların hepsi kutunun içinde olabilir. Tablo her humanoid'in bir kez vurulmasını sağlar.",
    },
  },

  "npc-ai": {
    title: "NPC yapay zekâsı: kovalama ve yol bulma",
    summary:
      "En yakın oyuncuyu bulan, PathfindingService ile duvarların etrafından dolaşan ve bekleme, kovalama ve saldırı arasında geçiş yapan düşmanlar yap.",
    sections: [
      {
        t: [
          "Bir NPC, tıpkı oyuncunun karakteri gibi içinde Humanoid olan bir Model'dir. humanoid:MoveTo(position) onu oraya yürütür; MoveToFinished vardığında (ya da 8 saniye sonra vazgeçtiğinde) tetiklenir.",
          "Akıllı düşmanların iki şeye karar vermesi gerekir: nereye gideceğine (en yakın oyuncu) ve oraya nasıl gideceğine (duvarların etrafından bir yol).",
        ],
      },
      { h: "En yakın oyuncuyu bulmak" },
      { h: "Bir yolu yürümek" },
      {
        h: "Bekle, kovala, saldır",
        t: [
          "İyi bir yapay zekâ birkaç durum arasında geçiş yapar. Her döngüde etrafına bakar ve birini seçer: bekle (yakında kimse yok), kovala (menzilde biri var) ya da saldır (biri çok yakın). Buna durum makinesi (state machine) denir.",
        ],
        tip: "Her karede yeni bir yol hesaplama — her 0.5 ila 1 saniyede bir yeterli. Duvarsız açık alanlarda oyuncuya doğru düz bir MoveTo daha ucuzdur ve aynı görünür.",
      },
    ],
    game: {
      name: "Korku ve zombi oyunları",
      text: "Korku oyunlarındaki canavarlar bir döngü çalıştırır: en yakın oyuncuyu bul, mobilyaların etrafından bir yol hesapla, ara noktaları yürü ve yaklaşınca saldırıya geç. Her yarım saniyede yeniden hesaplamak, sunucuyu kastırmadan onları akıllı hissettirir.",
    },
    tryIt: [
      "Zombiyi sabit bir nokta yerine en yakın oyuncuya yürüt.",
      "Yaklaşırken think'in durumunu her saniye yazdır.",
      "Yakında kimse olmayınca NPC'nin başladığı yere dönmesini sağla.",
    ],
    mistake:
      "Modelde Humanoid yok, bu yüzden script sonsuza kadar bekliyor. Bir NPC'nin Humanoid'e ve HumanoidRootPart'a ihtiyacı var — Rig Builder ile (Avatar sekmesi) hazır bir rig ekle.",
    quiz: {
      q: "Ara nokta döngüsünde humanoid.MoveToFinished:Wait() ne yapar?",
      o: [
        "NPC'yi ışınlar",
        "Sonrakine geçmeden önce NPC'nin ara noktaya varmasını (ya da vazgeçmesini) bekler",
        "NPC'yi durdurur",
        "Yolu hesaplar",
      ],
      why: "O olmasa her MoveTo bir öncekini anında değiştirir ve NPC duvarların içinden düz geçmeye çalışırdı.",
    },
  },

  quests: {
    title: "Bir görev sistemi",
    summary:
      '"10 coin topla" ya da "3 zombi yen" gibi hedefleri veri olarak yazılmış görevler ve oyun olaylarını dinleyen bir takipçiyle izle.',
    sections: [
      {
        t: [
          "Bir görev sadece veridir: ne yapılacak, kaç kez ve ödül ne. Görevleri bir tablo olarak yaz; tek bir küçük takipçi hepsini çalıştırabilir — görev eklemek hiç yeni kod gerektirmez.",
        ],
      },
      { h: "Veri olarak görevler" },
      {
        h: "Takipçi",
        tip: "Bu takipçi tek bir oyuncunun ilerlemesini tutuyor. Gerçek bir oyunda her oyuncunun oturum verisinin içinde bir ilerleme tablosu tut, böylece görevler yeniden girince de kalır.",
      },
      {
        h: "Gerçek olayları bağlamak",
        t: [
          'Diğer sistemler sadece ne olduğunu duyurur — görevlerin varlığından haberleri bile yoktur. Haberi bir BindableEvent taşır: zombi scripti QuestEvent\'i "ZombieDefeated" ile, coin scripti "CoinCollected" ile tetikler.',
        ],
      },
    ],
    game: {
      name: "RPG'ler ve battle pass'ler",
      text: "Günlük görevler, battle pass'ler ve başarımlar aynı sistemdir: bir hedef tablosu, oyun olaylarını dinleyen bir takipçi ve bir hedefe ulaşılınca ödüller. Tasarımcılar yeni görevleri satır ekleyerek ekler — yeni kod yok.",
    },
    tryIt: [
      'Bir Jumped olayını dinleyen "20 kez zıpla" görevi ekle.',
      "Bir görev tamamlanınca Reward'ını bir coins değişkenine ekle.",
      "report'un zaten bitmiş görevleri yok saymasını sağla.",
    ],
    mistake:
      "İlk report'tan önce progress[quest.Id] nil. Kimsenin başlamadığı bir görev 0 sayılsın diye (progress[quest.Id] or 0) kullan.",
    quiz: {
      q: "Görevler neden bir veri tablosu olarak yazılır?",
      o: [
        "Tablolar koddan hızlıdır",
        "Tek bir takipçi her görevi çalıştırır, görev eklemek sadece satır eklemektir",
        "Görevler tablo olarak kaydedilmek zorundadır",
        "Oyuncular düzenleyebilsin diye",
      ],
      why: "Veriyle çalışan sistemler kod kopyalayarak değil, veri ekleyerek büyür.",
    },
  },

  "wave-spawner": {
    title: "Dalga üretici",
    summary:
      "Düşmanları büyüyen dalgalar halinde çıkar, hepsi yenilene kadar bekle, sonra sıradakini başlat — kule savunma ve hayatta kalma oyunlarının kalbi.",
    sections: [
      {
        t: [
          "Bir dalga oyunu tek bir döngüyü tekrarlar: birkaç düşman çıkar, hepsi gidene kadar bekle, kısa bir mola ver, sonra daha fazla (ya da daha güçlü) düşmanla tekrar yap.",
        ],
      },
      { h: "Dalga döngüsü" },
      {
        h: "Gerçek düşmanları kopyalamak",
        t: [
          "Gerçek bir oyunda düşman ServerStorage'da hazır bir modeldir. Onu kopyala, PivotTo ile bir çıkış noktasına yerleştir ve Enemies klasörüne koy.",
        ],
      },
      {
        h: "Zorluğu artırmak",
        t: [
          "Zorluğu yavaşça artır: her dalgada birkaç düşman daha, biraz daha can ve her 5 dalgada bir boss. Sayıları tek bir fonksiyonda tut ki kodu karıştırmadan oyunu dengeleyebilesin.",
        ],
        tip: "Düşmanları elle artırıp azalttığın bir sayıyla değil, bir klasörle (ya da CollectionService etiketleriyle) say — unutulan tek bir -1 dalgayı sonsuza kadar dondurur.",
      },
    ],
    game: {
      name: "Kule savunma oyunları",
      text: "Kule savunma oyunları yollu dalga üreticileridir: her dalga ara noktalar boyunca üssüne daha fazla düşman gönderir, oyun onlar yenilene ya da kaçana kadar bekler, sonra sana para ödeyip sıradakinden önce kısa bir mola verir.",
    },
    tryIt: [
      "Bir dalga sırasında her saniye kaç zombi kaldığını yazdır.",
      "Her üçüncü dalgada 5 kat canı olan bir boss çıkar.",
      "Bir dalga temizlenince her oyuncuya 10 coin ver.",
    ],
    mistake:
      ":Clone() olmadan şablonun kendisini taşırsın. O zombi yenilip yok edilince çıkaracak hiçbir şey kalmaz. Her zaman template:Clone() çıkar.",
    quiz: {
      q: "Döngü bir dalganın temizlendiğini nasıl anlar?",
      o: [
        "Sabit 30 saniye bekler",
        "Enemies klasöründe hiç çocuk kalmayana kadar bekler",
        "Oyuncular bir tuşa basar",
        "Son düşman bir mesaj yazdırır",
      ],
      why: "Her düşman klasörde yaşar, yani boş bir klasör her düşmanın gittiği demektir.",
    },
  },

  // ------------------------------------------------------------------ 14 · Polish & feel
  "ui-layout": {
    title: "Profesyonel arayüz: ölçek, düzenler ve listeler",
    summary:
      "Scale, AnchorPoint ve UIListLayout ile her ekrana uyan arayüz yap ve listeleri koddan oluştur.",
    sections: [
      {
        t: [
          "Bir UDim2 boyutunun iki kısmı var: Scale (parent'ın bir kesri) ve Offset (piksel). Pikseller senin monitöründe iyi, telefonda berbat görünür; bu yüzden profesyoneller neredeyse her şeyi Scale ile boyutlandırır.",
          "AnchorPoint, bir frame'in Position'ının hangi noktasını gösterdiğini seçer. AnchorPoint (0.5, 0.5) ile frame'in merkezi Position'a oturur — yani Position (0.5, 0.5) onu her ekranda ortalar.",
        ],
      },
      { h: "Ortalanmış bir panel" },
      { h: "Kendini dizen listeler" },
      {
        h: "Şablonlar koddan iyidir",
        t: [
          "Her frame'i kodla oluşturmak uzar. Birçok profesyonel Studio'da tek bir satır tasarlar, onu şablon olarak tutar ve her eşya için Clone ile kopyalar — yerleştirmeyi düzen nesnesi yapar.",
        ],
        tip: "Yayınlamadan önce arayüzünü Studio'nun cihaz emülatörüyle (Test sekmesi → Device) bir telefonda ve tablette test et. Oyuncuların çoğu mobilde.",
      },
    ],
    game: {
      name: "Ön sayfadaki her oyun",
      text: "En iyi oyunlardaki dükkânlar, envanterler ve ayar menüleri UIListLayout ya da UIGridLayout'lu ScrollingFrame'lerdir. Bir script her eşya için bir satır şablonu kopyalar ve düzen onları her ekran boyutunda hizalar.",
    },
    tryIt: [
      "Paneli %60 genişliğe çıkar ve emülatörde bir telefonda kontrol et.",
      "UIListLayout'u CellSize UDim2.fromScale(0.3, 0.3) olan bir UIGridLayout ile değiştir.",
      "Butonlar kenarlara değmesin diye bir UIPadding ekle.",
    ],
    mistake:
      "Arayüz boyutları Vector2 değil, UDim2'dir. Parent'ın yarısı kadar bir boyut için UDim2.fromScale(0.5, 0.5) kullan.",
    quiz: {
      q: "Hangi boyut telefonda ve PC'de aynı görünür?",
      o: [
        "UDim2.fromOffset(400, 300)",
        "UDim2.fromScale(0.4, 0.3)",
        "UDim2.new(0, 400, 0, 300)",
        "Vector2.new(400, 300)",
      ],
      why: "Scale parent'ın bir kesridir, yani ekranla birlikte büyür ve küçülür.",
    },
  },

  sounds: {
    title: "Ses efektleri ve müzik",
    summary:
      "Sesleri 3B ya da her yerde çal, tek seferlik efektleri temizle, müziği döngüye al ve sesi SoundGroup'larla kontrol et.",
    sections: [
      {
        t: [
          "Bir Sound, SoundId'sindeki sesi çalar. Nereye koyduğun önemlidir: bir Part'ın içinde 3B'dir — yakındayken daha yüksek — SoundService'te ya da bir GUI'de ise her yerde aynı seste çalar.",
        ],
      },
      { h: "Bir parçada 3B ses" },
      {
        h: "Tek seferlik efektler",
        t: [
          "Kısa bir efekt için bir ses yap, çal ve bitince yok et — yoksa her coin toplayışı geride bir Sound daha bırakır.",
        ],
      },
      {
        h: "Müzik ve ses grupları",
        tip: "Arayüz tıklamalarını ve kişisel sesleri bir LocalScript'ten çal ki sadece o oyuncu duysun. Sunucunun bir parçanın içinde çaldığı sesleri yakındaki herkes duyar.",
      },
    ],
    game: {
      name: "Korku oyunları",
      text: "Korku oyunları sesle yaşar: canavar yaklaştıkça yükselen 3B ayak sesleri, bir SoundGroup'ta dönen ortam sesi ve ani tek seferlik çığlıklar. RollOffMaxDistance, onun geldiğini ne kadar uzaktan duyabileceğine karar verir.",
    },
    tryIt: [
      "Bir parçaya dönen bir 3B ses koy ve Play modunda ondan uzaklaş.",
      "Bir coin'in playOnce ile toplama sesi çalmasını sağla.",
      "Music grubunun Volume'ünü 0 yapan bir Sessiz butonu ekle.",
    ],
    mistake:
      "Bu id oyununun kullanabileceği bir sesi göstermiyor. Yüklediğin bir sesin ya da Creator Store'dan bir sesin id'sini kopyala ve rbxassetid:// önekini koru.",
    quiz: {
      q: "Oyuncular yakındayken daha yüksek çalması için bir ses nereye konur?",
      o: ["SoundService", "workspace'teki bir Part'ın içine", "StarterGui", "ReplicatedStorage"],
      why: "Parçaların içindeki sesler konumsaldır: sesleri dinleyene olan mesafeye bağlıdır.",
    },
  },

  animations: {
    title: "Animasyon oynatmak",
    summary:
      "Animasyonları karakterin Animator'üne yükle, önceliği, hızı ve döngüyü kontrol et ve işaretçilere tepki ver.",
    sections: [
      {
        t: [
          "Animasyonlar Animation Editor'da yapılır ve bir id almak için yüklenir. Birini oynatmak için o id'yle bir Animation nesnesi yap ve onu Humanoid'in Animator'üne yükle. Play, Stop ve AdjustSpeed'i olan bir AnimationTrack alırsın.",
        ],
      },
      { h: "Bir emote oynatmak" },
      { h: "Track'i kontrol etmek" },
      {
        h: "İşaretçiler: doğru anda harekete geç",
        t: [
          "Animation Editor'da kılıcın değdiği kareye bir işaretçi — mesela Impact — ekleyebilirsin. GetMarkerReachedSignal(\"Impact\") tam o anda tetiklenir: hitbox'ı oluşturmak için en doğru an.",
        ],
        tip: "Her animasyonu karakter başına bir kez yükle ve track'i sakla. Her saldırıda LoadAnimation çağırmak, Roblox seni uyarmaya başlayana kadar track biriktirir.",
      },
    ],
    game: {
      name: "Dövüş oyunları",
      text: "Dövüş oyunlarında her hareket, karakter doğunca yüklenen bir animasyon track'idir. Saldırı Action önceliğinde oynar, vuruş karesindeki bir işaretçi hitbox'ı tetikler ve silahlar geliştikçe AdjustSpeed saldırıları hızlandırır.",
    },
    tryIt: [
      "Oyuncu E'ye basınca (bir RemoteEvent ile) el sallama emote'unu oynat.",
      "AdjustSpeed(2) ile bir saldırıyı 2 kat hızlandır.",
      "Track'in Stopped olayı tetiklenince bir mesaj yazdır.",
    ],
    mistake:
      "Animasyonlar sadece onları yükleyen kullanıcıya ya da gruba ait oyunlarda oynar. Animasyonu oyunun sahibi olan hesaptan (ya da gruptan) yükle, sonra yeni id'yi kullan.",
    quiz: {
      q: "Bir karakter için animasyon nereye yüklenir?",
      o: ["workspace", "Humanoid'in Animator'ü", "ReplicatedStorage", "HumanoidRootPart"],
      why: "Animator (Humanoid'in içinde) track'leri karakterin eklemlerinde oynatır.",
    },
  },

  camera: {
    title: "Kamera kontrolü ve efektler",
    summary:
      "Ara sahneler için kamerayı hareket ettir, patlamalarda salla ve görüş alanını değiştir — hepsi LocalScript'lerden.",
    sections: [
      {
        t: [
          "Her oyuncunun kendi kamerası vardır: bir LocalScript'te workspace.CurrentCamera. CameraType'ı Scriptable yap, oyun onu hareket ettirmeyi bırakır; böylece onu istediğin yere koyabilirsin. Kontrolü oyuncuya geri vermek için tekrar Custom yap.",
        ],
      },
      { h: "Basit bir ara sahne" },
      { h: "Kamera sarsıntısı" },
      {
        h: "Görüş alanı ve ekran efektleri",
        t: [
          "FieldOfView yakınlaştırır: 70 normaldir, yüksek değer hızlı hissettirir (koşarken birebir), düşük değer yakınlaştırır. Lighting'deki efektler — Blur, ColorCorrection, Bloom — da tween'lenebilir; vuruş parlamaları ya da menüler için. Bir LocalScript'te yapılınca sadece o oyuncuyu etkilerler.",
        ],
        tip: "Bir ara sahne bitince kamerayı her zaman geri ver (CameraType = Custom) — ve oyuncu yarıda reset atarsa ne olduğunu test et.",
      },
    ],
    game: {
      name: "Hikâye oyunları",
      text: "Hikâye oyunları bir ara sahneyle açılır: kamera Scriptable olur, diyalog oynarken birkaç CFrame arasında tween'lenir, bir şey patlayınca sarsılır ve sonunda kontrolü oyuncuya geri verir.",
    },
    tryIt: [
      "Art arda üç kamera konumu olan bir ara sahne yap.",
      "Oyuncu yüksek bir zıplamadan yere inince kamerayı salla.",
      "Shift basılıyken FieldOfView'u genişlet.",
    ],
    mistake:
      "CFrame, dönüşü de içeren bir CFrame ister. CFrame.new(0, 10, 0) kullan ya da bir şeye nişan almak için CFrame.lookAt(from, to).",
    quiz: {
      q: "Kamerayı kendin hareket ettirebilmen için CameraType ne olmalı?",
      o: ["Custom", "Scriptable", "Follow", "Attach"],
      why: "Scriptable'da varsayılan kamera scriptleri onu hareket ettirmeyi bırakır, böylece senin CFrame'in kalır.",
    },
  },

  "day-night": {
    title: "Gece-gündüz döngüsü ve atmosfer",
    summary:
      "Güneşi Lighting.ClockTime ile hareket ettir, gece olunca tepki ver ve havayı Atmosphere ve renk efektleriyle ayarla.",
    sections: [
      {
        t: [
          "Lighting.ClockTime günün saatidir: 0 gece yarısı, 6 gün doğumu, 12 öğle, 18 gün batımı. Onu değiştir; güneş, ay, gökyüzü ve gölgeler takip eder.",
          "Gece-gündüz döngüsü, ClockTime'a biraz ekleyen bir döngüden ibarettir.",
        ],
      },
      { h: "Döngü" },
      { h: "Gece olunca bir şeyler yapmak" },
      {
        h: "Atmosfer ve renk",
        tip: "Döngüyü sunucuda çalıştır ki her oyuncu aynı saati paylaşsın. Saatler arasında atlarsan gökyüzü bir anda değişmesin diye ClockTime'ı tween'le.",
      },
    ],
    game: {
      name: "Hayatta kalma oyunları",
      text: "Hayatta kalma oyunlarında gece tehlikelidir: ClockTime 18'i geçince sunucu daha fazla canavar çıkarır, lambalar Neon'a döner ve müzik değişir. Sabah 6 onları gönderir.",
    },
    tryIt: [
      "Bir günü 2 dakika yap ve güneşin hareketini izle.",
      "Lamp etiketli her parçayı gece Neon yap.",
      "Bir gün batımı için ClockTime'ı 5 saniyede 12'den 20'ye tween'le.",
    ],
    mistake: 'TimeOfDay "14:00:00" gibi bir metindir. Sayı için ClockTime = 14 kullan.',
    quiz: {
      q: "Lighting.ClockTime = 18 neyi gösterir?",
      o: ["Gece yarısı", "Öğle", "Gün batımı", "Gün doğumu"],
      why: "ClockTime saat cinsindendir: 18, güneşin battığı akşam altıdır.",
    },
  },

  // ------------------------------------------------------------------ 15 · Ship your game
  architecture: {
    title: "Büyük bir oyunu düzenlemek",
    summary:
      "Projeni profesyoneller gibi kur: her taraf için tek script, ModuleScript'lerde servisler ve controller'lar, ortak kod tek yerde.",
    sections: [
      {
        t: [
          "Küçük oyunlarda parçaların içine dağılmış düzinelerce Script olur. 10.000 satırda bu dağılır: kimse hangi scriptin ne yaptığını bilmez ve scriptler rastgele bir sırayla başlar.",
          "Çoğu profesyonel proje tek-script düzeni kullanır: sunucuda bir Script ve istemcide bir LocalScript; her biri ModuleScript'leri require eder — sunucuda servisler, istemcide controller'lar.",
        ],
      },
      {
        h: "Her şey nereye gider",
        l: [
          "ServerScriptService › Main (Script): her servisi require eder ve başlatır.",
          "ServerScriptService › Services: DataService, ShopService, CombatService gibi ModuleScript'ler.",
          "StarterPlayerScripts › Main (LocalScript): her controller'ı require eder ve başlatır.",
          "StarterPlayerScripts › Controllers: UIController, CameraController, InputController.",
          "ReplicatedStorage › Shared: iki tarafın da kullandığı ayar tabloları, yardımcı modüller ve tipler.",
        ],
      },
      { h: "Bir servis" },
      {
        h: "Her şeyi başlatan tek Script",
        tip: 'Kod yazmadan önce "bu hangi servisin işi?" diye sor. İki servisin aynı yardımcıya ihtiyacı varsa o Shared\'a aittir.',
      },
    ],
    game: {
      name: "Birçok geliştiricisi olan stüdyolar",
      text: "Bir stüdyoda bir geliştirici CombatService'in, bir diğeri ShopService'in sahibi olabilir. Her servisin küçük bir genel API'si (ShopService.GetPrice) vardır, böylece insanlar birbirinin kodunu bozmadan aynı anda çalışabilir.",
    },
    tryIt: [
      "Start fonksiyonu olan bir DataService modülü ekle ve Main'in onu başlattığını gör.",
      "ShopService'in DataService'i (en üstte değil) Start içinde kullanmasını sağla.",
      "Her controller'ı aynı şekilde başlatan bir istemci Main LocalScript'i yaz.",
    ],
    mistake:
      "En üstte birbirini require eden iki modül birbirini sonsuza kadar bekler. Önce yükleyici her şeyi require etsin; diğer servisleri sadece Start içinde kullan.",
    quiz: {
      q: "Tek-script düzeninde sunucunun Main scripti ne yapar?",
      o: [
        "Bütün oyun kodunu içerir",
        "Her servis modülünü require eder ve başlatır",
        "Sadece veri kaydeder",
        "İstemcide çalışır",
      ],
      why: "Main küçük bir yükleyicidir; asıl kod servis modüllerinde yaşar.",
    },
  },

  performance: {
    title: "Performans ve bellek sızıntıları",
    summary:
      "Sunucuları saatlerce akıcı tut: olayların bağlantısını kes, oluşturduğunu yok et, meşgul döngülerden kaçın ve optimize etmeden önce ölç.",
    sections: [
      {
        t: [
          "5 dakika iyi çalışan bir oyun 5 saat sonra sürünebilir. Olağan sebepler: hiç kesilmeyen bağlantılar, hiç yok edilmeyen nesneler, büyümeye devam eden tablolar ve her karede çok iş yapan döngüler.",
        ],
      },
      { h: "Bağladığının bağlantısını kes" },
      { h: "Oyuncu başına veriyi temizle" },
      {
        h: "Daha az iş yap",
        l: [
          "Ağır kodu her karede çalıştırma: 0.2 saniyede bir kontrol etmek yetiyorsa Heartbeat yerine task.wait(0.2) olan bir döngü kullan.",
          "İçinde task.wait olmayan bir while true do asla yazma — sunucuyu dondurur.",
          "Her saniye yüzlerce nesne oluşturup yok etmek yerine nesneleri tekrar kullan (bir mermi havuzu).",
          "Önce ölç: MicroProfiler (Ctrl+F6) ve Developer Console (F9) gerçekte neyin yavaş olduğunu gösterir.",
        ],
        tip: "Debris:AddItem(part, 5), ayakta bir döngü ya da iş parçacığı tutmadan bir parçayı 5 saniye sonra yok eder — efektler için birebir.",
      },
    ],
    game: {
      name: "Uzun oturumlu oyunlar",
      text: "Idle ve tycoon oyunları sunucuları saatlerce açık tutar. Geliştiricileri Developer Console'daki Memory sekmesini izler: bir sayı hep artıyorsa bir şey sızıyordur — genelde hiç silinmeyen bir bağlantı ya da tablo kaydı.",
    },
    tryIt: [
      "Bir parçayı Heartbeat ile döndür ve 5 saniye sonra durdur.",
      "Oyuncular çıktıktan sonra oyuncu başına bir tabloda kaç kayıt kaldığını say.",
      "Bir Heartbeat kontrolünü 0.5 saniyede bir çalışan bir döngüyle değiştir.",
    ],
    mistake:
      "Beklemesi olmayan bir döngü oyunun geri kalanının çalışmasına hiç izin vermez. Döngünün içine task.wait(0.5) (ya da ihtiyacın olan gecikmeyi) koy.",
    quiz: {
      q: "Oyuncu başına bir şey saklayan bir tabloyu PlayerRemoving'de hiç temizlemezsen ne olur?",
      o: [
        "Hiçbir şey",
        "Sunucu çalıştığı sürece büyür — bir bellek sızıntısı",
        "Roblox onu otomatik temizler",
        "Hemen hata verir",
      ],
      why: "Tablo şimdiye kadar giren her oyuncuyu tutar, yani bellek kullanımı hep artar.",
    },
  },

  monetization: {
    title: "Game pass'ler ve developer product'lar",
    summary:
      "Tek seferlik game pass'leri ve tekrar alınabilen developer product'ları doğru şekilde sat — sunucu kontrolleri ve ProcessReceipt ile.",
    sections: [
      {
        t: [
          "Game pass'ler bir kez alınır ve sonsuza kadar sahip olunur (VIP, çift coin, özel bir eşya). Developer product'lar tekrar tekrar alınabilir (100 coin, yeniden doğma). İkisini de Creator Hub'da oluşturursun ve her birinin bir id'si olur.",
          "Satın almaları sunucu işler. İstemci sadece satın alma penceresini açar.",
        ],
      },
      { h: "Bir game pass'i kontrol etmek" },
      {
        h: "Developer product satmak",
        tip: "PurchaseGranted'ı sadece ödül gerçekten verildikten (ve kaydedildikten) sonra döndür. Bir şey başarısız olursa NotProcessedYet döndür, Roblox daha sonra tekrar dener — oyuncu boşuna para ödemez.",
      },
      { h: "Satın alma penceresini açmak" },
    ],
    game: {
      name: "Ücretsiz oynanan hit oyunlar",
      text: "Popüler ücretsiz oyunlar adil hissettiren pass'lerden (VIP sohbet etiketi, ekstra depo, daha hızlı yumurta açma) ve anlık alınan product'lardan (boss savaşını kaybetmeden hemen önce yeniden doğma) kazanır. Tekrar denemeli ProcessReceipt, harcanan her Robux'un bir ödüle dönüşmesini sağlar.",
    },
    tryIt: [
      "VIP attribute'unu kullanarak VIP oyunculara altın bir isim etiketi ver.",
      "PRODUCTS'a 500 coinlik bir product ekle.",
      "VIP pass satın alma penceresini PromptGamePassPurchase ile açan bir buton yap.",
    ],
    mistake:
      "ProcessReceipt bir olay değil — bir kez atadığın bir callback'tir: MarketplaceService.ProcessReceipt = function(receipt) … end. Oyunda onu sadece tek bir script ayarlamalı.",
    quiz: {
      q: "Ödülü vermek başarısız olunca ProcessReceipt ne döndürmeli?",
      o: ["PurchaseGranted", "NotProcessedYet", "nil", "false"],
      why: "NotProcessedYet, Roblox'a daha sonra tekrar denemesini söyler; böylece oyuncu parasını verdiği şeyi yine alır.",
    },
  },

  teams: {
    title: "Takımlar ve takım oyunları",
    summary:
      "Takımlar oluştur, oyuncuları aralarında dengele, dost ateşini engelle ve takım skorlarını tut.",
    sections: [
      {
        t: [
          "Teams servisi Team nesnelerini tutar. player.Team'i ayarlamak oyuncuyu bir takıma koyar: oyuncu listesinde adı takımın renginde görünür ve TeamColor'ı eşleşen SpawnLocation'lar onu doğru üste doğurur.",
        ],
      },
      { h: "Takım oluşturmak ve dengelemek" },
      { h: "Dost ateşi yok" },
      {
        h: "Takım skorları",
        tip: "Team.AutoAssignable = true, yeni oyuncuları Roblox'un senin yerine dengelemesini sağlar. Takımları tur scriptin kendisi seçiyorsa false yap.",
      },
    ],
    game: {
      name: "Bayrak kapmaca ve takım nişancı oyunları",
      text: "Takım oyunları her turun başında takımları seçer, oyuncuları takımlarının üssünde doğurur, dost ateşini sunucuda engeller ve takım başına puan sayar. Hedef skora ilk ulaşan takım turu kazanır.",
    },
    tryIt: [
      "Üçüncü bir takım ekle ve üçünü de dengeli tut.",
      "Yeni bir tur başlayınca oyuncuların takım değiştirmesini sağla.",
      "Kazanan takımdaki her oyuncuya 25 coin ver.",
    ],
    mistake: "Team, adını değil Team nesnesini ister: player.Team = Teams.Red.",
    quiz: {
      q: "Dost ateşini nasıl engellersin?",
      o: [
        "Kurbanın Team'i saldıranın Team'iyle aynıysa hasarı atla",
        "CanCollide'ı false yap",
        "Herkese ForceField ver",
        "İki farklı place kullan",
      ],
      why: "Sunucu hasar vermeden önce iki takımı karşılaştırır.",
    },
  },

  capstone: {
    title: "Final projesi: eksiksiz bir oyun yayınla",
    summary:
      "Kurstaki her şeyle tam bir mini oyun planla, yap, test et ve yayınla — öğrencilikten scripter'lığa geçiş.",
    sections: [
      {
        t: [
          'Artık profesyonel Roblox scripter\'larının her gün kullandığı araçları biliyorsun. Son adım onları insanların oynayabileceği bir şeyde birleştirmek: turları, takımları, dükkânı, kaydı ve global liderlik tablosu olan bir "coin rush" arenası.',
          "Her şeyi bir anda yapma. Önce küçük bir sürüm yayınla, sonra özellikleri tek tek ekle ve her birinden sonra test et.",
        ],
      },
      {
        h: "Plan",
        l: [
          "DataService: tekrar denemeli, otomatik kayıtlı ve BindToClose'lu oturum verisi.",
          "RoundService: ara → 60 saniyelik tur → sonuçlar, takımlarla.",
          "CoinService: her tur coin çıkarır; sunucu her toplamayı kontrol eder.",
          "ShopService: fiyatlar için bir RemoteFunction ve satın almak için kontrollü, hız sınırlı bir RemoteEvent.",
          "Arayüz controller'ları: Scale tabanlı bir HUD, bir dükkân listesi ve bir tur sayacı.",
          "OrderedDataStore ile toplam coinlerin global liderlik tablosu.",
        ],
      },
      { h: "Coin toplamanın güvenli yolu" },
      {
        h: "Yayın kontrol listen",
        l: [
          "Her remote argümanlarını kontrol ediyor ve hız sınırlı.",
          "Veri çıkışta, kapanışta ve birkaç dakikada bir kaydediliyor — ve yüklenemeyen veri asla kaydedilmiyor.",
          "task.wait'siz while true döngüsü yok; oyuncu başına her bağlantı ve tablo kaydı temizleniyor.",
          "Arayüz cihaz emülatörüyle telefonda, tablette ve PC'de test edildi.",
          "Replikasyon hatalarını yakalamak için 2+ oyuncuyla test edildi (Test sekmesi → Clients and Servers).",
          "Yayınlamadan önce ikon, küçük resimler, açıklama ve ayarlar dolduruldu.",
        ],
        tip: "Yayından sonra Creator Hub'daki analizleri oku: oyuncuların geri dönme oranı ve oturum süresi sırada neyi düzelteceğini söyler. Sık güncelle — oyunlar oyuncularıyla birlikte büyür.",
      },
    ],
    game: {
      name: "Kendi oyunun",
      text: "Ön sayfadaki her oyun küçük bir ilk sürüm olarak başladı. Seninkini yayınla, arkadaşlarını davet et, nasıl oynadıklarını izle ve geliştirmeye devam et — bir scripter'ı oyun geliştiricisine dönüştüren bu döngüdür.",
    },
    tryIt: [
      "Kendi oyununun planını servisler ve controller'lar listesi olarak yaz.",
      "CoinService'i yap ve Studio'da iki oyuncuyla toplamayı test et.",
      "Oyunu yayınla (File → Publish to Roblox) ve bir arkadaşınla paylaş.",
    ],
    mistake:
      "Studio'da DataStore'lar için oyunun yayınlanmış olması ve Game Settings → Security'de \"Enable Studio Access to API Services\"in açık olması gerekir.",
    quiz: {
      q: "Büyük bir oyun yapmanın en iyi yolu nedir?",
      o: [
        "Her şeyi tek bir dev scripte yaz",
        "Önce küçük bir sürüm yayınla, sonra özellikleri tek tek ekleyip test et",
        "Olabildiğince çok ücretsiz model kullan",
        "Hiçbir şeyi test etmeden önce bütün özellikleri ekle",
      ],
      why: "Küçük, test edilmiş adımlar hataları erken bulur ve oyununu oyunculara daha çabuk ulaştırır.",
    },
  },
};
