import { ROBLOX_DEPRECATED } from "../roblox/deprecated";
import { ROBLOX_INSIGHTS } from "../roblox/insights";
import { ROBLOX_PERFORMANCE } from "../roblox/performance";
import { ROBLOX_SECURITY } from "../roblox/security";
import type { Analysis, CodeInsight, DeprecatedApi } from "../types";

export type RobloxDiagnostics = Pick<
  Analysis,
  "codeInsights" | "deprecatedApis" | "performanceIssues" | "securityIssues"
>;

export function collectRobloxDiagnostics(codeText: string): RobloxDiagnostics {
  const codeInsights: CodeInsight[] = [];
  const deprecatedApis: DeprecatedApi[] = [];
  const performanceIssues: NonNullable<Analysis["performanceIssues"]> = [];
  const securityIssues: NonNullable<Analysis["securityIssues"]> = [];

  for (const insight of ROBLOX_INSIGHTS) {
    if (
      codeText.includes(insight.pattern) ||
      codeText.includes(insight.pattern.replace(":", "."))
    ) {
      codeInsights.push({ title: insight.title, description: insight.description });
    }
  }
  for (const deprecated of ROBLOX_DEPRECATED) {
    if (codeText.includes(deprecated.pattern)) {
      deprecatedApis.push({
        api: deprecated.api,
        replacement: deprecated.replacement,
        reason: deprecated.reason,
      });
    }
  }
  for (const issue of ROBLOX_PERFORMANCE) {
    if (codeText.includes(issue.pattern)) {
      performanceIssues.push({
        title: issue.title,
        impact: issue.impact,
        description: issue.description,
      });
    }
  }
  for (const issue of ROBLOX_SECURITY) {
    if (codeText.includes(issue.pattern)) {
      securityIssues.push({
        title: issue.title,
        severity: issue.severity,
        description: issue.description,
      });
    }
  }
  return { codeInsights, deprecatedApis, performanceIssues, securityIssues };
}
