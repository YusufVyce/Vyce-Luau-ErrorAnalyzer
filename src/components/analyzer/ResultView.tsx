import { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Lightbulb,
  MapPin,
  Wrench,
} from "lucide-react";
import type { AdvancedAnalyzerOutput } from "@/lib/analyzer/advancedRobloxAnalyzer";
import type { CodeWarning, DiagnosisCause, PreciseDiagnosis } from "@/lib/analyzer/precise/types";
import { CodeBlock, highlightLuau } from "@/components/CodeBlock";

const SEVERITY_STYLE: Record<PreciseDiagnosis["severity"], string> = {
  Critical: "border-red-500/40 bg-red-500/10 text-red-300",
  High: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  Medium: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  Low: "border-sky-500/40 bg-sky-500/10 text-sky-300",
};

function confidenceTone(value: number) {
  if (value >= 80)
    return { bar: "from-emerald-400 to-teal-400", text: "text-emerald-300", label: "High" };
  if (value >= 55)
    return { bar: "from-amber-400 to-orange-400", text: "text-amber-300", label: "Medium" };
  return { bar: "from-zinc-500 to-zinc-400", text: "text-zinc-300", label: "Low" };
}

/** Renders `code` spans in plain text (the analyzer writes names in backticks). */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
          <code
            key={i}
            className="rounded bg-zinc-800/80 px-1 py-0.5 font-mono text-[0.85em] text-emerald-200"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function LikelihoodTag({ cause }: { cause: DiagnosisCause }) {
  const style =
    cause.likelihood === "likely"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : cause.likelihood === "possible"
        ? "bg-amber-500/10 text-amber-200 border-amber-500/25"
        : "bg-zinc-800 text-zinc-400 border-zinc-700";
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style}`}
    >
      {cause.likelihood === "likely"
        ? "Most likely"
        : cause.likelihood === "possible"
          ? "Possible"
          : "Unlikely"}
    </span>
  );
}

function CodeLine({
  line,
  code,
  culprit,
  exact,
}: {
  line: number;
  code: string;
  culprit?: string;
  exact: boolean;
}) {
  const idx = culprit ? code.indexOf(culprit) : -1;
  return (
    <div className="rounded-lg border border-red-500/25 bg-red-500/[0.04] overflow-hidden">
      <div className="flex items-center justify-between border-b border-red-500/15 px-3 py-1.5 text-[11px]">
        <span className="font-semibold text-red-300">Line {line}</span>
        <span className="text-zinc-500">
          {exact ? "matches the line number in the error" : "found by searching your code"}
        </span>
      </div>
      <pre className="overflow-x-auto px-3 py-2 font-mono text-[13px] text-zinc-100">
        <span className="mr-3 select-none text-zinc-600">{line}</span>
        {idx >= 0 && culprit ? (
          <>
            {highlightLuau(code.slice(0, idx))}
            <mark className="rounded bg-red-500/25 px-0.5 text-red-100 underline decoration-red-400 decoration-wavy underline-offset-4">
              {code.slice(idx, idx + culprit.length)}
            </mark>
            {highlightLuau(code.slice(idx + culprit.length))}
          </>
        ) : (
          highlightLuau(code)
        )}
      </pre>
    </div>
  );
}

function WarningList({ warnings }: { warnings: CodeWarning[] }) {
  if (warnings.length === 0) return null;
  const icon = { error: "🔴", warning: "🟠", info: "🔵" } as const;
  return (
    <ul className="space-y-2">
      {warnings.map((w, i) => (
        <li key={`${w.id}-${i}`} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="flex items-start gap-2 text-sm">
            <span aria-hidden="true">{icon[w.severity]}</span>
            <div className="min-w-0 space-y-1">
              <div className="font-medium text-zinc-100">
                <Rich text={w.title} />
                {w.line ? (
                  <span className="ml-2 text-xs font-normal text-zinc-500">line {w.line}</span>
                ) : null}
              </div>
              <p className="text-xs leading-relaxed text-zinc-400">
                <Rich text={w.message} />
              </p>
              {w.fix && (
                <pre className="mt-1 overflow-x-auto rounded bg-black/40 px-2 py-1.5 font-mono text-[12px] text-emerald-200">
                  {highlightLuau(w.fix)}
                </pre>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <span className="text-emerald-400">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ResultView({
  diagnosis,
  advanced,
}: {
  diagnosis: PreciseDiagnosis;
  advanced?: AdvancedAnalyzerOutput;
}) {
  const [showReasons, setShowReasons] = useState(false);
  const [showTech, setShowTech] = useState(false);
  const tone = confidenceTone(diagnosis.confidence);
  const [top, ...others] = diagnosis.causes;
  const warnings = diagnosis.warnings.filter(
    (w) =>
      !(
        diagnosis.location &&
        w.line === diagnosis.location.line &&
        diagnosis.causes.some((c) => c.text.startsWith(w.title))
      ),
  );

  return (
    <div className="ep-card ep-card-accent result-card space-y-7">
      {/* Header */}
      <header className="space-y-3 border-b border-emerald-500/10 pb-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className={`rounded-full border px-2.5 py-0.5 font-semibold ${SEVERITY_STYLE[diagnosis.severity]}`}
          >
            {diagnosis.severity}
          </span>
          {diagnosis.side !== "unknown" && (
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-zinc-300">
              {diagnosis.side === "server" ? "Server script" : "LocalScript (client)"}
            </span>
          )}
          {diagnosis.scriptPath && (
            <span
              className="truncate rounded-full border border-zinc-800 px-2.5 py-0.5 font-mono text-zinc-500"
              title={diagnosis.scriptPath}
            >
              {diagnosis.scriptPath}
            </span>
          )}
          {!diagnosis.recognized && (
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-zinc-400">
              No exact match
            </span>
          )}
        </div>
        <h2 className="text-2xl font-bold leading-tight text-zinc-50 md:text-3xl">
          <Rich text={diagnosis.title} />
        </h2>
        <p className="text-base leading-relaxed text-zinc-200">
          <Rich text={diagnosis.summary} />
        </p>

        {diagnosis.recognized && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-medium text-zinc-400">Confidence</span>
              <span className={`font-semibold ${tone.text}`}>
                {diagnosis.confidence}% · {tone.label}
              </span>
              <div
                className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-zinc-900"
                role="progressbar"
                aria-valuenow={diagnosis.confidence}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Confidence"
              >
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
                  style={{ width: `${diagnosis.confidence}%` }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowReasons((v) => !v)}
                className="text-emerald-300 hover:underline"
                aria-expanded={showReasons}
              >
                {showReasons ? "Hide why" : "Why?"}
              </button>
            </div>
            {showReasons && (
              <ul className="mt-2 space-y-1 border-t border-zinc-800 pt-2 font-mono text-[11px] text-zinc-400">
                {diagnosis.confidenceReasons.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
                <li className="pt-1 font-sans text-zinc-500">
                  The score only goes up for things the analyzer actually verified in your error and
                  code.
                </li>
              </ul>
            )}
          </div>
        )}
      </header>

      <Section icon={<Lightbulb className="h-4 w-4" />} title="What happened">
        <p className="text-sm leading-relaxed text-zinc-300">
          <Rich text={diagnosis.explanation} />
        </p>
      </Section>

      {diagnosis.location && (
        <Section icon={<MapPin className="h-4 w-4" />} title="Where">
          <CodeLine {...diagnosis.location} />
        </Section>
      )}

      {top && (
        <Section
          icon={<AlertTriangle className="h-4 w-4" />}
          title={diagnosis.recognized ? "Why it happened" : "Things to check"}
        >
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-50">
                <Rich text={top.text} />
              </p>
              <div className="flex items-center gap-1.5">
                {top.confirmedInCode && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Seen in your code
                  </span>
                )}
                <LikelihoodTag cause={top} />
              </div>
            </div>
            {top.detail && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                <Rich text={top.detail} />
              </p>
            )}
          </div>
          {others.length > 0 && (
            <ul className="space-y-2">
              {others.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2"
                >
                  <div className="min-w-0 text-sm text-zinc-300">
                    <Rich text={c.text} />
                    {c.detail && (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        <Rich text={c.detail} />
                      </p>
                    )}
                  </div>
                  <LikelihoodTag cause={c} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section icon={<Wrench className="h-4 w-4" />} title="How to fix it">
        <ol className="space-y-2 text-sm leading-relaxed text-zinc-300">
          {diagnosis.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 whitespace-nowrap pt-0.5 font-mono text-xs text-emerald-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <Rich text={step} />
              </span>
            </li>
          ))}
        </ol>
        {diagnosis.fixCode && (
          <div className={`grid gap-3 ${diagnosis.fixCode.before ? "md:grid-cols-2" : ""}`}>
            {diagnosis.fixCode.before && (
              <CodeBlock
                code={diagnosis.fixCode.before}
                title="Before"
                tone="bad"
                copyable={false}
              />
            )}
            <CodeBlock
              code={diagnosis.fixCode.after}
              title={diagnosis.fixCode.before ? "After" : "Fixed code"}
              tone="good"
            />
          </div>
        )}
        {diagnosis.fixCode?.caption && (
          <p className="text-xs text-zinc-500">{diagnosis.fixCode.caption}</p>
        )}
      </Section>

      {warnings.length > 0 && (
        <Section
          icon={<AlertTriangle className="h-4 w-4" />}
          title={
            diagnosis.category === "code-check" ? "Problems found" : "Other problems in your code"
          }
        >
          <WarningList warnings={warnings} />
        </Section>
      )}

      {diagnosis.docs.length > 0 && (
        <Section icon={<BookOpen className="h-4 w-4" />} title="Official Roblox docs">
          <div className="flex flex-wrap gap-2">
            {diagnosis.docs.map((d) => (
              <a
                key={d.url}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-200"
              >
                {d.label}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600">
            Links go only to create.roblox.com — never to guessed forum posts.
          </p>
        </Section>
      )}

      {advanced && (advanced.hypotheses?.length || advanced.runtimeStates?.length) ? (
        <div className="border-t border-zinc-800/80 pt-4">
          <button
            type="button"
            onClick={() => setShowTech((v) => !v)}
            aria-expanded={showTech}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            Technical details (AST analysis)
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showTech ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {showTech && (
            <div className="mt-4 space-y-4 text-xs text-zinc-400">
              {advanced.runtimeStates && advanced.runtimeStates.length > 0 && (
                <div>
                  <div className="mb-1.5 font-semibold text-zinc-300">Inferred object states</div>
                  <ul className="space-y-1 font-mono">
                    {advanced.runtimeStates.slice(0, 8).map((s, i) => (
                      <li key={i}>
                        {s.name} ({s.role}) → {s.state}
                        {s.line ? ` · line ${s.line}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {advanced.flowTraces && advanced.flowTraces.length > 0 && (
                <div>
                  <div className="mb-1.5 font-semibold text-zinc-300">Value flow</div>
                  <ul className="space-y-1 font-mono">
                    {advanced.flowTraces.slice(0, 8).map((t, i) => (
                      <li key={i}>
                        {t.target} ← {t.source}
                        {t.line ? ` · line ${t.line}` : ""} — {t.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {advanced.hypotheses && advanced.hypotheses.length > 0 && (
                <div>
                  <div className="mb-1.5 font-semibold text-zinc-300">
                    Generic pipeline hypotheses
                  </div>
                  <ul className="space-y-1">
                    {advanced.hypotheses.slice(0, 4).map((h, i) => (
                      <li key={i}>
                        {h.title}{" "}
                        <span className="text-zinc-600">({h.confidence}% pipeline score)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
