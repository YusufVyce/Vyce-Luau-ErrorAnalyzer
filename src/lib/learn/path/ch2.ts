import { choice, fill, learn, lua, order, predict, t, type PathLesson } from "./types";

export const CH2: Record<string, PathLesson> = {
  variables: {
    emoji: "📦",
    takeaway: t(
      "local name = value. Quotes make a string. nil = an empty box.",
      "local isim = değer. Tırnak = string. nil = boş kutu.",
    ),
    steps: [
      learn(
        t("A variable is a labeled box", "Değişken etiketli bir kutudur"),
        t(
          "`local coins = 100` makes a box named coins with 100 inside. Read it by its name; put something new in with `=`.",
          "`local coins = 100`, içinde 100 olan coins adında bir kutu yapar. Adıyla okursun; `=` ile içine yenisini koyarsın.",
        ),
        {
          visual: "variables",
          hook: t(
            "📦 The name is the label, the value is what's inside.",
            "📦 İsim etiket, değer kutunun içindeki.",
          ),
        },
      ),
      predict(
        lua`
local coins = 100
coins = coins + 50
print(coins)
`,
        ["150", "100", "coins + 50", "50"],
        0,
        t(
          "coins was 100, then 100 + 50 went back into the box.",
          "coins 100'dü, sonra 100 + 50 kutuya geri kondu.",
        ),
      ),
      learn(
        t("The 4 basic types", "4 temel tip"),
        t(
          'number: 5, 2.5 · string: "Hi" (in quotes) · boolean: true or false · nil: nothing at all.',
          'number: 5, 2.5 · string: "Selam" (tırnak içinde) · boolean: true ya da false · nil: hiçbir şey.',
        ),
      ),
      choice(
        t("What type is true?", "true'nun tipi nedir?"),
        ["number", "string", "boolean", "nil"],
        2,
        t(
          "true and false are booleans: a yes/no value.",
          "true ve false boolean'dır: evet/hayır değeri.",
        ),
      ),
      choice(
        t("Which box holds nothing at all?", "Hangi kutunun içi tamamen boş?"),
        ["local a = 0", 'local b = ""', "local c = nil", "local d = false"],
        2,
        t(
          '0, "" and false are real values. Only nil means "no value".',
          '0, "" ve false gerçek değerlerdir. Sadece nil "değer yok" demektir.',
        ),
      ),
      fill(
        t("Create a variable named speed", "speed adında bir değişken oluştur"),
        "___ speed = 16",
        ["local", "var", "let", "int"],
        0,
        t("New variables start with local in Luau.", "Luau'da yeni değişkenler local ile başlar."),
      ),
      predict(
        lua`
local name = "Noob"
local level = 1
print(name, level)
`,
        ["Noob 1", "name level", "Noob1", '"Noob" 1'],
        0,
        t(
          "print puts a space between the values you give it.",
          "print, verdiğin değerlerin arasına boşluk koyar.",
        ),
      ),
    ],
  },

  "math-strings": {
    emoji: "🧮",
    takeaway: t(
      '+ adds numbers, .. glues text. tonumber("42") turns text into 42.',
      '+ sayıları toplar, .. metni yapıştırır. tonumber("42") metni 42 yapar.',
    ),
    steps: [
      learn(
        t("Math like a calculator", "Hesap makinesi gibi"),
        t(
          "`+ - * /` work as usual. `%` is the remainder, `^` is power. `x += 5` is short for `x = x + 5`.",
          "`+ - * /` bildiğin gibi. `%` kalanı verir, `^` üs alır. `x += 5`, `x = x + 5`'in kısası.",
        ),
      ),
      predict(
        lua`
local reward = 250 * 2
reward += 100
print(reward)
`,
        ["600", "500", "350", "250"],
        0,
        t("250 × 2 = 500, then += 100 makes it 600.", "250 × 2 = 500, sonra += 100 ile 600 olur."),
      ),
      predict(
        "print(17 % 5)",
        ["2", "3", "3.4", "12"],
        0,
        t("17 = 5 × 3 + 2, so the remainder is 2.", "17 = 5 × 3 + 2, yani kalan 2."),
      ),
      learn(
        t("Glue text with ..", "Metni .. ile yapıştır"),
        t(
          '`..` joins text: "Hi " .. name. Numbers get glued as text too.',
          '`..` metinleri birleştirir: "Selam " .. name. Sayılar da metin olarak yapıştırılır.',
        ),
        {
          code: lua`
local name = "Builderman"
print("Hi " .. name)
`,
          hook: t(
            ".. is glue 🧴: it sticks text together, it never adds.",
            ".. yapıştırıcıdır 🧴: metinleri birleştirir, asla toplamaz.",
          ),
        },
      ),
      predict(
        lua`
local name = "Vy"
print("Hi " .. name .. "!")
`,
        ["Hi Vy!", "Hi name!", "Hi .. Vy ..!", "HiVy!"],
        0,
        t(
          "The variable's value is glued in, spaces and all.",
          "Değişkenin değeri boşluklarıyla birlikte yapıştırılır.",
        ),
      ),
      fill(
        t('Turn the text "42" into a number', '"42" metnini sayıya çevir'),
        lua`
local amount = ___("42")
print(amount + 1)
`,
        ["tonumber", "tostring", "number", "int"],
        0,
        t(
          "tonumber turns text into a number (or nil if it isn't one). tostring goes the other way.",
          "tonumber metni sayıya çevirir (sayı değilse nil verir). tostring tersini yapar.",
        ),
      ),
      choice(
        t("Text typed into a TextBox is always a…", "TextBox'a yazılan metin her zaman bir…"),
        ["number", "string", "boolean", "nil"],
        1,
        t(
          "Always a string. Convert it with tonumber() before doing math.",
          "Her zaman string. Hesaplamadan önce tonumber() ile çevir.",
        ),
      ),
    ],
  },

  "if-statements": {
    emoji: "🔀",
    takeaway: t(
      "if … then … end. Compare with ==, never with =.",
      "if … then … end. == ile karşılaştır, asla = ile değil.",
    ),
    steps: [
      learn(
        t("if is a yes/no question", "if bir evet/hayır sorusudur"),
        t(
          "`if` asks a question. When the answer is true, the code inside runs. Every if closes with `end`.",
          "`if` bir soru sorar. Cevap true ise içindeki kod çalışır. Her if `end` ile kapanır.",
        ),
        {
          visual: "ifFlow",
          code: lua`
if coins >= 100 then
	print("You can buy it!")
end
`,
          hook: t(
            "A door 🚪 that only opens when the answer is true.",
            "Sadece cevap true olunca açılan bir kapı 🚪",
          ),
        },
      ),
      predict(
        lua`
local coins = 50
if coins >= 100 then
	print("Buy")
else
	print("Save up")
end
`,
        ["Save up", "Buy", "Buy\nSave up", t("Nothing", "Hiçbir şey")],
        0,
        t(
          "50 is not >= 100, so the else part runs.",
          "50, 100'den büyük-eşit değil; else kısmı çalışır.",
        ),
      ),
      learn(
        t("= gives, == asks", "= verir, == sorar"),
        t(
          '`=` puts a value in a box. `==` asks "are these equal?". Not equal is `~=`.',
          '`=` kutuya değer koyar. `==` "bunlar eşit mi?" diye sorar. Eşit değil `~=` ile yazılır.',
        ),
        { hook: t("One = gives ✋, two == ask ❓", "Tek = verir ✋, çift == sorar ❓") },
      ),
      fill(
        t("Check if the stage is 10", "Stage 10 mu diye kontrol et"),
        lua`
local stage = 10
if stage ___ 10 then
	print("Win!")
end
`,
        ["==", "=", "===", "~="],
        0,
        t(
          "Inside an if you compare with ==. A single = is an error there.",
          "if içinde == ile karşılaştırırsın. Tek = orada hatadır.",
        ),
      ),
      learn(
        t("elseif, else, and, or, not", "elseif, else, and, or, not"),
        t(
          "elseif asks another question. else runs when nothing matched. and = both true, or = at least one, not flips true/false.",
          "elseif başka bir soru sorar. else hiçbiri tutmazsa çalışır. and = ikisi de true, or = en az biri, not true/false'u ters çevirir.",
        ),
      ),
      predict(
        lua`
local stage = 7
if stage == 10 then
	print("Top!")
elseif stage >= 5 then
	print("Halfway")
else
	print("Start")
end
`,
        ["Halfway", "Top!", "Start", "Halfway\nStart"],
        0,
        t(
          "7 isn't 10, but 7 >= 5 is true. Only the first matching branch runs.",
          "7, 10 değil ama 7 >= 5 true. Sadece ilk tutan dal çalışır.",
        ),
      ),
      order(
        t("Put the lines in order", "Satırları sıraya koy"),
        ["local hasKey = true", "if hasKey then", '\tprint("The door opens")', "end"],
        t(
          "Variable first, then if … then, the body, and end.",
          "Önce değişken, sonra if … then, içerik ve end.",
        ),
      ),
      choice(
        t("What does not true give?", "not true ne verir?"),
        ["true", "false", "nil", t("an error", "hata")],
        1,
        t(
          "not flips a boolean: not true is false.",
          "not boolean'ı ters çevirir: not true, false olur.",
        ),
      ),
    ],
  },

  loops: {
    emoji: "🔁",
    takeaway: t(
      "for counts, while repeats. A forever-loop needs task.wait()!",
      "for sayar, while tekrarlar. Sonsuz döngüye task.wait() şart!",
    ),
    steps: [
      learn(
        t("for counts for you", "for senin yerine sayar"),
        t(
          "`for i = 1, 3 do` runs the code with i = 1, then 2, then 3. Both ends are included.",
          "`for i = 1, 3 do` kodu önce i = 1, sonra 2, sonra 3 ile çalıştırır. İki uç da dahil.",
        ),
        {
          visual: "loop",
          code: lua`
for i = 1, 3 do
	print(i)
end
`,
          hook: t(
            "A coach counting reps: 1, 2, 3, done! 🏋️",
            "Tekrar sayan antrenör gibi: 1, 2, 3, bitti! 🏋️",
          ),
        },
      ),
      predict(
        lua`
for i = 1, 3 do
	print("Jump " .. i)
end
`,
        ["Jump 1\nJump 2\nJump 3", "Jump 3", "Jump 1\nJump 2", "Jump i\nJump i\nJump i"],
        0,
        t(
          "The body runs once for each i: 1, 2 and 3.",
          "Gövde her i için bir kez çalışır: 1, 2 ve 3.",
        ),
      ),
      predict(
        lua`
for i = 3, 1, -1 do
	print(i)
end
print("Go!")
`,
        ["3\n2\n1\nGo!", "1\n2\n3\nGo!", "Go!\n3\n2\n1", "3\nGo!"],
        0,
        t("The third number is the step: -1 counts down.", "Üçüncü sayı adımdır: -1 geriye sayar."),
      ),
      learn(
        t("Go through a list", "Listeyi gez"),
        t(
          '`for _, player in players do` visits every item. The `_` means "I don\'t need the position".',
          '`for _, player in players do` her öğeyi gezer. `_` "sırasına ihtiyacım yok" demek.',
        ),
      ),
      learn(
        t("while true = forever", "while true = sonsuza kadar"),
        t(
          "`while true do … end` repeats forever. ALWAYS put `task.wait()` inside, or Studio freezes.",
          "`while true do … end` sonsuza kadar tekrarlar. İçine MUTLAKA `task.wait()` koy, yoksa Studio donar.",
        ),
        {
          hook: t(
            "No wait = a hamster wheel at light speed 🐹💥. Roblox stops the script.",
            "Beklemesiz döngü = ışık hızında hamster çarkı 🐹💥. Roblox scripti durdurur.",
          ),
        },
      ),
      fill(
        t("Make this forever-loop safe", "Bu sonsuz döngüyü güvenli yap"),
        lua`
while true do
	print("Spawning a coin")
	___(5)
end
`,
        ["task.wait", "wait.task", "sleep", "pause"],
        0,
        t(
          "task.wait(5) pauses 5 seconds so the game can keep running.",
          "task.wait(5) 5 saniye bekler, oyun çalışmaya devam eder.",
        ),
      ),
      choice(
        t("A while true loop without task.wait()…", "task.wait() olmayan bir while true döngüsü…"),
        [
          t("runs slowly", "yavaş çalışır"),
          t("freezes the game → Script timeout", "oyunu dondurur → Script timeout"),
          t("runs once", "bir kez çalışır"),
          t("is totally fine", "tamamen sorunsuzdur"),
        ],
        1,
        t(
          'It never lets the game breathe, so Roblox stops it with "Script timeout".',
          'Oyuna hiç nefes aldırmaz, Roblox da "Script timeout" ile durdurur.',
        ),
      ),
    ],
  },

  functions: {
    emoji: "🧩",
    takeaway: t(
      "Define it first, then call it. return hands the answer back.",
      "Önce tanımla, sonra çağır. return cevabı geri verir.",
    ),
    steps: [
      learn(
        t("A function is a recipe", "Fonksiyon bir tariftir"),
        t(
          "Write the steps once, then run them any time by calling the name: `cheer()`.",
          "Adımları bir kez yaz, sonra adını çağırarak istediğin zaman çalıştır: `cheer()`.",
        ),
        {
          code: lua`
local function cheer()
	print("Let's go!")
end

cheer()
`,
          hook: t(
            "📜 A recipe: write it once, cook it many times.",
            "📜 Tarif: bir kez yaz, defalarca pişir.",
          ),
        },
      ),
      predict(
        lua`
local function cheer()
	print("Let's go!")
end
cheer()
cheer()
`,
        ["Let's go!\nLet's go!", "Let's go!", "cheer\ncheer", t("Nothing", "Hiçbir şey")],
        0,
        t("Each call runs the function again.", "Her çağrı fonksiyonu yeniden çalıştırır."),
      ),
      learn(
        t("Inputs and return", "Girdiler ve return"),
        t(
          "Parameters are the ingredients you pass in. `return` sends the result back to whoever called.",
          "Parametreler içeri verdiğin malzemelerdir. `return` sonucu çağırana geri gönderir.",
        ),
        {
          code: lua`
local function add(a, b)
	return a + b
end

print(add(2, 3)) -- 5
`,
        },
      ),
      predict(
        lua`
local function double(n)
	return n * 2
end
print(double(21))
`,
        ["42", "21", "n * 2", "nil"],
        0,
        t(
          "double(21) returns 21 * 2, and print shows it.",
          "double(21), 21 * 2 döndürür; print de onu gösterir.",
        ),
      ),
      fill(
        t("Send the result back", "Sonucu geri gönder"),
        lua`
local function damage(base, level)
	___ base + level * 2
end
print(damage(10, 5))
`,
        ["return", "print", "give", "send"],
        0,
        t(
          "return hands the value back so print can show 20.",
          "return değeri geri verir, print de 20'yi gösterebilir.",
        ),
      ),
      order(
        t("Define first, then call", "Önce tanımla, sonra çağır"),
        ["local function greet(name)", '\tprint("Hi " .. name)', "end", 'greet("Vy")'],
        t(
          "A local function only exists from its line downward, so the call goes last.",
          "local fonksiyon sadece tanımlandığı satırdan aşağısı için vardır; çağrı en sona gelir.",
        ),
      ),
      choice(
        t(
          "You call a local function ABOVE the line where it's defined. What happens?",
          "local bir fonksiyonu tanımlandığı satırın ÜSTÜNDE çağırıyorsun. Ne olur?",
        ),
        [
          t("It works fine", "Sorunsuz çalışır"),
          "attempt to call a nil value",
          t("It runs twice", "İki kez çalışır"),
          t("Nothing at all", "Hiçbir şey olmaz"),
        ],
        1,
        t(
          "At that moment the name is still nil, and nil can't be called.",
          "O anda isim hâlâ nil'dir ve nil çağrılamaz.",
        ),
      ),
    ],
  },

  tables: {
    emoji: "🎒",
    takeaway: t(
      "{ } makes a table. Lists start at 1. # counts. A missing key gives nil.",
      "{ } tablo yapar. Listeler 1'den başlar. # sayar. Olmayan anahtar nil verir.",
    ),
    steps: [
      learn(
        t("A list holds many things", "Liste çok şey tutar"),
        t(
          '`{"Dog", "Cat", "Dragon"}` is a list. `pets[1]` is the first item (lists start at 1!) and `#pets` counts them.',
          '`{"Dog", "Cat", "Dragon"}` bir liste. `pets[1]` ilk öğe (listeler 1\'den başlar!) ve `#pets` onları sayar.',
        ),
        {
          visual: "tables",
          hook: t(
            "A numbered backpack 🎒: slot 1, slot 2, slot 3…",
            "Numaralı bir sırt çantası 🎒: 1. göz, 2. göz, 3. göz…",
          ),
        },
      ),
      predict(
        lua`
local pets = {"Dog", "Cat", "Dragon"}
print(pets[2])
print(#pets)
`,
        ["Cat\n3", "Dog\n3", "Dragon\n2", "Cat\n2"],
        0,
        t("Slot 2 holds Cat, and there are 3 items.", "2. gözde Cat var ve toplam 3 öğe var."),
      ),
      fill(
        t("Add Unicorn to the list", "Listeye Unicorn ekle"),
        lua`
local pets = {"Dog"}
___(pets, "Unicorn")
print(#pets)
`,
        ["table.insert", "table.add", "pets.push", "insert"],
        0,
        t("table.insert adds to the end of a list.", "table.insert listenin sonuna ekler."),
      ),
      learn(
        t("Dictionaries use names", "Sözlükler isim kullanır"),
        t(
          '`{ Name = "Shadow", Power = 950 }` stores values under names. Read one with a dot: `pet.Power`.',
          '`{ Name = "Shadow", Power = 950 }` değerleri isimlerin altında saklar. Nokta ile oku: `pet.Power`.',
        ),
        {
          hook: t(
            "A character sheet 📝: Name, Power, Rarity.",
            "Bir karakter kartı 📝: Name, Power, Rarity.",
          ),
        },
      ),
      predict(
        lua`
local pet = { Name = "Shadow", Power = 950 }
pet.Power += 50
print(pet.Name, pet.Power)
`,
        ["Shadow 1000", "Shadow 950", "Name Power", "Shadow 95050"],
        0,
        t("Power went from 950 to 1000.", "Power 950'den 1000'e çıktı."),
      ),
      choice(
        t(
          "pet.Color when the table has no Color key gives…",
          "Tabloda Color anahtarı yokken pet.Color ne verir?",
        ),
        [t("an error", "hata"), "nil", '""', "0"],
        1,
        t(
          "Missing keys are nil. The error only comes later, when you use that nil.",
          "Olmayan anahtar nil'dir. Hata ancak o nil'i kullanınca gelir.",
        ),
      ),
      predict(
        lua`
local total = 0
for _, n in {5, 10, 15} do
	total += n
end
print(total)
`,
        ["30", "15", "3", "51015"],
        0,
        t("The loop adds 5, then 10, then 15.", "Döngü önce 5, sonra 10, sonra 15 ekler."),
      ),
    ],
  },
};
