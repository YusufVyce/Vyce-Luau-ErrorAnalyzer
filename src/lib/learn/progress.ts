/**
 * Course progress: quizzes, homework, XP and saved homework code. Stored only
 * in this browser (localStorage) — no accounts, no server.
 */
import { exerciseFor } from "./homework/exercises";
import { LESSONS, type Lesson } from "./lessons";

export interface Progress {
  quiz: string[];
  homework: string[];
  xp: number;
  code: Record<string, string>;
  attempts: Record<string, number>;
  hints: Record<string, number>;
  solutions: string[];
  quizMisses: Record<string, number>;
}

const KEY = "vyce-learn-progress-v2";

export const EMPTY_PROGRESS: Progress = {
  quiz: [],
  homework: [],
  xp: 0,
  code: {},
  attempts: {},
  hints: {},
  solutions: [],
  quizMisses: {},
};

export function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_PROGRESS };
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      quiz: Array.isArray(p.quiz) ? p.quiz : [],
      homework: Array.isArray(p.homework) ? p.homework : [],
      xp: typeof p.xp === "number" ? p.xp : 0,
      code: p.code && typeof p.code === "object" ? p.code : {},
      attempts: p.attempts && typeof p.attempts === "object" ? p.attempts : {},
      hints: p.hints && typeof p.hints === "object" ? p.hints : {},
      solutions: Array.isArray(p.solutions) ? p.solutions : [],
      quizMisses: p.quizMisses && typeof p.quizMisses === "object" ? p.quizMisses : {},
    };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export function saveProgress(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage blocked (private mode): progress lasts until the tab closes
  }
}

export function lessonComplete(p: Progress, lesson: Lesson): boolean {
  const quizOk = !lesson.quiz || p.quiz.includes(lesson.id);
  const hwOk = !exerciseFor(lesson.id) || p.homework.includes(lesson.id);
  return quizOk && hwOk;
}

/** A lesson is unlocked when every lesson before it is complete. */
export function lessonUnlocked(p: Progress, index: number): boolean {
  return LESSONS.slice(0, index).every((l) => lessonComplete(p, l));
}

export function homeworkXp(p: Progress, lessonId: string): number {
  if (p.solutions.includes(lessonId)) return 30;
  return Math.max(50, 100 - (p.hints[lessonId] ?? 0) * 15);
}

export const LEVELS = [
  { xp: 0, title: "Noob" },
  { xp: 150, title: "Beginner Scripter" },
  { xp: 450, title: "Scripter" },
  { xp: 900, title: "Game Developer" },
  { xp: 1400, title: "Pro Developer" },
  { xp: 2000, title: "Legend" },
];

export function levelFor(xp: number) {
  let idx = 0;
  LEVELS.forEach((l, i) => {
    if (xp >= l.xp) idx = i;
  });
  const next = LEVELS[idx + 1];
  const cur = LEVELS[idx];
  return {
    level: idx + 1,
    title: cur.title,
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
    nextAt: next?.xp,
  };
}
