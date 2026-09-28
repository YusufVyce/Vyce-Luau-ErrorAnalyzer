import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Clock,
  FlaskConical,
  Pause,
  Radio,
  Share2,
  Hand,
  Keyboard,
  MousePointerClick,
  Play,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useLang, useT } from "@/lib/prefs";
import type { UiKey } from "@/lib/i18n/ui";
import { PageHeader } from "@/components/PageHeader";
import { CodeEditor } from "@/components/CodeEditor";
import { ExplorerTree, OutputConsole } from "@/components/learn/SimPanels";
import { Viewport2D, viewOf, type ViewShape } from "@/components/learn/Viewport2D";
import { copyText } from "@/components/CodeBlock";
import {
  explorerOf,
  fmtValue,
  type ExplorerNode,
  type OutputLine,
} from "@/lib/learn/homework/harness";
import { analyzerLink } from "@/lib/learn/lessons";
import { Color3, Vector3 } from "@/lib/luau/roblox/datatypes";
import type { Instance } from "@/lib/luau/roblox/instance";
import { World } from "@/lib/luau/roblox/world";

type PgSearch = { server?: string; client?: string };

const SAVE_KEY = "vyce-playground";

export const Route = createFileRoute("/playground")({
  validateSearch: (s: Record<string, unknown>): PgSearch => ({
    server: typeof s.server === "string" ? s.server : undefined,
    client: typeof s.client === "string" ? s.client : undefined,
  }),
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

const TEMPLATES: Record<
  string,
  { server: string; client: string; note: string; nameTr: string; noteTr: string }
> = {
  "Hello world": {
    server:
      'print("Hello from the server!")\n\ngame.Players.PlayerAdded:Connect(function(player)\n\tprint(player.Name .. " joined the game")\nend)\n',
    client:
      'local player = game.Players.LocalPlayer\nprint("Hello from " .. player.Name .. "\'s computer!")\n',
    note: "Run it, then press “Player joins”.",
    nameTr: "Merhaba dünya",
    noteTr: "Çalıştır, sonra “Oyuncu girsin”e bas.",
  },
  "Kill brick": {
    server:
      'local lava = workspace.Lava\n\nlava.Touched:Connect(function(hit)\n\tlocal humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")\n\tif humanoid then\n\t\thumanoid.Health = 0\n\t\tprint(hit.Parent.Name .. " touched the lava!")\n\tend\nend)\n',
    client: "",
    note: "Run, then press “Touch Lava”. Try removing the if-check and touch it with the rock!",
    nameTr: "Öldüren blok",
    noteTr: "Çalıştır, sonra “Lava’ya dokun”a bas. if kontrolünü silip kayayla dokunmayı dene!",
  },
  Leaderstats: {
    server:
      'local Players = game:GetService("Players")\n\nPlayers.PlayerAdded:Connect(function(player)\n\tlocal leaderstats = Instance.new("Folder")\n\tleaderstats.Name = "leaderstats"\n\tleaderstats.Parent = player\n\n\tlocal coins = Instance.new("IntValue")\n\tcoins.Name = "Coins"\n\tcoins.Parent = leaderstats\nend)\n\nwhile true do\n\ttask.wait(2)\n\tfor _, player in Players:GetPlayers() do\n\t\tplayer.leaderstats.Coins.Value += 5\n\t\tprint(player.Name, "has", player.leaderstats.Coins.Value, "coins")\n\tend\nend\n',
    client: "",
    note: "Watch the Explorer: Players › Player1 › leaderstats › Coins goes up.",
    nameTr: "Leaderstats",
    noteTr: "Explorer’ı izle: Players › Player1 › leaderstats › Coins artıyor.",
  },
  "Tween door": {
    server:
      'local TweenService = game:GetService("TweenService")\nlocal door = workspace.Part\n\nlocal tween = TweenService:Create(door, TweenInfo.new(2, Enum.EasingStyle.Quad), {\n\tPosition = door.Position + Vector3.new(0, 8, 0),\n\tTransparency = 0.5,\n})\ntween:Play()\nprint("Door starts at", door.Position)\ntween.Completed:Wait()\nprint("Door ends at", door.Position)\n',
    client: "",
    note: "The tween takes 2 simulated seconds.",
    nameTr: "Tween kapı",
    noteTr: "Tween, simülasyonda 2 saniye sürer.",
  },
  RemoteEvent: {
    server:
      'local remote = game.ReplicatedStorage.RemoteEvent\n\nremote.OnServerEvent:Connect(function(player, message)\n\tprint("Server got \\"" .. message .. "\\" from " .. player.Name)\n\tremote:FireClient(player, "Hi back!")\nend)\n',
    client:
      'local UserInputService = game:GetService("UserInputService")\nlocal remote = game.ReplicatedStorage:WaitForChild("RemoteEvent")\n\nremote.OnClientEvent:Connect(function(reply)\n\tprint("Client got:", reply)\nend)\n\nUserInputService.InputBegan:Connect(function(input)\n\tif input.KeyCode == Enum.KeyCode.E then\n\t\tremote:FireServer("I pressed E")\n\tend\nend)\n',
    note: "Run, then “Press E”.",
    nameTr: "RemoteEvent",
    noteTr: "Çalıştır, sonra “E’ye bas”.",
  },
  Countdown: {
    server: 'for i = 5, 1, -1 do\n\tprint(i)\n\ttask.wait(1)\nend\nprint("Go!")\n',
    client: "",
    note: "Loops with task.wait run on a simulated clock.",
    nameTr: "Geri sayım",
    noteTr: "task.wait içeren döngüler sanal bir saatle çalışır.",
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
  const t = useT();
  const lang = useLang();
  const [template, setTemplate] = useState("Hello world");
  const [server, setServer] = useState(TEMPLATES["Hello world"].server);
  const [client, setClient] = useState(TEMPLATES["Hello world"].client);
  const [tab, setTab] = useState<"server" | "client">("server");
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [explorer, setExplorer] = useState<ExplorerNode[]>([]);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<ViewShape[]>([]);
  const [panel, setPanel] = useState<"explorer" | "viewport">("explorer");
  const [selected, setSelected] = useState<string | undefined>();
  const [live, setLive] = useState(false);
  const [shared, setShared] = useState(false);
  const [custom, setCustom] = useState(false);
  const world = useRef<World | null>(null);
  const playerCount = useRef(0);
  const search = Route.useSearch();

  // Code from a lesson's "Open in Playground" link wins; otherwise restore the last session.
  useEffect(() => {
    if (search.server !== undefined || search.client !== undefined) {
      setServer(search.server ?? "");
      setClient(search.client ?? "");
      setTab(search.server === undefined ? "client" : "server");
      setCustom(true);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null");
      if (saved && typeof saved.server === "string") {
        setServer(saved.server);
        setClient(typeof saved.client === "string" ? saved.client : "");
        setCustom(true);
      }
    } catch {
      // ignore broken saves
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ server, client }));
      } catch {
        // storage blocked
      }
    }, 400);
    return () => clearTimeout(id);
  }, [server, client]);

  function refresh() {
    const w = world.current;
    if (!w) return;
    setOutput(w.output.map((o) => ({ kind: o.kind, text: o.text, time: o.time })));
    setExplorer(explorerOf(w));
    setView(viewOf(w));
    setTime(w.interp.time);
  }

  // Live mode: advance the simulation in real time so moving things animate.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      const w = world.current;
      if (!w) return;
      w.run(0.1);
      refresh();
    }, 100);
    return () => clearInterval(id);
  }, [live]);

  async function share() {
    const params = new URLSearchParams();
    if (server.trim()) params.set("server", server);
    if (client.trim()) params.set("client", client);
    const ok = await copyText(`${window.location.origin}/playground?${params}`);
    setShared(ok);
    setTimeout(() => setShared(false), 1800);
  }

  const selectedInst = selected && world.current ? world.current.find(selected) : undefined;
  const props = selectedInst
    ? [...selectedInst.props.entries()]
        .filter(([k]) => !/^(Archivable|RobloxLocked|UniqueId|SourceAssetId)$/.test(k))
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, 40)
        .map(([k, v]) => [k, fmtValue(v)] as const)
    : [];

  function act(fn: (w: World) => void, seconds = 1) {
    const w = world.current;
    if (!w) return;
    fn(w);
    w.run(seconds);
    refresh();
  }

  function run() {
    setRunning(true);
    setSelected(undefined);
    setTimeout(() => {
      playerCount.current = 0;
      world.current = buildWorld(server, client);
      world.current.run(3);
      setRunning(false);
      refresh();
    }, 10);
  }

  function loadTemplate(name: string) {
    setCustom(false);
    setLive(false);
    setSelected(undefined);
    setTemplate(name);
    setServer(TEMPLATES[name].server);
    setClient(TEMPLATES[name].client);
    setTab("server");
    world.current = null;
    setOutput([]);
    setExplorer([]);
    setView([]);
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

  const actions: Array<{ key: UiKey; icon: typeof Play; fn: () => void }> = [
    {
      key: "pg.join",
      icon: UserPlus,
      fn: () => act((w) => w.addPlayer(`Player${++playerCount.current}`), 1),
    },
    {
      key: "pg.leave",
      icon: UserMinus,
      fn: () => act((w) => firstPlayer() && w.removePlayer(firstPlayer()!), 1),
    },
    { key: "pg.lava", icon: Hand, fn: () => touch("Lava") },
    { key: "pg.part", icon: Hand, fn: () => touch("Part") },
    { key: "pg.key", icon: Keyboard, fn: () => act((w) => w.pressKey(firstPlayer(), "E"), 1) },
    { key: "pg.wait", icon: Clock, fn: () => act(() => undefined, 5) },
  ];

  return (
    <PageShell>
      <PageHeader
        sticker={
          <>
            <FlaskConical className="h-4 w-4 text-brand" aria-hidden="true" /> {t("pg.sticker")}
          </>
        }
        title={
          <>
            {t("pg.title1")} <span className="ep-mark">{t("pg.title2")}</span>
          </>
        }
      >
        {t("pg.lead")}
      </PageHeader>

      <div className="relative z-10 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="ep-card min-w-0 space-y-4 p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[13px] text-ink-3" htmlFor="template">
              {t("pg.example")}
            </label>
            <select
              id="template"
              value={custom ? "" : template}
              onChange={(e) => loadTemplate(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            >
              {custom && <option value="">{t("pg.mine")}</option>}
              {Object.keys(TEMPLATES).map((name) => (
                <option key={name} value={name}>
                  {lang === "tr" ? TEMPLATES[name].nameTr : name}
                </option>
              ))}
            </select>
            <span className="text-[13px] text-ink-3">
              {custom
                ? t("pg.autosave")
                : lang === "tr"
                  ? TEMPLATES[template].noteTr
                  : TEMPLATES[template].note}
            </span>
          </div>
          <div
            role="tablist"
            className="inline-flex gap-1 rounded-xl border border-line bg-surface-2 p-1 text-[13px]"
          >
            {(["server", "client"] as const).map((side) => (
              <button
                key={side}
                role="tab"
                type="button"
                aria-selected={tab === side}
                onClick={() => setTab(side)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${tab === side ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}
              >
                {side === "server" ? "Script" : "LocalScript"}
                <span className="hidden font-normal text-ink-3 sm:inline">
                  {side === "server" ? " · ServerScriptService" : " · StarterPlayerScripts"}
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
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="ep-cta inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {t(running ? "pg.starting" : world.current ? "pg.restart" : "pg.run")}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setLive((v) => !v)}
              aria-pressed={live}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] transition-colors disabled:opacity-40 ${live ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-line text-ink-2 hover:text-ink"}`}
            >
              {live ? (
                <Pause className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Radio className="h-4 w-4" aria-hidden="true" />
              )}
              {t(live ? "pg.pause" : "pg.live")}
            </button>
            <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[12px] text-ink-3">
              {live && (
                <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 align-middle" />
              )}
              {t("pg.time", { s: time.toFixed(1) })}
            </span>
            <button
              type="button"
              onClick={share}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-2 py-2 text-[13px] text-ink-3 transition-colors hover:text-brand"
            >
              {shared ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Share2 className="h-4 w-4" aria-hidden="true" />
              )}
              {t(shared ? "pg.copied" : "pg.share")}
            </button>
          </div>
          <div>
            <div className="mb-2 text-[13px] font-medium text-ink-3">{t("pg.actions")}</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {actions.map(({ key, icon: Icon, fn }) => (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={fn}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-2 text-[13px] text-ink-2 transition-colors hover:border-brand-line hover:bg-brand-soft hover:text-brand disabled:pointer-events-none disabled:opacity-40"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" /> {t(key)}
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
                className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-2 text-[13px] text-ink-2 transition-colors hover:border-brand-line hover:bg-brand-soft hover:text-brand disabled:pointer-events-none disabled:opacity-40 sm:col-span-3"
              >
                <MousePointerClick className="h-4 w-4" aria-hidden="true" /> {t("pg.click")}
              </button>
            </div>
          </div>
        </section>

        <section className="min-w-0 space-y-4">
          <div className="code-dark overflow-hidden rounded-2xl border border-code-line bg-code">
            <div className="flex items-center justify-between border-b border-code-line bg-code-head px-3 py-2 text-[13px] font-medium text-zinc-200">
              Output
              {lastError && (
                <a
                  href={analyzerLink(lastError.text, tab === "server" ? server : client)}
                  className="text-sky-300 hover:underline"
                >
                  {t("pg.explain")}
                </a>
              )}
            </div>
            <OutputConsole lines={output} emptyText={t("pg.empty")} />
          </div>
          <div className="code-dark overflow-hidden rounded-2xl border border-code-line bg-code">
            <div
              role="tablist"
              className="flex items-center gap-1 border-b border-code-line bg-code-head px-2 py-1.5 text-[13px]"
            >
              {(["explorer", "viewport"] as const).map((k) => (
                <button
                  key={k}
                  role="tab"
                  type="button"
                  aria-selected={panel === k}
                  onClick={() => setPanel(k)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${panel === k ? "bg-white/10 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
                >
                  {k === "explorer" ? "Explorer" : t("pg.viewport")}
                </button>
              ))}
            </div>
            {panel === "explorer" ? (
              <ExplorerTree
                nodes={explorer}
                emptyText={t("pg.emptyExplorer")}
                selected={selected}
                onSelect={(n) => setSelected(n.path)}
              />
            ) : (
              <Viewport2D
                shapes={view}
                selected={selected}
                onSelect={setSelected}
                emptyText={t("pg.emptyExplorer")}
              />
            )}
          </div>
          {selectedInst && (
            <div className="code-dark ep-rise overflow-hidden rounded-2xl border border-code-line bg-code">
              <div className="flex items-center justify-between border-b border-code-line bg-code-head px-3 py-2 text-[13px]">
                <span className="font-medium text-zinc-200">
                  Properties{" "}
                  <span className="font-mono text-[12px] text-zinc-500">
                    · {selectedInst.name} ({selectedInst.className})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelected(undefined)}
                  className="text-zinc-500 hover:text-zinc-200"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <dl className="max-h-64 overflow-auto px-3 py-2 font-mono text-[12px]">
                {props.map(([k, v]) => (
                  <div key={k} className="flex gap-3 border-b border-white/5 py-0.5 last:border-0">
                    <dt className="w-36 shrink-0 truncate text-zinc-400">{k}</dt>
                    <dd className="min-w-0 truncate text-sky-200">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <p className="text-[12px] leading-relaxed text-ink-3">{t("pg.note")}</p>
        </section>
      </div>
    </PageShell>
  );
}
