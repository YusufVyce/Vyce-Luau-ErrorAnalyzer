import type { ClassifiedError, ExtractedContext } from "./types";

const BASE_RELATED = [
  "attempt to index nil",
  "attempt to call nil",
  "attempt to concatenate nil",
  "attempt to perform arithmetic on nil",
  "attempt to compare nil",
];

export function getRelatedDiagnostics(classified: ClassifiedError, context: ExtractedContext): string[] {
  const related = new Set<string>(BASE_RELATED);

  if (classified.family === "TWEEN") {
    related.add("property cannot be tweened");
    related.add("unable to cast value for tween goal");
  }
  if (classified.family === "REMOTE" || context.hasRemoteUse) {
    related.add("remote callback is nil");
    related.add("invalid remote argument shape");
  }
  if (classified.family === "DATASTORE" || context.hasDataStoreUse) {
    related.add("request was throttled");
    related.add("datastore budget exceeded");
  }

  return [...related];
}
