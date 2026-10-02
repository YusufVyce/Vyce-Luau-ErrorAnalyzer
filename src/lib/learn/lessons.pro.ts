/**
 * The "pro" half of the course, part 1: professional Luau, data like a pro,
 * and security. Together with lessons.pro2.ts these units take a learner
 * from "can make a game" to "can work on a real team's codebase".
 */
import { CHAPTERS, type Lesson } from "./lessonBase";

/** Code sample: drops the first newline and turns 4-space indents into tabs. */
const lua = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values)
    .replace(/^\n/, "")
    .replace(/^( {4})+/gm, (m) => "\t".repeat(m.length / 4))
    .replace(/\s+$/, "");

const BT = "`";

export const PRO_LESSONS_A: Lesson[] = [
  // ------------------------------------------------------------------ type-checking
  {
    id: "type-checking",
    chapter: CHAPTERS[9],
    title: "Types: catch bugs before they run",
    minutes: 9,
    summary:
      "Add --!strict and type annotations so Studio spots mistakes while you type — how pro teams keep big games bug-free.",
    sections: [
      {
        text: [
          "Luau is gradually typed: you can add types to variables, parameters and return values. The game runs exactly the same, but Studio's Script Analysis now underlines mistakes before you ever press Play.",
          "Put --!strict on the very first line of a script to turn full type checking on. Teams with big codebases use it in every script.",
        ],
      },
      {
        heading: "Annotating variables and functions",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
--!strict
local coins: number = 100
local playerName: string = "Ann"
local isVip: boolean = false

local function addCoins(current: number, amount: number): number
    return current + amount
end

coins = addCoins(coins, 50)
print(playerName, coins, isVip)
`,
        },
        text: [
          'A type goes after a colon. The type after a function\'s parentheses is what it returns. With these types, addCoins(coins, "50") gets a red underline: "50" is a string, not a number.',
        ],
      },
      {
        heading: "Your own types and optional values",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
--!strict
type Item = {
    name: string,
    price: number,
    rarity: string?, -- the ? means it can be nil
}

local function describe(item: Item): string
    local rarity = item.rarity or "Common"
    return ${BT}{item.name} ({rarity}) - {item.price} coins${BT}
end

local sword: Item = { name = "Sword", price = 100 }
print(describe(sword))
`,
        },
        tip: "Type errors never stop the game from running — they're warnings in Script Analysis. Fix them anyway: each one is a bug waiting to happen.",
      },
      {
        heading: "Arrays, dictionaries and unions",
        text: [
          '{ number } is an array of numbers. { [string]: number } is a dictionary from text to numbers. "Rock" | "Paper" | "Scissors" (a union) only allows those exact values.',
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
--!strict
type Move = "Rock" | "Paper" | "Scissors"

local scores: { [string]: number } = {}
local history: { Move } = {}

local function play(player: string, move: Move)
    table.insert(history, move)
    scores[player] = (scores[player] or 0) + 1
end

play("Ann", "Rock")
play("Ann", "Paper")
print(#history, scores.Ann)
`,
        },
      },
    ],
    game: {
      name: "Games made by big teams",
      text: "Studios with many scripters turn on --!strict everywhere. When someone changes what a function takes, Studio instantly underlines every script that now calls it wrong — the bug is caught in seconds instead of by players.",
    },
    tryIt: [
      "Add --!strict to a script and give every local a type.",
      "Make an Item type and a function that takes an Item.",
      "Call your function with a missing field and read the warning in Script Analysis.",
    ],
    mistake: {
      error: "TypeError: Type 'string' could not be converted into 'number'",
      code: '--!strict\nlocal coins: number = "100"',
      explain:
        'With --!strict, Studio checks every assignment. "100" in quotes is a string, not a number. Write 100 without quotes — or use tonumber() when the text comes from a player.',
    },
    quiz: {
      question: "What does rarity: string? mean in a type?",
      options: [
        "rarity is a string or nil",
        "rarity must be a question",
        "rarity is text that can never be nil",
        "rarity is a number",
      ],
      answer: 0,
      why: "The ? makes a type optional: the value can be that type or nil.",
    },
  },

  // ------------------------------------------------------------------ metatables
  {
    id: "metatables",
    chapter: CHAPTERS[9],
    title: "Metatables: teach tables new tricks",
    minutes: 10,
    summary:
      "Give tables default values, custom math and protection — the engine room behind classes and many pro patterns.",
    sections: [
      {
        text: [
          "Every table can have a metatable: a second table full of special keys (metamethods) that change how the first one behaves.",
          "You already met __index in the classes lesson. There are many more: __add for +, __eq for ==, __lt for <, __tostring for printing, __newindex to watch new keys and __call to call a table like a function.",
        ],
      },
      {
        heading: "Default values with __index",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local defaults = { WalkSpeed = 16, JumpPower = 50, Music = true }
local settings = setmetatable({ Music = false }, { __index = defaults })

print(settings.Music)     -- false: the table has it
print(settings.WalkSpeed) -- 16: missing, so it comes from defaults
`,
        },
      },
      {
        heading: "Custom math and printing",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local Money = {}
Money.__index = Money

function Money.new(amount)
    return setmetatable({ amount = amount }, Money)
end

Money.__add = function(a, b)
    return Money.new(a.amount + b.amount)
end
Money.__eq = function(a, b)
    return a.amount == b.amount
end
Money.__tostring = function(m)
    return "$" .. m.amount
end

local wallet = Money.new(50) + Money.new(25)
print(wallet)                  -- $75
print(wallet == Money.new(75)) -- true
`,
        },
      },
      {
        heading: "Watching and protecting tables",
        text: [
          "__newindex runs when someone sets a key the table doesn't have yet — handy for logging. To make a table read-only, table.freeze is simpler: any change after that is an error.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local stats = {}
local tracked = setmetatable({}, {
    __index = stats,
    __newindex = function(_, key, value)
        print(key, "is now", value)
        stats[key] = value
    end,
})
tracked.Coins = 10
print(tracked.Coins)

local CONFIG = table.freeze({ MaxPlayers = 12, RoundTime = 120 })
local ok = pcall(function()
    CONFIG.RoundTime = 5
end)
print(ok) -- false: frozen tables can't change
`,
        },
        tip: "rawget(t, key) and rawset(t, key, value) skip the metamethods — use them inside __index and __newindex to avoid endless loops.",
      },
    ],
    game: {
      name: "Simulator games",
      text: "Huge simulator numbers (1.5Qa coins!) are often stored in a BigNum class whose metatable defines __add, __lt and __tostring. The rest of the game just writes a + b and print(a), and never needs to know how the number is stored.",
    },
    tryIt: [
      "Make a settings table that falls back to defaults with __index.",
      "Give the Money class a __lt so Money.new(5) < Money.new(9) works.",
      "Freeze a config table and try changing it inside pcall.",
    ],
    mistake: {
      error: "ServerScriptService.Script:3: attempt to perform arithmetic (add) on table and table",
      code: "local a = { amount = 5 }\nlocal b = { amount = 10 }\nprint(a + b)",
      explain:
        "Plain tables don't know how to add. Give them a metatable with __add — or add the fields yourself: a.amount + b.amount.",
    },
    quiz: {
      question: "Which metamethod runs when you use + on two tables?",
      options: ["__add", "__plus", "__index", "__sum"],
      answer: 0,
      why: "a + b looks for __add in the metatable of a (or b) and calls it with both values.",
    },
  },

  // ------------------------------------------------------------------ inheritance
  {
    id: "inheritance",
    chapter: CHAPTERS[9],
    title: "Inheritance: classes built on classes",
    minutes: 10,
    summary:
      "Make an Enemy class, then a Boss class that reuses everything and changes only what's different.",
    sections: [
      {
        text: [
          "In the classes lesson every Pet shared the methods of one class. Inheritance goes a step further: a Boss is an Enemy with extra powers, so it should reuse everything Enemy already does.",
          "The trick is one more __index: the child class looks up missing methods in the parent class. So Luau searches the object, then Boss, then Enemy.",
        ],
      },
      {
        heading: "The parent class",
        code: {
          where: "ReplicatedStorage › Enemy (ModuleScript)",
          code: lua`
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
    print(${BT}{self.Name}: {self.Health} HP${BT})
end

function Enemy:Attack()
    return 10
end

return Enemy
`,
        },
      },
      {
        heading: "A child class",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local Enemy = require(game.ReplicatedStorage.Enemy)

local Boss = setmetatable({}, { __index = Enemy })
Boss.__index = Boss

function Boss.new(name, health)
    local self = Enemy.new(name, health) -- build the Enemy part first
    return setmetatable(self, Boss)      -- then make it a Boss
end

function Boss:Attack()
    local base = Enemy.Attack(self) -- call the parent's version
    return base * 3
end

local boss = Boss.new("Mega Noob", 500)
boss:TakeDamage(120) -- inherited from Enemy
print(boss:Attack()) -- 30: Boss's own version
`,
        },
        tip: "Enemy.Attack(self) calls the parent's method on this object. It's how a child adds to a method instead of replacing it completely.",
      },
      {
        heading: "Composition: has-a instead of is-a",
        text: [
          "Inheritance chains get messy after two or three levels. Many pros prefer composition: a Boss has a Health part and an attack pattern, instead of inheriting from a long chain of classes.",
          "A good rule: use inheritance for small, clear families (Enemy → Zombie, Boss) and composition for everything else.",
        ],
      },
    ],
    game: {
      name: "Tower defense games",
      text: "Every tower inherits from a Tower class (range, cost, Upgrade, Sell) and each type — sniper, farm, freezer — only overrides how it attacks. Adding a new tower takes minutes because the shared code is already written.",
    },
    tryIt: [
      "Make a Zombie class that inherits from Enemy and attacks for 15.",
      "Give Boss a new method Enrage that doubles its Health.",
      "Print getmetatable(boss) == Boss and getmetatable(boss) == Enemy — which one is true?",
    ],
    mistake: {
      error: "ServerScriptService.Script:9: attempt to call missing method 'TakeDamage' of table",
      code: "local Enemy = {}\nEnemy.__index = Enemy\nfunction Enemy:TakeDamage(n) end\n\nlocal Boss = {}\nBoss.__index = Boss\n\nlocal boss = setmetatable({}, Boss)\nboss:TakeDamage(10)",
      explain:
        "Boss was never linked to Enemy, so TakeDamage isn't found. Give Boss its own metatable: setmetatable(Boss, { __index = Enemy }).",
    },
    quiz: {
      question: "How does a Boss object find TakeDamage when Boss doesn't define it?",
      options: [
        "It errors",
        "Boss's metatable has __index = Enemy, so Luau looks there next",
        "Every function is copied when the boss is created",
        "TakeDamage is a global function",
      ],
      answer: 1,
      why: "Missing keys go object → Boss (its __index) → Enemy (Boss's metatable __index).",
    },
  },

  // ------------------------------------------------------------------ closures
  {
    id: "closures",
    chapter: CHAPTERS[9],
    title: "Closures and functions as values",
    minutes: 9,
    summary:
      "Functions that remember, functions that take functions and any number of arguments — the tools behind callbacks and clean code.",
    sections: [
      {
        text: [
          "In Luau a function is a value like a number: you can store it in a variable, put it in a table, pass it to another function or return it.",
          "A closure is a function that remembers the local variables around it — even after the code that made them has finished.",
        ],
      },
      {
        heading: "Functions that remember",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local function makeCounter()
    local count = 0
    return function()
        count += 1
        return count
    end
end

local nextId = makeCounter()
print(nextId()) -- 1
print(nextId()) -- 2

local other = makeCounter() -- a fresh count of its own
print(other())  -- 1
`,
        },
      },
      {
        heading: "Passing functions in",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local function map(list, transform)
    local result = {}
    for i, value in ipairs(list) do
        result[i] = transform(value)
    end
    return result
end

local function filter(list, keep)
    local result = {}
    for _, value in ipairs(list) do
        if keep(value) then
            table.insert(result, value)
        end
    end
    return result
end

local prices = { 50, 120, 300, 80 }
local onSale = map(prices, function(p) return p / 2 end)
local cheap = filter(prices, function(p) return p < 100 end)
print(table.concat(onSale, ", ")) -- 25, 60, 150, 40
print(table.concat(cheap, ", "))  -- 50, 80
`,
        },
      },
      {
        heading: "A reusable cooldown",
        text: [
          "Closures shine for little tools like this one: it wraps any function so it can only run once every few seconds. Each wrapped function gets its own ready variable.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local function withCooldown(seconds, action)
    local ready = true
    return function(...)
        if not ready then
            return false
        end
        ready = false
        task.delay(seconds, function()
            ready = true
        end)
        action(...)
        return true
    end
end

local shout = withCooldown(2, print)
print(shout("Hello!")) -- prints Hello! and then true
print(shout("Again!")) -- false: still cooling down
`,
        },
        tip: '... (varargs) means "any number of arguments". Pass them on with action(...), collect them with { ... } and count them with select("#", ...).',
      },
    ],
    game: {
      name: "Admin command systems",
      text: "Admin systems store every command as a function in a table: commands.kick = function(player, target) … end. When a chat message arrives they look up the first word and call that function — adding a command is just adding one more entry.",
    },
    tryIt: [
      "Make a counter with makeCounter and call it three times.",
      "Use map to double every number in a list.",
      "Write a function with ... that adds up any amount of numbers.",
    ],
    mistake: {
      error: "ServerScriptService.Script:2: attempt to call a nil value",
      code: 'local function run(callback)\n\tcallback()\nend\n\nrun(print("done"))',
      explain:
        'print("done") runs right away and passes its result (nothing) to run. Pass a function instead: run(function() print("done") end).',
    },
    quiz: {
      question: "local f = makeCounter(); f(); f(); print(f()) — what prints?",
      options: ["1", "2", "3", "0"],
      answer: 2,
      why: "The closure keeps its own count between calls: 1, 2, then 3.",
    },
  },

  // ------------------------------------------------------------------ coroutines
  {
    id: "coroutines",
    chapter: CHAPTERS[9],
    title: "Coroutines: functions that pause",
    minutes: 9,
    summary:
      "Pause a function halfway and continue it later — the idea task.spawn is built on, and a tool for generators and dialogs.",
    sections: [
      {
        text: [
          "A coroutine is a function you can pause and continue. coroutine.yield pauses it; coroutine.resume continues from exactly where it stopped, with all its local variables intact.",
          "Roblox's task library runs on coroutines: every task.spawn is a coroutine the engine resumes for you.",
        ],
      },
      {
        heading: "Pause and resume",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local steps = coroutine.create(function()
    print("Step 1")
    coroutine.yield()
    print("Step 2")
    coroutine.yield()
    print("Step 3")
end)

coroutine.resume(steps)        -- Step 1
print(coroutine.status(steps)) -- suspended
coroutine.resume(steps)        -- Step 2
coroutine.resume(steps)        -- Step 3
print(coroutine.status(steps)) -- dead
`,
        },
      },
      {
        heading: "Generators with coroutine.wrap",
        text: [
          "coroutine.wrap gives you a plain function. Each call resumes the coroutine and returns whatever it yields — perfect for handing out values one at a time.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local nextTeam = coroutine.wrap(function()
    while true do
        for _, name in ipairs({ "Red", "Blue", "Green" }) do
            coroutine.yield(name)
        end
    end
end)

print(nextTeam(), nextTeam(), nextTeam(), nextTeam()) -- Red Blue Green Red
`,
        },
      },
      {
        heading: "Coroutines or task.spawn?",
        text: [
          "For game code you'll mostly use task.spawn and task.delay: they start a function as a new thread, and the engine handles the waiting. Reach for coroutine.* when you need to decide exactly when a function continues.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
for i = 1, 3 do
    task.spawn(function()
        task.wait(i)
        print("Timer", i, "done")
    end)
end
print("All timers started") -- prints first
`,
        },
        tip: "An error inside a coroutine doesn't stop your script: coroutine.resume returns false and the error message. Always check the first value it returns.",
      },
    ],
    game: {
      name: "Dialog and cutscene systems",
      text: "Dialog systems often run each conversation as a coroutine: show a line, yield until the player clicks Next, show the next line. The code reads top to bottom like the script of a play.",
    },
    tryIt: [
      "Make a coroutine that prints three steps and resume it three times.",
      "Print coroutine.status before and after the last resume.",
      "Write a coroutine.wrap generator that hands out 1, 2, 3, 1, 2, 3…",
    ],
    mistake: {
      error: "cannot resume dead coroutine",
      code: 'local co = coroutine.create(function()\n\tprint("hi")\nend)\ncoroutine.resume(co)\nprint(coroutine.resume(co))',
      explain:
        "When its function finishes, a coroutine is dead and can't run again. Check coroutine.status(co) first, or create a new coroutine.",
    },
    quiz: {
      question: "What does coroutine.yield() do?",
      options: [
        "Ends the coroutine forever",
        "Pauses the coroutine until it is resumed",
        "Waits exactly 1 second",
        "Restarts the function from the top",
      ],
      answer: 1,
      why: "yield pauses; the next resume continues right after the yield.",
    },
  },

  // ------------------------------------------------------------------ session-data
  {
    id: "session-data",
    chapter: CHAPTERS[10],
    title: "Pro saving: session data",
    minutes: 12,
    summary:
      "Load a player's data once, keep it in a table while they play, and save it safely with UpdateAsync, retries and autosave.",
    sections: [
      {
        text: [
          "Calling GetAsync or SetAsync every time a coin changes would hit DataStore limits within minutes. Pros load the data once when the player joins, keep it in a table while they play (the session) and save it when they leave — plus an autosave every few minutes.",
          "Every DataStore call can fail, so each one is wrapped in pcall and retried.",
        ],
      },
      {
        heading: "Retrying a call",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local function retry(attempts, fn, ...)
    for attempt = 1, attempts do
        local ok, result = pcall(fn, ...)
        if ok then
            return true, result
        end
        task.wait(attempt) -- wait a bit longer each time
    end
    return false, nil
end

local ok, value = retry(3, function()
    return 42
end)
print(ok, value)
`,
        },
      },
      {
        heading: "The session pattern",
        code: {
          where: "ServerScriptService › PlayerData",
          code: lua`
local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("PlayerData")

local sessions = {} -- [player] = their data while they play

local function newData()
    return { Coins = 0, Level = 1, Inventory = {} }
end

local function load(player)
    local ok, saved = pcall(store.GetAsync, store, "Player_" .. player.UserId)
    if not ok then
        player:Kick("Couldn't load your data, please rejoin.")
        return
    end
    sessions[player] = saved or newData()
end

local function save(player)
    local data = sessions[player]
    if not data then
        return -- never save data that didn't load
    end
    pcall(store.UpdateAsync, store, "Player_" .. player.UserId, function()
        return data
    end)
end

Players.PlayerAdded:Connect(load)
Players.PlayerRemoving:Connect(function(player)
    save(player)
    sessions[player] = nil
end)

game:BindToClose(function()
    for _, player in Players:GetPlayers() do
        save(player)
    end
end)

task.spawn(function()
    while true do
        task.wait(120) -- autosave every 2 minutes
        for _, player in Players:GetPlayers() do
            task.spawn(save, player)
        end
    end
end)
`,
        },
        tip: "Never save data that failed to load: you'd overwrite a player's real progress with empty defaults. That one rule prevents most \"I lost all my stuff!\" reports.",
      },
      {
        heading: "UpdateAsync instead of SetAsync",
        text: [
          "SetAsync blindly overwrites. UpdateAsync hands you the value that's stored right now and lets you decide what to write — so two servers saving the same player can't wipe each other's progress. Return nil from the function to cancel the save.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("PlayerData")

store:UpdateAsync("Player_1", function(old)
    old = old or { Coins = 0 }
    old.Coins += 100 -- add to whatever is saved now
    return old
end)
print(store:GetAsync("Player_1").Coins) -- 100
`,
        },
      },
    ],
    game: {
      name: "Every big RPG and simulator",
      text: "Games with millions of visits use this exact pattern, often through community modules like ProfileStore: one session table per player, saves on leave and on shutdown, autosaves in between and retries when Roblox's servers hiccup.",
    },
    tryIt: [
      "Add a Gems field to newData and give new players 5.",
      "Lower the autosave to 30 seconds and print when it saves.",
      "Make load retry three times before kicking the player.",
    ],
    mistake: {
      error:
        "DataStore request was added to queue. If request queue fills, further requests will be dropped. Try sending fewer requests.Key = Player_1",
      code: 'coins.Changed:Connect(function()\n\tstore:SetAsync("Player_" .. player.UserId, coins.Value)\nend)',
      explain:
        "Saving every time a value changes sends far too many requests. Keep the data in a session table and save on leave, on shutdown and on a timer.",
    },
    quiz: {
      question: "Why use UpdateAsync instead of SetAsync when saving?",
      options: [
        "It's faster",
        "It sees the value stored right now, so it won't blindly overwrite newer data",
        "It doesn't need pcall",
        "It saves to every server at once",
      ],
      answer: 1,
      why: "UpdateAsync reads and writes in one step, so you decide based on what's really saved.",
    },
  },

  // ------------------------------------------------------------------ global-leaderboards
  {
    id: "global-leaderboards",
    chapter: CHAPTERS[10],
    title: "Global leaderboards",
    minutes: 9,
    summary:
      "Rank every player who ever played with an OrderedDataStore and show the top 10 on a board.",
    sections: [
      {
        text: [
          'A normal DataStore can\'t sort. An OrderedDataStore only stores whole numbers, but it can give you the keys sorted by their value — exactly what an "all-time top 10" board needs.',
        ],
      },
      {
        heading: "Saving a score",
        code: {
          where: "ServerScriptService › Leaderboard",
          code: lua`
local DataStoreService = game:GetService("DataStoreService")
local winsStore = DataStoreService:GetOrderedDataStore("Wins")

local function saveWins(userId, wins)
    local ok, err = pcall(function()
        winsStore:SetAsync(tostring(userId), wins) -- whole numbers only
    end)
    if not ok then
        warn(err)
    end
end

saveWins(1, 30)
saveWins(2, 75)
saveWins(3, 12)
`,
        },
      },
      {
        heading: "Reading the top 10",
        code: {
          where: "ServerScriptService › Leaderboard",
          code: lua`
local DataStoreService = game:GetService("DataStoreService")
local winsStore = DataStoreService:GetOrderedDataStore("Wins")
winsStore:SetAsync("1", 30)
winsStore:SetAsync("2", 75)
winsStore:SetAsync("3", 12)

local pages = winsStore:GetSortedAsync(false, 10) -- false = highest first
local top = pages:GetCurrentPage()

for rank, entry in ipairs(top) do
    print(rank, entry.key, entry.value)
end
`,
        },
      },
      {
        heading: "Names and refreshing",
        text: [
          "The keys are UserIds, so turn them into names with Players:GetNameFromUserIdAsync — inside pcall, because it's a web request.",
          "Refresh the board every minute or two, never every frame: each GetSortedAsync uses part of your request budget.",
        ],
        code: {
          where: "ServerScriptService › Leaderboard",
          code: lua`
local Players = game:GetService("Players")

local function nameOf(userId)
    local ok, name = pcall(Players.GetNameFromUserIdAsync, Players, userId)
    return if ok then name else "Unknown"
end

print(nameOf(1))
`,
        },
        tip: "OrderedDataStores only take whole numbers. To rank a time like 12.5 seconds, save math.floor(time * 1000) and divide by 1000 when you show it.",
      },
    ],
    game: {
      name: "Speedrun obbies and fighting games",
      text: 'The glowing "Top Wins" and "Fastest Times" boards in lobbies are OrderedDataStores. A loop refreshes them every 60 seconds and clones a row template for each of the top players.',
    },
    tryIt: [
      "Save scores for five made-up players and print the top three.",
      "Show the lowest values first with GetSortedAsync(true, 10) — perfect for fastest times.",
      "Turn a time like 12.345 seconds into a whole number and back.",
    ],
    mistake: {
      error: 'GetSortedAsync is not a valid member of DataStore "Wins"',
      code: 'local store = DataStoreService:GetDataStore("Wins")\nlocal pages = store:GetSortedAsync(false, 10)',
      explain:
        'Only an OrderedDataStore can sort. Create it with DataStoreService:GetOrderedDataStore("Wins").',
    },
    quiz: {
      question: "Which call gives you the 10 highest scores?",
      options: [
        "store:GetSortedAsync(false, 10)",
        'store:GetAsync("top10")',
        "store:GetSortedAsync(true, 10)",
        "store:GetTop(10)",
      ],
      answer: 0,
      why: "The first argument is ascending: false means highest first.",
    },
  },

  // ------------------------------------------------------------------ serialization
  {
    id: "serialization",
    chapter: CHAPTERS[10],
    title: "Saving anything: serialization",
    minutes: 10,
    summary:
      "DataStores only save plain data. Turn Vector3s, Color3s and whole builds into tables — and back.",
    sections: [
      {
        text: [
          "DataStores save JSON: numbers, strings, booleans and tables of those. Roblox types like Vector3, Color3, CFrame and Instances can't be saved directly.",
          "Serializing means turning something into plain data; deserializing turns it back. Every building game and every saved house does this.",
        ],
      },
      {
        heading: "Vectors and colors as plain data",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local function packVector(v)
    return { v.X, v.Y, v.Z }
end
local function unpackVector(t)
    return Vector3.new(t[1], t[2], t[3])
end

local saved = packVector(Vector3.new(10, 5, -3))
print(table.concat(saved, ", ")) -- 10, 5, -3
print(unpackVector(saved))       -- a Vector3 again

local color = Color3.fromRGB(255, 170, 0)
local hex = color:ToHex()          -- "ffaa00": a string saves fine
print(hex, Color3.fromHex(hex) == color)
`,
        },
      },
      {
        heading: "Saving a whole build",
        code: {
          where: "ServerScriptService › Builds",
          code: lua`
local HttpService = game:GetService("HttpService")

local function serializeBuild(folder)
    local parts = {}
    for _, part in folder:GetChildren() do
        table.insert(parts, {
            Name = part.Name,
            Position = { part.Position.X, part.Position.Y, part.Position.Z },
            Size = { part.Size.X, part.Size.Y, part.Size.Z },
            Color = part.Color:ToHex(),
        })
    end
    return parts
end

local function loadBuild(data, parent)
    for _, info in data do
        local part = Instance.new("Part")
        part.Name = info.Name
        part.Anchored = true
        part.Position = Vector3.new(table.unpack(info.Position))
        part.Size = Vector3.new(table.unpack(info.Size))
        part.Color = Color3.fromHex(info.Color)
        part.Parent = parent
    end
end

local build = Instance.new("Folder")
local wall = Instance.new("Part")
wall.Name = "Wall"
wall.Size = Vector3.new(10, 8, 1)
wall.Parent = build

local data = serializeBuild(build)
print(HttpService:JSONEncode(data)) -- what the DataStore would store
loadBuild(data, workspace)
`,
        },
      },
      {
        heading: "Versioning your data",
        text: [
          "Your save format will change as the game grows. Store a version number and upgrade old saves when they load, so a player from last year doesn't lose anything.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local CURRENT_VERSION = 2

local function migrate(data)
    if (data.Version or 1) < 2 then
        data.Gems = 0 -- version 2 added gems
        data.Version = 2
    end
    return data
end

local old = { Coins = 300 } -- saved before gems existed
local upgraded = migrate(old)
print(upgraded.Version, upgraded.Coins, upgraded.Gems) -- 2 300 0
print(upgraded.Version == CURRENT_VERSION)
`,
        },
        tip: "Save what you need to rebuild something (names, positions, colors), never the objects themselves. A key can hold up to 4 MB, so keep saves compact.",
      },
    ],
    game: {
      name: "Building games",
      text: "When you leave a building game, every wall, chair and lamp you placed is serialized into a table of item names, positions and colors. Loading your plot reads that table and clones each item back into place.",
    },
    tryIt: [
      "Pack a Color3 into a hex string and unpack it again.",
      "Serialize a folder with three parts and print the JSON.",
      "Add a version 3 to migrate that gives every save a Level field.",
    ],
    mistake: {
      error:
        "104: Cannot store Vector3 in data store. Data stores can only accept valid UTF-8 characters.",
      code: 'store:SetAsync("Spawn", part.Position)',
      explain:
        "A Vector3 is a Roblox type, not plain data. Save its X, Y and Z numbers instead and rebuild it with Vector3.new when you load.",
    },
    quiz: {
      question: "How do you save a part's Color in a DataStore?",
      options: [
        "Save part.Color directly",
        "Save it as plain data (a hex string or R, G, B numbers) and rebuild the Color3 when loading",
        "Save the whole part",
        "Colors can't be saved",
      ],
      answer: 1,
      why: "Only plain data can be saved, so turn the color into text or numbers first.",
    },
  },

  // ------------------------------------------------------------------ cross-server
  {
    id: "cross-server",
    chapter: CHAPTERS[10],
    title: "Talking between servers",
    minutes: 8,
    summary:
      "Send messages to every server of your game at once with MessagingService — global announcements, rare drops and events.",
    sections: [
      {
        text: [
          "Every Roblox server is its own little world: a player in server A can't see anything that happens in server B.",
          "MessagingService connects them. One server publishes a message on a topic, and every server subscribed to that topic receives it, usually within a second.",
        ],
      },
      {
        heading: "Subscribe and publish",
        code: {
          where: "ServerScriptService › Announcements",
          code: lua`
local MessagingService = game:GetService("MessagingService")

-- every server listens on the "Announcements" topic
local ok, err = pcall(function()
    MessagingService:SubscribeAsync("Announcements", function(message)
        print("📢 " .. message.Data)
    end)
end)
if not ok then
    warn(err)
end

-- any server can send to all of them
pcall(function()
    MessagingService:PublishAsync("Announcements", "Double coins for the next hour!")
end)
`,
        },
      },
      {
        heading: "Sending tables",
        text: [
          "A message can carry a small table (up to 1 KB). Add a Kind field so one topic can carry several different features.",
        ],
        code: {
          where: "ServerScriptService › Global",
          code: lua`
local MessagingService = game:GetService("MessagingService")

MessagingService:SubscribeAsync("Global", function(message)
    local data = message.Data
    if data.Kind == "RareDrop" then
        print(data.Player .. " found a " .. data.Item .. "!")
    end
end)

MessagingService:PublishAsync("Global", {
    Kind = "RareDrop",
    Player = "Ann",
    Item = "Golden Dragon",
})
`,
        },
        tip: "MessagingService has limits (roughly 150 + 60 × players messages a minute per server). Publish rare, important events — never every frame or every coin.",
      },
      {
        heading: "What pros use it for",
        list: [
          "Global announcements from admins",
          '"Someone just hatched a Legendary!" banners in every server',
          "Live events that start everywhere at the same moment",
          "Telling every server to shut down for an update",
        ],
      },
    ],
    game: {
      name: "Pet simulators",
      text: "When someone hatches a super-rare pet, every server shows a banner. The server that saw the hatch publishes on a topic; all the others are subscribed and show the message to their players.",
    },
    tryIt: [
      "Subscribe to a topic and publish a message to it from the same script.",
      "Send a table with a Kind field and handle two different kinds.",
      "Wrap PublishAsync in pcall and warn if it fails.",
    ],
    mistake: {
      error: "ServerScriptService.Global:4: attempt to concatenate string with table",
      code: 'MessagingService:SubscribeAsync("News", function(message)\n\tprint("News: " .. message)\nend)',
      explain:
        "The callback gets a table, not your text. What you published is in message.Data (and message.Sent says when it was sent).",
    },
    quiz: {
      question: "Inside SubscribeAsync's callback, where is the data you published?",
      options: ["message", "message.Data", "message.Text", "message[1]"],
      answer: 1,
      why: "The message is a table: Data is what was published, Sent is the time.",
    },
  },

  // ------------------------------------------------------------------ server-authority
  {
    id: "server-authority",
    chapter: CHAPTERS[11],
    title: "Never trust the client",
    minutes: 11,
    summary:
      "Exploiters can fire any remote with any values. Learn to check every argument on the server.",
    sections: [
      {
        text: [
          "Anything running on a player's device — LocalScripts, the UI, even their character's position — can be changed by an exploiter. They can also fire your RemoteEvents with any arguments they like, as often as they like.",
          "The rule pros live by: the client asks, the server decides. The server checks every value before it does anything.",
        ],
      },
      {
        heading: "What a dangerous remote looks like",
        code: {
          where: "ServerScriptService › Rewards",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local giveCoins = ReplicatedStorage.GiveCoins

-- DON'T: the client chooses how many coins it gets
giveCoins.OnServerEvent:Connect(function(player, amount)
    player.leaderstats.Coins.Value += amount
end)
`,
        },
        text: [
          "In this script the client picks the amount. An exploiter just runs GiveCoins:FireServer(999999999) and is instantly rich — the server has to decide the amount itself.",
        ],
      },
      {
        heading: "Checking every argument",
        code: {
          where: "ServerScriptService › Shop",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local buyItem = ReplicatedStorage.BuyItem

local PRICES = { Sword = 100, Bow = 60 }

buyItem.OnServerEvent:Connect(function(player, itemName)
    -- 1. the type: exploiters can send tables, numbers or nothing
    if typeof(itemName) ~= "string" then
        return
    end
    -- 2. it exists: the server's own table decides the price
    local price = PRICES[itemName]
    if not price then
        return
    end
    -- 3. the player can afford it
    local coins = player.leaderstats.Coins
    if coins.Value < price then
        return
    end
    coins.Value -= price
    print(player.Name .. " bought " .. itemName)
end)
`,
        },
      },
      {
        heading: "Distances and numbers",
        text: [
          'If a player "opens a chest", check that their character is really near it. If they send a number, reject NaN, infinity and anything outside the range you expect.',
        ],
        code: {
          where: "ServerScriptService › Checks",
          code: lua`
local MAX_DISTANCE = 12

local function isNear(player, part)
    local character = player.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    if not root then
        return false
    end
    return (root.Position - part.Position).Magnitude <= MAX_DISTANCE
end

local function isValidNumber(n, min, max)
    -- n == n is false only for NaN
    return typeof(n) == "number" and n == n and n >= min and n <= max
end

print(isValidNumber(5, 1, 10))         -- true
print(isValidNumber(0 / 0, 1, 10))     -- false: NaN
print(isValidNumber(math.huge, 1, 10)) -- false
`,
        },
        tip: 'Never trust names, prices or amounts from the client. Send what the player wants to do ("Sword"), and let the server look up everything else.',
      },
    ],
    game: {
      name: "Every game that stays popular",
      text: "Successful games have servers that double-check everything: shops look up prices on the server, weapons check range and cooldowns, collectibles check distance. Games that trust the client get flooded with infinite-money exploits within days.",
    },
    tryIt: [
      "Add a type check to a remote that takes a number.",
      "Refuse a purchase if the player is more than 12 studs from the shop counter.",
      "See what isValidNumber returns for a string.",
    ],
    mistake: {
      error: "ServerScriptService.Shop:3: attempt to compare nil <= number",
      code: "buyItem.OnServerEvent:Connect(function(player, itemName, price)\n\tlocal coins = player.leaderstats.Coins\n\tif coins.Value >= price then\n\t\tcoins.Value -= price\n\tend\nend)",
      explain:
        "The price comes from the client, so an exploiter can leave it out (this error) — or worse, send -1000000 and gain coins. Look the price up on the server: local price = PRICES[itemName].",
    },
    quiz: {
      question:
        'A client fires BuyItem with ("Sword", 0). What should the server use as the price?',
      options: [
        "0, what the client sent",
        "The price from the server's own PRICES table",
        "The average of both",
        "Ask the client again",
      ],
      answer: 1,
      why: "The client only says what it wants. The server decides what it costs.",
    },
  },

  // ------------------------------------------------------------------ rate-limiting
  {
    id: "rate-limiting",
    chapter: CHAPTERS[11],
    title: "Rate limits and cooldowns",
    minutes: 9,
    summary:
      "Stop players from spamming remotes: per-player cooldowns, request budgets and cleaning up when they leave.",
    sections: [
      {
        text: [
          "Even a perfectly checked remote can be abused by firing it 1,000 times a second — to farm rewards or to lag your server. A rate limit decides how often each player may do something.",
        ],
      },
      {
        heading: "A per-player cooldown",
        code: {
          where: "ServerScriptService › Combat",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local swing = ReplicatedStorage.Swing

local COOLDOWN = 0.5
local lastSwing = {} -- [player] = when they last swung

swing.OnServerEvent:Connect(function(player)
    local now = os.clock()
    if lastSwing[player] and now - lastSwing[player] < COOLDOWN then
        return -- too soon: ignore it
    end
    lastSwing[player] = now
    print(player.Name .. " swings!")
end)

Players.PlayerRemoving:Connect(function(player)
    lastSwing[player] = nil -- forget players who left
end)
`,
        },
      },
      {
        heading: "A request budget",
        text: [
          "A cooldown blocks every burst. A budget allows a few quick actions but limits the average: each player has tokens that refill over time, and every request spends one.",
        ],
        code: {
          where: "ServerScriptService › Limits",
          code: lua`
local MAX_TOKENS = 5
local REFILL_PER_SECOND = 1
local buckets = {}

local function allow(player)
    local now = os.clock()
    local bucket = buckets[player] or { tokens = MAX_TOKENS, last = now }
    bucket.tokens = math.min(MAX_TOKENS, bucket.tokens + (now - bucket.last) * REFILL_PER_SECOND)
    bucket.last = now
    buckets[player] = bucket
    if bucket.tokens < 1 then
        return false
    end
    bucket.tokens -= 1
    return true
end

local results = {}
for i = 1, 7 do
    table.insert(results, tostring(allow("Ann")))
end
print(table.concat(results, " ")) -- five trues, then false false
`,
        },
      },
      {
        heading: "Don't punish too fast",
        text: [
          "Lag can make an honest player's requests arrive two at a time. Quietly ignore extra requests instead of kicking. Only log or kick when someone is far over the limit — like 50 requests a second.",
        ],
        tip: "Every table keyed by player needs a cleanup in PlayerRemoving. Otherwise it grows for as long as the server runs — a memory leak.",
      },
    ],
    game: {
      name: "Clicker and simulator games",
      text: "Auto-clickers can click 100 times a second. Simulator games cap clicks on the server (often 10–20 a second), so the leaderboard rewards playing, not cheating software.",
    },
    tryIt: [
      "Change COOLDOWN to 2 and fire the remote quickly from a LocalScript.",
      "Print how many tokens are left after each allow call.",
      "Add a warning when one player is blocked 20 times in a row.",
    ],
    mistake: {
      error: "ServerScriptService.Combat:4: attempt to perform arithmetic (sub) on number and nil",
      code: "local last = {}\n\nswing.OnServerEvent:Connect(function(player)\n\tif os.clock() - last[player] < 0.5 then\n\t\treturn\n\tend\n\tlast[player] = os.clock()\nend)",
      explain:
        "The first time a player swings, last[player] is still nil. Check it exists first: if last[player] and os.clock() - last[player] < 0.5 then.",
    },
    quiz: {
      question: "Where should you remove a player's entry from a cooldown table?",
      options: ["Never", "In Players.PlayerRemoving", "Every frame", "In a LocalScript"],
      answer: 1,
      why: "When the player leaves, their entry is useless — remove it so the table doesn't grow forever.",
    },
  },

  // ------------------------------------------------------------------ replication
  {
    id: "replication",
    chapter: CHAPTERS[11],
    title: "Replication: who sees what",
    minutes: 9,
    summary:
      "What the server sends to clients, what clients can change, and where to put scripts and assets so they stay safe.",
    sections: [
      {
        text: [
          "The server holds the real game. Changes the server makes to workspace, ReplicatedStorage and players are copied (replicated) to every client automatically.",
          "Changes a client makes stay on that client. If a LocalScript deletes a wall, it disappears for that player only — everyone else still sees it. This is FilteringEnabled, and it's always on.",
        ],
      },
      {
        heading: "Where things live",
        list: [
          "ServerScriptService and ServerStorage: only the server can see them. Put game logic, secret values and templates here.",
          "ReplicatedStorage: the server and every client see it. Put RemoteEvents, shared ModuleScripts and assets the client needs.",
          "Workspace: the 3D world, replicated to everyone.",
          "StarterGui and StarterPlayerScripts: copied to each player when they join, and run on their device.",
          "A player's PlayerGui: only that player (and the server) can see it.",
        ],
        tip: "Exploiters can read everything that reaches their device — ReplicatedStorage, Workspace and the code of every LocalScript and shared ModuleScript. Never put admin lists or secret keys there.",
      },
      {
        heading: "Client changes stay local",
        code: {
          where: "StarterPlayer › StarterPlayerScripts › LocalScript",
          code: lua`
local Players = game:GetService("Players")
local player = Players.LocalPlayer

-- only this player sees the wall vanish
local wall = workspace:WaitForChild("SecretWall")
wall.Transparency = 1
wall.CanCollide = false
print(player.Name .. " sees the wall open")
`,
        },
      },
      {
        heading: "Asking the server",
        text: [
          "When a change should happen for everyone, the client fires a RemoteEvent and the server makes the change. The server's change then replicates to all players.",
        ],
        code: {
          where: "ServerScriptService › Doors",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local openDoor = ReplicatedStorage.OpenDoor

openDoor.OnServerEvent:Connect(function(player)
    local door = workspace.Door
    door.Transparency = 0.5
    door.CanCollide = false -- the server changed it: everyone sees it
    print(player.Name .. " opened the door for everyone")
end)
`,
        },
      },
    ],
    game: {
      name: "Obbies with VIP doors",
      text: "A VIP door is often opened locally: a LocalScript checks the game pass and makes the door walk-through only for that player. Everyone else still bumps into it — no remote needed.",
    },
    tryIt: [
      "Make a LocalScript turn a part invisible, then switch Studio's view to the Server to see it's still there.",
      "Move a part from ServerStorage to ReplicatedStorage and read it from a LocalScript.",
      "Fire a RemoteEvent that changes the part on the server instead.",
    ],
    mistake: {
      error: 'Items is not a valid member of ServerStorage "ServerStorage"',
      code: 'local items = game:GetService("ServerStorage").Items',
      explain:
        "This line is in a LocalScript. ServerStorage is never sent to clients, so it looks empty there. Put things clients need in ReplicatedStorage.",
    },
    quiz: {
      question: "A LocalScript sets workspace.Wall.Transparency = 1. Who sees the wall disappear?",
      options: ["Everyone", "Only that player", "Only the server", "Nobody"],
      answer: 1,
      why: "Client changes don't replicate. Only that player's device changed.",
    },
  },

  // ------------------------------------------------------------------ anti-cheat
  {
    id: "anti-cheat",
    chapter: CHAPTERS[11],
    title: "Catching cheaters on the server",
    minutes: 10,
    summary: "Spot speed hacks and teleports from the server, and check every hit a client claims.",
    sections: [
      {
        text: [
          "Each character is physically simulated on its player's own device, so an exploiter can run faster than their WalkSpeed or teleport. But the server still sees where the character ends up — so it can check if that movement was possible.",
          "A good anti-cheat is generous: lag and falling are honest reasons for big jumps. Pull suspicious players back instead of banning them on the first strange reading.",
        ],
      },
      {
        heading: "A speed check",
        code: {
          where: "ServerScriptService › AntiCheat",
          code: lua`
local Players = game:GetService("Players")

local CHECK_EVERY = 1 -- seconds
local MAX_SPEED = 40  -- studs per second, well above WalkSpeed 16

Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function(character)
        local root = character:WaitForChild("HumanoidRootPart")
        local lastPosition = root.Position

        while character.Parent do
            task.wait(CHECK_EVERY)
            -- ignore up and down, so falling doesn't count
            local moved = (root.Position - lastPosition) * Vector3.new(1, 0, 1)
            if moved.Magnitude / CHECK_EVERY > MAX_SPEED then
                warn(player.Name .. " moved too fast")
                root.CFrame = CFrame.new(lastPosition)
            end
            lastPosition = root.Position
        end
    end)
end)
`,
        },
      },
      {
        heading: "Checking hits",
        text: [
          'If a client says "I hit that enemy", the server checks the claim: is it really a living character, and is it close enough to have been hit?',
        ],
        code: {
          where: "ServerScriptService › Combat",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local hitEnemy = ReplicatedStorage.HitEnemy

local RANGE = 10
local DAMAGE = 20

hitEnemy.OnServerEvent:Connect(function(player, target)
    if typeof(target) ~= "Instance" or not target:IsA("Model") then
        return
    end
    local humanoid = target:FindFirstChildOfClass("Humanoid")
    local root = target:FindFirstChild("HumanoidRootPart")
    local myRoot = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if not (humanoid and root and myRoot) or humanoid.Health <= 0 then
        return
    end
    if (root.Position - myRoot.Position).Magnitude > RANGE then
        return -- too far away to have hit it
    end
    humanoid:TakeDamage(DAMAGE)
end)
`,
        },
      },
      {
        heading: "Server-side values only",
        text: [
          "Some values should never be decided by the client at all: damage, rewards, prices, cooldowns and round times live in server scripts. The client only says what the player did — which button, which target — and the server works out the result.",
        ],
        tip: "Log suspicious events with the player's name and what happened. Kick only after repeated, clear violations — never for a single odd reading.",
      },
    ],
    game: {
      name: "Competitive shooters",
      text: "Shooters let the client draw bullets instantly so the game feels smooth, but the server re-checks every shot: distance, line of sight and fire rate. A hacked client can still shoot — it just can't deal damage the server disagrees with.",
    },
    tryIt: [
      "Lower MAX_SPEED to 20 and give yourself WalkSpeed 30 — does the check catch you?",
      "Add a cooldown so one player can only hit twice a second.",
      "Warn with the distance when a hit is too far away.",
    ],
    mistake: {
      error: "ServerScriptService.Combat:3: attempt to index nil with 'Health'",
      code: 'hitEnemy.OnServerEvent:Connect(function(player, target)\n\tlocal humanoid = target:FindFirstChild("Humanoid")\n\thumanoid.Health -= 20\nend)',
      explain:
        'An exploiter can send any object (or nil) as the target. Check typeof(target) == "Instance" and that the Humanoid exists before you use it.',
    },
    quiz: {
      question: "Why does the speed check ignore the Y axis?",
      options: [
        "Because Y is always 0",
        "So falling and jumping don't look like speed hacking",
        "Because exploiters can't change Y",
        "To make the check run faster",
      ],
      answer: 1,
      why: "Falling off a tall building moves you fast downwards — that's not cheating.",
    },
  },
];
