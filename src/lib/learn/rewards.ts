/**
 * XP for homework and challenges. Every hint costs part of the reward, and
 * looking at the solution means the task still counts as done but pays no
 * XP. Shared by the browser (to show what's at stake) and the server (which
 * decides what is really paid).
 */

/** Full XP for a homework solved without help. */
export const HOMEWORK_XP = 100;

/** What one homework hint costs. */
export const HOMEWORK_HINT_COST = 20;

export function homeworkReward(solution: boolean, hints: number): number {
  if (solution) return 0;
  return Math.max(HOMEWORK_XP / 5, HOMEWORK_XP - hints * HOMEWORK_HINT_COST);
}

/** What one hint costs on a challenge worth `base` XP (a quarter of it). */
export function challengeHintCost(base: number): number {
  return Math.round(base / 4);
}

export function challengeReward(base: number, solution: boolean, hints: number): number {
  if (solution) return 0;
  const cost = challengeHintCost(base);
  return Math.max(cost, base - hints * cost);
}
