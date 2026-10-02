import { SIMPLE_BASE } from "./base";
import { SIMPLE_EXTRA } from "./extra";
import { SIMPLE_PRO } from "./pro";
import type { Simple } from "./types";

export type { Simple, WalkLine } from "./types";

/** The plain-language explanation for every lesson, keyed by lesson id. */
export const SIMPLE: Record<string, Simple> = {
  ...SIMPLE_BASE,
  ...SIMPLE_EXTRA,
  ...SIMPLE_PRO,
};
