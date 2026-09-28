import { useState } from "react";
import { ArrowUpRight, Loader2, Play, RotateCcw } from "lucide-react";
import { CodeBlock } from "@/components/CodeBlock";
import { OutputConsole } from "@/components/learn/SimPanels";
import { runLessonSample } from "@/lib/learn/homework/client";
import type { SampleModule, SampleResult } from "@/lib/learn/runSample";
import { analyzerLink } from "@/lib/learn/lessons";
import { useLang, useT } from "@/lib/prefs";

/** A lesson code sample with a "Run in simulator" button and inline results. */
export function RunnableCode({
  code,
  title,
  where,
  modules,
}: {
  code: string;
  title: string;
  where?: string;
  modules: SampleModule[];
}) {
  const t = useT();
  const lang = useLang();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SampleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      setResult(await runLessonSample(code, where, modules, lang));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const firstError = result?.output.find((o) => o.kind === "error");
  const kind = result?.scriptKind ?? (/LocalScript/.test(where ?? "") ? "LocalScript" : "Script");
  const playground = `/playground?${new URLSearchParams({ [kind === "LocalScript" ? "client" : "server"]: code })}`;

  return (
    <div className="space-y-2">
      <CodeBlock code={code} title={title} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-line bg-brand-soft px-3 py-1.5 text-[13px] font-medium text-brand transition-colors hover:bg-brand hover:text-canvas disabled:opacity-60"
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : result ? (
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {t(result ? "run.again" : "run.run")}
        </button>
        {kind !== "ModuleScript" && (
          <a
            href={playground}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] text-ink-3 transition-colors hover:text-brand"
          >
            {t("run.playground")} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
      {error && <p className="text-[13px] text-red-400">{error}</p>}
      {result && (
        <div className="code-dark ep-rise overflow-hidden rounded-xl border border-code-line bg-code">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-code-line bg-code-head px-3 py-2 font-mono text-[11px] text-zinc-400">
            <span className="text-emerald-400">● {t("run.simulated", { s: result.seconds })}</span>
            {result.actions.map((a) => (
              <span key={a} className="text-zinc-500">
                ▸ {a}
              </span>
            ))}
          </div>
          <OutputConsole lines={result.output} emptyText={t("run.noOutput")} />
          {result.changes.length > 0 && (
            <div className="border-t border-code-line px-3 py-2.5">
              <div className="mb-1 font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                {t("run.changed")}
              </div>
              <ul className="space-y-0.5 font-mono text-[12px]">
                {result.changes.map((c) => (
                  <li key={c} className={c.startsWith("+") ? "text-emerald-300" : "text-sky-300"}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {firstError && (
            <div className="border-t border-code-line px-3 py-2">
              <a
                href={analyzerLink(firstError.text, code)}
                className="text-[12px] font-medium text-sky-300 hover:underline"
              >
                {t("pg.explain")}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
