import type { Color3, Vector3 } from "@/lib/luau/roblox/datatypes";
import type { Instance } from "@/lib/luau/roblox/instance";
import type { World } from "@/lib/luau/roblox/world";

export interface ViewShape {
  name: string;
  path: string;
  x: number;
  z: number;
  sx: number;
  sz: number;
  color: string;
  alpha: number;
  kind: "part" | "player";
}

const hex = (c?: Color3) =>
  c
    ? `rgb(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)})`
    : "rgb(163, 162, 165)";

/** Top-down snapshot of the parts and players in Workspace. */
export function viewOf(world: World): ViewShape[] {
  const out: ViewShape[] = [];
  const chars = new Set(
    world.players().map((p) => p.props.get("Character") as Instance | undefined),
  );
  for (const d of world.workspace.descendants()) {
    if (!d.isA("BasePart") || d.name === "Baseplate" || d.className === "Terrain") continue;
    if (d.parent && chars.has(d.parent)) continue;
    const pos = d.props.get("Position") as Vector3 | undefined;
    const size = d.props.get("Size") as Vector3 | undefined;
    if (!pos || !size) continue;
    out.push({
      name: d.name,
      path: d.getFullName(),
      x: pos.x,
      z: pos.z,
      sx: size.x,
      sz: size.z,
      color: hex(d.props.get("Color") as Color3 | undefined),
      alpha: 1 - Math.min(1, Math.max(0, (d.props.get("Transparency") as number) ?? 0)),
      kind: "part",
    });
  }
  for (const c of chars) {
    const root = c?.findFirstChild("HumanoidRootPart");
    const pos = root?.props.get("Position") as Vector3 | undefined;
    if (c && pos)
      out.push({
        name: c.name,
        path: c.getFullName(),
        x: pos.x,
        z: pos.z,
        sx: 2,
        sz: 2,
        color: "#82aaff",
        alpha: 1,
        kind: "player",
      });
  }
  return out;
}

/** Studio-like top view: grid, parts as rectangles, players as dots. */
export function Viewport2D({
  shapes,
  selected,
  onSelect,
  emptyText,
}: {
  shapes: ViewShape[];
  selected?: string;
  onSelect?: (path: string) => void;
  emptyText: string;
}) {
  if (shapes.length === 0) return <p className="p-3 text-xs text-zinc-500">{emptyText}</p>;
  let minX = -30;
  let maxX = 30;
  let minZ = -30;
  let maxZ = 30;
  for (const s of shapes) {
    minX = Math.min(minX, s.x - s.sx / 2 - 4);
    maxX = Math.max(maxX, s.x + s.sx / 2 + 4);
    minZ = Math.min(minZ, s.z - s.sz / 2 - 4);
    maxZ = Math.max(maxZ, s.z + s.sz / 2 + 4);
  }
  const w = maxX - minX;
  const h = maxZ - minZ;
  const grid = [];
  for (let gx = Math.ceil(minX / 10) * 10; gx <= maxX; gx += 10)
    grid.push(
      <line
        key={`x${gx}`}
        x1={gx}
        y1={minZ}
        x2={gx}
        y2={maxZ}
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={gx === 0 ? 0.35 : 0.2}
      />,
    );
  for (let gz = Math.ceil(minZ / 10) * 10; gz <= maxZ; gz += 10)
    grid.push(
      <line
        key={`z${gz}`}
        x1={minX}
        y1={gz}
        x2={maxX}
        y2={gz}
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={gz === 0 ? 0.35 : 0.2}
      />,
    );
  return (
    <svg
      viewBox={`${minX} ${minZ} ${w} ${h}`}
      className="block h-64 w-full"
      role="img"
      aria-label="Top-down view of Workspace"
    >
      <rect x={minX} y={minZ} width={w} height={h} fill="#0a0e14" />
      {grid}
      {shapes.map((s) =>
        s.kind === "player" ? (
          <g key={s.path} onClick={() => onSelect?.(s.path)} className="cursor-pointer">
            <circle cx={s.x} cy={s.z} r={1.6} fill={s.color} stroke="#fff" strokeWidth={0.3} />
            <text
              x={s.x}
              y={s.z - 2.4}
              fontSize={2.2}
              fill="#c7d2fe"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {s.name}
            </text>
          </g>
        ) : (
          <g key={s.path} onClick={() => onSelect?.(s.path)} className="cursor-pointer">
            <rect
              x={s.x - s.sx / 2}
              y={s.z - s.sz / 2}
              width={s.sx}
              height={s.sz}
              rx={0.3}
              fill={s.color}
              fillOpacity={Math.max(0.12, s.alpha * 0.85)}
              stroke={selected === s.path ? "#89ddff" : "rgba(255,255,255,0.25)"}
              strokeWidth={selected === s.path ? 0.6 : 0.15}
            />
            {Math.max(s.sx, s.sz) >= 4 && (
              <text
                x={s.x}
                y={s.z + 0.8}
                fontSize={Math.min(2.2, s.sx / 4)}
                fill="rgba(255,255,255,0.8)"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {s.name}
              </text>
            )}
          </g>
        ),
      )}
    </svg>
  );
}
