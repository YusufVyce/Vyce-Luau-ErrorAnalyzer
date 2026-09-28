import type { ReactNode } from "react";
import { Sparkles, Terminal } from "lucide-react";
import { CodeBlock, highlightLuau } from "@/components/CodeBlock";
import { Rich } from "@/components/learn/LessonNotes";
import { Visual } from "@/components/learn/Visuals";
import { pick, type Exercise, type Lang, type LearnStep, type Opt } from "@/lib/learn/path/types";
import type { AnswerState } from "@/lib/learn/path/session";
import type { TFunction } from "@/lib/prefs";
import { Bubble, Mascot } from "./Mascot";

export type Phase = "answer" | "right" | "wrong";

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-[12px] font-bold tracking-[0.14em] text-ink-3 uppercase">{children}</div>
  );
}

function CodePanel({ children, label = "Script" }: { children: ReactNode; label?: string }) {
  return (
    <div className="code-dark overflow-hidden rounded-2xl border border-code-line bg-code">
      <div className="flex items-center gap-2 border-b border-code-line bg-code-head px-4 py-2 font-mono text-[12px] text-zinc-400">
        <span className="h-2 w-2 rounded-full bg-sky-400" aria-hidden="true" />
        {label}
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[14px] leading-[1.8] text-zinc-200 [tab-size:2]">
        <code>{children}</code>
      </pre>
    </div>
  );
}

const isCode = (o: Opt) => typeof o === "string";

export function LearnCard({ step, lang, t }: { step: LearnStep; lang: Lang; t: TFunction }) {
  return (
    <div className="space-y-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--syn-purple)_16%,transparent)] px-3 py-1 text-[12px] font-bold tracking-[0.12em] text-[var(--syn-purple)] uppercase">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {t("duo.newConcept")}
      </span>
      <h2 className="text-[28px] leading-tight font-bold tracking-tight text-ink md:text-[34px]">
        {pick(step.title, lang)}
      </h2>
      <p className="text-[17px] leading-relaxed text-ink-2 md:text-[18px]">
        <Rich text={pick(step.body, lang)} />
      </p>
      {step.visual && <Visual id={step.visual} />}
      {step.code && <CodeBlock code={step.code} copyable={false} />}
      {step.hook && (
        <div className="flex items-center gap-4 pt-1">
          <Mascot mood="happy" size={76} />
          <Bubble className="font-medium">{pick(step.hook, lang)}</Bubble>
        </div>
      )}
    </div>
  );
}

function optionState(i: number, answer: number, picked: number | null, phase: Phase) {
  if (phase === "answer") return picked === i ? "selected" : "idle";
  if (i === answer) return "right";
  if (phase === "wrong" && i === picked) return "wrong";
  return "dim";
}

function OptionButton({
  n,
  state,
  onClick,
  disabled,
  children,
  mono,
}: {
  n: number;
  state: string;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
  mono: boolean;
}) {
  return (
    <button
      type="button"
      data-state={state}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === "selected"}
      className="vy-opt flex w-full items-center gap-3 px-4 py-3.5 text-left"
    >
      <span className="vy-key shrink-0">{n}</span>
      <span
        className={
          mono ? "font-mono text-[14px] break-words whitespace-pre-wrap" : "text-[15px] font-medium"
        }
      >
        {children}
      </span>
    </button>
  );
}

export function ExerciseView({
  step,
  perm,
  answer,
  onAnswer,
  phase,
  quiz,
  lang,
  t,
}: {
  step: Exercise;
  perm: number[];
  answer: AnswerState;
  onAnswer: (a: AnswerState) => void;
  phase: Phase;
  quiz?: boolean;
  lang: Lang;
  t: TFunction;
}) {
  const locked = phase !== "answer";
  const shake = phase === "wrong" ? "vy-shake" : "";

  if (step.kind === "choice") {
    return (
      <div className="space-y-6">
        <Label>{quiz ? t("duo.quizTitle") : t("duo.selectAnswer")}</Label>
        <h2 className="text-[24px] leading-snug font-bold tracking-tight text-ink md:text-[28px]">
          {pick(step.prompt, lang)}
        </h2>
        {step.code && <CodeBlock code={step.code} copyable={false} />}
        <div className="grid gap-3">
          {perm.map((i, k) => (
            <OptionButton
              key={i}
              n={k + 1}
              state={optionState(i, step.answer, answer.pick, phase)}
              disabled={locked}
              mono={isCode(step.options[i])}
              onClick={() => onAnswer({ ...answer, pick: i })}
            >
              {pick(step.options[i], lang)}
            </OptionButton>
          ))}
        </div>
      </div>
    );
  }

  if (step.kind === "predict") {
    return (
      <div className="space-y-6">
        <Label>{t("duo.predictTitle")}</Label>
        <div className="flex items-start gap-3">
          <Mascot mood="think" size={64} className="hidden sm:block" />
          <div className="min-w-0 flex-1">
            <CodePanel>{highlightLuau(step.code)}</CodePanel>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {perm.map((i, k) => {
            const o = step.options[i];
            return (
              <OptionButton
                key={i}
                n={k + 1}
                state={optionState(i, step.answer, answer.pick, phase)}
                disabled={locked}
                mono={isCode(o)}
                onClick={() => onAnswer({ ...answer, pick: i })}
              >
                {isCode(o) ? (
                  <span className="inline-flex items-start gap-2">
                    <Terminal className="mt-1 h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
                    <span>{o}</span>
                  </span>
                ) : (
                  <span className="italic">{pick(o, lang)}</span>
                )}
              </OptionButton>
            );
          })}
        </div>
      </div>
    );
  }

  if (step.kind === "fill") {
    const [before, after] = step.code.split("___");
    const picked = answer.pick;
    const slotState =
      phase === "answer" ? "selected" : phase === "right" ? "right" : ("wrong" as const);
    return (
      <div className="space-y-6">
        <Label>{t("duo.fillBlank")}</Label>
        <h2 className="text-[24px] leading-snug font-bold tracking-tight text-ink md:text-[28px]">
          {pick(step.prompt, lang)}
        </h2>
        <CodePanel>
          {highlightLuau(before)}
          {picked === null ? (
            <span className="mx-0.5 inline-block h-[1.5em] w-20 translate-y-[0.3em] rounded-md border-2 border-dashed border-zinc-500" />
          ) : (
            <button
              type="button"
              disabled={locked}
              onClick={() => onAnswer({ ...answer, pick: null })}
              data-state={slotState}
              className={`vy-opt vy-pop mx-0.5 inline-block rounded-lg px-2 py-0 font-mono text-[14px] ${shake}`}
            >
              {step.options[picked]}
            </button>
          )}
          {highlightLuau(after)}
        </CodePanel>
        <div className="flex flex-wrap justify-center gap-3">
          {perm.map((i, k) => {
            const used = picked === i;
            return (
              <button
                key={i}
                type="button"
                disabled={locked || used}
                onClick={() => onAnswer({ ...answer, pick: i })}
                className={`vy-opt px-4 py-2.5 font-mono text-[15px] ${used ? "!border-dashed !bg-transparent !text-transparent !shadow-none" : ""}`}
                aria-label={`${k + 1}: ${step.options[i]}`}
              >
                {step.options[i]}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // order
  const used = new Set(answer.seq);
  return (
    <div className="space-y-6">
      <Label>{t("duo.orderLines")}</Label>
      <h2 className="text-[24px] leading-snug font-bold tracking-tight text-ink md:text-[28px]">
        {pick(step.prompt, lang)}
      </h2>
      <div
        className={`code-dark min-h-[9rem] rounded-2xl border-2 bg-code p-3 ${
          phase === "right"
            ? "border-[var(--ok)]"
            : phase === "wrong"
              ? `border-[var(--bad)] ${shake}`
              : "border-code-line"
        }`}
      >
        {answer.seq.length === 0 ? (
          <p className="px-2 py-9 text-center text-sm text-zinc-500">{t("duo.orderEmpty")}</p>
        ) : (
          <ol className="space-y-1">
            {answer.seq.map((line, k) => (
              <li key={line} className="vy-pop flex items-stretch gap-2">
                <span className="w-6 shrink-0 pt-1.5 text-right font-mono text-[12px] text-zinc-600 select-none">
                  {k + 1}
                </span>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onAnswer({ ...answer, seq: answer.seq.filter((x) => x !== line) })}
                  className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left font-mono text-[14px] whitespace-pre text-zinc-200 [tab-size:3] hover:bg-white/5"
                >
                  {highlightLuau(step.lines[line])}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="grid gap-2.5">
        {perm.map((line, k) => (
          <button
            key={line}
            type="button"
            disabled={locked || used.has(line)}
            onClick={() => onAnswer({ ...answer, seq: [...answer.seq, line] })}
            aria-label={`${k + 1}: ${step.lines[line].trim()}`}
            className={`vy-opt flex items-center gap-3 px-4 py-2.5 text-left font-mono text-[14px] ${
              used.has(line) ? "!border-dashed !bg-transparent !shadow-none [&>*]:invisible" : ""
            }`}
          >
            <span className="vy-key shrink-0">{k + 1}</span>
            <span className="min-w-0 break-words">{step.lines[line].trim()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
