import { describe, expect, it } from "vitest";
import { parseLog } from "./codeTools";
import { diagnose, SIGNATURES } from "./diagnose";
import { allAllowedDocUrlPrefixes } from "./docs";
import { lintCode } from "./lint";

/**
 * Ground-truth cases: each one is a real Roblox error with the code that
 * produced it and the *specific* cause a human would point at.
 */
interface Case {
  name: string;
  log: string;
  code?: string;
  id: string;
  /** Substring expected in the top-ranked cause (case-insensitive). */
  topCause?: string;
  line?: number;
  minConfidence?: number;
  maxConfidence?: number;
  fixIncludes?: string;
}

const CASES: Case[] = [
  {
    name: "FindFirstChild typo returns nil",
    log: "ServerScriptService.Inventory:3: attempt to index nil with 'Value'",
    code: 'local stats = player:WaitForChild("leaderstats")\nlocal coins = stats:FindFirstChild("Coinz")\nprint(coins.Value)',
    id: "index-nil",
    topCause: 'FindFirstChild("Coinz")',
    line: 3,
    minConfidence: 80,
    fixIncludes: 'WaitForChild("Coinz", 5)',
  },
  {
    name: "LocalPlayer in a server Script",
    log: "ServerScriptService.Script:2: attempt to index nil with 'Character'",
    code: "local player = game.Players.LocalPlayer\nlocal char = player.Character",
    id: "index-nil",
    topCause: "server Script",
    line: 2,
    minConfidence: 85,
  },
  {
    name: "Character not spawned yet",
    log: "Players.Bob.PlayerScripts.LocalScript:2: attempt to index nil with 'Humanoid'",
    code: "local player = game.Players.LocalPlayer\nlocal hum = player.Character.Humanoid",
    id: "index-nil",
    topCause: "hasn't spawned",
    line: 2,
    fixIncludes: "CharacterAdded:Wait()",
  },
  {
    name: "Touched by a non-player part",
    log: "Workspace.Coin.Script:3: attempt to index nil with 'leaderstats'",
    code: "script.Parent.Touched:Connect(function(hit)\n\tlocal player = game.Players:GetPlayerFromCharacter(hit.Parent)\n\tplayer.leaderstats.Coins.Value += 1\nend)",
    id: "index-nil",
    topCause: "isn't a player",
    line: 3,
  },
  {
    name: "DataStore returns nil for new players",
    log: "ServerScriptService.Data:5: attempt to index nil with 'Coins'",
    code: 'local store = game:GetService("DataStoreService"):GetDataStore("x")\ngame.Players.PlayerAdded:Connect(function(player)\n\tlocal data = store:GetAsync(player.UserId)\n\n\tprint(data.Coins)\nend)',
    id: "index-nil",
    topCause: "never been saved",
    line: 5,
  },
  {
    name: "Raycast hit nothing",
    log: "Players.Bob.Backpack.Gun.LocalScript:2: attempt to index nil with 'Instance'",
    code: "local result = workspace:Raycast(origin, dir)\nprint(result.Instance.Name)",
    id: "index-nil",
    topCause: "didn't hit anything",
    line: 2,
  },
  {
    name: "Undefined variable typo",
    log: "ServerScriptService.Shop:3: attempt to index nil with 'leaderstats'",
    code: "game.Players.PlayerAdded:Connect(function(player)\n\tlocal cash = 5\n\tprint(plr.leaderstats)\nend)",
    id: "index-nil",
    topCause: "did you mean `player`",
    line: 3,
  },
  {
    name: "Double .Value gives a number",
    log: "ServerScriptService.Main:2: attempt to index number with 'Value'",
    code: "local coins = player.leaderstats.Coins.Value\nprint(coins.Value)",
    id: "index-nil",
    topCause: "already holds the number",
    line: 2,
  },
  {
    name: "Function called above its local definition",
    log: "ServerScriptService.Main:4: attempt to call a nil value",
    code: "local x = 1\nprint(x)\n\ngiveCoins(5)\n\nlocal function giveCoins(n)\n\tprint(n)\nend",
    id: "call-nil",
    topCause: "only defined on line 6",
    line: 4,
    minConfidence: 85,
  },
  {
    name: "Capitalized global",
    log: "ServerScriptService.Main:1: attempt to call a nil value",
    code: 'Print("hi")',
    id: "call-nil",
    topCause: "did you mean `print`",
    fixIncludes: 'print("hi")',
  },
  {
    name: "Nonexistent string function",
    log: "ServerScriptService.Main:2: attempt to call a nil value",
    code: 'local s = "  hi  "\nlocal t = string.trim(s)',
    id: "call-nil",
    topCause: "string.trim",
  },
  {
    name: "Wrong case library function",
    log: "ServerScriptService.Main:1: attempt to call a nil value",
    code: "local i = table.Find(list, 5)",
    id: "call-nil",
    topCause: "table.find",
  },
  {
    name: "Forgot .Value in math",
    log: "ServerScriptService.Main:2: attempt to perform arithmetic (add) on Instance and number",
    code: "local coins = player.leaderstats.Coins\ncoins = coins + 10",
    id: "arithmetic",
    topCause: "forgot `.Value`",
    fixIncludes: "coins.Value = coins.Value + 10",
  },
  {
    name: "Math on GetAsync nil",
    log: "ServerScriptService.Economy:3: attempt to perform arithmetic (add) on nil and number",
    code: 'local store = game:GetService("DataStoreService"):GetDataStore("Coins")\nlocal coins = store:GetAsync("key")\nlocal total = coins + 10',
    id: "arithmetic",
    topCause: "never been saved",
    line: 3,
  },
  {
    name: "TextBox text in math",
    log: "Players.Bob.PlayerGui.Shop.LocalScript:2: attempt to perform arithmetic (mul) on string and number",
    code: "local amount = box.Text\nlocal price = amount * 5",
    id: "arithmetic",
    topCause: "TextBox",
  },
  {
    name: "Attribute missing in concat",
    log: "StarterPlayerScripts.HUD:3: attempt to concatenate string with nil",
    code: 'local player = game.Players.LocalPlayer\nlocal rank = player:GetAttribute("Rank")\nlocal label = "Rank: " .. rank',
    id: "concatenate",
    topCause: "GetAttribute",
    line: 3,
  },
  {
    name: "Concat an Instance",
    log: "ServerScriptService.Chat:2: attempt to concatenate string with Instance",
    code: 'game.Players.PlayerAdded:Connect(function(player)\n\tprint("Welcome " .. player)\nend)',
    id: "concatenate",
    topCause: ".Name",
    fixIncludes: "player.Name",
  },
  {
    name: "Compare with nil from never-set variable",
    log: "ReplicatedStorage.State:2: attempt to compare nil < number",
    code: 'local stamina\nif stamina > 0 then\n  print("run")\nend',
    id: "compare",
    topCause: "never gets a value",
    line: 2,
  },
  {
    name: "Iterate over nil",
    log: "ServerScriptService.Loot:2: attempt to iterate over a nil value",
    code: "local drops = config.Drops\nfor _, item in drops do\n\tprint(item)\nend",
    id: "iterate-nil",
    line: 2,
  },
  {
    name: "ipairs nil",
    log: "invalid argument #1 to 'ipairs' (table expected, got nil)",
    code: "local items = getItems()\nfor i, v in ipairs(items) do end",
    id: "invalid-argument",
    topCause: "getItems",
  },
  {
    name: "math.random empty interval",
    log: "ServerScriptService.Spawner:1: invalid argument #2 to 'random' (interval is empty)",
    code: "local n = math.random(10, 1)",
    id: "invalid-argument",
    topCause: "min bigger than max",
  },
  {
    name: "FireClient without player",
    log: "ServerScriptService.Round:1: Argument 1 missing or nil",
    code: "remote:FireClient()",
    id: "argument-missing",
    topCause: "FireClient needs the Player",
  },
  {
    name: "Wrong capitalization of a child",
    log: 'humanoid is not a valid member of Model "Workspace.Noob"',
    code: "local h = workspace.Noob.humanoid",
    id: "invalid-member",
    topCause: "capitalization",
    fixIncludes: "workspace.Noob.Humanoid",
  },
  {
    name: "Touched on a Model",
    log: 'Touched is not a valid member of Model "Workspace.Door"',
    code: "workspace.Door.Touched:Connect(onTouch)",
    id: "invalid-member",
    topCause: "only parts",
  },
  {
    name: "Accessory handle touched",
    log: 'Humanoid is not a valid member of Accessory "Workspace.Bob.Hat"',
    code: "part.Touched:Connect(function(hit)\n\thit.Parent.Humanoid.Health = 0\nend)",
    id: "invalid-member",
    topCause: "hat",
  },
  {
    name: "GUI not loaded yet on client",
    log: 'Players.Bob.PlayerScripts.LocalScript:2: MainGui is not a valid member of PlayerGui "Players.Bob.PlayerGui"',
    code: "local gui = player.PlayerGui\nlocal main = gui.MainGui",
    id: "invalid-member",
    topCause: "loaded",
    fixIncludes: 'gui:WaitForChild("MainGui")',
  },
  {
    name: "leaderstats name mismatch",
    log: "Infinite yield possible on 'Players.Bob:WaitForChild(\"leaderstats\")'",
    code: 'local ls = Instance.new("Folder")\nls.Name = "Leaderstats"\nls.Parent = player',
    id: "infinite-yield",
    topCause: "Name mismatch",
    minConfidence: 80,
  },
  {
    name: "ServerStorage from the client",
    log: "Infinite yield possible on 'ServerStorage:WaitForChild(\"Sword\")'",
    id: "infinite-yield",
    topCause: "can't see ServerStorage",
  },
  {
    name: "Loop without wait",
    log: "Script timeout: exhausted allowed execution time",
    code: "local n = 0\nwhile true do\n\tn += 1\nend",
    id: "script-timeout",
    topCause: "no task.wait",
    line: 2,
  },
  {
    name: "Recursion",
    log: "ServerScriptService.Math:2: stack overflow",
    code: "local function count(n)\n\treturn count(n + 1)\nend\ncount(1)",
    id: "stack-overflow",
    topCause: "calls itself",
  },
  {
    name: "Missing end with = in if",
    log: "ServerScriptService.Script:5: Expected 'end' (to close 'function' at line 1), got <eof>; did you forget to close 'then' at line 2?",
    code: "local function f()\n\tif x = 5 then\n\t\tprint(1)\nend",
    id: "syntax-expected",
    topCause: "==",
    fixIncludes: "if x == 5 then",
  },
  {
    name: "!= operator",
    log: "ServerScriptService.Script:1: Expected 'then' when parsing if statement, got '!'",
    code: 'if name != "Bob" then\n\tprint(1)\nend',
    id: "syntax-expected",
    topCause: "~=",
  },
  {
    name: "Colon vs dot",
    log: "Expected ':' not '.' calling member function Destroy",
    code: "part.Destroy()",
    id: "colon-call",
    fixIncludes: "part:Destroy()",
    minConfidence: 85,
  },
  {
    name: "Module without return",
    log: "Module code did not return exactly one value",
    code: "local Config = {}\nConfig.Speed = 16",
    id: "module-return",
    topCause: "never returns",
  },
  {
    name: "Remote on the wrong side",
    log: "FireServer can only be called from the client",
    code: "remote:FireServer(1)",
    id: "remote-wrong-side",
    topCause: "FireClient",
  },
  {
    name: "OnServerInvoke with Connect",
    log: "OnServerInvoke is a callback member of RemoteFunction; you can only set the callback value, get is not available",
    code: "rf.OnServerInvoke:Connect(function(player) return 1 end)",
    id: "callback-member",
  },
  {
    name: "DataStore in unpublished place",
    log: "502: API Services rejected request with error. HTTP 403 (Forbidden)",
    id: "datastore-studio",
    minConfidence: 65,
  },
  {
    name: "HTTP disabled",
    log: "Http requests are not enabled. Enable via game settings",
    id: "http-disabled",
    minConfidence: 70,
  },
  {
    name: "Text needs a string",
    log: "Unable to assign property Text. string expected, got number",
    code: "label.Text = coins",
    id: "unable-to-assign",
    fixIncludes: "tostring(coins)",
  },
  {
    name: "Service typo",
    log: "'ReplicatedStorge' is not a valid Service name",
    code: 'local rs = game:GetService("ReplicatedStorge")',
    id: "invalid-service",
    topCause: "ReplicatedStorage",
  },
  {
    name: "Instance.new typo",
    log: 'Unable to create an Instance of type "IntValu"',
    code: 'local v = Instance.new("IntValu")',
    id: "cannot-create",
    topCause: "IntValue",
  },
  {
    name: "Tween UDim2 vs Vector3",
    log: "TweenService:Create property named 'Size' cannot be tweened due to type mismatch (property is a 'UDim2', but given type is 'Vector3')",
    code: "TweenService:Create(frame, info, {Size = Vector3.new(1,1,1)})",
    id: "tween-type",
    topCause: "UDim2",
  },
  {
    name: "Destroyed then reparented",
    log: "The Parent property of Sword is locked, current parent: NULL, new parent Backpack",
    id: "parent-locked",
  },
  {
    name: "Unrecognized message is not faked",
    log: "the flux capacitor overheated",
    code: "print(1)",
    id: "unrecognized",
    maxConfidence: 40,
  },
];

describe("precise diagnosis — ground truth cases", () => {
  for (const c of CASES) {
    it(c.name, () => {
      const d = diagnose(c.log, c.code ?? "");
      expect(d).not.toBeNull();
      if (!d) return;
      expect(d.id).toBe(c.id);
      if (c.topCause) expect(d.causes[0]?.text.toLowerCase()).toContain(c.topCause.toLowerCase());
      if (c.line) expect(d.location?.line).toBe(c.line);
      if (c.minConfidence) expect(d.confidence).toBeGreaterThanOrEqual(c.minConfidence);
      if (c.maxConfidence) expect(d.confidence).toBeLessThanOrEqual(c.maxConfidence);
      if (c.fixIncludes) expect(d.fixCode?.after ?? "").toContain(c.fixIncludes);
      expect(d.confidence).toBeGreaterThanOrEqual(20);
      expect(d.confidence).toBeLessThanOrEqual(97);
    });
  }

  it("never emits a documentation link outside the verified allowlist", () => {
    const allowed = allAllowedDocUrlPrefixes();
    for (const c of CASES) {
      const d = diagnose(c.log, c.code ?? "");
      for (const link of d?.docs ?? []) {
        expect(
          allowed.some((prefix) => link.url === prefix || link.url.startsWith(`${prefix}#`)),
        ).toBe(true);
        expect(link.url).not.toMatch(/devforum|forum|:\w+$/i);
      }
    }
  });

  it("scores the same error higher when code confirms the cause", () => {
    const log = "ServerScriptService.Inventory:3: attempt to index nil with 'Value'";
    const withoutCode = diagnose(log, "")!;
    const withCode = diagnose(
      log,
      'local stats = player:WaitForChild("leaderstats")\nlocal coins = stats:FindFirstChild("Coinz")\nprint(coins.Value)',
    )!;
    expect(withCode.confidence).toBeGreaterThan(withoutCode.confidence + 15);
  });

  it("has unique signature ids", () => {
    const ids = SIGNATURES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("log parsing", () => {
  it("strips Studio timestamps and side suffixes", () => {
    const parsed = parseLog(
      "14:02:11.532  ServerScriptService.Shop:12: attempt to index nil with 'Coins'  -  Server - Shop:12",
    );
    expect(parsed.message).toBe("attempt to index nil with 'Coins'");
    expect(parsed.scriptPath).toBe("ServerScriptService.Shop");
    expect(parsed.line).toBe(12);
    expect(parsed.side).toBe("server");
  });

  it("reads the line number from a stack trace when the message has none", () => {
    const parsed = parseLog(
      "Infinite yield possible on 'Players.Bob:WaitForChild(\"leaderstats\")'\nStack Begin\nScript 'Players.Bob.PlayerScripts.Stats', Line 4\nStack End",
    );
    expect(parsed.line).toBe(4);
    expect(parsed.side).toBe("client");
  });
});

describe("static checks", () => {
  it("flags the classic OnServerEvent parameter mistake", () => {
    const w = lintCode("remote.OnServerEvent:Connect(function(amount)\n\tprint(amount)\nend)");
    expect(w.some((x) => x.id === "onserverevent-player-param")).toBe(true);
  });

  it("flags a server trusting a client amount", () => {
    const w = lintCode(
      "remote.OnServerEvent:Connect(function(player, amount)\n\tplayer.leaderstats.Coins.Value += amount\nend)",
    );
    expect(w.some((x) => x.id === "trusts-client-value")).toBe(true);
  });

  it("stays quiet on clean, idiomatic code", () => {
    const code = [
      'local Players = game:GetService("Players")',
      "",
      "Players.PlayerAdded:Connect(function(player)",
      '\tlocal leaderstats = Instance.new("Folder")',
      '\tleaderstats.Name = "leaderstats"',
      "\tleaderstats.Parent = player",
      "",
      '\tlocal coins = Instance.new("IntValue")',
      '\tcoins.Name = "Coins"',
      "\tcoins.Parent = leaderstats",
      "end)",
      "",
      "while true do",
      "\ttask.wait(1)",
      "\tfor _, player in Players:GetPlayers() do",
      '\t\tlocal stats = player:FindFirstChild("leaderstats")',
      "\t\tif stats then",
      "\t\t\tstats.Coins.Value += 1",
      "\t\tend",
      "\tend",
      "end",
    ].join("\n");
    expect(lintCode(code).filter((w) => w.severity !== "info")).toEqual([]);
  });

  it("detects missing ends", () => {
    expect(
      lintCode("local function f()\n\tif a then\n\t\tprint(1)\nend").some(
        (w) => w.id === "missing-end",
      ),
    ).toBe(true);
  });
});
