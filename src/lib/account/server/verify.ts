/**
 * Checks what a student claims to have done before the server pays XP for
 * it. Homework and challenges are graded again by running the submitted
 * code in the same offline Roblox simulator the browser uses; quiz and
 * practice answers are compared with the real answers. Nothing here trusts
 * an XP number sent by the browser.
 */
import { CHALLENGE_XP, challengeById } from "@/lib/challenges/challenges";
import { runChallenge } from "@/lib/challenges/runner";
import { exerciseFor } from "@/lib/learn/homework/exercises";
import { runHomework } from "@/lib/learn/homework/harness";
import { LESSONS } from "@/lib/learn/lessons";
import { PATH } from "@/lib/learn/path";
import { isCorrect, practiceXp } from "@/lib/learn/path/session";
import { normalizeProgress, starsFor, type Progress } from "@/lib/learn/progress";
import type { Claim, ClaimOutcome, SolvedStep } from "../shared";

/** Longest homework or challenge code the server will run. */
export const MAX_CODE = 20_000;
/** Most answers one practice claim may carry (lessons have at most ~10 steps, plus retries). */
const MAX_ANSWERS = 60;

export interface Verdict {
  xp: number;
  /** Adds what was earned to the account's progress. */
  apply: (p: Progress) => Progress;
  outcome: ClaimOutcome;
}

export type VerifyError = "bad_request" | "rejected";

const int = (v: unknown, lo: number, hi: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : lo;

const add = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

export function homeworkReward(solution: boolean, hints: number): number {
  return solution ? 30 : Math.max(50, 100 - hints * 15);
}

export function challengeReward(base: number, solution: boolean, hints: number): number {
  return solution ? Math.round(base / 3) : Math.max(Math.round(base / 2), base - hints * 10);
}

function validAnswer(a: SolvedStep): boolean {
  const step = PATH[a.lessonId]?.steps[a.step];
  if (!step || step.kind === "learn") return false;
  if (step.kind === "order") {
    const seq = a.seq;
    if (!Array.isArray(seq) || seq.length !== step.lines.length) return false;
    if (!seq.every((i) => Number.isInteger(i) && i >= 0 && i < step.lines.length)) return false;
    return isCorrect(step, { pick: null, seq });
  }
  if (!Number.isInteger(a.pick)) return false;
  return isCorrect(step, { pick: a.pick as number, seq: [] });
}

/** Grades one claim against the account's current progress. */
export function verifyClaim(claim: Claim, p: Progress): Verdict | VerifyError {
  switch (claim.kind) {
    case "quiz": {
      const id = claim.lessonId;
      const quiz = LESSONS.find((l) => l.id === id)?.quiz;
      if (!quiz || !Number.isInteger(claim.answer)) return "bad_request";
      const correct = claim.answer === quiz.answer;
      if (p.quiz.includes(id)) return { xp: 0, apply: (q) => q, outcome: { awarded: 0, correct } };
      if (!correct) {
        return {
          xp: 0,
          apply: (q) => ({
            ...q,
            quizMisses: { ...q.quizMisses, [id]: (q.quizMisses[id] ?? 0) + 1 },
          }),
          outcome: { awarded: 0, correct },
        };
      }
      const xp = (p.quizMisses[id] ?? 0) === 0 ? 20 : 10;
      return {
        xp,
        apply: (q) => ({ ...q, quiz: add(q.quiz, id) }),
        outcome: { awarded: xp, correct },
      };
    }

    case "homework": {
      const id = claim.lessonId;
      const ex = exerciseFor(id);
      if (!ex || typeof claim.code !== "string" || claim.code.length > MAX_CODE) {
        return "bad_request";
      }
      if (!runHomework(ex, claim.code, "en").passed) return "rejected";
      if (p.homework.includes(id)) return { xp: 0, apply: (q) => q, outcome: { awarded: 0 } };
      const hints = int(claim.hints, 0, ex.hints.length);
      const xp = homeworkReward(Boolean(claim.solution), hints);
      return {
        xp,
        apply: (q) => ({ ...q, homework: add(q.homework, id) }),
        outcome: { awarded: xp },
      };
    }

    case "challenge": {
      const ch = challengeById(claim.id);
      if (!ch || typeof claim.code !== "string" || claim.code.length > MAX_CODE) {
        return "bad_request";
      }
      if (!runChallenge(ch, claim.code, "en").passed) return "rejected";
      if (p.challenges.includes(ch.id)) return { xp: 0, apply: (q) => q, outcome: { awarded: 0 } };
      const hints = int(claim.hints, 0, ch.hints.en.length);
      const xp = challengeReward(CHALLENGE_XP[ch.difficulty], Boolean(claim.solution), hints);
      return {
        xp,
        apply: (q) => ({ ...q, challenges: add(q.challenges, ch.id) }),
        outcome: { awarded: xp },
      };
    }

    case "practice": {
      const answers = claim.answers;
      if (!Array.isArray(answers) || answers.length === 0 || answers.length > MAX_ANSWERS) {
        return "bad_request";
      }
      if (!answers.every((a) => a && typeof a.lessonId === "string" && Number.isInteger(a.step))) {
        return "bad_request";
      }
      if (!answers.every(validAnswer)) return "rejected";
      const mistakes = int(claim.mistakes, 0, 99);
      const id = claim.lessonId;
      if (id) {
        const steps = PATH[id]?.steps;
        if (!steps) return "bad_request";
        // A finished lesson session answered every exercise in it correctly.
        const got = new Set(answers.filter((a) => a.lessonId === id).map((a) => a.step));
        const complete = steps.every((s, i) => s.kind === "learn" || got.has(i));
        if (!complete) return "rejected";
        const firstTime = !(id in p.stars);
        const xp = practiceXp({ firstTime, mistakes });
        return {
          xp,
          apply: (q) => ({
            ...q,
            stars: { ...q.stars, [id]: Math.max(q.stars[id] ?? 0, starsFor(mistakes)) },
          }),
          outcome: { awarded: xp },
        };
      }
      // Mixed review: a few questions from lessons the student has already practiced.
      if (answers.length < 5) return "rejected";
      const xp = practiceXp({ review: true, firstTime: false, mistakes });
      return { xp, apply: (q) => q, outcome: { awarded: xp } };
    }
  }
  return "bad_request";
}

/**
 * Progress saved in a browser before accounts existed, brought into an
 * account. Only what can be checked counts: homework and challenges are run
 * again from the saved code; quizzes and first practices count once each.
 * `existing` is the account's progress, so nothing is paid twice.
 */
export function verifyImport(
  local: Progress,
  existing: Progress,
): { xp: number; progress: Progress } {
  let xp = 0;
  const p = normalizeProgress(existing);
  for (const id of local.homework) {
    const ex = exerciseFor(id);
    const code = local.code[id];
    if (!ex || p.homework.includes(id) || !code || code.length > MAX_CODE) continue;
    if (!runHomework(ex, code, "en").passed) continue;
    p.homework.push(id);
    xp += homeworkReward(local.solutions.includes(id), int(local.hints[id], 0, ex.hints.length));
  }
  for (const id of local.challenges) {
    const ch = challengeById(id);
    const code = local.challengeCode[id];
    if (!ch || p.challenges.includes(id) || !code || code.length > MAX_CODE) continue;
    if (!runChallenge(ch, code, "en").passed) continue;
    p.challenges.push(id);
    xp += challengeReward(
      CHALLENGE_XP[ch.difficulty],
      local.challengeSolutions.includes(id),
      int(local.challengeHints[id], 0, ch.hints.en.length),
    );
  }
  for (const id of local.quiz) {
    if (p.quiz.includes(id) || !LESSONS.some((l) => l.id === id && l.quiz)) continue;
    p.quiz.push(id);
    xp += (local.quizMisses[id] ?? 0) === 0 ? 20 : 10;
  }
  for (const [id, stars] of Object.entries(local.stars)) {
    if (!PATH[id] || id in p.stars) continue;
    p.stars[id] = int(stars, 1, 3);
    xp += 10;
  }
  return { xp, progress: p };
}
