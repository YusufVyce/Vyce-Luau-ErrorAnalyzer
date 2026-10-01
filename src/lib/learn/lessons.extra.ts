/**
 * More lessons, in three new units after the original course: a Luau
 * toolbox, the world and its players, and servers & game projects.
 */
import { CHAPTERS, type Lesson } from "./lessonBase";

/** Code sample: drops the first newline and turns 4-space indents into tabs. */
const lua = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values)
    .replace(/^\n/, "")
    .replace(/^( {4})+/gm, (m) => "\t".repeat(m.length / 4))
    .replace(/\s+$/, "");

const BT = "`";

/** Order of the new lessons on the path (they're grouped into units by chapter). */
const ORDER = [
  "dictionaries",
  "string-tools",
  "pcall",
  "task-library",
  "attributes",
  "instances",
  "characters",
  "user-input",
  "cframes",
  "remote-functions",
  "bindables",
  "project-shop",
  "project-tycoon",
];

const LESSONS_BY_ID: Lesson[] = [
  // ------------------------------------------------------------------ dictionaries
  {
    id: "dictionaries",
    chapter: CHAPTERS[6],
    title: "Dictionaries: tables with names",
    minutes: 7,
    summary:
      "Store values under names instead of numbers — perfect for inventories, prices and player data.",
    sections: [
      {
        text: [
          "A list keeps things by position: items[1], items[2]. A dictionary keeps them by name: stats.Coins, stats.Level. It's the same kind of table, but the keys are words.",
          "You'll use dictionaries everywhere in Roblox: prices in a shop, settings for a game, the data you save for each player.",
        ],
      },
      {
        heading: "Making and reading a dictionary",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local prices = {
    Sword = 100,
    Shield = 75,
    ["Magic Wand"] = 250, -- keys with spaces need brackets and quotes
}

print(prices.Sword)          -- 100
print(prices["Magic Wand"])  -- 250
print(prices.Bow)            -- nil: there is no such key

prices.Bow = 60      -- add a new key
prices.Shield = nil  -- remove a key
`,
        },
      },
      {
        heading: "Looping with pairs",
        text: [
          "ipairs only walks 1, 2, 3… so it skips named keys. pairs visits every key and value. The order isn't guaranteed, so never depend on it.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local inventory = { Sword = 1, Potion = 3, Arrow = 20 }

for item, count in pairs(inventory) do
    print(item, count)
end

-- count how many different items there are
local kinds = 0
for _ in pairs(inventory) do
    kinds += 1
end
print("Kinds:", kinds)
`,
        },
        tip: "#inventory is 0 for a dictionary! The # operator only counts list items 1, 2, 3… — count named keys with a pairs loop.",
      },
      {
        heading: "Tables inside tables",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local playerData = {
    Coins = 250,
    Inventory = { "Sword", "Bow" },
    Settings = { Music = true, Volume = 0.5 },
}

print(playerData.Settings.Volume) -- 0.5
table.insert(playerData.Inventory, "Potion")
print(#playerData.Inventory)      -- 3
`,
        },
        text: [
          "This is exactly the shape you'll save in a DataStore later: one table per player with everything inside it.",
        ],
      },
    ],
    game: {
      name: "Adopt Me!-style pet games",
      text: "Every pet is a little dictionary: its name, rarity, age and whether it's neon. The inventory is a list of those dictionaries, and that whole table is what gets saved when you leave.",
    },
    tryIt: [
      "Make a prices dictionary with three items and print each one with pairs.",
      "Add a fourth item, then remove one by setting it to nil.",
      "Print #prices and see why it's 0.",
    ],
    mistake: {
      error: "ServerScriptService.Script:2: attempt to perform arithmetic (add) on nil and number",
      code: "local stats = { coins = 10 }\nstats.Coins = stats.Coins + 5",
      explain:
        "Keys are case-sensitive. The table has coins (lowercase), so stats.Coins is nil and nil + 5 fails. Use exactly the same spelling everywhere.",
    },
    quiz: {
      question: "local t = { Sword = 1, Bow = 2 } — what does #t give?",
      options: ["2", "0", "1", "nil"],
      answer: 1,
      why: "# only counts list items (keys 1, 2, 3…). A table with only named keys has length 0.",
    },
  },

  // ------------------------------------------------------------------ string-tools
  {
    id: "string-tools",
    chapter: CHAPTERS[6],
    title: "Text tricks: string functions",
    minutes: 8,
    summary:
      "Change case, cut, search, replace and split text — and build messages with string interpolation.",
    sections: [
      {
        text: [
          "Players type names, chat messages and codes. Luau's string library turns that raw text into something your game can use.",
          "Every function works two ways: string.upper(name) or name:upper(). Both do exactly the same thing.",
        ],
      },
      {
        heading: "The everyday functions",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local text = "Roblox Studio"

print(string.upper(text))          -- all capitals
print(string.lower(text))          -- all lowercase
print(string.len(text))            -- 13 characters
print(string.sub(text, 1, 6))      -- characters 1 to 6
print(string.find(text, "Studio")) -- where it starts and ends
print(string.rep("ha", 3))         -- the text three times
`,
        },
      },
      {
        heading: "Replace and split",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local message = "I love noobs"
local nicer = string.gsub(message, "noobs", "builders")
print(nicer)

local list = "Sword,Bow,Potion"
local items = string.split(list, ",")
print(#items)    -- 3
for _, item in ipairs(items) do
    print(item)
end
`,
        },
        tip: "string.gsub returns two values: the new text and how many replacements it made. Put it in one variable and you only keep the text.",
      },
      {
        heading: "Building messages",
        text: [
          "Joining text with .. gets messy fast. String interpolation puts values straight inside backticks with {curly braces}, and string.format rounds numbers for you.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local player = "Ann"
local coins = 250

print(player .. ": " .. coins)        -- the old way
print(${BT}{player}: {coins}${BT})            -- the same, easier to read
print(${BT}Next level in {1000 - coins}${BT}) -- any expression works

print(string.format("%.2f", 9.5))     -- two decimals
`,
        },
      },
    ],
    game: {
      name: "Codes and admin commands",
      text: "Games with redeem codes compare string.upper(input) so FREEPET and freepet both work. Admin commands like ':kick Bob' are split into words with string.split, and the name tag above your head is built with string interpolation.",
    },
    tryIt: [
      'Store a code like "freepet" and check it with string.upper so capitals don\'t matter.',
      'Split "Sword,Bow,Potion" and print each item with ipairs.',
      'Print a name tag like "[VIP] Ann" using backticks.',
    ],
    mistake: {
      error: "ServerScriptService.Script:2: attempt to call missing method 'Split' of string",
      code: 'local text = "a,b,c"\nlocal parts = text:Split(",")',
      explain:
        "Names are case-sensitive: it's split, not Split. Roblox objects use capitals (FindFirstChild), but the string library is all lowercase (split, upper, sub).",
    },
    quiz: {
      question: 'What does string.split("a-b-c", "-") give?',
      options: ['"abc"', 'A list: {"a", "b", "c"}', "3", '"a b c"'],
      answer: 1,
      why: "split cuts the text at every - and gives you the pieces in a list.",
    },
  },

  // ------------------------------------------------------------------ instances
  {
    id: "instances",
    chapter: CHAPTERS[7],
    title: "Create, clone and find objects",
    minutes: 8,
    summary:
      "Instance.new, Clone, Destroy, FindFirstChild and GetChildren: build and clean up the world from code.",
    sections: [
      {
        text: [
          "Everything in Explorer is an Instance. Scripts can make new ones, copy existing ones, look for them and delete them while the game runs.",
        ],
      },
      {
        heading: "Making a new object",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local part = Instance.new("Part")
part.Name = "Platform"
part.Size = Vector3.new(10, 1, 10)
part.Position = Vector3.new(0, 5, 0)
part.Anchored = true
part.Parent = workspace -- set Parent last: now it appears
`,
        },
        tip: "Set Parent last. Until it's parented into the game the object only exists in your script, and setting its properties first is faster.",
      },
      {
        heading: "Templates and copies",
        text: [
          "Keep one finished object in ServerStorage (players can't see it there) and Clone it whenever you need another. Every copy is independent.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local template = game.ServerStorage.Coin

for i = 1, 5 do
    local coin = template:Clone()
    coin.Position = Vector3.new(i * 4, 3, 0)
    coin.Parent = workspace
end
`,
        },
      },
      {
        heading: "Finding and deleting",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local door = workspace:FindFirstChild("Door")
if door then
    door:Destroy() -- gone for good
end

for _, child in workspace:GetChildren() do
    print(child.Name)
end

local map = workspace:WaitForChild("Map") -- waits until it exists
`,
        },
        list: [
          "FindFirstChild(name) returns the object or nil, so check it before using it.",
          "WaitForChild(name) pauses until the object appears (great in LocalScripts).",
          "GetChildren() lists the direct children; GetDescendants() includes everything inside them too.",
          "Destroy() removes the object and everything inside it, for good.",
        ],
      },
    ],
    game: {
      name: "Simulator coin spawns",
      text: "Mining and pet simulators keep one coin or ore in ServerStorage and Clone it into the map every few seconds. When a player collects it, the script calls Destroy() so the map never fills up.",
    },
    tryIt: [
      "Make a Part with Instance.new and give it a color and a position.",
      "Put a Part named Coin in ServerStorage and clone it 10 times in a row.",
      "Print the name of everything in workspace with GetChildren.",
    ],
    mistake: {
      error: "The Parent property of Coin is locked, current parent: NULL, new parent Workspace",
      code: "local coin = game.ServerStorage.Coin\ncoin:Destroy()\ncoin.Parent = workspace",
      explain:
        "Destroy() is permanent, so a destroyed object can never come back. Keep the original as a template and Clone() it instead.",
    },
    quiz: {
      question: "You want 20 copies of ServerStorage.Coin in the map. What do you use?",
      options: [
        'Instance.new("Coin") 20 times',
        "template:Clone() in a loop",
        'workspace:FindFirstChild("Coin")',
        "coin:Destroy()",
      ],
      answer: 1,
      why: "Clone() copies an existing object with all its settings. Instance.new only makes blank built-in classes.",
    },
  },

  // ------------------------------------------------------------------ task-library
  {
    id: "task-library",
    chapter: CHAPTERS[6],
    title: "task: waiting and running later",
    minutes: 6,
    summary: "task.wait, task.delay, task.spawn and Debris: timers that don't freeze your script.",
    sections: [
      {
        text: [
          "Games are full of timers: a bomb that explodes in 3 seconds, a power-up that ends after 10, a coin that comes back. The task library schedules all of them.",
        ],
      },
      {
        heading: "The four you'll use",
        list: [
          "task.wait(seconds) pauses this script, then continues.",
          "task.delay(seconds, fn) runs fn later, and the script keeps going right away.",
          "task.spawn(fn) runs fn now, side by side with the rest of the script.",
          "task.cancel(thread) stops something you scheduled.",
        ],
      },
      {
        heading: "delay or wait?",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
print("Bomb planted")

task.delay(3, function()
    print("BOOM")
end)

print("Run!") -- prints right away, before BOOM
`,
        },
        text: [
          "With task.wait(3) the script would stop for 3 seconds before printing Run!. task.delay schedules the explosion and moves on.",
        ],
      },
      {
        heading: "Temporary objects with Debris",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local Debris = game:GetService("Debris")

local spark = Instance.new("Part")
spark.Anchored = true
spark.Parent = workspace
Debris:AddItem(spark, 2) -- destroyed after 2 seconds
`,
        },
        tip: "Don't use the old wait(), spawn() and delay(). The task versions are more accurate and are what Roblox recommends.",
      },
    ],
    game: {
      name: "Bedwars-style item timers",
      text: "Speed potions, shields and cooldowns all start with a task.delay: give the boost now and schedule its end. Nothing ever stops to wait, so every player's timers run at the same time.",
    },
    tryIt: [
      'Print "3", "2", "1", "Go!" one second apart with task.wait.',
      "Schedule a message 5 seconds ahead with task.delay and print something else meanwhile.",
      "Make 10 parts that each disappear after 3 seconds with Debris.",
    ],
    mistake: {
      error: "invalid argument #2 to 'delay' (function or thread expected)",
      code: 'task.delay(3, print("BOOM"))',
      explain:
        'print("BOOM") runs immediately and gives back nothing, so task.delay receives nil. Pass a function instead: task.delay(3, function() print("BOOM") end).',
    },
    quiz: {
      question: 'What prints first?\ntask.delay(1, function() print("A") end)\nprint("B")',
      options: ["A", "B", "Both at once", "Nothing"],
      answer: 1,
      why: "task.delay schedules A for later. The script keeps going and prints B right away.",
    },
  },

  // ------------------------------------------------------------------ attributes
  {
    id: "attributes",
    chapter: CHAPTERS[6],
    title: "Attributes: your own properties",
    minutes: 6,
    summary:
      "Store custom data like Locked, Price or Damage right on a part, and react when it changes.",
    sections: [
      {
        text: [
          "Parts have built-in properties like Size and Color. Attributes let you add your own: a door can have Locked, a coin can have Value, an enemy can have Damage.",
          "Attributes show up at the bottom of the Properties window, so builders can tune the game without touching code.",
        ],
      },
      {
        heading: "Set and read",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local coin = workspace.Coin

coin:SetAttribute("Value", 5)
coin:SetAttribute("Rare", true)

print(coin:GetAttribute("Value"))   -- 5
print(coin:GetAttribute("Missing")) -- nil
`,
        },
      },
      {
        heading: "React to changes",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local door = workspace.Door

door:GetAttributeChangedSignal("Locked"):Connect(function()
    local locked = door:GetAttribute("Locked")
    door.Transparency = if locked then 0 else 0.6
    door.CanCollide = locked
end)

door:SetAttribute("Locked", false) -- the door opens
`,
        },
        tip: "Attributes can hold numbers, text, true/false, Vector3, Color3 and a few more types, but not tables or other objects.",
      },
      {
        heading: "Attributes or value objects?",
        text: [
          "Before attributes, games used IntValue and StringValue objects. Those still matter for leaderstats, but for data that belongs to a part, attributes are simpler: no extra objects cluttering Explorer.",
        ],
      },
    ],
    game: {
      name: "Tower defense games",
      text: "Every tower has attributes like Range, Damage and Level. Upgrading a tower is just SetAttribute, and one targeting script reads them — so a builder can add a new tower in Studio without writing code.",
    },
    tryIt: [
      "Give a part a Damage attribute in the Properties window, then print it from a script.",
      "Make a Locked attribute on a door and open it by setting it to false.",
      "Connect GetAttributeChangedSignal and change the attribute in Play mode to watch it react.",
    ],
    mistake: {
      error: "ServerScriptService.Script:2: attempt to perform arithmetic (add) on nil and number",
      code: 'local coin = workspace.Coin\nlocal total = coin:GetAttribute("value") + 10',
      explain:
        "Attribute names are case-sensitive. The coin has Value, not value, so GetAttribute returns nil. Copy the exact name from the Properties window.",
    },
    quiz: {
      question: "Which line gives a part your own Damage value of 25?",
      options: [
        "part.Damage = 25",
        'part:SetAttribute("Damage", 25)',
        'part:GetAttribute("Damage", 25)',
        'Instance.new("Damage", part)',
      ],
      answer: 1,
      why: "SetAttribute adds or changes an attribute. part.Damage errors, because Damage isn't a real property.",
    },
  },

  // ------------------------------------------------------------------ characters
  {
    id: "characters",
    chapter: CHAPTERS[7],
    title: "Characters and Humanoids",
    minutes: 8,
    summary: "Reach a player's character, change speed and jump, and react when they spawn or die.",
    sections: [
      {
        text: [
          "When a player spawns, Roblox builds a character Model for them in workspace. Inside it, the Humanoid controls health, walking and jumping, and HumanoidRootPart is its center.",
          "A new character is made every time the player respawns, so set it up again each time with CharacterAdded.",
        ],
      },
      {
        heading: "Every spawn",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function(character)
        local humanoid = character:WaitForChild("Humanoid")
        humanoid.WalkSpeed = 24 -- faster than the default 16
        humanoid.JumpPower = 60

        humanoid.Died:Connect(function()
            print(player.Name, "died")
        end)
    end)
end)
`,
        },
      },
      {
        heading: "Useful Humanoid properties",
        list: [
          "Health and MaxHealth: 100 by default.",
          "WalkSpeed: 16 by default.",
          "JumpPower: 50 by default.",
          "humanoid:TakeDamage(10) lowers Health (a ForceField blocks it).",
        ],
      },
      {
        heading: "From a part back to the player",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local Players = game:GetService("Players")

workspace.HealPad.Touched:Connect(function(hit)
    local character = hit.Parent
    local player = Players:GetPlayerFromCharacter(character)
    if player then
        character.Humanoid.Health = character.Humanoid.MaxHealth
    end
end)
`,
        },
        tip: "Players:GetPlayerFromCharacter(model) is nil for NPCs and loose parts, so it's the safest way to know a real player touched something.",
      },
    ],
    game: {
      name: "Parkour and speed run games",
      text: "Speed coils and jump boots are a few lines that change WalkSpeed and JumpPower — plus a CharacterAdded handler that sets them again after every respawn, so the boost isn't lost when you fall.",
    },
    tryIt: [
      "Make every player run at speed 30 using CharacterAdded.",
      "Print a message when a player's Humanoid dies.",
      "Make a pad that heals whoever touches it, using GetPlayerFromCharacter.",
    ],
    mistake: {
      error: "ServerScriptService.Script:3: attempt to index nil with 'Humanoid'",
      code: "game.Players.PlayerAdded:Connect(function(player)\n\tlocal character = player.Character\n\tcharacter.Humanoid.WalkSpeed = 30\nend)",
      explain:
        "When PlayerAdded fires the character hasn't spawned yet, so player.Character is nil. Use player.CharacterAdded:Connect(function(character) … end) instead.",
    },
    quiz: {
      question:
        "You make a player faster in PlayerAdded, but after they die the speed is back to 16. Why?",
      options: [
        "WalkSpeed can't go above 16",
        "Every respawn makes a brand-new character and Humanoid",
        "Died resets every property in the game",
        "Speed only works in a LocalScript",
      ],
      answer: 1,
      why: "Respawning builds a new character, so set it up in CharacterAdded.",
    },
  },

  // ------------------------------------------------------------------ user-input
  {
    id: "user-input",
    chapter: CHAPTERS[7],
    title: "Keyboard and mouse input",
    minutes: 7,
    summary:
      "Run code when a player presses a key or clicks, from a LocalScript with UserInputService.",
    sections: [
      {
        text: [
          "Input happens on the player's own device, so you read it in a LocalScript (for example in StarterPlayerScripts). The server never sees key presses: if a key should change the game, the client tells the server with a RemoteEvent.",
        ],
      },
      {
        heading: "Reacting to a key",
        code: {
          where: "StarterPlayerScripts › LocalScript",
          code: lua`
local UserInputService = game:GetService("UserInputService")

UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if gameProcessed then
        return -- the player is typing in chat or a TextBox
    end
    if input.KeyCode == Enum.KeyCode.E then
        print("E pressed")
    end
end)
`,
        },
        tip: "Always check gameProcessed. Without it, typing a chat message with the letter E would also fire your ability.",
      },
      {
        heading: "Holding a key",
        code: {
          where: "StarterPlayerScripts › LocalScript",
          code: lua`
local UserInputService = game:GetService("UserInputService")
local player = game.Players.LocalPlayer

UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if not gameProcessed and input.KeyCode == Enum.KeyCode.LeftShift then
        player.Character.Humanoid.WalkSpeed = 28 -- sprint
    end
end)

UserInputService.InputEnded:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.LeftShift then
        player.Character.Humanoid.WalkSpeed = 16
    end
end)
`,
        },
        text: [
          "InputBegan fires when the key goes down and InputEnded when it comes back up. Mouse clicks arrive the same way, with input.UserInputType == Enum.UserInputType.MouseButton1.",
        ],
      },
      {
        heading: "Phones and controllers",
        text: [
          "Not everyone has a keyboard. ContextActionService:BindAction binds one action to a key, a gamepad button and an on-screen button for phones in a single call.",
        ],
      },
    ],
    game: {
      name: "Combat games",
      text: "Q to dash and F to block are InputBegan handlers in a LocalScript. They play the animation instantly on the client and fire a RemoteEvent so the server can check the cooldown and apply the effect for everyone.",
    },
    tryIt: [
      'Print "Jump!" when the player presses Space.',
      "Make LeftShift a sprint key with InputBegan and InputEnded.",
      "Type the letter E in the chat and check that your E ability doesn't fire.",
    ],
    mistake: {
      error: "ServerScriptService.Script:2: attempt to index nil with 'Character'",
      code: "local player = game.Players.LocalPlayer\nplayer.Character.Humanoid.WalkSpeed = 28",
      explain:
        "This is a server Script. LocalPlayer only exists in LocalScripts — on the server it's nil. Input code belongs in a LocalScript in StarterPlayerScripts.",
    },
    quiz: {
      question: "Why check gameProcessed in InputBegan?",
      options: [
        "To make the key respond faster",
        "So keys typed in chat or a TextBox don't trigger your code",
        "Because the server needs it",
        "To support game controllers",
      ],
      answer: 1,
      why: "gameProcessed is true when Roblox already used the key, for example while typing in chat.",
    },
  },

  // ------------------------------------------------------------------ remote-functions
  {
    id: "remote-functions",
    chapter: CHAPTERS[8],
    title: "RemoteFunctions: ask and get an answer",
    minutes: 7,
    summary:
      "When the client needs a reply from the server — a price, a check, some data — use a RemoteFunction.",
    sections: [
      {
        text: [
          "A RemoteEvent is a one-way message. A RemoteFunction is a question: the client calls InvokeServer and waits until the server returns an answer.",
        ],
      },
      {
        heading: "The server answers",
        code: {
          where: "ServerScriptService › Shop",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local getPrice = ReplicatedStorage.GetPrice

local PRICES = { Sword = 100, Bow = 60 }

getPrice.OnServerInvoke = function(player, itemName)
    return PRICES[itemName] -- nil for unknown items
end
`,
        },
      },
      {
        heading: "The client asks",
        code: {
          where: "StarterPlayerScripts › LocalScript",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local getPrice = ReplicatedStorage:WaitForChild("GetPrice")

local price = getPrice:InvokeServer("Sword")
print("A sword costs", price)
`,
        },
        tip: "OnServerInvoke is set with =, not :Connect. A question has one answer, so a RemoteFunction has exactly one callback.",
      },
      {
        heading: "Which one to use",
        list: [
          "RemoteEvent: tell the other side something happened (a button was pressed, a round started). Nobody waits.",
          "RemoteFunction: the client needs data back (a price, an inventory, can I buy this?).",
          "Never InvokeClient from the server: a hacked or disconnected client could make the server wait forever.",
        ],
      },
    ],
    game: {
      name: "Trading games",
      text: "When you open a trade, the client asks the server for the other player's inventory with a RemoteFunction. The server returns only what's safe to show — and checks everything again when the trade is confirmed.",
    },
    tryIt: [
      "Make a RemoteFunction GetPrice in ReplicatedStorage and answer it on the server.",
      "Call it from a LocalScript and print the answer.",
      "Ask for an item that doesn't exist and check that you get nil, not an error.",
    ],
    mistake: {
      error:
        "OnServerInvoke is a callback member of RemoteFunction; you can only set the callback value, get is not available",
      code: "getPrice.OnServerInvoke:Connect(function(player, item)\n\treturn 100\nend)",
      explain:
        "OnServerInvoke isn't an event, so it has no :Connect. Assign a function to it: getPrice.OnServerInvoke = function(player, item) … end.",
    },
    quiz: {
      question: "Which call waits for the server's answer?",
      options: [
        "remote:FireServer()",
        "remoteFunction:InvokeServer()",
        "remote.OnClientEvent:Connect()",
        "remote:FireAllClients()",
      ],
      answer: 1,
      why: "InvokeServer sends the question and waits for what OnServerInvoke returns.",
    },
  },

  // ------------------------------------------------------------------ bindables
  {
    id: "bindables",
    chapter: CHAPTERS[8],
    title: "BindableEvents: scripts talking to each other",
    minutes: 6,
    summary:
      "Let one server script tell another that something happened, without RemoteEvents or global variables.",
    sections: [
      {
        text: [
          "RemoteEvents cross between client and server. When two scripts on the same side need to talk — the round script tells the reward script that a round ended — use a BindableEvent.",
        ],
      },
      {
        heading: "Fire and listen",
        code: {
          where: "ServerScriptService › Round",
          code: lua`
local roundEnded = game.ServerStorage.RoundEnded
roundEnded:Fire("Red") -- the winning team
`,
        },
      },
      {
        heading: "In the other script",
        code: {
          where: "ServerScriptService › Rewards",
          code: lua`
local roundEnded = game.ServerStorage.RoundEnded

roundEnded.Event:Connect(function(winner)
    print("Rewards for", winner)
end)
`,
        },
        tip: "Fire the BindableEvent itself and listen on its Event. Keep bindables in ServerStorage so clients can't see them.",
      },
      {
        heading: "Asking for an answer",
        text: [
          "A BindableFunction is to a BindableEvent what a RemoteFunction is to a RemoteEvent: the same idea, but it returns an answer.",
        ],
        code: {
          where: "ServerScriptService › Scores",
          code: lua`
local getScore = Instance.new("BindableFunction")
getScore.Name = "GetScore"
getScore.Parent = game.ServerStorage

local scores = { Ann = 10 }
getScore.OnInvoke = function(name)
    return scores[name] or 0
end

print(getScore:Invoke("Ann")) -- 10
`,
        },
      },
    ],
    game: {
      name: "Minigame collections",
      text: "The lobby, the map loader and the reward system are separate scripts that talk through BindableEvents like RoundStarted and RoundEnded. You can swap the map loader without touching the rewards.",
    },
    tryIt: [
      "Make a BindableEvent RoundEnded in ServerStorage.",
      "Fire it from one Script with a team name and print it in another.",
      "Make a BindableFunction that returns a player's score.",
    ],
    mistake: {
      error: 'Fire is not a valid member of RBXScriptSignal "Event"',
      code: 'local roundEnded = game.ServerStorage.RoundEnded\nroundEnded.Event:Fire("Red")',
      explain:
        "You fire the BindableEvent itself — roundEnded:Fire(…) — and listen on its Event with roundEnded.Event:Connect(…). The Event can't be fired directly.",
    },
    quiz: {
      question: "Two server Scripts need to talk. What do you use?",
      options: ["A RemoteEvent", "A BindableEvent", "A LocalScript", "A ScreenGui"],
      answer: 1,
      why: "Bindables are for scripts on the same side; Remotes cross between client and server.",
    },
  },

  // ------------------------------------------------------------------ project-shop
  {
    id: "project-shop",
    chapter: CHAPTERS[8],
    title: "Project: a coin shop",
    minutes: 15,
    summary:
      "Put it together: leaderstats, a Buy button, a RemoteEvent and a server that checks every purchase.",
    sections: [
      {
        text: [
          "Time to build a real shop. The player clicks Buy, the client asks the server, and the server — the only one you trust — takes the coins and hands over the item.",
        ],
        list: [
          "ServerStorage.Items holds a Tool for each item (Sword, SpeedCoil…).",
          "ReplicatedStorage has a RemoteEvent named BuyItem.",
          "StarterGui has a ScreenGui with a TextButton named BuyButton.",
        ],
      },
      {
        heading: "1. Coins for everyone",
        code: {
          where: "ServerScriptService › Leaderstats",
          code: lua`
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player

    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Value = 200
    coins.Parent = leaderstats
end)
`,
        },
      },
      {
        heading: "2. The button asks",
        code: {
          where: "StarterGui › ShopGui › BuyButton › LocalScript",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local buyItem = ReplicatedStorage:WaitForChild("BuyItem")

script.Parent.Activated:Connect(function()
    buyItem:FireServer("Sword")
end)
`,
        },
      },
      {
        heading: "3. The server decides",
        code: {
          where: "ServerScriptService › Shop",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")
local buyItem = ReplicatedStorage.BuyItem

local PRICES = { Sword = 100, SpeedCoil = 150 }

buyItem.OnServerEvent:Connect(function(player, itemName)
    local price = PRICES[itemName]
    local coins = player.leaderstats.Coins
    if not price or coins.Value < price then
        return -- unknown item or not enough coins
    end
    if player.Backpack:FindFirstChild(itemName) then
        return -- already owns it
    end
    coins.Value -= price
    ServerStorage.Items[itemName]:Clone().Parent = player.Backpack
end)
`,
        },
        tip: "The client only says WHICH item. Price, coins and ownership are all checked on the server, so an exploiter can't buy anything for free.",
      },
    ],
    game: {
      name: "Every simulator's shop",
      text: "Pet, sword and mining simulators all use this exact flow: a button fires a RemoteEvent with an item name, and the server checks the price and the player's money before giving anything.",
    },
    tryIt: [
      "Build the three scripts and buy a Sword in Play mode.",
      "Add a second button for the SpeedCoil.",
      "Try buying the same item twice and check that the second time does nothing.",
    ],
    mistake: {
      error: 'Bow is not a valid member of Folder "ServerStorage.Items"',
      code: "local PRICES = { Sword = 100, Bow = 60 }\nServerStorage.Items[itemName]:Clone().Parent = player.Backpack",
      explain:
        "PRICES sells a Bow, but there's no Tool named Bow in ServerStorage.Items (or it's spelled differently). Every key in PRICES needs a Tool with exactly the same name.",
    },
    quiz: {
      question: "Where must the price check happen?",
      options: [
        "In the button's LocalScript",
        "On the server, in OnServerEvent",
        "In the ScreenGui",
        "It doesn't matter",
      ],
      answer: 1,
      why: "Anything on the client can be changed by an exploiter. Only the server can be trusted with coins.",
    },
  },

  // ------------------------------------------------------------------ project-tycoon
  {
    id: "project-tycoon",
    chapter: CHAPTERS[8],
    title: "Project: a dropper tycoon",
    minutes: 15,
    summary:
      "Droppers make ore, a collector turns it into cash and cash buys upgrades — the core loop of every tycoon.",
    sections: [
      {
        text: [
          "A tycoon is a loop: droppers spawn ore on a timer, ore falls onto a collector, the collector adds cash, and cash buys more droppers. You already know every piece.",
        ],
      },
      {
        heading: "1. The dropper",
        code: {
          where: "Workspace › Dropper › Script",
          code: lua`
local Debris = game:GetService("Debris")
local dropper = script.Parent

while true do
    local ore = Instance.new("Part")
    ore.Size = Vector3.new(1, 1, 1)
    ore.Position = dropper.Position - Vector3.new(0, 2, 0)
    ore:SetAttribute("Value", 5)
    ore.Parent = workspace
    Debris:AddItem(ore, 20) -- clean up ore that falls off
    task.wait(2)
end
`,
        },
      },
      {
        heading: "2. The collector",
        code: {
          where: "Workspace › Collector › Script",
          code: lua`
local collector = script.Parent
local cash = workspace.Cash -- an IntValue

collector.Touched:Connect(function(hit)
    local value = hit:GetAttribute("Value")
    if value then
        cash.Value += value
        hit:Destroy()
    end
end)
`,
        },
        tip: "The collector looks for the Value attribute, so feet and other parts touching it are ignored — only ore pays.",
      },
      {
        heading: "3. Buying upgrades",
        text: [
          "A buy button is a part with a ProximityPrompt. When it's triggered and there's enough cash, subtract the price and Clone the next dropper from ServerStorage into the map.",
        ],
        code: {
          where: "Workspace › BuyDropper › ProximityPrompt (ProximityPrompt) › Script",
          code: lua`
local prompt = script.Parent
local button = prompt.Parent
local cash = workspace.Cash
local PRICE = 100

prompt.Triggered:Connect(function(player)
    if cash.Value >= PRICE then
        cash.Value -= PRICE
        game.ServerStorage.Dropper2:Clone().Parent = workspace
        button:Destroy()
    end
end)
`,
        },
      },
    ],
    game: {
      name: "Restaurant, factory and tycoon games",
      text: "Every tycoon is this loop with nicer models: something produces value, something collects it, and buttons spend it on producers that make value faster. Balance the prices and players keep coming back.",
    },
    tryIt: [
      "Build a dropper and a collector and watch Cash go up in Play mode.",
      "Make a second dropper that drops ore worth 20 every 3 seconds.",
      "Add a buy button with a ProximityPrompt that clones the second dropper.",
    ],
    mistake: {
      error: "Script timeout: exhausted allowed execution time",
      code: 'while true do\n\tlocal ore = Instance.new("Part")\n\tore.Parent = workspace\nend',
      explain:
        "The dropper loop has no task.wait, so it makes parts forever without pausing and the server freezes. Every while-true loop needs a wait.",
    },
    quiz: {
      question: 'Why does the collector check hit:GetAttribute("Value")?',
      options: [
        "To make it faster",
        "So only ore pays — feet and other parts are ignored",
        "Touched needs an attribute to work",
        "To save the cash",
      ],
      answer: 1,
      why: "Anything can touch the collector. Only parts with a Value attribute are ore.",
    },
  },

  // ------------------------------------------------------------------ pcall
  {
    id: "pcall",
    chapter: CHAPTERS[6],
    title: "pcall: code that's allowed to fail",
    minutes: 7,
    summary:
      "Catch errors from DataStores, web requests and risky code, so one failure doesn't break the whole script.",
    sections: [
      {
        text: [
          "Some calls can fail even when your code is perfect: a DataStore is busy, a web request times out, a player leaves halfway. An error stops the script — unless the risky part is wrapped in pcall.",
        ],
      },
      {
        heading: "How pcall works",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local ok, result = pcall(function()
    return 10 / 2
end)
print(ok, result) -- true 5

local ok2, message = pcall(function()
    error("Something broke")
end)
print(ok2, message) -- false, then the error message
`,
        },
      },
      {
        heading: "Saving safely",
        code: {
          where: "ServerScriptService › Data",
          code: lua`
local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("Coins")

local function save(player, coins)
    local ok, err = pcall(function()
        store:SetAsync(player.UserId, coins)
    end)
    if not ok then
        warn("Save failed", player.Name, err)
    end
    return ok
end
`,
        },
        tip: "Only wrap the call that can really fail. A pcall around your whole script hides your own bugs too.",
      },
      {
        heading: "Your own errors",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local function buy(coins, price)
    if price < 0 then
        error("Price can't be negative")
    end
    return coins - price
end

print(pcall(buy, 100, 30)) -- true 70
print(pcall(buy, 100, -5)) -- false and the message
`,
        },
        list: [
          "error(message) stops the function with your own message.",
          "assert(condition, message) errors when the condition is false.",
          "pcall(fn, ...) can pass arguments straight to fn.",
        ],
      },
    ],
    game: {
      name: "Every game that saves progress",
      text: "Popular games wrap every DataStore call in pcall and retry a few times. If saving still fails they warn in the logs and try again later, instead of crashing the script that saves a leaving player.",
    },
    tryIt: [
      'Wrap error("oops") in pcall and print both values it returns.',
      "Write a function that errors on bad input and call it with pcall.",
      "Use assert to check that a number is positive.",
    ],
    mistake: {
      error: "ServerScriptService.Data:4: attempt to index boolean with 'Coins'",
      code: "local data = pcall(function()\n\treturn store:GetAsync(key)\nend)\nprint(data.Coins)",
      explain:
        "pcall returns two things: first whether it worked (true or false), then the result. local data = pcall(...) only keeps the true/false. Write local ok, data = pcall(...).",
    },
    quiz: {
      question: "What does pcall return when the function errors?",
      options: [
        "Nothing, the script stops",
        "false and the error message",
        "true and nil",
        "Only the error message",
      ],
      answer: 1,
      why: "pcall catches the error: the first value is false, the second is the message.",
    },
  },

  // ------------------------------------------------------------------ cframes
  {
    id: "cframes",
    chapter: CHAPTERS[7],
    title: "CFrame: position and rotation",
    minutes: 9,
    summary: "Move, turn and aim parts with CFrame: where a part is plus the direction it faces.",
    sections: [
      {
        text: [
          "Position only says where a part is. A CFrame says where it is AND which way it faces. Teleports, swinging doors, turrets that aim: it's all CFrame.",
        ],
      },
      {
        heading: "Making CFrames",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local block = workspace.Block

block.CFrame = CFrame.new(0, 10, 0) -- move to a point
block.CFrame = CFrame.new(0, 10, 0) * CFrame.Angles(0, math.rad(90), 0) -- and turn 90 degrees
`,
        },
        tip: "CFrame.Angles uses radians. math.rad(90) turns 90 degrees into radians.",
      },
      {
        heading: "Facing something",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local turret = workspace.Turret
local target = workspace.Target

turret.CFrame = CFrame.lookAt(turret.Position, target.Position)
print(turret.CFrame.LookVector) -- the direction it faces
`,
        },
      },
      {
        heading: "Moving relative to a part",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local door = workspace.Door

-- 5 studs forward, in the direction the door faces
door.CFrame = door.CFrame * CFrame.new(0, 0, -5)

-- 3 studs up in the world
door.CFrame = door.CFrame + Vector3.new(0, 3, 0)
`,
        },
        text: [
          "Multiplying by a CFrame moves in the part's own directions (forward is -Z). Adding a Vector3 moves in world directions, whichever way the part faces.",
        ],
      },
    ],
    game: {
      name: "Tower defense and shooter games",
      text: "Turrets aim with CFrame.lookAt every frame, bullets fly along the gun's LookVector, and checkpoints teleport you by setting your HumanoidRootPart's CFrame a little above the pad.",
    },
    tryIt: [
      "Turn a part 45 degrees with CFrame.Angles.",
      "Make a part face another part with CFrame.lookAt.",
      "Move a part 10 studs forward in its own direction.",
    ],
    mistake: {
      error: "Unable to assign property Position. Vector3 expected, got CFrame",
      code: "local part = workspace.Block\npart.Position = CFrame.new(0, 10, 0)",
      explain:
        "Position wants a Vector3. To set a CFrame, assign to part.CFrame — or use Vector3.new(0, 10, 0) for Position.",
    },
    quiz: {
      question: "Which line makes the turret face the target?",
      options: [
        "turret.Position = target.Position",
        "turret.CFrame = CFrame.lookAt(turret.Position, target.Position)",
        "turret.CFrame = target.CFrame",
        "turret.Size = target.Position",
      ],
      answer: 1,
      why: "CFrame.lookAt(from, to) keeps the turret where it is and turns it toward the target.",
    },
  },
];

export const EXTRA_LESSONS: Lesson[] = ORDER.map((id) => LESSONS_BY_ID.find((l) => l.id === id)!);
