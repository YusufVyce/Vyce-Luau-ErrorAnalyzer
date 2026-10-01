/** Example of every error family the analyzer knows, for the /errors page. */
export interface LibraryEntry {
  group: string;
  log: string;
  code?: string;
}

export const ERROR_LIBRARY: LibraryEntry[] = [
  // nil & types
  {
    group: "Nil values",
    log: "ServerScriptService.Script:3: attempt to index nil with 'Value'",
    code: 'local stats = player:WaitForChild("leaderstats")\nlocal coins = stats:FindFirstChild("Coinz")\nprint(coins.Value)',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Script:2: attempt to index nil with 'Character'",
    code: "local player = game.Players.LocalPlayer\nlocal char = player.Character",
  },
  {
    group: "Nil values",
    log: "Players.Builderman.PlayerScripts.LocalScript:2: attempt to index nil with 'Humanoid'",
    code: "local player = game.Players.LocalPlayer\nlocal hum = player.Character.Humanoid",
  },
  {
    group: "Nil values",
    log: "Workspace.Coin.Script:3: attempt to index nil with 'leaderstats'",
    code: "script.Parent.Touched:Connect(function(hit)\n\tlocal player = game.Players:GetPlayerFromCharacter(hit.Parent)\n\tplayer.leaderstats.Coins.Value += 1\nend)",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:4: attempt to call a nil value",
    code: "local x = 1\nprint(x)\n\ngiveCoins(5)\n\nlocal function giveCoins(n)\n\tprint(n)\nend",
  },
  {
    group: "Nil values",
    log: "attempt to call missing method 'Attack' of table",
    code: "local enemy = {}\nenemy:Attack()",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to perform arithmetic (add) on nil and number",
    code: 'local coins = store:GetAsync("key")\nlocal total = coins + 10',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to perform arithmetic (add) on Instance and number",
    code: "local coins = player.leaderstats.Coins\ncoins = coins + 10",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to concatenate string with nil",
    code: 'local name\nprint("Hello " .. name)',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to compare nil < number",
    code: "local stamina\nif stamina > 0 then end",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Loot:2: attempt to iterate over a nil value",
    code: "local drops = config.Drops\nfor _, item in drops do end",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:1: attempt to index number with 'Value'",
    code: "local coins = player.leaderstats.Coins.Value\nprint(coins.Value)",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: table index is nil",
    code: "local scores = {}\nscores[player.UserId] = 10",
  },
  {
    group: "Nil values",
    log: "Players.Bob.PlayerGui.ShopGui.LocalScript:2: attempt to index nil with 'Text'",
    code: 'local label = script.Parent:FindFirstChild("PriceLabel")\nlabel.Text = "50 coins"',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Tools:2: attempt to index nil with 'Parent'",
    code: 'local sword = player.Backpack:FindFirstChild("Sword")\nsword.Parent = player.Character',
  },
  {
    group: "Nil values",
    log: "Workspace.Lava.Script:2: attempt to index nil with 'Health'",
    code: 'script.Parent.Touched:Connect(function(hit)\n\thit.Parent:FindFirstChild("Humanoid").Health = 0\nend)',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Teleport:2: attempt to index nil with 'CFrame'",
    code: 'local root = player.Character:FindFirstChild("HumanoidRootPart")\nroot.CFrame = workspace.Spawn.CFrame',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Shop:2: attempt to index nil with 'OnServerEvent'",
    code: 'local buy = game.ReplicatedStorage:FindFirstChild("BuyItem")\nbuy.OnServerEvent:Connect(function(player, item) end)',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Admin:2: attempt to index nil with 'Kick'",
    code: 'local target = game.Players:FindFirstChild(name)\ntarget:Kick("Banned")',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Round:3: attempt to index nil with 'Name'",
    code: 'local alive = {}\nlocal winner = alive[1]\nprint(winner.Name .. " wins!")',
  },
  {
    group: "Nil values",
    log: "Players.Bob.PlayerScripts.Camera:2: attempt to index nil with 'Position'",
    code: "local mouse = game.Players.LocalPlayer:GetMouse()\nprint(mouse.Target.Position)",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Pets:2: attempt to index nil with 'Clone'",
    code: "local pet = game.ServerStorage.Pets:FindFirstChild(petName)\nlocal copy = pet:Clone()",
  },
  {
    group: "Nil values",
    log: "Players.Bob.Backpack.Gun.LocalScript:2: attempt to index nil with 'Activated'",
    code: 'local tool = script.Parent.Parent:FindFirstChildOfClass("Tool")\ntool.Activated:Connect(shoot)',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:4: attempt to call a nil value (field 'Shoot')",
    code: "local Weapons = {}\nfunction Weapons.Fire() end\n\nWeapons.Shoot()",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to call a nil value (method 'Spawn')",
    code: "local Enemy = {}\nEnemy:Spawn()",
  },
  {
    group: "Nil values",
    log: "attempt to call missing method 'Fire' of table",
    code: "local Gun = {}\nGun.__index = Gun\nlocal gun = setmetatable({}, Gun)\ngun:Fire()",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to call a table value",
    code: "local settings = { Speed = 16 }\nsettings()",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to call a number value",
    code: "local coins = 5\ncoins(10)",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to call a string value",
    code: 'local name = "Bob"\nprint(name())',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Shop:2: attempt to perform arithmetic (mul) on string and number",
    code: 'local price = "ten"\nlocal total = price * 2',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to perform arithmetic (add) on table and number",
    code: "local position = { X = 1 }\nlocal moved = position + 1",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to perform arithmetic (add) on Vector3 and number",
    code: "local pos = part.Position\npart.Position = pos + 5",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to concatenate string with Instance",
    code: 'local coins = player.leaderstats.Coins\nlabel.Text = "Coins: " .. coins',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to concatenate string with boolean",
    code: 'local isVip = true\nprint("VIP: " .. isVip)',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to concatenate string with table",
    code: 'local items = { "Sword", "Bow" }\nprint("Items: " .. items)',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:1: attempt to compare string < number",
    code: "if textBox.Text < 10 then end",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to compare number <= nil",
    code: "local level = 5\nif level <= data.MaxLevel then end",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:1: attempt to compare Instance < number",
    code: "if player.leaderstats.Coins < 100 then end",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:1: attempt to iterate over a function value",
    code: "for _, part in workspace.Coins:GetChildren do end",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to index boolean with 'Value'",
    code: 'local isVip = player:GetAttribute("VIP")\nprint(isVip.Value)',
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to index number with 'X'",
    code: "local x = part.Position.X\nprint(x.X)",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: attempt to index function with 'Position'",
    code: "local getRoot = character.GetPivot\nprint(getRoot.Position)",
  },
  {
    group: "Nil values",
    log: "ServerScriptService.Main:2: table index is NaN",
    code: "local scores = {}\nscores[0 / 0] = 1",
  },
  {
    group: "Arguments & types",
    log: "invalid argument #1 to 'ipairs' (table expected, got nil)",
    code: "local items = getItems()\nfor i, v in ipairs(items) do end",
  },
  {
    group: "Arguments & types",
    log: "invalid argument #2 to 'random' (interval is empty)",
    code: "local n = math.random(10, 1)",
  },
  { group: "Arguments & types", log: "Argument 1 missing or nil", code: "remote:FireClient()" },
  {
    group: "Arguments & types",
    log: "Unable to assign property Text. string expected, got number",
    code: "label.Text = coins",
  },
  {
    group: "Arguments & types",
    log: "Unable to assign property Position. Vector3 expected, got CFrame",
    code: "part.Position = CFrame.new(0, 10, 0)",
  },
  {
    group: "Arguments & types",
    log: "Unable to cast value to Object",
    code: 'remote:FireClient("Builderman", 5)',
  },
  {
    group: "Arguments & types",
    log: "invalid 'for' limit (number expected, got nil)",
    code: "for i = 1, maxLevel do end",
  },
  {
    group: "Arguments & types",
    log: "invalid argument #1 to 'pairs' (table expected, got nil)",
    code: "local data = store:GetAsync(key)\nfor k, v in pairs(data) do end",
  },
  {
    group: "Arguments & types",
    log: "invalid argument #1 to 'insert' (table expected, got nil)",
    code: 'table.insert(inventory, "Sword")',
  },
  {
    group: "Arguments & types",
    log: "invalid argument #1 to 'floor' (number expected, got string)",
    code: "local n = math.floor(textBox.Text)",
  },
  {
    group: "Arguments & types",
    log: "invalid argument #2 to 'fromRGB' (number expected, got string)",
    code: 'local color = Color3.fromRGB(255, "red", 0)',
  },
  {
    group: "Arguments & types",
    log: "invalid argument #1 to 'sub' (string expected, got nil)",
    code: "local first = string.sub(name, 1, 1)",
  },
  {
    group: "Arguments & types",
    log: "invalid argument #1 to 'clamp' (number expected, got nil)",
    code: "local speed = math.clamp(data.Speed, 0, 100)",
  },
  {
    group: "Arguments & types",
    log: "Unable to cast string to int64",
    code: "local p = game.Players:GetPlayerByUserId(player.Name)",
  },
  {
    group: "Arguments & types",
    log: "Unable to cast Instance to int64",
    code: "local p = game.Players:GetPlayerByUserId(player)",
  },
  {
    group: "Arguments & types",
    log: "Unable to cast Dictionary to CoordinateFrame",
    code: "part:PivotTo({ X = 1, Y = 2, Z = 3 })",
  },
  {
    group: "Arguments & types",
    log: "Unable to assign property Text. string expected, got nil",
    code: "label.Text = data.Name",
  },
  {
    group: "Arguments & types",
    log: "Unable to assign property Value. number expected, got string",
    code: 'coins.Value = "100 coins"',
  },
  {
    group: "Arguments & types",
    log: "Unable to assign property BrickColor. BrickColor expected, got Color3",
    code: "part.BrickColor = Color3.new(1, 0, 0)",
  },
  {
    group: "Arguments & types",
    log: "Unable to assign property Size. UDim2 expected, got Vector3",
    code: "frame.Size = Vector3.new(1, 1, 0)",
  },
  {
    group: "Arguments & types",
    log: "Unable to assign property Parent. Instance expected, got string",
    code: 'part.Parent = "Workspace"',
  },
  {
    group: "Arguments & types",
    log: "invalid 'for' initial value (number expected, got string)",
    code: "for i = textBox.Text, 10 do end",
  },
  {
    group: "Arguments & types",
    log: "invalid 'for' step (number expected, got nil)",
    code: "for i = 1, 10, config.Step do end",
  },
  {
    group: "Arguments & types",
    log: "Argument 1 missing or nil",
    code: "local door = workspace:FindFirstChild()",
  },
  {
    group: "Arguments & types",
    log: "Argument 2 missing or nil",
    code: 'part:SetAttribute("Owner")',
  },
  // instances
  {
    group: "Objects & Explorer",
    log: 'Health is not a valid member of Model "Workspace.Noob"',
    code: "local h = workspace.Noob.Health",
  },
  {
    group: "Objects & Explorer",
    log: 'humanoid is not a valid member of Model "Workspace.Noob"',
    code: "local h = workspace.Noob.humanoid",
  },
  {
    group: "Objects & Explorer",
    log: 'Touched is not a valid member of Model "Workspace.Door"',
    code: "workspace.Door.Touched:Connect(onTouch)",
  },
  {
    group: "Objects & Explorer",
    log: 'Humanoid is not a valid member of Accessory "Workspace.Bob.Hat"',
    code: "part.Touched:Connect(function(hit)\n\thit.Parent.Humanoid.Health = 0\nend)",
  },
  {
    group: "Objects & Explorer",
    log: 'Triggered is not a valid member of Part "Workspace.HouseDoor"',
    code: "workspace.HouseDoor.Triggered:Connect(open)",
  },
  {
    group: "Objects & Explorer",
    log: "Infinite yield possible on 'Players.Builderman:WaitForChild(\"leaderstats\")'",
    code: 'local ls = Instance.new("Folder")\nls.Name = "Leaderstats"\nls.Parent = player',
  },
  {
    group: "Objects & Explorer",
    log: "Infinite yield possible on 'ServerStorage:WaitForChild(\"Sword\")'",
  },
  {
    group: "Objects & Explorer",
    log: "The Parent property of Sword is locked, current parent: NULL, new parent Backpack",
  },
  {
    group: "Objects & Explorer",
    log: "'ReplicatedStorge' is not a valid Service name",
    code: 'local rs = game:GetService("ReplicatedStorge")',
  },
  {
    group: "Objects & Explorer",
    log: 'Unable to create an Instance of type "IntValu"',
    code: 'local v = Instance.new("IntValu")',
  },
  {
    group: "Objects & Explorer",
    log: "Expected ':' not '.' calling member function Destroy",
    code: "part.Destroy()",
  },
  {
    group: "Objects & Explorer",
    log: 'Leaderstats is not a valid member of Player "Players.Bob"',
    code: "local coins = player.Leaderstats.Coins",
  },
  {
    group: "Objects & Explorer",
    log: 'Coins is not a valid member of Folder "Players.Bob.leaderstats"',
    code: "player.leaderstats.Coins.Value += 10",
  },
  {
    group: "Objects & Explorer",
    log: 'MouseButton1Click is not a valid member of TextLabel "Players.Bob.PlayerGui.Shop.BuyLabel"',
    code: "script.Parent.MouseButton1Click:Connect(buy)",
  },
  {
    group: "Objects & Explorer",
    log: 'WalkSpeed is not a valid member of Model "Workspace.Bob"',
    code: "character.WalkSpeed = 32",
  },
  {
    group: "Objects & Explorer",
    log: 'Value is not a valid member of Folder "ReplicatedStorage.Settings"',
    code: "local speed = game.ReplicatedStorage.Settings.Value",
  },
  {
    group: "Objects & Explorer",
    log: 'Text is not a valid member of Frame "Players.Bob.PlayerGui.Main.Panel"',
    code: 'script.Parent.Panel.Text = "Hello"',
  },
  {
    group: "Objects & Explorer",
    log: 'Anchored is not a valid member of Model "Workspace.House"',
    code: "workspace.House.Anchored = true",
  },
  {
    group: "Objects & Explorer",
    log: 'Position is not a valid member of Model "Workspace.Car"',
    code: "workspace.Car.Position = Vector3.new(0, 5, 0)",
  },
  {
    group: "Objects & Explorer",
    log: 'Character is not a valid member of Model "Workspace.Bob"',
    code: "local char = hit.Parent.Character",
  },
  {
    group: "Objects & Explorer",
    log: 'PlayerGui is not a valid member of Player "Players.Bob"',
    code: "local gui = player.PlayerGui",
  },
  {
    group: "Objects & Explorer",
    log: "Infinite yield possible on 'Workspace:WaitForChild(\"Map\")'",
    code: 'local map = workspace:WaitForChild("Map")',
  },
  {
    group: "Objects & Explorer",
    log: "Infinite yield possible on 'ReplicatedStorage:WaitForChild(\"Remotes\")'",
    code: 'local remotes = game.ReplicatedStorage:WaitForChild("Remotes")',
  },
  {
    group: "Objects & Explorer",
    log: "Infinite yield possible on 'Workspace.Bob:WaitForChild(\"Torso\")'",
    code: 'local torso = character:WaitForChild("Torso")',
  },
  {
    group: "Objects & Explorer",
    log: "Infinite yield possible on 'Players.Bob.PlayerGui:WaitForChild(\"ShopGui\")'",
    code: 'local shop = player.PlayerGui:WaitForChild("ShopGui")',
  },
  {
    group: "Objects & Explorer",
    log: "Something unexpectedly tried to set the parent of Sword to Backpack while trying to set the parent of Sword. Current parent is Workspace.",
    code: "sword.AncestryChanged:Connect(function()\n\tsword.Parent = backpack\nend)",
  },
  {
    group: "Objects & Explorer",
    log: "'DataStorService' is not a valid Service name",
    code: 'local DataStoreService = game:GetService("DataStorService")',
  },
  {
    group: "Objects & Explorer",
    log: "'Tweenservice' is not a valid Service name",
    code: 'local TweenService = game:GetService("Tweenservice")',
  },
  {
    group: "Objects & Explorer",
    log: 'Unable to create an Instance of type "Player"',
    code: 'local bot = Instance.new("Player")',
  },
  {
    group: "Objects & Explorer",
    log: 'Unable to create an Instance of type "brick"',
    code: 'local p = Instance.new("brick")',
  },
  {
    group: "Objects & Explorer",
    log: "Expected ':' not '.' calling member function FindFirstChild",
    code: 'local door = workspace.FindFirstChild("Door")',
  },
  {
    group: "Objects & Explorer",
    log: "Expected ':' not '.' calling member function Clone",
    code: "local copy = template.Clone()",
  },
  {
    group: "Objects & Explorer",
    log: "Expected ':' not '.' calling member function GetChildren",
    code: "for _, p in workspace.GetChildren() do end",
  },
  // scripts
  {
    group: "Script problems",
    log: "Script timeout: exhausted allowed execution time",
    code: "while true do\n\tpart.CFrame *= CFrame.Angles(0, 0.1, 0)\nend",
  },
  {
    group: "Script problems",
    log: "ServerScriptService.Math:2: stack overflow",
    code: "local function count(n)\n\treturn count(n + 1)\nend",
  },
  {
    group: "Script problems",
    log: "Maximum event re-entrancy depth exceeded",
    code: "value.Changed:Connect(function()\n\tvalue.Value += 1\nend)",
  },
  {
    group: "Script problems",
    log: "ServerScriptService.Script:4: Expected 'end' (to close 'function' at line 1), got <eof>; did you forget to close 'then' at line 2?",
    code: "local function f()\n\tif x = 5 then\n\t\tprint(1)\nend",
  },
  {
    group: "Script problems",
    log: "ServerScriptService.Script:1: Expected 'then' when parsing if statement, got '!'",
    code: 'if name != "Bob" then end',
  },
  {
    group: "Script problems",
    log: "ServerScriptService.Script:1: Incomplete statement: expected assignment or a function call",
    code: "x == 5",
  },
  {
    group: "Script problems",
    log: "Module code did not return exactly one value",
    code: "local Config = {}\nConfig.Speed = 16",
  },
  { group: "Script problems", log: "Requested module experienced an error while loading" },
  { group: "Script problems", log: "Requested module was required recursively" },
  {
    group: "Script problems",
    log: "Attempted to call require with invalid argument(s).",
    code: 'local Config = require("ReplicatedStorage.Config")',
  },
  { group: "Script problems", log: "cannot resume dead coroutine" },
  {
    group: "Script problems",
    log: "attempt to modify a readonly table",
    code: "local cfg = table.freeze({ Speed = 16 })\ncfg.Speed = 20",
  },
  {
    group: "Script problems",
    log: "ServerScriptService.Script:1: Expected 'do' when parsing for loop, got 'then'",
    code: "for i = 1, 10 then\nend",
  },
  {
    group: "Script problems",
    log: "ServerScriptService.Script:2: Expected ')' (to close '(' at column 6), got 'end'",
    code: 'print(("hi"\nend',
  },
  {
    group: "Script problems",
    log: "ServerScriptService.Script:1: Expected '=' when parsing assignment, got '+'",
    code: "local coins + 5",
  },
  {
    group: "Script problems",
    log: "cannot resume non-suspended coroutine",
    code: "local co = coroutine.running()\ncoroutine.resume(co)",
  },
  {
    group: "Script problems",
    log: "attempt to yield across metamethod/C-call boundary",
    code: "setmetatable(t, { __index = function()\n\ttask.wait(1)\nend })",
  },
  // services
  {
    group: "Remotes & services",
    log: "FireServer can only be called from the client",
    code: 'remote:FireServer("Sword")',
  },
  {
    group: "Remotes & services",
    log: "OnServerInvoke is a callback member of RemoteFunction; you can only set the callback value, get is not available",
    code: "rf.OnServerInvoke:Connect(function(player) return 1 end)",
  },
  {
    group: "Remotes & services",
    log: "Remote event invocation queue exhausted for ReplicatedStorage.Notify; did you forget to implement OnClientEvent? (32 events dropped)",
  },
  {
    group: "Remotes & services",
    log: "502: API Services rejected request with error. HTTP 403 (Forbidden)",
  },
  {
    group: "Remotes & services",
    log: "DataStore request was added to queue. If request queue fills, further requests will be dropped. Try sending fewer requests.Key = Player_1",
  },
  {
    group: "Remotes & services",
    log: "104: Cannot store Instance in data store. Data stores can only accept valid UTF-8 characters.",
  },
  { group: "Remotes & services", log: "Http requests are not enabled. Enable via game settings" },
  { group: "Remotes & services", log: "HttpService is not allowed to access ROBLOX resources" },
  { group: "Remotes & services", log: "Can't parse JSON" },
  {
    group: "Remotes & services",
    log: "TweenService:Create property named 'Size' cannot be tweened due to type mismatch (property is a 'UDim2', but given type is 'Vector3')",
    code: "TweenService:Create(frame, info, {Size = Vector3.new(1,1,1)})",
  },
  {
    group: "Remotes & services",
    log: "TweenService:Create no property named 'Transparancy' for object 'Door'",
  },
  {
    group: "Remotes & services",
    log: "LoadAnimation requires the Humanoid object (Builderman.Humanoid) to be a descendant of the game object",
  },
  {
    group: "Remotes & services",
    log: "AnimationTrack limit of 256 tracks for one Animator exceeded, new animations will not be played.",
  },
  {
    group: "Remotes & services",
    log: "Failed to load animation - sanitized ID: rbxassetid://1234567",
  },
  {
    group: "Remotes & services",
    log: "Failed to load sound rbxassetid://1234567: Unable to download sound data",
  },
  {
    group: "Remotes & services",
    log: "FireClient can only be called from the server",
    code: 'remote:FireClient(game.Players.LocalPlayer, "hi")',
  },
  {
    group: "Remotes & services",
    log: "OnServerEvent can only be used on the server",
    code: "remote.OnServerEvent:Connect(function(player) end)",
  },
  {
    group: "Remotes & services",
    log: "OnClientEvent can only be used on the client",
    code: "remote.OnClientEvent:Connect(function() end)",
  },
  {
    group: "Remotes & services",
    log: "InvokeServer can only be called from the client",
    code: 'local price = getPrice:InvokeServer("Sword")',
  },
  {
    group: "Remotes & services",
    log: "OnClientInvoke is a callback member of RemoteFunction; you can only set the callback value, get is not available",
    code: "rf.OnClientInvoke:Connect(function() end)",
  },
  {
    group: "Remotes & services",
    log: "OnInvoke is a callback member of BindableFunction; you can only set the callback value, get is not available",
    code: "bf.OnInvoke:Connect(function() end)",
  },
  {
    group: "Remotes & services",
    log: "104: Cannot store Vector3 in data store. Data stores can only accept valid UTF-8 characters.",
    code: "store:SetAsync(key, part.Position)",
  },
  {
    group: "Remotes & services",
    log: "HTTP 404 (Not Found)",
    code: 'local body = HttpService:GetAsync("https://example.com/missing")',
  },
  { group: "Remotes & services", log: "HTTP 429 (Too Many Requests)" },
  { group: "Remotes & services", log: "HTTP 500 (Internal Server Error)" },
  {
    group: "Remotes & services",
    log: "TweenService:Create property named 'Position' cannot be tweened due to type mismatch (property is a 'Vector3', but given type is 'CFrame')",
    code: "TweenService:Create(part, info, { Position = target.CFrame })",
  },
  {
    group: "Remotes & services",
    log: "TweenService:Create property named 'Transparency' cannot be tweened due to type mismatch (property is a 'float', but given type is 'string')",
    code: 'TweenService:Create(part, info, { Transparency = "1" })',
  },
  {
    group: "Remotes & services",
    log: "TweenService:Create no property named 'Colour' for object 'Lamp'",
    code: "TweenService:Create(lamp, info, { Colour = Color3.new(1, 1, 0) })",
  },
  {
    group: "Remotes & services",
    log: "Failed to load image rbxassetid://987654: Asset type does not match requested type",
  },
  { group: "Remotes & services", log: "Failed to load mesh rbxassetid://5555555" },
  {
    group: "Remotes & services",
    log: "Teleport failed because The place is restricted (Unauthorized)",
    code: "TeleportService:Teleport(1234567, player)",
  },
];
