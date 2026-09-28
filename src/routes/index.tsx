import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GraduationCap, MousePointerClick } from "lucide-react";
import { ANALYZER_EXAMPLES } from "@/lib/analyzerExamples";
import { SIGNATURES } from "@/lib/analyzer/precise/diagnose";
import { analyzeErrorAndCode, type AnalyzerResult } from "@/utils/analyzerEngine";
import { SiteNav } from "@/components/SiteNav";
import { ResultView } from "@/components/analyzer/ResultView";

type AnalyzerSearch = { error?: string; code?: string };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): AnalyzerSearch => ({
    error: typeof search.error === "string" ? search.error : undefined,
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  component: ErrorParserPage,
});

type Toast = { id: number; message: string; variant: "info" | "error" };
type Matched = Extract<AnalyzerResult, { matched: true }>;

function ErrorParserPage() {
  const search = Route.useSearch();
  const [logText, setLogText] = useState("");
  const [codeText, setCodeText] = useState("");
  const [result, setResult] = useState<
    { kind: "idle" } | { kind: "match"; data: Matched; key: number } | { kind: "none" }
  >({
    kind: "idle",
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [errorFlash, setErrorFlash] = useState(false);
  const errorRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add("ep-body");
    return () => document.body.classList.remove("ep-body");
  }, []);

  // Prefill from links like /?error=...&code=... (used by the Learn page).
  useEffect(() => {
    if (!search.error && !search.code) return;
    const log = search.error ?? "";
    const code = search.code ?? "";
    setLogText(log);
    setCodeText(code);
    runAnalysis(log, code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.error, search.code]);

  const canAnalyze = logText.trim().length > 0 || codeText.trim().length > 0;

  function showToast(message: string, variant: Toast["variant"] = "info") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }

  function runAnalysis(log: string, code: string) {
    const analysis = analyzeErrorAndCode(log, code);
    if (analysis.matched) {
      setResult({ kind: "match", data: analysis, key: Date.now() });
    } else {
      setResult({ kind: "none" });
      if (analysis.error) showToast(analysis.error, "error");
    }
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function triggerAnalysis() {
    const log = logText.trim();
    const code = codeText.trim();
    if (!log && !code) {
      setErrorFlash(true);
      errorRef.current?.focus();
      showToast("Paste an error message or code first", "error");
      setTimeout(() => setErrorFlash(false), 900);
      return;
    }
    runAnalysis(log, code);
  }

  function loadExample(index: number) {
    const ex = ANALYZER_EXAMPLES[index];
    setLogText(ex.error);
    setCodeText(ex.code);
    runAnalysis(ex.error, ex.code);
  }

  function clearAll() {
    setLogText("");
    setCodeText("");
    setResult({ kind: "idle" });
    errorRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      triggerAnalysis();
    }
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-emerald-500 focus:text-black focus:px-3 focus:py-2 focus:rounded focus:text-xs focus:font-semibold"
      >
        Skip to input
      </a>
      <SiteNav />

      <div
        role="region"
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none w-[calc(100%-2rem)] max-w-xs"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto px-4 py-2.5 rounded-lg border text-xs shadow-xl backdrop-blur-sm ${
              t.variant === "error"
                ? "bg-red-950/90 border-red-500/30 text-red-300"
                : "bg-zinc-900/95 border-emerald-500/20 text-zinc-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="analyzer-container relative min-h-screen flex flex-col items-center pb-10">
        <div className="ep-aurora" aria-hidden="true" />

        <header className="relative z-10 w-full max-w-4xl space-y-5 pt-10 pb-8 md:pt-16">
          <div className="code-dark inline-flex max-w-full items-center gap-2 rounded-lg border-2 border-[#1c1a16] bg-[#1e1e1e] px-3 py-1.5 font-mono text-[12px] shadow-[3px_3px_0_#1c1a16]">
            <span className="text-zinc-500">Output</span>
            <span className="truncate text-red-400">
              Script:12: attempt to index nil with &apos;Humanoid&apos;
            </span>
          </div>
          <h1 className="serif-title text-[42px] leading-[0.98] md:text-[68px]">
            Got a red error in Studio? <span className="ep-mark">Let&apos;s fix it.</span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-300 md:text-lg">
            Paste the error from the <b className="font-semibold text-zinc-100">Output</b> window
            and the script it points to. You get the exact line, the reason in plain words, and your
            script with the fix already in it.
          </p>
          <ul className="flex flex-wrap gap-2 text-[13px] text-zinc-200">
            {[
              `${SIGNATURES.length}+ real Roblox error messages`,
              "Runs in your browser, no AI",
              "Only official Roblox docs",
            ].map((t) => (
              <li
                key={t}
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-[#1c1a16]/15 bg-white px-2.5 py-1"
              >
                <span className="font-bold text-emerald-600">✓</span> {t}
              </li>
            ))}
          </ul>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="relative z-10 w-full max-w-4xl space-y-6 outline-none"
        >
          <section className="ep-card result-card space-y-5" aria-label="Input">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="errorInput"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100"
                >
                  <span className="ep-step">1</span>
                  Error from Output
                </label>
                <div
                  className={`code-dark rounded-lg border-2 bg-[#1e1e1e] p-3 transition-all ${
                    errorFlash ? "border-[#e8483f] ring-2 ring-[#e8483f]/50" : "border-[#1c1a16]"
                  }`}
                >
                  <textarea
                    id="errorInput"
                    ref={errorRef}
                    rows={7}
                    value={logText}
                    onChange={(e) => setLogText(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="ServerScriptService.Script:12: attempt to index nil with 'Humanoid'"
                    className="w-full resize-y bg-transparent font-mono text-sm text-red-300 placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="codeInput"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100"
                >
                  <span className="ep-step">2</span>
                  Your script
                  <span className="font-normal text-zinc-500">
                    · optional, but much more accurate
                  </span>
                </label>
                <div className="code-dark rounded-lg border-2 border-[#1c1a16] bg-[#1e1e1e] p-3">
                  <textarea
                    id="codeInput"
                    rows={7}
                    value={codeText}
                    onChange={(e) => setCodeText(e.target.value)}
                    onKeyDown={onKeyDown}
                    spellCheck={false}
                    placeholder={
                      "local player = game.Players.LocalPlayer\nlocal humanoid = player.Character.Humanoid"
                    }
                    className="w-full resize-y bg-transparent font-mono text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={!canAnalyze}
                onClick={triggerAnalysis}
                className="ep-cta rounded-lg px-5 py-2.5 text-sm font-semibold"
              >
                Find the cause →
              </button>
              <span className="text-[10px] text-zinc-600 hidden sm:inline font-mono">
                ⌘/Ctrl + ↵
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg border-2 border-[#1c1a16]/20 bg-white px-3.5 py-2 text-sm text-zinc-300 transition-colors hover:border-[#1c1a16]"
              >
                Clear
              </button>
            </div>

            <div className="border-t border-zinc-800/60 pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                <MousePointerClick className="h-4 w-4 text-[#e8483f]" aria-hidden="true" />
                Try a common error
              </div>
              <div className="flex flex-wrap gap-2">
                {ANALYZER_EXAMPLES.map((ex, i) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => loadExample(i)}
                    className="rounded-md border-2 border-[#1c1a16]/15 bg-white px-2.5 py-1 text-[13px] text-zinc-300 transition-colors hover:border-[#1c1a16] hover:bg-[#ffd23f] hover:text-[#1c1a16]"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div ref={resultRef} aria-live="polite" className="scroll-mt-20">
            {result.kind === "idle" && (
              <div className="ep-card result-card border-dashed text-center space-y-3 py-10">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#1c1a16] bg-[#ffd23f] font-mono text-xl font-bold text-[#1c1a16]">
                  {"{ }"}
                </div>
                <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                  In Studio, open <span className="text-zinc-200">View → Output</span>, run the
                  game, and copy the red line. Paste it above together with the script.
                </p>
              </div>
            )}

            {result.kind === "match" && result.data.precise && (
              <div key={result.key} className="slide-fade-enter-active">
                <ResultView diagnosis={result.data.precise} advanced={result.data.advanced} />
              </div>
            )}

            {result.kind === "match" && !result.data.precise && (
              <div className="ep-card result-card space-y-3">
                <h2 className="text-xl font-bold text-zinc-100">{result.data.title}</h2>
                <p className="text-sm text-zinc-300">{result.data.rootCause}</p>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-300">
                  {(result.data.fixes ?? []).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ol>
              </div>
            )}

            {result.kind === "none" && (
              <div className="ep-card result-card space-y-3">
                <h2 className="text-lg font-bold text-zinc-100">Nothing to analyze</h2>
                <p className="text-sm text-zinc-400">
                  Paste the full error line (including the part after the line number) and, ideally,
                  the script.
                </p>
              </div>
            )}
          </div>

          <aside className="ep-card result-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <GraduationCap
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
              <div>
                <div className="text-sm font-semibold text-zinc-100">New to scripting?</div>
                <p className="text-xs text-zinc-400">
                  Learn Roblox Studio scripting from zero with pictures and examples from games like
                  Tower of Hell, Doors and Pet Simulator.
                </p>
              </div>
            </div>
            <Link
              to="/learn"
              className="ep-cta shrink-0 rounded-lg px-4 py-2 text-center text-xs font-semibold"
            >
              Start learning →
            </Link>
          </aside>
        </main>

        <footer className="relative z-10 w-full max-w-4xl mt-14 text-center text-[11px] text-zinc-600 flex items-center justify-center gap-2">
          Made by YusufVyce · Not affiliated with Roblox Corporation
        </footer>
      </div>
    </>
  );
}
