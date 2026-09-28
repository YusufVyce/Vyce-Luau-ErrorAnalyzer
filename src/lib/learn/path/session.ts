/** Builds the list of steps for one lesson session and grades answers. */
import { PATH, reviewExercises, rng, shuffled } from ".";
import { pick, type ChoiceStep, type Exercise, type Lang, type LearnStep } from "./types";

export type SessionItem =
  | { kind: "learn"; id: string; step: LearnStep }
  | {
      kind: "exercise";
      id: string;
      step: Exercise;
      /** Display order: option indexes (choice/fill/predict) or line indexes (order). */
      perm: number[];
      /** The lesson's graded quick check. */
      quiz?: boolean;
    }
  | { kind: "homework"; id: string };

export interface AnswerState {
  /** Picked option index (choice/fill/predict), in the step's own order. */
  pick: number | null;
  /** Picked line indexes, in the order they were tapped (order steps). */
  seq: number[];
}

export const EMPTY_ANSWER: AnswerState = { pick: null, seq: [] };

export function permFor(step: Exercise, rand: () => number): number[] {
  const n = step.kind === "order" ? step.lines.length : step.options.length;
  return shuffled(n, rand);
}

export function isReady(step: Exercise, a: AnswerState): boolean {
  return step.kind === "order" ? a.seq.length === step.lines.length : a.pick !== null;
}

export function isCorrect(step: Exercise, a: AnswerState): boolean {
  if (step.kind === "order") {
    return (
      a.seq.length === step.lines.length &&
      a.seq.every((line, i) => step.lines[line].trim() === step.lines[i].trim())
    );
  }
  return a.pick === step.answer;
}

export function lessonItems(opts: {
  lessonId: string;
  quiz?: ChoiceStep;
  homework: boolean;
  /** Steps and quiz are already done: go straight to the homework. */
  homeworkOnly?: boolean;
  seed: number;
}): SessionItem[] {
  const rand = rng(opts.seed);
  const items: SessionItem[] = [];
  if (!opts.homeworkOnly) {
    const steps = PATH[opts.lessonId]?.steps ?? [];
    steps.forEach((step, i) => {
      const id = `${opts.lessonId}:${i}`;
      if (step.kind === "learn") items.push({ kind: "learn", id, step });
      else items.push({ kind: "exercise", id, step, perm: permFor(step, rand) });
    });
    if (opts.quiz) {
      items.push({
        kind: "exercise",
        id: `${opts.lessonId}:quiz`,
        step: opts.quiz,
        perm: permFor(opts.quiz, rand),
        quiz: true,
      });
    }
  }
  if (opts.homework) items.push({ kind: "homework", id: `${opts.lessonId}:homework` });
  return items;
}

export function reviewItems(lessonIds: string[], seed: number, count = 8): SessionItem[] {
  const rand = rng(seed);
  return reviewExercises(lessonIds, count, rand).map(({ lessonId, step }, i) => ({
    kind: "exercise" as const,
    id: `review:${lessonId}:${i}`,
    step,
    perm: permFor(step, rand),
  }));
}

/** A wrong answer comes back at the end of the session with a new order. */
export function retryItem(item: SessionItem, rand: () => number): SessionItem {
  if (item.kind !== "exercise") return item;
  return { ...item, id: `${item.id}+`, perm: permFor(item.step, rand) };
}

/** XP for finishing the bite-sized part of a lesson (quiz and homework are separate). */
export function practiceXp(opts: { firstTime: boolean; mistakes: number; review?: boolean }) {
  const bonus = opts.mistakes === 0 ? 5 : 0;
  if (opts.review) return 10 + bonus;
  return (opts.firstTime ? 10 : 5) + bonus;
}

/** The right answer as text, for the red feedback sheet. */
export function correctAnswerText(step: Exercise, lang: Lang): string {
  switch (step.kind) {
    case "order":
      return step.lines.join("\n");
    case "fill":
      return step.code.replace("___", step.options[step.answer]);
    default:
      return pick(step.options[step.answer], lang);
  }
}
