import type { DocLink } from "./docs";
import type { ParsedLog, Side } from "./codeTools";

export type DiagnosisSeverity = "Low" | "Medium" | "High" | "Critical";

export type DiagnosisCategory =
  | "index-nil"
  | "call-nil"
  | "arithmetic"
  | "concatenate"
  | "compare"
  | "invalid-argument"
  | "invalid-member"
  | "invalid-type"
  | "wait"
  | "timeout"
  | "stack-overflow"
  | "table"
  | "syntax"
  | "module"
  | "remote"
  | "datastore"
  | "http"
  | "tween"
  | "animation"
  | "asset"
  | "instance"
  | "coroutine"
  | "code-check"
  | "unknown";

export type Likelihood = "likely" | "possible" | "unlikely";

export interface DiagnosisCause {
  text: string;
  detail?: string;
  likelihood: Likelihood;
  /** true when the snippet itself shows this happening (not just a general guess). */
  confirmedInCode: boolean;
}

export interface CodeWarning {
  id: string;
  title: string;
  message: string;
  line?: number;
  severity: "info" | "warning" | "error";
  fix?: string;
}

export interface FixCode {
  before?: string;
  after: string;
  caption?: string;
}

export interface PreciseDiagnosis {
  id: string;
  category: DiagnosisCategory;
  title: string;
  severity: DiagnosisSeverity;
  /** One plain sentence: what went wrong. */
  summary: string;
  /** Two or three beginner-friendly sentences on why Roblox raised it. */
  explanation: string;
  location?: { line: number; code: string; exact: boolean; culprit?: string };
  causes: DiagnosisCause[];
  steps: string[];
  fixCode?: FixCode;
  docs: DocLink[];
  confidence: number;
  confidenceReasons: string[];
  side: Side;
  scriptPath?: string;
  message: string;
  warnings: CodeWarning[];
  /** false when the message wasn't recognized and only generic advice is available. */
  recognized: boolean;
  /** Everyday comparison for beginners. */
  analogy?: string;
  /** The failing expression walked through piece by piece. */
  breakdown?: Array<{ code: string; state: "ok" | "nil" | "error"; note: string }>;
  /** Short definitions of the scripting words used in this explanation. */
  glossary?: Array<{ term: string; meaning: string }>;
  /** The user's whole script with the fix applied (only when it still parses). */
  patched?: { code: string; changed: number[] };
}

export interface DiagnoseContext {
  log: ParsedLog;
  code: string;
  hasCode: boolean;
  side: Side;
}

/**
 * What a signature handler returns. `evidence` feeds the confidence score:
 * each entry is a concrete fact the handler verified.
 */
export interface SignatureResult {
  title: string;
  severity: DiagnosisSeverity;
  summary: string;
  explanation: string;
  location?: PreciseDiagnosis["location"];
  causes: DiagnosisCause[];
  steps: string[];
  fixCode?: FixCode;
  docs: DocLink[];
  evidence: Array<{ points: number; reason: string }>;
}

export interface Signature {
  id: string;
  category: DiagnosisCategory;
  pattern: RegExp;
  /** How specific the message itself is (0-60). Exact Roblox wording with captures scores highest. */
  base: number;
  analyze: (match: RegExpMatchArray, ctx: DiagnoseContext) => SignatureResult;
}
