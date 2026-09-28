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
  Swords,
} from "lucide-react";
import { usePrefs, useT, type Lang, type Theme } from "@/lib/prefs";
import { XpChip } from "@/components/ProgressBits";

const ITEMS = [
  { to: "/", key: "nav.analyzer", icon: Bug, exact: true },
  { to: "/errors", key: "nav.errors", icon: Library, exact: false },
  { to: "/learn", key: "nav.learn", icon: BookOpen, exact: false },
  { to: "/challenges", key: "nav.challenges", icon: Swords, exact: false },
  { to: "/playground", key: "nav.playground", icon: FlaskConical, exact: false },
] as const;

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex h-8 w-8 items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <span className="absolute inset-0 rotate-[12deg] rounded-[9px] bg-[linear-gradient(135deg,var(--brand),var(--syn-purple))] shadow-[0_6px_20px_-6px_var(--brand)]" />
      <span className="absolute inset-[1px] rotate-[12deg] rounded-[8px] bg-[linear-gradient(135deg,rgba(255,255,255,0.25),transparent_60%)]" />
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
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface/70 px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        {icon}
      </button>
      {open && (
        <div
          role="menu"
          className="ep-card ep-rise absolute right-0 z-50 mt-2 min-w-44 overflow-hidden p-1"
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

const TAB_FILES = {
  "/": "analyzer.luau",
  "/errors": "errors.md",
  "/learn": "learn/",
  "/challenges": "challenges/",
  "/playground": "playground.luau",
} as const;

export function SiteNav() {
  const t = useT();
  const { theme, resolvedTheme, setTheme, lang, setLang } = usePrefs();
  const ThemeIcon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-40 w-full border-b border-line bg-canvas/75 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="group flex shrink-0 items-center gap-2.5 text-ink">
          <Logo />
          <span className="hidden font-mono text-[14px] font-semibold tracking-tight md:inline">
            vyce<span className="text-[var(--syn-purple)]">.</span>
            <span className="text-brand">lua</span>
            <span className="ep-caret" aria-hidden="true" />
          </span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex h-9 items-end gap-0.5 overflow-hidden rounded-xl border border-line bg-surface/70 px-1 pt-1">
            {ITEMS.map(({ to, key, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                aria-label={t(key)}
                title={TAB_FILES[to]}
                activeOptions={{ exact }}
                className="relative inline-flex h-7 items-center gap-1.5 rounded-t-lg rounded-b-md px-2 text-[13px] font-medium transition-colors sm:px-2.5"
                activeProps={{
                  className:
                    "bg-surface-2 text-ink before:absolute before:inset-x-2 before:top-0 before:h-[2px] before:rounded-full before:bg-[linear-gradient(90deg,var(--brand),var(--syn-purple))]",
                }}
                inactiveProps={{ className: "text-ink-3 hover:bg-surface-2/60 hover:text-ink" }}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{t(key)}</span>
              </Link>
            ))}
          </div>
          <XpChip />
          <Menu<Lang>
            label={t("nav.language")}
            icon={
              <>
                <Languages className="h-4 w-4" aria-hidden="true" />
                <span className="hidden font-mono text-[12px] uppercase sm:inline">{lang}</span>
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
                value: "dark",
                label: t("theme.dark"),
                icon: <Moon className="h-4 w-4" aria-hidden="true" />,
              },
              {
                value: "light",
                label: t("theme.light"),
                icon: <Sun className="h-4 w-4" aria-hidden="true" />,
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
