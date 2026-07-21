import type { Hypothesis } from "./types";

export function generateFixes(selected: Hypothesis): Hypothesis["fixes"] {
  return selected.fixes;
}
