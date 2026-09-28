import { Link } from "@tanstack/react-router";
import { BookOpen, Bug, FlaskConical, Library } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Analyzer", icon: Bug, exact: true, alwaysLabel: true },
  { to: "/errors", label: "Errors", icon: Library, exact: false, alwaysLabel: false },
  { to: "/learn", label: "Learn", icon: BookOpen, exact: false, alwaysLabel: true },
  { to: "/playground", label: "Playground", icon: FlaskConical, exact: false, alwaysLabel: false },
] as const;

export function SiteNav() {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors";
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-40 w-full border-b border-zinc-800/60 bg-[#05080a]/80 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold text-zinc-100"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 font-mono text-[11px] text-emerald-300">
            {"{}"}
          </span>
          <span className="hidden md:inline">Vyce LuaUtility</span>
        </Link>
        <div className="flex items-center gap-0.5">
          {ITEMS.map(({ to, label, icon: Icon, exact, alwaysLabel }) => (
            <Link
              key={to}
              to={to}
              className={base}
              aria-label={label}
              activeOptions={{ exact }}
              activeProps={{ className: "bg-emerald-500/10 text-emerald-300" }}
              inactiveProps={{ className: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900" }}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className={alwaysLabel ? "" : "hidden sm:inline"}>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
