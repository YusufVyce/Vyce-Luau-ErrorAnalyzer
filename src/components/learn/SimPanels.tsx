import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { ExplorerNode, OutputLine } from "@/lib/learn/homework/harness";

const CLASS_COLOR: Record<string, string> = {
  Workspace: "bg-sky-400",
  Players: "bg-sky-400",
  ReplicatedStorage: "bg-sky-400",
  ServerScriptService: "bg-sky-400",
  ServerStorage: "bg-sky-400",
  StarterGui: "bg-sky-400",
  Lighting: "bg-sky-400",
  Script: "bg-emerald-400",
  LocalScript: "bg-pink-400",
  ModuleScript: "bg-violet-400",
  Folder: "bg-amber-400",
  Model: "bg-orange-300",
  Player: "bg-pink-300",
  RemoteEvent: "bg-amber-300",
  RemoteFunction: "bg-amber-300",
};

function iconColor(className: string) {
  if (CLASS_COLOR[className]) return CLASS_COLOR[className];
  if (/Value$/.test(className)) return "bg-emerald-300";
  if (/Part|SpawnLocation|Seat/.test(className)) return "bg-zinc-300";
  if (/Gui|Frame|Text|Image|Button|Label|UI/.test(className)) return "bg-cyan-300";
  return "bg-zinc-500";
}

function Node({
  node,
  depth,
  onSelect,
  selected,
}: {
  node: ExplorerNode;
  depth: number;
  onSelect?: (node: ExplorerNode) => void;
  selected?: string;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasKids = node.children.length > 0;
  const isSel = selected !== undefined && selected === node.path;
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          if (onSelect) onSelect(node);
          if (hasKids && (!onSelect || isSel || !open)) setOpen((v) => !v);
        }}
        className={`flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left ${isSel ? "bg-sky-400/15 ring-1 ring-sky-400/30" : "hover:bg-zinc-800/60"}`}
        style={{ paddingLeft: depth * 14 + 4 }}
        aria-expanded={hasKids ? open : undefined}
      >
        <ChevronRight
          className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${hasKids ? "" : "opacity-0"} ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
        <span
          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${iconColor(node.className)}`}
          aria-hidden="true"
        />
        <span className="truncate text-zinc-200">{node.name}</span>
        {node.className !== node.name && (
          <span className="shrink-0 text-[10px] text-zinc-600">{node.className}</span>
        )}
        {node.value !== undefined && (
          <span className="ml-auto shrink-0 font-mono text-[11px] text-emerald-300">
            = {node.value}
          </span>
        )}
      </button>
      {open && hasKids && (
        <ul>
          {node.children.map((c, i) => (
            <Node
              key={`${c.name}-${i}`}
              node={c}
              depth={depth + 1}
              onSelect={onSelect}
              selected={selected}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ExplorerTree({
  nodes,
  emptyText = "Run your code to see what it created.",
  onSelect,
  selected,
}: {
  nodes: ExplorerNode[];
  emptyText?: string;
  onSelect?: (node: ExplorerNode) => void;
  selected?: string;
}) {
  if (nodes.length === 0) return <p className="p-3 text-xs text-zinc-500">{emptyText}</p>;
  return (
    <ul className="max-h-72 overflow-auto p-2 text-xs" aria-label="Explorer">
      {nodes.map((n) => (
        <Node key={n.name} node={n} depth={0} onSelect={onSelect} selected={selected} />
      ))}
    </ul>
  );
}

export function OutputConsole({
  lines,
  emptyText = "Nothing printed yet.",
}: {
  lines: OutputLine[];
  emptyText?: string;
}) {
  if (lines.length === 0) return <p className="p-3 font-mono text-xs text-zinc-500">{emptyText}</p>;
  const color = {
    print: "text-zinc-200",
    info: "text-sky-300",
    warn: "text-amber-300",
    error: "text-red-400",
  } as const;
  return (
    <ol
      className="max-h-72 space-y-0.5 overflow-auto p-3 font-mono text-[12px] leading-relaxed"
      aria-label="Output"
    >
      {lines.slice(0, 200).map((l, i) => (
        <li key={i} className={`flex gap-3 ${color[l.kind]}`}>
          <span className="shrink-0 text-zinc-600">{l.time.toFixed(1).padStart(5, "0")}</span>
          <span className="whitespace-pre-wrap break-all">{l.text}</span>
        </li>
      ))}
      {lines.length > 200 && <li className="text-zinc-500">… {lines.length - 200} more lines</li>}
    </ol>
  );
}
