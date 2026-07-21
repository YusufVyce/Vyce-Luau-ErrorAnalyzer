import type { Hypothesis } from "./types";

export function applyConfidenceScores(hypotheses: Hypothesis[]): Hypothesis[] {
  if (hypotheses.length === 0) return [];

  const maxScore = Math.max(...hypotheses.map((item) => item.score), 1);
  return hypotheses.map((item) => {
    const normalized = Math.round((item.score / maxScore) * 100);
    const bounded = Math.min(99, Math.max(15, normalized));
    return {
      ...item,
      confidence: bounded,
    };
  });
}
