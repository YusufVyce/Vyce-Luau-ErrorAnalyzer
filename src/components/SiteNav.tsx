import { Link } from "@tanstack/react-router";
import { BookOpen, Bug } from "lucide-react";

export function SiteNav() {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors";
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-40 w-full border-b border-zinc-800/60 bg-[#05080a]/80 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 font-mono text-[11px] text-emerald-300">
            {"{}"}
          </span>
          <span className="hidden sm:inline">Vyce LuaUtility</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            to="/"
            className={base}
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-emerald-500/10 text-emerald-300" }}
            inactiveProps={{ className: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900" }}
          >
            <Bug className="h-3.5 w-3.5" aria-hidden="true" />
            Error Analyzer
          </Link>
          <Link
            to="/learn"
            className={base}
            activeProps={{ className: "bg-emerald-500/10 text-emerald-300" }}
            inactiveProps={{ className: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900" }}
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Learn Scripting
          </Link>
        </div>
      </div>
    </nav>
  );
}
