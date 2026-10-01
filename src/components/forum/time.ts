import type { Lang } from "@/lib/prefs";

const STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "3 hours ago" / "3 saat önce"; `justNow` under a minute. */
export function timeAgo(ms: number, lang: Lang, justNow: string, now = Date.now()): string {
  const diff = now - ms;
  if (diff < 60_000) return justNow;
  const fmt = new Intl.RelativeTimeFormat(lang === "tr" ? "tr" : "en", { numeric: "auto" });
  for (const [unit, size] of STEPS) {
    if (diff >= size) return fmt.format(-Math.floor(diff / size), unit);
  }
  return justNow;
}

/** Full date and time for a tooltip. */
export function fullDate(ms: number, lang: Lang): string {
  return new Date(ms).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
