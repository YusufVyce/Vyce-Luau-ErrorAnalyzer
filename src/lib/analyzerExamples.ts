/** Real-world Roblox errors paired with the code that causes them. */
export const ANALYZER_EXAMPLES: {
  label: string;
  error: string;
  code: string;
}[] = [
  {
    label: "LocalPlayer on the server",
    error: "ServerScriptService.Inventory:3: attempt to index nil with 'leaderstats'",
    code: "local player = game.Players.LocalPlayer\n\nlocal coins = player.leaderstats.Coins\nprint(coins.Value)",
  },
  {
    label: "Touched by a non-player",
    error: "Workspace.Coin.Script:3: attempt to index nil with 'leaderstats'",
    code: "script.Parent.Touched:Connect(function(hit)\n\tlocal player = game.Players:GetPlayerFromCharacter(hit.Parent)\n\tplayer.leaderstats.Coins.Value += 1\n\tscript.Parent:Destroy()\nend)",
  },
  {
    label: "Character not loaded",
    error: "Players.Builderman.PlayerScripts.Sprint:3: attempt to index nil with 'Humanoid'",
    code: "local player = game.Players.LocalPlayer\n\nlocal humanoid = player.Character.Humanoid\nhumanoid.WalkSpeed = 32",
  },
  {
    label: "Forgot .Value",
    error:
      "ServerScriptService.Rewards:4: attempt to perform arithmetic (add) on Instance and number",
    code: 'game.Players.PlayerAdded:Connect(function(player)\n\tlocal stats = player:WaitForChild("leaderstats")\n\tlocal coins = stats:WaitForChild("Coins")\n\tcoins = coins + 100\nend)',
  },
  {
    label: "Function defined too late",
    error: "ServerScriptService.Round:3: attempt to call a nil value",
    code: 'local ROUND_TIME = 60\n\nstartRound()\n\nlocal function startRound()\n\tprint("Round started!")\nend',
  },
  {
    label: "Infinite yield",
    error: "Infinite yield possible on 'Players.Builderman:WaitForChild(\"leaderstats\")'",
    code: 'game.Players.PlayerAdded:Connect(function(player)\n\tlocal folder = Instance.new("Folder")\n\tfolder.Name = "Leaderstats"\n\tfolder.Parent = player\nend)',
  },
  {
    label: "Loop freezes the game",
    error: "Script timeout: exhausted allowed execution time",
    code: "local part = workspace.SpinningPart\n\nwhile true do\n\tpart.CFrame = part.CFrame * CFrame.Angles(0, math.rad(1), 0)\nend",
  },
  {
    label: "Missing end",
    error:
      "ServerScriptService.Shop:7: Expected 'end' (to close 'function' at line 1), got <eof>; did you forget to close 'then' at line 2?",
    code: "local function buy(player, price)\n\tif player.leaderstats.Coins.Value = price then\n\t\tplayer.leaderstats.Coins.Value -= price\n\t\treturn true\n\n\treturn false\nend",
  },
];
