export type Platform = "roblox" | "unity" | "discord" | "minecraft";

export type PlatformFixSnippet = {
  platform: Platform;
  title: string;
  description: string;
  fixedCode: string;
};

export const PLATFORM_FIX_SNIPPETS: PlatformFixSnippet[] = [
  {
    platform: "roblox",
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
  {
    platform: "unity",
    title: "Unity null safety + cleanup",
    description:
      "Add inspector/null checks and clear references in OnDestroy.",
    fixedCode: `using UnityEngine;

public class PlayerController : MonoBehaviour
{
    [SerializeField] private Rigidbody rb;
    [SerializeField] private float speed = 5f;

    private void Awake()
    {
        if (rb == null)
        {
            rb = GetComponent<Rigidbody>();
        }

        if (rb == null)
        {
            Debug.LogError($"Rigidbody is missing on {gameObject.name}");
        }
    }

    private void Update()
    {
        if (rb == null)
        {
            return;
        }

        rb.velocity = Vector3.forward * speed;
    }

    private void OnDestroy()
    {
        rb = null;
    }
}`,
  },
  {
    platform: "discord",
    title: "Discord.js channel existence + fetch error handling",
    description:
      "Handle fetch failures and verify text channel before sending a message.",
    fixedCode: `const channelId = "123456789012345678";

async function sendMessage(client, text) {
  const channel = await client.channels.fetch(channelId).catch((err) => {
    console.error("Failed to fetch channel:", err);
    return null;
  });

  if (!channel || !channel.isTextBased?.()) {
    console.warn("Channel not found or not text-based:", channelId);
    return;
  }

  try {
    await channel.send(text);
  } catch (error) {
    console.error("Failed to send message:", error);
  }
}`,
  },
  {
    platform: "minecraft",
    title: "Minecraft Paper null checks",
    description:
      "Guard event.getItem() and player references to avoid NPEs.",
    fixedCode: `import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.inventory.ItemStack;

public class ExampleListener implements Listener {

    @EventHandler
    public void onPlayerInteract(PlayerInteractEvent event) {
        if (event == null) {
            return;
        }

        Player player = event.getPlayer();
        if (player == null) {
            return;
        }

        ItemStack item = event.getItem();
        if (item == null || item.getType() == Material.AIR) {
            return;
        }

        if (item.hasItemMeta()
            && item.getItemMeta().hasDisplayName()
            && "Magic Stick".equals(item.getItemMeta().getDisplayName())) {

            player.sendMessage("You used the magic stick!");
        }
    }
}`,
  },
];
