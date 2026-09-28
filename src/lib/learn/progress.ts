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
  /** Solved challenge ids. */
  challenges: string[];
  challengeCode: Record<string, string>;
  challengeAttempts: Record<string, number>;
  challengeHints: Record<string, number>;
  challengeSolutions: string[];
  /** Days (YYYY-MM-DD, local time) with any activity, for streaks. */
  days: string[];
  /** Best stars (1-3) per lesson from the bite-sized lesson session. */
  stars: Record<string, number>;
  /** XP earned per day (YYYY-MM-DD), for the daily goal. */
  xpDays: Record<string, number>;
  /** Daily XP goal. */
  dailyGoal: number;
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
  challenges: [],
  challengeCode: {},
  challengeAttempts: {},
  challengeHints: {},
  challengeSolutions: [],
  days: [],
  stars: {},
  xpDays: {},
  dailyGoal: 60,
};

/** Daily goal choices (XP per day). */
export const DAILY_GOALS = [
  { xp: 30, en: "Casual", tr: "Rahat" },
  { xp: 60, en: "Regular", tr: "Düzenli" },
  { xp: 120, en: "Serious", tr: "Ciddi" },
  { xp: 200, en: "Intense", tr: "Yoğun" },
] as const;

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const rec = <T>(v: unknown): Record<string, T> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, T>) : {};

/** Validates data from localStorage or an imported backup file. */
export function normalizeProgress(raw: unknown): Progress {
  const p = (raw && typeof raw === "object" ? raw : {}) as Partial<Progress>;
  return {
    quiz: arr(p.quiz),
    homework: arr(p.homework),
    xp: typeof p.xp === "number" && Number.isFinite(p.xp) ? Math.max(0, Math.round(p.xp)) : 0,
    code: rec<string>(p.code),
    attempts: rec<number>(p.attempts),
    hints: rec<number>(p.hints),
    solutions: arr(p.solutions),
    quizMisses: rec<number>(p.quizMisses),
    challenges: arr(p.challenges),
    challengeCode: rec<string>(p.challengeCode),
    challengeAttempts: rec<number>(p.challengeAttempts),
    challengeHints: rec<number>(p.challengeHints),
    challengeSolutions: arr(p.challengeSolutions),
    days: arr(p.days),
    stars: rec<number>(p.stars),
    xpDays: rec<number>(p.xpDays),
    dailyGoal:
      typeof p.dailyGoal === "number" && DAILY_GOALS.some((g) => g.xp === p.dailyGoal)
        ? p.dailyGoal
        : EMPTY_PROGRESS.dailyGoal,
  };
}

export function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? normalizeProgress(JSON.parse(raw)) : { ...EMPTY_PROGRESS };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export function today(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Marks today as active (for streaks). */
export function withToday(p: Progress): Progress {
  const t = today();
  return p.days.includes(t) ? p : { ...p, days: [...p.days, t].slice(-400) };
}

/** Adds XP to the total and to today's count (for the daily goal). */
export function gainXp(p: Progress, n: number): Progress {
  if (n <= 0) return p;
  const d = today();
  const xpDays = { ...p.xpDays, [d]: (p.xpDays[d] ?? 0) + n };
  // Keep the last 60 days only.
  const keys = Object.keys(xpDays).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete xpDays[k];
  return { ...p, xp: p.xp + n, xpDays };
}

export function todayXp(p: Progress): number {
  return p.xpDays[today()] ?? 0;
}

/** 3 stars with no mistakes, 2 with one or two, otherwise 1. */
export function starsFor(mistakes: number): number {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}

/** Consecutive active days ending today (or yesterday, so a streak survives until midnight). */
export function streakOf(days: string[], now = new Date()): number {
  const set = new Set(days);
  const d = new Date(now);
  if (!set.has(today(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function saveProgress(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage blocked (private mode): progress lasts until the tab closes
  }
  // Lets the nav XP chip and achievement toasts update without a reload.
  window.dispatchEvent(new CustomEvent("vyce-progress", { detail: p }));
}

export function clearProgress() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("vyce-progress", { detail: { ...EMPTY_PROGRESS } }));
}

export function lessonComplete(p: Progress, lesson: Lesson): boolean {
  const quizOk = !lesson.quiz || p.quiz.includes(lesson.id);
  const hwOk = !exerciseFor(lesson.id) || p.homework.includes(lesson.id);
  return quizOk && hwOk;
}

/** Lessons with anything to review: completed, or practiced at least once. */
export function doneLessonIds(p: Progress): string[] {
  return LESSONS.filter((l) => lessonComplete(p, l) || p.stars[l.id]).map((l) => l.id);
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
  { xp: 1500, title: "Pro Developer" },
  { xp: 2400, title: "Expert" },
  { xp: 3600, title: "Master Scripter" },
  { xp: 5000, title: "Legend" },
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
