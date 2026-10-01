import { Shield } from "lucide-react";
import { LEAGUES } from "@/lib/account/shared";
import type { Lang } from "@/lib/prefs";

export function leagueName(tier: number, lang: Lang): string {
  const l = LEAGUES[Math.min(LEAGUES.length - 1, Math.max(0, tier))];
  return lang === "tr" ? l.tr : l.en;
}

/** A shield in the league's color, with its number of stars. */
export function LeagueBadge({
  tier,
  lang,
  size = 40,
  label = true,
}: {
  tier: number;
  lang: Lang;
  size?: number;
  label?: boolean;
}) {
  const l = LEAGUES[Math.min(LEAGUES.length - 1, Math.max(0, tier))];
  const name = lang === "tr" ? l.tr : l.en;
  return (
    <span className="inline-flex items-center gap-2" title={name}>
      <span
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size, color: l.color }}
        aria-hidden="true"
      >
        <Shield
          className="h-full w-full"
          fill="currentColor"
          fillOpacity={0.18}
          strokeWidth={1.8}
        />
        <span className="absolute font-mono text-[11px] font-bold" style={{ color: l.color }}>
          {tier + 1}
        </span>
      </span>
      {label && <span className="font-semibold text-ink">{name}</span>}
    </span>
  );
}
