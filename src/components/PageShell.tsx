import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { CheckCircle2, GitBranch, Zap } from "lucide-react";
import { Logo, SiteNav } from "@/components/SiteNav";
import { usePrefs, useT } from "@/lib/prefs";

/** Nav + page body + footer shared by every page. */
export function PageShell({
  children,
  width = "max-w-6xl",
}: {
  children: ReactNode;
  width?: string;
}) {
  const t = useT();
  const { lang, resolvedTheme } = usePrefs();
  useEffect(() => {
    document.body.classList.add("ep-body");
    return () => document.body.classList.remove("ep-body");
  }, []);
  return (
    <>
      <SiteNav />
      <div className={`relative mx-auto w-full ${width} px-4 pb-16`}>{children}</div>
      <footer className="border-t border-line bg-canvas/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-mono text-[14px] font-semibold text-ink">
                vyce<span className="text-[var(--syn-purple)]">.</span>
                <span className="text-brand">lua</span>
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-ink-3">{t("footer.tagline")}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-2 font-mono text-[13px]">
            {(
              [
                ["/", "nav.analyzer"],
                ["/errors", "nav.errors"],
                ["/learn", "nav.learn"],
                ["/playground", "nav.playground"],
              ] as const
            ).map(([to, key]) => (
              <Link key={to} to={to} className="text-ink-3 transition-colors hover:text-brand">
                <span className="text-[var(--syn-purple)]">→</span> {t(key)}
              </Link>
            ))}
          </div>
        </div>
        {/* Editor-style status bar */}
        <div className="border-t border-line bg-surface/80">
          <div className="mx-auto flex h-8 max-w-6xl items-center justify-between gap-4 overflow-hidden px-4 font-mono text-[11px] text-ink-3">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-brand" aria-hidden="true" /> main
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--syn-green)]" aria-hidden="true" />
                {t("footer.noAi")}
              </span>
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                <Zap className="h-3.5 w-3.5 text-[var(--syn-orange)]" aria-hidden="true" /> Luau
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline">UTF-8</span>
              <span className="uppercase">{lang}</span>
              <span className="hidden sm:inline">{resolvedTheme}</span>
              <span className="truncate">{t("footer.made")}</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
