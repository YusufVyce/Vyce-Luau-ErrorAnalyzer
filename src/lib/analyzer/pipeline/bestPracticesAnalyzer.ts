import type { AnalyzerNote, ExtractedContext } from "./types";

export function analyzeBestPractices(context: ExtractedContext): AnalyzerNote[] {
  const notes: AnalyzerNote[] = [];

  if (context.hasFindFirstChild) {
    notes.push({
      title: "Prefer explicit fallback",
      description: "When using FindFirstChild, return early or fallback explicitly before property access.",
    });
  }

  if (context.hasWaitForChild) {
    notes.push({
      title: "Bound waits",
      description: "Use WaitForChild(name, timeout) and log timeout failures for deterministic debugging.",
    });
  }

  if (context.requires.length > 0) {
    notes.push({
      title: "Module contracts",
      description: "ModuleScript exports should be asserted after require() to catch missing returns quickly.",
    });
  }

  if (context.side === "unknown" && context.hasRemoteUse) {
    notes.push({
      title: "Declare execution side",
      description: "Split client and server responsibilities to avoid accidental Remote API side misuse.",
    });
  }

  return notes;
}
