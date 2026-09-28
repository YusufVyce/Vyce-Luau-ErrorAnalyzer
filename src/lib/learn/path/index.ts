import { CH1 } from "./ch1";
import { CH2 } from "./ch2";
import { CH3 } from "./ch3";
import { CH4 } from "./ch4";
import { CH6 } from "./ch6";
import type { Exercise, PathLesson } from "./types";

export * from "./types";

/** Bite-sized steps for every lesson, keyed by lesson id. */
export const PATH: Record<string, PathLesson> = { ...CH1, ...CH2, ...CH3, ...CH4, ...CH6 };

export function pathLesson(id: string): PathLesson | undefined {
  return PATH[id];
}

/** Small seeded PRNG so a session can be rebuilt the same way. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random order of 0..n-1 that is never the identity when n > 1. */
export function shuffled(n: number, rand: () => number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return idx;
  do {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
  } while (idx.every((v, i) => v === i));
  return idx;
}

/** Exercises from the given lessons, for a mixed review session. */
export function reviewExercises(lessonIds: string[], count: number, rand: () => number) {
  const pool: Array<{ lessonId: string; step: Exercise }> = [];
  for (const id of lessonIds) {
    for (const step of PATH[id]?.steps ?? []) {
      if (step.kind !== "learn") pool.push({ lessonId: id, step });
    }
  }
  const order = shuffled(pool.length, rand);
  return order.slice(0, count).map((i) => pool[i]);
}
