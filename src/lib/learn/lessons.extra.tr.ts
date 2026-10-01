/** Turkish text for the lessons in lessons.extra.ts (sections are matched by index). */
import type { LessonTr } from "./lessons.tr";

export const TR_EXTRA: Record<string, LessonTr> = {
  dictionaries: {
    title: "Sözlükler: isimli tablolar",
    summary:
      "Değerleri sayılar yerine isimlerle sakla — envanterler, fiyatlar ve oyuncu verileri için birebir.",
    sections: [
      {
        t: [
          "Bir liste her şeyi sırasıyla tutar: items[1], items[2]. Bir sözlük ise isimle tutar: stats.Coins, stats.Level. Yine aynı tür tablodur, ama anahtarlar kelimedir.",
          "Sözlükleri Roblox'ta her yerde kullanacaksın: mağazadaki fiyatlar, oyun ayarları, her oyuncu için kaydettiğin veriler.",
        ],
      },
      { h: "Sözlük oluşturmak ve okumak" },
      {
        h: "pairs ile döngü",
        t: [
          "ipairs sadece 1, 2, 3… diye ilerler, bu yüzden isimli anahtarları atlar. pairs her anahtarı ve değeri gezer. Sıra garanti değildir, ona asla güvenme.",
        ],
        tip: "Bir sözlükte #inventory 0'dır! # operatörü sadece 1, 2, 3… liste elemanlarını sayar — isimli anahtarları bir pairs döngüsüyle say.",
      },
      {
        h: "Tablo içinde tablo",
        t: [
          "Bu, ileride DataStore'a kaydedeceğin şeklin ta kendisi: her oyuncu için içinde her şey olan tek bir tablo.",
        ],
      },
    ],
    game: {
      name: "Adopt Me! tarzı evcil hayvan oyunları",
      text: "Her evcil hayvan küçük bir sözlüktür: adı, nadirliği, yaşı ve neon olup olmadığı. Envanter bu sözlüklerden oluşan bir listedir ve oyundan çıkınca kaydedilen de bu tablonun tamamıdır.",
    },
    tryIt: [
      "Üç eşyalı bir prices sözlüğü yap ve her birini pairs ile yazdır.",
      "Dördüncü bir eşya ekle, sonra birini nil yaparak sil.",
      "#prices'ı yazdır ve neden 0 olduğunu gör.",
    ],
    mistake:
      "Anahtarlar büyük/küçük harfe duyarlıdır. Tabloda coins (küçük harf) var, bu yüzden stats.Coins nil'dir ve nil + 5 hata verir. Her yerde aynı yazımı kullan.",
    quiz: {
      q: "local t = { Sword = 1, Bow = 2 } — #t ne verir?",
      o: ["2", "0", "1", "nil"],
      why: "# sadece liste elemanlarını (1, 2, 3… anahtarlarını) sayar. Sadece isimli anahtarları olan bir tablonun uzunluğu 0'dır.",
    },
  },

  "string-tools": {
    title: "Metin hileleri: string fonksiyonları",
    summary:
      "Harfleri büyüt/küçült, kes, ara, değiştir ve böl — mesajları da metin içine değer koyarak oluştur.",
    sections: [
      {
        t: [
          "Oyuncular isimler, sohbet mesajları ve kodlar yazar. Luau'nun string kütüphanesi bu ham metni oyununun kullanabileceği bir şeye çevirir.",
          "Her fonksiyon iki şekilde çalışır: string.upper(name) ya da name:upper(). İkisi de tamamen aynı şeyi yapar.",
        ],
      },
      { h: "Her gün kullanılanlar" },
      {
        h: "Değiştir ve böl",
        tip: "string.gsub iki değer döndürür: yeni metin ve kaç değişiklik yaptığı. Tek bir değişkene koyarsan sadece metni tutarsın.",
      },
      {
        h: "Mesaj oluşturmak",
        t: [
          "Metni .. ile birleştirmek çabuk karışır. Ters tırnaklı metinler değerleri doğrudan {süslü parantez} içine koyar; string.format da sayıları senin için yuvarlar.",
        ],
      },
    ],
    game: {
      name: "Kodlar ve admin komutları",
      text: "Ödül kodu olan oyunlar string.upper(girdi) ile karşılaştırır, böylece FREEPET de freepet de çalışır. ':kick Bob' gibi admin komutları string.split ile kelimelere bölünür, başının üstündeki isim etiketi de metin içine değer koyarak oluşturulur.",
    },
    tryIt: [
      '"freepet" gibi bir kodu sakla ve büyük/küçük harf önemli olmasın diye string.upper ile kontrol et.',
      '"Sword,Bow,Potion" metnini böl ve her eşyayı ipairs ile yazdır.',
      'Ters tırnak kullanarak "[VIP] Ann" gibi bir isim etiketi yazdır.',
    ],
    mistake:
      "İsimler büyük/küçük harfe duyarlıdır: Split değil split. Roblox objeleri büyük harf kullanır (FindFirstChild), ama string kütüphanesi tamamen küçük harftir (split, upper, sub).",
    quiz: {
      q: 'string.split("a-b-c", "-") ne verir?',
      o: ['"abc"', 'Bir liste: {"a", "b", "c"}', "3", '"a b c"'],
      why: "split metni her - işaretinden keser ve parçaları bir listede verir.",
    },
  },

  instances: {
    title: "Obje oluştur, kopyala ve bul",
    summary:
      "Instance.new, Clone, Destroy, FindFirstChild ve GetChildren: dünyayı koddan kur ve temizle.",
    sections: [
      {
        t: [
          "Explorer'daki her şey bir Instance'tır. Scriptler oyun çalışırken yenilerini yapabilir, var olanları kopyalayabilir, onları arayabilir ve silebilir.",
        ],
      },
      {
        h: "Yeni bir obje yapmak",
        tip: "Parent'ı en son ayarla. Oyunun içine konana kadar obje sadece senin scriptinde vardır ve özelliklerini önce ayarlamak daha hızlıdır.",
      },
      {
        h: "Şablonlar ve kopyalar",
        t: [
          "Bitmiş bir objeyi ServerStorage'da tut (oyuncular orayı göremez) ve her ihtiyacın olduğunda Clone ile kopyala. Her kopya bağımsızdır.",
        ],
      },
      {
        h: "Bulmak ve silmek",
        l: [
          "FindFirstChild(isim) objeyi ya da nil'i döndürür, kullanmadan önce kontrol et.",
          "WaitForChild(isim) obje görünene kadar bekler (LocalScript'lerde çok işe yarar).",
          "GetChildren() doğrudan çocukları listeler; GetDescendants() onların içindeki her şeyi de katar.",
          "Destroy() objeyi ve içindeki her şeyi kalıcı olarak siler.",
        ],
      },
    ],
    game: {
      name: "Simülatörlerde coin çıkması",
      text: "Madencilik ve evcil hayvan simülatörleri ServerStorage'da tek bir coin ya da maden tutar ve birkaç saniyede bir haritaya Clone ile kopyalar. Oyuncu onu toplayınca script Destroy() çağırır, böylece harita hiç dolmaz.",
    },
    tryIt: [
      "Instance.new ile bir Part yap ve ona bir renk ve konum ver.",
      "ServerStorage'a Coin adında bir Part koy ve onu art arda 10 kez kopyala.",
      "workspace'teki her şeyin adını GetChildren ile yazdır.",
    ],
    mistake:
      "Destroy() kalıcıdır, silinmiş bir obje asla geri gelemez. Aslını şablon olarak sakla ve onun yerine Clone() kullan.",
    quiz: {
      q: "Haritada ServerStorage.Coin'den 20 kopya istiyorsun. Ne kullanırsın?",
      o: [
        'Instance.new("Coin") 20 kez',
        "Döngü içinde template:Clone()",
        'workspace:FindFirstChild("Coin")',
        "coin:Destroy()",
      ],
      why: "Clone() var olan bir objeyi bütün ayarlarıyla kopyalar. Instance.new sadece boş, hazır sınıflar yapar.",
    },
  },

  "task-library": {
    title: "task: beklemek ve sonra çalıştırmak",
    summary: "task.wait, task.delay, task.spawn ve Debris: scriptini dondurmayan zamanlayıcılar.",
    sections: [
      {
        t: [
          "Oyunlar zamanlayıcılarla doludur: 3 saniyede patlayan bir bomba, 10 saniye sonra biten bir güçlendirme, geri gelen bir coin. task kütüphanesi hepsini zamanlar.",
        ],
      },
      {
        h: "Kullanacağın dört tane",
        l: [
          "task.wait(saniye) bu scripti duraklatır, sonra devam eder.",
          "task.delay(saniye, fn) fn'i daha sonra çalıştırır ve script hemen devam eder.",
          "task.spawn(fn) fn'i şimdi, scriptin geri kalanıyla yan yana çalıştırır.",
          "task.cancel(thread) zamanladığın bir şeyi durdurur.",
        ],
      },
      {
        h: "delay mi wait mi?",
        t: [
          "task.wait(3) olsaydı script Kaç! yazmadan önce 3 saniye dururdu. task.delay patlamayı zamanlar ve devam eder.",
        ],
      },
      {
        h: "Debris ile geçici objeler",
        tip: "Eski wait(), spawn() ve delay()'i kullanma. task sürümleri daha doğrudur ve Roblox'un önerdiği onlardır.",
      },
    ],
    game: {
      name: "Bedwars tarzı eşya zamanlayıcıları",
      text: "Hız iksirleri, kalkanlar ve bekleme süreleri hep bir task.delay ile başlar: güçlendirmeyi şimdi ver, bitişini zamanla. Hiçbir şey beklemek için durmaz, böylece her oyuncunun zamanlayıcısı aynı anda çalışır.",
    },
    tryIt: [
      'task.wait ile birer saniye arayla "3", "2", "1", "Başla!" yazdır.',
      "task.delay ile 5 saniye sonrasına bir mesaj zamanla ve bu arada başka bir şey yazdır.",
      "Debris ile her biri 3 saniye sonra kaybolan 10 parça yap.",
    ],
    mistake:
      'print("BOOM") hemen çalışır ve hiçbir şey döndürmez, bu yüzden task.delay nil alır. Onun yerine bir fonksiyon ver: task.delay(3, function() print("BOOM") end).',
    quiz: {
      q: 'Önce ne yazılır?\ntask.delay(1, function() print("A") end)\nprint("B")',
      o: ["A", "B", "İkisi aynı anda", "Hiçbir şey"],
      why: "task.delay A'yı sonraya zamanlar. Script devam eder ve hemen B'yi yazar.",
    },
  },

  attributes: {
    title: "Attribute'lar: kendi özelliklerin",
    summary:
      "Locked, Price ya da Damage gibi kendi verilerini doğrudan bir parçada sakla ve değişince tepki ver.",
    sections: [
      {
        t: [
          "Parçaların Size ve Color gibi hazır özellikleri vardır. Attribute'lar kendininkileri eklemeni sağlar: bir kapının Locked'ı, bir coinin Value'su, bir düşmanın Damage'ı olabilir.",
          "Attribute'lar Properties penceresinin en altında görünür, böylece yapımcılar koda dokunmadan oyunu ayarlayabilir.",
        ],
      },
      { h: "Ayarla ve oku" },
      {
        h: "Değişikliklere tepki ver",
        tip: "Attribute'lar sayı, metin, true/false, Vector3, Color3 ve birkaç tür daha tutabilir, ama tablo ya da başka obje tutamaz.",
      },
      {
        h: "Attribute mı, değer objesi mi?",
        t: [
          "Attribute'lardan önce oyunlar IntValue ve StringValue objeleri kullanırdı. Bunlar leaderstats için hâlâ önemli, ama bir parçaya ait veriler için attribute'lar daha basit: Explorer'ı karıştıran fazladan obje yok.",
        ],
      },
    ],
    game: {
      name: "Kule savunma oyunları",
      text: "Her kulenin Range, Damage ve Level gibi attribute'ları vardır. Bir kuleyi geliştirmek sadece SetAttribute'tur ve tek bir hedefleme scripti hepsini okur — böylece bir yapımcı kod yazmadan Studio'da yeni bir kule ekleyebilir.",
    },
    tryIt: [
      "Properties penceresinden bir parçaya Damage attribute'u ver, sonra onu bir scriptten yazdır.",
      "Bir kapıya Locked attribute'u ekle ve onu false yaparak kapıyı aç.",
      "GetAttributeChangedSignal'ı bağla ve Play modunda attribute'u değiştirip tepki vermesini izle.",
    ],
    mistake:
      "Attribute isimleri büyük/küçük harfe duyarlıdır. Coinin Value'su var, value'su değil, bu yüzden GetAttribute nil döndürür. Tam ismi Properties penceresinden kopyala.",
    quiz: {
      q: "Hangi satır bir parçaya kendi 25 değerindeki Damage'ını verir?",
      o: [
        "part.Damage = 25",
        'part:SetAttribute("Damage", 25)',
        'part:GetAttribute("Damage", 25)',
        'Instance.new("Damage", part)',
      ],
      why: "SetAttribute bir attribute ekler ya da değiştirir. part.Damage hata verir, çünkü Damage gerçek bir özellik değildir.",
    },
  },

  characters: {
    title: "Karakterler ve Humanoid'ler",
    summary:
      "Bir oyuncunun karakterine ulaş, hızını ve zıplamasını değiştir, doğunca ya da ölünce tepki ver.",
    sections: [
      {
        t: [
          "Bir oyuncu doğduğunda Roblox ona workspace'te bir karakter Model'i yapar. İçindeki Humanoid canı, yürümeyi ve zıplamayı yönetir; HumanoidRootPart ise karakterin merkezidir.",
          "Oyuncu her yeniden doğduğunda yeni bir karakter yapılır, bu yüzden onu her seferinde CharacterAdded ile tekrar ayarla.",
        ],
      },
      { h: "Her doğuşta" },
      {
        h: "İşe yarayan Humanoid özellikleri",
        l: [
          "Health ve MaxHealth: varsayılan 100.",
          "WalkSpeed: varsayılan 16.",
          "JumpPower: varsayılan 50.",
          "humanoid:TakeDamage(10) Health'i düşürür (ForceField engeller).",
        ],
      },
      {
        h: "Parçadan oyuncuya geri dönmek",
        tip: "Players:GetPlayerFromCharacter(model) NPC'ler ve tek başına parçalar için nil'dir, bu yüzden bir şeye gerçek bir oyuncunun dokunduğunu anlamanın en güvenli yoludur.",
      },
    ],
    game: {
      name: "Parkur ve speedrun oyunları",
      text: "Hız bobinleri ve zıplama botları WalkSpeed ve JumpPower'ı değiştiren birkaç satırdır — artı her yeniden doğuştan sonra onları tekrar ayarlayan bir CharacterAdded bağlantısı, böylece düşünce güçlendirme kaybolmaz.",
    },
    tryIt: [
      "CharacterAdded kullanarak her oyuncunun 30 hızla koşmasını sağla.",
      "Bir oyuncunun Humanoid'i ölünce bir mesaj yazdır.",
      "GetPlayerFromCharacter kullanarak dokunanı iyileştiren bir ped yap.",
    ],
    mistake:
      "PlayerAdded çalıştığında karakter henüz doğmamıştır, bu yüzden player.Character nil'dir. Onun yerine player.CharacterAdded:Connect(function(character) … end) kullan.",
    quiz: {
      q: "Bir oyuncuyu PlayerAdded'da hızlandırıyorsun ama öldükten sonra hızı yine 16 oluyor. Neden?",
      o: [
        "WalkSpeed 16'nın üstüne çıkamaz",
        "Her yeniden doğuş yepyeni bir karakter ve Humanoid yapar",
        "Died oyundaki her özelliği sıfırlar",
        "Hız sadece LocalScript'te çalışır",
      ],
      why: "Yeniden doğmak yeni bir karakter kurar, bu yüzden onu CharacterAdded içinde ayarla.",
    },
  },

  "user-input": {
    title: "Klavye ve fare girişi",
    summary:
      "Oyuncu bir tuşa basınca ya da tıklayınca, bir LocalScript'ten UserInputService ile kod çalıştır.",
    sections: [
      {
        t: [
          "Giriş oyuncunun kendi cihazında olur, bu yüzden onu bir LocalScript'te okursun (örneğin StarterPlayerScripts'te). Sunucu tuş basışlarını asla görmez: bir tuş oyunu değiştirecekse istemci sunucuya bir RemoteEvent ile haber verir.",
        ],
      },
      {
        h: "Bir tuşa tepki vermek",
        tip: "gameProcessed'i her zaman kontrol et. O olmazsa, içinde E harfi olan bir sohbet mesajı yazmak da yeteneğini tetikler.",
      },
      {
        h: "Tuşu basılı tutmak",
        t: [
          "InputBegan tuş inince, InputEnded tuş geri kalkınca çalışır. Fare tıklamaları da aynı şekilde gelir, input.UserInputType == Enum.UserInputType.MouseButton1 ile.",
        ],
      },
      {
        h: "Telefonlar ve kumandalar",
        t: [
          "Herkesin klavyesi yok. ContextActionService:BindAction tek bir çağrıda bir eylemi bir tuşa, bir kumanda tuşuna ve telefonlar için ekrandaki bir butona bağlar.",
        ],
      },
    ],
    game: {
      name: "Dövüş oyunları",
      text: "Atılmak için Q ve bloklamak için F, bir LocalScript'teki InputBegan bağlantılarıdır. Animasyonu istemcide hemen oynatır ve bir RemoteEvent tetikler, böylece sunucu bekleme süresini kontrol edip etkiyi herkese uygulayabilir.",
    },
    tryIt: [
      'Oyuncu Space\'e basınca "Zıpla!" yazdır.',
      "InputBegan ve InputEnded ile LeftShift'i koşma tuşu yap.",
      "Sohbete E harfini yaz ve E yeteneğinin tetiklenmediğini kontrol et.",
    ],
    mistake:
      "Bu bir sunucu Script'i. LocalPlayer sadece LocalScript'lerde vardır — sunucuda nil'dir. Giriş kodu StarterPlayerScripts'teki bir LocalScript'e aittir.",
    quiz: {
      q: "InputBegan'de neden gameProcessed kontrol edilir?",
      o: [
        "Tuş daha hızlı tepki versin diye",
        "Sohbete ya da bir TextBox'a yazılan tuşlar kodunu tetiklemesin diye",
        "Sunucu ona ihtiyaç duyduğu için",
        "Oyun kumandalarını desteklemek için",
      ],
      why: "Roblox tuşu zaten kullandıysa gameProcessed true'dur, örneğin sohbete yazarken.",
    },
  },

  "remote-functions": {
    title: "RemoteFunction'lar: sor ve cevap al",
    summary:
      "İstemcinin sunucudan bir cevaba ihtiyacı varsa — bir fiyat, bir kontrol, biraz veri — RemoteFunction kullan.",
    sections: [
      {
        t: [
          "RemoteEvent tek yönlü bir mesajdır. RemoteFunction ise bir sorudur: istemci InvokeServer'ı çağırır ve sunucu bir cevap döndürene kadar bekler.",
        ],
      },
      { h: "Sunucu cevaplıyor" },
      {
        h: "İstemci soruyor",
        tip: "OnServerInvoke :Connect ile değil, = ile ayarlanır. Bir sorunun tek cevabı vardır, bu yüzden bir RemoteFunction'ın tam olarak bir fonksiyonu olur.",
      },
      {
        h: "Hangisi ne zaman",
        l: [
          "RemoteEvent: diğer tarafa bir şey olduğunu söyle (bir butona basıldı, bir tur başladı). Kimse beklemez.",
          "RemoteFunction: istemcinin geri veri alması gerekir (bir fiyat, bir envanter, bunu alabilir miyim?).",
          "Sunucudan asla InvokeClient kullanma: hilelenmiş ya da bağlantısı kopmuş bir istemci sunucuyu sonsuza kadar bekletebilir.",
        ],
      },
    ],
    game: {
      name: "Takas oyunları",
      text: "Bir takas açtığında istemci diğer oyuncunun envanterini sunucudan bir RemoteFunction ile ister. Sunucu sadece göstermesi güvenli olanı döndürür — ve takas onaylanınca her şeyi tekrar kontrol eder.",
    },
    tryIt: [
      "ReplicatedStorage'da GetPrice adında bir RemoteFunction yap ve sunucuda cevapla.",
      "Onu bir LocalScript'ten çağır ve cevabı yazdır.",
      "Olmayan bir eşyayı sor ve hata değil nil aldığını kontrol et.",
    ],
    mistake:
      "OnServerInvoke bir olay değildir, bu yüzden :Connect'i yoktur. Ona bir fonksiyon ata: getPrice.OnServerInvoke = function(player, item) … end.",
    quiz: {
      q: "Hangi çağrı sunucunun cevabını bekler?",
      o: [
        "remote:FireServer()",
        "remoteFunction:InvokeServer()",
        "remote.OnClientEvent:Connect()",
        "remote:FireAllClients()",
      ],
      why: "InvokeServer soruyu gönderir ve OnServerInvoke'un döndürdüğünü bekler.",
    },
  },

  bindables: {
    title: "BindableEvent'ler: scriptlerin kendi arasında konuşması",
    summary:
      "Bir sunucu scriptinin diğerine bir şey olduğunu söylemesini sağla; RemoteEvent ya da global değişken olmadan.",
    sections: [
      {
        t: [
          "RemoteEvent'ler istemci ile sunucu arasında geçer. Aynı taraftaki iki scriptin konuşması gerekiyorsa — tur scripti ödül scriptine turun bittiğini söylüyorsa — BindableEvent kullan.",
        ],
      },
      { h: "Tetikle ve dinle" },
      {
        h: "Diğer scriptte",
        tip: "BindableEvent'in kendisini tetikle, Event'ini dinle. Bindable'ları ServerStorage'da tut ki istemciler göremesin.",
      },
      {
        h: "Cevap istemek",
        t: [
          "BindableFunction, BindableEvent için neyse RemoteFunction da RemoteEvent için odur: aynı fikir, ama bir cevap döndürür.",
        ],
      },
    ],
    game: {
      name: "Mini oyun koleksiyonları",
      text: "Lobi, harita yükleyici ve ödül sistemi ayrı scriptlerdir ve RoundStarted, RoundEnded gibi BindableEvent'lerle konuşur. Ödüllere dokunmadan harita yükleyiciyi değiştirebilirsin.",
    },
    tryIt: [
      "ServerStorage'da RoundEnded adında bir BindableEvent yap.",
      "Onu bir Script'ten takım adıyla tetikle ve başka bir Script'te yazdır.",
      "Bir oyuncunun skorunu döndüren bir BindableFunction yap.",
    ],
    mistake:
      "BindableEvent'in kendisini tetiklersin — roundEnded:Fire(…) — ve Event'ini roundEnded.Event:Connect(…) ile dinlersin. Event doğrudan tetiklenemez.",
    quiz: {
      q: "İki sunucu Script'inin konuşması gerekiyor. Ne kullanırsın?",
      o: ["Bir RemoteEvent", "Bir BindableEvent", "Bir LocalScript", "Bir ScreenGui"],
      why: "Bindable'lar aynı taraftaki scriptler içindir; Remote'lar istemci ile sunucu arasında geçer.",
    },
  },

  "project-shop": {
    title: "Proje: coin dükkânı",
    summary:
      "Hepsini birleştir: leaderstats, bir Satın Al butonu, bir RemoteEvent ve her satın almayı kontrol eden bir sunucu.",
    sections: [
      {
        t: [
          "Gerçek bir dükkân yapma zamanı. Oyuncu Satın Al'a tıklar, istemci sunucuya sorar ve sunucu — güvendiğin tek yer — coinleri alıp eşyayı verir.",
        ],
        l: [
          "ServerStorage.Items her eşya için bir Tool tutar (Sword, SpeedCoil…).",
          "ReplicatedStorage'da BuyItem adında bir RemoteEvent var.",
          "StarterGui'de içinde BuyButton adında bir TextButton olan bir ScreenGui var.",
        ],
      },
      { h: "1. Herkese coin" },
      { h: "2. Buton soruyor" },
      {
        h: "3. Sunucu karar veriyor",
        tip: "İstemci sadece HANGİ eşya olduğunu söyler. Fiyat, coinler ve sahiplik hepsi sunucuda kontrol edilir, böylece hileci bedavaya hiçbir şey alamaz.",
      },
    ],
    game: {
      name: "Her simülatörün dükkânı",
      text: "Evcil hayvan, kılıç ve madencilik simülatörlerinin hepsi bu akışı kullanır: bir buton eşya adıyla bir RemoteEvent tetikler ve sunucu bir şey vermeden önce fiyatı ve oyuncunun parasını kontrol eder.",
    },
    tryIt: [
      "Üç scripti kur ve Play modunda bir Sword satın al.",
      "SpeedCoil için ikinci bir buton ekle.",
      "Aynı eşyayı iki kez almayı dene ve ikincisinde bir şey olmadığını kontrol et.",
    ],
    mistake:
      "PRICES bir Bow satıyor ama ServerStorage.Items'ta Bow adında bir Tool yok (ya da farklı yazılmış). PRICES'taki her anahtar için tam olarak aynı isimde bir Tool olmalı.",
    quiz: {
      q: "Fiyat kontrolü nerede yapılmalı?",
      o: [
        "Butonun LocalScript'inde",
        "Sunucuda, OnServerEvent içinde",
        "ScreenGui'de",
        "Fark etmez",
      ],
      why: "İstemcideki her şey bir hileci tarafından değiştirilebilir. Coinler konusunda sadece sunucuya güvenilir.",
    },
  },

  "project-tycoon": {
    title: "Proje: damlatıcılı tycoon",
    summary:
      "Damlatıcılar maden üretir, toplayıcı onu paraya çevirir ve para geliştirme satın alır — her tycoon'un ana döngüsü.",
    sections: [
      {
        t: [
          "Bir tycoon bir döngüdür: damlatıcılar belirli aralıklarla maden çıkarır, maden toplayıcıya düşer, toplayıcı para ekler ve para daha çok damlatıcı alır. Her parçasını zaten biliyorsun.",
        ],
      },
      { h: "1. Damlatıcı" },
      {
        h: "2. Toplayıcı",
        tip: "Toplayıcı Value attribute'unu arar, bu yüzden ona değen ayaklar ve diğer parçalar yok sayılır — sadece maden para kazandırır.",
      },
      {
        h: "3. Geliştirme satın almak",
        t: [
          "Bir satın alma butonu, ProximityPrompt'u olan bir parçadır. Tetiklenince ve yeterli para varsa fiyatı düş ve sonraki damlatıcıyı ServerStorage'dan haritaya Clone ile kopyala.",
        ],
      },
    ],
    game: {
      name: "Restoran, fabrika ve tycoon oyunları",
      text: "Her tycoon daha güzel modellerle bu döngüdür: bir şey değer üretir, bir şey onu toplar ve butonlar onu daha hızlı değer üreten üreticilere harcar. Fiyatları dengele, oyuncular geri gelmeye devam etsin.",
    },
    tryIt: [
      "Bir damlatıcı ve bir toplayıcı yap ve Play modunda Cash'in arttığını izle.",
      "Her 3 saniyede 20 değerinde maden düşüren ikinci bir damlatıcı yap.",
      "İkinci damlatıcıyı kopyalayan, ProximityPrompt'lu bir satın alma butonu ekle.",
    ],
    mistake:
      "Damlatıcı döngüsünde task.wait yok, bu yüzden hiç durmadan sonsuza kadar parça yapar ve sunucu donar. Her while true döngüsünde bir bekleme olmalı.",
    quiz: {
      q: 'Toplayıcı neden hit:GetAttribute("Value") kontrol ediyor?',
      o: [
        "Daha hızlı olsun diye",
        "Sadece maden para kazandırsın — ayaklar ve diğer parçalar yok sayılsın diye",
        "Touched çalışmak için attribute'a ihtiyaç duyar",
        "Parayı kaydetmek için",
      ],
      why: "Toplayıcıya her şey değebilir. Sadece Value attribute'u olan parçalar madendir.",
    },
  },

  pcall: {
    title: "pcall: hata vermesine izin verilen kod",
    summary:
      "DataStore'lardan, web isteklerinden ve riskli koddan gelen hataları yakala, böylece tek bir hata bütün scripti bozmasın.",
    sections: [
      {
        t: [
          "Kodun mükemmel olsa bile bazı çağrılar başarısız olabilir: bir DataStore meşguldür, bir web isteği zaman aşımına uğrar, bir oyuncu yarıda çıkar. Bir hata scripti durdurur — riskli kısım pcall içine alınmadıkça.",
        ],
      },
      { h: "pcall nasıl çalışır" },
      {
        h: "Güvenle kaydetmek",
        tip: "Sadece gerçekten başarısız olabilecek çağrıyı sar. Bütün scriptin etrafındaki bir pcall senin kendi hatalarını da saklar.",
      },
      {
        h: "Kendi hataların",
        l: [
          "error(mesaj) fonksiyonu kendi mesajınla durdurur.",
          "assert(koşul, mesaj) koşul false ise hata verir.",
          "pcall(fn, ...) argümanları doğrudan fn'e verebilir.",
        ],
      },
    ],
    game: {
      name: "İlerlemeyi kaydeden her oyun",
      text: "Popüler oyunlar her DataStore çağrısını pcall içine alır ve birkaç kez tekrar dener. Kayıt yine başarısız olursa çökmek yerine kayıtlara uyarı yazar ve daha sonra tekrar dener.",
    },
    tryIt: [
      'error("oops") çağrısını pcall içine al ve döndürdüğü iki değeri yazdır.',
      "Kötü girdide hata veren bir fonksiyon yaz ve onu pcall ile çağır.",
      "Bir sayının pozitif olduğunu kontrol etmek için assert kullan.",
    ],
    mistake:
      "pcall iki şey döndürür: önce çalışıp çalışmadığı (true ya da false), sonra sonuç. local data = pcall(...) sadece true/false'u tutar. local ok, data = pcall(...) yaz.",
    quiz: {
      q: "Fonksiyon hata verince pcall ne döndürür?",
      o: ["Hiçbir şey, script durur", "false ve hata mesajı", "true ve nil", "Sadece hata mesajı"],
      why: "pcall hatayı yakalar: ilk değer false, ikincisi mesajdır.",
    },
  },

  cframes: {
    title: "CFrame: konum ve dönüş",
    summary:
      "Parçaları CFrame ile taşı, döndür ve nişan aldır: bir parçanın yeri artı baktığı yön.",
    sections: [
      {
        t: [
          "Position sadece bir parçanın nerede olduğunu söyler. CFrame nerede olduğunu VE hangi yöne baktığını söyler. Işınlanmalar, dönen kapılar, nişan alan kuleler: hepsi CFrame.",
        ],
      },
      {
        h: "CFrame yapmak",
        tip: "CFrame.Angles radyan kullanır. math.rad(90), 90 dereceyi radyana çevirir.",
      },
      { h: "Bir şeye bakmak" },
      {
        h: "Parçaya göre hareket",
        t: [
          "Bir CFrame ile çarpmak parçanın kendi yönlerinde hareket ettirir (ileri -Z'dir). Bir Vector3 eklemek ise parça nereye bakarsa baksın dünya yönlerinde hareket ettirir.",
        ],
      },
    ],
    game: {
      name: "Kule savunma ve nişancı oyunları",
      text: "Kuleler her karede CFrame.lookAt ile nişan alır, mermiler silahın LookVector'ü boyunca uçar ve kontrol noktaları HumanoidRootPart'ının CFrame'ini pedin biraz üstüne ayarlayarak seni ışınlar.",
    },
    tryIt: [
      "Bir parçayı CFrame.Angles ile 45 derece döndür.",
      "CFrame.lookAt ile bir parçanın başka bir parçaya bakmasını sağla.",
      "Bir parçayı kendi yönünde 10 stud ileri taşı.",
    ],
    mistake:
      "Position bir Vector3 ister. CFrame ayarlamak için part.CFrame'e ata — ya da Position için Vector3.new(0, 10, 0) kullan.",
    quiz: {
      q: "Hangi satır kulenin hedefe bakmasını sağlar?",
      o: [
        "turret.Position = target.Position",
        "turret.CFrame = CFrame.lookAt(turret.Position, target.Position)",
        "turret.CFrame = target.CFrame",
        "turret.Size = target.Position",
      ],
      why: "CFrame.lookAt(nereden, nereye) kuleyi yerinde tutar ve hedefe çevirir.",
    },
  },
};
