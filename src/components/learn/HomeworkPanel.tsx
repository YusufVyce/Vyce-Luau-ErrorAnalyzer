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
  }, [exercise.lessonId]);

  async function run() {
    setRunning(true);
    setRunError(null);
    try {
      const r = await checkHomework(exercise.lessonId, code);
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
      className="space-y-5 rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-5 md:p-6"
      aria-label="Homework"
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-emerald-300">
            <Trophy className="h-4 w-4" aria-hidden="true" /> Homework
          </span>
          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-300">
            {exercise.kind === "fix" ? "Fix the bug" : "Write the code"}
          </span>
          {passed && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Passed
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-zinc-50">{exercise.title}</h2>
        <p className="text-sm text-zinc-300">{exercise.goal}</p>
        <ul className="space-y-1.5 pt-1">
          {exercise.steps.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-300">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-emerald-400">{i + 1}.</span>
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
            <MapPin className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            {exercise.location}
            <span className="whitespace-nowrap rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {exercise.scriptKind}
            </span>
          </span>
          <span className="hidden sm:inline">Tab indents · ⌘/Ctrl + Enter runs</span>
        </div>
        <CodeEditor
          value={code}
          onChange={onCode}
          onRun={run}
          errorLine={errorLine}
          label={`Homework code for ${exercise.title}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="ep-cta inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {running ? "Running in the simulator…" : "Run & check"}
        </button>
        <button
          type="button"
          onClick={onHint}
          disabled={hintsUsed >= exercise.hints.length}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/10 disabled:opacity-40"
        >
          <Lightbulb className="h-4 w-4" aria-hidden="true" /> Hint{" "}
          {Math.min(hintsUsed, exercise.hints.length)}/{exercise.hints.length}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!showSolution) onSolution();
            setShowSolution((v) => !v);
          }}
          disabled={!canSeeSolution}
          title={canSeeSolution ? "" : "Try at least twice (or use all hints) first"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 disabled:opacity-40"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />{" "}
          {showSolution ? "Hide solution" : "Solution"}
        </button>
        <button
          type="button"
          onClick={() => onCode(exercise.starter)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-zinc-500 hover:text-zinc-200"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
        </button>
      </div>

      {hintsUsed > 0 && (
        <ol className="space-y-2">
          {exercise.hints.slice(0, hintsUsed).map((hint, i) => (
            <li
              key={i}
              className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-3 text-sm text-amber-100"
            >
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              <span className="whitespace-pre-wrap font-mono text-[13px]">{hint}</span>
            </li>
          ))}
        </ol>
      )}

      {showSolution && (
        <div className="space-y-2">
          <CodeBlock code={exercise.solution} title="One possible solution" tone="good" />
          <button
            type="button"
            onClick={() => onCode(exercise.solution)}
            className="text-xs text-emerald-300 hover:underline"
          >
            Copy into my editor
          </button>
          <p className="text-xs text-zinc-500">
            Tip: type it yourself instead of pasting — you'll remember it much better.
          </p>
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
                  ? "Homework passed! The next lesson is unlocked."
                  : `${passedCount} of ${result.checks.length} checks passed${passedCount === 0 ? " — not yet" : result.checks.length - passedCount === 1 ? " — almost there!" : " — keep going"}.`}
              </div>
              <div className="text-sm opacity-80">
                {result.passed
                  ? "Your code really ran in a simulated Roblox server and did everything it should."
                  : "Read the ✗ items below: each one says exactly what the checker saw."}
              </div>
            </div>
          </div>

          <div role="tablist" className="flex gap-1 border-b border-zinc-800 text-xs">
            {(["checks", "output", "explorer"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`-mb-px whitespace-nowrap border-b-2 px-2.5 py-2 capitalize sm:px-3 ${tab === t ? "border-emerald-400 text-emerald-200" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                {t === "checks"
                  ? `Checks (${passedCount}/${result.checks.length})`
                  : t === "output"
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
                  className={`rounded-lg border p-3 ${c.pass ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-red-500/25 bg-red-500/[0.05]"}`}
                >
                  <div className="flex items-start gap-2 text-sm">
                    {c.pass ? (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                        aria-label="passed"
                      />
                    ) : (
                      <CircleX
                        className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
                        aria-label="failed"
                      />
                    )}
                    <div className="min-w-0">
                      <div className={c.pass ? "text-zinc-200" : "font-medium text-zinc-100"}>
                        {c.label}
                      </div>
                      {c.detail && (
                        <div className="mt-1 whitespace-pre-wrap break-words font-mono text-[12px] text-red-200/90">
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
            <div className="rounded-lg border border-zinc-800 bg-black/40">
              <OutputConsole lines={result.output} />
            </div>
          )}
          {tab === "explorer" && (
            <div className="rounded-lg border border-zinc-800 bg-black/40">
              <ExplorerTree nodes={result.explorer} />
            </div>
          )}

          {result.diagnosis && (result.runtimeError || result.syntaxError) && (
            <div className="space-y-3 rounded-xl border border-red-500/25 bg-red-500/[0.05] p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-red-300">
                Why your code crashed
              </div>
              <div className="font-semibold text-zinc-100">
                <Rich text={result.diagnosis.title} />
              </div>
              <p className="text-sm text-zinc-300">
                <Rich text={result.diagnosis.summary} />
              </p>
              {result.diagnosis.causes[0] && (
                <div className="rounded-lg border border-zinc-800 bg-black/30 p-3 text-sm">
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
                  title="A fix could look like"
                  tone="good"
                />
              )}
              <a
                href={analyzerLink(
                  (result.runtimeError ?? { message: result.output[0]?.text ?? "" }).message,
                  code,
                )}
                className="inline-block text-xs font-semibold text-emerald-300 hover:underline"
              >
                Open the full explanation in the Error Analyzer →
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
