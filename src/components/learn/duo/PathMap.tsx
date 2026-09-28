import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Brain,
  Check,
  Crown,
  Flame,
  Lock,
  PenLine,
  Star,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import { CHAPTERS, LESSONS } from "@/lib/learn/lessons";
import { chapterName, lessonTitle } from "@/lib/learn/lessons.tr";
import { exerciseFor } from "@/lib/learn/homework/exercises";
import { greeting } from "@/lib/learn/motivation";
import { PATH } from "@/lib/learn/path";
import {
  DAILY_GOALS,
  doneLessonIds,
  lessonComplete,
  lessonUnlocked,
  levelFor,
  streakOf,
  today,
  todayXp,
  type Progress,
} from "@/lib/learn/progress";
import type { Lang } from "@/lib/learn/path/types";
import type { TFunction } from "@/lib/prefs";
import { Bubble, Mascot } from "./Mascot";

const OFFSETS = [0, 1, 2, 1, 0, -1, -2, -1];
const STEP_PX = 46;

type NodeState = "done" | "current" | "open" | "locked";

export interface PathActions {
  start: (lessonId: string) => void;
  notes: (lessonId: string) => void;
  review: () => void;
  setGoal: (xp: number) => void;
}

function GoalRing({ value, goal, size = 64 }: { value: number; goal: number; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const k = Math.min(1, value / goal);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth="7"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={k >= 1 ? "var(--ok)" : "var(--gold)"}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${c * k} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.2,0.9,0.3,1)" }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size / 4.2}
        fontWeight="800"
        fill="var(--ink)"
        fontFamily="Geist Mono, ui-monospace, monospace"
      >
        {k >= 1 ? "✓" : `${Math.round(k * 100)}%`}
      </text>
    </svg>
  );
}

function StatsCards({
  progress,
  lang,
  t,
  actions,
  canReview,
}: {
  progress: Progress;
  lang: Lang;
  t: TFunction;
  actions: PathActions;
  canReview: boolean;
}) {
  const streak = streakOf(progress.days);
  const xpToday = todayXp(progress);
  const goal = progress.dailyGoal;
  const lvl = levelFor(progress.xp);
  const week = useMemo(() => {
    const out: Array<{ label: string; on: boolean; isToday: boolean }> = [];
    const set = new Set(progress.days);
    const fmt = new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", { weekday: "narrow" });
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push({ label: fmt.format(d), on: set.has(today(d)), isToday: i === 0 });
    }
    return out;
  }, [progress.days, lang]);

  return (
    <div className="space-y-4">
      <div className="ep-card space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Flame
            className={`h-10 w-10 ${streak > 0 ? "vy-flame fill-[var(--syn-orange)] text-[var(--syn-orange)]" : "text-line-strong"}`}
            aria-hidden="true"
          />
          <div>
            <div className="font-mono text-2xl font-extrabold text-ink">{streak}</div>
            <div className="text-[13px] text-ink-3">
              {streak > 0 ? t("duo.streakDays", { n: streak }) : t("duo.streakNone")}
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          {week.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                  d.on
                    ? "bg-[var(--syn-orange)] text-[#2a1000]"
                    : d.isToday
                      ? "border-2 border-dashed border-[var(--syn-orange)] text-ink-3"
                      : "bg-surface-2 text-ink-3"
                }`}
              >
                {d.on ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} aria-hidden="true" /> : ""}
              </span>
              <span className="text-[11px] text-ink-3">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ep-card space-y-4 p-5">
        <div className="flex items-center gap-4">
          <GoalRing value={xpToday} goal={goal} />
          <div className="min-w-0">
            <div className="font-bold text-ink">{t("duo.dailyGoal")}</div>
            <div className="font-mono text-[13px] text-ink-2">
              {xpToday} / {goal} XP
            </div>
            <div className="text-[13px] text-ink-3">
              {xpToday >= goal ? t("duo.goalDone") : t("duo.goalLeft", { n: goal - xpToday })}
            </div>
          </div>
        </div>
        <div>
          <div className="mb-2 text-[12px] text-ink-3">{t("duo.goalPick")}</div>
          <div className="grid grid-cols-4 gap-1.5">
            {DAILY_GOALS.map((g) => (
              <button
                key={g.xp}
                type="button"
                onClick={() => actions.setGoal(g.xp)}
                aria-pressed={goal === g.xp}
                className={`rounded-xl border-2 px-1 py-1.5 text-center transition-colors ${
                  goal === g.xp
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line text-ink-3 hover:border-line-strong hover:text-ink"
                }`}
              >
                <span className="block text-[11px] font-bold">{g[lang]}</span>
                <span className="block font-mono text-[10px]">{g.xp}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Link
        to="/profile"
        className="ep-card group block space-y-3 p-5 transition-colors hover:border-brand-line"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand),var(--syn-purple))] font-mono text-lg font-extrabold text-white">
              {lvl.level}
            </span>
            <div>
              <div className="font-bold text-ink">{lvl.title}</div>
              <div className="inline-flex items-center gap-1 font-mono text-[13px] text-ink-3">
                <Zap
                  className="h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]"
                  aria-hidden="true"
                />
                {progress.xp} XP
              </div>
            </div>
          </div>
          <User className="h-5 w-5 text-ink-3 group-hover:text-brand" aria-hidden="true" />
        </div>
        <div className="vy-bar !h-3">
          <div style={{ width: `${Math.max(4, lvl.progress * 100)}%` }} />
        </div>
      </Link>

      <div className="ep-card space-y-3 p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--syn-purple)_18%,transparent)] text-[var(--syn-purple)]">
            <Brain className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="font-bold text-ink">{t("duo.review")}</div>
            <div className="text-[13px] text-ink-3">
              {canReview ? t("duo.reviewDesc") : t("duo.reviewLocked")}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="vy-btn vy-btn-ghost w-full !py-2.5"
          disabled={!canReview}
          onClick={actions.review}
        >
          {t("duo.reviewStart")}
        </button>
      </div>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= n ? "fill-[var(--gold)] text-[var(--gold-dark)]" : "text-line-strong"}`}
        />
      ))}
    </span>
  );
}

export function PathMap({
  progress,
  lang,
  t,
  actions,
}: {
  progress: Progress;
  lang: Lang;
  t: TFunction;
  actions: PathActions;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const currentRef = useRef<HTMLDivElement>(null);

  const states = useMemo(() => {
    const firstOpen = LESSONS.findIndex((l) => !lessonComplete(progress, l));
    return LESSONS.map((l, i): NodeState => {
      if (lessonComplete(progress, l)) return "done";
      if (i === firstOpen) return "current";
      return lessonUnlocked(progress, i) ? "open" : "locked";
    });
  }, [progress]);
  const currentIdx = states.indexOf("current");
  const reviewable = doneLessonIds(progress).length > 0;

  const units = useMemo(
    () =>
      CHAPTERS.map((chapter) => ({
        chapter,
        lessons: LESSONS.map((l, i) => ({ l, i })).filter(({ l }) => l.chapter === chapter),
      })),
    [],
  );

  useEffect(() => {
    if (currentIdx > 2) currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    // only on first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setOpen(null);
        return;
      }
      if (!(e.target as HTMLElement).closest("[data-node]")) setOpen(null);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  const streak = streakOf(progress.days);
  const xpToday = todayXp(progress);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-12">
        {/* Compact stats for small screens (the full cards are in the sidebar) */}
        <div className="ep-card flex items-center justify-between gap-2 px-4 py-3 lg:hidden">
          <span className="inline-flex items-center gap-1.5 font-mono text-[15px] font-bold text-[var(--syn-orange)]">
            <Flame
              className={`h-5 w-5 ${streak > 0 ? "vy-flame fill-current" : "opacity-40"}`}
              aria-hidden="true"
            />
            {streak}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[15px] font-bold text-ink">
            <Zap className="h-5 w-5 fill-[var(--gold)] text-[var(--gold)]" aria-hidden="true" />
            {progress.xp}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[13px] text-ink-2">
            <GoalRing value={xpToday} goal={progress.dailyGoal} size={34} />
            {xpToday}/{progress.dailyGoal}
          </span>
          <button
            type="button"
            className="vy-btn vy-btn-ghost !px-3 !py-2"
            disabled={!reviewable}
            onClick={actions.review}
            aria-label={t("duo.review")}
            title={t("duo.review")}
          >
            <Brain className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {units.map(({ chapter, lessons }, u) => {
          const unitDone = lessons.every(({ i }) => states[i] === "done");
          const doneCount = lessons.filter(({ i }) => states[i] === "done").length;
          const hasCurrent = lessons.some(({ i }) => states[i] === "current");
          const unitLocked = lessons.every(({ i }) => states[i] === "locked");
          const name = chapterName(chapter, lang).replace(/^\d+\s*·\s*/, "");
          const chestId = `chest-${u}`;
          return (
            <section key={chapter} className={`vy-unit-${u} space-y-2`} aria-label={name}>
              <div className="vy-banner flex items-center justify-between gap-4 rounded-2xl px-5 py-4">
                <div className="min-w-0">
                  <div className="text-[12px] font-extrabold tracking-[0.14em] uppercase opacity-75">
                    {t("duo.unit", { n: u + 1 })}
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">{name}</h2>
                </div>
                <div className="shrink-0 rounded-xl bg-black/10 px-3 py-1.5 font-mono text-sm font-bold">
                  {doneCount}/{lessons.length}
                </div>
              </div>

              <div className="relative flex flex-col items-center gap-7 pt-10 pb-4">
                {lessons.map(({ l, i }, k) => {
                  const state = states[i];
                  const x = OFFSETS[k % OFFSETS.length] * STEP_PX;
                  const p = PATH[l.id];
                  const stars = progress.stars[l.id] ?? 0;
                  const hwPending =
                    state !== "done" &&
                    Boolean(exerciseFor(l.id)) &&
                    progress.quiz.includes(l.id) &&
                    !progress.homework.includes(l.id);
                  const isOpen = open === l.id;
                  const mascotHere = k === Math.min(1, lessons.length - 1);
                  return (
                    <div
                      key={l.id}
                      ref={state === "current" ? currentRef : undefined}
                      className={`relative ${isOpen ? "z-30" : ""} ${state === "current" ? "mt-6" : ""}`}
                      style={{ transform: `translateX(${x}px)` }}
                      data-node
                    >
                      {state === "current" && !isOpen && (
                        <div className="vy-bounce pointer-events-none absolute -top-11 left-1/2 z-10 -translate-x-1/2">
                          <div className="vy-bubble vy-bubble-up px-3 py-1.5 text-[13px] font-extrabold tracking-wide whitespace-nowrap text-[var(--u-dark)] uppercase">
                            {hwPending ? t("duo.hwLeft") : t("duo.startLesson")}
                          </div>
                        </div>
                      )}
                      {mascotHere && (
                        <div
                          className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 sm:block ${
                            x >= 0 ? "right-full mr-16" : "left-full ml-16"
                          }`}
                        >
                          <Mascot
                            mood={unitDone ? "cheer" : hasCurrent ? "happy" : "idle"}
                            size={96}
                            className={unitLocked ? "opacity-50 grayscale" : ""}
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        className="vy-node"
                        data-state={state === "open" || state === "current" ? undefined : state}
                        onClick={() => setOpen(isOpen ? null : l.id)}
                        aria-expanded={isOpen}
                        aria-label={`${lessonTitle(l, lang)}: ${t(
                          state === "done"
                            ? "learn.completed"
                            : state === "locked"
                              ? "learn.locked"
                              : "duo.startLesson",
                        )}`}
                      >
                        {state === "current" && (
                          <span className="vy-node-ring" aria-hidden="true" />
                        )}
                        {state === "done" ? (
                          <Check className="h-8 w-8" strokeWidth={4} aria-hidden="true" />
                        ) : (
                          <span
                            className={`text-[30px] leading-none ${state === "locked" ? "opacity-40 grayscale" : ""}`}
                            aria-hidden="true"
                          >
                            {p?.emoji ?? "⭐"}
                          </span>
                        )}
                        {state === "locked" && (
                          <span className="absolute -right-1 -bottom-1 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-canvas bg-surface-2 text-ink-3">
                            <Lock className="h-3 w-3" aria-hidden="true" />
                          </span>
                        )}
                        {hwPending && (
                          <span className="absolute -right-1 -bottom-1 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-canvas bg-[var(--syn-orange)] text-[#2a1000]">
                            <PenLine className="h-3 w-3" aria-hidden="true" />
                          </span>
                        )}
                      </button>
                      {state === "done" && stars > 0 && (
                        <div className="mt-2.5 flex justify-center">
                          <Stars n={stars} />
                        </div>
                      )}
                      {isOpen && (
                        <div
                          style={{ marginLeft: -x }}
                          className={`vy-pop absolute top-full left-1/2 z-20 mt-4 w-72 -translate-x-1/2 rounded-2xl p-4 shadow-2xl ${
                            state === "locked"
                              ? "border-2 border-line bg-surface text-ink-2"
                              : "bg-[var(--u)] text-[var(--node-ink)]"
                          }`}
                          role="dialog"
                          aria-label={lessonTitle(l, lang)}
                        >
                          <div className="space-y-1">
                            <div className="text-[12px] font-bold tracking-wide uppercase opacity-75">
                              {t("duo.lessonN", { n: i + 1, total: LESSONS.length })}
                            </div>
                            <div className="text-[17px] leading-snug font-extrabold">
                              {p?.emoji} {lessonTitle(l, lang)}
                            </div>
                            {state === "done" && stars > 0 && <Stars n={stars} />}
                          </div>
                          {state === "locked" ? (
                            <p className="mt-3 text-[14px]">{t("duo.lockedHint")}</p>
                          ) : (
                            <div className="mt-4 grid gap-2">
                              <button
                                type="button"
                                className="vy-btn !bg-white !text-[var(--u-dark)] ![box-shadow:0_4px_0_rgba(0,0,0,0.22)]"
                                onClick={() => actions.start(l.id)}
                                autoFocus
                              >
                                {state === "done"
                                  ? t("duo.practice")
                                  : hwPending
                                    ? t("duo.continueHw")
                                    : t("duo.startLesson")}
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-[13px] font-bold tracking-wide uppercase opacity-80 hover:opacity-100"
                                onClick={() => actions.notes(l.id)}
                              >
                                <BookOpen className="h-4 w-4" aria-hidden="true" />
                                {t("duo.notes")}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unit chest */}
                <div
                  className={`relative ${open === chestId ? "z-30" : ""}`}
                  style={{
                    transform: `translateX(${OFFSETS[lessons.length % OFFSETS.length] * STEP_PX}px)`,
                  }}
                  data-node
                >
                  <button
                    type="button"
                    className="vy-node vy-chest"
                    data-state={unitDone ? "done" : "locked"}
                    onClick={() => setOpen(open === chestId ? null : chestId)}
                    aria-expanded={open === chestId}
                    aria-label={unitDone ? t("duo.unitDone") : t("duo.unitTodo")}
                  >
                    {unitDone ? (
                      <Crown className="h-8 w-8 fill-current" aria-hidden="true" />
                    ) : (
                      <Trophy className="h-7 w-7" aria-hidden="true" />
                    )}
                  </button>
                  {open === chestId && (
                    <div
                      role="dialog"
                      aria-label={t("duo.unit", { n: u + 1 })}
                      style={{ marginLeft: -OFFSETS[lessons.length % OFFSETS.length] * STEP_PX }}
                      className="vy-pop absolute top-full left-1/2 z-20 mt-4 w-64 -translate-x-1/2 rounded-2xl border-2 border-line bg-surface p-4 text-center text-[14px] text-ink-2 shadow-2xl"
                    >
                      {unitDone ? (
                        <span className="font-bold text-ink">🏆 {t("duo.unitDone")}</span>
                      ) : (
                        t("duo.unitTodo")
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
        {currentIdx === -1 && (
          <div className="ep-card flex flex-col items-center gap-4 p-8 text-center">
            <Mascot mood="cheer" size={120} />
            <h2 className="text-2xl font-extrabold text-ink">{t("duo.courseDone")}</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/challenges" className="vy-btn">
                {t("nav.challenges")}
              </Link>
              <Link to="/profile" className="vy-btn vy-btn-ghost">
                {t("nav.profile")}
              </Link>
            </div>
          </div>
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="space-y-4 lg:sticky lg:top-20">
          <div className="flex items-center gap-3">
            <Mascot mood="happy" size={64} />
            <Bubble className="text-[14px] font-medium">{greeting(lang)}</Bubble>
          </div>
          <StatsCards
            progress={progress}
            lang={lang}
            t={t}
            actions={actions}
            canReview={reviewable}
          />
        </div>
      </aside>
    </div>
  );
}
