import { describe, expect, it } from "vitest";
import { World } from "../roblox/world";
import { Vector3 } from "../roblox/datatypes";
import type { Instance } from "../roblox/instance";

const out = (w: World) => w.output.map((o) => `${o.kind}: ${o.text}`);

describe("roblox world", () => {
  it("runs a leaderstats script when a player joins", () => {
    const w = new World();
    w.addScript({
      parent: w.service("ServerScriptService"),
      source: `
local Players = game:GetService("Players")
Players.PlayerAdded:Connect(function(player)
  local leaderstats = Instance.new("Folder")
  leaderstats.Name = "leaderstats"
  leaderstats.Parent = player
  local coins = Instance.new("IntValue")
  coins.Name = "Coins"
  coins.Value = 10
  coins.Parent = leaderstats
  print(player.Name .. " joined with " .. coins.Value)
end)`,
    });
    w.run(0.1);
    const p = w.addPlayer("Builderman");
    w.run(1);
    expect(out(w)).toEqual(["print: Builderman joined with 10"]);
    const coins = p.findFirstChild("leaderstats")?.findFirstChild("Coins");
    expect(coins?.props.get("Value")).toBe(10);
    expect(p.props.get("Character")).toBeDefined();
  });

  it("kill brick kills players and survives random parts", () => {
    const w = new World();
    const brick = w.create("Part", { Name: "KillBrick", Anchored: true }, w.workspace);
    w.addScript({
      parent: brick,
      source: `script.Parent.Touched:Connect(function(hit)
  local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
  if humanoid then humanoid.Health = 0 end
end)`,
    });
    const p = w.addPlayer("Bob");
    w.run(0.5);
    const rock = w.create("Part", { Name: "Rock" }, w.workspace);
    w.touch(brick, rock);
    w.touchWithCharacter(brick, p);
    w.run(0.5);
    const hum = (p.props.get("Character") as Instance).findFirstChild("Humanoid")!;
    expect(hum.props.get("Health")).toBe(0);
    expect(w.errors).toEqual([]);
  });

  it("reports Roblox errors for unsafe code", () => {
    const w = new World();
    const brick = w.create("Part", { Name: "KillBrick", Anchored: true }, w.workspace);
    w.addScript({
      parent: brick,
      source: `script.Parent.Touched:Connect(function(hit)\n  hit.Parent.Humanoid.Health = 0\nend)`,
    });
    const p = w.addPlayer("Bob");
    w.run(0.5);
    const hat = (p.props.get("Character") as Instance)
      .findFirstChild("Hat")!
      .findFirstChild("Handle")!;
    w.touch(brick, hat);
    w.run(0.2);
    expect(w.errors[0].message).toBe(
      `Workspace.KillBrick.Script:2: Humanoid is not a valid member of Accessory "Workspace.Bob.Hat"`,
    );
  });

  it("LocalPlayer is nil on the server", () => {
    const w = new World();
    w.addScript({
      parent: w.service("ServerScriptService"),
      source: `local p = game.Players.LocalPlayer\nprint(p.Name)`,
    });
    w.run(0.2);
    expect(w.errors[0].message).toBe(
      "ServerScriptService.Script:2: attempt to index nil with 'Name'",
    );
  });

  it("remote events cross client and server", () => {
    const w = new World();
    const remote = w.create("RemoteEvent", { Name: "BuyItem" }, w.service("ReplicatedStorage"));
    void remote;
    w.addScript({
      parent: w.service("ServerScriptService"),
      source: `local r = game.ReplicatedStorage:WaitForChild("BuyItem")
r.OnServerEvent:Connect(function(player, item)
  print("server got", player.Name, item)
  r:FireClient(player, "ok " .. item)
end)`,
    });
    const gui = w.create("ScreenGui", { Name: "Shop" }, w.service("StarterGui"));
    const button = w.create("TextButton", { Name: "Buy" }, gui);
    w.addScript({
      kind: "LocalScript",
      parent: button,
      source: `local r = game.ReplicatedStorage:WaitForChild("BuyItem")
r.OnClientEvent:Connect(function(msg) print("client got", msg) end)
script.Parent.MouseButton1Click:Connect(function() r:FireServer("Sword") end)`,
    });
    const p = w.addPlayer("Ann");
    w.run(1);
    const myButton = p.findFirstChild("PlayerGui")!.findFirstChild("Shop")!.findFirstChild("Buy")!;
    w.click(myButton, p);
    w.run(1);
    expect(out(w)).toEqual(["print: server got Ann Sword", "print: client got ok Sword"]);
  });

  it("tweens and datastores", () => {
    const w = new World();
    const door = w.create(
      "Part",
      { Name: "Door", Anchored: true, Position: new Vector3(0, 5, 0) },
      w.workspace,
    );
    w.addScript({
      parent: w.service("ServerScriptService"),
      source: `local TweenService = game:GetService("TweenService")
local door = workspace.Door
local t = TweenService:Create(door, TweenInfo.new(1), { Position = door.Position + Vector3.new(0, 10, 0) })
t:Play()
t.Completed:Wait()
print("done", door.Position)
local store = game:GetService("DataStoreService"):GetDataStore("Coins")
local ok, v = pcall(function() return store:GetAsync("Player_1") end)
print(ok, v)
store:SetAsync("Player_1", { Coins = 5 })
print(store:GetAsync("Player_1").Coins)`,
    });
    w.run(3);
    expect(w.errors).toEqual([]);
    expect(out(w)).toEqual(["print: done 0, 15, 0", "print: true nil", "print: 5"]);
    expect((door.props.get("Position") as Vector3).y).toBe(15);
  });

  it("warns on infinite yield and supports modules", () => {
    const w = new World();
    const mod = w.addScript({
      kind: "ModuleScript",
      name: "Config",
      parent: w.service("ReplicatedStorage"),
      source: `local C = {}\nC.Speed = 32\nfunction C.double(x) return x * 2 end\nreturn C`,
    });
    void mod;
    w.addScript({
      parent: w.service("ServerScriptService"),
      source: `local C = require(game.ReplicatedStorage.Config)
print(C.Speed, C.double(21))
local x = workspace:WaitForChild("Nope")`,
    });
    w.run(6);
    expect(out(w)).toEqual([
      "print: 32 42",
      `warn: Infinite yield possible on 'Workspace:WaitForChild("Nope")'`,
    ]);
  });

  it("stops loops that never wait", () => {
    const w = new World();
    w.addScript({
      parent: w.service("ServerScriptService"),
      source: `local n = 0\nwhile true do n += 1 end`,
    });
    w.run(1);
    expect(w.errors[0].message).toBe("Script timeout: exhausted allowed execution time");
  });
});
