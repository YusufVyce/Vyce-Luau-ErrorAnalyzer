import { classifyErrorFamily } from "./classifier";
import { applyConfidenceScores } from "./confidenceScorer";
import { extractContext } from "./contextExtractor";
import { generateExplanation } from "./explanationGenerator";
import { generateFixes } from "./fixGenerator";
import { buildHypotheses } from "./hypothesisBuilder";
import { ROBLOX_DIAGNOSTIC_KNOWLEDGE_BASE } from "./knowledgeBase";
import { normalizeInput } from "./normalizer";
import { analyzePerformance } from "./performanceAnalyzer";
import { getRelatedDiagnostics } from "./relatedDiagnostics";
import { runRuleEngine } from "./ruleEngine";
import { analyzeSecurity } from "./securityAnalyzer";
import { analyzeBestPractices } from "./bestPracticesAnalyzer";
import { tokenizeInput } from "./tokenizer";
import type { DynamicAnalysisResult } from "./types";

export function runDynamicRobloxPipeline(logText: string, codeText: string): DynamicAnalysisResult | null {
  const normalized = normalizeInput(logText, codeText);
  if (!normalized.normalizedLog && !normalized.normalizedCode.trim()) {
    return null;
  }

  const tokenized = tokenizeInput(normalized.compactLog, normalized.normalizedCode);
  const classified = classifyErrorFamily(normalized.compactLog);
  const context = extractContext(normalized.normalizedCode, normalized.normalizedLog);
  const signals = runRuleEngine(classified, context, tokenized, normalized.normalizedLog);
  const hypotheses = applyConfidenceScores(buildHypotheses(signals));
  const selectedHypothesis = hypotheses[0];

  if (!selectedHypothesis) {
    return null;
  }

  const explanationBlock = generateExplanation(selectedHypothesis, classified, context);
  const fixes = generateFixes(selectedHypothesis);
  const relatedDiagnostics = getRelatedDiagnostics(classified, context);
  const performanceNotes = analyzePerformance(context);
  const securityNotes = analyzeSecurity(context);
  const bestPractices = analyzeBestPractices(context);

  const matchingRules = selectedHypothesis.evidence.map((item) => item.id);
  const commonMistakes = selectedHypothesis.relatedErrors.slice(0, 5);

  return {
    title: selectedHypothesis.title,
    family: classified.family,
    strategy: classified.strategy,
    severity: selectedHypothesis.severity,
    confidence: selectedHypothesis.confidence,
    quickSummary: explanationBlock.quickSummary,
    likelyRootCause: selectedHypothesis.rootCause,
    explanation: explanationBlock.explanation,
    hypotheses,
    selectedHypothesis,
    evidence: selectedHypothesis.evidence,
    matchingRules,
    highlightedCode: context.highlights.slice(0, 8),
    fixes,
    docs: selectedHypothesis.docs,
    relatedDiagnostics,
    relatedApis: selectedHypothesis.relatedApis,
    performanceNotes,
    securityNotes,
    bestPractices,
    commonMistakes,
    estimatedFixTime: selectedHypothesis.estimatedFixTime,
    difficulty: selectedHypothesis.difficulty,
    knowledgeBaseSize: ROBLOX_DIAGNOSTIC_KNOWLEDGE_BASE.length,
  };
}
