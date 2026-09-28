/**
 * Hand-drawn SVG illustrations for the Learn page. They mimic Roblox Studio's
 * layout and concepts without using any Roblox artwork or logos.
 */
import type { ReactNode } from "react";

export type VisualId =
  | "studio"
  | "explorer"
  | "clientServer"
  | "variables"
  | "ifFlow"
  | "loop"
  | "tables"
  | "coordinates"
  | "touched"
  | "leaderboard"
  | "tween"
  | "prompt"
  | "remote"
  | "datastore"
  | "module"
  | "output"
  | "obby";

const C = {
  bg: "#0b0f13",
  panel: "#12171d",
  panel2: "#171d24",
  line: "#27303a",
  text: "#d4d4d8",
  dim: "#71717a",
  green: "#34d399",
  blue: "#38bdf8",
  amber: "#fbbf24",
  red: "#f87171",
  pink: "#f472b6",
  violet: "#a78bfa",
};

function Frame({
  children,
  viewBox,
  label,
}: {
  children: ReactNode;
  viewBox: string;
  label: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={label}
      className="h-auto w-full"
      style={{ fontFamily: "JetBrains Mono, monospace" }}
    >
      <title>{label}</title>
      {children}
    </svg>
  );
}

function T({
  x,
  y,
  children,
  size = 11,
  fill = C.text,
  anchor = "start",
  weight = 400,
}: {
  x: number | string;
  y: number | string;
  children: ReactNode;
  size?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  weight?: number;
}) {
  return (
    <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontWeight={weight}>
      {children}
    </text>
  );
}

function Icon({ x, y, color, letter }: { x: number; y: number; color: string; letter: string }) {
  return (
    <g>
      <rect x={x} y={y - 9} width={12} height={12} rx={3} fill={color} opacity={0.9} />
      <T x={x + 6} y={y} size={8} fill="#0b0f13" anchor="middle" weight={700}>
        {letter}
      </T>
    </g>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  color = C.green,
  dashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  dashed?: boolean;
}) {
  const id = `ah-${color.slice(1)}`;
  return (
    <g>
      <defs>
        <marker
          id={id}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={color} />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={2}
        markerEnd={`url(#${id})`}
        strokeDasharray={dashed ? "5 4" : undefined}
      />
    </g>
  );
}

function Studio() {
  return (
    <Frame
      viewBox="0 0 640 380"
      label="Roblox Studio window: viewport in the middle, Explorer and Properties on the right, Output at the bottom"
    >
      <rect width="640" height="380" rx="12" fill={C.bg} />
      {/* ribbon */}
      <rect x="0" y="0" width="640" height="44" rx="12" fill={C.panel2} />
      <rect x="0" y="30" width="640" height="14" fill={C.panel2} />
      {["Home", "Model", "Avatar", "Test", "View", "Plugins"].map((tab, i) => (
        <T key={tab} x={16 + i * 62} y={18} size={10} fill={i === 0 ? C.green : C.dim}>
          {tab}
        </T>
      ))}
      <g>
        <rect x="16" y="26" width="46" height="14" rx="3" fill="#1f2937" />
        <T x="39" y="36" size={8} anchor="middle">
          Part
        </T>
        <rect x="68" y="26" width="46" height="14" rx="3" fill="#14532d" />
        <T x="91" y="36" size={8} anchor="middle" fill={C.green}>
          ▶ Play
        </T>
        <rect x="120" y="26" width="46" height="14" rx="3" fill="#1f2937" />
        <T x="143" y="36" size={8} anchor="middle">
          ■ Stop
        </T>
      </g>
      {/* viewport */}
      <rect x="10" y="52" width="430" height="226" rx="6" fill="#1b2a3a" />
      <polygon points="40,250 420,250 380,200 80,200" fill="#2b4a33" />
      <polygon points="190,185 250,170 290,185 230,200" fill="#94a3b8" />
      <polygon points="190,185 230,200 230,230 190,215" fill="#64748b" />
      <polygon points="230,200 290,185 290,215 230,230" fill="#475569" />
      <rect
        x="185"
        y="165"
        width="110"
        height="70"
        fill="none"
        stroke={C.blue}
        strokeDasharray="4 3"
      />
      <T x="298" y="170" size={9} fill={C.blue}>
        Part (selected)
      </T>
      <T x="20" y="70" size={10} fill={C.dim}>
        3D viewport — build your world here
      </T>
      {/* explorer */}
      <rect x="450" y="52" width="180" height="150" rx="6" fill={C.panel} />
      <T x="460" y="68" size={10} fill={C.green} weight={700}>
        Explorer
      </T>
      {[
        ["Workspace", C.blue, "W", 0],
        ["Part", C.dim, "P", 1],
        ["Players", C.blue, "P", 0],
        ["ReplicatedStorage", C.blue, "R", 0],
        ["ServerScriptService", C.blue, "S", 0],
        ["Script", C.green, "S", 1],
        ["StarterGui", C.blue, "G", 0],
        ["StarterPlayer", C.blue, "P", 0],
      ].map(([name, color, letter, indent], i) => (
        <g key={String(name)}>
          <Icon
            x={462 + Number(indent) * 14}
            y={86 + i * 14}
            color={String(color)}
            letter={String(letter)}
          />
          <T x={478 + Number(indent) * 14} y={86 + i * 14} size={9}>
            {String(name)}
          </T>
        </g>
      ))}
      {/* properties */}
      <rect x="450" y="208" width="180" height="70" rx="6" fill={C.panel} />
      <T x="460" y="224" size={10} fill={C.amber} weight={700}>
        Properties
      </T>
      <T x="460" y="240" size={9} fill={C.dim}>
        Anchored
      </T>
      <T x="560" y="240" size={9} fill={C.green}>
        ☑ true
      </T>
      <T x="460" y="254" size={9} fill={C.dim}>
        Color
      </T>
      <rect x="560" y="246" width="10" height="10" fill="#94a3b8" />
      <T x="460" y="268" size={9} fill={C.dim}>
        Size
      </T>
      <T x="560" y="268" size={9}>
        4, 1, 2
      </T>
      {/* output */}
      <rect x="10" y="286" width="620" height="84" rx="6" fill={C.panel} />
      <T x="20" y="302" size={10} fill={C.pink} weight={700}>
        Output
      </T>
      <T x="20" y="320" size={9}>
        Hello world!
      </T>
      <T x="20" y="336" size={9} fill={C.amber}>
        Infinite yield possible on 'Players.You:WaitForChild("leaderstats")'
      </T>
      <T x="20" y="352" size={9} fill={C.red}>
        ServerScriptService.Script:3: attempt to index nil with 'Humanoid'
      </T>
      <T x="620" y="302" size={9} fill={C.dim} anchor="end">
        View → Output
      </T>
    </Frame>
  );
}

function Explorer() {
  const rows: Array<[string, string, string, number, string?]> = [
    ["Workspace", C.blue, "W", 0, "Parts & models players can see"],
    ["Players", C.blue, "P", 0, "One Player object per person"],
    ["ReplicatedStorage", C.blue, "R", 0, "Shared: server AND clients"],
    ["RemoteEvent", C.amber, "E", 1],
    ["ModuleScript", C.violet, "M", 1],
    ["ServerScriptService", C.blue, "S", 0, "Server-only scripts"],
    ["Script", C.green, "S", 1],
    ["ServerStorage", C.blue, "S", 0, "Server-only storage (clients can't see)"],
    ["StarterGui", C.blue, "G", 0, "UI copied to each player"],
    ["StarterPlayer › StarterPlayerScripts", C.blue, "P", 0, "Client scripts"],
    ["LocalScript", C.pink, "L", 1],
  ];
  return (
    <Frame viewBox="0 0 640 300" label="Explorer tree showing where each kind of script goes">
      <rect width="640" height="300" rx="12" fill={C.bg} />
      <rect x="14" y="14" width="300" height="272" rx="8" fill={C.panel} />
      <T x="28" y="36" size={12} fill={C.green} weight={700}>
        Explorer
      </T>
      {rows.map(([name, color, letter, indent, note], i) => {
        const y = 60 + i * 20;
        return (
          <g key={name}>
            <Icon x={30 + indent * 18} y={y} color={color} letter={letter} />
            <T x={48 + indent * 18} y={y} size={10} fill={indent ? color : C.text}>
              {name}
            </T>
            {note && (
              <>
                <line x1={300} y1={y - 4} x2={330} y2={y - 4} stroke={C.line} />
                <T x={336} y={y} size={10} fill={C.dim}>
                  {note}
                </T>
              </>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

function ClientServer() {
  return (
    <Frame
      viewBox="0 0 640 280"
      label="One server, many clients. The server runs Scripts, each player's computer runs LocalScripts."
    >
      <rect width="640" height="280" rx="12" fill={C.bg} />
      <rect x="230" y="20" width="180" height="96" rx="10" fill="#0f2a1f" stroke={C.green} />
      <T x="320" y="44" size={13} anchor="middle" fill={C.green} weight={700}>
        SERVER
      </T>
      <T x="320" y="64" size={10} anchor="middle">
        Roblox's computer
      </T>
      <T x="320" y="82" size={10} anchor="middle" fill={C.dim}>
        runs Script
      </T>
      <T x="320" y="100" size={10} anchor="middle" fill={C.dim}>
        owns coins, damage, saving
      </T>
      {[60, 250, 440].map((x, i) => (
        <g key={x}>
          <rect x={x} y={176} width={140} height={84} rx={10} fill="#2a0f22" stroke={C.pink} />
          <T x={x + 70} y={198} size={12} anchor="middle" fill={C.pink} weight={700}>
            CLIENT {i + 1}
          </T>
          <T x={x + 70} y={216} size={10} anchor="middle">
            a player's device
          </T>
          <T x={x + 70} y={234} size={10} anchor="middle" fill={C.dim}>
            runs LocalScript
          </T>
          <T x={x + 70} y={250} size={10} anchor="middle" fill={C.dim}>
            UI, input, camera
          </T>
          <Arrow x1={x + 70} y1={174} x2={300 + (i - 1) * 20} y2={122} color={C.amber} />
        </g>
      ))}
      <T x="320" y="150" size={10} anchor="middle" fill={C.amber}>
        talk through RemoteEvents
      </T>
    </Frame>
  );
}

function Variables() {
  const boxes: Array<[string, string, string, string]> = [
    ["coins", "100", "number", C.amber],
    ["playerName", '"Builderman"', "string", C.green],
    ["isAlive", "true", "boolean", C.blue],
    ["target", "nil", "nothing!", C.red],
  ];
  return (
    <Frame viewBox="0 0 640 170" label="Variables are labeled boxes that hold one value">
      <rect width="640" height="170" rx="12" fill={C.bg} />
      {boxes.map(([name, value, type, color], i) => {
        const x = 20 + i * 155;
        return (
          <g key={name}>
            <rect
              x={x}
              y={40}
              width={140}
              height={80}
              rx={10}
              fill={C.panel}
              stroke={color}
              strokeWidth={1.5}
            />
            <rect
              x={x + 10}
              y={28}
              width={Math.max(60, name.length * 8 + 16)}
              height={22}
              rx={6}
              fill={color}
            />
            <T x={x + 18} y={43} size={11} fill="#0b0f13" weight={700}>
              {name}
            </T>
            <T x={x + 70} y={90} size={14} anchor="middle" weight={700}>
              {value}
            </T>
            <T x={x + 70} y={145} size={10} anchor="middle" fill={C.dim}>
              {type}
            </T>
          </g>
        );
      })}
    </Frame>
  );
}

function IfFlow() {
  return (
    <Frame viewBox="0 0 640 230" label="An if statement chooses one of two paths">
      <rect width="640" height="230" rx="12" fill={C.bg} />
      <rect x="240" y="16" width="160" height="34" rx="8" fill={C.panel} stroke={C.line} />
      <T x="320" y="38" size={11} anchor="middle">
        player touches top
      </T>
      <Arrow x1={320} y1={50} x2={320} y2={72} color={C.dim} />
      <polygon points="320,74 420,114 320,154 220,114" fill="#1e1b4b" stroke={C.violet} />
      <T x="320" y="110" size={11} anchor="middle" fill={C.violet}>
        if stage == 10
      </T>
      <T x="320" y="126" size={11} anchor="middle" fill={C.violet}>
        then
      </T>
      <Arrow x1={420} y1={114} x2={500} y2={114} color={C.green} />
      <T x="460" y="106" size={10} anchor="middle" fill={C.green}>
        true
      </T>
      <rect x="502" y="94" width="124" height="40" rx="8" fill="#0f2a1f" stroke={C.green} />
      <T x="564" y="118" size={11} anchor="middle" fill={C.green}>
        Wins += 1 🏆
      </T>
      <Arrow x1={220} y1={114} x2={140} y2={114} color={C.red} />
      <T x="180" y="106" size={10} anchor="middle" fill={C.red}>
        false
      </T>
      <rect x="14" y="94" width="124" height="40" rx="8" fill="#2a1111" stroke={C.red} />
      <T x="76" y="118" size={11} anchor="middle" fill={C.red}>
        keep climbing
      </T>
      <T x="320" y="200" size={10} anchor="middle" fill={C.dim}>
        Only one branch runs. The condition is either true or false.
      </T>
    </Frame>
  );
}

function Loop() {
  return (
    <Frame viewBox="0 0 640 220" label="A loop repeats code; task.wait lets the game keep running">
      <rect width="640" height="220" rx="12" fill={C.bg} />
      <circle
        cx="170"
        cy="110"
        r="70"
        fill="none"
        stroke={C.blue}
        strokeWidth={3}
        strokeDasharray="8 6"
      />
      <T x="170" y="100" size={12} anchor="middle" fill={C.blue} weight={700}>
        while true do
      </T>
      <T x="170" y="118" size={11} anchor="middle">
        spawn lava
      </T>
      <T x="170" y="136" size={11} anchor="middle" fill={C.green}>
        task.wait(5)
      </T>
      <T x="170" y="202" size={10} anchor="middle" fill={C.dim}>
        repeats forever, pauses 5 s each time
      </T>
      <rect x="340" y="40" width="280" height="140" rx="10" fill={C.panel} stroke={C.line} />
      <T x="356" y="64" size={11} fill={C.amber} weight={700}>
        for i = 10, 1, -1 do
      </T>
      {[10, 9, 8, 3, 2, 1].map((n, i) => (
        <g key={n}>
          <rect
            x={356 + i * 42}
            y={84}
            width={34}
            height={34}
            rx={6}
            fill={i < 3 ? "#2a2410" : "#2a1111"}
            stroke={i < 3 ? C.amber : C.red}
          />
          <T x={373 + i * 42} y={106} size={12} anchor="middle" weight={700}>
            {n}
          </T>
        </g>
      ))}
      <T x="356" y="146" size={10} fill={C.dim}>
        counts down: a round timer
      </T>
      <T x="356" y="164" size={10} fill={C.dim}>
        runs exactly 10 times, then stops
      </T>
    </Frame>
  );
}

function Tables() {
  return (
    <Frame viewBox="0 0 640 220" label="Arrays are numbered lists, dictionaries use named keys">
      <rect width="640" height="220" rx="12" fill={C.bg} />
      <T x="20" y="30" size={12} fill={C.green} weight={700}>
        Array (list)
      </T>
      {['"Dog"', '"Cat"', '"Dragon"', '"Unicorn"'].map((v, i) => (
        <g key={v}>
          <rect
            x={20 + i * 76}
            y={44}
            width={70}
            height={46}
            rx={8}
            fill={C.panel}
            stroke={C.green}
          />
          <T x={55 + i * 76} y={72} size={11} anchor="middle">
            {v}
          </T>
          <T x={55 + i * 76} y={106} size={10} anchor="middle" fill={C.dim}>
            [{i + 1}]
          </T>
        </g>
      ))}
      <T x="20" y="132" size={10} fill={C.dim}>
        pets[3] → "Dragon" (Luau starts counting at 1!)
      </T>
      <T x="350" y="30" size={12} fill={C.amber} weight={700}>
        Dictionary
      </T>
      {[
        ["Name", '"Shadow Dragon"'],
        ["Rarity", '"Legendary"'],
        ["Power", "950"],
      ].map(([k, v], i) => (
        <g key={k}>
          <rect
            x={350}
            y={44 + i * 40}
            width={100}
            height={32}
            rx={6}
            fill="#2a2410"
            stroke={C.amber}
          />
          <T x={400} y={64 + i * 40} size={11} anchor="middle" fill={C.amber}>
            {k}
          </T>
          <Arrow x1={452} y1={60 + i * 40} x2={478} y2={60 + i * 40} color={C.dim} />
          <rect
            x={480}
            y={44 + i * 40}
            width={146}
            height={32}
            rx={6}
            fill={C.panel}
            stroke={C.line}
          />
          <T x={553} y={64 + i * 40} size={11} anchor="middle">
            {v}
          </T>
        </g>
      ))}
      <T x="350" y="190" size={10} fill={C.dim}>
        pet.Rarity → "Legendary"
      </T>
    </Frame>
  );
}

function Coordinates() {
  return (
    <Frame
      viewBox="0 0 640 240"
      label="3D coordinates: X, Y (up) and Z. Position is where a part is, Size is how big it is."
    >
      <rect width="640" height="240" rx="12" fill={C.bg} />
      <g transform="translate(150,170)">
        <Arrow x1={0} y1={0} x2={120} y2={0} color={C.red} />
        <T x={126} y={4} size={12} fill={C.red} weight={700}>
          X
        </T>
        <Arrow x1={0} y1={0} x2={0} y2={-120} color={C.green} />
        <T x={-4} y={-126} size={12} fill={C.green} weight={700}>
          Y (up)
        </T>
        <Arrow x1={0} y1={0} x2={-70} y2={50} color={C.blue} />
        <T x={-86} y={64} size={12} fill={C.blue} weight={700}>
          Z
        </T>
        <polygon points="40,-60 90,-72 120,-60 70,-48" fill="#94a3b8" />
        <polygon points="40,-60 70,-48 70,-18 40,-30" fill="#64748b" />
        <polygon points="70,-48 120,-60 120,-30 70,-18" fill="#475569" />
        <circle cx="80" cy="-45" r="3" fill={C.amber} />
      </g>
      <rect x="340" y="40" width="280" height="160" rx="10" fill={C.panel} stroke={C.line} />
      <T x="356" y="66" size={11} fill={C.amber}>
        part.Position
      </T>
      <T x="356" y="84" size={11}>
        = Vector3.new(0, 10, 0)
      </T>
      <T x="356" y="102" size={10} fill={C.dim}>
        the center point (● above)
      </T>
      <T x="356" y="130" size={11} fill={C.amber}>
        part.Size
      </T>
      <T x="356" y="148" size={11}>
        = Vector3.new(4, 1, 2)
      </T>
      <T x="356" y="166" size={10} fill={C.dim}>
        width, height, depth in studs
      </T>
      <T x="356" y="188" size={10} fill={C.dim}>
        CFrame = position + rotation
      </T>
    </Frame>
  );
}

function Touched() {
  return (
    <Frame
      viewBox="0 0 640 220"
      label="When a character touches a kill brick, the Touched event fires and runs your function"
    >
      <rect width="640" height="220" rx="12" fill={C.bg} />
      <rect x="40" y="150" width="200" height="26" rx="4" fill="#7f1d1d" stroke={C.red} />
      <T x="140" y="168" size={11} anchor="middle" fill="#fecaca" weight={700}>
        KillBrick
      </T>
      <g transform="translate(120,70)">
        <rect x="-12" y="0" width="24" height="24" rx="4" fill="#fcd34d" />
        <rect x="-18" y="26" width="36" height="34" rx="4" fill="#3b82f6" />
        <rect x="-16" y="60" width="14" height="20" fill="#16a34a" />
        <rect x="2" y="60" width="14" height="20" fill="#16a34a" />
      </g>
      <T x="200" y="140" size={20} fill={C.amber}>
        ⚡
      </T>
      <Arrow x1={250} y1={150} x2={340} y2={110} color={C.amber} />
      <rect x="344" y="40" width="280" height="140" rx="10" fill={C.panel} stroke={C.amber} />
      <T x="360" y="64" size={11} fill={C.amber}>
        part.Touched:Connect(function(hit)
      </T>
      <T x="376" y="88" size={11}>
        hit = the part that touched
      </T>
      <T x="376" y="108" size={11} fill={C.dim}>
        (a leg, an arm, a hat…)
      </T>
      <T x="376" y="132" size={11}>
        hit.Parent = the character
      </T>
      <T x="376" y="152" size={11} fill={C.green}>
        humanoid.Health = 0
      </T>
      <T x="360" y="172" size={11} fill={C.amber}>
        end)
      </T>
    </Frame>
  );
}

function Leaderboard() {
  const rows: Array<[string, number, number]> = [
    ["Builderman", 1250, 12],
    ["You", 980, 9],
    ["NoobMaster", 310, 2],
  ];
  return (
    <Frame
      viewBox="0 0 640 210"
      label="The leaderboard in the top-right corner shows values inside each player's leaderstats folder"
    >
      <rect width="640" height="210" rx="12" fill={C.bg} />
      <rect x="340" y="20" width="280" height="130" rx="8" fill="#111827" stroke={C.line} />
      <T x="356" y="42" size={11} fill={C.dim}>
        Player
      </T>
      <T x="520" y="42" size={11} fill={C.amber} anchor="end">
        Coins
      </T>
      <T x="604" y="42" size={11} fill={C.blue} anchor="end">
        Wins
      </T>
      {rows.map(([name, coins, wins], i) => (
        <g key={name}>
          <rect
            x={348}
            y={52 + i * 30}
            width={264}
            height={26}
            rx={4}
            fill={name === "You" ? "#14532d" : "transparent"}
          />
          <T x={356} y={70 + i * 30} size={11}>
            {name}
          </T>
          <T x={520} y={70 + i * 30} size={11} anchor="end">
            {coins}
          </T>
          <T x={604} y={70 + i * 30} size={11} anchor="end">
            {wins}
          </T>
        </g>
      ))}
      <rect x="20" y="20" width="290" height="170" rx="8" fill={C.panel} />
      <T x="34" y="42" size={11} fill={C.green} weight={700}>
        Explorer (while playing)
      </T>
      <Icon x={36} y={66} color={C.blue} letter="P" />
      <T x={54} y={66} size={10}>
        Players
      </T>
      <Icon x={54} y={86} color={C.pink} letter="P" />
      <T x={72} y={86} size={10}>
        You
      </T>
      <Icon x={72} y={106} color={C.amber} letter="F" />
      <T x={90} y={106} size={10} fill={C.amber}>
        leaderstats ← exact name!
      </T>
      <Icon x={90} y={126} color={C.green} letter="I" />
      <T x={108} y={126} size={10}>
        Coins (IntValue) = 980
      </T>
      <Icon x={90} y={146} color={C.green} letter="I" />
      <T x={108} y={146} size={10}>
        Wins (IntValue) = 9
      </T>
      <Arrow x1={300} y1={96} x2={336} y2={80} color={C.green} dashed />
    </Frame>
  );
}

function Tween() {
  return (
    <Frame
      viewBox="0 0 640 230"
      label="A tween smoothly animates a property from a start value to a goal"
    >
      <rect width="640" height="230" rx="12" fill={C.bg} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={40 + i * 60}
          y={60}
          width={50}
          height={100}
          rx={4}
          fill="#78350f"
          stroke={C.amber}
          opacity={0.25 + i * 0.18}
          transform={`translate(0 ${i * -10})`}
        />
      ))}
      <rect x="30" y="160" width="330" height="6" fill={C.line} />
      <T x="40" y="190" size={10} fill={C.dim}>
        start
      </T>
      <T x="300" y="190" size={10} fill={C.dim}>
        goal: slides up &amp; open
      </T>
      <rect x="390" y="30" width="230" height="170" rx="10" fill={C.panel} stroke={C.line} />
      <T x="404" y="52" size={11} fill={C.amber}>
        Easing: Quad Out
      </T>
      <path d="M410 180 C 460 60, 540 50, 600 50" stroke={C.green} strokeWidth={3} fill="none" />
      <line x1="410" y1="180" x2="600" y2="180" stroke={C.line} />
      <line x1="410" y1="180" x2="410" y2="50" stroke={C.line} />
      <T x="505" y="196" size={10} anchor="middle" fill={C.dim}>
        time →
      </T>
      <T x="420" y="70" size={10} fill={C.dim}>
        fast, then gently stops
      </T>
    </Frame>
  );
}

function Prompt() {
  return (
    <Frame
      viewBox="0 0 640 220"
      label="A ProximityPrompt shows a key to press when you walk close to an object"
    >
      <rect width="640" height="220" rx="12" fill={C.bg} />
      <rect x="220" y="60" width="90" height="140" rx="4" fill="#3f2a14" stroke={C.amber} />
      <circle cx="295" cy="130" r="4" fill={C.amber} />
      <g transform="translate(265,20)">
        <rect x="-70" y="0" width="140" height="44" rx="10" fill="#111827" stroke={C.line} />
        <rect x="-60" y="8" width="28" height="28" rx="6" fill="#e5e7eb" />
        <T x={-46} y={27} size={14} anchor="middle" fill="#111827" weight={700}>
          E
        </T>
        <T x={-22} y={20} size={10} fill={C.dim}>
          Door
        </T>
        <T x={-22} y={34} size={12} weight={700}>
          Open
        </T>
      </g>
      <circle
        cx="265"
        cy="130"
        r="90"
        fill="none"
        stroke={C.blue}
        strokeDasharray="5 5"
        opacity={0.6}
      />
      <T x="370" y="140" size={10} fill={C.blue}>
        MaxActivationDistance
      </T>
      <rect x="430" y="40" width="190" height="120" rx="10" fill={C.panel} stroke={C.line} />
      <T x="444" y="64" size={11} fill={C.amber}>
        prompt.Triggered
      </T>
      <T x="444" y="82" size={11} fill={C.amber}>
        :Connect(function(player)
      </T>
      <T x="460" y="106" size={11}>
        open the door
      </T>
      <T x="444" y="130" size={11} fill={C.amber}>
        end)
      </T>
      <T x="444" y="150" size={10} fill={C.dim}>
        gives you the player!
      </T>
    </Frame>
  );
}

function Remote() {
  return (
    <Frame
      viewBox="0 0 640 250"
      label="A button on the client fires a RemoteEvent; the server checks and gives the reward"
    >
      <rect width="640" height="250" rx="12" fill={C.bg} />
      <rect x="20" y="30" width="200" height="190" rx="10" fill="#2a0f22" stroke={C.pink} />
      <T x="120" y="54" size={12} anchor="middle" fill={C.pink} weight={700}>
        CLIENT (LocalScript)
      </T>
      <rect x="60" y="80" width="120" height="36" rx="8" fill={C.green} />
      <T x="120" y="103" size={12} anchor="middle" fill="#052e16" weight={700}>
        BUY SWORD
      </T>
      <T x="120" y="150" size={10} anchor="middle">
        remote:FireServer(
      </T>
      <T x="120" y="166" size={10} anchor="middle">
        "Sword")
      </T>
      <rect x="420" y="30" width="200" height="190" rx="10" fill="#0f2a1f" stroke={C.green} />
      <T x="520" y="54" size={12} anchor="middle" fill={C.green} weight={700}>
        SERVER (Script)
      </T>
      <T x="520" y="84" size={10} anchor="middle">
        OnServerEvent(player,
      </T>
      <T x="520" y="100" size={10} anchor="middle">
        itemName)
      </T>
      <T x="520" y="130" size={10} anchor="middle" fill={C.amber}>
        ✔ has enough coins?
      </T>
      <T x="520" y="150" size={10} anchor="middle" fill={C.amber}>
        ✔ item exists?
      </T>
      <T x="520" y="176" size={10} anchor="middle" fill={C.green}>
        give sword, take coins
      </T>
      <Arrow x1={225} y1={100} x2={415} y2={100} color={C.amber} />
      <T x="320" y="92" size={10} anchor="middle" fill={C.amber}>
        RemoteEvent
      </T>
      <T x="320" y="120" size={10} anchor="middle" fill={C.dim}>
        player is added automatically
      </T>
      <Arrow x1={415} y1={190} x2={225} y2={190} color={C.blue} dashed />
      <T x="320" y="182" size={10} anchor="middle" fill={C.blue}>
        FireClient(player, …)
      </T>
      <T x="320" y="238" size={10} anchor="middle" fill={C.red}>
        Never trust numbers sent by the client — exploiters can send anything.
      </T>
    </Frame>
  );
}

function DataStore() {
  return (
    <Frame
      viewBox="0 0 640 220"
      label="DataStores save player data in Roblox's cloud when they leave and load it when they join"
    >
      <rect width="640" height="220" rx="12" fill={C.bg} />
      <rect x="40" y="70" width="170" height="90" rx="10" fill="#0f2a1f" stroke={C.green} />
      <T x="125" y="100" size={12} anchor="middle" fill={C.green} weight={700}>
        Game server
      </T>
      <T x="125" y="120" size={10} anchor="middle">
        Coins = 980
      </T>
      <T x="125" y="138" size={10} anchor="middle">
        Plants = 12
      </T>
      <path
        d="M470 70 a36 36 0 0 1 66 -10 a30 30 0 0 1 50 26 a26 26 0 0 1 -10 50 h-120 a30 30 0 0 1 14 -66z"
        fill={C.panel}
        stroke={C.blue}
      />
      <T x="520" y="110" size={12} anchor="middle" fill={C.blue} weight={700}>
        DataStore
      </T>
      <T x="520" y="128" size={10} anchor="middle" fill={C.dim}>
        key: "Player_1234"
      </T>
      <Arrow x1={215} y1={95} x2={455} y2={95} color={C.amber} />
      <T x="335" y="86" size={10} anchor="middle" fill={C.amber}>
        SetAsync when they leave
      </T>
      <Arrow x1={455} y1={140} x2={215} y2={140} color={C.blue} />
      <T x="335" y="158" size={10} anchor="middle" fill={C.blue}>
        GetAsync when they join
      </T>
      <T x="320" y="200" size={10} anchor="middle" fill={C.dim}>
        Wrap both in pcall — cloud requests can fail.
      </T>
    </Frame>
  );
}

function Module() {
  return (
    <Frame
      viewBox="0 0 640 200"
      label="A ModuleScript is shared code that other scripts load with require"
    >
      <rect width="640" height="200" rx="12" fill={C.bg} />
      <rect x="230" y="20" width="180" height="90" rx="10" fill="#1e1b4b" stroke={C.violet} />
      <T x="320" y="44" size={12} anchor="middle" fill={C.violet} weight={700}>
        ModuleScript
      </T>
      <T x="320" y="64" size={10} anchor="middle">
        PetConfig
      </T>
      <T x="320" y="82" size={10} anchor="middle" fill={C.dim}>
        rarities, prices…
      </T>
      <T x="320" y="100" size={10} anchor="middle" fill={C.green}>
        return PetConfig
      </T>
      {[
        [40, "Shop Script"],
        [250, "Hatch Script"],
        [460, "UI LocalScript"],
      ].map(([x, label]) => (
        <g key={String(label)}>
          <rect
            x={Number(x)}
            y={150}
            width={140}
            height={36}
            rx={8}
            fill={C.panel}
            stroke={C.line}
          />
          <T x={Number(x) + 70} y={173} size={10} anchor="middle">
            {String(label)}
          </T>
          <Arrow
            x1={Number(x) + 70}
            y1={148}
            x2={320 + (Number(x) - 250) / 4}
            y2={114}
            color={C.violet}
          />
        </g>
      ))}
      <T x="560" y="130" size={10} fill={C.dim} anchor="end">
        require(PetConfig)
      </T>
    </Frame>
  );
}

function Output() {
  return (
    <Frame viewBox="0 0 640 200" label="How to read an error in the Output window">
      <rect width="640" height="200" rx="12" fill={C.bg} />
      <rect x="20" y="20" width="600" height="60" rx="8" fill={C.panel} />
      <T x="34" y="56" size={12} fill={C.red}>
        ServerScriptService.Shop:14: attempt to index nil with 'Coins'
      </T>
      <line x1="34" y1="64" x2="240" y2="64" stroke={C.blue} strokeWidth={2} />
      <line x1="250" y1="64" x2="266" y2="64" stroke={C.amber} strokeWidth={2} />
      <line x1="276" y1="64" x2="560" y2="64" stroke={C.green} strokeWidth={2} />
      <T x="34" y="110" size={11} fill={C.blue}>
        ① which script
      </T>
      <T x="34" y="128" size={10} fill={C.dim}>
        ServerScriptService › Shop
      </T>
      <T x="250" y="110" size={11} fill={C.amber}>
        ② line
      </T>
      <T x="250" y="128" size={10} fill={C.dim}>
        line 14
      </T>
      <T x="380" y="110" size={11} fill={C.green}>
        ③ what went wrong
      </T>
      <T x="380" y="128" size={10} fill={C.dim}>
        something before .Coins is nil
      </T>
      <T x="34" y="170" size={10} fill={C.dim}>
        Click the red line in Output to jump straight to it. Blue = info, orange = warning, red =
        error.
      </T>
    </Frame>
  );
}

function Obby() {
  return (
    <Frame
      viewBox="0 0 640 220"
      label="Mini project: an obby with checkpoints, kill bricks and coins"
    >
      <rect width="640" height="220" rx="12" fill={C.bg} />
      <rect x="20" y="170" width="90" height="16" fill="#16a34a" />
      <T x="65" y="204" size={10} anchor="middle" fill={C.dim}>
        Spawn
      </T>
      <rect x="140" y="150" width="60" height="12" fill="#64748b" />
      <rect x="230" y="130" width="60" height="12" fill="#7f1d1d" stroke={C.red} />
      <T x="260" y="120" size={9} anchor="middle" fill={C.red}>
        kill brick
      </T>
      <rect x="320" y="110" width="60" height="12" fill="#64748b" />
      <circle cx="350" cy="92" r="8" fill={C.amber} />
      <T x="350" y="78" size={9} anchor="middle" fill={C.amber}>
        coin
      </T>
      <rect x="410" y="90" width="60" height="12" fill="#1d4ed8" stroke={C.blue} />
      <T x="440" y="80" size={9} anchor="middle" fill={C.blue}>
        checkpoint
      </T>
      <rect x="500" y="60" width="110" height="14" fill="#a16207" />
      <T x="555" y="50" size={11} anchor="middle" fill={C.amber}>
        🏆 finish
      </T>
      <path
        d="M65 165 Q 120 120 170 145 T 260 125 T 350 105 T 440 85 T 540 55"
        stroke={C.green}
        strokeDasharray="4 4"
        fill="none"
      />
    </Frame>
  );
}

const VISUALS: Record<VisualId, () => ReactNode> = {
  studio: Studio,
  explorer: Explorer,
  clientServer: ClientServer,
  variables: Variables,
  ifFlow: IfFlow,
  loop: Loop,
  tables: Tables,
  coordinates: Coordinates,
  touched: Touched,
  leaderboard: Leaderboard,
  tween: Tween,
  prompt: Prompt,
  remote: Remote,
  datastore: DataStore,
  module: Module,
  output: Output,
  obby: Obby,
};

export function Visual({ id, caption }: { id: VisualId; caption?: string }) {
  const Component = VISUALS[id];
  return (
    <figure className="code-dark overflow-hidden rounded-xl border border-code-line bg-code">
      <Component />
      {caption && (
        <figcaption className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
