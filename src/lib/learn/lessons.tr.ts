/**
 * Turkish text for the course. Sections are matched by index; code samples,
 * Roblox names and error messages stay as they are in lessons.ts.
 */
import type { Lesson } from "./lessons";

interface SectionTr {
  h?: string;
  t?: string[];
  l?: string[];
  tip?: string;
  cap?: string;
  w?: string;
}

interface LessonTr {
  title: string;
  summary: string;
  sections?: Array<SectionTr | null>;
  game?: { name: string; text: string };
  tryIt?: string[];
  mistake?: string;
  quiz?: { q: string; o: string[]; why: string };
}

export const CHAPTERS_TR: Record<string, string> = {
  "1 · Getting started": "1 · Başlangıç",
  "2 · Luau basics": "2 · Luau temelleri",
  "3 · Making things happen": "3 · Bir şeyler olsun",
  "4 · Multiplayer & saving": "4 · Çok oyunculu ve kayıt",
  "5 · Build a game": "5 · Oyun yap",
};

const TR: Record<string, LessonTr> = {
  "studio-tour": {
    title: "Roblox Studio turu",
    summary: "Yolunu bul: 3D görüntü alanı, Explorer, Properties ve Output penceresi.",
    sections: [
      {
        t: [
          "Roblox Studio, Roblox oyunları yapmak için kullandığın ücretsiz uygulamadır. Bir oyunda gördüğün her şey — harita, oyuncular, ekrandaki butonlar — Studio'da bir objedir; scriptler de bu objelere bir şeyler yaptırmanın yoludur.",
        ],
        cap: "Sürekli kullanacağın dört alan.",
      },
      {
        h: "Dört panel",
        l: [
          "Viewport (ortada): 3D dünya. Bir parçayı seçmek için tıkla, taşımak için sürükle.",
          "Explorer (sağda): oyundaki her objenin ağacı. Scriptler de burada durur.",
          "Properties (sağda, Explorer'ın altında): seçili objenin ayarları — Size, Color, Anchored…",
          "Output (altta): scriptlerinden gelen mesajlar ve bütün hatalar. View → Output ile aç. Hep açık tut!",
        ],
      },
      {
        h: "Oyununu oynamak",
        t: [
          "Oyuncu gibi test etmek için Play'e (F5), düzenlemeye dönmek için Stop'a (Shift+F5) bas. Oynarken yaptığın değişiklikler Stop'a basınca silinir — düzenlemeyi Stop'tan sonra yap.",
        ],
        tip: "Explorer, Properties ya da Output'u göremiyorsan View sekmesinden aç.",
      },
    ],
    tryIt: [
      "Studio başlangıç sayfasından yeni bir Baseplate yeri oluştur.",
      "Home sekmesi → Part ile bir blok ekle. Move aracıyla taşı.",
      "Properties'te düşmesin diye Anchored'ı işaretle ve Color'ını değiştir.",
      "View → Output'u aç ve Play'e bas.",
    ],
    quiz: {
      q: "Bir script bozulunca nereye bakarsın?",
      o: ["Toolbox'a", "Output penceresine", "Properties penceresine", "Avatar sekmesine"],
      why: "Her hata (kırmızı) ve her print(), script adı ve satır numarasıyla birlikte Output'ta görünür.",
    },
  },
  "first-script": {
    title: "İlk scriptin",
    summary: "Bir Script ekle, bir mesaj yazdır ve Output'ta gör.",
    sections: [
      {
        t: [
          "Scriptler de birer objedir. Onları Explorer'dan eklersin: ServerScriptService'in üzerine gel, ⊕ butonuna tıkla ve Script'i seç. Studio onu bir satırı hazır yazılmış olarak açar.",
        ],
        cap: "Scriptler ne yaptıklarına göre farklı yerlere konur. ServerScriptService ile başla.",
      },
      {
        h: "Merhaba dünya",
        t: [
          "print() Output penceresine bir mesaj yazar. Elindeki en faydalı hata ayıklama aracıdır.",
        ],
        tip: "Luau büyük/küçük harfe duyarlıdır: print çalışır, Print ve PRINT diye bir şey yoktur.",
      },
      {
        h: "Yorumlar",
        t: [
          "-- işaretinden sonraki her şey yorumdur. Luau onu yok sayar — insanlar için bir nottur.",
        ],
      },
    ],
    tryIt: [
      "ServerScriptService'e bir Script ekle.",
      'print("...") içindeki metni kendi adınla değiştir.',
      "Play'e bas ve mesajı Output'ta bul.",
    ],
    mistake: "Büyük P ile Print diye bir şey yok, bu yüzden nil'dir — nil de çağrılamaz.",
    quiz: {
      q: 'print("Hi") ne yapar?',
      o: [
        "Her oyuncunun ekranında Hi gösterir",
        "Output penceresine Hi yazar",
        "Kâğıda yazdırır",
        "Bir TextLabel oluşturur",
      ],
      why: "print sadece Output'a yazar. Oyunculara yazı göstermek için TextLabel gibi arayüz objeleri kullanırsın.",
    },
  },
  "script-types": {
    title: "Script, LocalScript, ModuleScript",
    summary: "Sunucu ve istemci; hangi script nerede çalışır?",
    sections: [
      {
        t: [
          "Bir Roblox oyunu tek bir sunucuda (Roblox'un bilgisayarı) ve her oyuncunun cihazında (istemciler) çalışır. Roblox scriptingindeki en önemli fikir budur.",
        ],
      },
      {
        h: "Hangi script nereye?",
        l: [
          "Script — sunucuda çalışır. ServerScriptService'e (ya da Workspace'teki bir parçanın içine) koy. Önemli her şey için kullan: coinler, hasar, kayıt, doğma.",
          "LocalScript — tek bir oyuncunun cihazında çalışır. StarterPlayer › StarterPlayerScripts, StarterGui ya da StarterCharacterScripts içine koy. Arayüz, kamera ve klavye/fare girdisi için kullan.",
          "ModuleScript — diğer scriptlerin require() ile yüklediği ortak kod. Kendi başına çalışmaz.",
        ],
      },
      {
        h: "“Ben”i sadece istemci bilir",
        t: [
          "Bir oyuncunun cihazında tam olarak bir oyuncu vardır, bu yüzden LocalScript Players.LocalPlayer'ı kullanabilir. Sunucuda ise birçok oyuncu vardır, bu yüzden orada LocalPlayer nil'dir.",
        ],
      },
    ],
    game: {
      name: "Arsenal tarzı nişancı oyunları",
      text: "Nişangâhın, mermi sayacın ve silah sesleri anında hissettirsin diye cihazındaki LocalScript'ler tarafından yönetilir. Ama bir atışın gerçekten birini vurup vurmadığına — ve kimin öldürdüğüne — sunucudaki bir Script karar verir, böylece oyuncular kendi oyunlarını değiştirerek hile yapamaz.",
    },
    mistake:
      "Bu bir sunucu Script'i, orada LocalPlayer her zaman nil'dir. Sunucuda oyuncuları Players.PlayerAdded'dan al.",
    quiz: {
      q: "Oyunculara coin veren kod nerede çalışmalı?",
      o: [
        "Hızlı olsun diye bir LocalScript'te",
        "Sunucudaki bir Script'te",
        "Tek başına bir ModuleScript'te",
        "Fark etmez",
      ],
      why: "Önemli olan her şey (coinler, hasar, eşyalar) sunucuda yapılmalı. İstemciler hileciler tarafından değiştirilebilir.",
    },
  },
  variables: {
    title: "Değişkenler ve türler",
    summary: "Değerleri isimli kutularda sakla: sayılar, metinler, boolean'lar ve nil.",
    sections: [
      {
        t: [
          "Değişken, bir değer tutan isimli bir kutudur. local, bir isim, = ve bir değerle oluşturursun. Sonra onu okuyabilir ya da içine yeni bir değer koyabilirsin.",
        ],
      },
      null,
      {
        h: "Dört temel tür",
        l: [
          "number (sayı) — 5, -3, 2.5",
          'string (metin) — tırnak içindeki yazı: "Hello", "Dragon"',
          "boolean — true ya da false",
          "nil — hiçbir değer yok. nil'i bir obje gibi kullanmak hataların 1 numaralı sebebidir.",
        ],
        tip: "Yeni değişkenlerin önüne her zaman local yaz. Açık isimler kullan: ws değil, walkSpeed.",
      },
    ],
    game: {
      name: "Blox Fruits tarzı istatistikler",
      text: "Bir dövüş RPG'si seviye (sayı), takılı meyve (metin), güvenli bölgede olup olmadığın (boolean) ve şu anki hedefin (bir obje, kimseyle dövüşmüyorsan nil) gibi değerleri takip eder. Her biri sadece bir değişkendir.",
    },
    mistake: "fruit tanımlandı ama hiç değer verilmedi, bu yüzden nil — nil de metne eklenemez.",
    quiz: {
      q: '"250" hangi türdür?',
      o: ["number", "string", "boolean", "nil"],
      why: 'Tırnak içindeki her şey string\'dir, sayı gibi görünse bile. 250 sayısını almak için tonumber("250") kullan.',
    },
  },
  "math-strings": {
    title: "Matematik ve metin",
    summary:
      ".., metin içine değer yerleştirme, tostring ve tonumber ile ödül hesapla, mesaj oluştur.",
    sections: [
      null,
      {
        h: "Metinle çalışmak",
        tip: "Bir TextBox'tan gelen yazı her zaman string'dir. Matematik yapmadan önce tonumber() ile çevir ve oyuncu harf yazmış olabilir diye nil kontrolü yap.",
      },
    ],
    game: {
      name: "Pet Simulator tarzı çarpanlar",
      text: "Pet toplama oyunları çoğunlukla matematiktir: saniye başına coin = temel gelir × pet çarpanı × varsa boostlar. `local income = 10 * petMultiplier * (hasDoubleCoins and 2 or 1)` gibi bir satır bütün ekonominin kalbidir.",
    },
    mistake: '"ten" sayı olmayan bir metin, bu yüzden çarpılamaz.',
    quiz: {
      q: '"5" .. "5" ne verir?',
      o: ["10", '"55"', "25", "hata"],
      why: ".. metinleri birleştirir, toplamaz. Matematik için + kullan.",
    },
  },
  "if-statements": {
    title: "if ile karar vermek",
    summary: "Kodu sadece bir şey doğruysa çalıştır; elseif, else, and, or, not ile.",
    sections: [
      null,
      null,
      {
        h: "Karşılaştırmalar",
        l: [
          "== eşit (iki tane = işareti!)",
          "~= eşit değil",
          "<  >  <=  >= küçük / büyük",
          "and, or, not koşulları birleştirir",
        ],
        tip: '= bir değişkene değer koyar. == ise "bunlar eşit mi?" diye sorar. Bunları karıştırmak klasik bir sözdizimi hatasıdır.',
      },
    ],
    game: {
      name: "Tower of Hell tarzı bitiş çizgisi",
      text: "Kulenin tepesine dokununca oyun kontrol eder: gerçekten bütün aşamaları tırmandın mı? Tur hâlâ devam ediyor mu? Sadece ikisi de doğruysa kazanırsın. Bu, and içeren bir if'tir.",
    },
    mistake: "Koşullar == ile karşılaştırılır. Tek = atamadır ve if içinde kullanılamaz.",
    quiz: {
      q: "Hangi satır coins'in 0 OLMADIĞINI kontrol eder?",
      o: [
        "if coins != 0 then",
        "if coins ~= 0 then",
        "if coins =! 0 then",
        "if not coins = 0 then",
      ],
      why: "Luau'da eşit değil ~= diye yazılır.",
    },
  },
  loops: {
    title: "Döngüler",
    summary: "for ve while ile kodu tekrarla — ve task.wait() neden önemli.",
    sections: [
      null,
      { h: "for ile saymak" },
      { h: "Bir listeyi gezmek" },
      {
        h: "Sonsuza kadar tekrarlamak",
        tip: 'task.wait() olmayan bir döngü oyunun başka hiçbir şey yapmasına izin vermez. Studio donar ve birkaç saniye sonra "Script timeout: exhausted allowed execution time" hatası gelir.',
      },
    ],
    game: {
      name: "Natural Disaster Survival tarzı turlar",
      text: "Tur oyunları tek bir büyük döngüdür: lobide bekle, for döngüsüyle geri say, bir felaket seç, tur bitene kadar bekle, hayatta kalanlara galibiyet ver, tekrarla. Bütün oyun, doğru yerlerde task.wait() olan bir `while true do ... end`'dir.",
    },
    mistake:
      "Döngü hiç beklemiyor, bu yüzden tek karede milyonlarca kez çalışıyor ve Roblox scripti durduruyor.",
    quiz: {
      q: "`for i = 1, 3 do` kaç kez çalışır?",
      o: ["2", "3", "4", "sonsuza kadar"],
      why: "i = 1, 2 ve 3 için çalışır — iki uç da dahildir.",
    },
  },
  functions: {
    title: "Fonksiyonlar",
    summary: "Kodu parametreleri ve dönüş değerleri olan, tekrar kullanılabilir bloklara koy.",
    sections: [
      {
        t: [
          "Fonksiyon, tekrar tekrar çalıştırabildiğin isimli bir kod parçasıdır. Parametreler girdilerdir; return ise bir sonucu geri gönderir.",
        ],
        tip: "local fonksiyonları onları çağıran kodun ÜSTÜNDE tanımla. Bir local sadece kendi satırından aşağıda vardır.",
      },
      {
        h: "Event dinleyicisi olarak fonksiyonlar",
        t: [
          "Çoğu zaman bir fonksiyonu Roblox'a verirsin ve o da onu daha sonra senin için çağırır — event'ler böyle çalışır (sonraki bölüm).",
        ],
      },
    ],
    game: {
      name: "Blox Fruits tarzı dövüş",
      text: "Bir dövüş oyunundaki her saldırı aynı birkaç fonksiyondan geçer: calculateDamage(attacker, move), applyDamage(target, amount), giveXP(player, amount). Onları bir kez yazıp her yerde çağırmak yüzlerce hareketi tutarlı tutar.",
    },
    mistake:
      "calculateDamage 3. satırda çağrılıyor ama ancak 5. satırda tanımlanıyor, bu yüzden 3. satır çalışırken hâlâ nil.",
    quiz: {
      q: "`return` ne yapar?",
      o: [
        "Scripti yeniden başlatır",
        "Fonksiyonu çağıran yere bir değer geri gönderir",
        "Bir değer yazdırır",
        "Fonksiyonu siler",
      ],
      why: "return fonksiyonu bitirir ve değeri geri verir: local hit = calculateDamage(10, 50).",
    },
  },
  tables: {
    title: "Tablolar: listeler ve sözlükler",
    summary: "Birçok değeri tek bir değişkende sakla — envanterler, ayarlar, oyuncu verileri.",
    sections: [
      null,
      { h: "Listeler (diziler)" },
      {
        h: "Sözlükler (isimli anahtarlar)",
        tip: "Olmayan bir anahtarı okumak hata değil nil verir — hata daha sonra o nil'i kullandığında gelir.",
      },
    ],
    game: {
      name: "Adopt Me tarzı envanterler",
      text: "Bir pet envanteri sözlüklerden oluşan bir listedir: her petin bir adı, nadirliği, yaşı ve Neon olup olmadığı vardır. Takas, iki oyuncunun listeleri arasında öğe değiştirmektir — tabii ki sunucuda.",
    },
    mistake:
      "inventory içinde Pets anahtarı yok, bu yüzden inventory.Pets nil ve döngüyle gezilecek bir şey yok.",
    quiz: {
      q: 'local t = {"a", "b", "c"} — t[0] nedir?',
      o: ['"a"', "nil", '"c"', "hata"],
      why: "Luau listeleri 1'den başlar. t[1] \"a\"dır, t[0] ise sadece nil'dir.",
    },
  },
  parts: {
    title: "Parçalar, özellikler ve konumlar",
    summary: "Instance.new, Vector3 ve CFrame ile koddan parça oluştur ve değiştir.",
    sections: [
      null,
      { h: "Bir parça oluşturmak" },
      {
        h: "Taşımak ve döndürmek",
        tip: "Position sadece parçanın nerede olduğudur. CFrame ise konum + dönüştür. Bir şeyi döndürmek için CFrame kullan.",
      },
    ],
    game: {
      name: "Tower of Hell tarzı engeller",
      text: "Obby oyunları hareket eden ve dönen platformlarla doludur: CFrame'i her karede biraz değiştirilen (ya da tween'lenen, Tween dersine bak) sabitlenmiş bir parça. Neon kırmızı parçalar tek bir Touched event'iyle öldüren bloklara dönüşür.",
    },
    mistake:
      "Position bir Vector3 ister. Vector3.new(0, 10, 0) kullan ya da CFrame'i part.CFrame'e ata.",
    quiz: {
      q: "Havada duran bir platformda neden Anchored = true yapılır?",
      o: [
        "Görünmez olsun diye",
        "Yer çekimi onu düşürmesin diye",
        "Öldürücü olsun diye",
        "Kaydedilsin diye",
      ],
      why: "Sabitlenmemiş parçalar fizikle simüle edilir ve aşağı düşer.",
    },
  },
  events: {
    title: "Event'ler: Touched ve öldüren bloklar",
    summary: "Oyunda olan şeylere tepki ver — ilk öldüren bloğunu ve coinini yap.",
    sections: [
      null,
      {
        h: "Öldüren blok",
        t: ["Bu Script'i parçanın içine koy. script.Parent, scriptin içinde bulunduğu parçadır."],
      },
      {
        h: "Bir kez toplanabilen coin",
        t: [
          "Bir şeyin üstünde dururken Touched saniyede defalarca tetiklenir. Bir 'debounce' değişkeni kodun sadece bir kez çalışmasını sağlar.",
        ],
        tip: "FindFirstChildOfClass / GetPlayerFromCharacter sonucunu her zaman kontrol et. Şapkalar, aletler ve rastgele parçalar da bir şeylere dokunur!",
      },
    ],
    game: {
      name: "Obby öldüren blokları",
      text: "Her obby'nin lav zemini, lazeri ve dönen bıçağı tam olarak bu scripttir. Büyük oyunlar bütün öldürücü parçaları CollectionService ile etiketler, böylece tek bir script yüzlercesini yönetir (bunu son projede yapacaksın).",
    },
    mistake: "Şapkanın Handle'ı bloğa değdi, bu yüzden hit.Parent karakter değil şapkaydı.",
    quiz: {
      q: "Bir coinde neden debounce değişkeni kullanılır?",
      o: [
        "Dönsün diye",
        "Touched defalarca tetiklenir — ödül bir kez verilmeli",
        "DataStore'a kaydetmek için",
        "Debounce onu hızlandırır",
      ],
      why: "Onsuz tek bir dokunuş, coin kaybolmadan önce 5–10 coin verebilir.",
    },
  },
  leaderstats: {
    title: "Oyuncular ve leaderstats",
    summary: "Her oyuncuya skor tablosunda görünen Coins ve Wins ver.",
    sections: [
      null,
      {
        t: [
          "Bir oyuncunun içinde adı tam olarak leaderstats olan ve içinde değer objeleri (IntValue, NumberValue, StringValue) bulunan bir Folder varsa Roblox otomatik olarak skor tablosu gösterir.",
        ],
      },
      {
        h: "Pasif gelir",
        tip: "Coins bir IntValue objesidir. Sayı coins.Value içindedir — .Value'yu unutmak çok yaygın bir hatadır.",
        w: "Aynı Script, yukarıdaki kodun altına",
      },
    ],
    game: {
      name: "Pet Simulator / simülatör oyunları",
      text: "Simülatörler önemli olan her şeyi skor tablosuna koyar: Coins, Gems, Rebirths. Sunucu birkaç saniyede bir ve her tıklamada gelir ekler — tıpkı yukarıdaki döngü gibi, üstüne petlerden ve boostlardan gelen çarpanlarla.",
    },
    mistake:
      "Klasörün adı büyük L ile Leaderstats, ama scriptler leaderstats'ı bekliyor — isimler birebir aynı olmalı.",
    quiz: {
      q: "Nasıl 5 coin eklersin?",
      o: ["coins += 5", "coins.Value += 5", "coins.Coins = 5", "leaderstats + 5"],
      why: "coins bir IntValue objesidir; sayısı coins.Value'dur.",
    },
  },
  gui: {
    title: "Arayüz: butonlar ve yazılar",
    summary: "Oyuncunun coinlerini ekranda göster ve bir butonla dükkân aç.",
    sections: [
      {
        t: [
          "Arayüz StarterGui'de durur. Bir ScreenGui ekle, sonra içine bir TextLabel (yazı) ya da TextButton (tıklanabilir) koy. Bir oyuncu doğunca Roblox StarterGui'deki her şeyi onun PlayerGui'sine kopyalar — bu yüzden arayüz scriptleri LocalScript'tir.",
        ],
      },
      { h: "Coin sayacı" },
      {
        h: "Dükkân açan bir buton",
        tip: "Telefona ve PC'ye sığsın diye arayüzü Scale ile boyutlandır (UDim2'deki ilk sayı): UDim2.fromScale(0.3, 0.1).",
      },
    ],
    game: {
      name: "Dress to Impress tarzı menüler",
      text: "Moda ve rol yapma oyunları çoğunlukla arayüzdür: frame'leri gösterip gizleyen kategori butonları, eşya ızgaraları ve sunucuya ne seçtiğini söyleyen birkaç RemoteEvent. Her buton, yukarıdaki gibi bir MouseButton1Click bağlantısıdır.",
    },
    mistake:
      "ShopButton bir TextLabel olarak oluşturulmuş. Sadece TextButton ve ImageButton tıklanabilir.",
    quiz: {
      q: "Bir scriptten game.StarterGui'yi değiştirmek neden oyuncunun gördüğünü değiştirmez?",
      o: [
        "StarterGui sadece PlayerGui'ye kopyalanan bir şablondur",
        "StarterGui sadece sunucudadır",
        "Arayüz scriptle değiştirilemez",
        "Önce yayınlaman gerekir",
      ],
      why: "Oyuncular player.PlayerGui içindeki kendi kopyalarını görür. Onu değiştir.",
    },
  },
  tweens: {
    title: "Tween'ler: yumuşak animasyon",
    summary: "TweenService ile kapı kaydır, buton zıplat, parça soldur.",
    sections: [
      null,
      null,
      {
        h: "Arayüzü tween'lemek",
        tip: "Hedef değer özellikle aynı türde olmalı: arayüz Size/Position için UDim2, parça Size/Position için Vector3, renkler için Color3.",
        w: "Bir TextButton içindeki LocalScript",
      },
    ],
    game: {
      name: "Doors tarzı kapılar",
      text: "Korku oyunları kapıları açar, ışıkları titretir ve kamerayı tween'lerle sallar. Açılan bir kapı, CFrame'inin tween'idir (bir dönüşle menteşelenmiş); genelde bir ProximityPrompt ile tetiklenir — o da sonraki ders.",
    },
    mistake: "Bir Frame'in Size'ı Vector3 değil, UDim2'dir.",
    quiz: {
      q: "Bir Frame'in Position'ını hangi değer tween'leyebilir?",
      o: ["Vector3.new(0, 1, 0)", "UDim2.fromScale(0.5, 0.5)", "CFrame.new(0, 1, 0)", '"center"'],
      why: "Arayüz konumları ve boyutları UDim2'dir.",
    },
  },
  prompts: {
    title: "ProximityPrompt: etkileşim için E'ye bas",
    summary: "Oyuncu yakında bir tuşa basınca tepki veren kapılar, dükkânlar ve NPC'ler.",
    sections: [
      null,
      {
        tip: "Prompt'lar PC'de, telefonda (dokunarak) ve kolda otomatik çalışır — fazladan kod gerekmez.",
      },
    ],
    game: {
      name: "Brookhaven tarzı rol yapma",
      text: "Rol yapma kasabaları prompt'larla doludur: evin kapısını aç, arabaya bin, bir eşya al, zili çal. Her biri, Triggered event'i sana basan oyuncuyu veren bir ProximityPrompt'tur.",
    },
    mistake: "Triggered, kapı parçasının değil, kapının içindeki ProximityPrompt'un event'idir.",
    quiz: {
      q: "prompt.Triggered fonksiyonuna ne verir?",
      o: ["Parçayı", "Basan oyuncuyu", "Basılan tuşu", "Hiçbir şey"],
      why: "Triggered:Connect(function(player) ... ) — böylece kimin etkileşime girdiğini bilirsin.",
    },
  },
  "remote-events": {
    title: "RemoteEvent'ler: istemci ↔ sunucu",
    summary: "Bir arayüz butonu sunucudan bir şey satın almasını istesin — güvenle.",
    sections: [
      null,
      {
        h: "Hazırlık",
        l: [
          "ReplicatedStorage'a BuyItem adında bir RemoteEvent ekle.",
          "ServerStorage'a içinde Sword adında bir Tool olan Items adında bir Folder ekle.",
          "Aşağıdaki LocalScript için bir ScreenGui'ye TextButton ekle.",
        ],
      },
      { h: "İstemci: isteği gönder" },
      {
        h: "Sunucu: her şeyi kontrol et, sonra harekete geç",
        tip: "İstemcinin kaç coin ekleneceğini ya da ne kadar hasar verileceğini göndermesine asla izin verme. Oyuncunun ne yapmak istediğini gönder; sayılara sunucu karar versin.",
      },
    ],
    game: {
      name: "Jailbreak tarzı dükkânlar ve eylemler",
      text: "Polis-hırsız oyununda ekranındaki 'tutukla' ya da 'silah al'a basmak sadece bir istek gönderir. Sunucu yeterince yakın olup olmadığını, doğru takımda olup olmadığını ve paranın yetip yetmediğini kontrol eder — hilecilerin kendilerine para verememesinin sebebi budur.",
    },
    mistake:
      "Bu kod bir sunucu Script'inde. Sunucu istemcilere FireClient(player, ...) ile gönderir.",
    quiz: {
      q: 'İstemci buyItem:FireServer("Sword") çağırıyor. Sunucudaki fonksiyon ne alır?',
      o: ['("Sword")', '(player, "Sword")', '("Sword", player)', "(player)"],
      why: "Roblox oyuncuyu otomatik olarak ilk argüman yapar.",
    },
  },
  datastores: {
    title: "DataStore'lar: ilerlemeyi kaydetmek",
    summary: "Oyuncular çıkınca coinleri kaydet, geri gelince yükle.",
    sections: [
      null,
      {
        h: "Başlamadan önce",
        l: [
          "Yeri yayınla (File → Publish to Roblox).",
          "Game Settings → Security → Enable Studio Access to API Services'i aç.",
        ],
      },
      {
        tip: "pcall hataları yakalar: Roblox sunucularında bir aksaklık olursa scriptin çalışmaya devam eder. Yükleme başarısız olduysa kaydetme — gerçek veriyi 0 ile ezersin.",
        w: "ServerScriptService › Data (Script) — leaderstats scriptinin yerine geçer",
      },
    ],
    game: {
      name: "Grow a Garden tarzı ilerleme",
      text: "Çiftlik oyunları çok şey kaydeder: coinler, bahçendeki her bitki, büyüme aşaması, tohumların. Bunu oyuncu başına tek bir tablo olarak saklarlar ({ Coins = 500, Plants = {...} } gibi) ve sen çıkınca, sunucu kapanınca ve birkaç dakikada bir kaydederler.",
    },
    mistake: "Studio'nun henüz DataStore kullanmasına izin yok — yeri yayınla ve API erişimini aç.",
    quiz: {
      q: "Daha önce hiç oynamamış bir oyuncu için GetAsync ne döndürür?",
      o: ["0", "nil", "boş bir tablo", "hata"],
      why: "O anahtarla henüz hiçbir şey kaydedilmedi, bu yüzden nil alırsın — `saved or 0` kullan.",
    },
  },
  modules: {
    title: "ModuleScript'ler: ortak kod",
    summary:
      "Oyun verilerini ve yardımcı fonksiyonları her scriptin require edebileceği tek bir yerde tut.",
    sections: [
      null,
      null,
      {
        h: "Kullanmak",
        tip: "ReplicatedStorage'daki modüller hem sunucu hem istemci tarafından require edilebilir. Gizli sunucu mantığını bunun yerine ServerScriptService ya da ServerStorage'a koy.",
        w: "Herhangi bir Script ya da LocalScript",
      },
    ],
    game: {
      name: "Pet Simulator tarzı ayarlar",
      text: "Yüzlerce pet, yumurta ve yükseltmesi olan oyunlar bütün sayıları ModuleScript'lerde tutar. Dükkân arayüzü, yumurta açma scripti ve gelir döngüsü aynı ayarları okur, böylece tek bir sayıyı değiştirmek bütün oyunu günceller.",
    },
    mistake: "Modül tablosunu hiç döndürmüyor. Son satır olarak `return PetConfig` ekle.",
    quiz: {
      q: "Bir ModuleScript'in son satırı genelde ne olmalı?",
      o: ["end", "return ModuleName", "require()", "print()"],
      why: "Modül neyi döndürürse, require() diğer scriptlere onu verir.",
    },
  },
  "project-obby": {
    title: "Mini proje: coinli obby",
    summary: "Hepsini birleştir: öldüren bloklar, checkpoint'ler, coinler, galibiyetler ve kayıt.",
    sections: [
      { cap: "Yapacağın şey." },
      {
        h: "1. Parkuru yap",
        l: [
          "SpawnLocation'dan Finish adında bir bitiş parçasına kadar platformlar (sabitlenmiş parçalar) yap.",
          "Birkaç kırmızı parça yap ve her birine Properties → Tags'ten KillBrick etiketini ekle.",
          "Yol boyunca Checkpoints adında bir Folder içine SpawnLocation'lar koy (Neutral işaretli kalsın).",
          "Coin ekle: her birinde aşağıdaki coin Script'i olan küçük sarı parçalar.",
          "Önceki leaderstats Script'ini (Coins ve Wins ile) koru.",
        ],
      },
      { h: "2. Bütün öldüren bloklar, tek script" },
      { h: "3. Checkpoint'ler" },
      { h: "4. Geri gelen coinler" },
      {
        h: "5. Bitiş çizgisi",
        tip: "Galibiyetler kaydedilsin mi? Bunu DataStore dersiyle birleştir ve { Coins = ..., Wins = ... } tablosunu kaydet.",
      },
    ],
    game: {
      name: "Tower of Hell ve bütün obby'ler",
      text: "Bu, Roblox'ta en çok oynanan türün çekirdeği. Popüler obby'ler bir zamanlayıcı, leaderstats'ta bir aşama sayacı, coinle satılan hız/yer çekimi bobinleri ve günlük ödül ekler — hepsini artık yapmayı biliyorsun.",
    },
    tryIt: [
      "2 oyuncuyla test et: Test sekmesi → Clients and Servers → 2 Players → Start.",
      "Coinlerin dokunuş başına bir kez sayıldığını ve ölünce checkpoint'lerin çalıştığını kontrol et.",
      "Yayınla ve bir arkadaşınla paylaş!",
    ],
  },
  debugging: {
    title: "Profesyonel gibi hata ayıklama",
    summary: "Hataları oku, satırı bul ve print ile neler olduğunu kanıtla.",
    sections: [
      null,
      {
        h: "Adım adım",
        l: [
          "Output'taki İLK kırmızı hatayı oku — sonraki hatalar çoğu zaman ilkinden kaynaklanır.",
          "Satıra gitmek için üzerine tıkla.",
          "Sor: bu satırdaki hangi değer nil ya da yanlış türde olabilir?",
          "O değeri satırın hemen üstünde print() ile yazdır ve tekrar çalıştır.",
          "Sadece çöken satırı değil, değerin geldiği yeri düzelt.",
        ],
      },
      {
        h: "print ile hata ayıklama",
        tip: "Takıldın mı? Hatayı ve scriptini hata analizcisine (bu sitenin ana sayfası) yapıştır. Tam satırı gösterir ve nedenini söyler.",
      },
    ],
    mistake: 'FindFirstChild("boss") hiçbir şey bulamadı çünkü modelin adı Boss (büyük B).',
    quiz: {
      q: "Output'ta 3 hata var. Hangisini önce düzeltirsin?",
      o: ["Sonuncuyu", "İlkini", "En uzununu", "Herhangi birini"],
      why: "İlk hata çoğu zaman diğerlerine sebep olur — onu düzelt, diğerleri kaybolabilir.",
    },
  },
};

/** The lesson with its prose in the chosen language (code stays the same). */
export function localizeLesson(lesson: Lesson, lang: "en" | "tr"): Lesson {
  if (lang !== "tr") return lesson;
  const t = TR[lesson.id];
  if (!t) return lesson;
  return {
    ...lesson,
    chapter: CHAPTERS_TR[lesson.chapter] ?? lesson.chapter,
    title: t.title,
    summary: t.summary,
    sections: lesson.sections.map((s, i) => {
      const st = t.sections?.[i];
      if (!st) return s;
      return {
        ...s,
        heading: st.h ?? s.heading,
        text: st.t ?? s.text,
        list: st.l ?? s.list,
        tip: st.tip ?? s.tip,
        visual: s.visual && { ...s.visual, caption: st.cap ?? s.visual.caption },
        code: s.code && { ...s.code, where: st.w ?? s.code.where },
      };
    }),
    game: lesson.game && t.game ? t.game : lesson.game,
    tryIt: t.tryIt ?? lesson.tryIt,
    mistake: lesson.mistake && { ...lesson.mistake, explain: t.mistake ?? lesson.mistake.explain },
    quiz:
      lesson.quiz && t.quiz
        ? { ...lesson.quiz, question: t.quiz.q, options: t.quiz.o, why: t.quiz.why }
        : lesson.quiz,
  };
}

/** Title only (sidebar, next/previous buttons). */
export function lessonTitle(lesson: Lesson, lang: "en" | "tr"): string {
  return lang === "tr" ? (TR[lesson.id]?.title ?? lesson.title) : lesson.title;
}

export function chapterName(chapter: string, lang: "en" | "tr"): string {
  return lang === "tr" ? (CHAPTERS_TR[chapter] ?? chapter) : chapter;
}
