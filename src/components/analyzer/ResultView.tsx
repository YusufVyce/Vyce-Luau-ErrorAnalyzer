import { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  ListOrdered,
  MapPin,
  Smile,
  Wrench,
} from "lucide-react";
import type { AdvancedAnalyzerOutput } from "@/lib/analyzer/advancedRobloxAnalyzer";
import type { CodeWarning, DiagnosisCause, PreciseDiagnosis } from "@/lib/analyzer/precise/types";
import { CodeBlock, copyText, highlightLuau } from "@/components/CodeBlock";
import { useLang, useT, type TFunction } from "@/lib/prefs";

const SEVERITY_STYLE: Record<PreciseDiagnosis["severity"], string> = {
  Critical: "border-red-500/40 bg-red-500/10 text-red-300",
  High: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  Medium: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  Low: "border-sky-500/40 bg-sky-500/10 text-sky-300",
};

/** Turkish names for the AST pipeline's inferred object states (role names stay Roblox terms). */
const STATE_TR: Record<string, string> = {
  Uninitialized: "Değer verilmemiş",
  Loaded: "Yüklendi",
  Missing: "Eksik olabilir",
  Destroyed: "Silindi",
  Unknown: "Bilinmiyor",
};

function confidenceTone(value: number) {
  if (value >= 80)
    return { bar: "bg-emerald-400", text: "text-emerald-300", label: "res.high" } as const;
  if (value >= 55)
    return { bar: "bg-amber-400", text: "text-amber-300", label: "res.medium" } as const;
  return { bar: "bg-zinc-500", text: "text-zinc-300", label: "res.low" } as const;
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
            className="rounded-md border border-line bg-surface-2 px-1 py-px font-mono text-[0.85em] text-brand-ink"
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

function LikelihoodTag({ cause, t }: { cause: DiagnosisCause; t: TFunction }) {
  const style =
    cause.likelihood === "likely"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : cause.likelihood === "possible"
        ? "bg-amber-500/10 text-amber-200 border-amber-500/25"
        : "bg-zinc-800 text-zinc-400 border-zinc-700";
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style}`}>
      {t(
        cause.likelihood === "likely"
          ? "res.likely"
          : cause.likelihood === "possible"
            ? "res.possible"
            : "res.unlikely",
      )}
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
  const t = useT();
  const idx = culprit ? code.indexOf(culprit) : -1;
  return (
    <div className="rounded-lg border border-red-500/25 bg-red-500/[0.04] overflow-hidden">
      <div className="flex items-center justify-between border-b border-red-500/15 px-3 py-1.5 text-[11px]">
        <span className="font-semibold text-red-300">{t("res.line", { n: line })}</span>
        <span className="text-zinc-500">{t(exact ? "res.lineExact" : "res.lineSearched")}</span>
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
  const t = useT();
  if (warnings.length === 0) return null;
  const icon = { error: "🔴", warning: "🟠", info: "🔵" } as const;
  return (
    <ul className="space-y-2">
      {warnings.map((w, i) => (
        <li key={`${w.id}-${i}`} className="rounded-xl border border-line p-3">
          <div className="flex items-start gap-2 text-sm">
            <span aria-hidden="true">{icon[w.severity]}</span>
            <div className="min-w-0 space-y-1">
              <div className="font-medium text-zinc-100">
                <Rich text={w.title} />
                {w.line ? (
                  <span className="ml-2 text-xs font-normal text-zinc-500">
                    {t("res.line", { n: w.line })}
                  </span>
                ) : null}
              </div>
              <p className="text-xs leading-relaxed text-zinc-400">
                <Rich text={w.message} />
              </p>
              {w.fix && (
                <pre className="code-dark mt-1 overflow-x-auto rounded bg-code px-2 py-1.5 font-mono text-[12px] text-emerald-200">
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
      <h3 className="flex items-center gap-2 text-[16px] font-semibold text-zinc-100">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Breakdown({ steps }: { steps: NonNullable<PreciseDiagnosis["breakdown"]> }) {
  const tone = {
    ok: "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200",
    nil: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    error: "border-red-500/40 bg-red-500/10 text-red-200",
  } as const;
  const icon = { ok: "✓", nil: "∅", error: "✗" } as const;
  return (
    <ol className="space-y-1.5">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-right font-mono text-[11px] text-zinc-600">
            {i + 1}
          </span>
          <code
            className={`shrink-0 rounded-md border px-2 py-1 font-mono text-[12px] ${tone[s.state]}`}
          >
            <span className="mr-1.5 opacity-70">{icon[s.state]}</span>
            {s.code}
          </code>
          <span className="min-w-0 text-xs text-zinc-400">
            <Rich text={s.note} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function PatchedScript({ patched }: { patched: NonNullable<PreciseDiagnosis["patched"]> }) {
  const t = useT();
  const [label, setLabel] = useState<string | null>(null);
  const lines = patched.code.split("\n");
  const changed = new Set(patched.changed);
  return (
    <div className="code-dark overflow-hidden rounded-lg border border-code-line bg-code">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-code-head px-3 py-1.5 text-[12px]">
        <span className="font-semibold text-emerald-300">{t("res.patched")}</span>
        <button
          type="button"
          onClick={async () => {
            setLabel(t((await copyText(patched.code)) ? "code.copied" : "code.copyFailed"));
            setTimeout(() => setLabel(null), 1600);
          }}
          className="rounded px-2 py-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          {label ?? t("res.copyScript")}
        </button>
      </div>
      <pre
        className="max-h-96 overflow-auto py-2 font-mono text-[12.5px] leading-[1.65]"
        style={{ tabSize: 4 }}
      >
        {lines.map((l, i) => (
          <div key={i} className={changed.has(i + 1) ? "bg-emerald-500/10" : ""}>
            <span
              className={`inline-block w-10 select-none pr-3 text-right ${changed.has(i + 1) ? "text-emerald-400" : "text-zinc-600"}`}
            >
              {changed.has(i + 1) ? "+" : i + 1}
            </span>
            <span className="text-zinc-200">{highlightLuau(l)}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

export function ResultView({
  diagnosis,
  advanced,
}: {
  diagnosis: PreciseDiagnosis;
  advanced?: AdvancedAnalyzerOutput;
}) {
  const t = useT();
  const lang = useLang();
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
    <div className="ep-card space-y-8 p-5 md:p-8">
      {/* Header */}
      <header className="space-y-3 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className={`rounded-full border px-2.5 py-0.5 font-semibold ${SEVERITY_STYLE[diagnosis.severity]}`}
          >
            {t(`sev.${diagnosis.severity}` as "sev.High")}
          </span>
          {diagnosis.side !== "unknown" && (
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-zinc-300">
              {t(diagnosis.side === "server" ? "res.server" : "res.client")}
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
              {t("res.noMatch")}
            </span>
          )}
        </div>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-[32px]">
          <Rich text={diagnosis.title} />
        </h2>
        <p className="text-base leading-relaxed text-zinc-200">
          <Rich text={diagnosis.summary} />
        </p>

        {diagnosis.recognized && (
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-medium text-zinc-400">{t("res.confidence")}</span>
              <span className={`font-semibold ${tone.text}`}>
                {diagnosis.confidence}% · {t(tone.label)}
              </span>
              <div
                className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-zinc-800"
                role="progressbar"
                aria-valuenow={diagnosis.confidence}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("res.confidence")}
              >
                <div
                  className={`h-full rounded-full ${tone.bar}`}
                  style={{ width: `${diagnosis.confidence}%` }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowReasons((v) => !v)}
                className="font-medium text-brand hover:underline"
                aria-expanded={showReasons}
              >
                {t(showReasons ? "res.hideWhy" : "res.why")}
              </button>
            </div>
            {showReasons && (
              <ul className="mt-2 space-y-1 border-t border-zinc-800 pt-2 font-mono text-[11px] text-zinc-400">
                {diagnosis.confidenceReasons.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
                <li className="pt-1 font-sans text-zinc-500">{t("res.whyNote")}</li>
              </ul>
            )}
          </div>
        )}
      </header>

      <Section icon={<Lightbulb className="h-4 w-4" />} title={t("res.what")}>
        <p className="text-sm leading-relaxed text-zinc-300">
          <Rich text={diagnosis.explanation} />
        </p>
        {diagnosis.analogy && (
          <div className="flex gap-3 rounded-xl border border-brand-line bg-brand-soft p-3.5 text-sm text-zinc-200">
            <Smile className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <span>
              <span className="font-semibold text-zinc-100">{t("res.plain")} </span>
              {diagnosis.analogy}
            </span>
          </div>
        )}
      </Section>

      {diagnosis.location && (
        <Section icon={<MapPin className="h-4 w-4" />} title={t("res.where")}>
          <CodeLine {...diagnosis.location} />
          {diagnosis.breakdown && diagnosis.breakdown.length > 0 && (
            <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3.5">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-300">
                <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" /> {t("res.steps")}
              </div>
              <Breakdown steps={diagnosis.breakdown} />
            </div>
          )}
        </Section>
      )}

      {top && (
        <Section
          icon={<AlertTriangle className="h-4 w-4" />}
          title={t(diagnosis.recognized ? "res.why2" : "res.check")}
        >
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-50">
                <Rich text={top.text} />
              </p>
              <div className="flex items-center gap-1.5">
                {top.confirmedInCode && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> {t("res.seen")}
                  </span>
                )}
                <LikelihoodTag cause={top} t={t} />
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
                  className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2.5"
                >
                  <div className="min-w-0 text-sm text-zinc-300">
                    <Rich text={c.text} />
                    {c.detail && (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        <Rich text={c.detail} />
                      </p>
                    )}
                  </div>
                  <LikelihoodTag cause={c} t={t} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section icon={<Wrench className="h-4 w-4" />} title={t("res.fix")}>
        <ol className="space-y-2 text-sm leading-relaxed text-zinc-300">
          {diagnosis.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="ep-step shrink-0">{i + 1}</span>
              <span>
                <Rich text={step} />
              </span>
            </li>
          ))}
        </ol>
        {diagnosis.fixCode && (
          <div
            className={`grid gap-3 ${diagnosis.fixCode.before && diagnosis.fixCode.after.length + diagnosis.fixCode.before.length < 110 ? "md:grid-cols-2" : ""}`}
          >
            {diagnosis.fixCode.before && (
              <CodeBlock
                code={diagnosis.fixCode.before}
                title={t("res.before")}
                tone="bad"
                copyable={false}
              />
            )}
            <CodeBlock
              code={diagnosis.fixCode.after}
              title={t(diagnosis.fixCode.before ? "res.after" : "res.fixed")}
              tone="good"
            />
          </div>
        )}
        {diagnosis.fixCode?.caption && (
          <p className="text-xs text-zinc-500">{diagnosis.fixCode.caption}</p>
        )}
        {diagnosis.patched && <PatchedScript patched={diagnosis.patched} />}
      </Section>

      {warnings.length > 0 && (
        <Section
          icon={<AlertTriangle className="h-4 w-4" />}
          title={t(diagnosis.category === "code-check" ? "res.problems" : "res.otherProblems")}
        >
          <WarningList warnings={warnings} />
        </Section>
      )}

      {diagnosis.glossary && diagnosis.glossary.length > 0 && (
        <Section icon={<GraduationCap className="h-4 w-4" />} title={t("res.words")}>
          <dl className="grid gap-2 sm:grid-cols-2">
            {diagnosis.glossary.map((g) => (
              <div key={g.term} className="rounded-xl border border-line p-3">
                <dt className="font-mono text-xs font-semibold text-brand">{g.term}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-zinc-400">{g.meaning}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {diagnosis.docs.length > 0 && (
        <Section icon={<BookOpen className="h-4 w-4" />} title={t("res.docs")}>
          <div className="flex flex-wrap gap-2">
            {diagnosis.docs.map((d) => (
              <a
                key={d.url}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-brand-line hover:bg-brand-soft hover:text-brand"
              >
                {d.label}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600">{t("res.docsNote")}</p>
        </Section>
      )}

      {advanced &&
      ((lang !== "tr" && advanced.hypotheses?.length) || advanced.runtimeStates?.length) ? (
        <div className="border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setShowTech((v) => !v)}
            aria-expanded={showTech}
            className="flex w-full items-center justify-between text-[14px] font-medium text-zinc-500 hover:text-zinc-300"
          >
            {t("res.tech")}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showTech ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {showTech && (
            <div className="mt-4 space-y-4 text-xs text-zinc-400">
              {advanced.runtimeStates && advanced.runtimeStates.length > 0 && (
                <div>
                  <div className="mb-1.5 font-semibold text-zinc-300">{t("res.states")}</div>
                  <ul className="space-y-1 font-mono">
                    {advanced.runtimeStates.slice(0, 8).map((s, i) => (
                      <li key={i}>
                        {s.name} ({lang === "tr" && s.role === "Unknown" ? "?" : s.role}) →{" "}
                        {lang === "tr" ? (STATE_TR[s.state] ?? s.state) : s.state}
                        {s.line ? ` · ${t("res.line", { n: s.line }).toLowerCase()}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {advanced.flowTraces && advanced.flowTraces.length > 0 && (
                <div>
                  <div className="mb-1.5 font-semibold text-zinc-300">{t("res.flow")}</div>
                  <ul className="space-y-1 font-mono">
                    {advanced.flowTraces.slice(0, 8).map((f, i) => (
                      <li key={i}>
                        {f.target} ← {f.source}
                        {f.line ? ` · ${t("res.line", { n: f.line }).toLowerCase()}` : ""}
                        {/* The pipeline writes its reasons in English only. */}
                        {lang === "tr" ? "" : ` — ${f.reason}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lang !== "tr" && advanced.hypotheses && advanced.hypotheses.length > 0 && (
                <div>
                  <div className="mb-1.5 font-semibold text-zinc-300">{t("res.hyp")}</div>
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
