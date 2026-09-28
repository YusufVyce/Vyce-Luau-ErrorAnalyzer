import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Library, Search } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
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
            className="rounded bg-zinc-800/80 px-1 font-mono text-[0.9em] text-emerald-200"
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

function ErrorsPage() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");

  useEffect(() => {
    document.body.classList.add("ep-body");
    return () => document.body.classList.remove("ep-body");
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

  return (
    <>
      <SiteNav />
      <div className="relative mx-auto w-full max-w-5xl px-4 pb-16">
        <div className="ep-aurora" aria-hidden="true" />
        <header className="relative z-10 space-y-3 py-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
            <Library className="h-3.5 w-3.5" aria-hidden="true" /> Error library
          </div>
          <h1 className="serif-title text-4xl text-zinc-50 md:text-5xl">
            Every common Roblox error, explained
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-zinc-400">
            Search for the message you see in Output. Open any example in the analyzer to see the
            full explanation and fix.
          </p>
        </header>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search errors</span>
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. attempt to index nil, WaitForChild, DataStore…"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 py-2.5 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-emerald-500/40 focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={`rounded-full border px-3 py-1 text-xs ${group === g ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-zinc-500">{shown.length} errors</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {shown.map((e) => (
              <li key={e.log} className="ep-card flex flex-col gap-2 p-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">{e.group}</div>
                <code className="break-words rounded-md border border-red-500/20 bg-black/40 px-2 py-1.5 font-mono text-[12px] text-red-300">
                  {e.message}
                </code>
                <div className="font-semibold text-zinc-100">
                  <Rich text={e.title} />
                </div>
                <p className="text-sm text-zinc-400">
                  <Rich text={e.summary} />
                </p>
                {e.cause && (
                  <p className="text-xs text-zinc-500">
                    <span className="text-zinc-400">Usual cause: </span>
                    <Rich text={e.cause} />
                  </p>
                )}
                <a
                  href={analyzerLink(e.log, e.code ?? "")}
                  className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-semibold text-emerald-300 hover:underline"
                >
                  See the full explanation & fix{" "}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
