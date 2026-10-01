/**
 * The language the analyzer writes its explanations in. diagnose() sets it
 * for the length of one (synchronous) call, so the many small helpers that
 * build sentences don't each need a language parameter.
 */
export type AnalyzerLang = "en" | "tr";

let current: AnalyzerLang = "en";

export function withLang<T>(lang: AnalyzerLang, fn: () => T): T {
  const prev = current;
  current = lang;
  try {
    return fn();
  } finally {
    current = prev;
  }
}

export function analyzerLang(): AnalyzerLang {
  return current;
}

/** The English or Turkish version of a sentence, for the current diagnosis. */
export function tx(en: string, tr: string): string {
  return current === "tr" ? tr : en;
}

const TYPE_TR: Record<string, string> = {
  nil: "nil (boş)",
  number: "sayı (number)",
  string: "metin (string)",
  boolean: "true/false (boolean)",
  table: "tablo",
  function: "fonksiyon",
  userdata: "Roblox objesi",
  Instance: "Roblox objesi",
  value: "değer",
};

/** A Luau type name in plain Turkish, e.g. "string" → "metin (string)". */
export function trType(t: string): string {
  return TYPE_TR[t] ?? t;
}
