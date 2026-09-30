/**
 * Course progress: quizzes, homework, XP and saved homework code. Always kept
 * in this browser (localStorage); when the student is signed in, the account
 * copy on the server is kept in sync by src/lib/account/client.tsx.
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

// Generous size limits: real progress is far smaller, but data that comes from
// the server (or from someone else's browser) must not be able to grow without bound.
const MAX_ITEMS = 1000;
const MAX_ID = 80;
const MAX_CODE = 50_000;

const arr = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.length <= MAX_ID).slice(-MAX_ITEMS)
    : [];
const rec = <T>(v: unknown, ok: (x: unknown) => x is T): Record<string, T> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, T> = {};
  for (const [k, x] of Object.entries(v).slice(0, MAX_ITEMS)) {
    if (k.length <= MAX_ID && ok(x)) out[k] = x;
  }
  return out;
};
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;
const isCode = (x: unknown): x is string => typeof x === "string" && x.length <= MAX_CODE;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates data from localStorage or from the account server. */
export function normalizeProgress(raw: unknown): Progress {
  const p = (raw && typeof raw === "object" ? raw : {}) as Partial<Progress>;
  return {
    quiz: arr(p.quiz),
    homework: arr(p.homework),
    xp: typeof p.xp === "number" && Number.isFinite(p.xp) ? Math.max(0, Math.round(p.xp)) : 0,
    code: rec(p.code, isCode),
    attempts: rec(p.attempts, isNum),
    hints: rec(p.hints, isNum),
    solutions: arr(p.solutions),
    quizMisses: rec(p.quizMisses, isNum),
    challenges: arr(p.challenges),
    challengeCode: rec(p.challengeCode, isCode),
    challengeAttempts: rec(p.challengeAttempts, isNum),
    challengeHints: rec(p.challengeHints, isNum),
    challengeSolutions: arr(p.challengeSolutions),
    days: arr(p.days).filter((d) => DAY_RE.test(d)),
    stars: rec(p.stars, isNum),
    xpDays: rec(p.xpDays, isNum),
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

const quietEvents = new WeakSet<Event>();

/**
 * True for progress events that didn't come from the student doing
 * something here (e.g. progress arriving from their account): no toasts.
 */
export function isQuietProgressEvent(e: Event): boolean {
  return quietEvents.has(e);
}

export function saveProgress(p: Progress, opts: { quiet?: boolean } = {}) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage blocked (private mode): progress lasts until the tab closes
  }
  // Lets the nav XP chip and achievement toasts update without a reload.
  const e = new CustomEvent("vyce-progress", { detail: p });
  if (opts.quiet) quietEvents.add(e);
  window.dispatchEvent(e);
}

export function clearProgress() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("vyce-progress", { detail: { ...EMPTY_PROGRESS } }));
}

/**
 * Combines two copies of the same account's progress (two devices, or this
 * browser and the server). Finished things are never lost: lists are joined
 * and counters keep the larger value. XP is decided by the server, so the
 * caller sets it afterwards; here it's just the larger of the two.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const union = (x: string[], y: string[]) => [...new Set([...x, ...y])];
  const max = (x: Record<string, number>, y: Record<string, number>) => {
    const out = { ...x };
    for (const [k, v] of Object.entries(y)) out[k] = Math.max(out[k] ?? 0, v);
    return out;
  };
  const xpDays = max(a.xpDays, b.xpDays);
  for (const k of Object.keys(xpDays).sort().slice(0, -60)) delete xpDays[k];
  return {
    quiz: union(a.quiz, b.quiz),
    homework: union(a.homework, b.homework),
    xp: Math.max(a.xp, b.xp),
    // Saved code: the newer copy (b) wins.
    code: { ...a.code, ...b.code },
    attempts: max(a.attempts, b.attempts),
    hints: max(a.hints, b.hints),
    solutions: union(a.solutions, b.solutions),
    quizMisses: max(a.quizMisses, b.quizMisses),
    challenges: union(a.challenges, b.challenges),
    challengeCode: { ...a.challengeCode, ...b.challengeCode },
    challengeAttempts: max(a.challengeAttempts, b.challengeAttempts),
    challengeHints: max(a.challengeHints, b.challengeHints),
    challengeSolutions: union(a.challengeSolutions, b.challengeSolutions),
    days: union(a.days, b.days).sort().slice(-400),
    stars: max(a.stars, b.stars),
    xpDays,
    dailyGoal: b.dailyGoal,
  };
}

/** True when the browser has progress worth keeping (used before signing in). */
export function hasProgress(p: Progress): boolean {
  return (
    p.xp > 0 ||
    p.quiz.length > 0 ||
    p.homework.length > 0 ||
    p.challenges.length > 0 ||
    Object.keys(p.stars).length > 0
  );
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
  { xp: 0, title: "Noob", tr: "Çaylak" },
  { xp: 150, title: "Beginner Scripter", tr: "Acemi Scripter" },
  { xp: 450, title: "Scripter", tr: "Scripter" },
  { xp: 900, title: "Game Developer", tr: "Oyun Geliştirici" },
  { xp: 1500, title: "Pro Developer", tr: "Profesyonel Geliştirici" },
  { xp: 2400, title: "Expert", tr: "Uzman" },
  { xp: 3600, title: "Master Scripter", tr: "Usta Scripter" },
  { xp: 5000, title: "Legend", tr: "Efsane" },
];

export function levelTitle(l: (typeof LEVELS)[number], lang: "en" | "tr" = "en"): string {
  return lang === "tr" ? l.tr : l.title;
}

export function levelFor(xp: number, lang: "en" | "tr" = "en") {
  let idx = 0;
  LEVELS.forEach((l, i) => {
    if (xp >= l.xp) idx = i;
  });
  const next = LEVELS[idx + 1];
  const cur = LEVELS[idx];
  return {
    level: idx + 1,
    title: levelTitle(cur, lang),
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
    nextAt: next?.xp,
  };
}
