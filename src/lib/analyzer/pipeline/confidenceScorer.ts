import type { ExtractedContext, Hypothesis } from "./types";

function uniqueCount(values: Array<string | undefined>): number {
  return new Set(values.filter((value): value is string => Boolean(value))).size;
}

function countStateSignals(context?: ExtractedContext): number {
  if (!context) return 0;
  return context.runtimeStates.filter((item) => item.state !== "Unknown").length;
}

function countFlowSignals(context?: ExtractedContext): number {
  if (!context) return 0;
  return context.flowTraces.length;
}

export function applyConfidenceScores(hypotheses: Hypothesis[], context?: ExtractedContext): Hypothesis[] {
  if (hypotheses.length === 0) return [];

  const maxScore = Math.max(...hypotheses.map((item) => item.score), 1);
  const provisional = hypotheses.map((item) => {
    const sourceCount = uniqueCount(item.evidence.map((evidence) => evidence.source));
    const layerCount = uniqueCount(item.evidence.map((evidence) => evidence.layer));
    const directLineCount = item.evidence.filter((evidence) => typeof evidence.line === "number").length;
    const stateSignalCount = countStateSignals(context);
    const flowSignalCount = countFlowSignals(context);
    const rawRatio = item.score / maxScore;

    let supportScore = 18 + rawRatio * 28 + sourceCount * 8 + layerCount * 4 + directLineCount * 4 + stateSignalCount * 2 + flowSignalCount * 2;

    const confidenceFactors = [
      `raw evidence ratio ${rawRatio.toFixed(2)}`,
      `independent evidence sources ${sourceCount}`,
      `evidence layers ${layerCount}`,
      `direct line matches ${directLineCount}`,
      `runtime-state confirmations ${stateSignalCount}`,
      `flow traces ${flowSignalCount}`,
    ];

    if (sourceCount <= 1) {
      supportScore -= 8;
      confidenceFactors.push("penalty: limited independent evidence sources");
    }
    if (directLineCount === 0) {
      supportScore -= 6;
      confidenceFactors.push("penalty: no direct line correlation");
    }
    if (stateSignalCount === 0 && flowSignalCount === 0) {
      supportScore -= 5;
      confidenceFactors.push("penalty: missing runtime-state and flow support");
    }

    return {
      item,
      supportScore,
      confidenceFactors,
    };
  });

  const sortedSupport = [...provisional].sort((left, right) => right.supportScore - left.supportScore);
  const topScore = sortedSupport[0]?.supportScore ?? 0;
  const secondScore = sortedSupport[1]?.supportScore ?? 0;
  const ambiguityGap = topScore > 0 ? secondScore / topScore : 0;
  const ambiguityPenalty = ambiguityGap > 0.9 ? 12 : ambiguityGap > 0.75 ? 8 : ambiguityGap > 0.6 ? 4 : 0;

  return provisional.map(({ item, supportScore, confidenceFactors }) => {
    let confidence = supportScore - ambiguityPenalty;
    if (context && context.runtimeStates.length === 0 && context.flowTraces.length === 0) {
      confidence -= 3;
      confidenceFactors.push("penalty: no semantic state or flow evidence available");
    }

    const bounded = Math.min(99, Math.max(15, Math.round(confidence)));
    return {
      ...item,
      confidence: bounded,
      confidenceFactors,
    };
  });
}
