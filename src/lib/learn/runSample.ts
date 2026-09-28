/**
 * Runs a lesson's code sample in the simulator so learners can press "Run"
 * and see what it does. The sample's Explorer location ("Workspace ›
 * KillBrick › Script") decides where the script goes; objects the code
 * refers to (workspace.Door, ReplicatedStorage.BuyItem…) are created first,
 * then a player joins and the obvious interaction is simulated.
 */
import { Vector3 } from "@/lib/luau/roblox/datatypes";
import type { Instance } from "@/lib/luau/roblox/instance";
import { World } from "@/lib/luau/roblox/world";
import { explorerOf, fmtValue, type ExplorerNode, type OutputLine } from "./homework/harness";

export interface SampleResult {
  output: OutputLine[];
  explorer: ExplorerNode[];
  /** What the runner did, e.g. "Player1 joined", "Player1 touched KillBrick". */
  actions: string[];
  /** Property changes and new objects made by the sample, e.g. "Player1.leaderstats.Coins.Value: 0 → 1". */
  changes: string[];
  scriptKind: "Script" | "LocalScript" | "ModuleScript";
  seconds: number;
}

const SERVICES = [
  "Workspace",
  "ServerScriptService",
  "ServerStorage",
  "ReplicatedStorage",
  "StarterGui",
  "StarterPlayer",
  "ReplicatedFirst",
  "Lighting",
  "StarterPack",
];

const GUESS_CLASS: Array<[RegExp, string]> = [
  [/Gui$/, "ScreenGui"],
  [/Button$/, "TextButton"],
  [/Label$/, "TextLabel"],
  [/Frame$/, "Frame"],
  [/Folder$|^Items$|^Checkpoints$|^Coins$/, "Folder"],
];

function parseSegment(seg: string): { name: string; cls?: string } {
  const m = seg.trim().match(/^(.+?)\s*\((\w+)\)$/);
  return m ? { name: m[1].trim(), cls: m[2] } : { name: seg.trim() };
}

function childClass(parent: Instance, name: string, cls?: string): string {
  if (cls) return cls;
  for (const [re, c] of GUESS_CLASS) if (re.test(name)) return c;
  return parent.className === "Workspace" ? "Part" : "Folder";
}

/** Creates objects the code mentions so the sample doesn't fail on a missing name. */
function addFixtures(w: World, code: string) {
  const ensure = (
    parent: Instance,
    name: string,
    cls: string,
    props: Record<string, unknown> = {},
  ) => parent.findFirstChild(name) ?? w.create(cls, { Name: name, ...props }, parent);
  const names = (container: string) => {
    const out = new Set<string>();
    const re = new RegExp(
      `${container}(?:\\.(\\w+)|:WaitForChild\\("(\\w+)"\\)|:FindFirstChild\\("(\\w+)"\\))`,
      "g",
    );
    for (const m of code.matchAll(re)) out.add(m[1] ?? m[2] ?? m[3]);
    return out;
  };
  const rs = w.service("ReplicatedStorage");
  for (const n of names("ReplicatedStorage")) {
    if (["Remotes"].includes(n) || rs.findFirstChild(n)) continue;
    const isFn = new RegExp(`${n}\\s*[:.]\\s*(InvokeServer|OnServerInvoke)`).test(code);
    const isRemote =
      /Remote|Event|Buy|Fire|Notify|Request|Update/.test(n) ||
      /FireServer|OnServerEvent|FireClient|OnClientEvent/.test(code);
    if (/Config|Module|Settings|Data$/.test(n)) continue;
    const cls = isFn
      ? "RemoteFunction"
      : /Status|Message|Text$/.test(n)
        ? "StringValue"
        : /Count|Timer|Time$|Round$/.test(n)
          ? "IntValue"
          : isRemote
            ? "RemoteEvent"
            : "Folder";
    ensure(rs, n, cls);
  }
  const ss = w.service("ServerStorage");
  for (const n of names("ServerStorage")) {
    const f = ensure(ss, n, "Folder");
    if (n === "Items") ensure(f, "Sword", "Tool");
  }
  let x = 0;
  for (const n of names("workspace")) {
    if (["CurrentCamera", "Gravity", "Terrain"].includes(n)) continue;
    if (/^(Boss|NPC|Zombie|Dummy|Enemy|Noob)$/i.test(n)) {
      const npc = ensure(w.workspace, n, "Model");
      ensure(npc, "HumanoidRootPart", "Part", { Anchored: true, Position: new Vector3(-20, 3, 0) });
      ensure(npc, "Humanoid", "Humanoid");
      continue;
    }
    const cls = /^(Checkpoints|Coins|Map|Obby)$/.test(n) ? "Folder" : "Part";
    ensure(
      w.workspace,
      n,
      cls,
      cls === "Part" ? { Anchored: true, Position: new Vector3(20 + (x += 8), 5, 20) } : {},
    );
  }
}

function place(w: World, where: string | undefined, code: string) {
  let path = (where ?? "").split(" — ")[0];
  // "LocalScript inside a TextButton" → a button in a ScreenGui.
  const inside = path.match(/^(\w+) inside an? (\w+)$/);
  if (inside) path = `StarterGui › ScreenGui › ${inside[2]} (${inside[2]}) › ${inside[1]}`;
  const segs = path ? path.split("›").map(parseSegment) : [];
  let kind: SampleResult["scriptKind"] =
    /LocalScript/.test(path) || (!path && /LocalPlayer|PlayerGui|UserInputService/.test(code))
      ? "LocalScript"
      : "Script";
  if (/ModuleScript/.test(path)) kind = "ModuleScript";
  let parent: Instance;
  let name = kind === "ModuleScript" ? "Module" : kind;
  if (segs.length === 0 || !SERVICES.includes(segs[0].name)) {
    parent =
      kind === "LocalScript"
        ? w.service("StarterPlayer").findFirstChild("StarterPlayerScripts")!
        : w.service("ServerScriptService");
  } else {
    parent = w.service(segs[0].name);
    const last = segs[segs.length - 1];
    const middle = segs.slice(1, -1);
    for (const s of middle) {
      const existing = parent.findFirstChild(s.name);
      parent =
        existing ??
        w.create(
          childClass(parent, s.name, s.cls),
          parent.className === "Workspace"
            ? { Name: s.name, Anchored: true, Position: new Vector3(0, 3, 12) }
            : { Name: s.name },
          parent,
        );
      if (parent.className === "Tool" && !parent.findFirstChild("Handle"))
        w.create("Part", { Name: "Handle", Size: new Vector3(1, 4, 1) }, parent);
    }
    if (!/^(Script|LocalScript|ModuleScript)$/.test(last.name)) name = last.name;
  }
  return { parent, kind, name };
}

const WATCHED = new Set([
  "Health",
  "WalkSpeed",
  "JumpPower",
  "Value",
  "Transparency",
  "Visible",
  "Text",
  "Position",
  "Size",
  "Color",
  "Material",
  "CanCollide",
  "Anchored",
  "ActionText",
  "Enabled",
  "Brightness",
  "ClockTime",
]);

/** Records what a sample changed in the world, coalesced per property. */
function recordChanges(w: World, ignore: RegExp | null) {
  const changes = new Map<string, { from: unknown; to: unknown }>();
  const created: string[] = [];
  const shortName = (inst: Instance) => inst.getFullName().replace(/^Workspace\./, "workspace.");
  const onProp = w.onPropertyChanged.bind(w);
  w.onPropertyChanged = (inst, name, old, value) => {
    onProp(inst, name, old, value);
    if (!WATCHED.has(name) || !inst.isDescendantOf(w.game)) return;
    const key = `${shortName(inst)}.${name}`;
    const prev = changes.get(key);
    changes.set(key, { from: prev ? prev.from : old, to: value });
  };
  const onParent = w.onParentChanged.bind(w);
  w.onParentChanged = (inst, old) => {
    onParent(inst, old);
    if (ignore && ignore.test(inst.getFullName())) return;
    if (
      !old &&
      inst.isDescendantOf(w.game) &&
      !inst.isA("BaseScript") &&
      !/^(Player1|HumanoidRootPart|Head|UpperTorso|LowerTorso|Left|Right|Humanoid$|Animator|Hat|Handle|Backpack|PlayerGui|PlayerScripts|StarterGear)/.test(
        inst.name,
      )
    )
      created.push(`+ ${shortName(inst)} (${inst.className})`);
  };
  return () => [
    ...created.slice(0, 8),
    ...[...changes]
      .filter(([, c]) => fmtValue(c.from) !== fmtValue(c.to))
      .slice(0, 12)
      .map(([k, c]) => `${k}: ${fmtValue(c.from)} → ${fmtValue(c.to)}`),
  ];
}

export interface SampleModule {
  name: string;
  code: string;
}

export function runSample(
  code: string,
  where?: string,
  modules: SampleModule[] = [],
): SampleResult {
  const w = new World({ timeoutSteps: 200_000, maxTotalSteps: 3_000_000 });
  w.create(
    "Part",
    {
      Name: "Baseplate",
      Size: new Vector3(512, 20, 512),
      Position: new Vector3(0, -10, 0),
      Anchored: true,
    },
    w.workspace,
  );
  w.create(
    "SpawnLocation",
    {
      Name: "SpawnLocation",
      Size: new Vector3(12, 1, 12),
      Position: new Vector3(0, 0.5, 0),
      Anchored: true,
    },
    w.workspace,
  );
  for (const m of modules)
    w.addScript({
      source: m.code,
      kind: "ModuleScript",
      name: m.name,
      parent: w.service("ReplicatedStorage"),
    });
  addFixtures(w, code);
  const { parent, kind, name } = place(w, where, code);
  // GUI samples that wait for a sibling frame get one.
  let gui: Instance | undefined = parent;
  while (gui && gui.className !== "ScreenGui") gui = gui.parent;
  if (gui) {
    for (const m of code.matchAll(/WaitForChild\("(\w+(?:Frame|Label|Button))"\)/g)) {
      if (!gui.findFirstChild(m[1])) {
        const cls = /Frame$/.test(m[1])
          ? "Frame"
          : /Label$/.test(m[1])
            ? "TextLabel"
            : "TextButton";
        w.create(cls, cls === "Frame" ? { Name: m[1], Visible: false } : { Name: m[1] }, gui);
      }
    }
  }
  const usesHelper = /leaderstats/.test(code) && !/Instance\.new\("Folder"\)/.test(code);
  const changes = recordChanges(w, usesHelper ? /\.leaderstats(\.(Coins|Wins))?$/ : null);
  const actions: string[] = [];
  // Samples that only read leaderstats get a helper that creates them.
  if (usesHelper) {
    w.addScript({
      name: "LeaderstatsHelper",
      parent: w.service("ServerScriptService"),
      source: `game.Players.PlayerAdded:Connect(function(player)
	local ls = Instance.new("Folder")
	ls.Name = "leaderstats"
	ls.Parent = player
	for _, n in {"Coins", "Wins"} do
		local v = Instance.new("IntValue")
		v.Name = n
		v.Parent = ls
	end
end)`,
    });
    actions.push("helper: leaderstats (Coins, Wins)");
  }

  if (kind === "ModuleScript") {
    const mod = w.addScript({ source: code, kind: "ModuleScript", name, parent });
    w.addScript({
      name: "Tester",
      parent: w.service("ServerScriptService"),
      source: `local ok, result = pcall(require, game.${mod.getFullName()})\nif ok then print("require() returned a " .. typeof(result)) else warn(result) end`,
    });
    actions.push(`require(${mod.getFullName()})`);
    w.run(1);
  } else {
    w.addScript({ source: code, kind, name, parent });
    w.run(0.5);
    const p = w.addPlayer("Player1");
    actions.push("Player1 joined");
    w.run(2);
    // Simulate the interaction the sample is about.
    const host = parent.className === "Workspace" ? undefined : parent;
    if (/\.Touched/.test(code)) {
      const part =
        (host && host.isA("BasePart") ? host : undefined) ??
        w.workspace.children.find(
          (c) => c.isA("BasePart") && !["Baseplate", "SpawnLocation", "Terrain"].includes(c.name),
        );
      if (part) {
        w.touchWithCharacter(part, p, "LeftFoot");
        actions.push(`Player1 touched ${part.name}`);
        w.run(1);
      }
    }
    const tool = p
      .findFirstChild("Backpack")
      ?.children.find((c: Instance) => c.className === "Tool");
    if (tool && /Activated/.test(code)) {
      const char = p.props.get("Character") as Instance | undefined;
      const hum = char?.findFirstChild("Humanoid");
      if (char) {
        hum?.setProp("Health", 50);
        actions.push("Player1's Health set to 50");
        tool.setParent(char);
        actions.push(`Player1 equipped ${tool.name}`);
        w.run(0.2);
        w.click(tool, p);
        actions.push(`Player1 used ${tool.name}`);
        w.run(1);
      }
    } else if (/MouseButton1Click|Activated/.test(code)) {
      const btn = p
        .findFirstChild("PlayerGui")
        ?.descendants()
        .find((d: Instance) => d.isA("GuiButton"));
      if (btn) {
        w.click(btn, p);
        actions.push(`Player1 clicked ${btn.name}`);
        w.run(1);
      }
    }
    if (/Triggered/.test(code)) {
      const prompt = w.workspace
        .descendants()
        .find((d: Instance) => d.className === "ProximityPrompt");
      if (prompt) {
        w.trigger(prompt, p);
        actions.push(`Player1 pressed E on ${prompt.parent?.name ?? "a prompt"}`);
        w.run(1);
      }
    }
    if (/InputBegan|BindAction/.test(code)) {
      w.pressKey(p, "E");
      actions.push("Player1 pressed E");
      w.run(1);
    }
    if (/PlayerRemoving|BindToClose/.test(code)) {
      w.run(1);
      w.removePlayer(p);
      actions.push("Player1 left");
    }
    w.run(4);
  }
  return {
    output: w.output.slice(0, 300).map((o) => ({ kind: o.kind, text: o.text, time: o.time })),
    explorer: explorerOf(w),
    actions,
    changes: changes(),
    scriptKind: kind,
    seconds: Math.round(w.interp.time * 10) / 10,
  };
}
