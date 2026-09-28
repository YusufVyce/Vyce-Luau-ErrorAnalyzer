/**
 * Precise diagnosis: recognizes the exact Roblox/Luau error message, finds the
 * failing line in the pasted code, traces where the bad value came from, and
 * scores confidence from the evidence it actually verified.
 *
 * Confidence is additive and explainable:
 *   base (how specific the recognized message is)
 *   + evidence found in the code (line match, traced nil source, typo, …)
 *   - penalties (no code for a code-dependent error, line not found)
 * Every step is recorded in `confidenceReasons`, so the UI can show *why*.
 */
import { parseLog, sideFromCode, type Side } from "./codeTools";
import { docs } from "./docs";
import { cause } from "./helpers";
import { lintCode } from "./lint";
import { NIL_SIGNATURES } from "./signaturesNil";
import { ROBLOX_SIGNATURES } from "./signaturesRoblox";
import type {
  CodeWarning,
  DiagnoseContext,
  DiagnosisCategory,
  PreciseDiagnosis,
  Signature,
} from "./types";

export const SIGNATURES: Signature[] = [...NIL_SIGNATURES, ...ROBLOX_SIGNATURES];

/** Categories whose root cause usually lives in the user's code (vs. settings/service state). */
const CODE_DEPENDENT = new Set<DiagnosisCategory>([
  "index-nil",
  "call-nil",
  "arithmetic",
  "concatenate",
  "compare",
  "invalid-argument",
  "table",
  "stack-overflow",
  "timeout",
  "syntax",
  "invalid-member",
  "invalid-type",
]);

const MAX_EVIDENCE_BONUS = 36;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function resolveSide(logSide: Side, code: string): Side {
  if (logSide !== "unknown") return logSide;
  return code.trim() ? sideFromCode(code) : "unknown";
}

function warningsToCauses(warnings: CodeWarning[]) {
  return warnings
    .filter((w) => w.severity !== "info")
    .slice(0, 4)
    .map((w) =>
      cause(
        `${w.title}${w.line ? ` (line ${w.line})` : ""}`,
        w.severity === "error" ? "likely" : "possible",
        w.message,
        true,
      ),
    );
}

export function diagnose(logText: string, codeText: string): PreciseDiagnosis | null {
  const log = parseLog(typeof logText === "string" ? logText : "");
  const code = typeof codeText === "string" ? codeText : "";
  const hasCode = code.trim().length > 0;
  if (!log.message.trim() && !hasCode) return null;

  const side = resolveSide(log.side, code);
  const ctx: DiagnoseContext = { log, code, hasCode, side };
  const warnings = lintCode(code, log.scriptPath);

  // Code only: report static findings.
  if (!log.message.trim()) {
    const errors = warnings.filter((w) => w.severity === "error");
    const first = warnings[0];
    return {
      id: "code-check",
      category: "code-check",
      title:
        warnings.length === 0
          ? "No common problems found"
          : `${warnings.length} possible problem${warnings.length === 1 ? "" : "s"} in this code`,
      severity: errors.length ? "High" : warnings.length ? "Medium" : "Low",
      summary:
        warnings.length === 0
          ? "The code doesn't match any of the common Roblox mistakes this tool checks for. Paste the error from the Output window for a real diagnosis."
          : `${first.title}${first.line ? ` on line ${first.line}` : ""}.`,
      explanation:
        "Without an error message this is a static check: it looks for patterns that are known to break Roblox scripts. For a precise answer, run the game, copy the red error from Output and paste it too.",
      location: first?.line
        ? {
            line: first.line,
            code: code.split(/\r?\n/)[first.line - 1]?.trim() ?? "",
            exact: false,
          }
        : undefined,
      causes: warningsToCauses(warnings),
      steps: warnings
        .slice(0, 5)
        .map((w) => (w.fix && !w.fix.includes("\n") ? `${w.title}: ${w.fix}` : w.title)),
      fixCode: first?.fix?.includes("\n") ? { after: first.fix } : undefined,
      docs: docs("robloxGlobals", "guideLuau"),
      confidence: errors.length ? 70 : warnings.length ? 45 : 20,
      confidenceReasons: errors.length
        ? [
            "no error message — based on static checks only",
            `${errors.length} definite mistake(s) found in the code`,
          ]
        : ["no error message — based on static checks only"],
      side,
      scriptPath: log.scriptPath,
      message: "",
      warnings,
      recognized: warnings.length > 0,
    };
  }

  for (const signature of SIGNATURES) {
    const match = log.message.match(signature.pattern);
    if (!match) continue;

    const res = signature.analyze(match, ctx);
    const reasons: string[] = [`recognized Roblox message "${match[0].slice(0, 80)}"`];
    let score = signature.base;

    const bonus = res.evidence.reduce((sum, e) => sum + e.points, 0);
    const boundedBonus = Math.min(MAX_EVIDENCE_BONUS, bonus);
    score += boundedBonus;
    for (const e of res.evidence)
      reasons.push(`${e.points >= 0 ? "+" : ""}${e.points}: ${e.reason}`);

    if (CODE_DEPENDENT.has(signature.category)) {
      if (!hasCode) {
        score -= 8;
        reasons.push("-8: no code pasted, so the cause is inferred from the message only");
      } else if (!res.causes.some((c) => c.confirmedInCode)) {
        score -= 4;
        reasons.push("-4: the code didn't confirm a specific cause");
      }
    }
    if (log.line === undefined && CODE_DEPENDENT.has(signature.category) && hasCode) {
      reasons.push("the error had no line number, so the line was found by searching");
    }

    // Surface related static findings as extra causes (e.g. a typo lint on the failing line).
    const confirmed = res.causes.some((c) => c.confirmedInCode);
    const relatedWarnings = confirmed
      ? []
      : warnings.filter(
          (w) => w.severity === "error" && res.location && w.line === res.location.line,
        );
    if (relatedWarnings.length) {
      score += 10;
      reasons.push("+10: a static check flags the same line");
    }
    const causes = [...res.causes, ...warningsToCauses(relatedWarnings)];

    return {
      id: signature.id,
      category: signature.category,
      title: res.title,
      severity: res.severity,
      summary: res.summary,
      explanation: res.explanation,
      location: res.location,
      causes,
      steps: res.steps,
      fixCode: res.fixCode,
      docs: res.docs,
      confidence: clamp(score, 25, 97),
      confidenceReasons: reasons,
      side,
      scriptPath: log.scriptPath,
      message: log.message,
      warnings,
      recognized: true,
    };
  }

  // Unrecognized message: be honest, and lean on the static checks.
  const staticCauses = warningsToCauses(warnings);
  return {
    id: "unrecognized",
    category: "unknown",
    title: "Error not recognized",
    severity: "Medium",
    summary:
      "This message isn't one of the Roblox errors this tool knows yet, so there's no exact diagnosis.",
    explanation:
      "The analyzer only gives specific answers for errors it recognizes — it won't invent one. Below are general next steps and anything suspicious it found in your code.",
    causes: staticCauses.length
      ? staticCauses
      : [
          cause(
            "Check the first red error in Output — later errors are often side effects of the first one",
            "possible",
          ),
          cause(
            "If it's a warning from a plugin or Roblox itself (not your script), it may be safe to ignore",
            "possible",
          ),
        ],
    steps: [
      "Click the error in Output to jump to the line.",
      "Print the values used on that line to see which one is unexpected.",
      "Paste the first error of the chain (and the script) here.",
    ],
    docs: docs("robloxGlobals", "guideLuau"),
    confidence: staticCauses.length ? 35 : 20,
    confidenceReasons: [
      "message not recognized",
      ...(staticCauses.length ? ["static checks found problems in the code"] : []),
    ],
    side,
    scriptPath: log.scriptPath,
    message: log.message,
    warnings,
    recognized: false,
  };
}
