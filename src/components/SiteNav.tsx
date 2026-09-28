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
    "inline-flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-[13px] font-medium transition-colors";
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-40 w-full border-b-2 border-[#1c1a16] bg-[#fffdf8]"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-[#1c1a16]">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#1c1a16] bg-[#e8483f] font-mono text-[12px] font-bold text-white shadow-[2px_2px_0_#1c1a16]"
            aria-hidden="true"
          >
            {"{}"}
          </span>
          <span className="hidden font-display text-[17px] font-extrabold tracking-tight md:inline">
            Vyce LuaUtility
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {ITEMS.map(({ to, label, icon: Icon, exact, alwaysLabel }) => (
            <Link
              key={to}
              to={to}
              className={base}
              aria-label={label}
              activeOptions={{ exact }}
              activeProps={{ className: "border-[#1c1a16] bg-[#ffd23f] text-[#1c1a16]" }}
              inactiveProps={{
                className:
                  "border-transparent text-[#57524a] hover:border-[#1c1a16]/20 hover:text-[#1c1a16]",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className={alwaysLabel ? "" : "hidden sm:inline"}>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
