import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Clock,
  FlaskConical,
  Hand,
  Keyboard,
  MousePointerClick,
  Play,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { CodeEditor } from "@/components/CodeEditor";
import { ExplorerTree, OutputConsole } from "@/components/learn/SimPanels";
import { explorerOf, type ExplorerNode, type OutputLine } from "@/lib/learn/homework/harness";
import { analyzerLink } from "@/lib/learn/lessons";
import { Color3, Vector3 } from "@/lib/luau/roblox/datatypes";
import type { Instance } from "@/lib/luau/roblox/instance";
import { World } from "@/lib/luau/roblox/world";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "Luau Playground — Vyce LuaUtility" },
      {
        name: "description",
        content:
          "Run Roblox Luau scripts in a simulated Roblox server in your browser: players, parts, events, tweens, remotes and more.",
      },
    ],
  }),
  component: PlaygroundPage,
});

const TEMPLATES: Record<string, { server: string; client: string; note: string }> = {
  "Hello world": {
    server:
      'print("Hello from the server!")\n\ngame.Players.PlayerAdded:Connect(function(player)\n\tprint(player.Name .. " joined the game")\nend)\n',
    client:
      'local player = game.Players.LocalPlayer\nprint("Hello from " .. player.Name .. "\'s computer!")\n',
    note: "Run it, then press “Player joins”.",
  },
  "Kill brick": {
    server:
      'local lava = workspace.Lava\n\nlava.Touched:Connect(function(hit)\n\tlocal humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")\n\tif humanoid then\n\t\thumanoid.Health = 0\n\t\tprint(hit.Parent.Name .. " touched the lava!")\n\tend\nend)\n',
    client: "",
    note: "Run, then press “Touch Lava”. Try removing the if-check and touch it with the rock!",
  },
  Leaderstats: {
    server:
      'local Players = game:GetService("Players")\n\nPlayers.PlayerAdded:Connect(function(player)\n\tlocal leaderstats = Instance.new("Folder")\n\tleaderstats.Name = "leaderstats"\n\tleaderstats.Parent = player\n\n\tlocal coins = Instance.new("IntValue")\n\tcoins.Name = "Coins"\n\tcoins.Parent = leaderstats\nend)\n\nwhile true do\n\ttask.wait(2)\n\tfor _, player in Players:GetPlayers() do\n\t\tplayer.leaderstats.Coins.Value += 5\n\t\tprint(player.Name, "has", player.leaderstats.Coins.Value, "coins")\n\tend\nend\n',
    client: "",
    note: "Watch the Explorer: Players › Player1 › leaderstats › Coins goes up.",
  },
  "Tween door": {
    server:
      'local TweenService = game:GetService("TweenService")\nlocal door = workspace.Part\n\nlocal tween = TweenService:Create(door, TweenInfo.new(2, Enum.EasingStyle.Quad), {\n\tPosition = door.Position + Vector3.new(0, 8, 0),\n\tTransparency = 0.5,\n})\ntween:Play()\nprint("Door starts at", door.Position)\ntween.Completed:Wait()\nprint("Door ends at", door.Position)\n',
    client: "",
    note: "The tween takes 2 simulated seconds.",
  },
  RemoteEvent: {
    server:
      'local remote = game.ReplicatedStorage.RemoteEvent\n\nremote.OnServerEvent:Connect(function(player, message)\n\tprint("Server got \\"" .. message .. "\\" from " .. player.Name)\n\tremote:FireClient(player, "Hi back!")\nend)\n',
    client:
      'local UserInputService = game:GetService("UserInputService")\nlocal remote = game.ReplicatedStorage:WaitForChild("RemoteEvent")\n\nremote.OnClientEvent:Connect(function(reply)\n\tprint("Client got:", reply)\nend)\n\nUserInputService.InputBegan:Connect(function(input)\n\tif input.KeyCode == Enum.KeyCode.E then\n\t\tremote:FireServer("I pressed E")\n\tend\nend)\n',
    note: "Run, then “Press E”.",
  },
  Countdown: {
    server: 'for i = 5, 1, -1 do\n\tprint(i)\n\ttask.wait(1)\nend\nprint("Go!")\n',
    client: "",
    note: "Loops with task.wait run on a simulated clock.",
  },
};

function buildWorld(server: string, client: string): World {
  const w = new World();
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
  w.create(
    "Part",
    { Name: "Part", Size: new Vector3(4, 8, 1), Position: new Vector3(0, 4, -12), Anchored: true },
    w.workspace,
  );
  w.create(
    "Part",
    {
      Name: "Lava",
      Size: new Vector3(10, 1, 10),
      Position: new Vector3(20, 0.5, 0),
      Anchored: true,
      Color: Color3.fromRGB(255, 80, 0),
      Material: "Neon",
    },
    w.workspace,
  );
  w.create("RemoteEvent", { Name: "RemoteEvent" }, w.service("ReplicatedStorage"));
  if (server.trim()) w.addScript({ source: server, parent: w.service("ServerScriptService") });
  if (client.trim())
    w.addScript({
      source: client,
      kind: "LocalScript",
      parent: w.service("StarterPlayer").findFirstChild("StarterPlayerScripts")!,
    });
  return w;
}

function PlaygroundPage() {
  const [template, setTemplate] = useState("Hello world");
  const [server, setServer] = useState(TEMPLATES["Hello world"].server);
  const [client, setClient] = useState(TEMPLATES["Hello world"].client);
  const [tab, setTab] = useState<"server" | "client">("server");
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [explorer, setExplorer] = useState<ExplorerNode[]>([]);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const world = useRef<World | null>(null);
  const playerCount = useRef(0);

  useEffect(() => {
    document.body.classList.add("ep-body");
    return () => document.body.classList.remove("ep-body");
  }, []);

  function refresh() {
    const w = world.current;
    if (!w) return;
    setOutput(w.output.map((o) => ({ kind: o.kind, text: o.text, time: o.time })));
    setExplorer(explorerOf(w));
    setTime(w.interp.time);
  }

  function act(fn: (w: World) => void, seconds = 1) {
    const w = world.current;
    if (!w) return;
    fn(w);
    w.run(seconds);
    refresh();
  }

  function run() {
    setRunning(true);
    setTimeout(() => {
      playerCount.current = 0;
      world.current = buildWorld(server, client);
      world.current.run(3);
      setRunning(false);
      refresh();
    }, 10);
  }

  function loadTemplate(name: string) {
    setTemplate(name);
    setServer(TEMPLATES[name].server);
    setClient(TEMPLATES[name].client);
    setTab("server");
    world.current = null;
    setOutput([]);
    setExplorer([]);
    setTime(0);
  }

  const players = () => world.current?.players() ?? [];
  const firstPlayer = () => players()[0];
  const touch = (partName: string) =>
    act((w) => {
      const part = w.workspace.findFirstChild(partName);
      const p = firstPlayer();
      if (part && p) w.touchWithCharacter(part, p);
      else if (part)
        w.touch(
          part,
          w.create("Part", { Name: "Rock", Position: new Vector3(20, 3, 0) }, w.workspace),
        );
    });
  const lastError = output.find((o) => o.kind === "error");
  const disabled = !world.current;

  return (
    <>
      <SiteNav />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="ep-aurora" aria-hidden="true" />
        <header className="relative z-10 space-y-3 py-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> Playground
          </div>
          <h1 className="serif-title text-4xl text-zinc-50 md:text-5xl">
            A tiny Roblox server in your browser
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-zinc-400">
            Write a Script and a LocalScript, press Run, then make players join, touch parts and
            press keys. Everything is simulated locally — the Output and Explorer update like in
            Studio.
          </p>
        </header>

        <div className="relative z-10 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <section className="ep-card space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-zinc-500" htmlFor="template">
                Example
              </label>
              <select
                id="template"
                value={template}
                onChange={(e) => loadTemplate(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
              >
                {Object.keys(TEMPLATES).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <span className="text-xs text-zinc-500">{TEMPLATES[template].note}</span>
            </div>
            <div role="tablist" className="flex gap-1 border-b border-zinc-800 text-xs">
              {(["server", "client"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`-mb-px border-b-2 px-3 py-2 ${tab === t ? "border-emerald-400 text-emerald-200" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
                >
                  {t === "server" ? "Script" : "LocalScript"}
                  <span className="hidden sm:inline">
                    {t === "server" ? " · ServerScriptService" : " · StarterPlayerScripts"}
                  </span>
                </button>
              ))}
            </div>
            {tab === "server" ? (
              <CodeEditor
                value={server}
                onChange={setServer}
                onRun={run}
                minLines={16}
                label="Server script"
              />
            ) : (
              <CodeEditor
                value={client}
                onChange={setClient}
                onRun={run}
                minLines={16}
                label="Local script"
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={run}
                disabled={running}
                className="ep-cta inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold"
              >
                <Play className="h-4 w-4" aria-hidden="true" />{" "}
                {running ? "Starting…" : world.current ? "Restart" : "Run"}
              </button>
              <span className="font-mono text-xs text-zinc-500">time {time.toFixed(1)}s</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                {
                  label: "Player joins",
                  icon: UserPlus,
                  fn: () => act((w) => w.addPlayer(`Player${++playerCount.current}`), 1),
                },
                {
                  label: "Player leaves",
                  icon: UserMinus,
                  fn: () => act((w) => firstPlayer() && w.removePlayer(firstPlayer()!), 1),
                },
                { label: "Touch Lava", icon: Hand, fn: () => touch("Lava") },
                { label: "Touch Part", icon: Hand, fn: () => touch("Part") },
                {
                  label: "Press E",
                  icon: Keyboard,
                  fn: () => act((w) => w.pressKey(firstPlayer(), "E"), 1),
                },
                { label: "Wait 5 seconds", icon: Clock, fn: () => act(() => undefined, 5) },
              ].map(({ label, icon: Icon, fn }) => (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={fn}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-2 text-xs text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-200 disabled:opacity-40"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
                </button>
              ))}
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  act((w) => {
                    const p = firstPlayer();
                    const btn = p
                      ?.findFirstChild("PlayerGui")
                      ?.descendants()
                      .find((d: Instance) => d.isA("GuiButton"));
                    if (btn) w.click(btn, p);
                  })
                }
                className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-2 text-xs text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-200 disabled:opacity-40 sm:col-span-3"
              >
                <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" /> Click the first
                button in the player's GUI
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="ep-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-pink-300">
                Output
                {lastError && (
                  <a
                    href={analyzerLink(lastError.text, tab === "server" ? server : client)}
                    className="normal-case tracking-normal text-emerald-300 hover:underline"
                  >
                    Explain this error →
                  </a>
                )}
              </div>
              <OutputConsole lines={output} emptyText="Press Run to start the server." />
            </div>
            <div className="ep-card overflow-hidden">
              <div className="border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Explorer
              </div>
              <ExplorerTree nodes={explorer} />
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-600">
              The simulator runs real Luau and the common Roblox APIs (instances, events, players,
              tweens, remotes, DataStores, UI). Physics, rendering and networking lag aren't
              simulated.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
