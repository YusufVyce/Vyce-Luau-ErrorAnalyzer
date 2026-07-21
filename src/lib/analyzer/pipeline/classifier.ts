import type { ClassifiedError, ErrorFamily } from "./types";

const FAMILY_PATTERNS: Array<{ family: ErrorFamily; pattern: RegExp }> = [
  { family: "CALL_NIL", pattern: /attempt to call (?:a )?nil/ },
  { family: "INDEX_NIL", pattern: /attempt to index nil/ },
  { family: "CONCAT_NIL", pattern: /attempt to concatenate nil/ },
  { family: "ARITHMETIC_NIL", pattern: /attempt to perform arithmetic on nil|arithmetic on nil/ },
  { family: "COMPARE_NIL", pattern: /attempt to compare nil/ },
  { family: "INVALID_ARGUMENT", pattern: /invalid argument|bad argument/ },
  { family: "INVALID_MEMBER", pattern: /is not a valid member|invalid member/ },
  { family: "INVALID_TYPE", pattern: /unable to cast|cannot cast|expected .* got/ },
  { family: "DATASTORE", pattern: /datastore|getasync|setasync|updateasync/ },
  { family: "REMOTE", pattern: /remoteevent|remotefunction|fireserver|fireclient|invokeserver|invokeclient/ },
  { family: "TWEEN", pattern: /tween|cannot be tweened|tweenservice/ },
  { family: "CHARACTER", pattern: /characteradded|humanoid|rootpart|localplayer\.character/ },
  { family: "WAIT", pattern: /waitforchild|findfirstchild|infinite yield/ },
  { family: "TIMEOUT", pattern: /script timeout|yielded/ },
  { family: "HTTP", pattern: /httpservice|getasync|postasync|requestasync/ },
  { family: "MEMORY", pattern: /memory|leak|overflow/ },
];

export function classifyErrorFamily(compactLog: string): ClassifiedError {
  const lineMatch = compactLog.match(/:(\d+):/);
  const lineReference = lineMatch ? Number.parseInt(lineMatch[1], 10) : undefined;

  for (const entry of FAMILY_PATTERNS) {
    if (entry.pattern.test(compactLog)) {
      return {
        family: entry.family,
        strategy: "exact",
        matchedPattern: entry.pattern.source,
        lineReference,
      };
    }
  }

  if (compactLog.length > 0) {
    return {
      family: "UNKNOWN",
      strategy: "fallback",
      lineReference,
    };
  }

  return {
    family: "UNKNOWN",
    strategy: "none",
  };
}
