import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  GraduationCap,
  Library,
  Check,
  History,
  Link2,
  Search,
  Swords,
} from "lucide-react";
import { copyText } from "@/components/CodeBlock";
import { ANALYZER_EXAMPLES } from "@/lib/analyzerExamples";
import { SIGNATURES } from "@/lib/analyzer/precise/diagnose";
import { LESSONS } from "@/lib/learn/lessons";
import { analyzeErrorAndCode, type AnalyzerResult } from "@/utils/analyzerEngine";
import { PageShell } from "@/components/PageShell";
import { HeroDemo } from "@/components/HeroDemo";
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

type HistoryItem = { log: string; code: string; title: string };
const HISTORY_KEY = "vyce-analyzer-history";

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
  const lastRun = useRef<{ log: string; code: string } | null>(null);

  // Switching the language rewrites the diagnosis on screen in the new language.
  useEffect(() => {
    const last = lastRun.current;
    if (!last) return;
    const analysis = analyzeErrorAndCode(last.log, last.code, lang);
    if (analysis.matched) setResult((r) => (r.kind === "match" ? { ...r, data: analysis } : r));
  }, [lang]);

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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
      if (Array.isArray(h)) setHistory(h.filter((x) => typeof x?.log === "string").slice(0, 6));
    } catch {
      // ignore
    }
  }, []);

  async function copyResultLink() {
    const params = new URLSearchParams({ error: logText.trim(), code: codeText.trim() });
    setLinkCopied(await copyText(`${window.location.origin}/?${params}`));
    setTimeout(() => setLinkCopied(false), 1800);
  }

  function showToast(message: string, variant: Toast["variant"] = "info") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }

  function runAnalysis(log: string, code: string) {
    lastRun.current = { log, code };
    const analysis = analyzeErrorAndCode(log, code, lang);
    if (analysis.matched) {
      setResult({ kind: "match", data: analysis, key: Date.now() });
      const title = analysis.precise?.title ?? analysis.title ?? log.slice(0, 60);
      setHistory((h) => {
        const next = [
          { log, code, title },
          ...h.filter((x) => x.log !== log || x.code !== code),
        ].slice(0, 6);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {
          // storage blocked
        }
        return next;
      });
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

      <header className="relative z-10 grid items-center gap-12 pt-12 pb-16 md:pt-20 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 font-mono text-[12px] text-ink-2 backdrop-blur">
            <span className="ep-dot" />
            {t("home.badge")}
          </div>
          <h1 className="serif-title text-[44px] leading-[0.98] md:text-[68px]">
            {t("home.title1")} <span className="ep-mark">{t("home.title2")}</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-ink-2 md:text-lg">
            {t("home.lead")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#main"
              className="ep-cta inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {t("home.ctaTry")}
            </a>
            <Link
              to="/learn"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface/70 px-5 py-3 text-sm font-medium text-ink backdrop-blur transition-colors hover:border-brand-line hover:bg-brand-soft"
            >
              <GraduationCap className="h-4 w-4 text-brand" aria-hidden="true" />
              {t("home.ctaLearn")}
            </Link>
          </div>
          <dl className="grid max-w-md grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-surface/60 backdrop-blur">
            {(
              [
                [`${SIGNATURES.length}+`, "home.stat1"],
                [String(LESSONS.length), "home.stat2"],
                ["0", "home.stat3"],
              ] as const
            ).map(([n, key]) => (
              <div key={key} className="px-4 py-3">
                <dt className="font-mono text-2xl font-semibold text-ink">{n}</dt>
                <dd className="text-[12px] leading-snug text-ink-3">{t(key)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <HeroDemo />
      </header>

      <main id="main" tabIndex={-1} className="relative z-10 scroll-mt-24 space-y-6 outline-none">
        <div className="ep-label">
          <b>//</b> 01 — {t("home.sec1")}
        </div>
        <section
          className="ep-card ep-card-accent space-y-5 p-4 md:p-6"
          aria-label={t("home.inputLabel")}
        >
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
            {history.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-3">
                  <History className="h-3.5 w-3.5" aria-hidden="true" /> {t("home.recent")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((h) => (
                    <button
                      key={`${h.log}|${h.code}`}
                      type="button"
                      title={h.log}
                      onClick={() => {
                        setLogText(h.log);
                        setCodeText(h.code);
                        runAnalysis(h.log, h.code);
                      }}
                      className="max-w-[18rem] truncate rounded-lg border border-line bg-surface-2/60 px-2.5 py-1 font-mono text-[12px] text-ink-3 transition-colors hover:border-brand-line hover:text-brand"
                    >
                      {h.title.replace(/`/g, "")}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <div ref={resultRef} aria-live="polite" className="scroll-mt-20">
          {result.kind === "idle" && (
            <div className="space-y-4">
              <div className="ep-label">
                <b>//</b> 02 — {t("home.sec2")}
              </div>
              <div className="ep-card px-6 py-8">
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
            </div>
          )}

          {result.kind === "match" && result.data.precise && (
            <div key={result.key} className="slide-fade-enter-active space-y-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={copyResultLink}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] text-ink-3 transition-colors hover:text-brand"
                >
                  {linkCopied ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  {t(linkCopied ? "pg.copied" : "home.shareResult")}
                </button>
              </div>
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

        <div className="ep-label pt-10">
          <b>//</b> 03 — {t("home.sec3")}
        </div>
        <section
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-label={t("home.moreLabel")}
        >
          {[
            {
              to: "/learn",
              icon: GraduationCap,
              title: t("home.card1t"),
              body: t("home.card1", { n: LESSONS.length }),
            },
            {
              to: "/playground",
              icon: FlaskConical,
              title: t("home.card2t"),
              body: t("home.card2"),
            },
            { to: "/errors", icon: Library, title: t("home.card3t"), body: t("home.card3") },
            { to: "/challenges", icon: Swords, title: t("home.card4t"), body: t("home.card4") },
          ].map(({ to, icon: Icon, title, body }) => (
            <Link
              key={to}
              to={to}
              className="ep-card group flex flex-col gap-3 p-6 transition-transform duration-200 hover:-translate-y-1"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-line bg-brand-soft text-brand shadow-[0_0_24px_-6px_var(--brand)]">
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
