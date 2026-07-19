import { extractVariableFlow } from "@/lib/analyzer/codeFlow";
import { runScanRules } from "@/lib/analyzer/scanner/rules";
import { scanCode } from "@/lib/analyzer/scanner/scanCode";
import {
  findMatch,
  ERROR_DICT,
} from "@/lib/error-parser";

import type { DeprecatedApi } from "@/lib/types";

export type AnalyzerResult =
  | {
      severity?: "Low" | "Medium" | "High" | "Critical";
      confidence?: number;
      matched: true;
      ruleId: string;
      title: string;
      rootCause: string;
      fix: string;
      correctedExample: string | undefined;

      codeInsights?: {
  title: string;
  description: string;
}[];

deprecatedApis?: DeprecatedApi[];
    }
  | { matched: false };

export function analyzeErrorAndCode(
  logText: string,
  codeText: string,
): AnalyzerResult {
  // Prefer log-based matching when logText is provided
  if (logText && logText.trim().length > 0) {
    const match = findMatch(logText);

if (!match) return { matched: false };

const detectedConfidence = match.confidence;
const detectedMatchType = match.matchType;

const analysis = match.entry.analyze(logText, codeText);
const scan = scanCode(codeText);

console.log(scan);
const warnings = runScanRules(scan);

console.log(warnings);
const flow = extractVariableFlow(codeText);

console.log(flow);
    return {
  matched: true,
  ruleId: match.entry.id,
  title: match.entry.title,
  rootCause: analysis.explanation,
  fix: analysis.fixes[0] ?? "No recommended fix available.",
  correctedExample: analysis.example,

  severity: analysis.severity,
  confidence: detectedConfidence || analysis.confidence,

  codeInsights: analysis.codeInsights,
  deprecatedApis: analysis.deprecatedApis,
};
  }

  // If no log provided but code exists, attempt code-only analysis using rule heuristics.
  if (codeText && codeText.trim().length > 0) {
    const candidates = ERROR_DICT;

    // Score candidates by whether their analyze() returns useful fixes/examples
    const scored = candidates
      .map((entry) => {
        try {
          const analysis = entry.analyze("", codeText);
          const score = (analysis.fixes?.length || 0) * 2 + (analysis.example ? 1 : 0) + (analysis.causes?.length || 0);
          return { entry, analysis, score };
        } catch (e) {
          return { entry, analysis: null, score: 0 };
        }
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return { matched: false };

    const best = scored[0];
    return {
  matched: true,
  ruleId: `code-only-${best.entry.id}`,
  title: best.entry.title + " (code-only)",
  rootCause: best.analysis?.explanation ?? "Potential issue detected in code.",
  fix: best.analysis?.fixes?.[0] ?? "Review the code for reported issues.",
  correctedExample: best.analysis?.example,

  severity: best.analysis?.severity,
  confidence: best.analysis?.confidence,

  codeInsights: best.analysis?.codeInsights,
  deprecatedApis: best.analysis?.deprecatedApis,
};
  }

  return { matched: false };
}