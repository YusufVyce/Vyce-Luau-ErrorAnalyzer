import type { ClassifiedError, ExtractedContext, Hypothesis } from "./types";

export function generateExplanation(
  selected: Hypothesis,
  classified: ClassifiedError,
  context: ExtractedContext,
): { quickSummary: string; explanation: string } {
  const lines = selected.evidence
    .slice(0, 4)
    .map((item) => `- ${item.message}${item.line ? ` (line ${item.line})` : ""}`)
    .join("\n");

  const summary = `${selected.title}: ${selected.rootCause}`;
  const sideInfo = context.side === "unknown" ? "Execution side is ambiguous from snippet." : `Execution side inferred as ${context.side}.`;
  const familyInfo = `Error family classified as ${classified.family}.`;

  const explanation = [
    `${familyInfo} ${sideInfo}`,
    "Evidence that drove this hypothesis:",
    lines || "- Context fallback used due to low direct evidence",
    `Confidence is computed from evidence weights: total score ${selected.score}.`,
  ].join("\n");

  return {
    quickSummary: summary,
    explanation,
  };
}
