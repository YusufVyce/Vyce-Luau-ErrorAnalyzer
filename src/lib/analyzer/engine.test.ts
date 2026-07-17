import { describe, expect, it } from "vitest";
import { analyzeErrorAndCode } from "@/utils/analyzerEngine";

describe("Analyzer semantic engine", () => {
  it("should infer stale async references for Roblox code-only input", async () => {
    const code = `local data = Profiles[player]

LoadProfile(player)

print(data.Coins.Value)`;
    const result = await analyzeErrorAndCode("", code, "roblox");

    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.rootCause.toLowerCase()).toContain("stale");
      expect(result.fix.toLowerCase()).toContain("async");
      expect(result.confidence).toBeGreaterThanOrEqual(35);
    }
  });

  it("should detect missing component or null reference in Unity", async () => {
    const log = "NullReferenceException: Object reference not set to an instance of an object";
    const code = `void Update() {
    rb = GetComponent<Rigidbody>();
    rb.velocity = Vector3.forward * speed;
}`;
    const result = await analyzeErrorAndCode(log, code, "unity");
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.rootCause.toLowerCase()).toContain("null");
      expect(result.fix.toLowerCase()).toContain("initialize");
    }
  });

  it("should infer missing defer or timing issue for Discord interaction errors", async () => {
    const log = "DiscordAPIError[10062]: Unknown interaction";
    const code = `client.on('interactionCreate', async interaction => {
  const data = await slowDatabaseCall();
  await interaction.reply(data);
});`;
    const result = await analyzeErrorAndCode(log, code, "discord");
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.rootCause.toLowerCase()).toContain("interaction");
      expect(result.fix.toLowerCase()).toContain("defer");
    }
  });

  it("should reason about Java null pointer and missing player lookup guard", async () => {
    const log = 'java.lang.NullPointerException: Cannot invoke "org.bukkit.entity.Player.sendMessage(String)" because "target" is null';
    const code = `Player target = Bukkit.getPlayer(args[0]);
target.sendMessage("Hello!");`;
    const result = await analyzeErrorAndCode(log, code, "minecraft");
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.rootCause.toLowerCase()).toContain("null");
      expect(result.fix.toLowerCase()).toContain("guard");
    }
  });

  it("should produce evidence and explanation for code-only async issues", async () => {
    const code = `let value;
async function load() {
  value = await fetchData();
}
load();
console.log(value.id);`;
    const result = await analyzeErrorAndCode("", code, "discord");
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.executionPath.length).toBeGreaterThan(0);
    }
  });
});
