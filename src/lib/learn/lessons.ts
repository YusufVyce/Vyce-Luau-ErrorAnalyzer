/**
 * Roblox Studio scripting course, from zero. Every code sample is complete,
 * runnable Luau using current APIs (task.wait, Animator, GetService…). Game
 * references describe how *a feature like the one in that game* can be built;
 * they are not those games' actual source code.
 */
import { CHAPTERS, lua, type Lesson } from "./lessonBase";
import { EXTRA_LESSONS } from "./lessons.extra";

export * from "./lessonBase";

const BASE_LESSONS: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    id: "studio-tour",
    chapter: CHAPTERS[0],
    title: "A tour of Roblox Studio",
    minutes: 5,
    summary: "Find your way around: the 3D viewport, Explorer, Properties and the Output window.",
    sections: [
      {
        text: [
          "Roblox Studio is the free app you use to build Roblox games. Everything you see in a game — the map, the players, the buttons on screen — is an object in Studio, and scripts are how you make those objects do things.",
        ],
        visual: { id: "studio", caption: "The four areas you'll use all the time." },
      },
      {
        heading: "The four panels",
        list: [
          "Viewport (middle): the 3D world. Click a part to select it, drag to move.",
          "Explorer (right): a tree of every object in your game. Scripts live here too.",
          "Properties (right, below Explorer): settings of the selected object — Size, Color, Anchored…",
          "Output (bottom): messages from your scripts and every error. Open it with View → Output. Keep it open always!",
        ],
      },
      {
        heading: "Playing your game",
        text: [
          "Press Play (F5) to test as a player, and Stop (Shift+F5) to go back to editing. Changes you make while playing are thrown away when you stop — edit only after pressing Stop.",
        ],
        tip: "If you can't see Explorer, Properties or Output, open them from the View tab.",
      },
    ],
    tryIt: [
      "Create a new Baseplate place from the Studio start page.",
      "Home tab → Part to insert a block. Move it with the Move tool.",
      "In Properties, tick Anchored so it doesn't fall, and change its Color.",
      "Open View → Output and press Play.",
    ],
    quiz: {
      question: "Where do you look when a script breaks?",
      options: ["The Toolbox", "The Output window", "The Properties window", "The Avatar tab"],
      answer: 1,
      why: "Every error (in red) and every print() shows up in Output, with the script name and line number.",
    },
  },
  {
    id: "first-script",
    chapter: CHAPTERS[0],
    title: "Your first script",
    minutes: 5,
    summary: "Add a Script, print a message and see it in Output.",
    sections: [
      {
        text: [
          "Scripts are objects too. You add them in Explorer: hover over ServerScriptService, click the ⊕ button and choose Script. Studio opens it with one line already written.",
        ],
        visual: {
          id: "explorer",
          caption:
            "Scripts go in different places depending on what they do. Start with ServerScriptService.",
        },
      },
      {
        heading: "Hello world",
        text: [
          "print() writes a message into the Output window. It's the most useful debugging tool you have.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
print("Hello world!")
print("2 + 3 =", 2 + 3)
`,
        },
        tip: "Luau is case-sensitive: print works, Print and PRINT don't exist.",
      },
      {
        heading: "Comments",
        text: ["Anything after -- is a comment. Luau ignores it — it's a note for humans."],
        code: {
          code: lua`
-- This line is ignored
print("This line runs") -- a comment can also go at the end
`,
        },
      },
    ],
    tryIt: [
      "Add a Script to ServerScriptService.",
      'Change the text inside print("...") to your name.',
      "Press Play and find the message in Output.",
    ],
    mistake: {
      error: "ServerScriptService.Script:1: attempt to call a nil value",
      code: 'Print("Hello world!")',
      explain: "Print with a capital P doesn't exist, so it's nil — and you can't call nil.",
    },
    quiz: {
      question: 'What does print("Hi") do?',
      options: [
        "Shows Hi on every player's screen",
        "Writes Hi in the Output window",
        "Prints on paper",
        "Creates a TextLabel",
      ],
      answer: 1,
      why: "print only writes to Output. To show text to players you use GUI objects like TextLabel.",
    },
  },
  {
    id: "script-types",
    chapter: CHAPTERS[0],
    title: "Script, LocalScript, ModuleScript",
    minutes: 8,
    summary: "The server and the client, and which kind of script runs where.",
    sections: [
      {
        text: [
          "A Roblox game runs on one server (Roblox's computer) and on every player's device (the clients). This is the single most important idea in Roblox scripting.",
        ],
        visual: { id: "clientServer" },
      },
      {
        heading: "Which script where?",
        list: [
          "Script — runs on the server. Put it in ServerScriptService (or inside a part in Workspace). Use it for anything important: coins, damage, saving, spawning.",
          "LocalScript — runs on one player's device. Put it in StarterPlayer › StarterPlayerScripts, StarterGui or StarterCharacterScripts. Use it for UI, the camera and keyboard/mouse input.",
          "ModuleScript — shared code that other scripts load with require(). Doesn't run on its own.",
        ],
      },
      {
        heading: "Only the client knows 'me'",
        text: [
          "On a player's device there's exactly one player, so a LocalScript can use Players.LocalPlayer. The server has many players, so LocalPlayer is nil there.",
        ],
        code: {
          where: "StarterPlayer › StarterPlayerScripts › LocalScript",
          code: lua`
local Players = game:GetService("Players")
local player = Players.LocalPlayer

print("Hi " .. player.Name .. ", this runs on your device")
`,
        },
      },
    ],
    game: {
      name: "Arsenal-style shooters",
      text: "Your crosshair, ammo counter and gun sounds are handled by LocalScripts on your device so they feel instant. But whether a shot actually hit someone — and who gets the kill — is decided by a Script on the server, so players can't cheat by editing their own game.",
    },
    mistake: {
      error: "ServerScriptService.Welcome:2: attempt to index nil with 'Name'",
      code: 'local player = game.Players.LocalPlayer\nprint("Welcome " .. player.Name)',
      explain:
        "This is a server Script, where LocalPlayer is always nil. On the server, get players from Players.PlayerAdded instead.",
    },
    quiz: {
      question: "Where should the code that gives players coins run?",
      options: [
        "In a LocalScript, so it's fast",
        "In a Script on the server",
        "In a ModuleScript on its own",
        "It doesn't matter",
      ],
      answer: 1,
      why: "Anything that matters (coins, damage, items) must be done by the server. Clients can be modified by exploiters.",
    },
  },

  // ------------------------------------------------------------------ 2
  {
    id: "variables",
    chapter: CHAPTERS[1],
    title: "Variables and types",
    minutes: 8,
    summary: "Store values in named boxes: numbers, strings, booleans and nil.",
    sections: [
      {
        text: [
          "A variable is a named box that holds a value. Create one with local, a name, = and a value. Later you can read it or put a new value in it.",
        ],
        visual: { id: "variables" },
      },
      {
        code: {
          code: lua`
local coins = 100               -- number
local playerName = "Builderman" -- string (text, in quotes)
local isAlive = true            -- boolean (true or false)
local target = nil              -- nil means "nothing"

coins = coins + 50              -- change it: now 150
print(playerName, "has", coins, "coins")
`,
        },
      },
      {
        heading: "The four basic types",
        list: [
          "number — 5, -3, 2.5",
          'string — text in quotes: "Hello", "Dragon"',
          "boolean — true or false",
          "nil — no value at all. Using nil like an object is the #1 cause of errors.",
        ],
        tip: "Always write local in front of new variables. Use clear names: walkSpeed, not ws.",
      },
    ],
    game: {
      name: "Blox Fruits-style stats",
      text: "A fighting RPG keeps track of values like level (number), equipped fruit (string), whether you're in a safe zone (boolean) and your current target (an object, or nil when you aren't fighting anything). Every one of them is just a variable.",
    },
    mistake: {
      error: "ServerScriptService.Stats:2: attempt to concatenate string with nil",
      code: 'local fruit\nprint("Your fruit: " .. fruit)',
      explain:
        "fruit was declared but never given a value, so it's nil — and nil can't be joined into text.",
    },
    quiz: {
      question: 'What type is "250"?',
      options: ["number", "string", "boolean", "nil"],
      answer: 1,
      why: 'Anything in quotes is a string, even if it looks like a number. Use tonumber("250") to get the number 250.',
    },
  },
  {
    id: "math-strings",
    chapter: CHAPTERS[1],
    title: "Math and text",
    minutes: 7,
    summary: "Calculate rewards and build messages with .., interpolation, tostring and tonumber.",
    sections: [
      {
        code: {
          code: lua`
local price = 250
local multiplier = 2

local reward = price * multiplier -- 500
local half = reward / 2           -- 250
local remainder = 17 % 5          -- 2 (what's left after dividing)
local squared = 4 ^ 2             -- 16

reward += 100                     -- short for reward = reward + 100
print(reward)                     -- 600
`,
        },
      },
      {
        heading: "Working with text",
        code: {
          code: lua`
local name = "Builderman"
local coins = 600

print("Hi " .. name)                         -- join text with ..
print(${"`"}{name} has {coins} coins${"`"})            -- string interpolation (backticks)

local typed = "42"                           -- e.g. from a TextBox
local amount = tonumber(typed)               -- the number 42 (nil if not a number)
print(tostring(amount) .. " coins")          -- number -> text
`,
        },
        tip: "Text from a TextBox is always a string. Convert it with tonumber() before doing math, and check for nil in case the player typed letters.",
      },
    ],
    game: {
      name: "Pet Simulator-style multipliers",
      text: "Pet collecting games are mostly math: coins per second = base income × pet multiplier × any boosts. Something like `local income = 10 * petMultiplier * (hasDoubleCoins and 2 or 1)` is the heart of the whole economy.",
    },
    mistake: {
      error: "ServerScriptService.Shop:2: attempt to perform arithmetic (mul) on string and number",
      code: 'local amount = "ten"\nprint(amount * 2)',
      explain: "\"ten\" is text that isn't a number, so it can't be multiplied.",
    },
    quiz: {
      question: 'What does "5" .. "5" give?',
      options: ["10", '"55"', "25", "an error"],
      answer: 1,
      why: ".. joins text, it doesn't add. Use + for math.",
    },
  },
  {
    id: "if-statements",
    chapter: CHAPTERS[1],
    title: "Making decisions with if",
    minutes: 8,
    summary: "Run code only when something is true, with elseif, else, and, or, not.",
    sections: [
      { visual: { id: "ifFlow" } },
      {
        code: {
          code: lua`
local stage = 10
local hasVip = false

if stage == 10 then
	print("You beat the tower!")
elseif stage >= 5 then
	print("Halfway there")
else
	print("Keep climbing")
end

if stage == 10 and not hasVip then
	print("Buy VIP for a bonus!")
end
`,
        },
      },
      {
        heading: "Comparisons",
        list: [
          "== equal (two = signs!)",
          "~= not equal",
          "<  >  <=  >= smaller / bigger",
          "and, or, not combine conditions",
        ],
        tip: '= puts a value in a variable. == asks "are these equal?". Mixing them up is a classic syntax error.',
      },
    ],
    game: {
      name: "Tower of Hell-style finish line",
      text: "When you touch the top of the tower, the game checks: did you really climb every stage? Is the round still running? Only if both are true do you get the win. That's an if with and.",
    },
    mistake: {
      error: "ServerScriptService.Tower:2: Expected 'then' when parsing if statement, got '='",
      code: 'local stage = 10\nif stage = 10 then\n\tprint("Win!")\nend',
      explain: "Conditions compare with ==. A single = is assignment and isn't allowed inside if.",
    },
    quiz: {
      question: "Which line checks if coins is NOT 0?",
      options: [
        "if coins != 0 then",
        "if coins ~= 0 then",
        "if coins =! 0 then",
        "if not coins = 0 then",
      ],
      answer: 1,
      why: "Luau writes not-equal as ~=.",
    },
  },
  {
    id: "loops",
    chapter: CHAPTERS[1],
    title: "Loops",
    minutes: 8,
    summary: "Repeat code with for and while — and why task.wait() matters.",
    sections: [
      { visual: { id: "loop" } },
      {
        heading: "Counting with for",
        code: {
          code: lua`
for seconds = 10, 1, -1 do       -- start, stop, step
	print("Disaster in " .. seconds)
	task.wait(1)                   -- pause 1 second
end
print("Here it comes!")
`,
        },
      },
      {
        heading: "Going through a list",
        code: {
          code: lua`
for _, player in game.Players:GetPlayers() do
	print(player.Name .. " is in the game")
end
`,
        },
      },
      {
        heading: "Repeating forever",
        code: {
          code: lua`
while true do
	print("Spawning a coin")
	task.wait(5)   -- ALWAYS wait inside a forever-loop
end
`,
        },
        tip: 'A loop without task.wait() never lets the game do anything else. Studio freezes and after a few seconds you get "Script timeout: exhausted allowed execution time".',
      },
    ],
    game: {
      name: "Natural Disaster Survival-style rounds",
      text: "Round games are one big loop: wait in the lobby, count down with a for-loop, pick a disaster, wait until the round ends, give survivors a win, repeat. The whole game is `while true do ... end` with task.wait() in the right places.",
    },
    mistake: {
      error: "Script timeout: exhausted allowed execution time",
      code: "local lava = workspace.Lava\nwhile true do\n\tlava.Size += Vector3.new(0, 0.1, 0)\nend",
      explain:
        "The loop never waits, so it runs millions of times in one frame and Roblox stops the script.",
    },
    quiz: {
      question: "How many times does `for i = 1, 3 do` run?",
      options: ["2", "3", "4", "forever"],
      answer: 1,
      why: "It runs for i = 1, 2 and 3 — both ends are included.",
    },
  },
  {
    id: "functions",
    chapter: CHAPTERS[1],
    title: "Functions",
    minutes: 8,
    summary: "Package code into reusable blocks with parameters and return values.",
    sections: [
      {
        text: [
          "A function is a named piece of code you can run again and again. Parameters are the inputs; return sends a result back.",
        ],
        code: {
          code: lua`
local function calculateDamage(baseDamage, level)
	return baseDamage + level * 2
end

local hit = calculateDamage(10, 50)
print(hit) -- 110

local function heal(humanoid, amount)
	humanoid.Health = math.min(humanoid.Health + amount, humanoid.MaxHealth)
end
`,
        },
        tip: "Define local functions ABOVE the code that calls them. A local only exists from its line downwards.",
      },
      {
        heading: "Functions as event handlers",
        text: [
          "Very often you give a function to Roblox and it calls it for you later — that's how events work (next chapter).",
        ],
        code: {
          code: lua`
local function onPlayerJoined(player)
	print(player.Name .. " joined!")
end

game.Players.PlayerAdded:Connect(onPlayerJoined)
`,
        },
      },
    ],
    game: {
      name: "Blox Fruits-style combat",
      text: "Every attack in a combat game goes through the same few functions: calculateDamage(attacker, move), applyDamage(target, amount), giveXP(player, amount). Writing them once and calling them everywhere keeps hundreds of moves consistent.",
    },
    mistake: {
      error: "ServerScriptService.Combat:3: attempt to call a nil value",
      code: "local BASE = 10\n\nprint(calculateDamage(BASE, 5))\n\nlocal function calculateDamage(base, level)\n\treturn base + level * 2\nend",
      explain:
        "calculateDamage is called on line 3 but only defined on line 5, so it's still nil when line 3 runs.",
    },
    quiz: {
      question: "What does `return` do?",
      options: [
        "Restarts the script",
        "Sends a value back to whoever called the function",
        "Prints a value",
        "Deletes the function",
      ],
      answer: 1,
      why: "return ends the function and hands the value back: local hit = calculateDamage(10, 50).",
    },
  },
  {
    id: "tables",
    chapter: CHAPTERS[1],
    title: "Tables: lists and dictionaries",
    minutes: 10,
    summary: "Store many values in one variable — inventories, configs, player data.",
    sections: [
      { visual: { id: "tables" } },
      {
        heading: "Lists (arrays)",
        code: {
          code: lua`
local pets = {"Dog", "Cat", "Dragon"}

print(pets[1])              -- Dog (lists start at 1!)
table.insert(pets, "Unicorn")
print(#pets)                -- 4 (# = how many)

for index, pet in pets do
	print(index, pet)
end
`,
        },
      },
      {
        heading: "Dictionaries (named keys)",
        code: {
          code: lua`
local dragon = {
	Name = "Shadow Dragon",
	Rarity = "Legendary",
	Power = 950,
}

print(dragon.Rarity)        -- Legendary
dragon.Power += 50

for key, value in dragon do
	print(key, value)
end
`,
        },
        tip: "Reading a key that doesn't exist gives nil, not an error — the error comes later when you use that nil.",
      },
    ],
    game: {
      name: "Adopt Me-style inventories",
      text: "A pet inventory is a list of dictionaries: each pet has a name, rarity, age and whether it's Neon. Trading swaps entries between two players' lists — on the server, of course.",
    },
    mistake: {
      error: "ServerScriptService.Inventory:2: attempt to iterate over a nil value",
      code: "local inventory = {}\nfor _, pet in inventory.Pets do\n\tprint(pet)\nend",
      explain:
        "inventory has no Pets key, so inventory.Pets is nil and there's nothing to loop over.",
    },
    quiz: {
      question: 'local t = {"a", "b", "c"} — what is t[0]?',
      options: ['"a"', "nil", '"c"', "an error"],
      answer: 1,
      why: 'Luau lists start at 1. t[1] is "a" and t[0] is simply nil.',
    },
  },

  // ------------------------------------------------------------------ 3
  {
    id: "parts",
    chapter: CHAPTERS[2],
    title: "Parts, properties and positions",
    minutes: 10,
    summary: "Create and change parts from code with Instance.new, Vector3 and CFrame.",
    sections: [
      { visual: { id: "coordinates" } },
      {
        heading: "Creating a part",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local part = Instance.new("Part")
part.Name = "Platform"
part.Size = Vector3.new(8, 1, 8)
part.Position = Vector3.new(0, 10, 0)
part.Anchored = true
part.Color = Color3.fromRGB(255, 85, 85)
part.Material = Enum.Material.Neon
part.Parent = workspace       -- set Parent last: now it appears
`,
        },
      },
      {
        heading: "Moving and spinning",
        code: {
          code: lua`
local spinner = workspace:WaitForChild("Spinner") -- an anchored part you made

while true do
	spinner.CFrame = spinner.CFrame * CFrame.Angles(0, math.rad(2), 0)
	task.wait()
end
`,
        },
        tip: "Position is only where a part is. CFrame is position + rotation. Use CFrame to rotate things.",
      },
    ],
    game: {
      name: "Tower of Hell-style obstacles",
      text: "Obby games are full of moving and spinning platforms: an anchored part whose CFrame is changed a tiny bit every frame (or tweened, see the Tweens lesson). Neon red parts become kill bricks with one Touched event.",
    },
    mistake: {
      error: "Unable to assign property Position. Vector3 expected, got CFrame",
      code: "local part = workspace.Platform\npart.Position = CFrame.new(0, 10, 0)",
      explain:
        "Position wants a Vector3. Use Vector3.new(0, 10, 0), or assign the CFrame to part.CFrame instead.",
    },
    quiz: {
      question: "Why set Anchored = true on a floating platform?",
      options: [
        "To make it invisible",
        "So gravity doesn't make it fall",
        "To make it deadly",
        "To save it",
      ],
      answer: 1,
      why: "Unanchored parts are simulated by physics and fall down.",
    },
  },
  {
    id: "events",
    chapter: CHAPTERS[2],
    title: "Events: Touched and kill bricks",
    minutes: 10,
    summary: "React to things that happen in the game — and make your first kill brick and coin.",
    sections: [
      { visual: { id: "touched" } },
      {
        heading: "A kill brick",
        text: ["Put this Script inside the part. script.Parent is the part the script is in."],
        code: {
          where: "Workspace › KillBrick › Script",
          code: lua`
local killBrick = script.Parent

killBrick.Touched:Connect(function(hit)
	local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.Health = 0
	end
end)
`,
        },
      },
      {
        heading: "A coin you can collect once",
        text: [
          "Touched fires many times per second while you stand on something. A 'debounce' variable makes sure the code runs only once.",
        ],
        code: {
          where: "Workspace › Coin › Script",
          code: lua`
local coin = script.Parent
local collected = false

coin.Touched:Connect(function(hit)
	if collected then return end
	local player = game.Players:GetPlayerFromCharacter(hit.Parent)
	if not player then return end -- touched by something that isn't a player

	collected = true
	player.leaderstats.Coins.Value += 1 -- see the next lesson for leaderstats
	coin:Destroy()
end)
`,
        },
        tip: "Always check the result of FindFirstChildOfClass / GetPlayerFromCharacter. Hats, tools and random parts touch things too!",
      },
    ],
    game: {
      name: "Obby kill bricks",
      text: "Every obby's lava floor, laser and spinning blade is this exact script. Big games tag all deadly parts with CollectionService so one script handles hundreds of them (you'll do that in the final project).",
    },
    mistake: {
      error: 'Humanoid is not a valid member of Accessory "Workspace.Builderman.CoolHat"',
      code: "script.Parent.Touched:Connect(function(hit)\n\thit.Parent.Humanoid.Health = 0\nend)",
      explain: "The hat's Handle touched the brick, so hit.Parent was the hat, not the character.",
    },
    quiz: {
      question: "Why use a debounce variable on a coin?",
      options: [
        "To make it spin",
        "Touched fires many times — the reward should be given once",
        "To save it to a DataStore",
        "Debounce makes it faster",
      ],
      answer: 1,
      why: "Without it, one touch can give 5–10 coins before the coin disappears.",
    },
  },
  {
    id: "leaderstats",
    chapter: CHAPTERS[2],
    title: "Players and leaderstats",
    minutes: 10,
    summary: "Give every player Coins and Wins that show up on the leaderboard.",
    sections: [
      { visual: { id: "leaderboard" } },
      {
        text: [
          "Roblox shows a leaderboard automatically if a player has a Folder named exactly leaderstats with value objects (IntValue, NumberValue, StringValue) inside.",
        ],
        code: {
          where: "ServerScriptService › Leaderstats (Script)",
          code: lua`
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats" -- must be exactly this, lowercase
	leaderstats.Parent = player

	local coins = Instance.new("IntValue")
	coins.Name = "Coins"
	coins.Value = 0
	coins.Parent = leaderstats

	local wins = Instance.new("IntValue")
	wins.Name = "Wins"
	wins.Parent = leaderstats
end)
`,
        },
      },
      {
        heading: "Passive income",
        code: {
          where: "Same Script, below the code above",
          code: lua`
while true do
	task.wait(10)
	for _, player in Players:GetPlayers() do
		local stats = player:FindFirstChild("leaderstats")
		if stats then
			stats.Coins.Value += 10
		end
	end
end
`,
        },
        tip: "Coins is an IntValue object. The number is in coins.Value — forgetting .Value is a very common mistake.",
      },
    ],
    game: {
      name: "Pet Simulator / simulator games",
      text: "Simulators put everything that matters on the leaderboard: Coins, Gems, Rebirths. The server adds income every few seconds and on every click — exactly like the loop above, with multipliers from pets and boosts.",
    },
    mistake: {
      error: "Infinite yield possible on 'Players.Builderman:WaitForChild(\"leaderstats\")'",
      code: 'local folder = Instance.new("Folder")\nfolder.Name = "Leaderstats"\nfolder.Parent = player',
      explain:
        "The folder is named Leaderstats with a capital L, but scripts wait for leaderstats — names must match exactly.",
    },
    quiz: {
      question: "How do you add 5 coins?",
      options: ["coins += 5", "coins.Value += 5", "coins.Coins = 5", "leaderstats + 5"],
      answer: 1,
      why: "coins is the IntValue object; its number is coins.Value.",
    },
  },
  {
    id: "gui",
    chapter: CHAPTERS[2],
    title: "UI: buttons and labels",
    minutes: 10,
    summary: "Show the player's coins on screen and open a shop with a button.",
    sections: [
      {
        text: [
          "UI lives in StarterGui. Add a ScreenGui, then inside it a TextLabel (text) or TextButton (clickable). When a player spawns, Roblox copies everything from StarterGui into their PlayerGui — so UI scripts are LocalScripts.",
        ],
      },
      {
        heading: "A coin counter",
        code: {
          where: "StarterGui › ScreenGui › CoinsLabel (TextLabel) › LocalScript",
          code: lua`
local player = game.Players.LocalPlayer
local coins = player:WaitForChild("leaderstats"):WaitForChild("Coins")
local label = script.Parent

local function update()
	label.Text = "Coins: " .. coins.Value
end

update()
coins.Changed:Connect(update)
`,
        },
      },
      {
        heading: "A button that opens a shop",
        code: {
          where: "StarterGui › ScreenGui › ShopButton (TextButton) › LocalScript",
          code: lua`
local button = script.Parent
local shopFrame = button.Parent:WaitForChild("ShopFrame")

button.MouseButton1Click:Connect(function()
	shopFrame.Visible = not shopFrame.Visible
end)
`,
        },
        tip: "Size UI with Scale (the first number in UDim2) so it fits phones and PCs: UDim2.fromScale(0.3, 0.1).",
      },
    ],
    game: {
      name: "Dress to Impress-style menus",
      text: "Fashion and roleplay games are mostly UI: category buttons that show/hide frames, item grids, and a few RemoteEvents to tell the server what you picked. Every button is a MouseButton1Click connection like the one above.",
    },
    mistake: {
      error:
        'MouseButton1Click is not a valid member of TextLabel "Players.Builderman.PlayerGui.ScreenGui.ShopButton"',
      code: 'local button = script.Parent\nbutton.MouseButton1Click:Connect(function()\n\tprint("open shop")\nend)',
      explain:
        "ShopButton was created as a TextLabel. Only TextButton and ImageButton can be clicked.",
    },
    quiz: {
      question: "Why does editing game.StarterGui from a script not change what the player sees?",
      options: [
        "StarterGui is only a template copied into PlayerGui",
        "StarterGui is server-only",
        "UI can't be edited by scripts",
        "You need to publish first",
      ],
      answer: 0,
      why: "Players see their own copy in player.PlayerGui. Change that one.",
    },
  },
  {
    id: "tweens",
    chapter: CHAPTERS[2],
    title: "Tweens: smooth animation",
    minutes: 8,
    summary: "Slide doors, pulse buttons and fade parts with TweenService.",
    sections: [
      { visual: { id: "tween" } },
      {
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local TweenService = game:GetService("TweenService")
local door = workspace:WaitForChild("Door") -- an anchored Part

local info = TweenInfo.new(
	1,                        -- duration in seconds
	Enum.EasingStyle.Quad,
	Enum.EasingDirection.Out
)

local openGoal = { Position = door.Position + Vector3.new(0, door.Size.Y, 0) }
local openTween = TweenService:Create(door, info, openGoal)

task.wait(3)
openTween:Play()
`,
        },
      },
      {
        heading: "Tweening UI",
        code: {
          where: "LocalScript inside a TextButton",
          code: lua`
local TweenService = game:GetService("TweenService")
local button = script.Parent
local info = TweenInfo.new(0.15)

button.MouseEnter:Connect(function()
	TweenService:Create(button, info, { Size = UDim2.fromScale(0.22, 0.11) }):Play()
end)
button.MouseLeave:Connect(function()
	TweenService:Create(button, info, { Size = UDim2.fromScale(0.2, 0.1) }):Play()
end)
`,
        },
        tip: "The goal value must be the same type as the property: UDim2 for UI Size/Position, Vector3 for part Size/Position, Color3 for colors.",
      },
    ],
    game: {
      name: "Doors-style doors",
      text: "Horror games open doors, flicker lights and shake cameras with tweens. A door that swings open is a tween of its CFrame (hinged with a rotation), usually triggered by a ProximityPrompt — the next lesson.",
    },
    mistake: {
      error:
        "TweenService:Create property named 'Size' cannot be tweened due to type mismatch (property is a 'UDim2', but given type is 'Vector3')",
      code: "local frame = script.Parent\nTweenService:Create(frame, TweenInfo.new(1), { Size = Vector3.new(1, 1, 1) }):Play()",
      explain: "A Frame's Size is a UDim2, not a Vector3.",
    },
    quiz: {
      question: "Which value can tween a Frame's Position?",
      options: [
        "Vector3.new(0, 1, 0)",
        "UDim2.fromScale(0.5, 0.5)",
        "CFrame.new(0, 1, 0)",
        '"center"',
      ],
      answer: 1,
      why: "GUI positions and sizes are UDim2.",
    },
  },
  {
    id: "prompts",
    chapter: CHAPTERS[2],
    title: "ProximityPrompts: press E to interact",
    minutes: 7,
    summary: "Doors, shops and NPCs that react when a player presses a key nearby.",
    sections: [
      { visual: { id: "prompt" } },
      {
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local door = workspace:WaitForChild("HouseDoor")

local prompt = Instance.new("ProximityPrompt")
prompt.ActionText = "Open"
prompt.ObjectText = "Door"
prompt.KeyboardKeyCode = Enum.KeyCode.E
prompt.HoldDuration = 0.3
prompt.Parent = door

local isOpen = false

prompt.Triggered:Connect(function(player)
	isOpen = not isOpen
	door.Transparency = if isOpen then 0.8 else 0
	door.CanCollide = not isOpen
	prompt.ActionText = if isOpen then "Close" else "Open"
	print(player.Name .. " used the door")
end)
`,
        },
        tip: "Prompts work on PC, phone (tap) and controller automatically — no extra code needed.",
      },
    ],
    game: {
      name: "Brookhaven-style roleplay",
      text: "Roleplay towns are full of prompts: open the house door, sit in the car, pick up an item, ring the doorbell. Each one is a ProximityPrompt whose Triggered event gives you the player who pressed it.",
    },
    mistake: {
      error: 'Triggered is not a valid member of Part "Workspace.HouseDoor"',
      code: 'local door = workspace.HouseDoor\ndoor.Triggered:Connect(function(player)\n\tprint("open")\nend)',
      explain:
        "Triggered is an event of the ProximityPrompt inside the door, not of the door part itself.",
    },
    quiz: {
      question: "What does prompt.Triggered give your function?",
      options: ["The part", "The player who pressed it", "The key they pressed", "Nothing"],
      answer: 1,
      why: "Triggered:Connect(function(player) ... ) — so you know who interacted.",
    },
  },

  // ------------------------------------------------------------------ 4
  {
    id: "remote-events",
    chapter: CHAPTERS[3],
    title: "RemoteEvents: client ↔ server",
    minutes: 12,
    summary: "Let a UI button ask the server to buy something — safely.",
    sections: [
      { visual: { id: "remote" } },
      {
        heading: "Setup",
        list: [
          "In ReplicatedStorage, add a RemoteEvent named BuyItem.",
          "In ServerStorage, add a Folder named Items with a Tool named Sword.",
          "Add a TextButton to a ScreenGui for the LocalScript below.",
        ],
      },
      {
        heading: "Client: send the request",
        code: {
          where: "StarterGui › ScreenGui › BuyButton (TextButton) › LocalScript",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local buyItem = ReplicatedStorage:WaitForChild("BuyItem")

script.Parent.MouseButton1Click:Connect(function()
	buyItem:FireServer("Sword")
end)
`,
        },
      },
      {
        heading: "Server: check everything, then act",
        code: {
          where: "ServerScriptService › Shop (Script)",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")
local buyItem = ReplicatedStorage:WaitForChild("BuyItem")

local PRICES = { Sword = 100 }

-- The first parameter is ALWAYS the player who fired the event.
buyItem.OnServerEvent:Connect(function(player, itemName)
	local price = PRICES[itemName]
	if not price then return end -- unknown item: ignore

	local coins = player.leaderstats.Coins
	if coins.Value < price then return end

	coins.Value -= price
	local tool = ServerStorage.Items[itemName]:Clone()
	tool.Parent = player.Backpack
end)
`,
        },
        tip: "Never let the client send how many coins to add or how much damage to deal. Send what the player wants to do; let the server decide the numbers.",
      },
    ],
    game: {
      name: "Jailbreak-style shops and actions",
      text: "In a cops-and-robbers game, pressing 'arrest' or 'buy gun' on your screen only sends a request. The server checks that you're close enough, on the right team and can afford it — which is why exploiters can't just give themselves money.",
    },
    mistake: {
      error: "FireServer can only be called from the client",
      code: 'local remote = game.ReplicatedStorage.BuyItem\nremote:FireServer("Sword")',
      explain:
        "This code is in a server Script. The server sends to clients with FireClient(player, ...).",
    },
    quiz: {
      question:
        'The client calls buyItem:FireServer("Sword"). What does the server\'s function receive?',
      options: ['("Sword")', '(player, "Sword")', '("Sword", player)', "(player)"],
      answer: 1,
      why: "Roblox adds the player as the first argument automatically.",
    },
  },
  {
    id: "datastores",
    chapter: CHAPTERS[3],
    title: "DataStores: saving progress",
    minutes: 12,
    summary: "Save coins when players leave and load them when they come back.",
    sections: [
      { visual: { id: "datastore" } },
      {
        heading: "Before you start",
        list: [
          "Publish the place (File → Publish to Roblox).",
          "Game Settings → Security → turn on Enable Studio Access to API Services.",
        ],
      },
      {
        code: {
          where: "ServerScriptService › Data (Script) — replaces your leaderstats script",
          code: lua`
local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local coinStore = DataStoreService:GetDataStore("PlayerCoins")

local loaded = {} -- only save players whose data loaded correctly

Players.PlayerAdded:Connect(function(player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	leaderstats.Parent = player

	local coins = Instance.new("IntValue")
	coins.Name = "Coins"
	coins.Parent = leaderstats

	local ok, saved = pcall(function()
		return coinStore:GetAsync("Player_" .. player.UserId)
	end)
	if ok then
		coins.Value = saved or 0 -- saved is nil for brand-new players
		loaded[player] = true
	else
		warn("Could not load data for " .. player.Name .. ": " .. tostring(saved))
	end
end)

local function save(player)
	if not loaded[player] then return end
	local ok, err = pcall(function()
		coinStore:SetAsync("Player_" .. player.UserId, player.leaderstats.Coins.Value)
	end)
	if not ok then
		warn("Could not save data for " .. player.Name .. ": " .. tostring(err))
	end
end

Players.PlayerRemoving:Connect(function(player)
	save(player)
	loaded[player] = nil
end)

game:BindToClose(function()
	for _, player in Players:GetPlayers() do
		save(player)
	end
end)
`,
        },
        tip: "pcall catches errors: if Roblox's servers have a hiccup, your script keeps running. If loading failed, don't save — you'd overwrite the real data with 0.",
      },
    ],
    game: {
      name: "Grow a Garden-style progress",
      text: "Farming games save a lot: coins, every plant in your garden, its growth stage, your seeds. They store it as one table per player (like { Coins = 500, Plants = {...} }) and save it when you leave, when the server shuts down, and every few minutes.",
    },
    mistake: {
      error: "502: API Services rejected request with error. HTTP 403 (Forbidden)",
      code: 'local store = game:GetService("DataStoreService"):GetDataStore("PlayerCoins")\nlocal data = store:GetAsync("Player_1")',
      explain:
        "Studio isn't allowed to use DataStores yet — publish the place and enable API access.",
    },
    quiz: {
      question: "What does GetAsync return for a player who has never played before?",
      options: ["0", "nil", "an empty table", "an error"],
      answer: 1,
      why: "Nothing was saved under that key yet, so you get nil — use `saved or 0`.",
    },
  },
  {
    id: "modules",
    chapter: CHAPTERS[3],
    title: "ModuleScripts: shared code",
    minutes: 8,
    summary: "Keep game data and helper functions in one place that every script can require.",
    sections: [
      { visual: { id: "module" } },
      {
        code: {
          where: "ReplicatedStorage › PetConfig (ModuleScript)",
          code: lua`
local PetConfig = {}

PetConfig.Pets = {
	Dog = { Rarity = "Common", Multiplier = 1.5 },
	Cat = { Rarity = "Rare", Multiplier = 2 },
	Dragon = { Rarity = "Legendary", Multiplier = 10 },
}

function PetConfig.getMultiplier(petName)
	local pet = PetConfig.Pets[petName]
	return if pet then pet.Multiplier else 1
end

return PetConfig
`,
        },
      },
      {
        heading: "Using it",
        code: {
          where: "Any Script or LocalScript",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local PetConfig = require(ReplicatedStorage:WaitForChild("PetConfig"))

print(PetConfig.getMultiplier("Dragon")) -- 10
print(PetConfig.Pets.Cat.Rarity)         -- Rare
`,
        },
        tip: "Modules in ReplicatedStorage can be required by both server and client. Put secret server logic in ServerScriptService or ServerStorage instead.",
      },
    ],
    game: {
      name: "Pet Simulator-style configs",
      text: "Games with hundreds of pets, eggs and upgrades keep all the numbers in ModuleScripts. The shop UI, the hatching script and the income loop all read the same config, so changing one number updates the whole game.",
    },
    mistake: {
      error: "Module code did not return exactly one value",
      code: "local PetConfig = {}\nPetConfig.Pets = { Dog = { Multiplier = 1.5 } }\nfunction PetConfig.getMultiplier(name)\n\treturn PetConfig.Pets[name].Multiplier\nend",
      explain: "The module never returns its table. Add `return PetConfig` as the last line.",
    },
    quiz: {
      question: "What must the last line of a ModuleScript usually be?",
      options: ["end", "return ModuleName", "require()", "print()"],
      answer: 1,
      why: "Whatever the module returns is what require() gives to other scripts.",
    },
  },

  // ------------------------------------------------------------------ 5
  {
    id: "project-obby",
    chapter: CHAPTERS[4],
    title: "Mini project: a coin obby",
    minutes: 25,
    summary: "Put it all together: kill bricks, checkpoints, coins, wins and saving.",
    sections: [
      { visual: { id: "obby", caption: "What you're building." } },
      {
        heading: "1. Build the course",
        list: [
          "Make platforms (anchored parts) from the SpawnLocation to a finish part named Finish.",
          "Make some red parts and, in Properties → Tags, add the tag KillBrick to each.",
          "Put SpawnLocations along the way in a Folder named Checkpoints (keep Neutral ticked).",
          "Add coins: small yellow parts, each with the coin Script below.",
          "Keep your leaderstats Script from before (with Coins and Wins).",
        ],
      },
      {
        heading: "2. All kill bricks, one script",
        code: {
          where: "ServerScriptService › KillBricks",
          code: lua`
local CollectionService = game:GetService("CollectionService")

local function makeDeadly(part)
	part.Touched:Connect(function(hit)
		local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid.Health = 0
		end
	end)
end

for _, part in CollectionService:GetTagged("KillBrick") do
	makeDeadly(part)
end
CollectionService:GetInstanceAddedSignal("KillBrick"):Connect(makeDeadly)
`,
        },
      },
      {
        heading: "3. Checkpoints",
        code: {
          where: "ServerScriptService › Checkpoints",
          code: lua`
local Players = game:GetService("Players")
local checkpoints = workspace:WaitForChild("Checkpoints")

for _, checkpoint in checkpoints:GetChildren() do
	checkpoint.Touched:Connect(function(hit)
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		if player then
			player.RespawnLocation = checkpoint
		end
	end)
end
`,
        },
      },
      {
        heading: "4. Coins that come back",
        code: {
          where: "Workspace › Coin › Script",
          code: lua`
local coin = script.Parent
local COOLDOWN = 10
local available = true

coin.Touched:Connect(function(hit)
	if not available then return end
	local player = game.Players:GetPlayerFromCharacter(hit.Parent)
	if not player then return end

	available = false
	player.leaderstats.Coins.Value += 1
	coin.Transparency = 1
	task.wait(COOLDOWN)
	coin.Transparency = 0
	available = true
end)
`,
        },
      },
      {
        heading: "5. The finish line",
        code: {
          where: "ServerScriptService › Finish",
          code: lua`
local Players = game:GetService("Players")
local finish = workspace:WaitForChild("Finish")
local start = workspace:WaitForChild("SpawnLocation")
local cooldown = {}

finish.Touched:Connect(function(hit)
	local character = hit.Parent
	local player = Players:GetPlayerFromCharacter(character)
	if not player or cooldown[player] then return end

	cooldown[player] = true
	player.leaderstats.Wins.Value += 1
	player.RespawnLocation = nil
	character:PivotTo(start.CFrame + Vector3.new(0, 5, 0))
	task.wait(2)
	cooldown[player] = nil
end)
`,
        },
        tip: "Want wins to save? Combine this with the DataStores lesson and save a table { Coins = ..., Wins = ... }.",
      },
    ],
    game: {
      name: "Tower of Hell & every obby",
      text: "This is the core of the most-played genre on Roblox. Popular obbies add a timer, a stage counter in leaderstats, speed/gravity coils sold for coins and a daily reward — all things you now know how to build.",
    },
    tryIt: [
      "Playtest with 2 players: Test tab → Clients and Servers → 2 Players → Start.",
      "Check that coins only count once per touch and checkpoints work after dying.",
      "Publish and share it with a friend!",
    ],
  },
  {
    id: "debugging",
    chapter: CHAPTERS[4],
    title: "Debugging like a pro",
    minutes: 8,
    summary: "Read errors, find the line, and prove what's going on with print.",
    sections: [
      { visual: { id: "output" } },
      {
        heading: "Step by step",
        list: [
          "Read the FIRST red error in Output — later errors are often caused by the first one.",
          "Click it to jump to the line.",
          "Ask: which value on this line could be nil or the wrong type?",
          "print() that value right above the line and run again.",
          "Fix where the value comes from, not just the line that crashed.",
        ],
      },
      {
        heading: "Print debugging",
        code: {
          code: lua`
local target = workspace:FindFirstChild("Boss")
print("target is", target)                 -- nil? then the name is wrong or it isn't loaded
print("type:", typeof(target))             -- Instance, nil, number, string…

if target then
	print("health:", target.Humanoid.Health)
end
`,
        },
        tip: "Stuck? Paste the error and your script into the Error Analyzer (top of this site). It points at the exact line and tells you why.",
      },
    ],
    mistake: {
      error: "ServerScriptService.Boss:2: attempt to index nil with 'Humanoid'",
      code: 'local boss = workspace:FindFirstChild("boss")\nboss.Humanoid.Health = 0',
      explain: 'FindFirstChild("boss") found nothing because the model is named Boss (capital B).',
    },
    quiz: {
      question: "Output shows 3 errors. Which do you fix first?",
      options: ["The last one", "The first one", "The longest one", "Any of them"],
      answer: 1,
      why: "The first error often causes the others — fix it and they may disappear.",
    },
  },
  // ------------------------------------------------------------------ 6
  {
    id: "collection-service",
    chapter: CHAPTERS[5],
    title: "Tags: one script for many parts",
    minutes: 8,
    summary: "Tag parts and control all of them from a single script with CollectionService.",
    sections: [
      {
        text: [
          "Putting a Script inside every kill brick works — until you have 200 of them and want to change one line. Professional games tag objects instead: every deadly part gets the tag `KillBrick`, and ONE script finds them all.",
          "In Studio, select a part and add a tag under Properties → Tags. In code, the CollectionService gives you every object with a tag.",
        ],
      },
      {
        heading: "One script, every kill brick",
        code: {
          where: "ServerScriptService › KillBricks",
          code: lua`
local CollectionService = game:GetService("CollectionService")

local function makeDeadly(part)
	part.Touched:Connect(function(hit)
		local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid.Health = 0
		end
	end)
end

-- Parts that already have the tag
for _, part in CollectionService:GetTagged("KillBrick") do
	makeDeadly(part)
end

-- Parts tagged later (cloned, spawned or streamed in)
CollectionService:GetInstanceAddedSignal("KillBrick"):Connect(makeDeadly)
`,
        },
      },
      {
        heading: "Tagging from code",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local CollectionService = game:GetService("CollectionService")

local lava = Instance.new("Part")
lava.Name = "Lava"
lava.Anchored = true
lava.Position = Vector3.new(0, 1, 20)
lava.Parent = workspace
CollectionService:AddTag(lava, "KillBrick")

print(CollectionService:HasTag(lava, "KillBrick")) -- true
print(#CollectionService:GetTagged("KillBrick"))   -- 1
`,
        },
        tip: 'Tags are plain text. A typo like "Killbrick" doesn\'t error — it just tags nothing, so copy tag names carefully.',
      },
    ],
    game: {
      name: "Tower of Hell-style obbies",
      text: "Obbies with hundreds of kill bricks, conveyors and jump pads don't copy a script into each one. Every part is tagged (KillBrick, Conveyor, JumpPad) and a handful of scripts in ServerScriptService handle all of them — fix a bug once and every part is fixed.",
    },
    mistake: {
      error: "ServerScriptService.KillBricks:3: attempt to index nil with 'Connect'",
      code: 'local CollectionService = game:GetService("CollectionService")\nlocal bricks = CollectionService:GetTagged("KillBrick")\nbricks.Touched:Connect(function(hit) end)',
      explain:
        "GetTagged returns a list of parts, not one part. A list has no Touched event, so bricks.Touched is nil. Loop over the list and connect each part.",
    },
    quiz: {
      question: 'What does CollectionService:GetTagged("Coin") return?',
      options: [
        "The first coin",
        "A list of every object tagged Coin",
        "How many coins there are",
        "A new Coin part",
      ],
      answer: 1,
      why: "It returns a table (list) you loop over with for … in.",
    },
  },
  {
    id: "runservice",
    chapter: CHAPTERS[5],
    title: "RunService: code that runs every frame",
    minutes: 8,
    summary: "Spin, bob and move things smoothly with Heartbeat and delta time.",
    sections: [
      {
        text: [
          "`RunService.Heartbeat` fires every frame — about 60 times a second. It gives you `dt`: how many seconds passed since the last frame.",
          "Multiply every speed by dt. Then a part spins at the same speed on a fast PC and on a slow phone.",
        ],
      },
      {
        heading: "A spinning obstacle",
        code: {
          where: "ServerScriptService › Spinner",
          code: lua`
local RunService = game:GetService("RunService")

local part = Instance.new("Part")
part.Name = "Spinner"
part.Anchored = true
part.Size = Vector3.new(12, 1, 1)
part.Position = Vector3.new(0, 5, 0)
part.Parent = workspace

local DEGREES_PER_SECOND = 90

RunService.Heartbeat:Connect(function(dt)
	part.CFrame = part.CFrame * CFrame.Angles(0, math.rad(DEGREES_PER_SECOND * dt), 0)
end)
`,
        },
      },
      {
        heading: "A bobbing coin",
        code: {
          where: "ServerScriptService › CoinBob",
          code: lua`
local RunService = game:GetService("RunService")

local coin = Instance.new("Part")
coin.Name = "Coin"
coin.Anchored = true
coin.Position = Vector3.new(0, 5, 10)
coin.Parent = workspace

local startY = coin.Position.Y
local elapsed = 0

RunService.Heartbeat:Connect(function(dt)
	elapsed += dt
	local y = startY + math.sin(elapsed * 3) * 0.5
	coin.Position = Vector3.new(coin.Position.X, y, coin.Position.Z)
end)
`,
        },
        tip: "Heartbeat functions run 60 times a second — keep them short, and never put task.wait() inside one.",
      },
    ],
    game: {
      name: "Simulator coins and obby spinners",
      text: "The coins that float and spin in simulator games, the rotating bars in obbies and the smooth camera in racing games all update every frame from RunService. Using dt keeps them smooth even when the frame rate drops.",
    },
    mistake: {
      error: "Script timeout: exhausted allowed execution time",
      code: "local part = workspace.Spinner\nwhile true do\n\tpart.CFrame = part.CFrame * CFrame.Angles(0, 0.05, 0)\nend",
      explain:
        "This loop never waits, so Roblox never gets a turn to draw a frame and stops the script. Use RunService.Heartbeat instead (or put task.wait() in the loop).",
    },
    quiz: {
      question: "Why multiply speeds by dt?",
      options: [
        "To make things faster",
        "So the speed is the same at any frame rate",
        "Heartbeat won't run without it",
        "To save memory",
      ],
      answer: 1,
      why: "dt is the time since the last frame. speed × dt = distance for that frame, however long the frame took.",
    },
  },
  {
    id: "raycasting",
    chapter: CHAPTERS[5],
    title: "Raycasting: seeing the world",
    minutes: 9,
    summary: "Shoot invisible lines to find what is below, in front of, or between things.",
    sections: [
      {
        text: [
          "A ray is an invisible line with a start point (origin) and a direction. The length of the direction vector is how far it goes.",
          "`workspace:Raycast(origin, direction)` returns a RaycastResult — `Instance`, `Position`, `Normal`, `Distance` — or nil if the ray hit nothing.",
        ],
      },
      {
        heading: "What is below me?",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local origin = Vector3.new(0, 50, 0)
local direction = Vector3.new(0, -100, 0) -- straight down, 100 studs

local result = workspace:Raycast(origin, direction)
if result then
	print("Hit", result.Instance.Name, "at", result.Position)
	print("Distance:", result.Distance)
else
	print("Nothing below")
end
`,
        },
      },
      {
        heading: "Ignoring things",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local params = RaycastParams.new()
params.FilterType = Enum.RaycastFilterType.Exclude
params.FilterDescendantsInstances = { workspace.Baseplate }

local result = workspace:Raycast(Vector3.new(0, 50, 0), Vector3.new(0, -100, 0), params)
print(if result then result.Instance.Name else "Only the Baseplate was below")
`,
        },
        tip: "Always check for nil. A ray that misses returns nil, and reading result.Position would crash.",
      },
    ],
    game: {
      name: "Arsenal-style guns",
      text: "Most Roblox guns are hitscan: when you shoot, the game casts a ray from the barrel towards your mouse and damages whatever it hits first. The server repeats the ray to check the shot was possible — so exploiters can't hit people through walls.",
    },
    mistake: {
      error: "ServerScriptService.Gun:2: attempt to index nil with 'Instance'",
      code: "local result = workspace:Raycast(Vector3.new(0, 50, 0), Vector3.new(0, 10, 0))\nprint(result.Instance.Name)",
      explain:
        "The ray pointed up into empty sky and hit nothing, so Raycast returned nil. Check `if result then` before using it.",
    },
    quiz: {
      question: "What does workspace:Raycast return when the ray hits nothing?",
      options: ["An empty RaycastResult", "nil", "false", "The origin"],
      answer: 1,
      why: "No hit means nil — that's why every raycast needs an if-check.",
    },
  },
  {
    id: "oop",
    chapter: CHAPTERS[5],
    title: "Classes with metatables",
    minutes: 10,
    summary: "Build your own object types — how big games organize pets, towers and enemies.",
    sections: [
      {
        text: [
          "A class is a blueprint. Every object made from it has its own data (name, level) but shares the same functions (methods).",
          "In Luau a class is a table of methods with `__index` pointing to itself. `setmetatable` connects each new object to it, so `object:Method()` finds the function in the class.",
        ],
      },
      {
        heading: "A Pet class",
        code: {
          where: "ServerScriptService › Pets",
          code: lua`
local Pet = {}
Pet.__index = Pet

function Pet.new(name, power)
	local self = setmetatable({}, Pet)
	self.Name = name
	self.Power = power
	self.Level = 1
	return self
end

function Pet:LevelUp()
	self.Level += 1
	self.Power = math.floor(self.Power * 1.5)
end

function Pet:Describe()
	return self.Name .. " (level " .. self.Level .. ", power " .. self.Power .. ")"
end

local dog = Pet.new("Dog", 10)
local dragon = Pet.new("Dragon", 200)
dog:LevelUp()
print(dog:Describe())    -- Dog (level 2, power 15)
print(dragon:Describe()) -- Dragon (level 1, power 200)
`,
        },
      },
      {
        heading: "Dot or colon?",
        text: [
          "`dog:LevelUp()` is short for `Pet.LevelUp(dog)` — the colon passes the object in as `self`. Define methods with a colon and call them with a colon.",
        ],
        tip: "Put classes in a ModuleScript and `return Pet` at the end, so every script can create pets.",
      },
    ],
    game: {
      name: "Tower defense and pet games",
      text: "In a tower defense game every tower is an object made from a Tower class: it has its own range, damage and upgrade level, and shares Attack, Upgrade and Sell methods. Enemies are objects too. Classes keep thousands of lines of game code organized.",
    },
    mistake: {
      error: "ServerScriptService.Pets:13: attempt to index nil with 'Level'",
      code: 'local Pet = {}\nPet.__index = Pet\n\nfunction Pet.new(name)\n\tlocal self = setmetatable({}, Pet)\n\tself.Name = name\n\tself.Level = 1\n\treturn self\nend\n\nfunction Pet:LevelUp()\n\tself.Level += 1\nend\n\nlocal dog = Pet.new("Dog")\ndog.LevelUp()',
      explain:
        "`dog.LevelUp()` with a dot doesn't pass the pet in, so self is nil. Call it with a colon: `dog:LevelUp()`.",
    },
    quiz: {
      question: "What does `Pet.__index = Pet` do?",
      options: [
        "Turns Pet into a number",
        "Lets objects find missing keys (the methods) in Pet",
        "Deletes old pets",
        "Nothing, it's optional",
      ],
      answer: 1,
      why: "When a key isn't in the object itself, Luau looks it up in the metatable's __index — the class.",
    },
  },
  {
    id: "tools",
    chapter: CHAPTERS[5],
    title: "Tools: items players can hold",
    minutes: 9,
    summary: "Make swords, potions and gadgets that do something when the player clicks.",
    sections: [
      {
        text: [
          "A Tool in StarterPack is copied into every player's Backpack. A part named `Handle` inside it is what the character holds in their hand.",
          "`tool.Activated` fires when the player clicks while holding the tool. A Script inside the Tool runs on the server; while the tool is held, `tool.Parent` is the character.",
        ],
      },
      {
        heading: "A healing potion",
        code: {
          where: "StarterPack › HealPotion (Tool) › Script",
          code: lua`
local tool = script.Parent

tool.Activated:Connect(function()
	local character = tool.Parent
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.Health = math.min(humanoid.MaxHealth, humanoid.Health + 25)
		print(character.Name, "healed to", humanoid.Health)
	end
end)
`,
        },
      },
      {
        heading: "A simple sword",
        code: {
          where: "StarterPack › Sword (Tool) › Script",
          code: lua`
local tool = script.Parent
local handle = tool:WaitForChild("Handle")
local swinging = false

tool.Activated:Connect(function()
	swinging = true
	task.wait(0.5)
	swinging = false
end)

handle.Touched:Connect(function(hit)
	if not swinging then return end
	local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
	if humanoid and hit.Parent ~= tool.Parent then
		humanoid:TakeDamage(20)
	end
end)
`,
        },
        tip: "`hit.Parent ~= tool.Parent` stops the sword from hurting its own owner.",
      },
    ],
    game: {
      name: "Sword fighting and BedWars-style items",
      text: "Swords, pickaxes, bows and potions in fighting games are all Tools. The Activated event starts the attack, and the damage is always applied by a server Script — never by the player's own device.",
    },
    mistake: {
      error: 'Activated is not a valid member of Part "Workspace.Sword.Handle"',
      code: 'local tool = script.Parent\ntool.Activated:Connect(function()\n\tprint("swing")\nend)',
      explain:
        "This Script was put inside the Handle, so script.Parent is the Handle part, not the Tool. Put the Script directly inside the Tool.",
    },
    quiz: {
      question: "Where do you put a Tool so every player gets one?",
      options: ["Workspace", "StarterPack", "ServerStorage", "ReplicatedFirst"],
      answer: 1,
      why: "Everything in StarterPack is copied into each player's Backpack when they spawn.",
    },
  },
  {
    id: "round-system",
    chapter: CHAPTERS[5],
    title: "A round-based game loop",
    minutes: 12,
    summary: "Lobby → intermission → round → results: the loop behind most Roblox games.",
    sections: [
      {
        text: [
          "Round games are a state machine: the game is always in one state (waiting, intermission, round, results) and a timer moves it to the next.",
          "The server stores the current state in a StringValue in ReplicatedStorage. Every player's UI just shows that value.",
        ],
      },
      {
        heading: "The round loop",
        code: {
          where: "ServerScriptService › Rounds",
          code: lua`
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local status = Instance.new("StringValue")
status.Name = "Status"
status.Parent = ReplicatedStorage

local INTERMISSION = 10
local ROUND_TIME = 30

local function countdown(label, seconds)
	for t = seconds, 1, -1 do
		status.Value = label .. " " .. t
		task.wait(1)
	end
end

while true do
	if #Players:GetPlayers() == 0 then
		status.Value = "Waiting for players..."
		task.wait(1)
	else
		countdown("Intermission:", INTERMISSION)
		countdown("Round ends in", ROUND_TIME)
		status.Value = "Round over!"
		task.wait(3)
	end
end
`,
        },
      },
      {
        heading: "Showing it to players",
        code: {
          where: "StarterGui › ScreenGui › StatusLabel (TextLabel) › LocalScript",
          code: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local status = ReplicatedStorage:WaitForChild("Status")
local label = script.Parent

label.Text = status.Value
status.Changed:Connect(function(value)
	label.Text = value
end)
`,
        },
        tip: "The round logic lives only on the server. Clients display the status but never decide when a round starts.",
      },
    ],
    game: {
      name: "Murder Mystery and Natural Disaster Survival",
      text: "Both games are this loop: wait for enough players, count down in the lobby, teleport everyone into the round, end it when the timer runs out (or someone wins), show results, repeat. The status text at the top of the screen is a StringValue like the one above.",
    },
    mistake: {
      error: "Script timeout: exhausted allowed execution time",
      code: 'local status = game.ReplicatedStorage.Status\nwhile true do\n\tif #game.Players:GetPlayers() < 2 then\n\t\tstatus.Value = "Waiting..."\n\telse\n\t\ttask.wait(10)\n\tend\nend',
      explain:
        "When there aren't enough players the loop never reaches a task.wait(), so it spins forever. Every path through a while-true loop needs a wait.",
    },
    quiz: {
      question: "Where should the round timer run?",
      options: [
        "In each player's LocalScript",
        "In one server Script",
        "In a ModuleScript by itself",
        "In StarterGui",
      ],
      answer: 1,
      why: "One server Script is the single source of truth; clients only display it.",
    },
  },
];

/** The whole course: the original units, then the newer ones. */
export const LESSONS: Lesson[] = [...BASE_LESSONS, ...EXTRA_LESSONS];

export function analyzerLink(error: string, code: string): string {
  const params = new URLSearchParams({ error, code });
  return `/?${params.toString()}`;
}
