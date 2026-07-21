import type { AnalyzerNote, ExtractedContext } from "./types";

export function analyzeSecurity(context: ExtractedContext): AnalyzerNote[] {
  const notes: AnalyzerNote[] = [];

  if (context.hasRemoteUse) {
    notes.push({
      title: "Remote trust boundary",
      description: "Remote payloads must be validated server-side; never trust client-sent values.",
    });
  }

  if (context.hasDataStoreUse && !context.hasPcall) {
    notes.push({
      title: "Unprotected persistence",
      description: "Missing pcall around DataStore calls can expose state corruption paths on transient failures.",
    });
  }

  if (context.services.includes("HttpService") && !context.hasPcall) {
    notes.push({
      title: "HTTP failure handling",
      description: "HttpService requests should be wrapped and validated to avoid unsafe fallback behavior.",
    });
  }

  return notes;
}
