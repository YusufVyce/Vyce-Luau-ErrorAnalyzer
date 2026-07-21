import type { TokenizedInput } from "./types";

const TOKEN_RE = /[A-Za-z_][A-Za-z0-9_]*|\d+|[:.(){}\[\],]/g;

export function tokenizeInput(logText: string, codeText: string): TokenizedInput {
  const merged = [logText, codeText].filter(Boolean).join("\n");
  const tokens = merged.match(TOKEN_RE) ?? [];

  const tokenCounts: Record<string, number> = {};
  for (const token of tokens) {
    const key = token.toLowerCase();
    tokenCounts[key] = (tokenCounts[key] ?? 0) + 1;
  }

  const lineTokens = codeText.split("\n").map((line, index) => ({
    line: index + 1,
    tokens: (line.match(TOKEN_RE) ?? []).map((item) => item.toLowerCase()),
  }));

  return {
    tokens: tokens.map((item) => item.toLowerCase()),
    tokenCounts,
    lineTokens,
  };
}
