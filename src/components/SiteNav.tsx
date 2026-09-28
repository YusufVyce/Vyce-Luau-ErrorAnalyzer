import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Bug,
  Check,
  FlaskConical,
  Languages,
  Library,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { usePrefs, useT, type Lang, type Theme } from "@/lib/prefs";

const ITEMS = [
  { to: "/", key: "nav.analyzer", icon: Bug, exact: true },
  { to: "/errors", key: "nav.errors", icon: Library, exact: false },
  { to: "/learn", key: "nav.learn", icon: BookOpen, exact: false },
  { to: "/playground", key: "nav.playground", icon: FlaskConical, exact: false },
] as const;

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex h-8 w-8 items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <span className="absolute inset-0 rotate-[12deg] rounded-[9px] bg-brand shadow-sm" />
      <span className="relative font-mono text-[12px] font-bold text-white">{"{}"}</span>
    </span>
  );
}

/** Small popover menu used for the language and theme pickers. */
function Menu<T extends string>({
  label,
  icon,
  value,
  options,
  onPick,
}: {
  label: string;
  icon: React.ReactNode;
  value: T;
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  onPick: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        {icon}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-40 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              onClick={() => {
                onPick(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                o.value === value
                  ? "bg-brand-soft text-brand"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {o.icon}
              <span className="flex-1">{o.label}</span>
              {o.value === value && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteNav() {
  const t = useT();
  const { theme, resolvedTheme, setTheme, lang, setLang } = usePrefs();
  const ThemeIcon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-40 w-full border-b border-line bg-canvas/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 text-ink">
          <Logo />
          <span className="hidden font-display text-[15px] font-semibold tracking-tight md:inline">
            Vyce LuaUtility
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-0.5 rounded-xl border border-line bg-surface p-0.5">
            {ITEMS.map(({ to, key, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                aria-label={t(key)}
                activeOptions={{ exact }}
                className="inline-flex h-7 items-center gap-1.5 rounded-[9px] px-2 text-[13px] font-medium transition-colors sm:px-2.5"
                activeProps={{ className: "bg-brand-soft text-brand" }}
                inactiveProps={{ className: "text-ink-2 hover:bg-surface-2 hover:text-ink" }}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{t(key)}</span>
              </Link>
            ))}
          </div>
          <Menu<Lang>
            label={t("nav.language")}
            icon={
              <>
                <Languages className="h-4 w-4" aria-hidden="true" />
                <span className="hidden uppercase sm:inline">{lang}</span>
              </>
            }
            value={lang}
            options={[
              { value: "en", label: "English" },
              { value: "tr", label: "Türkçe" },
            ]}
            onPick={setLang}
          />
          <Menu<Theme>
            label={t("nav.theme")}
            icon={<ThemeIcon className="h-4 w-4" aria-hidden="true" />}
            value={theme}
            options={[
              {
                value: "light",
                label: t("theme.light"),
                icon: <Sun className="h-4 w-4" aria-hidden="true" />,
              },
              {
                value: "dark",
                label: t("theme.dark"),
                icon: <Moon className="h-4 w-4" aria-hidden="true" />,
              },
              {
                value: "system",
                label: t("theme.system"),
                icon: <Monitor className="h-4 w-4" aria-hidden="true" />,
              },
            ]}
            onPick={setTheme}
          />
        </div>
      </div>
    </nav>
  );
}
