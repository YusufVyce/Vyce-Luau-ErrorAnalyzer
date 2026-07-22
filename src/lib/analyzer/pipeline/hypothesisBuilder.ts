import type { Hypothesis, RuleSignal } from "./types";

export function buildHypotheses(signals: RuleSignal[]): Hypothesis[] {
  const hypotheses: Hypothesis[] = signals.map((signal) => {
    const score = signal.evidence.reduce((sum, item) => sum + item.score, 0);
    return {
      id: signal.id,
      title: signal.title,
      rootCause: signal.rootCause,
      rootCauseChain: signal.rootCauseChain,
      alternativeChains: signal.alternativeChains,
      severity: signal.severity,
      evidence: signal.evidence,
      score,
      confidence: 0,
      confidenceFactors: [],
      fixes: signal.fixes,
      docs: signal.docs,
      relatedApis: signal.relatedApis,
      relatedErrors: signal.relatedErrors,
      estimatedFixTime: signal.estimatedFixTime,
      difficulty: signal.difficulty,
    };
  });

  return hypotheses.sort((a, b) => b.score - a.score);
}
