import { escapeRegExp, locateLine, sanitizeCode, splitLines, type LocatedLine } from "./codeTools";
import type { DiagnoseContext, DiagnosisCause, PreciseDiagnosis, SignatureResult } from "./types";

export function ev(points: number, reason: string) {
  return { points, reason };
}

export function locationOf(
  located: LocatedLine | undefined,
  culprit?: string,
): PreciseDiagnosis["location"] {
  if (!located) return undefined;
  return { line: located.line, code: located.text, exact: located.exact, culprit };
}

/** Evidence entries for how the failing line was found. */
export function locationEvidence(located: LocatedLine | undefined, ctx: DiagnoseContext) {
  if (!located) {
    return ctx.hasCode ? [ev(-4, "couldn't find the failing line in the pasted code")] : [];
  }
  return located.exact
    ? [ev(14, `line ${located.line} of your code matches the error's line number`)]
    : [ev(7, `found a matching line in your code (line ${located.line})`)];
}

/** Finds a line that uses `.key`, `:key` or `["key"]`. */
export function locateMember(ctx: DiagnoseContext, key: string) {
  const k = escapeRegExp(key);
  const dot = new RegExp(`[.:]\\s*${k}\\b`);
  const bracket = new RegExp(`\\[\\s*["']${k}["']\\s*\\]`);
  return locateLine(ctx.code, ctx.log.line, (clean, raw) => dot.test(clean) || bracket.test(raw));
}

export function locateRegex(ctx: DiagnoseContext, pattern: RegExp, useRaw = false) {
  return locateLine(ctx.code, ctx.log.line, (clean, raw) => pattern.test(useRaw ? raw : clean));
}

/** The line at the log's line number, if the snippet has that many lines. */
export function exactLine(ctx: DiagnoseContext) {
  const line = ctx.log.line;
  if (!line || !ctx.hasCode) return undefined;
  const raw = splitLines(ctx.code);
  if (line > raw.length || !raw[line - 1].trim()) return undefined;
  return {
    line,
    text: raw[line - 1].trim(),
    exact: true,
    clean: splitLines(sanitizeCode(ctx.code))[line - 1],
  };
}

/** Splits the arguments of the first call to `fnPattern` on a line (respects nested parens/strings). */
export function callArguments(
  line: string,
  fnPattern: RegExp,
): { args: string[]; method: boolean } | undefined {
  const m = fnPattern.exec(line);
  if (!m) return undefined;
  const start = line.indexOf("(", m.index + m[0].length - 1);
  if (start === -1) return undefined;
  const method = /:\s*\w+\s*\($/.test(line.slice(0, start + 1));
  const args: string[] = [];
  let depth = 0;
  let current = "";
  let quote: string | null = null;
  for (let i = start + 1; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      current += ch;
      if (ch === quote && line[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    if (ch === ")" || ch === "}" || ch === "]") {
      if (depth === 0) {
        if (current.trim()) args.push(current.trim());
        return { args, method };
      }
      depth--;
    }
    if (ch === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return { args, method };
}

export function cause(
  text: string,
  likelihood: DiagnosisCause["likelihood"],
  detail?: string,
  confirmedInCode = false,
): DiagnosisCause {
  return { text, detail, likelihood, confirmedInCode };
}

/** Puts confirmed causes first and drops duplicates. */
export function rankCauses(causes: DiagnosisCause[]): DiagnosisCause[] {
  const seen = new Set<string>();
  const unique = causes.filter((c) => (seen.has(c.text) ? false : (seen.add(c.text), true)));
  const weight = (c: DiagnosisCause) =>
    (c.confirmedInCode ? 0 : 3) +
    (c.likelihood === "likely" ? 0 : c.likelihood === "possible" ? 1 : 2);
  const ranked = unique.sort((a, b) => weight(a) - weight(b));
  // Once the code confirms a cause, generic guesses become secondary.
  if (ranked[0]?.confirmedInCode) {
    return ranked.map((c, i) =>
      i > 0 && !c.confirmedInCode && c.likelihood === "likely"
        ? { ...c, likelihood: "possible" }
        : c,
    );
  }
  return ranked;
}

export function result(
  partial: Omit<SignatureResult, "evidence"> & { evidence?: SignatureResult["evidence"] },
): SignatureResult {
  return { ...partial, evidence: partial.evidence ?? [] };
}

export const q = (s: string) => `\`${s}\``;
