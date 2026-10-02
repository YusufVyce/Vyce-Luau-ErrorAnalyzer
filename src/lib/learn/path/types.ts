/**
 * Bite-sized, Duolingo-style lesson steps. Every lesson is a short run of
 * cards ("learn") and quick exercises; the long-form lesson text stays
 * available as notes. All text is bilingual; code is the same in both.
 */
import type { VisualId } from "@/components/learn/Visuals";

export type Lang = "en" | "tr";
export type L = { en: string; tr: string };
/** An answer option: plain string (code, same in both languages) or text. */
export type Opt = string | L;

export interface LearnStep {
  kind: "learn";
  title: L;
  /** One to three short sentences. `backticks` render as inline code. */
  body: L;
  code?: string;
  visual?: VisualId;
  /** A memory hook, said by the mascot. */
  hook?: L;
  /** "simple": the plain-words intro card; "walk": the line-by-line card. */
  badge?: "simple" | "walk";
  /** Very short sentences, shown one per row. */
  bullets?: L[];
  /** A code sample explained one line at a time. */
  walk?: Array<{ line: string; note: L }>;
}

export interface ChoiceStep {
  kind: "choice";
  prompt: L;
  code?: string;
  options: Opt[];
  answer: number;
  explain: L;
}

/** Code with a single ___ blank and a word bank. */
export interface FillStep {
  kind: "fill";
  prompt: L;
  code: string;
  options: string[];
  answer: number;
  explain: L;
}

/** Tap the lines into the right order. `lines` is the correct order. */
export interface OrderStep {
  kind: "order";
  prompt: L;
  lines: string[];
  explain: L;
}

/**
 * What does Output show? Output options are the printed lines joined with
 * "\n"; a translated option (e.g. "Nothing") is shown as words, not output.
 */
export interface PredictStep {
  kind: "predict";
  code: string;
  options: Opt[];
  answer: number;
  explain: L;
}

export type Exercise = ChoiceStep | FillStep | OrderStep | PredictStep;
export type Step = LearnStep | Exercise;

export interface PathLesson {
  emoji: string;
  /** "Remember this": the one-line summary shown at the end. */
  takeaway: L;
  steps: Step[];
}

export const t = (en: string, tr: string): L => ({ en, tr });

export const learn = (
  title: L,
  body: L,
  more: Omit<Partial<LearnStep>, "kind" | "title" | "body"> = {},
): LearnStep => ({ kind: "learn", title, body, ...more });

export const choice = (
  prompt: L,
  options: Opt[],
  answer: number,
  explain: L,
  code?: string,
): ChoiceStep => ({ kind: "choice", prompt, options, answer, explain, code });

export const fill = (
  prompt: L,
  code: string,
  options: string[],
  answer: number,
  explain: L,
): FillStep => ({ kind: "fill", prompt, code, options, answer, explain });

export const order = (prompt: L, lines: string[], explain: L): OrderStep => ({
  kind: "order",
  prompt,
  lines,
  explain,
});

export const predict = (code: string, options: Opt[], answer: number, explain: L): PredictStep => ({
  kind: "predict",
  code,
  options,
  answer,
  explain,
});

/** Strips the first newline so samples can start on their own line. */
export const lua = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values)
    .replace(/^\n/, "")
    .replace(/\s+$/, "");

export const pick = (text: L | string, lang: Lang): string =>
  typeof text === "string" ? text : text[lang];
