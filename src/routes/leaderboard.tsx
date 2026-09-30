import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  Clock,
  Crown,
  Flame,
  Globe2,
  Medal,
  Trophy,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { Mascot } from "@/components/learn/duo/Mascot";
import { getLeaderboard } from "@/lib/account/api";
import { useAccount } from "@/lib/account/client";
import {
  BOARDS,
  type AccountError,
  type Board,
  type LeaderboardResult,
  accountErrorKey,
} from "@/lib/account/shared";
import { levelFor } from "@/lib/learn/progress";
import { useT, type TFunction } from "@/lib/prefs";

type Search = { board?: Board };

export const Route = createFileRoute("/leaderboard")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    board: BOARDS.includes(s.board as Board) ? (s.board as Board) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Leaderboard — Vyce LuaUtility" },
      {
        name: "description",
        content: "Daily, weekly and all-time XP rankings and the longest learning streaks.",
      },
    ],
  }),
  component: LeaderboardPage,
});

const TABS: Array<{
  id: Board;
  key: "lb.day" | "lb.week" | "lb.all" | "lb.streak";
  icon: typeof Trophy;
}> = [
  { id: "day", key: "lb.day", icon: CalendarDays },
  { id: "week", key: "lb.week", icon: CalendarRange },
  { id: "all", key: "lb.all", icon: Globe2 },
  { id: "streak", key: "lb.streak", icon: Flame },
];

function countdown(to: string, now: number, t: TFunction): string {
  const ms = Math.max(0, new Date(to).getTime() - now);
  const mins = Math.floor(ms / 60_000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return t("lb.dh", { d, h });
  return h > 0 ? t("lb.hm", { h, m }) : t("lb.m", { m });
}

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-400" aria-label="1" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-zinc-300" aria-label="2" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-orange-400" aria-label="3" />;
  return <span className="font-mono text-[13px] text-ink-3">{rank}</span>;
}

function LeaderboardPage() {
  const t = useT();
  const acc = useAccount();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/leaderboard" });
  const board: Board = search.board ?? "week";
  const [data, setData] = useState<LeaderboardResult | null>(null);
  const [error, setError] = useState<AccountError | null>(null);
  const [loading, setLoading] = useState(true);
  const now = useNow(30_000);
  const userId = acc.user?.id;
  const userXp = acc.user?.xp;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getLeaderboard({ data: { board } });
      if (r.ok) setData(r);
      else setError(r.error);
    } catch {
      setError("server_error");
    }
    setLoading(false);
  }, [board]);

  // Reload when the board changes or the student's XP moves (after a sync).
  useEffect(() => {
    void load();
  }, [load, userId, userXp]);

  const shown = data?.board === board ? data : null;
  const isStreak = board === "streak";
  const score = (n: number) => (isStreak ? t("lb.days", { n }) : `${n} XP`);
  const inTop = shown?.entries.some((e) => e.id === userId);

  return (
    <PageShell width="max-w-4xl">
      <PageHeader
        sticker={
          <>
            <Trophy className="h-4 w-4 text-brand" aria-hidden="true" /> {t("lb.sticker")}
          </>
        }
        title={
          <>
            {t("lb.title1")} <span className="ep-mark">{t("lb.title2")}</span>
          </>
        }
      >
        {t("lb.lead")}
      </PageHeader>

      <div className="relative z-10 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            className="grid w-full grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1 sm:w-auto"
          >
            {TABS.map(({ id, key, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={board === id}
                onClick={() => navigate({ search: { board: id === "week" ? undefined : id } })}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                  board === id ? "bg-surface text-ink shadow" : "text-ink-3 hover:text-ink"
                }`}
              >
                <Icon className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                {t(key)}
              </button>
            ))}
          </div>
          {shown?.resetsAt && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-ink-3">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {t("lb.resetsIn", { time: countdown(shown.resetsAt, now, t) })}
            </span>
          )}
        </div>

        {acc.status === "user" && shown?.me && !inTop && (
          <div className="ep-card flex items-center justify-between gap-3 border-brand-line p-4">
            <span className="text-[13px] font-medium text-ink">{t("lb.yourRank")}</span>
            <span className="font-mono text-[13px] text-ink-2">
              {shown.me.rank
                ? `#${shown.me.rank} · ${score(shown.me.score)}`
                : t(isStreak ? "lb.notRankedStreak" : "lb.notRanked")}
            </span>
          </div>
        )}

        <section className="ep-card overflow-hidden" aria-busy={loading}>
          {error ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <Mascot mood="sad" size={88} />
              <p className="text-sm text-ink-2">
                {error === "not_configured" ? t("acc.unavailable") : t("lb.loadError")}
              </p>
              {error !== "not_configured" && (
                <>
                  <p className="text-[12px] text-ink-3">{t(accountErrorKey(error))}</p>
                  <button type="button" className="vy-btn" onClick={() => void load()}>
                    {t("lb.retry")}
                  </button>
                </>
              )}
            </div>
          ) : !shown ? (
            <ol className="divide-y divide-line">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="h-14 animate-pulse bg-surface-2/30" />
              ))}
            </ol>
          ) : shown.entries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <Mascot mood="sleepy" size={88} />
              <p className="text-sm text-ink-2">{t("lb.empty")}</p>
            </div>
          ) : (
            <ol className="divide-y divide-line">
              {shown.entries.map((e) => {
                const me = e.id === userId;
                const lvl = levelFor(e.xp);
                return (
                  <li
                    key={e.id}
                    className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${
                      me ? "bg-brand-soft" : e.rank <= 3 ? "bg-surface-2/40" : ""
                    }`}
                  >
                    <span className="inline-flex w-8 shrink-0 justify-center">
                      <RankBadge rank={e.rank} />
                    </span>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand),var(--syn-purple))] font-mono text-sm font-bold text-white">
                      {e.name[0]?.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">
                        {e.name}
                        {me && (
                          <span className="ml-2 rounded-md bg-brand px-1.5 py-0.5 align-middle font-mono text-[10px] font-bold text-white uppercase">
                            {t("lb.you")}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[11px] text-ink-3">
                        {t("lb.level", { n: lvl.level })}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-ink">
                      {isStreak && <Flame className="h-4 w-4 text-orange-400" aria-hidden="true" />}
                      {score(e.score)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {acc.status === "guest" && (
          <div className="ep-card ep-card-accent flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-ink">{t("lb.joinTitle")}</div>
              <p className="text-[13px] text-ink-3">{t("lb.joinBody")}</p>
            </div>
            <Link
              to="/login"
              search={{ mode: "signup", next: "/leaderboard" }}
              className="ep-cta shrink-0 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              {t("acc.tabSignup")}
            </Link>
          </div>
        )}

        <p className="text-[12px] text-ink-3">{t("lb.note")}</p>
      </div>
    </PageShell>
  );
}
