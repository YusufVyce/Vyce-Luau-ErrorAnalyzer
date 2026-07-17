import {
  findMatch,
  type Platform,
} from "@/lib/error-parser";

export type AnalyzerResult =
  | {
      matched: true;
      ruleId: string;
      title: string;
      platform: Platform;
      rootCause: string;
      fix: string;
      correctedExample: string | undefined;
    }
  | { matched: false };

export type { Platform } from "@/lib/error-parser";

export function analyzeErrorAndCode(
  logText: string,
  codeText: string,
  platformFilter?: Platform,
): AnalyzerResult {
  const match = findMatch(logText, codeText, platformFilter === undefined ? "auto" : platformFilter);

  if (!match) {
    return { matched: false };
  }

  const analysis = match.entry.analyze(logText, codeText);
  return {
    matched: true,
    ruleId: match.entry.id,
    title: match.entry.title,
    platform: match.entry.platform,
    rootCause: analysis.explanation,
    fix: analysis.fixes[0] ?? "No recommended fix available.",
    correctedExample: analysis.example,
  };
}
