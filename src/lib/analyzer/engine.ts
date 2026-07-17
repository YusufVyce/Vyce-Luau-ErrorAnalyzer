import { buildCodeFacts } from "./parser";
import { detectCodeLanguage, resolvePlatform } from "./language";
import { inferCause } from "./inference";
import type { AnalyzerResult, Platform } from "./types";

export function analyzeCodeContext(
  logText: string,
  codeText: string,
  platformFilter?: Platform | "auto",
): AnalyzerResult {
  console.time('[engine] analyzeCodeContext');
  
  console.time('[engine] resolvePlatform');
  const platform = resolvePlatform(logText, codeText, platformFilter);
  console.timeEnd('[engine] resolvePlatform');
  
  console.time('[engine] detectCodeLanguage');
  const language = detectCodeLanguage(codeText);
  console.timeEnd('[engine] detectCodeLanguage');
  
  console.time('[engine] buildCodeFacts');
  const codeFacts = buildCodeFacts(codeText, language);
  console.timeEnd('[engine] buildCodeFacts');
  
  console.time('[engine] inferCause');
  const result = inferCause(logText, codeFacts, platform);
  console.timeEnd('[engine] inferCause');
  
  console.timeEnd('[engine] analyzeCodeContext');
  return result;
}

export { AnalyzerResult, Platform };
