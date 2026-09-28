import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleX,
  Eye,
  Lightbulb,
  Loader2,
  MapPin,
  Play,
  RotateCcw,
  Trophy,
  Wrench,
} from "lucide-react";
import { CodeBlock } from "@/components/CodeBlock";
import { CodeEditor } from "@/components/CodeEditor";
import { ExplorerTree, OutputConsole } from "@/components/learn/SimPanels";
import { analyzerLink } from "@/lib/learn/lessons";
import { checkHomework } from "@/lib/learn/homework/client";
import type { Exercise, HomeworkResult } from "@/lib/learn/homework/harness";
import { useLang, useT } from "@/lib/prefs";

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

export function HomeworkPanel({
  exercise,
  code,
  onCode,
  passed,
  attempts,
  hintsUsed,
  onChecked,
  onHint,
  onSolution,
}: {
  exercise: Exercise;
  code: string;
  onCode: (code: string) => void;
  passed: boolean;
  attempts: number;
  hintsUsed: number;
  onChecked: (passed: boolean) => void;
  onHint: () => void;
  onSolution: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<HomeworkResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [tab, setTab] = useState<"checks" | "output" | "explorer">("checks");
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    setResult(null);
    setRunError(null);
    setShowSolution(false);
    setTab("checks");
  }, [exercise.lessonId, lang]);

  async function run() {
    setRunning(true);
    setRunError(null);
    try {
      const r = await checkHomework(exercise.lessonId, code, lang);
      setResult(r);
      setTab("checks");
      onChecked(r.passed);
    } catch (e) {
      setRunError((e as Error).message);
      onChecked(false);
    } finally {
      setRunning(false);
    }
  }

  const passedCount = result?.checks.filter((c) => c.pass).length ?? 0;
  const errorLine = result?.syntaxError?.line ?? result?.runtimeError?.line;
  const canSeeSolution = attempts >= 2 || hintsUsed >= exercise.hints.length;

  return (
    <section
      id="homework"
      className="scroll-mt-20 space-y-5 rounded-2xl border border-brand-line bg-surface p-5 shadow-[0_0_0_4px_var(--brand-soft)] md:p-6"
      aria-label={t("hw.homework")}
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-0.5 text-[12px] font-semibold text-white">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> {t("hw.homework")}
          </span>
          <span className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-zinc-300">
            {t(exercise.kind === "fix" ? "hw.fix" : "hw.write")}
          </span>
          {passed && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("hw.passedTag")}
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-50">{exercise.title}</h2>
        <p className="text-sm text-zinc-300">{exercise.goal}</p>
        <ul className="space-y-1.5 pt-1">
          {exercise.steps.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-300">
              <span className="ep-step shrink-0">{i + 1}</span>
              <span>
                <Rich text={s} />
              </span>
            </li>
          ))}
        </ul>
      </header>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
          <span className="inline-flex flex-wrap items-center gap-1.5 font-mono">
            <MapPin className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            {exercise.location}
            <span className="whitespace-nowrap rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {exercise.scriptKind}
            </span>
          </span>
          <span className="hidden sm:inline">{t("hw.keys")}</span>
        </div>
        <CodeEditor
          value={code}
          onChange={onCode}
          onRun={run}
          errorLine={errorLine}
          label={exercise.title}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="ep-cta inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {t(running ? "hw.running" : "hw.run")}
        </button>
        <button
          type="button"
          onClick={onHint}
          disabled={hintsUsed >= exercise.hints.length}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 px-3 py-2 text-[13px] text-amber-300 hover:bg-amber-500/10 disabled:opacity-40"
        >
          <Lightbulb className="h-4 w-4" aria-hidden="true" /> {t("hw.hint")}{" "}
          {Math.min(hintsUsed, exercise.hints.length)}/{exercise.hints.length}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!showSolution) onSolution();
            setShowSolution((v) => !v);
          }}
          disabled={!canSeeSolution}
          title={canSeeSolution ? "" : t("hw.solutionLocked")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[13px] text-zinc-300 hover:bg-surface-2 disabled:opacity-40"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />{" "}
          {t(showSolution ? "hw.hideSolution" : "hw.solution")}
        </button>
        <button
          type="button"
          onClick={() => onCode(exercise.starter)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] text-zinc-500 hover:text-zinc-200"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> {t("hw.reset")}
        </button>
      </div>

      {hintsUsed > 0 && (
        <ol className="space-y-2">
          {exercise.hints.slice(0, hintsUsed).map((hint, i) => (
            <li
              key={i}
              className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-sm text-amber-200"
            >
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              <span className="whitespace-pre-wrap font-mono text-[13px]">{hint}</span>
            </li>
          ))}
        </ol>
      )}

      {showSolution && (
        <div className="space-y-2">
          <CodeBlock code={exercise.solution} title={t("hw.onesolution")} tone="good" />
          <button
            type="button"
            onClick={() => onCode(exercise.solution)}
            className="text-[13px] font-medium text-brand hover:underline"
          >
            {t("hw.copyIn")}
          </button>
          <p className="text-xs text-zinc-500">{t("hw.typeTip")}</p>
        </div>
      )}

      {runError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {runError}
        </div>
      )}

      {result && (
        <div className="space-y-3" aria-live="polite">
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              result.passed
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                : "border-amber-500/30 bg-amber-500/[0.07] text-amber-100"
            }`}
          >
            {result.passed ? (
              <Trophy className="h-6 w-6 shrink-0 text-emerald-300" aria-hidden="true" />
            ) : (
              <Wrench className="h-6 w-6 shrink-0 text-amber-300" aria-hidden="true" />
            )}
            <div>
              <div className="font-semibold">
                {result.passed
                  ? t("hw.passed")
                  : t(
                      passedCount === 0
                        ? "hw.notYet"
                        : result.checks.length - passedCount === 1
                          ? "hw.almost"
                          : "hw.keepGoing",
                      { n: passedCount, total: result.checks.length },
                    )}
              </div>
              <div className="text-sm opacity-80">
                {t(result.passed ? "hw.passedBody" : "hw.failBody")}
              </div>
            </div>
          </div>

          <div
            role="tablist"
            className="inline-flex gap-1 rounded-xl border border-line bg-surface-2 p-1 text-[13px]"
          >
            {(["checks", "output", "explorer"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                type="button"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 font-medium transition-colors sm:px-3 ${tab === k ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}
              >
                {k === "checks"
                  ? `${t("hw.checks")} (${passedCount}/${result.checks.length})`
                  : k === "output"
                    ? `Output (${result.output.length})`
                    : "Explorer"}
              </button>
            ))}
          </div>

          {tab === "checks" && (
            <ul className="space-y-2">
              {result.checks.map((c, i) => (
                <li
                  key={i}
                  className={`rounded-xl border p-3 ${c.pass ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-red-500/25 bg-red-500/[0.05]"}`}
                >
                  <div className="flex items-start gap-2 text-sm">
                    {c.pass ? (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                        aria-label={t("hw.ok")}
                      />
                    ) : (
                      <CircleX
                        className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
                        aria-label={t("hw.bad")}
                      />
                    )}
                    <div className="min-w-0">
                      <div className={c.pass ? "text-zinc-200" : "font-medium text-zinc-100"}>
                        {c.label}
                      </div>
                      {c.detail && (
                        <div className="mt-1 text-[13px] break-words whitespace-pre-wrap text-red-300">
                          {c.detail}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {tab === "output" && (
            <div className="code-dark overflow-hidden rounded-xl border border-code-line bg-code">
              <OutputConsole lines={result.output} emptyText={t("hw.noOutput")} />
            </div>
          )}
          {tab === "explorer" && (
            <div className="code-dark overflow-hidden rounded-xl border border-code-line bg-code">
              <ExplorerTree nodes={result.explorer} emptyText={t("pg.emptyExplorer")} />
            </div>
          )}

          {result.diagnosis && (result.runtimeError || result.syntaxError) && (
            <div className="space-y-3 rounded-xl border border-red-500/25 bg-red-500/[0.05] p-4">
              <div className="text-[15px] font-semibold text-red-300">{t("hw.crashed")}</div>
              <div className="font-semibold text-zinc-100">
                <Rich text={result.diagnosis.title} />
              </div>
              <p className="text-sm text-zinc-300">
                <Rich text={result.diagnosis.summary} />
              </p>
              {result.diagnosis.causes[0] && (
                <div className="rounded-xl border border-line bg-surface p-3 text-sm">
                  <div className="font-medium text-zinc-100">
                    <Rich text={result.diagnosis.causes[0].text} />
                  </div>
                  {result.diagnosis.causes[0].detail && (
                    <p className="mt-1 text-zinc-400">
                      <Rich text={result.diagnosis.causes[0].detail} />
                    </p>
                  )}
                </div>
              )}
              {result.diagnosis.fixCode && (
                <CodeBlock
                  code={result.diagnosis.fixCode.after}
                  title={t("hw.fixLike")}
                  tone="good"
                />
              )}
              <a
                href={analyzerLink(
                  (result.runtimeError ?? { message: result.output[0]?.text ?? "" }).message,
                  code,
                )}
                className="inline-block text-[13px] font-medium text-brand hover:underline"
              >
                {t("hw.openAnalyzer")}
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
