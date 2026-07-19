export type PlatformFixSnippet = {
  title: string;
  description: string;
  fixedCode: string;
};

export const PLATFORM_FIX_SNIPPETS: PlatformFixSnippet[] = [
  {
    title: "Roblox DataStore + nil safety",
    description:
      "Wrap DataStore calls in pcall and verify object hierarchy before indexing.",
    fixedCode: `local DataStoreService = game:GetService("DataStoreService")
local statsStore = DataStoreService:GetDataStore("PlayerStats")

local function onPlayerAdded(player)
    if not player then
        warn("PlayerAdded fired with nil player")
        return
    end

    local leaderstats = player:WaitForChild("leaderstats", 5)
    if not leaderstats then
        warn("leaderstats missing for player", player.Name)
        return
    end

    local coins = leaderstats:FindFirstChild("Coins")
    if not coins then
        coins = Instance.new("IntValue")
        coins.Name = "Coins"
        coins.Parent = leaderstats
    end

    local success, storedValue = pcall(function()
        return statsStore:GetAsync("coins_" .. player.UserId)
    end)

    if not success then
        warn("DataStore GetAsync failed for", player.Name, storedValue)
        return
    end

    if typeof(storedValue) == "number" then
        coins.Value = storedValue
    end
end

game.Players.PlayerAdded:Connect(onPlayerAdded)

local function onPlayerRemoving(player)
    if not player then
        return
    end

    local leaderstats = player:FindFirstChild("leaderstats")
    local coins = leaderstats and leaderstats:FindFirstChild("Coins")
    if not coins then
        return
    end

    local success, err = pcall(function()
        statsStore:SetAsync("coins_" .. player.UserId, coins.Value)
    end)

    if not success then
        warn("DataStore SetAsync failed for", player.Name, err)
    end
end

game.Players.PlayerRemoving:Connect(onPlayerRemoving)`,
  },
];