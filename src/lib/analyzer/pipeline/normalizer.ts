import type { NormalizedInput } from "./types";

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/[\t ]+/g, " ").trim();
}

function compactForMatching(value: string): string {
  return value
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[^a-z0-9_:.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeInput(logText: string, codeText: string): NormalizedInput {
  const originalLog = logText ?? "";
  const originalCode = codeText ?? "";

  const normalizedLog = normalizeWhitespace(originalLog);
  const normalizedCode = originalCode.replace(/\r\n?/g, "\n");

  return {
    originalLog,
    originalCode,
    normalizedLog,
    normalizedCode,
    compactLog: compactForMatching(normalizedLog),
  };
}
