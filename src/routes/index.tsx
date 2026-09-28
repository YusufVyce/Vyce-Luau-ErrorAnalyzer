import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  GraduationCap,
  Library,
  Search,
} from "lucide-react";
import { ANALYZER_EXAMPLES } from "@/lib/analyzerExamples";
import { SIGNATURES } from "@/lib/analyzer/precise/diagnose";
import { analyzeErrorAndCode, type AnalyzerResult } from "@/utils/analyzerEngine";
import { PageShell } from "@/components/PageShell";
import { useLang, useT } from "@/lib/prefs";
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
  const t = useT();
  const lang = useLang();
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
      showToast(t("home.emptyToast"), "error");
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
    <PageShell width="max-w-5xl">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded focus:bg-brand focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
      >
        {t("home.skip")}
      </a>

      <div
        role="region"
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[calc(100%-2rem)] max-w-xs flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-xl border px-4 py-2.5 text-[13px] shadow-lg ${
              toast.variant === "error"
                ? "border-red-500/30 bg-surface text-red-400"
                : "border-line bg-surface text-ink"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <header className="relative z-10 space-y-5 pt-12 pb-10 text-center md:pt-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] font-medium text-ink-2 shadow-sm">
          <span className="ep-dot" />
          {t("home.badge")}
        </div>
        <h1 className="serif-title mx-auto max-w-3xl text-[40px] leading-[1.02] md:text-[64px]">
          {t("home.title1")} <span className="ep-mark">{t("home.title2")}</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-ink-2 md:text-lg">
          {t("home.lead")}
        </p>
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-ink-2">
          {[t("home.f1", { n: SIGNATURES.length }), t("home.f2"), t("home.f3")].map((f) => (
            <li key={f} className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden="true" /> {f}
            </li>
          ))}
        </ul>
      </header>

      <main id="main" tabIndex={-1} className="relative z-10 space-y-6 outline-none">
        <section className="ep-card space-y-5 p-4 md:p-6" aria-label={t("home.inputLabel")}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <label
                htmlFor="errorInput"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"
              >
                <span className="ep-step">1</span>
                {t("home.errorLabel")}
              </label>
              <div
                className={`code-dark overflow-hidden rounded-xl border bg-code transition-shadow ${
                  errorFlash
                    ? "border-red-500 ring-2 ring-red-500/40"
                    : "border-code-line focus-within:ring-2 focus-within:ring-brand/40"
                }`}
              >
                <div className="flex items-center gap-2 border-b border-code-line bg-code-head px-3 py-1.5 text-[12px] text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-red-400/80" aria-hidden="true" />
                  Output
                </div>
                <textarea
                  id="errorInput"
                  ref={errorRef}
                  rows={7}
                  value={logText}
                  onChange={(e) => setLogText(e.target.value)}
                  onKeyDown={onKeyDown}
                  spellCheck={false}
                  placeholder="ServerScriptService.Script:12: attempt to index nil with 'Humanoid'"
                  className="block w-full resize-y bg-transparent p-3 font-mono text-[13px] text-red-300 placeholder-zinc-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="min-w-0">
              <label
                htmlFor="codeInput"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"
              >
                <span className="ep-step">2</span>
                {t("home.codeLabel")}
                <span className="hidden font-normal text-ink-3 sm:inline">
                  · {t("home.codeHint")}
                </span>
              </label>
              <div className="code-dark overflow-hidden rounded-xl border border-code-line bg-code focus-within:ring-2 focus-within:ring-brand/40">
                <div className="flex items-center gap-2 border-b border-code-line bg-code-head px-3 py-1.5 text-[12px] text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-sky-400/80" aria-hidden="true" />
                  Script.lua
                </div>
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
                  className="block w-full resize-y bg-transparent p-3 font-mono text-[13px] text-zinc-200 placeholder-zinc-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canAnalyze}
              onClick={triggerAnalysis}
              className="ep-cta inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {t("home.analyze")}
            </button>
            <kbd className="hidden rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-3 sm:inline">
              Ctrl + Enter
            </kbd>
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {t("home.clear")}
            </button>
          </div>

          <div className="border-t border-line pt-4">
            <div className="mb-2.5 text-[13px] font-medium text-ink-3">{t("home.examples")}</div>
            <div className="flex flex-wrap gap-2">
              {ANALYZER_EXAMPLES.map((ex, i) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => loadExample(i)}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-ink-2 transition-colors hover:border-brand-line hover:bg-brand-soft hover:text-brand"
                >
                  {lang === "tr" ? ex.labelTr : ex.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div ref={resultRef} aria-live="polite" className="scroll-mt-20">
          {result.kind === "idle" && (
            <div className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
              <div className="mx-auto grid max-w-3xl gap-6 text-left sm:grid-cols-3">
                {[
                  [t("home.how1t"), t("home.how1")],
                  [t("home.how2t"), t("home.how2")],
                  [t("home.how3t"), t("home.how3")],
                ].map(([title, body], i) => (
                  <div key={title} className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <span className="ep-step">{i + 1}</span>
                      {title}
                    </div>
                    <p className="text-[13px] leading-relaxed text-ink-3">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.kind === "match" && result.data.precise && (
            <div key={result.key} className="slide-fade-enter-active">
              <ResultView diagnosis={result.data.precise} advanced={result.data.advanced} />
            </div>
          )}

          {result.kind === "match" && !result.data.precise && (
            <div className="ep-card space-y-3 p-6">
              <h2 className="text-xl font-semibold text-ink">{result.data.title}</h2>
              <p className="text-sm text-ink-2">{result.data.rootCause}</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-2">
                {(result.data.fixes ?? []).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ol>
            </div>
          )}

          {result.kind === "none" && (
            <div className="ep-card space-y-2 p-6">
              <h2 className="text-lg font-semibold text-ink">{t("home.noneTitle")}</h2>
              <p className="text-sm text-ink-2">{t("home.none")}</p>
            </div>
          )}
        </div>

        <section className="grid gap-4 pt-6 md:grid-cols-3" aria-label={t("home.moreLabel")}>
          {[
            { to: "/learn", icon: GraduationCap, title: t("home.card1t"), body: t("home.card1") },
            {
              to: "/playground",
              icon: FlaskConical,
              title: t("home.card2t"),
              body: t("home.card2"),
            },
            { to: "/errors", icon: Library, title: t("home.card3t"), body: t("home.card3") },
          ].map(({ to, icon: Icon, title, body }) => (
            <Link
              key={to}
              to={to}
              className="ep-card group flex flex-col gap-3 p-5 transition-colors hover:border-brand-line"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="font-semibold text-ink">{title}</div>
              <p className="text-[13px] leading-relaxed text-ink-3">{body}</p>
              <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-medium text-brand">
                {t("home.open")}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </section>
      </main>
    </PageShell>
  );
}
