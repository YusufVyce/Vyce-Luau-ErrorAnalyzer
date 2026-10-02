/**
 * The "pro" half of the course, part 2: real game systems, polish & feel,
 * and shipping a game (architecture, performance, monetization, teams and
 * a final project).
 */
import { CHAPTERS, type Lesson } from "./lessonBase";

/** Code sample: drops the first newline and turns 4-space indents into tabs. */
const lua = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values)
    .replace(/^\n/, "")
    .replace(/^( {4})+/gm, (m) => "\t".repeat(m.length / 4))
    .replace(/\s+$/, "");

const BT = "`";

export const PRO_LESSONS_B: Lesson[] = [
  // ------------------------------------------------------------------ inventory-system
  {
    id: "inventory-system",
    chapter: CHAPTERS[12],
    title: "An inventory system",
    minutes: 11,
    summary:
      "Build a reusable inventory module with stacking and slot limits, then put crafting on top of it.",
    sections: [
      {
        text: [
          "Almost every game has an inventory. Instead of scattering item code everywhere, pros write one ModuleScript with a few clear functions — Add, Remove, Count — and every other system uses those.",
        ],
      },
      {
        heading: "The module",
        code: {
          where: "ReplicatedStorage › Inventory (ModuleScript)",
          code: lua`
local Inventory = {}
Inventory.__index = Inventory

local MAX_SLOTS = 20

function Inventory.new()
    return setmetatable({ items = {}, slots = 0 }, Inventory)
end

function Inventory:Add(item, amount)
    amount = amount or 1
    if not self.items[item] then
        if self.slots >= MAX_SLOTS then
            return false -- full
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
        },
      },
      {
        heading: "Using it",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local Inventory = require(game.ReplicatedStorage.Inventory)

local bag = Inventory.new()
bag:Add("Wood", 10)
bag:Add("Stone", 3)
print(bag:Remove("Wood", 4))  -- true
print(bag:Count("Wood"))      -- 6
print(bag:Remove("Stone", 5)) -- false: only 3
`,
        },
      },
      {
        heading: "Crafting on top",
        text: [
          "Because the inventory has a clear set of functions, new features stay short. A crafting recipe checks Count for every ingredient, removes them and adds the result.",
        ],
        code: {
          where: "ServerScriptService › Crafting",
          code: lua`
local Inventory = require(game.ReplicatedStorage.Inventory)

local RECIPES = {
    Axe = { Wood = 3, Stone = 2 },
}

local function craft(bag, itemName)
    local recipe = RECIPES[itemName]
    if not recipe then
        return false
    end
    for ingredient, amount in recipe do
        if bag:Count(ingredient) < amount then
            return false -- missing something
        end
    end
    for ingredient, amount in recipe do
        bag:Remove(ingredient, amount)
    end
    bag:Add(itemName)
    return true
end

local bag = Inventory.new()
bag:Add("Wood", 5)
bag:Add("Stone", 2)
print(craft(bag, "Axe"), bag:Count("Axe"), bag:Count("Wood")) -- true 1 2
`,
        },
        tip: "Keep the real inventory on the server (inside each player's session data) and send the client a copy to draw the UI. The client never changes it directly.",
      },
    ],
    game: {
      name: "Survival and crafting games",
      text: 'Survival games share one Inventory module between gathering, crafting, trading and saving. A tree calls bag:Add("Wood"), the crafting bench calls craft, and the save system stores bag.items — no system needs to know how the others work.',
    },
    tryIt: [
      "Add a Sword recipe that needs 2 Stone and 1 Wood.",
      "Make Inventory:Add refuse amounts below 1.",
      "Write Inventory:List() that returns every item name.",
    ],
    mistake: {
      error: "ServerScriptService.Script:2: attempt to perform arithmetic (add) on nil and number",
      code: 'local items = {}\nitems["Wood"] += 1',
      explain:
        "A new item starts as nil, and nil + 1 fails. Set it to 0 first (items.Wood = items.Wood or 0) — or use a function like Inventory:Add that does it for you.",
    },
    quiz: {
      question: "Why put the inventory in one ModuleScript?",
      options: [
        "ModuleScripts run faster",
        "Every system uses the same Add/Remove/Count, so the rules live in one place",
        "Scripts can't use tables",
        "It saves automatically",
      ],
      answer: 1,
      why: "One module means one set of rules: fix a bug there and every system gets the fix.",
    },
  },

  // ------------------------------------------------------------------ combat
  {
    id: "combat",
    chapter: CHAPTERS[12],
    title: "Combat: hitboxes and damage",
    minutes: 11,
    summary:
      "Find everything inside an attack's hitbox with GetPartBoundsInBox, damage each enemy once and show the hitbox while you test.",
    sections: [
      {
        text: [
          "Touched events are unreliable for fast attacks. Most combat games create a hitbox at the moment of the attack instead: an invisible box in front of the player, and they ask the engine which parts are inside it.",
        ],
      },
      {
        heading: "Asking what's in a box",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local params = OverlapParams.new()
params.FilterType = Enum.RaycastFilterType.Exclude
params.FilterDescendantsInstances = {} -- put the attacker's character here

local target = Instance.new("Part")
target.Anchored = true
target.Position = Vector3.new(0, 5, -4)
target.Parent = workspace

local parts = workspace:GetPartBoundsInBox(CFrame.new(0, 5, -4), Vector3.new(5, 5, 5), params)
print(#parts) -- 1: the target is inside the box
`,
        },
      },
      {
        heading: "Damaging each enemy once",
        code: {
          where: "ServerScriptService › Combat",
          code: lua`
local DAMAGE = 25
local REACH = 6

local function attack(character)
    local root = character.HumanoidRootPart
    local params = OverlapParams.new()
    params.FilterType = Enum.RaycastFilterType.Exclude
    params.FilterDescendantsInstances = { character } -- don't hit yourself

    local boxCFrame = root.CFrame * CFrame.new(0, 0, -REACH / 2) -- in front of you
    local parts = workspace:GetPartBoundsInBox(boxCFrame, Vector3.new(5, 5, REACH), params)

    local hit = {} -- each humanoid only once, even if many of its parts are inside
    for _, part in parts do
        local humanoid = part.Parent:FindFirstChildOfClass("Humanoid")
        if humanoid and not hit[humanoid] and humanoid.Health > 0 then
            hit[humanoid] = true
            humanoid:TakeDamage(DAMAGE)
        end
    end
end

local dummy = workspace.Dummy
game.Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function(character)
        local root = character:WaitForChild("HumanoidRootPart")
        dummy.HumanoidRootPart.CFrame = root.CFrame * CFrame.new(0, 0, -3) -- stand in front
        attack(character)
        print(dummy.Humanoid.Health) -- 75
    end)
end)
`,
        },
      },
      {
        heading: "Seeing your hitbox",
        text: [
          "Hitboxes are invisible, which makes them hard to tune. While you build, draw each one as a see-through red part and delete it a moment later.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local Debris = game:GetService("Debris")

local function showHitbox(cframe, size)
    local box = Instance.new("Part")
    box.Anchored = true
    box.CanCollide = false
    box.CanQuery = false -- so attacks don't find the drawing itself
    box.Transparency = 0.6
    box.Color = Color3.fromRGB(255, 0, 0)
    box.CFrame = cframe
    box.Size = size
    box.Parent = workspace
    Debris:AddItem(box, 0.2)
end

showHitbox(CFrame.new(0, 5, -4), Vector3.new(5, 5, 6))
`,
        },
        tip: "Check the cooldown on the server before making the hitbox. For a snappy feel, the client plays the swing animation and sound right away; the server does the hitbox and damage, so they can't be faked.",
      },
    ],
    game: {
      name: "Battlegrounds games",
      text: "Fighting games make a hitbox for every punch and ability, filter out the attacker, damage each character once and push them back in the attacker's look direction. Players see the animation instantly; the server decides who really got hit.",
    },
    tryIt: [
      "Make the hitbox twice as wide and see how it feels.",
      "Add a 0.5 second cooldown to attack.",
      "Push hit characters back with ApplyImpulse on their HumanoidRootPart.",
    ],
    mistake: {
      error:
        'ServerScriptService.Combat:2: Humanoid is not a valid member of Workspace "Workspace"',
      code: "for _, part in parts do\n\tpart.Parent.Humanoid:TakeDamage(25)\nend",
      explain:
        'The box also finds the floor and walls, whose parent has no Humanoid. Use FindFirstChildOfClass("Humanoid") and skip parts where it returns nil.',
    },
    quiz: {
      question: "Why keep a hit table while looping over the parts?",
      options: [
        "To make it faster",
        "One character has many parts — without it you'd damage them several times",
        "GetPartBoundsInBox needs it",
        "To save hits in a DataStore",
      ],
      answer: 1,
      why: "Head, torso, arms and legs can all be inside the box. The table makes sure each humanoid is hit once.",
    },
  },

  // ------------------------------------------------------------------ npc-ai
  {
    id: "npc-ai",
    chapter: CHAPTERS[12],
    title: "NPC AI: chase and pathfinding",
    minutes: 12,
    summary:
      "Make enemies that find the nearest player, walk around walls with PathfindingService and switch between idle, chase and attack.",
    sections: [
      {
        text: [
          "An NPC is a Model with a Humanoid, just like a player's character. humanoid:MoveTo(position) makes it walk there, and MoveToFinished fires when it arrives (or gives up after 8 seconds).",
          "Smart enemies need to decide two things: where to go (the nearest player) and how to get there (a path around walls).",
        ],
      },
      {
        heading: "Finding the nearest player",
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local Players = game:GetService("Players")

local function nearestPlayer(position, maxDistance)
    local closest, closestDistance = nil, maxDistance
    for _, player in Players:GetPlayers() do
        local character = player.Character
        local root = character and character:FindFirstChild("HumanoidRootPart")
        local humanoid = character and character:FindFirstChildOfClass("Humanoid")
        if root and humanoid and humanoid.Health > 0 then
            local distance = (root.Position - position).Magnitude
            if distance < closestDistance then
                closest, closestDistance = player, distance
            end
        end
    end
    return closest
end

print(nearestPlayer(Vector3.zero, 50)) -- nil: nobody has joined yet
`,
        },
      },
      {
        heading: "Walking a path",
        code: {
          where: "Workspace › Zombie (Model) › Script",
          code: lua`
local PathfindingService = game:GetService("PathfindingService")

local npc = script.Parent
local humanoid = npc:WaitForChild("Humanoid")
local root = npc:WaitForChild("HumanoidRootPart")

local function walkTo(target)
    local path = PathfindingService:CreatePath({ AgentRadius = 2, AgentCanJump = true })
    local ok = pcall(function()
        path:ComputeAsync(root.Position, target)
    end)
    if not ok or path.Status ~= Enum.PathStatus.Success then
        humanoid:MoveTo(target) -- no path: try walking straight there
        return
    end
    for _, waypoint in path:GetWaypoints() do
        if waypoint.Action == Enum.PathWaypointAction.Jump then
            humanoid.Jump = true
        end
        humanoid:MoveTo(waypoint.Position)
        humanoid.MoveToFinished:Wait()
    end
end

walkTo(Vector3.new(20, 3, 0))
print("Arrived!")
`,
        },
      },
      {
        heading: "Idle, chase, attack",
        text: [
          "Good AI switches between a few states. Every loop it looks around and picks one: idle (nobody near), chase (someone in range) or attack (someone very close). This is called a state machine.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local function think(distance)
    if distance == nil or distance > 60 then
        return "Idle"
    elseif distance > 5 then
        return "Chase"
    else
        return "Attack"
    end
end

print(think(nil), think(30), think(3)) -- Idle Chase Attack
`,
        },
        tip: "Don't compute a new path every frame — every 0.5 to 1 second is plenty. In open areas without walls, a plain MoveTo toward the player is cheaper and looks the same.",
      },
    ],
    game: {
      name: "Horror and zombie games",
      text: "Monsters in horror games run a loop: find the nearest player, compute a path around the furniture, walk the waypoints and switch to an attack when close. Recomputing every half second makes them feel smart without lagging the server.",
    },
    tryIt: [
      "Make the zombie walk to the nearest player instead of a fixed point.",
      "Print the state from think every second as you walk closer.",
      "Make the NPC return to where it started when nobody is near.",
    ],
    mistake: {
      error: "Infinite yield possible on 'Workspace.Zombie:WaitForChild(\"Humanoid\")'",
      code: 'local npc = script.Parent\nlocal humanoid = npc:WaitForChild("Humanoid")',
      explain:
        "The model has no Humanoid, so the script waits forever. An NPC needs a Humanoid and a HumanoidRootPart — insert a ready-made rig with the Rig Builder (Avatar tab).",
    },
    quiz: {
      question: "What does humanoid.MoveToFinished:Wait() do in the waypoint loop?",
      options: [
        "Teleports the NPC",
        "Waits until the NPC reaches the waypoint (or gives up) before the next one",
        "Stops the NPC",
        "Computes the path",
      ],
      answer: 1,
      why: "Without it, every MoveTo would replace the last one instantly and the NPC would cut straight through walls.",
    },
  },

  // ------------------------------------------------------------------ quests
  {
    id: "quests",
    chapter: CHAPTERS[12],
    title: "A quest system",
    minutes: 10,
    summary:
      'Track goals like "collect 10 coins" or "defeat 3 zombies" with quests written as data and a tracker that listens to game events.',
    sections: [
      {
        text: [
          "A quest is just data: what to do, how many times, and the reward. Write quests as a table, and one small tracker can run all of them — adding a quest never needs new code.",
        ],
      },
      {
        heading: "Quests as data",
        code: {
          where: "ReplicatedStorage › Quests (ModuleScript)",
          code: lua`
return {
    { Id = "Coins10", Text = "Collect 10 coins", Event = "CoinCollected", Goal = 10, Reward = 50 },
    { Id = "Zombies3", Text = "Defeat 3 zombies", Event = "ZombieDefeated", Goal = 3, Reward = 100 },
}
`,
        },
      },
      {
        heading: "The tracker",
        code: {
          where: "ServerScriptService › QuestTracker",
          code: lua`
local Quests = require(game.ReplicatedStorage.Quests)

local progress = {} -- [quest id] = how far the player is

local function report(eventName, amount)
    for _, quest in Quests do
        local current = progress[quest.Id] or 0
        if quest.Event == eventName and current < quest.Goal then
            current = math.min(quest.Goal, current + (amount or 1))
            progress[quest.Id] = current
            print(${BT}{quest.Text}: {current}/{quest.Goal}${BT})
            if current == quest.Goal then
                print(${BT}Quest complete! +{quest.Reward} coins${BT})
            end
        end
    end
end

for i = 1, 3 do
    report("ZombieDefeated")
end
report("CoinCollected", 4)
`,
        },
        tip: "This tracker keeps one player's progress. In a real game, keep a progress table per player inside their session data, so quests survive rejoining.",
      },
      {
        heading: "Hooking up real events",
        text: [
          'Other systems only announce what happened — they don\'t even know quests exist. A BindableEvent carries the news: the zombie script fires QuestEvent with "ZombieDefeated", the coin script with "CoinCollected".',
        ],
        code: {
          where: "ServerScriptService › Zombies",
          code: lua`
local ServerStorage = game:GetService("ServerStorage")
local questEvent = ServerStorage.QuestEvent -- a BindableEvent

-- the quest tracker listens…
questEvent.Event:Connect(function(playerName, eventName)
    print(playerName, eventName)
end)

-- …and the zombie script just announces
local function onZombieDied(killerName)
    questEvent:Fire(killerName, "ZombieDefeated")
end

onZombieDied("Ann")
`,
        },
      },
    ],
    game: {
      name: "RPGs and battle passes",
      text: "Daily quests, battle passes and achievements are all the same system: a table of goals, a tracker listening to game events, and rewards when a goal is reached. Designers add new quests by adding rows — no new code.",
    },
    tryIt: [
      'Add a quest "Jump 20 times" that listens for a Jumped event.',
      "Give each quest a Reward and add it to a coins variable when it completes.",
      "Make report ignore quests that are already finished.",
    ],
    mistake: {
      error: "ServerScriptService.QuestTracker:6: attempt to compare nil < number",
      code: "if progress[quest.Id] < quest.Goal then\n\tprogress[quest.Id] += 1\nend",
      explain:
        "Before the first report, progress[quest.Id] is nil. Use (progress[quest.Id] or 0) so a quest nobody has started counts as 0.",
    },
    quiz: {
      question: "Why write quests as a table of data?",
      options: [
        "Tables are faster than code",
        "One tracker runs every quest, so adding a quest is just adding a row",
        "Quests must be saved as tables",
        "So players can edit them",
      ],
      answer: 1,
      why: "Data-driven systems grow by adding data, not by copying code.",
    },
  },

  // ------------------------------------------------------------------ wave-spawner
  {
    id: "wave-spawner",
    chapter: CHAPTERS[12],
    title: "Wave spawner",
    minutes: 10,
    summary:
      "Spawn enemies in growing waves, wait until they're all defeated, then start the next — the heart of tower defense and survival games.",
    sections: [
      {
        text: [
          "A wave game repeats one loop: spawn some enemies, wait until they're all gone, take a short break, then do it again with more (or stronger) enemies.",
        ],
      },
      {
        heading: "The wave loop",
        code: {
          where: "ServerScriptService › Waves",
          code: lua`
local enemies = Instance.new("Folder")
enemies.Name = "Enemies"
enemies.Parent = workspace

local function spawnEnemy(wave)
    local enemy = Instance.new("Model")
    enemy.Name = "Zombie"
    local humanoid = Instance.new("Humanoid")
    humanoid.MaxHealth = 50 + wave * 25 -- tougher every wave
    humanoid.Health = humanoid.MaxHealth
    humanoid.Parent = enemy
    enemy.Parent = enemies
    task.delay(1, function()
        enemy:Destroy() -- stands in for players defeating it
    end)
end

for wave = 1, 3 do
    local count = wave * 2
    print(${BT}Wave {wave}: {count} zombies${BT})
    for _ = 1, count do
        spawnEnemy(wave)
        task.wait(0.2)
    end
    while #enemies:GetChildren() > 0 do
        task.wait(0.5) -- wait until every enemy is gone
    end
    print(${BT}Wave {wave} cleared!${BT})
    task.wait(1) -- a short break
end
print("You survived!")
`,
        },
      },
      {
        heading: "Cloning real enemies",
        text: [
          "In a real game the enemy is a finished model in ServerStorage. Clone it, place it at a spawn point with PivotTo and parent it into the Enemies folder.",
        ],
        code: {
          where: "ServerScriptService › Spawner",
          code: lua`
local ServerStorage = game:GetService("ServerStorage")

local function spawnFrom(template, spawnPoint, folder)
    local enemy = template:Clone()
    enemy:PivotTo(spawnPoint.CFrame + Vector3.new(0, 3, 0))
    enemy.Parent = folder
    return enemy
end

local template = ServerStorage.Template
local spawnPoint = workspace.EnemySpawn
local zombie = spawnFrom(template, spawnPoint, workspace)
print(zombie.Parent == workspace) -- true
`,
        },
      },
      {
        heading: "Scaling difficulty",
        text: [
          "Grow the challenge slowly: a few more enemies each wave, a bit more health, and a boss every 5 waves. Keep the numbers in one function so you can balance the game without hunting through code.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local function waveInfo(wave)
    return {
        Count = 3 + wave * 2,
        Health = 100 * 1.15 ^ (wave - 1),
        Boss = wave % 5 == 0,
    }
end

local info = waveInfo(5)
print(info.Count, math.floor(info.Health), info.Boss) -- 13 174 true
`,
        },
        tip: "Count enemies with a folder (or CollectionService tags) instead of a number you add to and subtract from by hand — one missed -1 would freeze the wave forever.",
      },
    ],
    game: {
      name: "Tower defense games",
      text: "Tower defense games are wave spawners with paths: each wave sends more enemies along the waypoints toward your base, the game waits until they're defeated or slip through, then pays you and gives a short break before the next one.",
    },
    tryIt: [
      "Print how many zombies are left every second during a wave.",
      "Spawn a boss with 5 times the health every third wave.",
      "Give every player 10 coins when a wave is cleared.",
    ],
    mistake: {
      error: "The Parent property of Zombie is locked, current parent: NULL, new parent Enemies",
      code: "local template = ServerStorage.Zombie\n\nlocal function spawnEnemy()\n\ttemplate.Parent = workspace.Enemies\n\treturn template\nend",
      explain:
        "Without :Clone() you move the template itself. When that zombie is defeated and destroyed, there's nothing left to spawn. Always spawn template:Clone().",
    },
    quiz: {
      question: "How does the loop know a wave is cleared?",
      options: [
        "It waits a fixed 30 seconds",
        "It waits until the Enemies folder has no children left",
        "Players press a button",
        "The last enemy prints a message",
      ],
      answer: 1,
      why: "Every enemy lives in the folder, so an empty folder means every enemy is gone.",
    },
  },

  // ------------------------------------------------------------------ ui-layout
  {
    id: "ui-layout",
    chapter: CHAPTERS[13],
    title: "Pro UI: scale, layouts and lists",
    minutes: 10,
    summary:
      "Make UI that fits every screen with Scale, AnchorPoint and UIListLayout, and build lists from code.",
    sections: [
      {
        text: [
          "A UDim2 size has two parts: Scale (a fraction of the parent) and Offset (pixels). Pixels look fine on your monitor and terrible on a phone, so pros size almost everything with Scale.",
          "AnchorPoint picks which point of a frame its Position refers to. With AnchorPoint (0.5, 0.5) the frame's center sits at its Position — so Position (0.5, 0.5) centers it on any screen.",
        ],
      },
      {
        heading: "A centered panel",
        code: {
          where: "StarterGui › ShopGui › LocalScript",
          code: lua`
local gui = script.Parent

local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.5) -- the middle of any screen
panel.Size = UDim2.fromScale(0.4, 0.6)      -- 40% wide, 60% tall
panel.Parent = gui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 12)
corner.Parent = panel

local ratio = Instance.new("UIAspectRatioConstraint")
ratio.AspectRatio = 0.75 -- keeps its shape on wide and tall screens
ratio.Parent = panel
`,
        },
      },
      {
        heading: "Lists that arrange themselves",
        code: {
          where: "StarterGui › ShopGui › LocalScript",
          code: lua`
local gui = script.Parent

local list = Instance.new("ScrollingFrame")
list.Size = UDim2.fromScale(0.3, 0.5)
list.AutomaticCanvasSize = Enum.AutomaticSize.Y -- grows with its content
list.CanvasSize = UDim2.new()
list.Parent = gui

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 6)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = list

local ITEMS = { { "Sword", 100 }, { "Bow", 60 }, { "Potion", 25 } }
for i, item in ITEMS do
    local button = Instance.new("TextButton")
    button.Text = ${BT}{item[1]} - {item[2]} coins${BT}
    button.Size = UDim2.new(1, 0, 0, 40) -- full width, 40 pixels tall
    button.LayoutOrder = i
    button.Parent = list
end
print(#list:GetChildren()) -- 3 buttons + the layout
`,
        },
      },
      {
        heading: "Templates beat code",
        text: [
          "Building every frame in code gets long. Many pros design one row in Studio, keep it as a template and Clone it for each item — the layout object does the positioning.",
        ],
        tip: "Test your UI with Studio's device emulator (Test tab → Device) on a phone and a tablet before you publish. Most players are on mobile.",
      },
    ],
    game: {
      name: "Every front-page game",
      text: "Shops, inventories and settings menus in top games are ScrollingFrames with a UIListLayout or UIGridLayout. A script clones one row template per item, and the layout lines them up on every screen size.",
    },
    tryIt: [
      "Change the panel to 60% wide and check it on a phone in the emulator.",
      "Swap UIListLayout for a UIGridLayout with CellSize UDim2.fromScale(0.3, 0.3).",
      "Add a UIPadding so the buttons don't touch the edges.",
    ],
    mistake: {
      error: "Unable to assign property Size. UDim2 expected, got Vector2",
      code: "frame.Size = Vector2.new(0.5, 0.5)",
      explain:
        "UI sizes are UDim2, not Vector2. Use UDim2.fromScale(0.5, 0.5) for half the parent's size.",
    },
    quiz: {
      question: "Which size looks the same on a phone and a PC?",
      options: [
        "UDim2.fromOffset(400, 300)",
        "UDim2.fromScale(0.4, 0.3)",
        "UDim2.new(0, 400, 0, 300)",
        "Vector2.new(400, 300)",
      ],
      answer: 1,
      why: "Scale is a fraction of the parent, so it grows and shrinks with the screen.",
    },
  },

  // ------------------------------------------------------------------ sounds
  {
    id: "sounds",
    chapter: CHAPTERS[13],
    title: "Sound effects and music",
    minutes: 8,
    summary:
      "Play sounds in 3D or everywhere, clean up one-shot effects, loop music and control volume with SoundGroups.",
    sections: [
      {
        text: [
          "A Sound plays the audio in its SoundId. Where you put it matters: inside a Part it's 3D — louder when you're close — while inside SoundService or a GUI it plays at the same volume everywhere.",
        ],
      },
      {
        heading: "A 3D sound on a part",
        code: {
          where: "Workspace › Campfire › Script",
          code: lua`
local fire = script.Parent

local crackle = Instance.new("Sound")
crackle.SoundId = "rbxassetid://9118823101"
crackle.Looped = true
crackle.Volume = 0.6
crackle.RollOffMaxDistance = 60 -- silent beyond 60 studs
crackle.Parent = fire
crackle:Play()
print(crackle.IsPlaying)
`,
        },
      },
      {
        heading: "One-shot effects",
        text: [
          "For a short effect, make a sound, play it and destroy it when it ends — otherwise every coin pickup leaves another Sound behind.",
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local SoundService = game:GetService("SoundService")

local function playOnce(soundId, parent)
    local sound = Instance.new("Sound")
    sound.SoundId = soundId
    sound.Parent = parent or SoundService
    sound:Play()
    sound.Ended:Once(function()
        sound:Destroy() -- clean up when it's done
    end)
end

playOnce("rbxassetid://12222124")
`,
        },
      },
      {
        heading: "Music and volume groups",
        code: {
          where: "ServerScriptService › Music",
          code: lua`
local SoundService = game:GetService("SoundService")

local music = Instance.new("SoundGroup")
music.Name = "Music"
music.Volume = 0.5
music.Parent = SoundService

local track = Instance.new("Sound")
track.SoundId = "rbxassetid://1837849285"
track.Looped = true
track.SoundGroup = music -- the group's volume applies on top
track.Parent = SoundService
track:Play()

music.Volume = 0 -- a settings button can mute all music at once
print(music.Volume)
`,
        },
        tip: "Play UI clicks and personal sounds from a LocalScript so only that player hears them. Sounds the server plays inside a part are heard by everyone nearby.",
      },
    ],
    game: {
      name: "Horror games",
      text: "Horror games live on sound: 3D footsteps that grow louder as the monster comes closer, looping ambience in a SoundGroup, and sudden one-shot stingers. RollOffMaxDistance decides how far away you can hear it coming.",
    },
    tryIt: [
      "Put a looping 3D sound in a part and walk away from it in Play mode.",
      "Make a coin play a pickup sound with playOnce.",
      "Add a Mute button that sets the Music group's Volume to 0.",
    ],
    mistake: {
      error: "Failed to load sound rbxassetid://123: Unable to download sound data",
      code: 'sound.SoundId = "rbxassetid://123"\nsound:Play()',
      explain:
        "The id doesn't point to audio your game can use. Copy the id of a sound you uploaded or one from the Creator Store, and keep the rbxassetid:// prefix.",
    },
    quiz: {
      question: "Where should a sound go so it's louder when players are close?",
      options: ["SoundService", "Inside a Part in workspace", "StarterGui", "ReplicatedStorage"],
      answer: 1,
      why: "Sounds inside parts are positional: their volume depends on the distance to the listener.",
    },
  },

  // ------------------------------------------------------------------ animations
  {
    id: "animations",
    chapter: CHAPTERS[13],
    title: "Playing animations",
    minutes: 9,
    summary:
      "Load animations onto a character's Animator, control priority, speed and looping, and react to markers.",
    sections: [
      {
        text: [
          "Animations are made in the Animation Editor and uploaded to get an id. To play one, make an Animation object with that id and load it onto the Humanoid's Animator. You get an AnimationTrack with Play, Stop and AdjustSpeed.",
        ],
      },
      {
        heading: "Playing an emote",
        code: {
          where: "ServerScriptService › Emotes",
          code: lua`
local Players = game:GetService("Players")

local WAVE = Instance.new("Animation")
WAVE.AnimationId = "rbxassetid://507770239"

Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function(character)
        local animator = character:WaitForChild("Humanoid"):WaitForChild("Animator")
        local track = animator:LoadAnimation(WAVE)
        track:Play()
        print(track.IsPlaying)
    end)
end)
`,
        },
      },
      {
        heading: "Controlling the track",
        code: {
          where: "ServerScriptService › Attacks",
          code: lua`
local Players = game:GetService("Players")

local SLASH = Instance.new("Animation")
SLASH.AnimationId = "rbxassetid://522635514"

Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function(character)
        local animator = character:WaitForChild("Humanoid"):WaitForChild("Animator")
        local track = animator:LoadAnimation(SLASH) -- load once, play many times
        track.Priority = Enum.AnimationPriority.Action -- beats walking and idle
        track.Looped = false
        track.Stopped:Connect(function()
            print("Slash finished")
        end)
        track:Play(0.1)        -- fade in over 0.1 seconds
        track:AdjustSpeed(1.5) -- 50% faster
        task.wait(0.5)
        track:Stop()
    end)
end)
`,
        },
      },
      {
        heading: "Markers: act at the right moment",
        text: [
          'In the Animation Editor you can add a marker — say Impact — on the frame where the sword connects. GetMarkerReachedSignal("Impact") fires at exactly that moment: the perfect time to create the hitbox.',
        ],
        code: {
          where: "ServerScriptService › Script",
          code: lua`
local function onImpact(track, callback)
    return track:GetMarkerReachedSignal("Impact"):Connect(callback)
end

print(typeof(onImpact)) -- function
`,
        },
        tip: "Load each animation once per character and keep the track. Calling LoadAnimation on every attack piles up tracks until Roblox starts warning you.",
      },
    ],
    game: {
      name: "Combat games",
      text: "In combat games every move is an animation track loaded when the character spawns. The attack plays at Action priority, a marker on the hit frame triggers the hitbox, and AdjustSpeed makes attacks faster as weapons are upgraded.",
    },
    tryIt: [
      "Play the wave emote when a player presses E (with a RemoteEvent).",
      "Make an attack 2× faster with AdjustSpeed(2).",
      "Print a message when the track's Stopped event fires.",
    ],
    mistake: {
      error:
        "Failed to load animation with sanitized ID rbxassetid://123456: AnimationClip loaded is not valid.",
      code: 'anim.AnimationId = "rbxassetid://123456"\nanimator:LoadAnimation(anim):Play()',
      explain:
        "Animations only play in games owned by the same user or group that uploaded them. Upload the animation from the account (or group) that owns the game, then use the new id.",
    },
    quiz: {
      question: "Where do you load an animation for a character?",
      options: [
        "workspace",
        "The Humanoid's Animator",
        "ReplicatedStorage",
        "The HumanoidRootPart",
      ],
      answer: 1,
      why: "The Animator (inside the Humanoid) plays tracks on the character's joints.",
    },
  },

  // ------------------------------------------------------------------ camera
  {
    id: "camera",
    chapter: CHAPTERS[13],
    title: "Camera control and effects",
    minutes: 9,
    summary:
      "Move the camera for cutscenes, shake it on explosions and change the field of view — all from LocalScripts.",
    sections: [
      {
        text: [
          "Every player has their own camera: workspace.CurrentCamera in a LocalScript. Set CameraType to Scriptable and the game stops moving it, so you can put it anywhere. Set it back to Custom to give control back to the player.",
        ],
      },
      {
        heading: "A simple cutscene",
        code: {
          where: "StarterPlayer › StarterPlayerScripts › LocalScript",
          code: lua`
local TweenService = game:GetService("TweenService")
local camera = workspace.CurrentCamera

camera.CameraType = Enum.CameraType.Scriptable
camera.CFrame = CFrame.lookAt(Vector3.new(0, 40, 60), Vector3.new(0, 0, 0))

local fly = TweenService:Create(camera, TweenInfo.new(3), {
    CFrame = CFrame.lookAt(Vector3.new(0, 10, 20), Vector3.new(0, 0, 0)),
})
fly:Play()
fly.Completed:Wait()

camera.CameraType = Enum.CameraType.Custom -- back to normal
print("Cutscene over")
`,
        },
      },
      {
        heading: "Camera shake",
        code: {
          where: "StarterPlayer › StarterPlayerScripts › LocalScript",
          code: lua`
local RunService = game:GetService("RunService")
local camera = workspace.CurrentCamera

local function shake(duration, strength)
    local elapsed = 0
    local connection
    connection = RunService.RenderStepped:Connect(function(dt)
        elapsed += dt
        if elapsed > duration then
            connection:Disconnect()
            return
        end
        local offset = Vector3.new(math.random() - 0.5, math.random() - 0.5, 0) * strength
        camera.CFrame *= CFrame.new(offset)
    end)
end

shake(0.4, 1)
`,
        },
      },
      {
        heading: "Field of view and screen effects",
        text: [
          "FieldOfView zooms: 70 is normal, higher feels fast (great while sprinting), lower zooms in. Effects in Lighting — Blur, ColorCorrection, Bloom — can be tweened too, for hit flashes or menus. Made in a LocalScript, they only affect that player.",
        ],
        code: {
          where: "StarterPlayer › StarterPlayerScripts › LocalScript",
          code: lua`
local TweenService = game:GetService("TweenService")
local Lighting = game:GetService("Lighting")
local camera = workspace.CurrentCamera

-- sprint feel: widen the view
TweenService:Create(camera, TweenInfo.new(0.3), { FieldOfView = 85 }):Play()

-- menu feel: blur the world
local blur = Instance.new("BlurEffect")
blur.Size = 0
blur.Parent = Lighting
TweenService:Create(blur, TweenInfo.new(0.3), { Size = 16 }):Play()
`,
        },
        tip: "Always give the camera back (CameraType = Custom) when a cutscene ends — and test what happens if the player resets halfway through.",
      },
    ],
    game: {
      name: "Story games",
      text: "Story games open with a cutscene: the camera is Scriptable, tweens between a few CFrames while dialog plays, shakes when something explodes and hands control back to the player at the end.",
    },
    tryIt: [
      "Make a cutscene with three camera positions in a row.",
      "Shake the camera when the player lands from a high jump.",
      "Widen the FieldOfView while Shift is held.",
    ],
    mistake: {
      error: "Unable to assign property CFrame. CFrame expected, got Vector3",
      code: "camera.CFrame = Vector3.new(0, 10, 0)",
      explain:
        "CFrame needs a CFrame, which includes a rotation. Use CFrame.new(0, 10, 0), or CFrame.lookAt(from, to) to aim it at something.",
    },
    quiz: {
      question: "What must CameraType be before you can move the camera yourself?",
      options: ["Custom", "Scriptable", "Follow", "Attach"],
      answer: 1,
      why: "With Scriptable, the default camera scripts stop moving it, so your CFrame sticks.",
    },
  },

  // ------------------------------------------------------------------ day-night
  {
    id: "day-night",
    chapter: CHAPTERS[13],
    title: "Day-night cycles and atmosphere",
    minutes: 8,
    summary:
      "Move the sun with Lighting.ClockTime, react when night falls and set the mood with Atmosphere and color effects.",
    sections: [
      {
        text: [
          "Lighting.ClockTime is the time of day in hours: 0 is midnight, 6 sunrise, 12 noon, 18 sunset. Change it and the sun, moon, sky and shadows all follow.",
          "A day-night cycle is just a loop that adds a little to ClockTime.",
        ],
      },
      {
        heading: "The cycle",
        code: {
          where: "ServerScriptService › DayNight",
          code: lua`
local Lighting = game:GetService("Lighting")

local DAY_LENGTH = 600 -- one full day takes 10 minutes
local HOURS_PER_SECOND = 24 / DAY_LENGTH

Lighting.ClockTime = 6

while true do
    local dt = task.wait(1)
    Lighting.ClockTime = (Lighting.ClockTime + dt * HOURS_PER_SECOND) % 24
end
`,
        },
      },
      {
        heading: "Doing things at night",
        code: {
          where: "ServerScriptService › StreetLights",
          code: lua`
local Lighting = game:GetService("Lighting")

local function isNight()
    return Lighting.ClockTime >= 18 or Lighting.ClockTime < 6
end

Lighting:GetPropertyChangedSignal("ClockTime"):Connect(function()
    local lamp = workspace.StreetLamp
    lamp.Material = if isNight() then Enum.Material.Neon else Enum.Material.Plastic
end)

Lighting.ClockTime = 20
task.wait()
print(isNight(), workspace.StreetLamp.Material) -- true Enum.Material.Neon
`,
        },
      },
      {
        heading: "Atmosphere and color",
        code: {
          where: "ServerScriptService › Mood",
          code: lua`
local Lighting = game:GetService("Lighting")

local atmosphere = Instance.new("Atmosphere")
atmosphere.Density = 0.35 -- haze in the distance
atmosphere.Parent = Lighting

local grade = Instance.new("ColorCorrectionEffect")
grade.TintColor = Color3.fromRGB(255, 230, 210) -- a warm sunset tint
grade.Contrast = 0.1
grade.Parent = Lighting
`,
        },
        tip: "Run the cycle on the server so every player shares the same time of day. If you jump between times, tween ClockTime so the sky doesn't snap.",
      },
    ],
    game: {
      name: "Survival games",
      text: "In survival games night is dangerous: when ClockTime passes 18 the server spawns more monsters, lamps switch to Neon and the music changes. Morning at 6 sends them away.",
    },
    tryIt: [
      "Make a day last 2 minutes and watch the sun move.",
      "Turn every part tagged Lamp to Neon at night.",
      "Tween ClockTime from 12 to 20 over 5 seconds for a sunset.",
    ],
    mistake: {
      error: "Unable to assign property TimeOfDay. string expected, got number",
      code: "Lighting.TimeOfDay = 14",
      explain: 'TimeOfDay is text like "14:00:00". For a number, use ClockTime = 14.',
    },
    quiz: {
      question: "What does Lighting.ClockTime = 18 show?",
      options: ["Midnight", "Noon", "Sunset", "Sunrise"],
      answer: 2,
      why: "ClockTime is in hours: 18 is 6 PM, when the sun goes down.",
    },
  },

  // ------------------------------------------------------------------ architecture
  {
    id: "architecture",
    chapter: CHAPTERS[14],
    title: "Organizing a big game",
    minutes: 11,
    summary:
      "Structure a project like the pros: one script per side, services and controllers in ModuleScripts, shared code in one place.",
    sections: [
      {
        text: [
          "Small games have dozens of Scripts scattered inside parts. That falls apart at 10,000 lines: nobody knows which script does what, and scripts start in a random order.",
          "Most pro projects use a single-script setup: one Script on the server and one LocalScript on the client, each requiring ModuleScripts — services on the server, controllers on the client.",
        ],
      },
      {
        heading: "Where everything goes",
        list: [
          "ServerScriptService › Main (Script): requires and starts every service.",
          "ServerScriptService › Services: ModuleScripts like DataService, ShopService, CombatService.",
          "StarterPlayerScripts › Main (LocalScript): requires and starts every controller.",
          "StarterPlayerScripts › Controllers: UIController, CameraController, InputController.",
          "ReplicatedStorage › Shared: config tables, utility modules and types both sides use.",
        ],
      },
      {
        heading: "A service",
        code: {
          where: "ServerScriptService › Services › ShopService (ModuleScript)",
          code: lua`
local ShopService = {}

local PRICES = { Sword = 100, Bow = 60 }

function ShopService.GetPrice(itemName)
    return PRICES[itemName]
end

function ShopService.Start()
    print("ShopService started")
end

return ShopService
`,
        },
      },
      {
        heading: "The one Script that starts everything",
        code: {
          where: "ServerScriptService › Main",
          code: lua`
local ServerScriptService = game:GetService("ServerScriptService")

-- require every service first, so they can find each other
local services = {}
for _, module in ServerScriptService.Services:GetChildren() do
    if module:IsA("ModuleScript") then
        services[module.Name] = require(module)
    end
end

-- then start them all
for name, service in services do
    if service.Start then
        task.spawn(service.Start)
    end
end
print("Server ready")
`,
        },
        tip: 'Before writing code, ask "which service owns this?". If two services need the same helper, it belongs in Shared.',
      },
    ],
    game: {
      name: "Studios with many developers",
      text: "In a studio, one developer can own CombatService while another owns ShopService. Each service has a small public API (ShopService.GetPrice), so people can work at the same time without breaking each other's code.",
    },
    tryIt: [
      "Add a DataService module with a Start function and watch Main start it.",
      "Make ShopService use DataService inside Start (not at the top).",
      "Write a client Main LocalScript that starts every controller the same way.",
    ],
    mistake: {
      error: "Requested module was required recursively",
      code: "-- ShopService\nlocal DataService = require(script.Parent.DataService)\n\n-- DataService\nlocal ShopService = require(script.Parent.ShopService)",
      explain:
        "Two modules that require each other at the top wait for each other forever. Let the loader require everything first, and only use other services inside Start.",
    },
    quiz: {
      question: "In a single-script setup, what does the server's Main script do?",
      options: [
        "Contains all the game code",
        "Requires every service module and starts them",
        "Only saves data",
        "Runs on the client",
      ],
      answer: 1,
      why: "Main is a tiny loader; the real code lives in the service modules.",
    },
  },

  // ------------------------------------------------------------------ performance
  {
    id: "performance",
    chapter: CHAPTERS[14],
    title: "Performance and memory leaks",
    minutes: 10,
    summary:
      "Keep servers smooth for hours: disconnect events, destroy what you create, avoid busy loops and measure before you optimize.",
    sections: [
      {
        text: [
          "A game that runs fine for 5 minutes can crawl after 5 hours. The usual causes: connections that are never disconnected, objects that are never destroyed, tables that keep growing, and loops that do too much work every frame.",
        ],
      },
      {
        heading: "Disconnect what you connect",
        code: {
          where: "ServerScriptService › Spinner",
          code: lua`
local RunService = game:GetService("RunService")

local part = Instance.new("Part")
part.Anchored = true
part.Parent = workspace

local spin = RunService.Heartbeat:Connect(function(dt)
    part.CFrame *= CFrame.Angles(0, dt, 0)
end)

task.wait(2)
spin:Disconnect() -- stop updating it
part:Destroy()    -- Destroy also disconnects the part's own events
print(spin.Connected) -- false
`,
        },
      },
      {
        heading: "Clean up per-player data",
        code: {
          where: "ServerScriptService › ChatLog",
          code: lua`
local Players = game:GetService("Players")

local connections = {} -- [player] = their connections

Players.PlayerAdded:Connect(function(player)
    connections[player] = {
        player.Chatted:Connect(function(message)
            print(player.Name .. ": " .. message)
        end),
    }
end)

Players.PlayerRemoving:Connect(function(player)
    for _, connection in connections[player] or {} do
        connection:Disconnect()
    end
    connections[player] = nil -- or this table grows forever
end)
`,
        },
      },
      {
        heading: "Do less work",
        list: [
          "Don't run heavy code every frame: if checking every 0.2 seconds is enough, use a loop with task.wait(0.2) instead of Heartbeat.",
          "Never write while true do without a task.wait inside — it freezes the server.",
          "Reuse objects (a pool of bullets) instead of creating and destroying hundreds every second.",
          "Measure first: the MicroProfiler (Ctrl+F6) and the Developer Console (F9) show what's really slow.",
        ],
        tip: "Debris:AddItem(part, 5) destroys a part after 5 seconds without keeping a loop or thread alive — perfect for effects.",
      },
    ],
    game: {
      name: "Games with long sessions",
      text: "Idle and tycoon games keep servers running for many hours. Their developers watch the Memory tab in the Developer Console: if a number only ever goes up, something is leaking — usually a connection or a table entry that's never removed.",
    },
    tryIt: [
      "Make a part spin with Heartbeat and stop it after 5 seconds.",
      "Count how many entries a per-player table has after players leave.",
      "Replace a Heartbeat check with a loop that runs every 0.5 seconds.",
    ],
    mistake: {
      error: "Script timeout: exhausted allowed execution time",
      code: "while true do\n\tcheckPlayers()\nend",
      explain:
        "A loop without a wait never lets the rest of the game run. Put task.wait(0.5) (or whatever delay you need) inside the loop.",
    },
    quiz: {
      question:
        "What happens to a table that stores something per player if you never clear it in PlayerRemoving?",
      options: [
        "Nothing",
        "It grows for as long as the server runs — a memory leak",
        "Roblox clears it automatically",
        "It errors right away",
      ],
      answer: 1,
      why: "The table keeps every player who ever joined, so memory use only goes up.",
    },
  },

  // ------------------------------------------------------------------ monetization
  {
    id: "monetization",
    chapter: CHAPTERS[14],
    title: "Game passes and developer products",
    minutes: 11,
    summary:
      "Sell one-time game passes and repeatable developer products the right way — with server checks and ProcessReceipt.",
    sections: [
      {
        text: [
          "Game passes are bought once and owned forever (VIP, double coins, a special gear). Developer products can be bought again and again (100 coins, a revive). You create both on the Creator Hub, and each gets an id.",
          "Purchases are handled by the server. The client only opens the purchase window.",
        ],
      },
      {
        heading: "Checking a game pass",
        code: {
          where: "ServerScriptService › GamePasses",
          code: lua`
local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")

local VIP_PASS_ID = 123456789

Players.PlayerAdded:Connect(function(player)
    local ok, owns = pcall(
        MarketplaceService.UserOwnsGamePassAsync,
        MarketplaceService,
        player.UserId,
        VIP_PASS_ID
    )
    if ok and owns then
        player:SetAttribute("VIP", true)
        print(player.Name .. " is VIP")
    end
end)
`,
        },
      },
      {
        heading: "Selling developer products",
        code: {
          where: "ServerScriptService › Products",
          code: lua`
local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")

local PRODUCTS = {
    [111111] = function(player) -- 100 coins
        player.leaderstats.Coins.Value += 100
    end,
    [222222] = function(player) -- full health
        local humanoid = player.Character.Humanoid
        humanoid.Health = humanoid.MaxHealth
    end,
}

MarketplaceService.ProcessReceipt = function(receipt)
    local player = Players:GetPlayerByUserId(receipt.PlayerId)
    local grant = PRODUCTS[receipt.ProductId]
    if not player or not grant then
        return Enum.ProductPurchaseDecision.NotProcessedYet -- try again later
    end
    local ok = pcall(grant, player)
    if not ok then
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end
    print(player.Name .. " bought product " .. receipt.ProductId)
    return Enum.ProductPurchaseDecision.PurchaseGranted
end
`,
        },
        tip: "Return PurchaseGranted only after the reward is really given (and saved). If anything fails, return NotProcessedYet and Roblox tries again later — the player never pays for nothing.",
      },
      {
        heading: "Opening the purchase window",
        code: {
          where: "StarterGui › ShopGui › BuyCoins (TextButton) › LocalScript",
          code: lua`
local MarketplaceService = game:GetService("MarketplaceService")
local player = game:GetService("Players").LocalPlayer

script.Parent.Activated:Connect(function()
    MarketplaceService:PromptProductPurchase(player, 111111)
end)
`,
        },
      },
    ],
    game: {
      name: "Free-to-play hits",
      text: "Popular free games earn from passes that feel fair (VIP chat tags, extra storage, faster hatching) and products bought in the moment (a revive right before losing a boss fight). ProcessReceipt with retries makes sure every Robux spent turns into a reward.",
    },
    tryIt: [
      "Give VIP players a gold name tag using the VIP attribute.",
      "Add a 500-coin product to PRODUCTS.",
      "Make a button that opens the VIP pass purchase with PromptGamePassPurchase.",
    ],
    mistake: {
      error:
        "ProcessReceipt is a callback member of MarketplaceService; you can only set the callback value, get is not available",
      code: "MarketplaceService.ProcessReceipt:Connect(function(receipt)\nend)",
      explain:
        "ProcessReceipt isn't an event — it's a callback you assign once: MarketplaceService.ProcessReceipt = function(receipt) … end. Only one script in the game should set it.",
    },
    quiz: {
      question: "What should ProcessReceipt return when giving the reward failed?",
      options: ["PurchaseGranted", "NotProcessedYet", "nil", "false"],
      answer: 1,
      why: "NotProcessedYet tells Roblox to try again later, so the player still gets what they paid for.",
    },
  },

  // ------------------------------------------------------------------ teams
  {
    id: "teams",
    chapter: CHAPTERS[14],
    title: "Teams and team games",
    minutes: 9,
    summary: "Create teams, balance players between them, stop friendly fire and keep team scores.",
    sections: [
      {
        text: [
          "The Teams service holds Team objects. Setting player.Team puts a player on a team: their name shows in the team's color in the player list, and SpawnLocations with a matching TeamColor spawn them at the right base.",
        ],
      },
      {
        heading: "Creating and balancing teams",
        code: {
          where: "ServerScriptService › TeamSetup",
          code: lua`
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
    -- join whichever team has fewer players
    player.Team = if #red:GetPlayers() <= #blue:GetPlayers() then red else blue
    print(player.Name .. " joined team " .. player.Team.Name)
end)
`,
        },
      },
      {
        heading: "No friendly fire",
        code: {
          where: "ServerScriptService › Combat",
          code: lua`
local Players = game:GetService("Players")

local function canDamage(attacker, victimCharacter)
    local victim = Players:GetPlayerFromCharacter(victimCharacter)
    if not victim then
        return true -- NPCs can always be hit
    end
    return victim.Team ~= attacker.Team
end

print(canDamage(nil, workspace.Baseplate)) -- true: not a player
`,
        },
      },
      {
        heading: "Team scores",
        code: {
          where: "ServerScriptService › Score",
          code: lua`
local Teams = game:GetService("Teams")

local red = Instance.new("Team")
red.Name = "Red"
red.Parent = Teams

local scores = {}
for _, team in Teams:GetTeams() do
    scores[team] = 0
end

local function addPoint(team)
    scores[team] += 1
    print(${BT}{team.Name}: {scores[team]}${BT})
    if scores[team] >= 3 then
        print(team.Name .. " wins!")
    end
end

for _ = 1, 3 do
    addPoint(red)
end
`,
        },
        tip: "Team.AutoAssignable = true lets Roblox balance new players for you. Set it to false when your round script picks the teams itself.",
      },
    ],
    game: {
      name: "Capture the flag and team shooters",
      text: "Team games pick teams at the start of each round, spawn players at their team's base, block friendly fire on the server and count points per team. The first team to the target score wins the round.",
    },
    tryIt: [
      "Add a third team and keep all three balanced.",
      "Make players switch teams when a new round starts.",
      "Give every player on the winning team 25 coins.",
    ],
    mistake: {
      error: "Unable to assign property Team. Object expected, got string",
      code: 'player.Team = "Red"',
      explain: "Team wants the Team object, not its name: player.Team = Teams.Red.",
    },
    quiz: {
      question: "How do you stop friendly fire?",
      options: [
        "Skip the damage when the victim's Team is the attacker's Team",
        "Set CanCollide to false",
        "Give everyone a ForceField",
        "Use two different places",
      ],
      answer: 0,
      why: "The server compares the two teams before applying any damage.",
    },
  },

  // ------------------------------------------------------------------ capstone
  {
    id: "capstone",
    chapter: CHAPTERS[14],
    title: "Final project: ship a complete game",
    minutes: 14,
    summary:
      "Plan, build, test and publish a full mini-game with everything from the course — the step from learner to scripter.",
    sections: [
      {
        text: [
          'You now know the tools professional Roblox scripters use every day. The last step is putting them together into something people can play: a "coin rush" arena with rounds, teams, a shop, saving and a global leaderboard.',
          "Don't build everything at once. Ship a small version first, then add features one at a time and test after each one.",
        ],
      },
      {
        heading: "The plan",
        list: [
          "DataService: session data with retries, autosave and BindToClose.",
          "RoundService: intermission → 60-second round → results, with teams.",
          "CoinService: spawns coins each round; the server checks every pickup.",
          "ShopService: a RemoteFunction for prices and a checked, rate-limited RemoteEvent to buy.",
          "UI controllers: a Scale-based HUD, a shop list and a round timer.",
          "A global leaderboard of total coins with an OrderedDataStore.",
        ],
      },
      {
        heading: "Coin pickups the safe way",
        code: {
          where: "ServerScriptService › Services › CoinService (ModuleScript)",
          code: lua`
local Players = game:GetService("Players")

local CoinService = {}

local VALUE = 5
local MAX_PICKUP_DISTANCE = 10

function CoinService.Spawn(position)
    local coin = Instance.new("Part")
    coin.Name = "Coin"
    coin.Anchored = true
    coin.CanCollide = false
    coin.Position = position
    coin.Parent = workspace

    local taken = false
    coin.Touched:Connect(function(hit)
        local player = Players:GetPlayerFromCharacter(hit.Parent)
        if not player or taken then
            return
        end
        local root = hit.Parent:FindFirstChild("HumanoidRootPart")
        if not root or (root.Position - coin.Position).Magnitude > MAX_PICKUP_DISTANCE then
            return -- can't grab a coin from across the map
        end
        taken = true
        player.leaderstats.Coins.Value += VALUE
        coin:Destroy()
    end)
    return coin
end

return CoinService
`,
        },
      },
      {
        heading: "Your launch checklist",
        list: [
          "Every remote checks its arguments and is rate-limited.",
          "Data saves on leave, on shutdown and every few minutes — and never saves data that failed to load.",
          "No while true loop without task.wait, and every per-player connection and table entry is cleaned up.",
          "The UI is tested on phone, tablet and PC with the device emulator.",
          "Playtested with 2+ players (Test tab → Clients and Servers) to catch replication bugs.",
          "Icon, thumbnails, description and settings are filled in before you publish.",
        ],
        tip: "After launch, read your analytics on the Creator Hub: retention and session length tell you what to fix next. Update often — games grow with their players.",
      },
    ],
    game: {
      name: "Your own game",
      text: "Every front-page game started as a small first version. Publish yours, invite friends, watch how they play and keep improving it — that loop is what turns a scripter into a game developer.",
    },
    tryIt: [
      "Write the plan for your own game as a list of services and controllers.",
      "Build CoinService and test pickups with two players in Studio.",
      "Publish the game (File → Publish to Roblox) and share it with a friend.",
    ],
    mistake: {
      error:
        "DataStoreService: StudioAccessToApisNotAllowed: Studio access to APIs is not allowed. API: GetAsync, Data Store: PlayerData",
      code: 'local data = store:GetAsync("Player_" .. player.UserId)',
      explain:
        'DataStores in Studio need the game to be published and "Enable Studio Access to API Services" turned on in Game Settings → Security.',
    },
    quiz: {
      question: "What's the best way to build a big game?",
      options: [
        "Write everything in one huge script",
        "Ship a small version first, then add and test one feature at a time",
        "Use as many free models as possible",
        "Add every feature before testing anything",
      ],
      answer: 1,
      why: "Small, tested steps find bugs early and get your game in front of players sooner.",
    },
  },
];
