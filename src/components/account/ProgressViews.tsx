import { useT } from "@/lib/prefs";
import { today } from "@/lib/learn/progress";

/** Shared by the private and the public profile page. */
export function LevelRing({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" aria-hidden="true">
      <defs>
        <linearGradient id="lvl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--syn-purple)" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="url(#lvl)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, value))}
        className="transition-[stroke-dashoffset] duration-700"
      />
    </svg>
  );
}

/** GitHub-style grid of the last 18 weeks. */
export function Heatmap({ days }: { days: string[] }) {
  const t = useT();
  const set = new Set(days);
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (17 * 7 + end.getDay()));
  const cells: Array<{ key: string; active: boolean; future: boolean }> = [];
  const d = new Date(start);
  while (cells.length < 18 * 7) {
    const key = today(d);
    cells.push({ key, active: set.has(key), future: d > end });
    d.setDate(d.getDate() + 1);
  }
  return (
    <div className="space-y-2">
      <div
        className="grid w-fit max-w-full auto-cols-[13px] grid-flow-col grid-rows-7 gap-[4px] overflow-x-auto"
        role="img"
        aria-label={t("prof.heatmap")}
      >
        {cells.map((c) => (
          <span
            key={c.key}
            title={c.key}
            className={`h-3 w-3 rounded-[3px] ${
              c.future
                ? "bg-transparent"
                : c.active
                  ? "bg-[linear-gradient(135deg,var(--brand),var(--syn-purple))] shadow-[0_0_8px_-2px_var(--brand)]"
                  : "bg-surface-2"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-ink-3">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-surface-2" /> {t("prof.inactive")}
        <span className="ml-2 h-2.5 w-2.5 rounded-[3px] bg-brand" /> {t("prof.active")}
      </div>
    </div>
  );
}
