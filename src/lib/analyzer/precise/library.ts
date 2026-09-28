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
];
