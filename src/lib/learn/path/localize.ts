import { localizeCode, localizeOutput } from "../codeTr";
import type { Lang, Step } from "./types";

/** A step with its code samples (comments, printed text) in the given language. */
export function localizeStep<T extends Step>(step: T, lang: Lang): T {
  if (lang !== "tr") return step;
  const code = (c: string) => localizeCode(c, lang);
  switch (step.kind) {
    case "learn":
      return {
        ...step,
        code: step.code && code(step.code),
        walk: step.walk?.map((w) => ({ ...w, line: code(w.line) })),
      };
    case "choice":
      return {
        ...step,
        code: step.code && code(step.code),
        options: step.options.map((o) => (typeof o === "string" ? code(o) : o)),
      };
    case "fill":
      return { ...step, code: code(step.code), options: step.options.map(code) };
    case "order":
      return { ...step, lines: step.lines.map(code) };
    case "predict":
      return {
        ...step,
        code: code(step.code),
        options: step.options.map((o) => (typeof o === "string" ? localizeOutput(o, lang) : o)),
      };
  }
  return step;
}
