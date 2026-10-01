import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CalendarRange,
  Clock,
  Crown,
  Flame,
  Globe2,
  Medal,
  Shield,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/account/Avatar";
import { LeagueBadge, leagueName } from "@/components/account/LeagueBadge";
import { FormError } from "@/components/account/fields";
import { Mascot } from "@/components/learn/duo/Mascot";
import { followUser, getFriends, getLeaderboard, getLeague, unfollowUser } from "@/lib/account/api";
import { useAccount } from "@/lib/account/client";
import {
  BOARDS,
  LEAGUES,
  accountErrorKey,
  type AccountError,
  type Board,
  type FriendRow,
  type LeaderboardEntry,
  type LeaderboardResult,
  type LeagueBoard,
  type Result,
} from "@/lib/account/shared";
import { levelFor } from "@/lib/learn/progress";
import { useLang, useT, type TFunction } from "@/lib/prefs";

type Tab = "league" | "friends" | Board;
const TAB_IDS: Tab[] = ["league", "friends", ...BOARDS];
type Search = { board?: Tab };

export const Route = createFileRoute("/leaderboard")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    board: TAB_IDS.includes(s.board as Tab) ? (s.board as Tab) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Leaderboard — Vyce LuaUtility" },
      {
        name: "description",
        content:
          "Weekly leagues, friends, daily, weekly and all-time XP rankings and the longest learning streaks.",
      },
    ],
  }),
  component: LeaderboardPage,
});

const TABS: Array<{
  id: Tab;
  key: "lb.league" | "lb.friends" | "lb.day" | "lb.week" | "lb.all" | "lb.streak";
  icon: typeof Trophy;
}> = [
  { id: "league", key: "lb.league", icon: Shield },
  { id: "friends", key: "lb.friends", icon: Users },
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

/** Loads a server function's result; reloads when `key` changes or on `reload()`. */
function useLoad<T>(
  fn: (() => Promise<Result<T>>) | null,
  key: string,
): { data: (T & { ok: true }) | null; error: AccountError | null; reload: () => void } {
  const [data, setData] = useState<(T & { ok: true }) | null>(null);
  const [error, setError] = useState<AccountError | null>(null);
  const [n, setN] = useState(0);
  const enabled = Boolean(fn);
  useEffect(() => {
    if (!fn) return;
    let alive = true;
    setError(null);
    fn()
      .then((r) => {
        if (!alive) return;
        if (r.ok) setData(r as T & { ok: true });
        else setError(r.error);
      })
      .catch(() => alive && setError("server_error"));
    return () => {
      alive = false;
    };
    // fn is recreated every render; `key` says when the request changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, n, enabled]);
  return { data, error, reload: () => setN((x) => x + 1) };
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-400" aria-label="1" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-zinc-300" aria-label="2" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-orange-400" aria-label="3" />;
  return <span className="font-mono text-[13px] text-ink-3">{rank}</span>;
}

/** One leaderboard row; the name links to the player's public profile. */
function Row({
  rank,
  id,
  name,
  avatar,
  xp,
  score,
  me,
  tone,
  extra,
}: {
  rank: number;
  id: string;
  name: string;
  avatar: number;
  xp: number;
  score: ReactNode;
  me: boolean;
  tone?: "up" | "down";
  extra?: ReactNode;
}) {
  const t = useT();
  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${
        me
          ? "bg-brand-soft"
          : tone === "up"
            ? "bg-emerald-500/[0.06]"
            : tone === "down"
              ? "bg-red-500/[0.06]"
              : rank <= 3
                ? "bg-surface-2/40"
                : ""
      }`}
    >
      <span className="inline-flex w-8 shrink-0 justify-center">
        <RankBadge rank={rank} />
      </span>
      <Avatar id={id} name={name} avatar={avatar} />
      <span className="min-w-0 flex-1">
        <Link
          to="/u/$name"
          params={{ name }}
          className="block truncate font-semibold text-ink hover:underline"
        >
          {name}
          {me && (
            <span className="ml-2 rounded-md bg-brand px-1.5 py-0.5 align-middle font-mono text-[10px] font-bold text-white uppercase">
              {t("lb.you")}
            </span>
          )}
        </Link>
        <span className="font-mono text-[11px] text-ink-3">
          {t("lb.level", { n: levelFor(xp).level })}
        </span>
      </span>
      {tone === "up" && (
        <ArrowUp className="h-4 w-4 text-emerald-400" aria-label={t("lg.promote")} />
      )}
      {tone === "down" && (
        <ArrowDown className="h-4 w-4 text-red-400" aria-label={t("lg.demote")} />
      )}
      <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-ink">
        {score}
      </span>
      {extra}
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <Mascot mood="sleepy" size={88} />
      <p className="text-sm text-ink-2">{children}</p>
    </div>
  );
}

function Failed({ error, retry }: { error: AccountError; retry: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <Mascot mood="sad" size={88} />
      <p className="text-sm text-ink-2">
        {error === "not_configured" ? t("acc.downTitle") : t("lb.loadError")}
      </p>
      {error !== "not_configured" && (
        <>
          <p className="text-[12px] text-ink-3">{t(accountErrorKey(error))}</p>
          <button type="button" className="vy-btn" onClick={retry}>
            {t("lb.retry")}
          </button>
        </>
      )}
    </div>
  );
}

function Loading() {
  return (
    <ol className="divide-y divide-line">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="h-14 animate-pulse bg-surface-2/30" />
      ))}
    </ol>
  );
}

function SignInFirst({ text }: { text: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <Mascot mood="happy" size={88} />
      <p className="text-sm text-ink-2">{text}</p>
      <Link to="/login" search={{ next: "/leaderboard" }} className="vy-btn">
        {t("nav.login")}
      </Link>
    </div>
  );
}

// ------------------------------------------------------------------ league

function LeagueTab({ now }: { now: number }) {
  const t = useT();
  const lang = useLang();
  const acc = useAccount();
  const signedIn = acc.status === "user";
  const { data, error, reload } = useLoad<LeagueBoard>(
    signedIn ? () => getLeague() : null,
    `${acc.user?.id}:${acc.user?.xp}`,
  );
  if (!signedIn) return <SignInFirst text={t("lg.signin")} />;
  if (error) return <Failed error={error} retry={reload} />;
  if (!data) return <Loading />;

  const name = leagueName(data.tier, lang);
  const last = data.last;
  const lastNote =
    last &&
    t(last.to > last.from ? "lg.up" : last.to < last.from ? "lg.down" : "lg.stay", {
      rank: last.rank,
      name: leagueName(last.to, lang),
    });

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LeagueBadge tier={data.tier} lang={lang} size={52} label={false} />
          <div>
            <div className="text-lg font-bold text-ink">{t("lg.name", { name })}</div>
            <div className="font-mono text-[12px] text-ink-3">
              {t("lg.week", { xp: data.me?.score ?? 0, n: data.players })}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-ink-3">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {t("lb.resetsIn", { time: countdown(data.resetsAt, now, t) })}
        </span>
      </div>
      <ol className="flex flex-wrap gap-1.5" aria-label={t("lb.league")}>
        {LEAGUES.map((l, i) => (
          <li
            key={l.en}
            className={`rounded-lg px-2 py-1 text-[12px] font-medium ${
              i === data.tier ? "text-[#0b1020]" : "bg-surface-2 text-ink-3"
            }`}
            style={i === data.tier ? { background: l.color } : undefined}
          >
            {lang === "tr" ? l.tr : l.en}
          </li>
        ))}
      </ol>
      {lastNote && (
        <p className="rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-[13px] text-ink-2">
          {lastNote}
        </p>
      )}
      {data.entries.length === 0 ? (
        <Empty>{t("lg.join")}</Empty>
      ) : (
        <ol className="-mx-4 divide-y divide-line border-y border-line sm:-mx-5">
          {data.entries.map((e, i) => (
            <Row
              key={e.id}
              rank={e.rank}
              id={e.id}
              name={e.name}
              avatar={e.avatar}
              xp={e.xp}
              score={`${e.score} XP`}
              me={e.id === acc.user?.id}
              tone={
                i < data.promote && data.tier < LEAGUES.length - 1
                  ? "up"
                  : i >= data.players - data.demote && data.tier > 0
                    ? "down"
                    : undefined
              }
            />
          ))}
        </ol>
      )}
      {!data.me?.rank && data.entries.length > 0 && (
        <p className="text-[13px] text-ink-3">{t("lg.join")}</p>
      )}
      <p className="text-[12px] leading-relaxed text-ink-3">{t("lg.rules")}</p>
    </div>
  );
}

// ------------------------------------------------------------------ friends

function FriendsTab() {
  const t = useT();
  const acc = useAccount();
  const signedIn = acc.status === "user";
  const { data, error, reload } = useLoad<{ rows: FriendRow[] }>(
    signedIn ? () => getFriends() : null,
    `${acc.user?.id}:${acc.user?.xp}`,
  );
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!signedIn) return <SignInFirst text={t("fr.signin")} />;

  async function follow(e: FormEvent) {
    e.preventDefault();
    const who = name.trim();
    if (!who) return;
    setBusy(true);
    setFormError(null);
    setMsg(null);
    const r = await followUser({ data: { name: who } }).catch(
      (): Result<object> => ({ ok: false, error: "server_error" }),
    );
    setBusy(false);
    if (!r.ok) {
      setFormError(r.error === "bad_request" ? t("fr.self") : t(accountErrorKey(r.error)));
      return;
    }
    setName("");
    setMsg(t("fr.added", { name: who }));
    reload();
  }

  async function unfollow(row: FriendRow) {
    await unfollowUser({ data: { id: row.id } }).catch(() => undefined);
    reload();
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <form onSubmit={follow} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="follow-name">
          {t("acc.username")}
        </label>
        <input
          id="follow-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("fr.placeholder")}
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
          className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-ink placeholder-zinc-500 focus:border-brand-line focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="ep-cta inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" /> {t("fr.add")}
        </button>
      </form>
      <FormError>{formError}</FormError>
      {msg && <p className="text-[13px] text-brand">{msg}</p>}
      {error ? (
        <Failed error={error} retry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.rows.length <= 1 ? (
        <Empty>{t("fr.empty")}</Empty>
      ) : (
        <ol className="-mx-4 divide-y divide-line border-y border-line sm:-mx-5">
          {data.rows.map((r, i) => (
            <Row
              key={r.id}
              rank={i + 1}
              id={r.id}
              name={r.name}
              avatar={r.avatar}
              xp={r.xp}
              me={r.me}
              score={
                <>
                  {r.streak > 0 && (
                    <span className="mr-2 inline-flex items-center gap-0.5 text-orange-400">
                      <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                      {r.streak}
                    </span>
                  )}
                  {r.week} XP
                </>
              }
              extra={
                !r.me && (
                  <button
                    type="button"
                    onClick={() => void unfollow(r)}
                    aria-label={`${t("fr.remove")}: ${r.name}`}
                    title={t("fr.remove")}
                    className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-red-400"
                  >
                    <UserMinus className="h-4 w-4" aria-hidden="true" />
                  </button>
                )
              }
            />
          ))}
        </ol>
      )}
      <p className="text-[12px] text-ink-3">{t("fr.note")}</p>
    </div>
  );
}

// ------------------------------------------------------------------ XP boards

function BoardTab({ board, now }: { board: Board; now: number }) {
  const t = useT();
  const acc = useAccount();
  const { data, error, reload } = useLoad<LeaderboardResult>(
    () => getLeaderboard({ data: { board } }),
    `${board}:${acc.user?.id}:${acc.user?.xp}`,
  );
  const shown = data?.board === board ? data : null;
  const isStreak = board === "streak";
  const score = (n: number) => (isStreak ? t("lb.days", { n }) : `${n} XP`);
  const inTop = shown?.entries.some((e: LeaderboardEntry) => e.id === acc.user?.id);

  if (error) return <Failed error={error} retry={reload} />;
  if (!shown) return <Loading />;
  return (
    <div>
      {shown.resetsAt && (
        <div className="flex justify-end px-4 pt-3 sm:px-5">
          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-ink-3">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {t("lb.resetsIn", { time: countdown(shown.resetsAt, now, t) })}
          </span>
        </div>
      )}
      {acc.status === "user" && shown.me && !inTop && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-brand-line bg-brand-soft px-4 py-3 sm:mx-5">
          <span className="text-[13px] font-medium text-ink">{t("lb.yourRank")}</span>
          <span className="font-mono text-[13px] text-ink-2">
            {shown.me.rank
              ? `#${shown.me.rank} · ${score(shown.me.score)}`
              : t(isStreak ? "lb.notRankedStreak" : "lb.notRanked")}
          </span>
        </div>
      )}
      {shown.entries.length === 0 ? (
        <Empty>{t("lb.empty")}</Empty>
      ) : (
        <ol className="mt-3 divide-y divide-line border-t border-line">
          {shown.entries.map((e) => (
            <Row
              key={e.id}
              rank={e.rank}
              id={e.id}
              name={e.name}
              avatar={e.avatar}
              xp={e.xp}
              me={e.id === acc.user?.id}
              score={
                <>
                  {isStreak && <Flame className="h-4 w-4 text-orange-400" aria-hidden="true" />}
                  {score(e.score)}
                </>
              }
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function LeaderboardPage() {
  const t = useT();
  const acc = useAccount();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/leaderboard" });
  const tab: Tab = search.board ?? "league";
  const now = useNow(30_000);

  const setTab = useCallback(
    (id: Tab) => navigate({ search: { board: id === "league" ? undefined : id } }),
    [navigate],
  );

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
        <div
          role="tablist"
          className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 sm:grid-cols-6"
        >
          {TABS.map(({ id, key, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-medium transition-colors ${
                tab === id ? "bg-surface text-ink shadow" : "text-ink-3 hover:text-ink"
              }`}
            >
              <Icon className="hidden h-4 w-4 md:block" aria-hidden="true" />
              {t(key)}
            </button>
          ))}
        </div>

        <section className="ep-card overflow-hidden">
          {tab === "league" ? (
            <LeagueTab now={now} />
          ) : tab === "friends" ? (
            <FriendsTab />
          ) : (
            <BoardTab board={tab} now={now} />
          )}
        </section>

        {acc.status === "signedOut" && (
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
