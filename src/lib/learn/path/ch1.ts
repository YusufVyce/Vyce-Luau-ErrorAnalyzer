import { choice, fill, learn, lua, predict, t, type PathLesson } from "./types";

export const CH1: Record<string, PathLesson> = {
  "studio-tour": {
    emoji: "🧭",
    takeaway: t(
      "Explorer = what exists. Properties = how it looks. Output = what went wrong.",
      "Explorer = ne var. Properties = nasıl görünüyor. Output = ne ters gitti.",
    ),
    steps: [
      learn(
        t("Studio is your workshop", "Studio senin atölyen"),
        t(
          "Roblox Studio is the free app where Roblox games are built. Everything in a game is an object, and scripts tell objects what to do.",
          "Roblox Studio, Roblox oyunlarının yapıldığı ücretsiz uygulama. Oyundaki her şey bir nesnedir; scriptler de nesnelere ne yapacaklarını söyler.",
        ),
        {
          visual: "studio",
          hook: t(
            "Think LEGO: parts are the bricks, scripts are the instruction booklet.",
            "LEGO gibi düşün: parçalar tuğlalar, scriptler talimat kitapçığı.",
          ),
        },
      ),
      learn(
        t("4 windows to remember", "Aklında kalacak 4 pencere"),
        t(
          "Viewport = the 3D world. Explorer = a list of everything. Properties = settings of the selected thing. Output = messages and errors.",
          "Viewport = 3D dünya. Explorer = her şeyin listesi. Properties = seçili nesnenin ayarları. Output = mesajlar ve hatalar.",
        ),
      ),
      choice(
        t(
          "Which window lists every object in your game?",
          "Oyundaki bütün nesneleri hangi pencere listeler?",
        ),
        ["Viewport", "Explorer", "Properties", "Output"],
        1,
        t(
          "Explorer is the tree of everything: parts, scripts and services.",
          "Explorer her şeyin ağacıdır: parçalar, scriptler ve servisler.",
        ),
      ),
      choice(
        t(
          "You want to make a part red. Where do you change its Color?",
          "Bir parçayı kırmızı yapmak istiyorsun. Color'ı nereden değiştirirsin?",
        ),
        ["Output", "Toolbox", "Properties", "Explorer"],
        2,
        t(
          "Select the part, then change Color in Properties.",
          "Parçayı seç, sonra Properties'te Color'ı değiştir.",
        ),
      ),
      learn(
        t("Play and Stop", "Play ve Stop"),
        t(
          "F5 plays your game, Shift+F5 stops it. Anything you change while playing is thrown away when you stop!",
          "F5 oyunu başlatır, Shift+F5 durdurur. Oynarken yaptığın her değişiklik durdurunca silinir!",
        ),
        {
          hook: t(
            "Playing is a rehearsal 🎭: nothing you move on stage is saved.",
            "Oynamak bir provadır 🎭: sahnede oynattığın hiçbir şey kaydedilmez.",
          ),
        },
      ),
      choice(
        t(
          "You moved a part WHILE playing, then pressed Stop. What happens?",
          "Oyun AÇIKKEN bir parçayı taşıdın, sonra Stop'a bastın. Ne olur?",
        ),
        [
          t("The move is saved", "Taşıma kaydedilir"),
          t("The part goes back to where it was", "Parça eski yerine döner"),
          t("The part is deleted", "Parça silinir"),
          t("Studio crashes", "Studio çöker"),
        ],
        1,
        t(
          "Stop throws away changes made during play. Edit after pressing Stop.",
          "Stop, oynarken yapılan değişiklikleri siler. Düzenlemeyi Stop'tan sonra yap.",
        ),
      ),
    ],
  },

  "first-script": {
    emoji: "👋",
    takeaway: t(
      'print("...") writes to Output. Lowercase p. -- starts a comment.',
      'print("...") Output\'a yazar. Küçük p ile. -- yorum başlatır.',
    ),
    steps: [
      learn(
        t("print() talks to you", "print() seninle konuşur"),
        t(
          'Scripts go in ServerScriptService. `print("Hi")` writes Hi in the Output window: your script\'s way of talking to you.',
          'Scriptler ServerScriptService\'e konur. `print("Selam")` Output penceresine Selam yazar: scriptinin seninle konuşma yolu.',
        ),
        {
          code: 'print("Hello world!")',
          hook: t("print is your script's walkie-talkie 📻", "print, scriptinin telsizi 📻"),
        },
      ),
      predict(
        lua`
print("Hello world!")
print(2 + 3)
`,
        ["Hello world!\n5", "Hello world!\n2 + 3", '"Hello world!"\n5', "5\nHello world!"],
        0,
        t(
          "Text is printed without its quotes, and 2 + 3 is calculated first.",
          "Metin tırnaksız yazılır ve 2 + 3 önce hesaplanır.",
        ),
      ),
      fill(
        t("Make it print Hi", "Hi yazdır"),
        '___("Hi")',
        ["print", "Print", "say", "PRINT"],
        0,
        t(
          "Luau is case-sensitive: only lowercase print exists. Print is nil.",
          "Luau büyük-küçük harfe duyarlıdır: sadece küçük harfli print var. Print nil'dir.",
        ),
      ),
      learn(
        t("Comments are notes", "Yorumlar nottur"),
        t(
          "Everything after `--` is ignored. Leave notes for yourself (and future you).",
          "`--` işaretinden sonraki her şey görmezden gelinir. Kendine not bırak.",
        ),
        {
          code: lua`
-- this is a note, it doesn't run
print("This runs") -- a note at the end
`,
        },
      ),
      predict(
        lua`
-- print("A")
print("B") -- print("C")
`,
        ["B", "A\nB", "A\nB\nC", "B\nC"],
        0,
        t(
          'Only print("B") is real code. The rest sits inside comments.',
          'Sadece print("B") gerçek kod. Gerisi yorumun içinde.',
        ),
      ),
      choice(
        t("Where do you add your first server Script?", "İlk server Script'ini nereye eklersin?"),
        ["ServerScriptService", "Lighting", "SoundService", "Teams"],
        0,
        t(
          "ServerScriptService is the home of server scripts. Hover it and click ⊕.",
          "ServerScriptService, server scriptlerinin evidir. Üstüne gel ve ⊕'ye tıkla.",
        ),
      ),
    ],
  },

  "script-types": {
    emoji: "🖥️",
    takeaway: t(
      "Script = server (the boss). LocalScript = one player's device. ModuleScript = shared code.",
      "Script = server (patron). LocalScript = bir oyuncunun cihazı. ModuleScript = ortak kod.",
    ),
    steps: [
      learn(
        t("One server, many devices", "Tek server, çok cihaz"),
        t(
          "A game runs on Roblox's server AND on every player's device (the client). The server is the boss.",
          "Oyun hem Roblox'un server'ında hem de her oyuncunun cihazında (client) çalışır. Patron server'dır.",
        ),
        {
          visual: "clientServer",
          hook: t(
            "The server is the referee 🧑‍⚖️, clients are the players. Players can't change the score themselves.",
            "Server hakemdir 🧑‍⚖️, client'lar oyuncular. Oyuncu skoru kendisi değiştiremez.",
          ),
        },
      ),
      learn(
        t("3 kinds of scripts", "3 çeşit script"),
        t(
          "Script → runs on the server. LocalScript → runs on one player's device. ModuleScript → shared code that others load with `require()`.",
          "Script → server'da çalışır. LocalScript → bir oyuncunun cihazında çalışır. ModuleScript → başkalarının `require()` ile yüklediği ortak kod.",
        ),
      ),
      choice(
        t("Which script runs on the player's device?", "Hangi script oyuncunun cihazında çalışır?"),
        ["Script", "LocalScript", "ModuleScript", t("All of them", "Hepsi")],
        1,
        t(
          "LocalScripts run on the client: UI, camera, keyboard and mouse.",
          "LocalScript'ler client'ta çalışır: arayüz, kamera, klavye ve fare.",
        ),
      ),
      choice(
        t(
          "A button's hover animation belongs in a…",
          "Bir butonun üzerine gelince oynayan animasyonu nereye yazılır?",
        ),
        [
          "LocalScript",
          t("Script on the server", "Server'daki Script"),
          t("DataStore", "DataStore"),
          "ModuleScript",
        ],
        0,
        t(
          "UI is drawn on the player's own screen, so a LocalScript handles it.",
          "Arayüz oyuncunun kendi ekranında çizilir, bu yüzden LocalScript ilgilenir.",
        ),
      ),
      learn(
        t("LocalPlayer = me", "LocalPlayer = ben"),
        t(
          '`Players.LocalPlayer` means "the player on this device". It only exists in LocalScripts. On the server it\'s nil.',
          "`Players.LocalPlayer` \"bu cihazdaki oyuncu\" demektir. Sadece LocalScript'lerde vardır. Server'da nil'dir.",
        ),
        { code: "local player = game.Players.LocalPlayer" },
      ),
      choice(
        t(
          "In a server Script, what is game.Players.LocalPlayer?",
          "Server Script'inde game.Players.LocalPlayer nedir?",
        ),
        [
          t("The first player", "İlk oyuncu"),
          "nil",
          t("Every player", "Bütün oyuncular"),
          t("The owner", "Oyunun sahibi"),
        ],
        1,
        t(
          'The server has many players, so there is no single "me". Use PlayerAdded instead.',
          'Server\'da çok oyuncu var, tek bir "ben" yok. Onun yerine PlayerAdded kullan.',
        ),
      ),
      choice(
        t("Which one never runs on its own?", "Hangisi tek başına asla çalışmaz?"),
        ["Script", "LocalScript", "ModuleScript"],
        2,
        t(
          "A ModuleScript only runs when another script calls require() on it.",
          "ModuleScript ancak başka bir script onu require() ile çağırınca çalışır.",
        ),
      ),
    ],
  },
};
