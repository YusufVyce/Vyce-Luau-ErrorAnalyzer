import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, GitBranch, ShieldAlert } from "lucide-react";
import { ANALYZER_EXAMPLES } from "@/lib/analyzerExamples";
import type { AdvancedAnalyzerOutput } from "@/lib/analyzer/advancedRobloxAnalyzer";
import {
  analyzeErrorAndCode,
  type AnalyzerResult,
} from "@/utils/analyzerEngine";

export const Route = createFileRoute("/")({
  component: ErrorParserPage,
});

type Analysis = {
  explanation: string;
  causes: { percent: number; text: string }[];
  fixes: string[];
  example?: string;

  severity?: "Low" | "Medium" | "High" | "Critical";
  confidence?: number;

  codeInsights?: {
  title: string;
  description: string;
}[];

deprecatedApis?: {
  api: string;
  replacement: string;
  reason: string;
}[];

advanced?: AdvancedAnalyzerOutput;
};

type MatchResult = {
  entry: { id: string; title: string };
  analysis: Analysis;
};

type Toast = { id: number; message: string; variant: "info" | "error" };

function ErrorParserPage() {
  const [logText, setLogText] = useState("");
  const [codeText, setCodeText] = useState("");
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "match"; data: MatchResult; analysis: Analysis; logSnapshot: string }
    | { kind: "generic" }
  >({ kind: "idle" });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [errorFlash, setErrorFlash] = useState(false);
  const [animateResult, setAnimateResult] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);

  const errorRef = useRef<HTMLTextAreaElement>(null);
  const genericRef = useRef<HTMLDivElement>(null);

  // Ensure body gets our themed background/font while on this page.
  useEffect(() => {
    document.body.classList.add("ep-body");
    return () => document.body.classList.remove("ep-body");
  }, []);

  const canAnalyze = logText.trim().length > 0 || codeText.trim().length > 0;

  function showToast(message: string, variant: "info" | "error" = "info") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }

  /**
   * Runs the analyzer against a given log/code pair and applies the result
   * to state. Shared by the main "Analyze" button and "Insert Example" (with
   * auto-run) so the two entry points can't drift out of sync with each
   * other, as they had before this was extracted.
   */
  function runAnalysis(log: string, code: string) {
    const analysis = analyzeErrorAndCode(log, code);

    if (analysis.matched) {
      const matchData: MatchResult = {
        entry: {
          id: analysis.ruleId,
          title: analysis.title,
        },
        analysis: {
          explanation: analysis.rootCause,
          causes: analysis.causes || [{ percent: 100, text: analysis.rootCause }],
          fixes: analysis.fixes || [analysis.fix],
          example: analysis.correctedExample,

          severity: analysis.severity,
          confidence: analysis.confidence,

          codeInsights: analysis.codeInsights,
          deprecatedApis: analysis.deprecatedApis,
          advanced: analysis.advanced,
        },
      };

      setResult({
        kind: "match",
        data: matchData,
        analysis: matchData.analysis,
        logSnapshot: log || code,
      });
      setAnimateResult(false);
      requestAnimationFrame(() => setAnimateResult(true));
    } else {
      setResult({ kind: "generic" });
      // If the analyzer hit an internal problem (as opposed to just finding
      // no match), surface that distinctly rather than silently treating it
      // the same as "no match found".
      if (analysis.error) {
        showToast(analysis.error, "error");
      }
      setTimeout(() => genericRef.current?.focus(), 0);
    }
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

  function insertExample(triggerAfter = false) {
    const ex = ANALYZER_EXAMPLES[exampleIndex % ANALYZER_EXAMPLES.length];
    setExampleIndex((i) => i + 1);
    setLogText(ex.error);
    setCodeText(ex.code);
    showToast("Loaded Roblox Script example");
    if (triggerAfter) {
      setTimeout(() => runAnalysis(ex.error, ex.code), 0);
    }
  }

  function clearAll() {
    setLogText("");
    setCodeText("");
    setResult({ kind: "idle" });
    errorRef.current?.focus();
  }

  async function copyToClipboard(content: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        const ta = document.createElement("textarea");
        ta.value = content;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      return true;
    } catch {
      return false;
    }
  }

  async function copyExample(code: string) {
    const copied = await copyToClipboard(code);
    if (copied) {
      setCopyLabel("Copied ✓");
      showToast("Code copied to clipboard");
    } else {
      setCopyLabel("Copy failed");
      showToast("Could not copy — select the text manually", "error");
    }
    setTimeout(() => setCopyLabel("Copy"), 2000);
  }

  async function copyTemplate(templateId: string, template: string) {
    const copied = await copyToClipboard(template);
    if (copied) {
      setCopiedTemplateId(templateId);
      showToast("Template copied to clipboard");
      setTimeout(() => setCopiedTemplateId((current) => (current === templateId ? null : current)), 1800);
      return;
    }
    showToast("Could not copy template", "error");
  }

  async function copySymbol(symbol: string) {
    const copied = await copyToClipboard(symbol);
    if (copied) {
      showToast(`Symbol '${symbol}' copied`);
      return;
    }
    showToast("Could not copy symbol", "error");
  }

  function matchStrategyBadgeClass(strategy: AdvancedAnalyzerOutput["matchStrategy"]) {
    switch (strategy) {
      case "exact":
        return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
      case "partial":
        return "border-amber-500/25 bg-amber-500/10 text-amber-300";
      case "fallback":
        return "border-cyan-500/25 bg-cyan-500/10 text-cyan-300";
      default:
        return "border-zinc-700 bg-zinc-900/70 text-zinc-400";
    }
  }

  function severityIcon(severity: "low" | "medium" | "high" | "critical") {
    switch (severity) {
      case "critical":
        return "🔴";
      case "high":
        return "🟠";
      case "medium":
        return "🟡";
      default:
        return "🔵";
    }
  }

  function sortFindingSeverity(severity: "low" | "medium" | "high" | "critical") {
    switch (severity) {
      case "critical":
        return 0;
      case "high":
        return 1;
      case "medium":
        return 2;
      default:
        return 3;
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      triggerAnalysis();
    }
  }

  const analysis = result?.kind === "match"
    ? result.analysis
    : { explanation: "", causes: [], fixes: [], example: undefined, advanced: undefined };

  const entry = result?.kind === "match"
  ? result.data.entry
  : { id: "unknown", title: "Unknown error" };

  const logSnapshot = result?.kind === "match" ? result.logSnapshot : "";
  const advanced = analysis.advanced;
  const rootCauseChain = advanced?.rootCauseChain;
  const runtimeStates = advanced?.runtimeStates ?? [];
  const flowTraces = advanced?.flowTraces ?? [];
  const sortedFindings = useMemo(() => {
    const findings = [...(advanced?.staticFindings ?? [])];
    findings.sort((a, b) => sortFindingSeverity(a.severity) - sortFindingSeverity(b.severity));
    return findings;
  }, [advanced?.staticFindings]);

  useEffect(() => {
    if (!advanced?.fixTemplates?.length) {
      setOpenTemplateId(null);
      return;
    }
    setOpenTemplateId((current) => current ?? advanced.fixTemplates[0].id);
  }, [advanced?.fixTemplates]);

  function findingSeverityBadgeClass(severity: "low" | "medium" | "high" | "critical") {
    switch (severity) {
      case "critical":
        return "badge-critical";
      case "high":
        return "badge-high";
      case "medium":
        return "badge-medium";
      default:
        return "badge-low";
    }
  }

  function priorityBadgeClass(priority: 1 | 2 | 3 | 4 | 5) {
    switch (priority) {
      case 1:
        return "badge-safety";
      case 2:
        return "badge-timing";
      case 3:
        return "badge-type";
      case 4:
        return "badge-architecture";
      default:
        return "badge-performance";
    }
  }

  function runtimeStateBadgeClass(state: "Loaded" | "Missing" | "Destroyed" | "Uninitialized" | "Unknown") {
    switch (state) {
      case "Loaded":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
      case "Missing":
        return "border-amber-500/20 bg-amber-500/10 text-amber-300";
      case "Destroyed":
        return "border-red-500/20 bg-red-500/10 text-red-300";
      case "Uninitialized":
        return "border-orange-500/20 bg-orange-500/10 text-orange-300";
      default:
        return "border-zinc-700 bg-zinc-900/80 text-zinc-400";
    }
  }

  function stageToneClass(stage: "primary" | "propagation" | "surface") {
    switch (stage) {
      case "primary":
        return "border-red-500/15 bg-red-500/6 text-red-200";
      case "propagation":
        return "border-amber-500/15 bg-amber-500/6 text-amber-200";
      default:
        return "border-sky-500/15 bg-sky-500/6 text-sky-200";
    }
  }

  function stageIcon(stage: "primary" | "propagation" | "surface") {
    switch (stage) {
      case "primary":
        return <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />;
      case "propagation":
        return <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />;
      default:
        return <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />;
    }
  }

  function confidenceMeterClass(confidence: number) {
    if (confidence >= 75) return "from-emerald-400 to-teal-400";
    if (confidence >= 55) return "from-amber-400 to-orange-400";
    return "from-sky-400 to-cyan-400";
  }

  function hypothesisRankLabel(index: number, confidence: number) {
    if (index === 0) return "Primary";
    if (confidence >= 45 && index < 3) return "Alternative";
    return "Low confidence";
  }

  const metaLabel = useMemo(() => {
    if (result?.kind !== "match") return "";
    return `Roblox • ${entry.id}`;
  }, [entry, result]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-emerald-500 focus:text-black focus:px-3 focus:py-2 focus:rounded focus:text-xs focus:font-semibold"
      >
        Skip to input
      </a>

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
            className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs shadow-xl backdrop-blur-sm transition-all duration-300 ${
              t.variant === "error"
                ? "bg-red-950/90 border-red-500/30 text-red-300"
                : "bg-zinc-900/95 border-emerald-500/20 text-zinc-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="analyzer-container relative min-h-screen overflow-y-auto flex flex-col items-center pb-10">
  <div className="ep-aurora" aria-hidden="true" />

  <header className="relative z-10 w-full max-w-5xl pt-14 md:pt-20 pb-8 space-y-6 text-center">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[10px] tracking-[0.2em] uppercase text-emerald-300 mx-auto">
      <span className="ep-dot" />
      Dynamic Root Cause Analyzer
    </div>

    <h1 className="serif-title text-4xl md:text-6xl leading-[1.05] text-zinc-50">
      Got a error?
      <br />
      Let&apos;s{" "}
      <span className="italic bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">
        FIX it.
      </span>
    </h1>

    <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
      Paste your console error and the related script lines. The analyzer
      reads context to find the{" "}
      <span className="text-zinc-200">exact root cause</span> — not generic
      guesses.
    </p>

    <div className="mt-3 text-xs text-zinc-500">
      Made by YusufVyce
    </div>

    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-zinc-500">
      <span className="flex items-center gap-1.5">
        <span className="text-emerald-400">✓</span>
        90% Fixer
      </span>

      <span className="flex items-center gap-1.5">
        <span className="text-emerald-400">✓</span>
        Roblox script focused
      </span>

      <span className="flex items-center gap-1.5">
        <span className="text-emerald-400">✓</span>
        Instant helper
      </span>
    </div>
  </header>

  <main
    id="main"
    tabIndex={-1}
    className="relative z-10 w-full max-w-5xl space-y-6 outline-none"
  >
    <section className="input-grid items-start h-auto">
      <div className="ep-card result-card space-y-5">
        <div>
          <label
            htmlFor="errorInput"
            className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-wider mb-2"
          >
            <span className="ep-step">1</span>
            Console Error Log
          </label>

          <div
            className={`bg-black/40 border rounded-lg p-3 transition-all text-container ${
              errorFlash
                ? "border-red-500/60 ring-2 ring-red-500/60"
                : "border-zinc-800/70 focus-within:border-emerald-500/40 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.08)]"
            }`}
          >
            <textarea
              id="errorInput"
              ref={errorRef}
              rows={5}
              aria-required
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="ServerScriptService.Inventory:41: attempt to index nil with 'Value'"
              className="w-full bg-transparent text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none resize-y"
            />
          </div>
        </div>

              <div>
                <label
                  htmlFor="codeInput"
                  className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-wider mb-2"
                >
                  <span className="ep-step">2</span>
                  Related Code Snippet
                  <span className="normal-case text-zinc-600 tracking-normal">
                    · optional
                  </span>
                </label>
                <div className="bg-black/40 border border-zinc-800/70 rounded-lg p-3 focus-within:border-emerald-500/40 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.08)] transition-all text-container">
                  <textarea
                    id="codeInput"
                    rows={8}
                    value={codeText}
                    onChange={(e) => setCodeText(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={"local coins = player.leaderstats.Coins\nprint(coins.Value)"}
                    className="w-full bg-transparent text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none resize-y font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  disabled={!canAnalyze}
                  onClick={triggerAnalysis}
                  className="ep-cta px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide"
                >
                  Analyze Root Cause →
                </button>
                <span className="text-[10px] text-zinc-600 hidden sm:inline font-mono">
                  ⌘/Ctrl + ↵
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="px-3.5 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 text-xs transition-all"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => insertExample(false)}
                  className="ml-auto px-3.5 py-2 rounded-lg border border-zinc-800/70 hover:border-emerald-500/30 hover:text-emerald-300 text-zinc-500 text-xs transition-all"
                >
                  ↻ Insert Example
                </button>
              </div>
            </div>

            <div
              className="relative results-panel self-start h-auto overflow-visible"
              aria-live="polite"
            >
              {result.kind === "idle" && (
                <div className="ep-card result-card analysis-panel-card text-center space-y-4 border-dashed">
                  <div className="mx-auto w-14 h-14 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center text-2xl text-emerald-400 font-mono">
                    {"{ }"}
                  </div>
                  <p className="text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
                    Paste an error on the left and click{" "}
                    <span className="text-emerald-300 font-medium">
                      Analyze Root Cause
                    </span>{" "}
                    to see a breakdown here.
                  </p>
                  <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                    awaiting input
                  </div>
                </div>
              )}

              {result?.kind === "match" && (
                <div
                  className={`ep-card ep-card-accent result-card analysis-panel-card h-auto overflow-visible ${
                    animateResult ? "slide-fade-enter-active" : "slide-fade-enter"
                  }`}
                >
                  <div className="analysis-panel-content space-y-6">
                  <div className="flex items-start justify-between gap-4 border-b border-emerald-500/10 pb-4">
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-emerald-400 tracking-[0.2em] uppercase font-semibold">
                        {metaLabel}
                      </div>
                      <h2 className="text-2xl font-bold text-zinc-50 serif-title">
                        {entry.title}
                      </h2>
                      <div className="mt-3 flex flex-wrap gap-2">
  {analysis.severity && (
    <div className={`badge ${findingSeverityBadgeClass(analysis.severity.toLowerCase() as "low" | "medium" | "high" | "critical")}`}>
      Severity: {analysis.severity}
    </div>
  )}

  {analysis.confidence !== undefined && (
    <div className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-1.5 text-xs">
      <span className="text-zinc-400 font-medium">Confidence</span>
      <span className="text-emerald-300 font-semibold">{analysis.confidence}%</span>
      <div className="h-1.5 w-28 sm:w-36 rounded-full bg-zinc-900 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${confidenceMeterClass(analysis.confidence)}`}
          style={{ width: `${analysis.confidence}%` }}
        />
      </div>
    </div>
  )}
</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex flex-col items-end gap-2">
                        <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full font-medium">
                          <span className="ep-dot" />
                          Pattern match
                        </div>
                        {advanced?.matchStrategy && (
                          <div className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wide ${matchStrategyBadgeClass(advanced.matchStrategy)}`}>
                            Match: {advanced.matchStrategy}
                          </div>
                        )}
                      </div>
                      <div
                        className="text-[10px] text-zinc-600 mt-2 font-mono max-w-[220px] truncate"
                        title={logSnapshot}
                      >
                        {logSnapshot
                          ? logSnapshot.length > 100
                            ? logSnapshot.slice(0, 100) + "…"
                            : logSnapshot
                          : "No log snapshot available"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <section className="space-y-2">
                      <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                        <span className="ep-step">1</span> Error Context
                      </h3>
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {analysis.explanation || "No analysis available."}
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                        <span className="ep-step">2</span> Diagnostic Flow
                      </h3>
                      {rootCauseChain ? (
                        <div className="relative pl-5 md:pl-8 space-y-3 before:absolute before:left-[14px] md:before:left-[18px] before:top-3 before:bottom-3 before:w-px before:bg-gradient-to-b before:from-red-500/50 before:via-amber-400/50 before:to-sky-500/50">
                          {[
                            {
                              stage: "primary" as const,
                              title: "Primary Cause",
                              description: rootCauseChain.primaryCause.description,
                              detail: "Origin",
                              icon: stageIcon("primary"),
                            },
                            {
                              stage: "propagation" as const,
                              title: "Intermediate Cause(s)",
                              description: rootCauseChain.intermediateCauses.length > 0
                                ? rootCauseChain.intermediateCauses.map((cause) => cause.description).join(" · ")
                                : "No propagation confirmed.",
                              detail: "Path",
                              icon: stageIcon("propagation"),
                            },
                            {
                              stage: "surface" as const,
                              title: "Surface Error",
                              description: rootCauseChain.surfaceError.description,
                              detail: "Observed failure",
                              icon: stageIcon("surface"),
                            },
                          ].map((stage, index) => (
                            <div key={stage.title} className={`relative rounded-2xl border p-4 md:p-4.5 ${stageToneClass(stage.stage)}`}>
                              <div className="absolute -left-0.5 md:-left-1 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-current bg-zinc-950 shadow-lg">
                                {stage.icon}
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2 pl-6 md:pl-7">
                                <div>
                                  <div className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-80">
                                    {stage.detail}
                                  </div>
                                  <div className="mt-0.5 text-sm font-semibold text-zinc-50">
                                    {stage.title}
                                  </div>
                                </div>
                                <div className="text-[10px] px-2 py-1 rounded-full border border-current/20 bg-black/20 font-mono uppercase tracking-wide">
                                  {index === 0 ? "source" : index === 1 ? "propagated" : "surface"}
                                </div>
                              </div>
                              <p className="pl-6 md:pl-7 mt-2 text-sm text-zinc-200 leading-relaxed">
                                {stage.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2.5 mt-1">
                          {(analysis.causes ?? []).map((c, i) => (
                            <CauseRow key={i} percent={c.percent} text={c.text} />
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="space-y-2">
                      <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                        <span className="ep-step">3</span> How to fix it
                      </h3>
                      <ol className="text-sm text-zinc-300 space-y-2 leading-relaxed pl-1">
                        {(analysis.fixes ?? []).map((f, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="text-emerald-400 font-mono text-xs pt-0.5 shrink-0">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ol>
                    </section>

                    {advanced && (
                      <details className="group rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-4" open>
                        <summary className="list-none cursor-pointer flex items-center justify-between gap-3">
                          <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-300 font-semibold">
                            <span className="ep-step">4</span> Advanced Analysis
                          </h3>
                          <span className="text-[10px] text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                        </summary>

                        <div className="mt-4 space-y-5">
                          {(advanced.quickSummary || advanced.likelyRootCause || rootCauseChain) && (
                            <section className="space-y-3">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Diagnostic Flow
                              </div>

                              <div className="space-y-3">
                                <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3">
                                  <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="text-[10px] uppercase tracking-widest text-emerald-300 font-semibold">
                                      Primary Cause
                                    </div>
                                    {rootCauseChain.primaryCause.confidence !== undefined && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 font-mono">
                                        {rootCauseChain.primaryCause.confidence}% support
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-zinc-100 leading-relaxed">
                                    {rootCauseChain.primaryCause.description || advanced.quickSummary || advanced.likelyRootCause || "Primary cause not available."}
                                  </p>
                                  {rootCauseChain.primaryCause.evidence?.length ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {rootCauseChain.primaryCause.evidence.slice(0, 4).map((item) => (
                                        <span key={item.id} className="px-2 py-1 rounded-md border border-emerald-500/15 bg-black/20 text-[11px] text-zinc-300">
                                          {item.message}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                                  <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
                                      Intermediate Cause(s)
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 font-mono">
                                      propagation path
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {rootCauseChain.intermediateCauses.length ? (
                                      rootCauseChain.intermediateCauses.map((cause, idx) => (
                                        <div key={`${cause.title}-${idx}`} className="rounded-md border border-zinc-800 bg-black/20 p-2.5">
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="text-sm text-zinc-100 leading-relaxed">{cause.description}</div>
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono shrink-0">
                                              {cause.confidence}%
                                            </span>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-sm text-zinc-300">No intermediate propagation was confirmed.</div>
                                    )}
                                  </div>
                                </div>

                                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                                  <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
                                      Surface Error
                                    </div>
                                    {rootCauseChain.surfaceError.confidence !== undefined && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-300 font-mono">
                                        {rootCauseChain.surfaceError.confidence}% signal
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-zinc-100 leading-relaxed">
                                    {rootCauseChain.surfaceError.description || advanced.likelyRootCause || "Surface error not available."}
                                  </p>
                                </div>
                              </div>
                            </section>
                          )}

                          <details className="group rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-4">
                            <summary className="list-none cursor-pointer flex items-center justify-between gap-3">
                              <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-300 font-semibold">
                                <span className="ep-step">5</span> Ranked Hypotheses
                              </h3>
                              <span className="text-[10px] text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>

                            <div className="mt-4 space-y-3">
                              {advanced.hypotheses && advanced.hypotheses.length > 0 ? (
                                advanced.hypotheses.map((hypothesis, idx) => {
                                  const confidenceFactors = hypothesis.confidenceFactors ?? [];
                                  const positiveFactors = confidenceFactors.filter((factor) => !factor.startsWith("penalty:"));
                                  const penaltyFactors = confidenceFactors.filter((factor) => factor.startsWith("penalty:"));

                                  return (
                                    <div key={`${hypothesis.title}-${idx}`} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm text-zinc-100 leading-relaxed">{hypothesis.rootCause}</p>
                                            {idx === 0 && (
                                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 font-mono shrink-0">
                                                selected
                                              </span>
                                            )}
                                          </div>
                                          <div className="mt-1 text-[11px] text-zinc-500">{hypothesis.title}</div>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono shrink-0">
                                          {hypothesis.confidence}%
                                        </span>
                                      </div>

                                      <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${hypothesis.confidence}%` }} />
                                      </div>

                                      {confidenceFactors.length > 0 && (
                                        <div className="grid gap-2 md:grid-cols-2">
                                          <div className="rounded-md border border-emerald-500/15 bg-emerald-500/5 p-2.5">
                                            <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold mb-2">
                                              Increased confidence
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {positiveFactors.length > 0 ? positiveFactors.map((factor) => (
                                                <span key={factor} className="px-2 py-1 rounded-md border border-emerald-500/15 bg-black/20 text-[11px] text-zinc-300">
                                                  {factor}
                                                </span>
                                              )) : <span className="text-xs text-zinc-400">No strong positive signals were recorded.</span>}
                                            </div>
                                          </div>

                                          <div className="rounded-md border border-amber-500/15 bg-amber-500/5 p-2.5">
                                            <div className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold mb-2">
                                              Reduced confidence
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {penaltyFactors.length > 0 ? penaltyFactors.map((factor) => (
                                                <span key={factor} className="px-2 py-1 rounded-md border border-amber-500/15 bg-black/20 text-[11px] text-zinc-300">
                                                  {factor.replace(/^penalty:\s*/i, "")}
                                                </span>
                                              )) : <span className="text-xs text-zinc-400">No confidence penalties applied.</span>}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-sm text-zinc-400">No ranked hypotheses available.</div>
                              )}
                            </div>
                          </details>

                          <details className="group rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-4">
                            <summary className="list-none cursor-pointer flex items-center justify-between gap-3">
                              <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-300 font-semibold">
                                <span className="ep-step">6</span> Runtime State
                              </h3>
                              <span className="text-[10px] text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {runtimeStates.length > 0 ? runtimeStates.map((state, idx) => (
                                <div key={`${state.name}-${idx}`} className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 flex items-center gap-2 text-xs">
                                  <span className="text-zinc-500 font-mono">{state.role}</span>
                                  <span className="text-zinc-200">{state.name}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${runtimeStateBadgeClass(state.state)}`}>
                                    {state.state}
                                  </span>
                                </div>
                              )) : <div className="text-sm text-zinc-400">No runtime state was inferred.</div>}
                            </div>
                          </details>

                          <details className="group rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-4">
                            <summary className="list-none cursor-pointer flex items-center justify-between gap-3">
                              <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-300 font-semibold">
                                <span className="ep-step">7</span> Flow Trace
                              </h3>
                              <span className="text-[10px] text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>

                            <div className="mt-4 space-y-2">
                              {flowTraces.length > 0 ? flowTraces.map((trace, idx) => (
                                <div key={`${trace.target}-${trace.source}-${idx}`} className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                                  <div className="flex flex-wrap items-center gap-2 text-xs leading-relaxed">
                                    <span className="px-2 py-1 rounded-md border border-cyan-500/20 bg-cyan-500/10 text-cyan-200 font-mono">{trace.source}</span>
                                    <span className="text-zinc-500">→</span>
                                    <span className="px-2 py-1 rounded-md border border-zinc-700 bg-zinc-900/70 text-zinc-200 font-mono">{trace.target}</span>
                                    <span className="text-zinc-500">→</span>
                                    <span className="text-zinc-300">{trace.reason}</span>
                                  </div>
                                  <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
                                    <span className="px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-950 text-zinc-400 font-mono">
                                      {trace.confidence}%
                                    </span>
                                    {trace.line && <span>line {trace.line}</span>}
                                  </div>
                                </div>
                              )) : <div className="text-sm text-zinc-400">No flow trace was inferred.</div>}
                            </div>
                          </details>

                          <details className="group rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-4">
                            <summary className="list-none cursor-pointer flex items-center justify-between gap-3">
                              <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-300 font-semibold">
                                <span className="ep-step">8</span> Evidence
                              </h3>
                              <span className="text-[10px] text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>

                            <div className="mt-4 space-y-2">
                              {advanced.evidence && advanced.evidence.length > 0 ? advanced.evidence.map((item) => (
                                <div key={item.id} className="rounded-lg border border-zinc-800 bg-black/30 p-2.5 text-xs text-zinc-300">
                                  <div className="flex items-center justify-between gap-3">
                                    <span>{item.message}</span>
                                    <span className="text-emerald-400 font-mono">+{item.score}</span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                                    {item.line && <span>line {item.line}</span>}
                                    {item.source && <span>{item.source}</span>}
                                    {item.layer && <span>{item.layer}</span>}
                                  </div>
                                </div>
                              )) : <div className="text-sm text-zinc-400">No evidence was captured.</div>}
                            </div>
                          </details>

                          {advanced.matchingRules && advanced.matchingRules.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Matching Rules
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {advanced.matchingRules.map((rule) => (
                                  <span key={rule} className="px-2 py-1 rounded-md border border-zinc-700 bg-zinc-900/70 text-[11px] text-zinc-300 font-mono">
                                    {rule}
                                  </span>
                                ))}
                              </div>
                            </section>
                          )}

                          {advanced.highlightedCode && advanced.highlightedCode.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Highlighted Code
                              </div>
                              <div className="space-y-2">
                                {advanced.highlightedCode.map((line, idx) => (
                                  <div key={`${line.line}-${idx}`} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                    <div className="text-[10px] text-zinc-500 mb-1">line {line.line}</div>
                                    <pre className="text-xs text-zinc-200 font-mono whitespace-pre-wrap break-words">{line.text}</pre>
                                    <div className="mt-1 text-[10px] text-emerald-300">
                                      {line.variable ? `variable: ${line.variable}` : ""}
                                      {line.variable && line.functionName ? " • " : ""}
                                      {line.functionName ? `function: ${line.functionName}` : ""}
                                      {(line.variable || line.functionName) && line.property ? " • " : ""}
                                      {line.property ? `property: ${line.property}` : ""}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {advanced.errorSymbols.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Error Symbols
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {advanced.errorSymbols.map((symbol) => (
                                  <button
                                    key={symbol}
                                    type="button"
                                    onClick={() => copySymbol(symbol)}
                                    className="px-2.5 py-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 text-cyan-200 text-xs hover:bg-cyan-500/15 transition-colors"
                                    title={`Copy symbol '${symbol}'`}
                                  >
                                    {symbol}
                                  </button>
                                ))}
                              </div>
                            </section>
                          )}

                          {sortedFindings.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Static Findings
                              </div>
                              <div className="space-y-2">
                                {sortedFindings.map((finding, idx) => (
                                  <div
                                    key={`${finding.id}-${idx}`}
                                    className="result-card rounded-lg border border-zinc-800 bg-zinc-900/40"
                                  >
                                    <div className="flex items-start justify-between gap-3 text-sm text-zinc-200">
                                      <div className="flex items-start gap-2 min-w-0 text-container">
                                      <span className="shrink-0 mt-0.5" aria-hidden="true">
                                        {severityIcon(finding.severity)}
                                      </span>
                                      <div className="space-y-1">
                                        <p>{finding.message}</p>
                                        <div className="text-[11px] text-zinc-500">
                                          {finding.symbol ? `symbol: ${finding.symbol}` : ""}
                                          {finding.symbol && finding.line ? " • " : ""}
                                          {finding.line ? `line: ${finding.line}` : ""}
                                        </div>
                                      </div>
                                      </div>
                                      <span className={`badge ${findingSeverityBadgeClass(finding.severity)}`}>{finding.severity}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {advanced.prioritizedFixes.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Priority Fixes
                              </div>
                              <div className="grid gap-2">
                                {advanced.prioritizedFixes.map((fix, idx) => (
                                  <div
                                    key={`${fix}-${idx}`}
                                    className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3"
                                  >
                                    <div className="flex items-start gap-3">
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 font-mono mt-0.5">
                                        {String(idx + 1).padStart(2, "0")}
                                      </span>
                                      <p className="text-sm text-zinc-200 leading-relaxed">{fix}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {advanced.fixTemplates.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Fixes
                              </div>
                              <div className="space-y-3">
                                {advanced.fixTemplates.map((template) => {
                                  const isOpen = openTemplateId === template.id;
                                  return (
                                  <div
                                    key={template.id}
                                    className={`fix-accordion ${isOpen ? "open" : ""}`}
                                  >
                                    <button
                                      type="button"
                                      className="fix-accordion-header w-full text-left"
                                      onClick={() => setOpenTemplateId((current) => (current === template.id ? null : template.id))}
                                      aria-expanded={isOpen}
                                      aria-label={`Toggle fix template ${template.title}`}
                                    >
                                      <span className={`badge ${priorityBadgeClass(template.priority)}`}>P{template.priority}</span>
                                      <span className="text-sm font-semibold text-zinc-100 truncate">{template.title}</span>
                                      <span className="ml-auto text-[10px] text-zinc-400">{isOpen ? "▼" : "▶"}</span>
                                    </button>
                                    <div className="fix-accordion-content text-container">
                                      <p className="mt-2 text-xs text-zinc-300 leading-relaxed italic">
                                        {template.whyItWorks}
                                      </p>
                                      <div className="code-block-wrapper">
                                      <button
                                        type="button"
                                        onClick={() => copyTemplate(template.id, template.template)}
                                        className={`copy-button ${copiedTemplateId === template.id ? "copied" : ""}`}
                                        aria-label="Copy code to clipboard"
                                      >
                                        {copiedTemplateId === template.id ? "Copied ✓" : "Copy template"}
                                      </button>
                                      <pre className="code-block">
                                        <code>{template.template}</code>
                                      </pre>
                                      </div>
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            </section>
                          )}

                          {advanced.docs && advanced.docs.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Roblox Docs
                              </div>
                              <div className="grid gap-2">
                                {advanced.docs.map((doc) => (
                                  <a
                                    key={doc}
                                    href={doc}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-cyan-300 hover:text-cyan-200 underline underline-offset-2 break-all"
                                  >
                                    {doc}
                                  </a>
                                ))}
                              </div>
                            </section>
                          )}

                          {advanced.relatedDiagnostics && advanced.relatedDiagnostics.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Similar Errors
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {advanced.relatedDiagnostics.map((item) => (
                                  <span key={item} className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900/70 text-xs text-zinc-300">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </section>
                          )}

                          {advanced.relatedApis && advanced.relatedApis.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Related APIs
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {advanced.relatedApis.map((item) => (
                                  <span key={item} className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900/70 text-xs text-zinc-300">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </section>
                          )}

                          {advanced.performanceNotes && advanced.performanceNotes.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Performance Notes
                              </div>
                              <div className="space-y-2">
                                {advanced.performanceNotes.map((note) => (
                                  <div key={note.title} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                                    <div className="text-xs text-amber-300 font-semibold">{note.title}</div>
                                    <p className="text-xs text-zinc-300 mt-1">{note.description}</p>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {advanced.securityNotes && advanced.securityNotes.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Security Notes
                              </div>
                              <div className="space-y-2">
                                {advanced.securityNotes.map((note) => (
                                  <div key={note.title} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                                    <div className="text-xs text-red-300 font-semibold">{note.title}</div>
                                    <p className="text-xs text-zinc-300 mt-1">{note.description}</p>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {advanced.bestPractices && advanced.bestPractices.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Best Practices
                              </div>
                              <div className="space-y-2">
                                {advanced.bestPractices.map((note) => (
                                  <div key={note.title} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                                    <div className="text-xs text-emerald-300 font-semibold">{note.title}</div>
                                    <p className="text-xs text-zinc-300 mt-1">{note.description}</p>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {(advanced.estimatedFixTime || advanced.difficulty) && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Fix Effort
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                {advanced.estimatedFixTime && (
                                  <span className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900/70 text-zinc-300">
                                    Estimated fix time: {advanced.estimatedFixTime}
                                  </span>
                                )}
                                {advanced.difficulty && (
                                  <span className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900/70 text-zinc-300">
                                    Difficulty: {advanced.difficulty}
                                  </span>
                                )}
                              </div>
                            </section>
                          )}

                          {advanced.commonMistakes && advanced.commonMistakes.length > 0 && (
                            <section className="space-y-2">
                              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                Common Mistakes
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {advanced.commonMistakes.map((item) => (
                                  <span key={item} className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900/70 text-xs text-zinc-300">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </section>
                          )}
                        </div>
                      </details>
                    )}

                        {analysis.codeInsights && analysis.codeInsights.length > 0 && (
                  <section className="space-y-2">
    <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
  <span className="ep-step">5</span>
  Code Insights
</h3>

    <div className="space-y-3">
      {analysis.codeInsights.map((insight, index) => (
        <div
          key={index}
          className="result-card rounded-lg border border-emerald-500/20 bg-emerald-500/5"
        >
          <div className="text-sm font-semibold text-emerald-300">
            {insight.title}
          </div>

          <div className="mt-1 text-xs text-zinc-300 leading-relaxed">
            {insight.description}
          </div>
        </div>
      ))}
    </div>
  </section>
)}

{analysis.deprecatedApis && analysis.deprecatedApis.length > 0 && (
  <section className="space-y-2">
    <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
      <span className="ep-step">6</span>
      Deprecated APIs
    </h3>

    <div className="space-y-3">
      {analysis.deprecatedApis.map((api, index) => (
        <div
          key={index}
          className="result-card rounded-lg border border-yellow-500/20 bg-yellow-500/5"
        >
          <div className="text-sm font-semibold text-yellow-300">
            {api.api} → {api.replacement}
          </div>

          <div className="mt-1 text-xs text-zinc-300">
            {api.reason}
          </div>
        </div>
      ))}
    </div>
  </section>
)}

                    {analysis.example && (
                      <section className="space-y-2 border-t border-emerald-500/10 pt-5">
                        <div className="flex items-center justify-between">
                          <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                            <span className="ep-step">4</span> Corrected
                            Implementation
                          </h3>
                        </div>
                        <div className="code-block-wrapper">
                          <button
                            type="button"
                            onClick={() => copyExample(analysis.example ?? "")}
                            className={`copy-button ${copyLabel === "Copied ✓" ? "copied" : ""}`}
                            aria-label="Copy code to clipboard"
                          >
                            {copyLabel}
                          </button>
                          <pre className="code-block">
                            <code>{analysis.example ?? ""}</code>
                          </pre>
                        </div>
                      </section>
                    )}
                  </div>
                  </div>
                </div>
              )}

              {result?.kind === "generic" && (
                <div ref={genericRef} tabIndex={-1} className="ep-card result-card space-y-4">
                  <div className="border-b border-zinc-800/60 pb-3">
                    <h3 className="text-lg font-bold text-zinc-100 serif-title">
                      No exact match found
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      The analyzer couldn't match this specific error trace
                      against its rule set yet.
                    </p>
                  </div>
                  <ul className="text-xs text-zinc-300 space-y-2 leading-relaxed">
                    <li className="flex gap-2">
                      <span className="text-emerald-400">→</span>
                      Make sure you pasted the full error line, including the
                      message after the colon.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400">→</span>
                      Paste the code snippet that contains the exact line
                      referenced in the error.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400">→</span>
                      Try switching the platform filter, or leave it on
                      Auto-detect.
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => insertExample(true)}
                    className="text-[11px] px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-emerald-300 hover:border-emerald-500/30 transition-all"
                  >
                    Try an example instead
                  </button>
                </div>
              )}
            </div>
          </section>
        </main>

        <footer className="relative z-10 w-full max-w-5xl mt-14 text-center text-[11px] text-zinc-600 flex items-center justify-center gap-2">
          <span className="ep-dot" />
          Made by YusufVyce
        </footer>
      </div>
    </>
  );
}

function CauseRow({ percent, text }: { percent: number; text: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(percent));
    return () => cancelAnimationFrame(raf);
  }, [percent]);
  return (
    <div className="result-card bg-zinc-900/50 border border-zinc-800 rounded flex flex-col gap-2">
      <div className="flex justify-between items-start gap-4">
        <span className="text-xs text-zinc-300">{text}</span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono shrink-0">
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Likelihood: ${percent}%`}
        className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden mt-1"
      >
        <div
          className="bg-emerald-500 h-full transition-[width] duration-500 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}