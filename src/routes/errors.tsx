import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Library, Search } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useT } from "@/lib/prefs";
import type { UiKey } from "@/lib/i18n/ui";
import { PageHeader } from "@/components/PageHeader";
import { diagnose } from "@/lib/analyzer/precise/diagnose";
import { ERROR_LIBRARY } from "@/lib/analyzer/precise/library";
import { analyzerLink } from "@/lib/learn/lessons";

export const Route = createFileRoute("/errors")({
  head: () => ({
    meta: [
      { title: "Roblox Error Library — Vyce LuaUtility" },
      {
        name: "description",
        content:
          "Every common Roblox Studio / Luau error message explained in plain English, with the usual cause and how to fix it.",
      },
    ],
  }),
  component: ErrorsPage,
});

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((p, i) =>
        p.startsWith("`") && p.endsWith("`") && p.length > 2 ? (
          <code
            key={i}
            className="rounded-md border border-line bg-surface-2 px-1 py-px font-mono text-[0.85em] text-brand-ink"
          >
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const GROUP_KEYS: Record<string, UiKey> = {
  "Nil values": "err.gNil",
  "Arguments & types": "err.gArgs",
  "Objects & Explorer": "err.gObjects",
  "Script problems": "err.gScripts",
  "Remotes & services": "err.gServices",
};

function ErrorsPage() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const searchRef = useRef<HTMLInputElement>(null);

  // Press "/" anywhere to jump to the search box, like in code editors.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA/.test(el.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const entries = useMemo(
    () =>
      ERROR_LIBRARY.map((e) => {
        const d = diagnose(e.log, e.code ?? "")!;
        return {
          ...e,
          title: d.title,
          summary: d.summary,
          cause: d.causes[0]?.text ?? "",
          message: d.message || e.log,
        };
      }),
    [],
  );
  const groups = ["All", ...new Set(ERROR_LIBRARY.map((e) => e.group))];
  const q = query.trim().toLowerCase();
  const shown = entries.filter(
    (e) =>
      (group === "All" || e.group === group) &&
      (!q || `${e.message} ${e.title} ${e.summary} ${e.cause}`.toLowerCase().includes(q)),
  );
  const groupName = (g: string) => t(g === "All" ? "err.all" : (GROUP_KEYS[g] ?? "err.all"));

  return (
    <PageShell width="max-w-5xl">
      <PageHeader
        sticker={
          <>
            <Library className="h-4 w-4 text-brand" aria-hidden="true" /> {t("err.sticker")}
          </>
        }
        title={
          <>
            {t("err.title1")} <span className="ep-mark">{t("err.title2")}</span>
          </>
        }
      >
        {t("err.lead")}
      </PageHeader>

      <div className="relative z-10 space-y-5">
        <div className="ep-card flex flex-col gap-3 p-3">
          <label className="relative flex-1">
            <span className="sr-only">{t("err.search")}</span>
            <Search
              className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-brand"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("err.placeholder")}
              ref={searchRef}
              className="w-full rounded-xl border border-line bg-canvas py-3 pr-16 pl-10 font-mono text-[13px] text-ink placeholder-zinc-500 focus:border-brand-line focus:ring-2 focus:ring-brand/20 focus:outline-none"
            />
            <kbd className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-3">
              /
            </kbd>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${group === g ? "border-brand-line bg-brand-soft text-brand" : "border-line text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
              >
                {groupName(g)}
              </button>
            ))}
          </div>
        </div>
        <p className="ep-label">
          <b>//</b> {t("err.count", { n: shown.length })}
        </p>
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((e) => (
            <li key={e.log}>
              <a
                href={analyzerLink(e.log, e.code ?? "")}
                className="ep-card group flex h-full flex-col gap-2.5 p-5 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="text-[12px] font-medium text-ink-3">{groupName(e.group)}</div>
                <code className="code-dark rounded-lg bg-code px-2.5 py-2 font-mono text-[12px] break-words text-red-400">
                  {e.message}
                </code>
                <div className="font-semibold text-ink">
                  <Rich text={e.title} />
                </div>
                <p className="text-sm text-ink-2">
                  <Rich text={e.summary} />
                </p>
                {e.cause && (
                  <p className="text-[13px] text-ink-3">
                    <span className="font-medium text-ink-2">{t("err.cause")} </span>
                    <Rich text={e.cause} />
                  </p>
                )}
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[13px] font-medium text-brand">
                  {t("err.open")}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
