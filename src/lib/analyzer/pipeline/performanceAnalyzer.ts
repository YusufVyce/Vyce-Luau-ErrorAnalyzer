import type { AnalyzerNote, ExtractedContext } from "./types";

export function analyzePerformance(context: ExtractedContext): AnalyzerNote[] {
  const notes: AnalyzerNote[] = [];

  if (context.hasLoops && context.hasDataStoreUse) {
    notes.push({
      title: "DataStore in loop",
      description: "DataStore requests inside loops can trigger throttling and long server stalls.",
    });
  }

  if (context.hasRecursiveFunction) {
    notes.push({
      title: "Recursive hot path",
      description: "Detected self-recursive function body; ensure an exit condition and bounded depth.",
    });
  }

  if (context.hasTaskSpawn || context.hasTaskDefer || context.hasCoroutine) {
    notes.push({
      title: "Asynchronous fan-out",
      description: "Task/coroutine fan-out can hide race conditions and create burst CPU usage.",
    });
  }

  if (context.hasTweenUse && context.tweenGoals.length > 3) {
    notes.push({
      title: "Large tween goal payload",
      description: "Many tweened properties on the same frame can increase GC pressure in UI-heavy loops.",
    });
  }

  return notes;
}
