import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Award,
  Brain,
  BookOpen,
  Code2,
  Crown,
  Flame,
  Rocket,
  Star,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { newlyEarned, type Achievement } from "@/lib/learn/achievements";
import { levelFor, loadProgress, type Progress } from "@/lib/learn/progress";
import { useLang, useT } from "@/lib/prefs";

export const ACHIEVEMENT_ICONS = {
  code: Code2,
  book: BookOpen,
  flame: Flame,
  swords: Swords,
  trophy: Trophy,
  brain: Brain,
  zap: Zap,
  star: Star,
  crown: Crown,
  target: Target,
  rocket: Rocket,
} as const;

/** Latest saved progress, kept in sync with every saveProgress() call. */
export function useLiveProgress(): Progress | null {
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => {
    setP(loadProgress());
    const on = (e: Event) => setP((e as CustomEvent<Progress>).detail);
    window.addEventListener("vyce-progress", on);
    return () => window.removeEventListener("vyce-progress", on);
  }, []);
  return p;
}

/** Level + XP chip for the nav; links to the profile. */
export function XpChip() {
  const t = useT();
  const p = useLiveProgress();
  if (!p) return null;
  const lvl = levelFor(p.xp);
  return (
    <Link
      to="/profile"
      title={t("nav.profile")}
      aria-label={t("nav.profile")}
      className="group inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface/70 px-2 text-[12px] font-medium text-ink-2 transition-colors hover:border-brand-line hover:text-ink"
      activeProps={{ className: "border-brand-line text-ink" }}
    >
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[linear-gradient(135deg,var(--brand),var(--syn-purple))] px-1 font-mono text-[11px] font-bold text-white">
        {lvl.level}
      </span>
      <span className="hidden font-mono lg:inline">{p.xp} XP</span>
    </Link>
  );
}

/** Pops a toast whenever an achievement is unlocked, on any page. */
export function AchievementToaster() {
  const t = useT();
  const lang = useLang();
  const last = useRef<Progress | null>(null);
  const [queue, setQueue] = useState<Achievement[]>([]);

  useEffect(() => {
    last.current = loadProgress();
    const on = (e: Event) => {
      const next = (e as CustomEvent<Progress>).detail;
      if (last.current) {
        const fresh = newlyEarned(last.current, next);
        if (fresh.length) setQueue((q) => [...q, ...fresh]);
      }
      last.current = next;
    };
    window.addEventListener("vyce-progress", on);
    return () => window.removeEventListener("vyce-progress", on);
  }, []);

  useEffect(() => {
    if (!queue.length) return;
    const id = setTimeout(() => setQueue((q) => q.slice(1)), 4200);
    return () => clearTimeout(id);
  }, [queue]);

  const a = queue[0];
  if (!a) return null;
  const Icon = ACHIEVEMENT_ICONS[a.icon];
  return (
    <div
      role="status"
      key={a.id}
      className="ep-glow ep-rise fixed top-20 right-4 z-[60] flex w-[min(360px,calc(100%-2rem))] items-center gap-3 p-3"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand),var(--syn-purple))] text-white shadow-[0_0_24px_-4px_var(--brand)]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1 font-mono text-[11px] text-amber-400">
          <Award className="h-3.5 w-3.5" aria-hidden="true" /> {t("ach.unlocked")}
        </div>
        <div className="font-semibold text-ink">{a.title[lang]}</div>
        <div className="truncate text-[12px] text-ink-3">{a.desc[lang]}</div>
      </div>
    </div>
  );
}
