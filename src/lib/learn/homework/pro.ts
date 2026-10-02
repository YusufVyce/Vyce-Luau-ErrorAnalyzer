/**
 * Homework for the pro units (lessons.pro.ts and lessons.pro2.ts). Same idea
 * as exercises.ts: run the student's code in the simulated world, poke it
 * the way players (or exploiters) would, and check what happened.
 */
import {
  CFrame,
  Vector3,
  type BrickColor,
  type EnumItem,
  type UDim2,
} from "@/lib/luau/roblox/datatypes";
import type { Instance } from "@/lib/luau/roblox/instance";
import type { World } from "@/lib/luau/roblox/world";
import { LuaTable } from "@/lib/luau/values";
import type { Exercise, Harness } from "./harness";

/** Lua source: drops the first newline and turns 4-space indents into tabs. */
const lua = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values)
    .replace(/^\n/, "")
    .replace(/^( {4})+/gm, (m) => "\t".repeat(m.length / 4))
    .replace(/\s+$/, "") + "\n";

const BT = "`";

function variant(code: string, pattern: RegExp, replacement: string): string | undefined {
  if (!pattern.test(code)) return undefined;
  return code.replace(pattern, replacement);
}

const character = (p: Instance) => p.props.get("Character") as Instance | undefined;
const rootOf = (p: Instance) => character(p)?.findFirstChild("HumanoidRootPart");
const posOf = (part: Instance | undefined) => part?.props.get("Position") as Vector3 | undefined;
const coinsOf = (p: Instance) =>
  p.findFirstChild("leaderstats")?.findFirstChild("Coins")?.props.get("Value") as
    | number
    | undefined;

function addCoinsFixture(w: World, coins: number) {
  w.addScript({
    name: "Leaderstats",
    parent: w.service("ServerScriptService"),
    source: `game.Players.PlayerAdded:Connect(function(player)
  local ls = Instance.new("Folder")
  ls.Name = "leaderstats"
  ls.Parent = player
  local c = Instance.new("IntValue")
  c.Name = "Coins"
  c.Value = ${coins}
  c.Parent = ls
end)`,
  });
}

/** The values one footer line printed, joined with spaces (or undefined). */
function line(h: Harness, w: World, first?: string): string | undefined {
  const rows = h.testValues(w);
  const row = first === undefined ? rows[0] : rows.find((r) => r[0] === first);
  return row?.join(" ");
}

function dummy(w: World, name: string, at: Vector3) {
  const model = w.create("Model", { Name: name }, w.workspace);
  for (const [part, dy] of [
    ["HumanoidRootPart", 0],
    ["Torso", 0.5],
    ["Head", 2],
  ] as const) {
    w.create(
      "Part",
      {
        Name: part,
        Anchored: true,
        Size: new Vector3(2, 1, 1),
        Position: at.add(new Vector3(0, dy, 0)),
      },
      model,
    );
  }
  w.create("Humanoid", {}, model);
  return model;
}

const healthOf = (model: Instance) =>
  model.findFirstChild("Humanoid")?.props.get("Health") as number | undefined;

export const PRO_EXERCISES: Exercise[] = [
  // ================================================================ 10 · Pro Luau
  {
    lessonId: "type-checking",
    title: "Typed damage",
    kind: "write",
    goal: "Write a fully typed damage function with --!strict.",
    steps: [
      "Keep --!strict as the first line",
      "Make a type Weapon with name: string, damage: number and an optional critChance: number?",
      "Write getDamage(weapon: Weapon, isCrit: boolean): number — it returns double damage on a crit, normal damage otherwise",
      "Make a Sword with damage 15 and print getDamage(sword, true) (it prints 30)",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Weapons",
    starter: "--!strict\n\n",
    hints: [
      "type Weapon = { name: string, damage: number, critChance: number? }",
      "local function getDamage(weapon: Weapon, isCrit: boolean): number",
      "if isCrit then return weapon.damage * 2 end — then return weapon.damage",
    ],
    solution: lua`
--!strict
type Weapon = {
    name: string,
    damage: number,
    critChance: number?,
}

local function getDamage(weapon: Weapon, isCrit: boolean): number
    if isCrit then
        return weapon.damage * 2
    end
    return weapon.damage
end

local sword: Weapon = { name = "Sword", damage = 15 }
print(getDamage(sword, true))
`,
    testFooter:
      'if getDamage then print("__TEST__", getDamage({ name = "Axe", damage = 7 }, false), getDamage({ name = "Axe", damage = 7 }, true)) end',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Weapons" });
      w.run(1);
      h.expectPrinted("30");
      h.check(
        h.t("The first line is --!strict", "İlk satır --!strict"),
        /^\s*--!strict/.test(h.code),
        h.t("Put --!strict on the very first line.", "--!strict'i en ilk satıra koy."),
      );
      h.check(
        h.t(
          "There is a Weapon type with an optional field",
          "İsteğe bağlı alanı olan bir Weapon tipi var",
        ),
        h.codeHas(/\btype\s+Weapon\s*=/) && h.codeHas(/critChance\s*:\s*number\s*\?/),
        h.t(
          "Write type Weapon = { …, critChance: number? }",
          "type Weapon = { …, critChance: number? } yaz",
        ),
      );
      h.check(
        h.t(
          "getDamage has typed parameters and a return type",
          "getDamage'in parametre ve dönüş tipleri var",
        ),
        h.codeHas(/getDamage\s*\(\s*\w+\s*:\s*Weapon\s*,\s*\w+\s*:\s*boolean\s*\)\s*:\s*number/),
        h.t(
          "Write it as getDamage(weapon: Weapon, isCrit: boolean): number",
          "getDamage(weapon: Weapon, isCrit: boolean): number şeklinde yaz",
        ),
      );
      const got = line(h, w);
      h.check(
        h.t(
          "An Axe with damage 7 gives 7, or 14 on a crit",
          "7 hasarlı bir Axe 7, kritikte 14 verir",
        ),
        got === "7 14",
        h.t(`It gave: ${got ?? "nothing"}`, `Verdiği: ${got ?? "hiçbir şey"}`),
      );
    },
  },

  {
    lessonId: "metatables",
    title: "Vectors that add up",
    kind: "write",
    goal: "Make a small Vec class whose objects can be added with + and printed nicely.",
    steps: [
      "Vec.new(x, y) returns a table { x = x, y = y } with Vec as its metatable",
      "Vec.__add returns a new Vec with both parts added",
      'Vec.__tostring returns text like "(4, 6)"',
      "Print tostring(Vec.new(1, 2) + Vec.new(3, 4)) — it prints (4, 6)",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Vectors",
    starter: "local Vec = {}\nVec.__index = Vec\n\n",
    hints: [
      "function Vec.new(x, y) return setmetatable({ x = x, y = y }, Vec) end",
      "Vec.__add = function(a, b) return Vec.new(a.x + b.x, a.y + b.y) end",
      'Vec.__tostring = function(v) return "(" .. v.x .. ", " .. v.y .. ")" end',
    ],
    solution: lua`
local Vec = {}
Vec.__index = Vec

function Vec.new(x, y)
    return setmetatable({ x = x, y = y }, Vec)
end

Vec.__add = function(a, b)
    return Vec.new(a.x + b.x, a.y + b.y)
end

Vec.__tostring = function(v)
    return "(" .. v.x .. ", " .. v.y .. ")"
end

print(tostring(Vec.new(1, 2) + Vec.new(3, 4)))
`,
    testFooter:
      'if Vec and Vec.new then local v = Vec.new(10, -1) + Vec.new(5, 5) print("__TEST__", tostring(v), getmetatable(v) == Vec) end',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Vectors" });
      w.run(1);
      h.expectPrinted("(4, 6)");
      const got = line(h, w);
      h.check(
        h.t(
          "(10, -1) + (5, 5) is a Vec that prints (15, 4)",
          "(10, -1) + (5, 5), (15, 4) yazan bir Vec",
        ),
        got === "(15, 4) true",
        h.t(
          `It gave: ${got ?? "nothing"} — __add must return Vec.new(…), and __tostring the text.`,
          `Verdiği: ${got ?? "hiçbir şey"} — __add Vec.new(…) döndürmeli, __tostring de metni.`,
        ),
      );
    },
  },

  {
    lessonId: "inheritance",
    title: "The boss fight",
    kind: "write",
    goal: "Make a Boss class that inherits from Enemy and hits three times as hard.",
    steps: [
      "Enemy is already written. Below it, make Boss inherit from Enemy (setmetatable(Boss, { __index = Enemy }))",
      "Boss.new(name, health) builds an Enemy with Enemy.new and turns it into a Boss",
      "Boss:Attack() returns three times what Enemy.Attack(self) returns — call the parent, don't type 30",
      'Print Boss.new("Mega Noob", 500):Attack() (it prints 30)',
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Enemies",
    starter: lua`
local Enemy = {}
Enemy.__index = Enemy

function Enemy.new(name, health)
    local self = setmetatable({}, Enemy)
    self.Name = name
    self.Health = health
    return self
end

function Enemy:TakeDamage(amount)
    self.Health = math.max(0, self.Health - amount)
end

function Enemy:Attack()
    return 10
end

-- Write the Boss class below
`,
    hints: [
      "local Boss = setmetatable({}, { __index = Enemy }) and then Boss.__index = Boss",
      "function Boss.new(name, health) return setmetatable(Enemy.new(name, health), Boss) end",
      "function Boss:Attack() return Enemy.Attack(self) * 3 end",
    ],
    solution: lua`
local Enemy = {}
Enemy.__index = Enemy

function Enemy.new(name, health)
    local self = setmetatable({}, Enemy)
    self.Name = name
    self.Health = health
    return self
end

function Enemy:TakeDamage(amount)
    self.Health = math.max(0, self.Health - amount)
end

function Enemy:Attack()
    return 10
end

local Boss = setmetatable({}, { __index = Enemy })
Boss.__index = Boss

function Boss.new(name, health)
    local self = Enemy.new(name, health)
    return setmetatable(self, Boss)
end

function Boss:Attack()
    return Enemy.Attack(self) * 3
end

print(Boss.new("Mega Noob", 500):Attack())
`,
    testFooter:
      'if Boss and Boss.new then local b = Boss.new("Test", 100) b:TakeDamage(30) print("__TEST__", b.Health, b:Attack(), getmetatable(b) == Boss, rawget(Boss, "TakeDamage") == nil, b.Name) end',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Enemies" });
      w.run(1);
      h.expectPrinted("30");
      const got = line(h, w);
      h.check(
        h.t(
          "A Boss inherits TakeDamage and is a real Boss object",
          "Bir Boss TakeDamage'i miras alıyor ve gerçek bir Boss nesnesi",
        ),
        got === "70 30 true true Test",
        h.t(
          `Boss.new("Test", 100) then TakeDamage(30) gave: ${got ?? "nothing"} (expected 70 30 true true Test).`,
          `Boss.new("Test", 100) sonra TakeDamage(30) şunu verdi: ${got ?? "hiçbir şey"} (beklenen 70 30 true true Test).`,
        ),
      );
      const changed = variant(h.code, /return 10\b/, "return 4");
      const w2 = h.newWorld();
      if (changed)
        h.addStudentScript(w2, w2.service("ServerScriptService"), {
          code: changed,
          name: "Enemies",
        });
      w2.run(1);
      h.check(
        h.t(
          "Boss:Attack builds on Enemy.Attack (an Enemy attack of 4 gives 12)",
          "Boss:Attack, Enemy.Attack'in üstüne kurulu (4'lük Enemy saldırısı 12 verir)",
        ),
        Boolean(changed) && line(h, w2)?.split(" ")[1] === "12",
        h.t(
          "Call Enemy.Attack(self) and multiply it by 3.",
          "Enemy.Attack(self) çağır ve 3 ile çarp.",
        ),
      );
    },
  },

  {
    lessonId: "closures",
    title: "Limited tries",
    kind: "write",
    goal: "Write a function that makes limiters: each one says yes a few times, then no.",
    steps: [
      "makeLimiter(max) returns a new function",
      "That function returns true for its first max calls and false after that",
      "Every limiter counts on its own",
      "local tryOpen = makeLimiter(3), then print(tryOpen(), tryOpen(), tryOpen(), tryOpen()) — it prints true true true false",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Limits",
    starter: "local function makeLimiter(max)\n\t\nend\n\n",
    hints: [
      "Inside makeLimiter: local used = 0, then return function() … end",
      "Inside the returned function: used += 1 and return used <= max",
      "Because used lives inside makeLimiter, each limiter gets its own.",
    ],
    solution: lua`
local function makeLimiter(max)
    local used = 0
    return function()
        used += 1
        return used <= max
    end
end

local tryOpen = makeLimiter(3)
print(tryOpen(), tryOpen(), tryOpen(), tryOpen())
`,
    testFooter:
      'if makeLimiter then local a, b = makeLimiter(1), makeLimiter(2) print("__TEST__", a(), a(), b(), b(), b()) end',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Limits" });
      w.run(1);
      h.expectPrinted("true true true false");
      const got = line(h, w);
      h.check(
        h.t(
          "Two limiters (1 and 2 tries) each keep their own count",
          "İki sınırlayıcı (1 ve 2 deneme) kendi sayısını tutuyor",
        ),
        got === "true false true true false",
        h.t(`They gave: ${got ?? "nothing"}`, `Verdikleri: ${got ?? "hiçbir şey"}`),
      );
    },
  },

  {
    lessonId: "coroutines",
    title: "Team picker",
    kind: "write",
    goal: "Hand out team colors one by one, forever, with a coroutine.",
    steps: [
      'Make nextColor with coroutine.wrap: it yields "Red", then "Blue", then "Green", and starts over',
      "Print nextColor() four times on one line — it prints Red Blue Green Red",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Teams",
    starter: "-- Make nextColor with coroutine.wrap\n\n",
    hints: [
      "local nextColor = coroutine.wrap(function() … end)",
      "Inside: while true do … end, so it never runs out",
      'In the loop: for _, color in { "Red", "Blue", "Green" } do coroutine.yield(color) end',
    ],
    solution: lua`
local nextColor = coroutine.wrap(function()
    while true do
        for _, color in { "Red", "Blue", "Green" } do
            coroutine.yield(color)
        end
    end
end)

print(nextColor(), nextColor(), nextColor(), nextColor())
`,
    testFooter: 'if nextColor then print("__TEST__", nextColor(), nextColor()) end',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Teams" });
      w.run(1);
      h.expectPrinted("Red Blue Green Red");
      const got = line(h, w);
      h.check(
        h.t(
          "It keeps going: the next two are Blue and Green",
          "Devam ediyor: sonraki ikisi Blue ve Green",
        ),
        got === "Blue Green",
        h.t(
          `The next two calls gave: ${got ?? "nothing"}`,
          `Sonraki iki çağrı: ${got ?? "hiçbir şey"}`,
        ),
      );
      h.check(
        h.t("It uses a coroutine and yield", "Bir coroutine ve yield kullanıyor"),
        h.codeHas(/coroutine\.(wrap|create)/) && h.codeHas(/coroutine\.yield/),
        h.t("Use coroutine.wrap and coroutine.yield.", "coroutine.wrap ve coroutine.yield kullan."),
      );
    },
  },

  // ================================================================ 11 · Data like a pro
  {
    lessonId: "session-data",
    title: "Session saver",
    kind: "write",
    goal: "Load each player's data once, keep it in sessions, and save it when they leave.",
    steps: [
      'When a player joins, load their data with pcall from the key "Player_" .. player.UserId and put it in sessions[player]',
      "New players (nothing saved) get { Coins = 0 }",
      "When a player leaves, save sessions[player] (UpdateAsync or SetAsync) and then set it to nil",
      "Don't save a player whose data never loaded",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › PlayerData",
    starter: lua`
local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("PlayerData")

local sessions = {} -- [player] = their data while they play
`,
    hints: [
      'Players.PlayerAdded:Connect(function(player) local ok, saved = pcall(store.GetAsync, store, "Player_" .. player.UserId) … end)',
      "if ok then sessions[player] = saved or { Coins = 0 } end",
      'In PlayerRemoving: local data = sessions[player]; if data then pcall(store.SetAsync, store, "Player_" .. player.UserId, data) end; sessions[player] = nil',
    ],
    solution: lua`
local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("PlayerData")

local sessions = {} -- [player] = their data while they play

Players.PlayerAdded:Connect(function(player)
    local ok, saved = pcall(store.GetAsync, store, "Player_" .. player.UserId)
    if ok then
        sessions[player] = saved or { Coins = 0 }
    end
end)

Players.PlayerRemoving:Connect(function(player)
    local data = sessions[player]
    if data then
        pcall(store.UpdateAsync, store, "Player_" .. player.UserId, function()
            return data
        end)
    end
    sessions[player] = nil
end)
`,
    testFooter: lua`
task.delay(2, function()
    for p, d in sessions do
        print("__TEST__", "loaded", p.Name, d.Coins)
        d.Coins += 10
    end
end)
task.delay(5, function()
    local n = 0
    for _ in sessions do
        n += 1
    end
    print("__TEST__", "left", n)
end)
`,
    grade(h) {
      const w = h.newWorld();
      const saved = w.dataStore("PlayerData/global");
      saved.set("Player_1001", JSON.stringify({ Coins: 75 }));
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "PlayerData" });
      w.run(0.5);
      const ann = w.addPlayer("Ann");
      const bob = w.addPlayer("Bob");
      w.run(3);
      w.removePlayer(ann);
      w.removePlayer(bob);
      w.run(3);
      const rows = h
        .testValues(w)
        .filter((r) => r[0] === "loaded")
        .map((r) => r.join(" "));
      h.check(
        h.t(
          "Ann's saved 75 coins are loaded into sessions",
          "Ann'in kayıtlı 75 coini sessions'a yüklendi",
        ),
        rows.includes("loaded Ann 75"),
        h.t(
          `sessions had: ${rows.join(", ") || "nothing"}`,
          `sessions'ta olan: ${rows.join(", ") || "hiçbir şey"}`,
        ),
      );
      h.check(
        h.t("A brand-new player starts with 0 coins", "Yepyeni bir oyuncu 0 coinle başlıyor"),
        rows.includes("loaded Bob 0"),
        h.t("New players need { Coins = 0 }.", "Yeni oyunculara { Coins = 0 } gerekir."),
      );
      const read = (key: string) => {
        const raw = saved.get(key);
        return raw ? (JSON.parse(raw) as { Coins?: number }).Coins : undefined;
      };
      h.check(
        h.t(
          "Leaving saves the session (Ann 85, Bob 10)",
          "Çıkış oturumu kaydediyor (Ann 85, Bob 10)",
        ),
        read("Player_1001") === 85 && read("Player_1002") === 10,
        h.t(
          `Saved: Ann ${read("Player_1001") ?? "nothing"}, Bob ${read("Player_1002") ?? "nothing"}`,
          `Kaydedilen: Ann ${read("Player_1001") ?? "hiçbir şey"}, Bob ${read("Player_1002") ?? "hiçbir şey"}`,
        ),
      );
      h.check(
        h.t("Players who left are removed from sessions", "Çıkan oyuncular sessions'tan siliniyor"),
        line(h, w, "left") === "left 0",
        h.t(
          "Set sessions[player] = nil after saving.",
          "Kaydettikten sonra sessions[player] = nil yap.",
        ),
      );
    },
  },

  {
    lessonId: "global-leaderboards",
    title: "Hall of fame",
    kind: "write",
    goal: "Print the top 3 of an OrderedDataStore that's already full of scores.",
    steps: [
      "The Wins OrderedDataStore already has scores (keys are player names)",
      "Get the 3 highest with GetSortedAsync and GetCurrentPage",
      "Print one line per entry: #rank name wins — for example #1 Ann 75",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › HallOfFame",
    starter:
      'local DataStoreService = game:GetService("DataStoreService")\nlocal wins = DataStoreService:GetOrderedDataStore("Wins")\n\n',
    hints: [
      "local page = wins:GetSortedAsync(false, 3):GetCurrentPage()",
      "for rank, entry in ipairs(page) do … end",
      `print("#" .. rank .. " " .. entry.key .. " " .. entry.value) — or with backticks`,
    ],
    solution: lua`
local DataStoreService = game:GetService("DataStoreService")
local wins = DataStoreService:GetOrderedDataStore("Wins")

local page = wins:GetSortedAsync(false, 3):GetCurrentPage()
for rank, entry in ipairs(page) do
    print(${BT}#{rank} {entry.key} {entry.value}${BT})
end
`,
    grade(h) {
      const seed = (w: World, scores: Record<string, number>) => {
        const store = w.dataStore("ordered:Wins");
        for (const [k, v] of Object.entries(scores)) store.set(k, String(v));
      };
      const w = h.newWorld();
      seed(w, { Ann: 75, Bob: 30, Cat: 12, Dan: 50 });
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "HallOfFame" });
      w.run(1);
      const lines = h.prints(w);
      h.check(
        h.t(
          "Prints #1 Ann 75, #2 Dan 50, #3 Bob 30 in that order",
          "Sırayla #1 Ann 75, #2 Dan 50, #3 Bob 30 yazdırıyor",
        ),
        lines.join("|") === "#1 Ann 75|#2 Dan 50|#3 Bob 30",
        h.t(
          `The Output shows: ${lines.join(", ") || "nothing"}`,
          `Output'ta yazanlar: ${lines.join(", ") || "hiçbir şey"}`,
        ),
      );
      const w2 = h.newWorld();
      seed(w2, { Ann: 75, Bob: 30, Eve: 99 });
      h.addStudentScript(w2, w2.service("ServerScriptService"), { name: "HallOfFame" });
      w2.run(1);
      h.check(
        h.t(
          "The board follows the data (a new leader with 99 comes first)",
          "Pano veriye göre değişiyor (99'lu yeni lider önce geliyor)",
        ),
        h.prints(w2)[0] === "#1 Eve 99",
        h.t(
          "Read the scores from the store instead of typing them.",
          "Skorları yazmak yerine store'dan oku.",
        ),
      );
    },
  },

  {
    lessonId: "serialization",
    title: "Save a part",
    kind: "write",
    goal: "Turn a part into plain data that survives JSON, and build it back.",
    steps: [
      "serialize(part) returns a table with Name, Position (three numbers) and Color (a hex string or three numbers)",
      "deserialize(data) returns a new Part with that Name, Position and Color",
      "The data must survive HttpService:JSONEncode and JSONDecode — so no Vector3 or Color3 inside it",
      "Print deserialize(serialize(workspace.Block)).Position",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Builds",
    starter:
      "local function serialize(part)\n\t\nend\n\nlocal function deserialize(data)\n\t\nend\n\n",
    hints: [
      "Position = { part.Position.X, part.Position.Y, part.Position.Z }",
      "Color = part.Color:ToHex() — and Color3.fromHex(data.Color) to get it back",
      "part.Position = Vector3.new(table.unpack(data.Position))",
    ],
    solution: lua`
local function serialize(part)
    return {
        Name = part.Name,
        Position = { part.Position.X, part.Position.Y, part.Position.Z },
        Color = part.Color:ToHex(),
    }
end

local function deserialize(data)
    local part = Instance.new("Part")
    part.Name = data.Name
    part.Position = Vector3.new(table.unpack(data.Position))
    part.Color = Color3.fromHex(data.Color)
    return part
end

print(deserialize(serialize(workspace.Block)).Position)
`,
    testFooter: lua`
if serialize and deserialize then
    local HttpService = game:GetService("HttpService")
    local p = Instance.new("Part")
    p.Name = "Test"
    p.Position = Vector3.new(1, 2, 3)
    p.Color = Color3.fromRGB(10, 200, 30)
    local json = HttpService:JSONEncode(serialize(p))
    local back = deserialize(HttpService:JSONDecode(json))
    print("__TEST__", typeof(back), back.Name, back.Position.X, back.Position.Y, back.Position.Z, math.round(back.Color.R * 255), math.round(back.Color.G * 255), math.round(back.Color.B * 255))
end
`,
    grade(h) {
      const w = h.newWorld();
      w.create(
        "Part",
        { Name: "Block", Anchored: true, Position: new Vector3(4, 10, -2) },
        w.workspace,
      );
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Builds" });
      w.run(1);
      h.expectPrinted("4, 10, -2");
      const got = line(h, w);
      h.check(
        h.t(
          "A part survives JSON: name, position and color come back",
          "Bir parça JSON'dan sağ çıkıyor: isim, konum ve renk geri geliyor",
        ),
        got === "Instance Test 1 2 3 10 200 30",
        h.t(
          `After JSON it came back as: ${got ?? "nothing"} — store only numbers and strings.`,
          `JSON'dan sonra şöyle geldi: ${got ?? "hiçbir şey"} — sadece sayı ve metin sakla.`,
        ),
      );
    },
  },

  {
    lessonId: "cross-server",
    title: "Global shout",
    kind: "write",
    goal: "Send a shout to every server and print the shouts you receive.",
    steps: [
      'Subscribe to the "Shouts" topic. Each message\'s Data is a table with Player and Text',
      "Print every shout as: [Global] Player: Text — for example [Global] Ann: gg",
      'Write shout(playerName, text) that publishes { Player = playerName, Text = text } to "Shouts"',
      'Call shout("Ann", "gg")',
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Shouts",
    starter: 'local MessagingService = game:GetService("MessagingService")\n\n',
    hints: [
      'MessagingService:SubscribeAsync("Shouts", function(message) local data = message.Data … end)',
      'print("[Global] " .. data.Player .. ": " .. data.Text)',
      'local function shout(playerName, text) MessagingService:PublishAsync("Shouts", { Player = playerName, Text = text }) end',
    ],
    solution: lua`
local MessagingService = game:GetService("MessagingService")

MessagingService:SubscribeAsync("Shouts", function(message)
    local data = message.Data
    print("[Global] " .. data.Player .. ": " .. data.Text)
end)

local function shout(playerName, text)
    MessagingService:PublishAsync("Shouts", { Player = playerName, Text = text })
end

shout("Ann", "gg")
`,
    testFooter: 'if shout then shout("Bob", "yo") end',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Shouts" });
      w.addScript({
        name: "OtherServer",
        parent: w.service("ServerScriptService"),
        source:
          'task.wait(1)\ngame:GetService("MessagingService"):PublishAsync("Shouts", { Player = "Zed", Text = "hi all" })',
      });
      w.run(2);
      h.expectPrinted("[Global] Ann: gg");
      h.expectPrinted(
        "[Global] Zed: hi all",
        h.t(
          "Shouts from other servers are printed too",
          "Diğer sunuculardan gelen bağırışlar da yazdırılıyor",
        ),
      );
      h.expectPrinted(
        "[Global] Bob: yo",
        h.t("shout() works for any player and text", "shout() her oyuncu ve metin için çalışıyor"),
      );
    },
  },

  // ================================================================ 12 · Security
  {
    lessonId: "server-authority",
    title: "Safe donations",
    kind: "fix",
    goal: "This donation remote can be exploited in many ways. Make the server check everything.",
    steps: [
      "Donate:FireServer(targetName, amount) gives some of your coins to another player",
      "Refuse amounts that aren't whole numbers of at least 1 (negative, NaN, text, decimals)",
      "Refuse a target that isn't a real player, or is yourself",
      "Refuse donations bigger than what you have — a fair donation still works",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Donations",
    starter: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local donate = ReplicatedStorage.Donate

donate.OnServerEvent:Connect(function(player, targetName, amount)
    local target = Players:FindFirstChild(targetName)
    local myCoins = player.leaderstats.Coins
    myCoins.Value -= amount
    target.leaderstats.Coins.Value += amount
end)
`,
    hints: [
      'First: if typeof(targetName) ~= "string" or typeof(amount) ~= "number" then return end',
      "Then: if amount ~= amount or amount < 1 or amount % 1 ~= 0 then return end",
      "if not target or target == player or myCoins.Value < amount then return end",
    ],
    solution: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local donate = ReplicatedStorage.Donate

donate.OnServerEvent:Connect(function(player, targetName, amount)
    if typeof(targetName) ~= "string" or typeof(amount) ~= "number" then
        return
    end
    if amount ~= amount or amount < 1 or amount % 1 ~= 0 then
        return
    end
    local target = Players:FindFirstChild(targetName)
    if not target or target == player then
        return
    end
    local myCoins = player.leaderstats.Coins
    if myCoins.Value < amount then
        return
    end
    myCoins.Value -= amount
    target.leaderstats.Coins.Value += amount
end)
`,
    grade(h) {
      const w = h.newWorld();
      const remote = w.create("RemoteEvent", { Name: "Donate" }, w.service("ReplicatedStorage"));
      addCoinsFixture(w, 100);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Donations" });
      w.run(0.5);
      const ann = w.addPlayer("Ann");
      const bob = w.addPlayer("Bob");
      w.run(1);
      const both = () => `${coinsOf(ann)}/${coinsOf(bob)}`;
      const tryAll = (cases: unknown[][]) => {
        for (const args of cases) {
          w.fireServer(remote, ann, ...args);
          w.run(0.2);
        }
        return both() === "100/100";
      };
      h.check(
        h.t("Negative amounts are refused", "Negatif miktarlar reddediliyor"),
        tryAll([["Bob", -50]]),
        h.t(
          `Coins (Ann/Bob) are now ${both()} — a negative donation steals coins!`,
          `Coinler (Ann/Bob) artık ${both()} — negatif bağış coin çalar!`,
        ),
      );
      h.check(
        h.t("NaN, text and decimals are refused", "NaN, metin ve ondalıklar reddediliyor"),
        tryAll([
          ["Bob", 0 / 0],
          ["Bob", "10"],
          ["Bob", 2.5],
        ]),
        h.t(`Coins (Ann/Bob) are now ${both()}.`, `Coinler (Ann/Bob) artık ${both()}.`),
      );
      h.check(
        h.t("You can't donate more than you have", "Sahip olduğundan fazlasını bağışlayamazsın"),
        tryAll([["Bob", 500]]),
        h.t(`Coins (Ann/Bob) are now ${both()}.`, `Coinler (Ann/Bob) artık ${both()}.`),
      );
      h.check(
        h.t(
          "Donating to yourself, to nobody or to a table is refused",
          "Kendine, hiç kimseye ya da bir tabloya bağış reddediliyor",
        ),
        tryAll([
          ["Ann", 10],
          ["Nobody", 10],
          [new LuaTable(), 10],
        ]),
        h.t(`Coins (Ann/Bob) are now ${both()}.`, `Coinler (Ann/Bob) artık ${both()}.`),
      );
      w.fireServer(remote, ann, "Bob", 30);
      w.run(0.3);
      h.check(
        h.t(
          "A fair donation of 30 works (Ann 70, Bob 130)",
          "Adil bir 30'luk bağış çalışıyor (Ann 70, Bob 130)",
        ),
        both() === "70/130",
        h.t(`Coins (Ann/Bob) are ${both()}.`, `Coinler (Ann/Bob) şu an ${both()}.`),
      );
    },
  },

  {
    lessonId: "rate-limiting",
    title: "Auto-clicker stopper",
    kind: "fix",
    goal: "Clicks give coins — but an auto-clicker gets thousands. Add a per-player cooldown.",
    steps: [
      "Each Click gives +1 coin, but at most once every 0.2 seconds per player",
      "One player's spam must not block another player",
      "Store the times in lastClick and remove a player's entry when they leave",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Clicker",
    starter: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local click = ReplicatedStorage.Click

local lastClick = {} -- [player] = when they last clicked

click.OnServerEvent:Connect(function(player)
    player.leaderstats.Coins.Value += 1
end)
`,
    hints: [
      "local now = os.clock()",
      "if lastClick[player] and now - lastClick[player] < 0.2 then return end — then lastClick[player] = now",
      "Players.PlayerRemoving:Connect(function(player) lastClick[player] = nil end)",
    ],
    solution: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local click = ReplicatedStorage.Click

local COOLDOWN = 0.2
local lastClick = {} -- [player] = when they last clicked

click.OnServerEvent:Connect(function(player)
    local now = os.clock()
    if lastClick[player] and now - lastClick[player] < COOLDOWN then
        return
    end
    lastClick[player] = now
    player.leaderstats.Coins.Value += 1
end)

Players.PlayerRemoving:Connect(function(player)
    lastClick[player] = nil
end)
`,
    testFooter: lua`
task.delay(4, function()
    local n = 0
    for _ in lastClick do
        n += 1
    end
    print("__TEST__", n)
end)
`,
    grade(h) {
      const w = h.newWorld();
      const remote = w.create("RemoteEvent", { Name: "Click" }, w.service("ReplicatedStorage"));
      addCoinsFixture(w, 0);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Clicker" });
      w.run(0.5);
      const ann = w.addPlayer("Ann");
      const bob = w.addPlayer("Bob");
      w.run(1);
      for (let i = 0; i < 10; i++) w.fireServer(remote, ann);
      w.run(0.1);
      h.check(
        h.t("10 clicks at once give only 1 coin", "Aynı anda 10 tıklama sadece 1 coin veriyor"),
        coinsOf(ann) === 1,
        h.t(`Ann got ${coinsOf(ann)} coins.`, `Ann ${coinsOf(ann)} coin aldı.`),
      );
      w.fireServer(remote, bob);
      w.run(0.1);
      h.check(
        h.t(
          "Another player isn't blocked by Ann's spam",
          "Ann'in spamı başka bir oyuncuyu engellemiyor",
        ),
        coinsOf(bob) === 1,
        h.t(`Bob got ${coinsOf(bob)} coins.`, `Bob ${coinsOf(bob)} coin aldı.`),
      );
      w.run(0.3);
      w.fireServer(remote, ann);
      w.run(0.1);
      h.check(
        h.t(
          "After the cooldown, clicking works again",
          "Bekleme süresinden sonra tıklama yine çalışıyor",
        ),
        coinsOf(ann) === 2,
        h.t(
          `Ann has ${coinsOf(ann)} coins (expected 2).`,
          `Ann'in ${coinsOf(ann)} coini var (beklenen 2).`,
        ),
      );
      w.removePlayer(ann);
      w.run(3);
      h.check(
        h.t(
          "Players who left are removed from lastClick",
          "Çıkan oyuncular lastClick'ten siliniyor",
        ),
        line(h, w) === "1",
        h.t(
          "Clear lastClick[player] in PlayerRemoving.",
          "PlayerRemoving'de lastClick[player]'ı temizle.",
        ),
      );
    },
  },

  {
    lessonId: "replication",
    title: "Daily reward button",
    kind: "write",
    goal: "Show the coins the server sends you, and ask the server for the daily reward.",
    steps: [
      "This LocalScript sits in a ScreenGui with a TextLabel CoinsLabel and a TextButton DailyButton",
      "Show the player's leaderstats.Coins as Coins: <number>, and update it whenever the value changes",
      "When DailyButton is clicked, fire ReplicatedStorage.ClaimDaily",
      "Don't change Coins yourself — it wouldn't replicate",
    ],
    scriptKind: "LocalScript",
    location: "StarterGui › CoinGui › LocalScript",
    starter: lua`
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local label = script.Parent.CoinsLabel
local button = script.Parent.DailyButton
`,
    hints: [
      'local coins = player:WaitForChild("leaderstats"):WaitForChild("Coins")',
      'local function show() label.Text = "Coins: " .. coins.Value end — call it once and on coins.Changed',
      "button.MouseButton1Click:Connect(function() ReplicatedStorage.ClaimDaily:FireServer() end)",
    ],
    solution: lua`
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local label = script.Parent.CoinsLabel
local button = script.Parent.DailyButton
local coins = player:WaitForChild("leaderstats"):WaitForChild("Coins")

local function show()
    label.Text = "Coins: " .. coins.Value
end

show()
coins.Changed:Connect(show)

button.MouseButton1Click:Connect(function()
    ReplicatedStorage.ClaimDaily:FireServer()
end)
`,
    grade(h) {
      const w = h.newWorld();
      w.create("RemoteEvent", { Name: "ClaimDaily" }, w.service("ReplicatedStorage"));
      addCoinsFixture(w, 10);
      w.addScript({
        name: "Daily",
        parent: w.service("ServerScriptService"),
        source:
          "game.ReplicatedStorage.ClaimDaily.OnServerEvent:Connect(function(p) p.leaderstats.Coins.Value += 50 end)",
      });
      const gui = w.create("ScreenGui", { Name: "CoinGui" }, w.service("StarterGui"));
      w.create("TextLabel", { Name: "CoinsLabel" }, gui);
      w.create("TextButton", { Name: "DailyButton" }, gui);
      h.addStudentScript(w, gui, { name: "LocalScript" });
      w.run(0.5);
      const p = w.addPlayer("Ann");
      w.run(2);
      const mine = p.findFirstChild("PlayerGui")?.findFirstChild("CoinGui");
      const text = () =>
        mine?.findFirstChild("CoinsLabel")?.props.get("Text") as string | undefined;
      const says = (n: number) => h.said(text(), { en: `Coins: ${n}`, tr: `Coin: ${n}` });
      h.check(
        h.t("The label shows Coins: 10", "Etikette Coins: 10 yazıyor"),
        says(10),
        h.t(`The label says: ${text() ?? "nothing"}`, `Etikette yazan: ${text() ?? "hiçbir şey"}`),
      );
      const button = mine?.findFirstChild("DailyButton");
      if (button) w.click(button, p);
      w.run(1);
      h.check(
        h.t(
          "Clicking asks the server, and the label shows Coins: 60",
          "Tıklamak sunucuya soruyor ve etikette Coins: 60 yazıyor",
        ),
        says(60) && coinsOf(p) === 60,
        h.t(
          `Coins are ${coinsOf(p)} and the label says ${text() ?? "nothing"}.`,
          `Coinler ${coinsOf(p)} ve etikette ${text() ?? "hiçbir şey"} yazıyor.`,
        ),
      );
      p.findFirstChild("leaderstats")?.findFirstChild("Coins")?.setProp("Value", 99);
      w.run(0.5);
      h.check(
        h.t(
          "The label follows every change from the server",
          "Etiket sunucudan gelen her değişikliği takip ediyor",
        ),
        says(99),
        h.t(
          "Connect to coins.Changed so the label updates.",
          "Etiket güncellensin diye coins.Changed'e bağlan.",
        ),
      );
      h.check(
        h.t(
          "The LocalScript never changes Coins itself",
          "LocalScript Coins'i asla kendisi değiştirmiyor",
        ),
        !h.codeHas(/\.Value\s*([-+*/]?=)(?!=)/),
        h.t("Only the server changes Coins.Value.", "Coins.Value'yu sadece sunucu değiştirir."),
      );
    },
  },

  {
    lessonId: "anti-cheat",
    title: "Teleport catcher",
    kind: "write",
    goal: "Pull back players who teleport, but leave honest movement and falling alone.",
    steps: [
      "Every 0.5 seconds, look at every player's HumanoidRootPart",
      "If it moved more than 30 studs sideways (ignore Y) since the last check, move it back there with CFrame and warn",
      "Remember each player's position for the next check",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › AntiCheat",
    starter: 'local Players = game:GetService("Players")\n\n',
    hints: [
      "local lastPositions = {} and a while true do task.wait(0.5) … end loop",
      "local moved = (root.Position - last) * Vector3.new(1, 0, 1)",
      "if moved.Magnitude > 30 then root.CFrame = CFrame.new(last) end — then lastPositions[player] = root.Position",
    ],
    solution: lua`
local Players = game:GetService("Players")

local CHECK_EVERY = 0.5
local MAX_MOVE = 30
local lastPositions = {}

while true do
    task.wait(CHECK_EVERY)
    for _, player in Players:GetPlayers() do
        local character = player.Character
        local root = character and character:FindFirstChild("HumanoidRootPart")
        if root then
            local last = lastPositions[player]
            if last then
                local moved = (root.Position - last) * Vector3.new(1, 0, 1)
                if moved.Magnitude > MAX_MOVE then
                    warn(player.Name .. " moved too fast")
                    root.CFrame = CFrame.new(last)
                end
            end
            lastPositions[player] = root.Position
        end
    end
end
`,
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "AntiCheat" });
      w.run(0.5);
      const p = w.addPlayer("Ann");
      w.run(2);
      const root = rootOf(p);
      const start = posOf(root);
      if (!root || !start) {
        h.check(h.t("The player has a character", "Oyuncunun bir karakteri var"), false, "");
        return;
      }
      const moveTo = (v: Vector3) => root.setProp("CFrame", new CFrame(v));
      const near = (v: Vector3) => (posOf(root)?.sub(v).magnitude ?? 999) < 1;
      moveTo(start.add(new Vector3(200, 0, 0)));
      w.run(1);
      h.check(
        h.t("A 200-stud teleport is pulled back", "200 stud'luk ışınlanma geri çekiliyor"),
        near(start),
        h.t(
          "Move the root back with root.CFrame = CFrame.new(last).",
          "Kökü root.CFrame = CFrame.new(last) ile geri taşı.",
        ),
      );
      moveTo(start.add(new Vector3(5, 0, 0)));
      w.run(1);
      h.check(
        h.t("Walking 5 studs is allowed", "5 stud yürümeye izin veriliyor"),
        near(start.add(new Vector3(5, 0, 0))),
        h.t(
          "Only pull back moves bigger than 30 studs.",
          "Sadece 30 stud'dan büyük hareketleri geri çek.",
        ),
      );
      moveTo(start.add(new Vector3(5, -100, 0)));
      w.run(1);
      h.check(
        h.t("Falling 100 studs isn't punished", "100 stud düşmek cezalandırılmıyor"),
        near(start.add(new Vector3(5, -100, 0))),
        h.t(
          "Ignore Y: multiply the movement by Vector3.new(1, 0, 1).",
          "Y'yi yok say: hareketi Vector3.new(1, 0, 1) ile çarp.",
        ),
      );
    },
  },

  // ================================================================ 13 · Game systems
  {
    lessonId: "inventory-system",
    title: "Three-slot bag",
    kind: "write",
    goal: "Write an Inventory module with stacking and a limit of 3 different items.",
    steps: [
      "Inventory.new() makes an empty bag (each bag is separate)",
      "bag:Add(item, amount) adds to the stack (amount defaults to 1) and returns true — or false if it's a new item and 3 different items are already inside",
      "bag:Remove(item, amount) returns false and changes nothing if there aren't enough; otherwise removes them and returns true. An item at 0 frees its slot",
      "bag:Count(item) returns how many there are (0 if none)",
    ],
    scriptKind: "ModuleScript",
    location: "ReplicatedStorage › Inventory",
    starter:
      "local Inventory = {}\nInventory.__index = Inventory\n\nlocal MAX_SLOTS = 3\n\n-- Write new, Add, Remove and Count here\n\nreturn Inventory\n",
    hints: [
      "function Inventory.new() return setmetatable({ items = {}, slots = 0 }, Inventory) end",
      "In Add: if not self.items[item] then (check slots, then self.items[item] = 0 and self.slots += 1) end",
      "In Remove: when the count reaches 0, set self.items[item] = nil and self.slots -= 1",
    ],
    solution: lua`
local Inventory = {}
Inventory.__index = Inventory

local MAX_SLOTS = 3

function Inventory.new()
    return setmetatable({ items = {}, slots = 0 }, Inventory)
end

function Inventory:Add(item, amount)
    amount = amount or 1
    if not self.items[item] then
        if self.slots >= MAX_SLOTS then
            return false
        end
        self.items[item] = 0
        self.slots += 1
    end
    self.items[item] += amount
    return true
end

function Inventory:Remove(item, amount)
    amount = amount or 1
    local have = self.items[item] or 0
    if have < amount then
        return false
    end
    self.items[item] = have - amount
    if self.items[item] == 0 then
        self.items[item] = nil
        self.slots -= 1
    end
    return true
end

function Inventory:Count(item)
    return self.items[item] or 0
end

return Inventory
`,
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ReplicatedStorage"), { name: "Inventory" });
      w.addScript({
        name: "Tester",
        parent: w.service("ServerScriptService"),
        source: `local ok, Inventory = pcall(require, game.ReplicatedStorage.Inventory)
if not ok or type(Inventory) ~= "table" or type(Inventory.new) ~= "function" then print("__TEST__", "require-failed") return end
local bag = Inventory.new()
local other = Inventory.new()
print("__TEST__", "stack", tostring(bag:Add("Wood", 5)), tostring(bag:Add("Wood", 2)), bag:Count("Wood"), other:Count("Wood"))
print("__TEST__", "remove", tostring(bag:Remove("Wood", 10)), bag:Count("Wood"), tostring(bag:Remove("Wood", 7)), bag:Count("Wood"))
print("__TEST__", "slots", tostring(bag:Add("A")), tostring(bag:Add("B")), tostring(bag:Add("C")), tostring(bag:Add("D")), bag:Count("A"))
print("__TEST__", "free", tostring(bag:Remove("A")), tostring(bag:Add("D", 4)), bag:Count("D"), bag:Count("Nothing"))`,
      });
      w.run(1);
      if (
        !h.check(
          h.t("The module loads and has Inventory.new", "Modül yükleniyor ve Inventory.new var"),
          line(h, w) !== undefined && line(h, w) !== "require-failed",
          h.t(
            "require() failed or Inventory.new is missing — keep return Inventory as the last line.",
            "require() başarısız ya da Inventory.new yok — son satır return Inventory olmalı.",
          ),
        )
      )
        return;
      const expect = (key: string, want: string, en: string, tr: string) => {
        const got = line(h, w, key);
        h.check(
          h.t(en, tr),
          got === `${key} ${want}`,
          h.t(`Got: ${got ?? "nothing"}`, `Gelen: ${got ?? "hiçbir şey"}`),
        );
      };
      expect(
        "stack",
        "true true 7 0",
        "Adding stacks, and every bag is separate",
        "Ekleme yığılıyor ve her çanta ayrı",
      );
      expect(
        "remove",
        "false 7 true 0",
        "Removing too many fails and changes nothing",
        "Fazlasını çıkarmak başarısız oluyor ve hiçbir şeyi değiştirmiyor",
      );
      expect(
        "slots",
        "true true true false 1",
        "A 4th different item doesn't fit",
        "4. farklı eşya sığmıyor",
      );
      expect(
        "free",
        "true true 4 0",
        "An emptied item frees its slot",
        "Biten eşya slotunu boşaltıyor",
      );
    },
  },

  {
    lessonId: "combat",
    title: "Ground slam",
    kind: "write",
    goal: "Damage every enemy near a point exactly once with a hitbox.",
    steps: [
      "Write areaAttack(center, radius, damage)",
      "Find the parts in a box at center that is radius * 2 studs wide on every side (GetPartBoundsInBox)",
      "Damage each Humanoid you find once — even if several of its parts are inside",
      "Call areaAttack(Vector3.new(0, 3, 0), 10, 25)",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Slam",
    starter:
      "local function areaAttack(center, radius, damage)\n\t\nend\n\nareaAttack(Vector3.new(0, 3, 0), 10, 25)\n",
    hints: [
      "local parts = workspace:GetPartBoundsInBox(CFrame.new(center), Vector3.one * radius * 2, OverlapParams.new())",
      'local humanoid = part.Parent and part.Parent:FindFirstChildOfClass("Humanoid")',
      "Keep local hit = {} and skip humanoids where hit[humanoid] is already true",
    ],
    solution: lua`
local function areaAttack(center, radius, damage)
    local size = Vector3.one * radius * 2
    local parts = workspace:GetPartBoundsInBox(CFrame.new(center), size, OverlapParams.new())
    local hit = {}
    for _, part in parts do
        local humanoid = part.Parent and part.Parent:FindFirstChildOfClass("Humanoid")
        if humanoid and not hit[humanoid] then
            hit[humanoid] = true
            humanoid:TakeDamage(damage)
        end
    end
end

areaAttack(Vector3.new(0, 3, 0), 10, 25)
`,
    testFooter: "if areaAttack then areaAttack(Vector3.new(0, 3, 0), 10, 10) end",
    grade(h) {
      const w = h.newWorld();
      const near1 = dummy(w, "Dummy1", new Vector3(3, 3, 0));
      const near2 = dummy(w, "Dummy2", new Vector3(-4, 3, 2));
      const far = dummy(w, "Dummy3", new Vector3(40, 3, 0));
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Slam" });
      w.run(1);
      const hp = () => [near1, near2, far].map(healthOf).join("/");
      h.check(
        h.t(
          "Both nearby dummies were hit (twice in total: 25 then 10)",
          "Yakındaki iki kukla da vuruldu (toplam iki kez: 25 sonra 10)",
        ),
        healthOf(near1) === 65 && healthOf(near2) === 65,
        h.t(
          `Health is ${hp()} — each humanoid should lose damage once per attack.`,
          `Canlar ${hp()} — her humanoid saldırı başına bir kez hasar almalı.`,
        ),
      );
      h.check(
        h.t("The faraway dummy is untouched", "Uzaktaki kukla etkilenmedi"),
        healthOf(far) === 100,
        h.t(`Its health is ${healthOf(far)}.`, `Canı ${healthOf(far)}.`),
      );
      h.check(
        h.t("It uses a hitbox query", "Bir hitbox sorgusu kullanıyor"),
        h.codeHas(/GetPartBoundsIn(Box|Radius)|GetPartsInPart/),
        h.t("Use workspace:GetPartBoundsInBox.", "workspace:GetPartBoundsInBox kullan."),
      );
    },
  },

  {
    lessonId: "npc-ai",
    title: "Guard on duty",
    kind: "write",
    goal: "A guard chases the nearest player in range and goes back to its post when nobody is near.",
    steps: [
      "workspace.Guard is an NPC (Humanoid + HumanoidRootPart). Its starting position is its post",
      "Every 0.5 seconds find the nearest player whose HumanoidRootPart is within 40 studs of the guard",
      "If there is one, MoveTo their position; otherwise MoveTo the post",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Guard",
    starter:
      'local Players = game:GetService("Players")\n\nlocal guard = workspace.Guard\nlocal humanoid = guard.Humanoid\nlocal root = guard.HumanoidRootPart\nlocal POST = root.Position\n\n',
    hints: [
      "Loop: while true do … task.wait(0.5) end",
      'For each player: local target = player.Character and player.Character:FindFirstChild("HumanoidRootPart")',
      "humanoid:MoveTo(if best then best.Position else POST)",
    ],
    solution: lua`
local Players = game:GetService("Players")

local guard = workspace.Guard
local humanoid = guard.Humanoid
local root = guard.HumanoidRootPart
local POST = root.Position
local RANGE = 40

local function nearestRoot()
    local best, bestDistance = nil, RANGE
    for _, player in Players:GetPlayers() do
        local character = player.Character
        local target = character and character:FindFirstChild("HumanoidRootPart")
        if target then
            local distance = (target.Position - root.Position).Magnitude
            if distance < bestDistance then
                best, bestDistance = target, distance
            end
        end
    end
    return best
end

while true do
    local target = nearestRoot()
    humanoid:MoveTo(if target then target.Position else POST)
    task.wait(0.5)
end
`,
    grade(h) {
      const w = h.newWorld();
      const guard = w.create("Model", { Name: "Guard" }, w.workspace);
      const groot = w.create(
        "Part",
        {
          Name: "HumanoidRootPart",
          Anchored: true,
          Size: new Vector3(2, 2, 1),
          Position: new Vector3(30, 3, 0),
        },
        guard,
      );
      w.create("Humanoid", {}, guard);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Guard" });
      w.run(0.5);
      const p = w.addPlayer("Ann");
      w.run(5);
      const flat = (a?: Vector3, b?: Vector3) =>
        a && b ? new Vector3(a.x - b.x, 0, a.z - b.z).magnitude : 999;
      const proot = rootOf(p);
      h.check(
        h.t(
          "The guard walks up to a player 30 studs away",
          "Muhafız 30 stud uzaktaki bir oyuncuya yürüyor",
        ),
        flat(posOf(groot), posOf(proot)) < 6,
        h.t(
          `The guard is ${Math.round(flat(posOf(groot), posOf(proot)))} studs from the player.`,
          `Muhafız oyuncuya ${Math.round(flat(posOf(groot), posOf(proot)))} stud uzakta.`,
        ),
      );
      proot?.setProp("CFrame", new CFrame(new Vector3(500, 3, 0)));
      w.run(5);
      h.check(
        h.t(
          "When nobody is in range, it returns to its post",
          "Menzilde kimse yokken nöbet yerine dönüyor",
        ),
        flat(posOf(groot), new Vector3(30, 3, 0)) < 3,
        h.t(
          "MoveTo the POST when no player is within 40 studs.",
          "40 stud içinde oyuncu yoksa POST'a MoveTo yap.",
        ),
      );
    },
  },

  {
    lessonId: "quests",
    title: "Quest tracker",
    kind: "write",
    goal: "Track quest progress from game events, finish each quest once and pay its reward.",
    steps: [
      "report(eventName, amount) adds amount (1 if missing) to every unfinished quest with that Event, never going past its Goal",
      "When a quest reaches its Goal, print Quest complete: <Text> and add its Reward to coins — only once",
      'Keep progress in progress[quest.Id]. Then call report("CoinCollected", 4) three times and print coins (50)',
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Quests",
    starter: lua`
local QUESTS = {
    { Id = "Coins10", Text = "Collect 10 coins", Event = "CoinCollected", Goal = 10, Reward = 50 },
    { Id = "Zombies3", Text = "Defeat 3 zombies", Event = "ZombieDefeated", Goal = 3, Reward = 100 },
}

local progress = {}
local coins = 0

local function report(eventName, amount)

end
`,
    hints: [
      "for _, quest in QUESTS do local current = progress[quest.Id] or 0 … end",
      "if quest.Event == eventName and current < quest.Goal then current = math.min(quest.Goal, current + (amount or 1)) …",
      'progress[quest.Id] = current — and if current == quest.Goal then print("Quest complete: " .. quest.Text) coins += quest.Reward end',
    ],
    solution: lua`
local QUESTS = {
    { Id = "Coins10", Text = "Collect 10 coins", Event = "CoinCollected", Goal = 10, Reward = 50 },
    { Id = "Zombies3", Text = "Defeat 3 zombies", Event = "ZombieDefeated", Goal = 3, Reward = 100 },
}

local progress = {}
local coins = 0

local function report(eventName, amount)
    for _, quest in QUESTS do
        local current = progress[quest.Id] or 0
        if quest.Event == eventName and current < quest.Goal then
            current = math.min(quest.Goal, current + (amount or 1))
            progress[quest.Id] = current
            if current == quest.Goal then
                print("Quest complete: " .. quest.Text)
                coins += quest.Reward
            end
        end
    end
end

for _ = 1, 3 do
    report("CoinCollected", 4)
end
print(coins)
`,
    testFooter: lua`
if report then
    report("ZombieDefeated")
    report("ZombieDefeated", 5)
    report("ZombieDefeated")
    report("Nothing")
    print("__TEST__", coins, progress.Zombies3, progress.Coins10)
end
`,
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Quests" });
      w.run(1);
      const coinsDone = {
        en: "Quest complete: Collect 10 coins",
        tr: "Görev tamamlandı: 10 coin topla",
      };
      const zombiesDone = {
        en: "Quest complete: Defeat 3 zombies",
        tr: "Görev tamamlandı: 3 zombi yen",
      };
      const lines = h.prints(w);
      const times = (s: { en: string; tr: string }) => lines.filter((l) => h.said(l, s)).length;
      h.check(
        h.t(
          '"Quest complete: Collect 10 coins" is printed exactly once',
          '"Quest complete: Collect 10 coins" tam bir kez yazdırılıyor',
        ),
        times(coinsDone) === 1,
        h.t(`It was printed ${times(coinsDone)} times.`, `${times(coinsDone)} kez yazdırıldı.`),
      );
      h.expectPrinted("50");
      const got = line(h, w);
      h.check(
        h.t(
          "Progress stops at the Goal and every reward is paid once (150 coins, 3/3, 10/10)",
          "İlerleme Goal'da duruyor ve her ödül bir kez ödeniyor (150 coin, 3/3, 10/10)",
        ),
        got === "150 3 10",
        h.t(
          `coins, Zombies3, Coins10 were: ${got ?? "nothing"}`,
          `coins, Zombies3, Coins10: ${got ?? "hiçbir şey"}`,
        ),
      );
      h.check(
        h.t("The zombie quest completes once too", "Zombi görevi de bir kez tamamlanıyor"),
        times(zombiesDone) === 1,
        h.t(`It was printed ${times(zombiesDone)} times.`, `${times(zombiesDone)} kez yazdırıldı.`),
      );
    },
  },

  {
    lessonId: "wave-spawner",
    title: "Three waves",
    kind: "write",
    goal: "Run three waves of zombies, each waiting until the last one is cleared.",
    steps: [
      "runWave(wave) clones ServerStorage.Zombie wave * 2 times into workspace.Enemies",
      "Then it waits (with task.wait) until workspace.Enemies is empty and prints Wave <n> cleared!",
      "Run waves 1, 2 and 3 in order — a wave never starts before the last one is cleared",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Waves",
    starter:
      'local ServerStorage = game:GetService("ServerStorage")\nlocal template = ServerStorage.Zombie\nlocal enemies = workspace.Enemies\n\n',
    hints: [
      "for _ = 1, wave * 2 do template:Clone().Parent = enemies end",
      "while #enemies:GetChildren() > 0 do task.wait(0.5) end",
      `print(${BT}Wave {wave} cleared!${BT}) — and for wave = 1, 3 do runWave(wave) end`,
    ],
    solution: lua`
local ServerStorage = game:GetService("ServerStorage")
local template = ServerStorage.Zombie
local enemies = workspace.Enemies

local function runWave(wave)
    for _ = 1, wave * 2 do
        template:Clone().Parent = enemies
    end
    while #enemies:GetChildren() > 0 do
        task.wait(0.5)
    end
    print(${BT}Wave {wave} cleared!${BT})
end

for wave = 1, 3 do
    runWave(wave)
end
`,
    grade(h) {
      const w = h.newWorld();
      const zombie = w.create("Model", { Name: "Zombie" }, w.service("ServerStorage"));
      w.create("Humanoid", {}, zombie);
      w.create("Folder", { Name: "Enemies" }, w.workspace);
      w.addScript({
        name: "Players",
        parent: w.service("ServerScriptService"),
        source: `local enemies = workspace.Enemies
local total, maxAlive = 0, 0
enemies.ChildAdded:Connect(function(z)
  total += 1
  maxAlive = math.max(maxAlive, #enemies:GetChildren())
  task.delay(1, function() z:Destroy() end)
end)
task.delay(20, function() print("__TEST__", total, maxAlive) end)`,
      });
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Waves" });
      w.run(22);
      const lines = h.prints(w);
      const at = (n: number) =>
        lines.findIndex((l) =>
          h.said(l, { en: `Wave ${n} cleared!`, tr: `Dalga ${n} temizlendi!` }),
        );
      h.check(
        h.t(
          "Prints Wave 1, 2 and 3 cleared! in order",
          "Sırayla Wave 1, 2 ve 3 cleared! yazdırıyor",
        ),
        at(1) >= 0 && at(2) > at(1) && at(3) > at(2),
        h.t(
          `The Output shows: ${lines.join(", ") || "nothing"}`,
          `Output'ta yazanlar: ${lines.join(", ") || "hiçbir şey"}`,
        ),
      );
      const got = line(h, w);
      h.check(
        h.t(
          "12 zombies in total, never more than 6 at once",
          "Toplam 12 zombi, aynı anda asla 6'dan fazla değil",
        ),
        got === "12 6",
        h.t(
          `Spawned / most at once: ${got ?? "nothing"} — wait for each wave to be cleared before the next.`,
          `Çıkan / aynı anda en çok: ${got ?? "hiçbir şey"} — sıradakinden önce her dalganın temizlenmesini bekle.`,
        ),
      );
      h.check(
        h.t("The template stays in ServerStorage", "Şablon ServerStorage'da kalıyor"),
        zombie.parent === w.service("ServerStorage"),
        h.t("Clone the template instead of moving it.", "Şablonu taşımak yerine kopyala."),
      );
    },
  },

  // ================================================================ 14 · Polish & feel
  {
    lessonId: "ui-layout",
    title: "Shop list",
    kind: "write",
    goal: "Build a shop list that fits every screen and arranges itself.",
    steps: [
      "Create a ScrollingFrame named ShopList in the ScreenGui, sized UDim2.fromScale(0.4, 0.6)",
      "Put a UIListLayout in it",
      "For every item in ITEMS add a TextButton with the text <name> - <price> (like Sword - 100) and LayoutOrder = its position",
    ],
    scriptKind: "LocalScript",
    location: "StarterGui › ShopGui › LocalScript",
    starter:
      'local gui = script.Parent\n\nlocal ITEMS = { { "Sword", 100 }, { "Bow", 60 }, { "Potion", 25 } }\n\n',
    hints: [
      'local list = Instance.new("ScrollingFrame") — then Name, Size = UDim2.fromScale(0.4, 0.6), Parent = gui',
      'Instance.new("UIListLayout").Parent = list',
      'for i, item in ITEMS do … button.Text = item[1] .. " - " .. item[2] … button.LayoutOrder = i … end',
    ],
    solution: lua`
local gui = script.Parent

local ITEMS = { { "Sword", 100 }, { "Bow", 60 }, { "Potion", 25 } }

local list = Instance.new("ScrollingFrame")
list.Name = "ShopList"
list.Size = UDim2.fromScale(0.4, 0.6)
list.Parent = gui

local layout = Instance.new("UIListLayout")
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = list

for i, item in ITEMS do
    local button = Instance.new("TextButton")
    button.Text = item[1] .. " - " .. item[2]
    button.LayoutOrder = i
    button.Parent = list
end
`,
    grade(h) {
      const run = (code?: string) => {
        const w = h.newWorld();
        const gui = w.create("ScreenGui", { Name: "ShopGui" }, w.service("StarterGui"));
        h.addStudentScript(w, gui, { name: "LocalScript", code });
        w.run(0.5);
        const p = w.addPlayer("Ann");
        w.run(1.5);
        return p.findFirstChild("PlayerGui")?.findFirstChild("ShopGui")?.findFirstChild("ShopList");
      };
      const list = run();
      if (
        !h.check(
          h.t("There is a ScrollingFrame named ShopList", "ShopList adında bir ScrollingFrame var"),
          list?.className === "ScrollingFrame",
          h.t(
            'Create it with Instance.new("ScrollingFrame") and Name = "ShopList".',
            'Instance.new("ScrollingFrame") ile oluştur ve Name = "ShopList" yap.',
          ),
        )
      )
        return;
      const size = list!.props.get("Size") as UDim2;
      h.check(
        h.t(
          "It's sized with Scale (0.4, 0.6) and no pixels",
          "Scale ile boyutlandırılmış (0.4, 0.6), piksel yok",
        ),
        Math.abs(size.x.scale - 0.4) < 1e-6 &&
          Math.abs(size.y.scale - 0.6) < 1e-6 &&
          size.x.offset === 0 &&
          size.y.offset === 0,
        h.t("Use UDim2.fromScale(0.4, 0.6).", "UDim2.fromScale(0.4, 0.6) kullan."),
      );
      h.check(
        h.t("It has a UIListLayout", "Bir UIListLayout'u var"),
        list!.children.some((c) => c.className === "UIListLayout"),
        h.t("Parent a UIListLayout to ShopList.", "ShopList'e bir UIListLayout koy."),
      );
      const buttons = (l: Instance | undefined) =>
        (l?.children ?? [])
          .filter((c) => c.className === "TextButton")
          .map((b) => `${b.props.get("LayoutOrder")}:${b.props.get("Text")}`)
          .sort()
          .join(", ");
      h.check(
        h.t(
          "One button per item with the right text and order",
          "Her eşya için doğru metin ve sırayla bir buton",
        ),
        buttons(list) === "1:Sword - 100, 2:Bow - 60, 3:Potion - 25",
        h.t(`Buttons: ${buttons(list) || "none"}`, `Butonlar: ${buttons(list) || "yok"}`),
      );
      const more = variant(h.code, /\{ "Potion", 25 \}/, '{ "Potion", 25 }, { "Shield", 75 }');
      const list2 = more ? run(more) : undefined;
      h.check(
        h.t(
          "The buttons come from ITEMS (a 4th item adds a 4th button)",
          "Butonlar ITEMS'tan geliyor (4. eşya 4. butonu ekliyor)",
        ),
        Boolean(more) && buttons(list2).includes("4:Shield - 75"),
        h.t(
          "Loop over ITEMS instead of writing each button.",
          "Her butonu yazmak yerine ITEMS üzerinde dön.",
        ),
      );
    },
  },

  {
    lessonId: "sounds",
    title: "Jukebox",
    kind: "write",
    goal: "Play looping music through a SoundGroup and let players switch it on and off.",
    steps: [
      "Create a SoundGroup named Music (Volume 0.5) in SoundService",
      'Create a Sound named Theme in SoundService with SoundId "rbxassetid://1837849285", Looped = true and SoundGroup = the Music group, and play it',
      "When the jukebox's ProximityPrompt is triggered: stop the music if it's playing, otherwise play it",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Jukebox",
    starter:
      'local SoundService = game:GetService("SoundService")\nlocal prompt = workspace.Jukebox.ProximityPrompt\n\n',
    hints: [
      'local music = Instance.new("SoundGroup") — Name, Volume = 0.5, Parent = SoundService',
      'local theme = Instance.new("Sound") — Name, SoundId, Looped, SoundGroup = music, Parent — then theme:Play()',
      "prompt.Triggered:Connect(function() if theme.IsPlaying then theme:Stop() else theme:Play() end end)",
    ],
    solution: lua`
local SoundService = game:GetService("SoundService")
local prompt = workspace.Jukebox.ProximityPrompt

local music = Instance.new("SoundGroup")
music.Name = "Music"
music.Volume = 0.5
music.Parent = SoundService

local theme = Instance.new("Sound")
theme.Name = "Theme"
theme.SoundId = "rbxassetid://1837849285"
theme.Looped = true
theme.SoundGroup = music
theme.Parent = SoundService
theme:Play()

prompt.Triggered:Connect(function()
    if theme.IsPlaying then
        theme:Stop()
    else
        theme:Play()
    end
end)
`,
    grade(h) {
      const w = h.newWorld();
      const box = w.create(
        "Part",
        { Name: "Jukebox", Anchored: true, Position: new Vector3(0, 3, 8) },
        w.workspace,
      );
      const prompt = w.create("ProximityPrompt", {}, box);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Jukebox" });
      w.run(0.5);
      const p = w.addPlayer("Ann");
      w.run(1);
      const ss = w.service("SoundService");
      const group = ss.findFirstChild("Music");
      const theme = ss.findFirstChild("Theme");
      h.check(
        h.t(
          "SoundService has a Music SoundGroup at volume 0.5",
          "SoundService'te 0.5 seste bir Music SoundGroup'u var",
        ),
        group?.className === "SoundGroup" && group.props.get("Volume") === 0.5,
        h.t(
          'Create it with Instance.new("SoundGroup").',
          'Instance.new("SoundGroup") ile oluştur.',
        ),
      );
      h.check(
        h.t(
          "Theme loops, uses the Music group and is playing",
          "Theme döngüde, Music grubunu kullanıyor ve çalıyor",
        ),
        theme?.className === "Sound" &&
          theme.getProp("Looped") === true &&
          theme.getProp("SoundGroup") === group &&
          theme.props.get("Playing") === true &&
          theme.getProp("SoundId") === "rbxassetid://1837849285",
        h.t(
          "Check Name, SoundId, Looped, SoundGroup and :Play().",
          "Name, SoundId, Looped, SoundGroup ve :Play()'i kontrol et.",
        ),
      );
      w.trigger(prompt, p);
      w.run(0.5);
      const off = theme?.props.get("Playing") === false;
      w.trigger(prompt, p);
      w.run(0.5);
      h.check(
        h.t(
          "The prompt switches the music off and on again",
          "Prompt müziği kapatıp tekrar açıyor",
        ),
        off && theme?.props.get("Playing") === true,
        h.t(
          "In Triggered: Stop if IsPlaying, otherwise Play.",
          "Triggered'da: IsPlaying ise Stop, değilse Play.",
        ),
      );
    },
  },

  {
    lessonId: "animations",
    title: "Emote remote",
    kind: "write",
    goal: "Play an emote on a player's character when they ask for one — but only real emotes.",
    steps: [
      "PlayEmote:FireServer(emoteName) asks for an emote",
      "Only accept names that are strings and exist in EMOTES",
      "Load an Animation with that AnimationId onto the character's Animator and play it",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Emotes",
    starter: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local playEmote = ReplicatedStorage.PlayEmote

local EMOTES = {
    Wave = "rbxassetid://507770239",
    Dance = "rbxassetid://507771019",
}
`,
    hints: [
      'playEmote.OnServerEvent:Connect(function(player, emoteName) if typeof(emoteName) ~= "string" or not EMOTES[emoteName] then return end … end)',
      'local animator = player.Character.Humanoid:FindFirstChildOfClass("Animator")',
      'local animation = Instance.new("Animation"); animation.AnimationId = EMOTES[emoteName]; animator:LoadAnimation(animation):Play()',
    ],
    solution: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local playEmote = ReplicatedStorage.PlayEmote

local EMOTES = {
    Wave = "rbxassetid://507770239",
    Dance = "rbxassetid://507771019",
}

playEmote.OnServerEvent:Connect(function(player, emoteName)
    if typeof(emoteName) ~= "string" or not EMOTES[emoteName] then
        return
    end
    local humanoid = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
    local animator = humanoid and humanoid:FindFirstChildOfClass("Animator")
    if not animator then
        return
    end
    local animation = Instance.new("Animation")
    animation.AnimationId = EMOTES[emoteName]
    animator:LoadAnimation(animation):Play()
end)
`,
    grade(h) {
      const w = h.newWorld();
      const remote = w.create("RemoteEvent", { Name: "PlayEmote" }, w.service("ReplicatedStorage"));
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Emotes" });
      w.run(0.5);
      const p = w.addPlayer("Ann");
      w.run(2);
      const animator = character(p)?.findFirstChild("Humanoid")?.findFirstChild("Animator");
      const tracks = () => (animator?.state.tracks as Instance[] | undefined) ?? [];
      const playing = () =>
        tracks()
          .filter((t) => t.props.get("IsPlaying") === true)
          .map((t) => (t.props.get("Animation") as Instance | undefined)?.props.get("AnimationId"));
      w.fireServer(remote, p, "Wave");
      w.run(0.5);
      h.check(
        h.t('"Wave" plays the wave animation', '"Wave" el sallama animasyonunu oynatıyor'),
        playing().includes("rbxassetid://507770239"),
        h.t(
          "Load the animation onto the character's Animator and :Play() it.",
          "Animasyonu karakterin Animator'üne yükle ve :Play() ile oynat.",
        ),
      );
      const before = tracks().length;
      w.fireServer(remote, p, "Fly");
      w.fireServer(remote, p, 123);
      w.fireServer(remote, p, new LuaTable());
      w.run(0.5);
      h.check(
        h.t(
          "Unknown names, numbers and tables are ignored",
          "Bilinmeyen isimler, sayılar ve tablolar yok sayılıyor",
        ),
        tracks().length === before,
        h.t(
          'Check typeof(emoteName) == "string" and EMOTES[emoteName] first.',
          'Önce typeof(emoteName) == "string" ve EMOTES[emoteName] kontrol et.',
        ),
      );
      w.fireServer(remote, p, "Dance");
      w.run(0.5);
      h.check(
        h.t('"Dance" plays the dance animation', '"Dance" dans animasyonunu oynatıyor'),
        playing().includes("rbxassetid://507771019"),
        h.t(
          "Use EMOTES[emoteName] as the AnimationId.",
          "AnimationId olarak EMOTES[emoteName] kullan.",
        ),
      );
    },
  },

  {
    lessonId: "camera",
    title: "Intro cutscene",
    kind: "write",
    goal: "Fly the camera in for an intro, then hand it back to the player.",
    steps: [
      "Set the camera's CameraType to Scriptable",
      "Put it at CFrame.lookAt(Vector3.new(0, 50, 50), Vector3.zero)",
      "Tween its CFrame over 2 seconds to CFrame.lookAt(Vector3.new(0, 10, 20), Vector3.zero) and wait for it to finish",
      "Set CameraType back to Custom and print Cutscene over",
    ],
    scriptKind: "LocalScript",
    location: "StarterPlayer › StarterPlayerScripts › LocalScript",
    starter:
      'local TweenService = game:GetService("TweenService")\nlocal camera = workspace.CurrentCamera\n\n',
    hints: [
      "camera.CameraType = Enum.CameraType.Scriptable",
      "local fly = TweenService:Create(camera, TweenInfo.new(2), { CFrame = … }) — fly:Play() and fly.Completed:Wait()",
      'camera.CameraType = Enum.CameraType.Custom and print("Cutscene over")',
    ],
    solution: lua`
local TweenService = game:GetService("TweenService")
local camera = workspace.CurrentCamera

camera.CameraType = Enum.CameraType.Scriptable
camera.CFrame = CFrame.lookAt(Vector3.new(0, 50, 50), Vector3.zero)

local fly = TweenService:Create(camera, TweenInfo.new(2), {
    CFrame = CFrame.lookAt(Vector3.new(0, 10, 20), Vector3.zero),
})
fly:Play()
fly.Completed:Wait()

camera.CameraType = Enum.CameraType.Custom
print("Cutscene over")
`,
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("StarterPlayer").findFirstChild("StarterPlayerScripts")!, {
        name: "LocalScript",
      });
      w.run(0.5);
      w.addPlayer("Ann");
      w.run(1);
      const camera = w.workspace.props.get("CurrentCamera") as Instance | undefined;
      const type = () => (camera?.props.get("CameraType") as EnumItem | undefined)?.name;
      h.check(
        h.t(
          "During the cutscene the camera is Scriptable",
          "Ara sahne sırasında kamera Scriptable",
        ),
        type() === "Scriptable",
        h.t(`CameraType is ${type() ?? "unknown"}.`, `CameraType şu an ${type() ?? "bilinmiyor"}.`),
      );
      w.run(3);
      const pos = (camera?.props.get("CFrame") as CFrame | undefined)?.p;
      h.check(
        h.t("It ends at (0, 10, 20)", "(0, 10, 20)'de bitiyor"),
        pos !== undefined && pos.sub(new Vector3(0, 10, 20)).magnitude < 0.5,
        h.t(
          "Tween CFrame to CFrame.lookAt(Vector3.new(0, 10, 20), Vector3.zero).",
          "CFrame'i CFrame.lookAt(Vector3.new(0, 10, 20), Vector3.zero)'ya tween'le.",
        ),
      );
      h.check(
        h.t("The camera is handed back (Custom)", "Kamera geri verildi (Custom)"),
        type() === "Custom",
        h.t(
          "Set CameraType = Enum.CameraType.Custom at the end.",
          "Sonda CameraType = Enum.CameraType.Custom yap.",
        ),
      );
      h.expectPrinted({ en: "Cutscene over", tr: "Ara sahne bitti" });
    },
  },

  {
    lessonId: "day-night",
    title: "Street lights",
    kind: "write",
    goal: "Turn the lamps on at night and off during the day.",
    steps: [
      "workspace.Lamps is a folder of lamp parts",
      "Write updateLights(): at night (ClockTime 18 or later, or before 6) every lamp's Material is Neon, otherwise Plastic",
      "Call it once at the start and every time Lighting.ClockTime changes",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › StreetLights",
    starter: 'local Lighting = game:GetService("Lighting")\nlocal lamps = workspace.Lamps\n\n',
    hints: [
      "local night = Lighting.ClockTime >= 18 or Lighting.ClockTime < 6",
      "for _, lamp in lamps:GetChildren() do lamp.Material = if night then Enum.Material.Neon else Enum.Material.Plastic end",
      'Lighting:GetPropertyChangedSignal("ClockTime"):Connect(updateLights)',
    ],
    solution: lua`
local Lighting = game:GetService("Lighting")
local lamps = workspace.Lamps

local function updateLights()
    local night = Lighting.ClockTime >= 18 or Lighting.ClockTime < 6
    for _, lamp in lamps:GetChildren() do
        lamp.Material = if night then Enum.Material.Neon else Enum.Material.Plastic
    end
end

updateLights()
Lighting:GetPropertyChangedSignal("ClockTime"):Connect(updateLights)
`,
    grade(h) {
      const w = h.newWorld();
      const folder = w.create("Folder", { Name: "Lamps" }, w.workspace);
      const lamps = [0, 1, 2].map((i) =>
        w.create(
          "Part",
          { Name: `Lamp${i}`, Anchored: true, Position: new Vector3(i * 6, 6, -10) },
          folder,
        ),
      );
      const lighting = w.service("Lighting");
      lighting.setProp("ClockTime", 20);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "StreetLights" });
      w.run(0.5);
      const all = () => {
        const names = lamps.map((l) => (l.props.get("Material") as EnumItem).name);
        return names.every((n) => n === names[0]) ? names[0] : names.join("/");
      };
      h.check(
        h.t("At the start (20:00) the lamps are Neon", "Başta (20:00) lambalar Neon"),
        all() === "Neon",
        h.t(
          `The lamps are ${all()} — call updateLights() once at the start.`,
          `Lambalar ${all()} — başta bir kez updateLights() çağır.`,
        ),
      );
      const at = (hour: number) => {
        lighting.setProp("ClockTime", hour);
        w.run(0.3);
        return all();
      };
      const noon = at(12);
      const morning = at(7);
      const late = at(3);
      h.check(
        h.t(
          "They follow the time: 12 off, 7 off, 3 on",
          "Saate uyuyorlar: 12 kapalı, 7 kapalı, 3 açık",
        ),
        noon === "Plastic" && morning === "Plastic" && late === "Neon",
        h.t(
          `At 12, 7 and 3 they were ${noon}, ${morning}, ${late}.`,
          `12, 7 ve 3'te: ${noon}, ${morning}, ${late}.`,
        ),
      );
    },
  },

  // ================================================================ 15 · Ship your game
  {
    lessonId: "architecture",
    title: "The loader",
    kind: "write",
    goal: "Write the one Script that requires every service and then starts them.",
    steps: [
      "ServerScriptService.Services holds ModuleScripts (and maybe other things)",
      "First require every ModuleScript in it",
      "Then call Start on every service that has one (with task.spawn) — only after all of them were required",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Main",
    starter: 'local ServerScriptService = game:GetService("ServerScriptService")\n\n',
    hints: [
      'for _, module in ServerScriptService.Services:GetChildren() do if module:IsA("ModuleScript") then … end end',
      "Store each one: services[module.Name] = require(module)",
      "A second loop: for _, service in services do if service.Start then task.spawn(service.Start) end end",
    ],
    solution: lua`
local ServerScriptService = game:GetService("ServerScriptService")

local services = {}
for _, module in ServerScriptService.Services:GetChildren() do
    if module:IsA("ModuleScript") then
        services[module.Name] = require(module)
    end
end

for _, service in services do
    if service.Start then
        task.spawn(service.Start)
    end
end
`,
    grade(h) {
      const w = h.newWorld();
      const folder = w.create("Folder", { Name: "Services" }, w.service("ServerScriptService"));
      const mod = (name: string, start: boolean) =>
        w.addScript({
          name,
          kind: "ModuleScript",
          parent: folder,
          source: `local M = {}\nprint("__TEST__", "require", "${name}")\n${start ? `function M.Start() print("__TEST__", "start", "${name}") end\n` : ""}return M`,
        });
      mod("DataService", true);
      mod("ShopService", false);
      mod("RoundService", true);
      w.create("Folder", { Name: "Helpers" }, folder);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Main" });
      w.run(1);
      const rows = h.testValues(w).map((r) => r.join(" "));
      const required = ["DataService", "ShopService", "RoundService"].every((n) =>
        rows.includes(`require ${n}`),
      );
      h.check(
        h.t(
          "Every ModuleScript in Services is required",
          "Services'teki her ModuleScript require ediliyor",
        ),
        required,
        h.t(
          `What happened: ${rows.join(", ") || "nothing"}`,
          `Olanlar: ${rows.join(", ") || "hiçbir şey"}`,
        ),
      );
      const starts = rows.filter((r) => r.startsWith("start ")).sort();
      h.check(
        h.t(
          "Services with Start are started once each",
          "Start'ı olan servisler birer kez başlatılıyor",
        ),
        starts.join(",") === "start DataService,start RoundService",
        h.t(
          `Started: ${starts.join(", ") || "none"}`,
          `Başlatılanlar: ${starts.join(", ") || "yok"}`,
        ),
      );
      const firstStart = rows.findIndex((r) => r.startsWith("start "));
      const lastRequire = rows.map((r) => r.startsWith("require ")).lastIndexOf(true);
      h.check(
        h.t(
          "Everything is required before anything starts",
          "Hiçbir şey başlamadan önce her şey require ediliyor",
        ),
        firstStart > lastRequire,
        h.t(
          "Use two loops: first require all, then start all.",
          "İki döngü kullan: önce hepsini require et, sonra hepsini başlat.",
        ),
      );
    },
  },

  {
    lessonId: "performance",
    title: "Plug the leak",
    kind: "fix",
    goal: "Every player gets a Heartbeat connection that's never cleaned up. Fix the leak.",
    steps: [
      "Keep the trail working while the player is in the game",
      "When a player leaves, disconnect their connection",
      "…and remove their entry from trails",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Trails",
    starter: lua`
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local trails = {} -- [player] = their Heartbeat connection

Players.PlayerAdded:Connect(function(player)
    trails[player] = RunService.Heartbeat:Connect(function()
        -- update the player's trail effect here
    end)
end)
`,
    hints: [
      "Players.PlayerRemoving:Connect(function(player) … end)",
      "local connection = trails[player]; if connection then connection:Disconnect() end",
      "trails[player] = nil",
    ],
    solution: lua`
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local trails = {} -- [player] = their Heartbeat connection

Players.PlayerAdded:Connect(function(player)
    trails[player] = RunService.Heartbeat:Connect(function()
        -- update the player's trail effect here
    end)
end)

Players.PlayerRemoving:Connect(function(player)
    local connection = trails[player]
    if connection then
        connection:Disconnect()
    end
    trails[player] = nil
end)
`,
    testFooter: lua`
local __conn
game.Players.PlayerAdded:Connect(function(p)
    task.wait(0.2)
    __conn = trails[p]
end)
task.delay(1.5, function()
    local n = 0
    for _ in trails do
        n += 1
    end
    print("__TEST__", "mid", n, __conn ~= nil and __conn.Connected)
end)
task.delay(4, function()
    local n = 0
    for _ in trails do
        n += 1
    end
    print("__TEST__", "end", n, __conn ~= nil and __conn.Connected)
end)
`,
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Trails" });
      w.run(0.5);
      const p = w.addPlayer("Ann");
      w.run(1.5);
      w.removePlayer(p);
      w.run(3);
      h.check(
        h.t("While playing, the trail is connected", "Oynarken iz bağlı"),
        line(h, w, "mid") === "mid 1 true",
        h.t("Keep the PlayerAdded part working.", "PlayerAdded kısmını çalışır tut."),
      );
      const end = line(h, w, "end");
      h.check(
        h.t("After leaving, the connection is disconnected", "Çıktıktan sonra bağlantı kesiliyor"),
        end?.endsWith("false") === true,
        h.t(
          "Call :Disconnect() on it in PlayerRemoving.",
          "PlayerRemoving'de onda :Disconnect() çağır.",
        ),
      );
      h.check(
        h.t(
          "…and the player's entry is gone from trails",
          "…ve oyuncunun kaydı trails'ten silindi",
        ),
        end?.startsWith("end 0") === true,
        h.t("Set trails[player] = nil.", "trails[player] = nil yap."),
      );
    },
  },

  {
    lessonId: "monetization",
    title: "The store",
    kind: "write",
    goal: "Give VIP to pass owners and sell coin products safely.",
    steps: [
      'When a player joins, if they own the game pass VIP_PASS_ID (check with pcall), set their "VIP" attribute to true',
      "In ProcessReceipt, add PRODUCTS[receipt.ProductId] coins to the buyer's leaderstats.Coins and return PurchaseGranted",
      "If the player isn't in the game or the product is unknown, return NotProcessedYet",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Store",
    starter: lua`
local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")

local VIP_PASS_ID = 333
local PRODUCTS = {
    [111] = 100,
    [222] = 500,
}
`,
    hints: [
      "local ok, owns = pcall(MarketplaceService.UserOwnsGamePassAsync, MarketplaceService, player.UserId, VIP_PASS_ID)",
      "MarketplaceService.ProcessReceipt = function(receipt) local player = Players:GetPlayerByUserId(receipt.PlayerId) … end",
      "return Enum.ProductPurchaseDecision.PurchaseGranted (or .NotProcessedYet)",
    ],
    solution: lua`
local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")

local VIP_PASS_ID = 333
local PRODUCTS = {
    [111] = 100,
    [222] = 500,
}

Players.PlayerAdded:Connect(function(player)
    local ok, owns = pcall(
        MarketplaceService.UserOwnsGamePassAsync,
        MarketplaceService,
        player.UserId,
        VIP_PASS_ID
    )
    if ok and owns then
        player:SetAttribute("VIP", true)
    end
end)

MarketplaceService.ProcessReceipt = function(receipt)
    local player = Players:GetPlayerByUserId(receipt.PlayerId)
    local coins = PRODUCTS[receipt.ProductId]
    if not player or not coins then
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end
    player.leaderstats.Coins.Value += coins
    return Enum.ProductPurchaseDecision.PurchaseGranted
end
`,
    grade(h) {
      const w = h.newWorld();
      addCoinsFixture(w, 0);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Store" });
      w.run(0.5);
      const ann = w.addPlayer("Ann");
      w.grantGamePass(ann, 333);
      const bob = w.addPlayer("Bob");
      w.run(2);
      h.check(
        h.t(
          "The pass owner gets the VIP attribute, others don't",
          "Pass sahibi VIP attribute'unu alıyor, diğerleri almıyor",
        ),
        ann.attributes.get("VIP") === true && bob.attributes.get("VIP") !== true,
        h.t(
          `VIP: Ann ${String(ann.attributes.get("VIP") ?? "nil")}, Bob ${String(bob.attributes.get("VIP") ?? "nil")}`,
          `VIP: Ann ${String(ann.attributes.get("VIP") ?? "nil")}, Bob ${String(bob.attributes.get("VIP") ?? "nil")}`,
        ),
      );
      const last = () => w.receipts.at(-1)?.decision;
      w.purchaseProduct(ann, 111);
      w.run(0.5);
      const first = last();
      w.purchaseProduct(ann, 222);
      w.run(0.5);
      h.check(
        h.t(
          "Buying 111 then 222 gives Ann 600 coins and PurchaseGranted",
          "111 sonra 222 almak Ann'e 600 coin ve PurchaseGranted veriyor",
        ),
        coinsOf(ann) === 600 && first === "PurchaseGranted" && last() === "PurchaseGranted",
        h.t(
          `Ann has ${coinsOf(ann)} coins; ProcessReceipt answered ${first ?? "nothing"} and ${last() ?? "nothing"}.`,
          `Ann'in ${coinsOf(ann)} coini var; ProcessReceipt ${first ?? "hiçbir şey"} ve ${last() ?? "hiçbir şey"} döndürdü.`,
        ),
      );
      w.purchaseProduct(bob, 999);
      w.run(0.5);
      h.check(
        h.t(
          "An unknown product gives nothing and returns NotProcessedYet",
          "Bilinmeyen bir ürün hiçbir şey vermiyor ve NotProcessedYet döndürüyor",
        ),
        coinsOf(bob) === 0 && last() === "NotProcessedYet",
        h.t(
          `Bob has ${coinsOf(bob)} coins; the answer was ${last() ?? "nothing"}.`,
          `Bob'un ${coinsOf(bob)} coini var; cevap ${last() ?? "hiçbir şey"} oldu.`,
        ),
      );
    },
  },

  {
    lessonId: "teams",
    title: "Fair teams",
    kind: "write",
    goal: "Create two teams and keep them balanced as players join.",
    steps: [
      'Create a Team "Red" (BrickColor "Bright red") and a Team "Blue" (BrickColor "Bright blue") in the Teams service, with AutoAssignable = false',
      "Put every new player on the team with fewer players (Red when it's a tie)",
      "Print <name> joined team <team> — for example Ann joined team Red",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › TeamSetup",
    starter:
      'local Teams = game:GetService("Teams")\nlocal Players = game:GetService("Players")\n\n',
    hints: [
      'local red = Instance.new("Team") — Name, TeamColor = BrickColor.new("Bright red"), AutoAssignable = false, Parent = Teams',
      "player.Team = if #red:GetPlayers() <= #blue:GetPlayers() then red else blue",
      'print(player.Name .. " joined team " .. player.Team.Name)',
    ],
    solution: lua`
local Teams = game:GetService("Teams")
local Players = game:GetService("Players")

local function makeTeam(name, color)
    local team = Instance.new("Team")
    team.Name = name
    team.TeamColor = BrickColor.new(color)
    team.AutoAssignable = false
    team.Parent = Teams
    return team
end

local red = makeTeam("Red", "Bright red")
local blue = makeTeam("Blue", "Bright blue")

Players.PlayerAdded:Connect(function(player)
    player.Team = if #red:GetPlayers() <= #blue:GetPlayers() then red else blue
    print(player.Name .. " joined team " .. player.Team.Name)
end)
`,
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "TeamSetup" });
      w.run(0.5);
      const players = ["Ann", "Bob", "Cat", "Dan"].map((n) => {
        const p = w.addPlayer(n);
        w.run(0.3);
        return p;
      });
      const teams = w.service("Teams");
      const team = (n: string) => teams.findFirstChild(n);
      const color = (n: string) =>
        (team(n)?.props.get("TeamColor") as BrickColor | undefined)?.name;
      h.check(
        h.t(
          "Teams has Red (Bright red) and Blue (Bright blue)",
          "Teams'te Red (Bright red) ve Blue (Bright blue) var",
        ),
        team("Red")?.className === "Team" &&
          team("Blue")?.className === "Team" &&
          color("Red") === "Bright red" &&
          color("Blue") === "Bright blue" &&
          team("Red")?.props.get("AutoAssignable") === false,
        h.t(
          'Create both with Instance.new("Team") in the Teams service.',
          'İkisini de Teams servisinde Instance.new("Team") ile oluştur.',
        ),
      );
      const teamOf = (p: Instance) => (p.props.get("Team") as Instance | undefined)?.name ?? "none";
      const got = players.map(teamOf).join(" ");
      h.check(
        h.t(
          "Players are balanced: Red, Blue, Red, Blue",
          "Oyuncular dengeli: Red, Blue, Red, Blue",
        ),
        got === "Red Blue Red Blue",
        h.t(`Teams in join order: ${got}`, `Giriş sırasına göre takımlar: ${got}`),
      );
      h.expectPrinted({ en: "Ann joined team Red", tr: "Ann şu takıma katıldı: Red" });
    },
  },

  {
    lessonId: "capstone",
    title: "Coin rush",
    kind: "write",
    goal: "Run a full round: spawn coins, let players collect them safely, and announce the winner.",
    steps: [
      "After 2 seconds, start a round: clone ServerStorage.Coin into workspace.Coins at every position in SPOTS",
      "A coin touched by a player's character gives that player +1 leaderstats Coins once, then disappears. Parts that aren't players do nothing",
      "After ROUND_TIME seconds, remove the coins that are left and print <name> wins with <n> coins! for the player with the most coins",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › CoinRush",
    starter: lua`
local ServerStorage = game:GetService("ServerStorage")
local Players = game:GetService("Players")

local template = ServerStorage.Coin
local folder = workspace.Coins
local ROUND_TIME = 10
local SPOTS = {
    Vector3.new(0, 3, 10),
    Vector3.new(10, 3, 10),
    Vector3.new(-10, 3, 10),
    Vector3.new(0, 3, -10),
    Vector3.new(10, 3, -10),
}
`,
    hints: [
      "local coin = template:Clone(); coin.Position = spot; coin.Parent = folder — and a local taken = false for each coin",
      "coin.Touched: local player = Players:GetPlayerFromCharacter(hit.Parent); if not player or taken then return end",
      `After task.wait(ROUND_TIME): folder:ClearAllChildren(), find the best player, print(${BT}{best.Name} wins with {bestCoins} coins!${BT})`,
    ],
    solution: lua`
local ServerStorage = game:GetService("ServerStorage")
local Players = game:GetService("Players")

local template = ServerStorage.Coin
local folder = workspace.Coins
local ROUND_TIME = 10
local SPOTS = {
    Vector3.new(0, 3, 10),
    Vector3.new(10, 3, 10),
    Vector3.new(-10, 3, 10),
    Vector3.new(0, 3, -10),
    Vector3.new(10, 3, -10),
}

local function spawnCoin(position)
    local coin = template:Clone()
    coin.Position = position
    coin.Parent = folder
    local taken = false
    coin.Touched:Connect(function(hit)
        local player = Players:GetPlayerFromCharacter(hit.Parent)
        if not player or taken then
            return
        end
        taken = true
        player.leaderstats.Coins.Value += 1
        coin:Destroy()
    end)
end

local function startRound()
    for _, spot in SPOTS do
        spawnCoin(spot)
    end
    task.wait(ROUND_TIME)
    folder:ClearAllChildren()
    local best, bestCoins = nil, -1
    for _, player in Players:GetPlayers() do
        local coins = player.leaderstats.Coins.Value
        if coins > bestCoins then
            best, bestCoins = player, coins
        end
    end
    if best then
        print(${BT}{best.Name} wins with {bestCoins} coins!${BT})
    end
end

task.wait(2)
startRound()
`,
    grade(h) {
      const w = h.newWorld();
      w.create(
        "Part",
        { Name: "Coin", Anchored: true, CanCollide: false, Size: new Vector3(2, 2, 1) },
        w.service("ServerStorage"),
      );
      const folder = w.create("Folder", { Name: "Coins" }, w.workspace);
      addCoinsFixture(w, 0);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "CoinRush" });
      w.run(0.5);
      const p = w.addPlayer("Ann");
      w.run(2.2);
      const coins = [...folder.children];
      h.check(
        h.t("5 coins appear in workspace.Coins", "workspace.Coins'te 5 coin beliriyor"),
        coins.length === 5,
        h.t(`There are ${coins.length}.`, `${coins.length} tane var.`),
      );
      for (const c of coins.slice(0, 3)) w.touchWithCharacter(c, p);
      w.run(0.2);
      if (coins[0]) w.touchWithCharacter(coins[0], p);
      w.run(0.2);
      h.check(
        h.t(
          "Touching 3 coins gives 3 coins (each only once)",
          "3 coine dokunmak 3 coin veriyor (her biri bir kez)",
        ),
        coinsOf(p) === 3,
        h.t(`Ann has ${coinsOf(p)}.`, `Ann'de ${coinsOf(p)} var.`),
      );
      const stranger = w.create("Part", { Name: "Ball", Anchored: true }, w.workspace);
      if (coins[3]) w.touch(coins[3], stranger);
      w.run(0.2);
      h.check(
        h.t(
          "A part that isn't a player can't take coins",
          "Oyuncu olmayan bir parça coin alamıyor",
        ),
        coins[3]?.parent === folder && coinsOf(p) === 3,
        h.t(
          "Use Players:GetPlayerFromCharacter(hit.Parent) and ignore nil.",
          "Players:GetPlayerFromCharacter(hit.Parent) kullan ve nil'i yok say.",
        ),
      );
      w.run(11);
      h.check(
        h.t(
          "When the round ends, the leftover coins are gone",
          "Tur bitince kalan coinler gidiyor",
        ),
        folder.children.length === 0,
        h.t(
          "Clear workspace.Coins after ROUND_TIME.",
          "ROUND_TIME'dan sonra workspace.Coins'i temizle.",
        ),
      );
      h.expectPrinted({ en: "Ann wins with 3 coins!", tr: "Ann 3 coinle kazandı!" });
    },
  },
];
