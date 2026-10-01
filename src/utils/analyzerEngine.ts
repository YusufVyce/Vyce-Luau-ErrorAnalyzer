import {
  buildAdvancedAnalysisFromDynamicResult,
  type AdvancedAnalyzerOutput,
} from "@/lib/analyzer/advancedRobloxAnalyzer";
import { runDynamicRobloxPipeline } from "@/lib/analyzer/pipeline";
import { diagnose } from "@/lib/analyzer/precise/diagnose";
import type { AnalyzerLang } from "@/lib/analyzer/precise/lang";
import type { DiagnosisCategory, PreciseDiagnosis } from "@/lib/analyzer/precise/types";

import type { Analysis, Cause, DeprecatedApi } from "@/lib/types";

/** Hard ceiling on input size so a pathological paste can't stall the UI thread. */
const MAX_INPUT_LENGTH = 200_000;

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
      causes?: Cause[];
      fixes?: string[];
      causeChain?: {
        primaryCause: string;
        intermediateCauses: string[];
        surfaceError: string;
      };

      codeInsights?: {
        title: string;
        description: string;
      }[];

      deprecatedApis?: DeprecatedApi[];
      advanced?: AdvancedAnalyzerOutput;
      /** Message-specific diagnosis. The UI's primary view is built from this. */
      precise?: PreciseDiagnosis;
    }
  | { matched: false; error?: string };

/**
 * Analyzes a Roblox error log and/or surrounding Luau code using a modular,
 * evidence-scored pipeline.
 *
 * This function never throws: any unexpected failure is caught, logged, and
 * surfaced to the caller as `{ matched: false, error }` so the UI can show a
 * graceful "couldn't analyze this" state instead of crashing. `lang` picks the
 * language of the diagnosis text (English or Turkish).
 */
export function analyzeErrorAndCode(
  logText: string,
  codeText: string,
  lang: AnalyzerLang = "en",
): AnalyzerResult {
  try {
    const safeLogText = typeof logText === "string" ? logText : "";
    const safeCodeText = typeof codeText === "string" ? codeText : "";

    if (safeLogText.length > MAX_INPUT_LENGTH || safeCodeText.length > MAX_INPUT_LENGTH) {
      return {
        matched: false,
        error:
          lang === "tr"
            ? `Analiz için çok uzun (sınır ${MAX_INPUT_LENGTH.toLocaleString("tr-TR")} karakter).`
            : `Input too large to analyze (limit is ${MAX_INPUT_LENGTH.toLocaleString()} characters).`,
      };
    }

    return analyzeWithPipeline(safeLogText, safeCodeText, lang);
  } catch (error) {
    console.error("[analyzerEngine] analyzeErrorAndCode failed unexpectedly:", error);
    return {
      matched: false,
      error:
        lang === "tr"
          ? "Analiz sırasında beklenmeyen bir hata oldu."
          : "An unexpected error occurred while analyzing this input.",
    };
  }
}

const LEGACY_RULE_IDS: Record<string, string> = {
  INDEX_NIL: "roblox-index-nil",
  CALL_NIL: "roblox-call-nil",
  CONCAT_NIL: "roblox-concat-nil",
  ARITHMETIC_NIL: "roblox-arithmetic-nil",
  COMPARE_NIL: "roblox-compare-nil",
  INVALID_ARGUMENT: "roblox-invalid-argument",
  INVALID_MEMBER: "roblox-invalid-member",
  INVALID_TYPE: "roblox-invalid-type",
  DATASTORE: "roblox-datastore",
  REMOTE: "roblox-remote",
  TWEEN: "roblox-tween",
  CHARACTER: "roblox-character",
  WAIT: "roblox-wait",
  TIMEOUT: "roblox-timeout",
  HTTP: "roblox-http",
  MEMORY: "roblox-memory",
  UNKNOWN: "roblox-unknown",
};

const CATEGORY_RULE_IDS: Record<DiagnosisCategory, string> = {
  "index-nil": "roblox-index-nil",
  "call-nil": "roblox-call-nil",
  arithmetic: "roblox-arithmetic-nil",
  concatenate: "roblox-concat-nil",
  compare: "roblox-compare-nil",
  "invalid-argument": "roblox-invalid-argument",
  "invalid-member": "roblox-invalid-member",
  "invalid-type": "roblox-invalid-type",
  wait: "roblox-wait",
  timeout: "roblox-timeout",
  "stack-overflow": "roblox-stack-overflow",
  table: "roblox-table",
  syntax: "roblox-syntax",
  module: "roblox-module",
  remote: "roblox-remote",
  datastore: "roblox-datastore",
  http: "roblox-http",
  tween: "roblox-tween",
  animation: "roblox-animation",
  asset: "roblox-asset",
  instance: "roblox-instance",
  coroutine: "roblox-coroutine",
  "code-check": "roblox-code-check",
  unknown: "roblox-unknown",
};

const LIKELIHOOD_PERCENT = { likely: 70, possible: 25, unlikely: 10 } as const;

function analyzeWithPipeline(
  logText: string,
  codeText: string,
  lang: AnalyzerLang,
): AnalyzerResult {
  if (logText.trim().length === 0 && codeText.trim().length === 0) {
    return { matched: false };
  }

  const precise = diagnose(logText, codeText, lang);
  const dynamic = runDynamicRobloxPipeline(logText, codeText);

  if (!precise && !dynamic) {
    return { matched: false };
  }

  // The dynamic pipeline still powers the "technical details" view.
  const pipelineFixes = dynamic
    ? [dynamic.fixes.minimal, dynamic.fixes.better, dynamic.fixes.production]
    : [];
  const advanced = dynamic
    ? buildAdvancedAnalysisFromDynamicResult(dynamic, logText, codeText, pipelineFixes)
    : undefined;
  if (advanced && precise) {
    advanced.docs = precise.docs.map((link) => link.url);
  }

  if (precise) {
    const fixes = precise.steps.length ? precise.steps : pipelineFixes;
    return {
      matched: true,
      ruleId: CATEGORY_RULE_IDS[precise.category] ?? "roblox-unknown",
      title: precise.title,
      rootCause: precise.causes[0]
        ? `${precise.summary} ${lang === "tr" ? "En olası sebep:" : "Most likely:"} ${precise.causes[0].text}.`
        : precise.summary,
      fix: fixes[0] ?? "",
      correctedExample: precise.fixCode?.after,
      severity: precise.severity,
      confidence: precise.confidence,
      causes: precise.causes.map((item) => ({
        percent: LIKELIHOOD_PERCENT[item.likelihood],
        text: item.text,
      })),
      fixes,
      codeInsights: precise.warnings.map((w) => ({ title: w.title, description: w.message })),
      deprecatedApis: [],
      advanced,
      precise,
    };
  }

  return analyzeDynamicOnly(dynamic!, advanced!, pipelineFixes);
}

function analyzeDynamicOnly(
  dynamic: NonNullable<ReturnType<typeof runDynamicRobloxPipeline>>,
  advanced: AdvancedAnalyzerOutput,
  fixes: string[],
): AnalyzerResult {
  const causes: Cause[] = dynamic.hypotheses.map((item) => ({
    percent: item.confidence,
    text: `${item.title}: ${item.rootCause}`,
  }));

  const analysisLike: Analysis = {
    explanation: dynamic.explanation,
    causes,
    fixes,
    severity: dynamic.severity,
    confidence: dynamic.confidence,
    codeInsights: dynamic.bestPractices.map((item) => ({
      title: item.title,
      description: item.description,
    })),
    deprecatedApis: [],
  };

  return {
    matched: true,
    ruleId: LEGACY_RULE_IDS[dynamic.family] ?? "roblox-unknown",
    title: dynamic.title,
    rootCause: dynamic.likelyRootCause,
    causeChain: dynamic.rootCauseChain
      ? {
          primaryCause: dynamic.rootCauseChain.primaryCause.description,
          intermediateCauses: dynamic.rootCauseChain.intermediateCauses.map(
            (item) => item.description,
          ),
          surfaceError: dynamic.rootCauseChain.surfaceError.description,
        }
      : undefined,
    fix: fixes[0],
    correctedExample: undefined,
    severity: analysisLike.severity,
    confidence: analysisLike.confidence,
    codeInsights: analysisLike.codeInsights,
    deprecatedApis: analysisLike.deprecatedApis as DeprecatedApi[],
    causes: analysisLike.causes,
    fixes: analysisLike.fixes,
    advanced,
  };
}
