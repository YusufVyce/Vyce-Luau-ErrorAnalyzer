import type { ClassifiedError, ExtractedContext, Hypothesis } from "./types";

function formatChain(selected: Hypothesis): string {
  const intermediate = selected.rootCauseChain.intermediateCauses
    .map((item) => `- ${item.title}: ${item.description}`)
    .join("\n");

  return [
    `- Primary Cause: ${selected.rootCauseChain.primaryCause.description}`,
    intermediate ? `- Intermediate Cause(s):\n${intermediate}` : "- Intermediate Cause(s): none confirmed",
    `- Surface Error: ${selected.rootCauseChain.surfaceError.description}`,
  ].join("\n");
}

function formatStates(context: ExtractedContext): string {
  if (context.runtimeStates.length === 0) return "- No runtime state could be inferred from the snippet";

  return context.runtimeStates
    .slice(0, 6)
    .map((item) => `- ${item.role} ${item.name}: ${item.state} (${item.confidence}%)${item.note ? ` - ${item.note}` : ""}`)
    .join("\n");
}

export function generateExplanation(
  selected: Hypothesis,
  classified: ClassifiedError,
  context: ExtractedContext,
): { quickSummary: string; explanation: string } {
  const lines = selected.evidence
    .slice(0, 4)
    .map((item) => `- ${item.message}${item.line ? ` (line ${item.line})` : ""}${item.source ? ` [${item.source}]` : ""}`)
    .join("\n");

  const summary = `${selected.title}: ${selected.rootCauseChain.primaryCause.description}`;
  const sideInfo = context.side === "unknown" ? "Execution side is ambiguous from snippet." : `Execution side inferred as ${context.side}.`;
  const familyInfo = `Error family classified as ${classified.family}.`;
  const alternatives = selected.alternativeChains.length > 0
    ? selected.alternativeChains
        .slice(0, 2)
        .map((item) => `- ${item.primaryCause.description}`)
        .join("\n")
    : "- No alternate explanation was strongly supported";

  const explanation = [
    `${familyInfo} ${sideInfo}`,
    "Root-cause chain:",
    formatChain(selected),
    "Evidence that drove this hypothesis:",
    lines || "- Context fallback used due to low direct evidence",
    "Runtime-state inference:",
    formatStates(context),
    "Alternative explanations considered:",
    alternatives,
    `Confidence is evidence-based: total score ${selected.score}, confidence ${selected.confidence}.`,
  ].join("\n");

  return {
    quickSummary: summary,
    explanation,
  };
}
