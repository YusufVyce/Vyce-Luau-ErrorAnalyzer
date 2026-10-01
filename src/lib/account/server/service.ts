/**
 * Accounts, progress, verified XP, leaderboards, leagues and friends on top
 * of a Redis-like store.
 *
 * Keys (all prefixed with "vyce:"):
 *   u:name:<lowercase name>  → user id (unique usernames)
 *   u:<id>                   → hash: name, pass, rec, created, xp, dayKey, dayXp, streak,
 *                              league, leagueWeek, leagueLast, lastPractice
 *   u:<id>:p                 → progress JSON (the account copy)
 *   u:<id>:s                 → set of session hashes (to sign out everywhere)
 *   u:<id>:f / u:<id>:fby    → sets: who they follow / who follows them
 *   s:<sha256(token)>        → user id, expires after 30 idle days
 *   lb:all / lb:d:<date> / lb:w:<week> / lb:streak → sorted sets of user ids
 *   lb:lg:<week>:<tier>      → sorted set: that week's XP inside one league
 *   lb:names / lb:sday       → hashes: id → display name / last active day
 *   rl:<kind>:<key>          → rate-limit counters
 *
 * XP only comes from claims the server checked (see verify.ts): finished
 * homework and challenges are run again, quiz and practice answers are
 * compared with the real answers. Syncing only stores the browser's own
 * things (saved code, hint counts, daily goal). Periods use UTC.
 */
import { earned } from "@/lib/learn/achievements";
import { mergeProgress, normalizeProgress, type Progress } from "@/lib/learn/progress";
import {
  BOARDS,
  LEAGUES,
  passwordError,
  usernameError,
  type AccountError,
  type Board,
  type Claim,
  type ClaimOutcome,
  type FriendRow,
  type LeaderboardEntry,
  type LeaderboardResult,
  type LeagueBoard,
  type LeagueResult,
  type PublicProfile,
  type PublicUser,
  type Result,
} from "../shared";
import {
  burnPasswordCheck,
  hashPassword,
  newId,
  newRecoveryCode,
  newToken,
  normalizeRecoveryCode,
  sha256Hex,
  verifyPassword,
} from "./crypto";
import type { Cmd, KV } from "./kv";
import { verifyClaim, verifyImport } from "./verify";

const P = "vyce:";
const DAY = 86_400;
export const SESSION_TTL = 30 * DAY;

/** Safety net: most XP an account can gain per UTC day. */
export const DAILY_XP_CAP = 5000;
export const BOARD_SIZE = 50;
/** Practice sessions can't be claimed faster than this (each one takes a while to play). */
export const PRACTICE_GAP_MS = 15_000;
/** XP needed in a week before first place in a league moves up. */
export const PROMOTE_MIN_XP = 50;
export const MAX_FRIENDS = 100;
/** Largest progress JSON we store per account. */
const MAX_PROGRESS_BYTES = 400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const LIMITS = {
  login: { max: 10, window: 15 * 60 },
  loginName: { max: 8, window: 15 * 60 },
  signup: { max: 5, window: 60 * 60 },
  recover: { max: 5, window: 60 * 60 },
  sync: { max: 60, window: 60 },
  claim: { max: 40, window: 60 },
  follow: { max: 40, window: 60 * 60 },
} as const;

type Session = { token: string; user: PublicUser; progress: Progress };
type WithProgress = { user: PublicUser; progress: Progress };
type User = { fields: Record<string, string>; progress: Progress };

const fail = (error: AccountError) => ({ ok: false as const, error });

/** YYYY-MM-DD in UTC. */
export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO week, e.g. "2026-W40" (weeks start on Monday). */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function nextUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
}

function nextUtcMonday(d: Date): Date {
  const dow = d.getUTCDay() || 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 8 - dow));
}

function shiftDay(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return utcDay(d);
}

/** Consecutive days ending at `last` (days are YYYY-MM-DD strings). */
export function streakEndingAt(days: string[], last: string): number {
  const set = new Set(days);
  let n = 0;
  for (let d = last; set.has(d); d = shiftDay(d, -1)) n++;
  return n;
}

/** How many places move up / down in a league with `players` people in it. */
export function leagueZones(players: number): { promote: number; demote: number } {
  return {
    promote: players > 0 ? Math.max(1, Math.floor(players * 0.2)) : 0,
    demote: players >= 5 ? Math.max(1, Math.floor(players * 0.2)) : 0,
  };
}

/** Flat [k, v, k, v] Redis reply → object. */
function hash(reply: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(reply))
    for (let i = 0; i + 1 < reply.length; i += 2) out[reply[i]] = reply[i + 1];
  return out;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const lastTier = LEAGUES.length - 1;
const tierOf = (v: unknown) => Math.min(lastTier, Math.max(0, Math.floor(num(v))));

/**
 * The account copy, updated with what only the browser knows (saved code,
 * hint counts, solutions viewed, daily goal). Finished work, stars, days
 * and XP stay as the server recorded them.
 */
export function withServerOwned(server: Progress, incoming: Progress): Progress {
  const m = mergeProgress(server, incoming);
  return {
    ...m,
    quiz: server.quiz,
    homework: server.homework,
    xp: server.xp,
    quizMisses: server.quizMisses,
    challenges: server.challenges,
    days: server.days,
    stars: server.stars,
    xpDays: server.xpDays,
  };
}

export class AccountService {
  private boardCache = new Map<string, { at: number; entries: LeaderboardEntry[] }>();

  constructor(
    private kv: KV,
    private now: () => Date = () => new Date(),
  ) {}

  // ------------------------------------------------------------------ helpers

  /** Counts an attempt; true when the caller is over the limit. */
  private async limited(kind: keyof typeof LIMITS, key: string): Promise<boolean> {
    const { max, window } = LIMITS[kind];
    const k = `${P}rl:${kind}:${key}`;
    // SET NX starts the window with its expiry; INCR keeps that expiry.
    const [, n] = await this.kv.pipeline([
      ["SET", k, 0, "EX", window, "NX"],
      ["INCR", k],
    ]);
    return num(n) > max;
  }

  private publicUser(id: string, h: Record<string, string>): PublicUser {
    return { id, name: h.name, xp: num(h.xp), createdAt: h.created };
  }

  private async loadUser(id: string): Promise<User | null> {
    const [h, raw] = await this.kv.pipeline([
      ["HGETALL", `${P}u:${id}`],
      ["GET", `${P}u:${id}:p`],
    ]);
    const fields = hash(h);
    if (!fields.name) return null;
    let progress = normalizeProgress({});
    if (typeof raw === "string") {
      try {
        progress = normalizeProgress(JSON.parse(raw));
      } catch {
        // corrupt copy: start from the XP we know about
      }
    }
    progress.xp = num(fields.xp);
    return { fields, progress };
  }

  private async idForName(name: string): Promise<string | null> {
    const lower = name.trim().toLowerCase();
    if (!lower || lower.length > 40) return null;
    return this.kv.run<string | null>(["GET", `${P}u:name:${lower}`]);
  }

  private async startSession(id: string): Promise<string> {
    const token = newToken();
    const key = await sha256Hex(token);
    await this.kv.pipeline([
      ["SET", `${P}s:${key}`, id, "EX", SESSION_TTL],
      ["SADD", `${P}u:${id}:s`, key],
      ["EXPIRE", `${P}u:${id}:s`, SESSION_TTL],
    ]);
    return token;
  }

  private async endAllSessions(id: string) {
    const keys = (await this.kv.run<string[]>(["SMEMBERS", `${P}u:${id}:s`])) ?? [];
    await this.kv.pipeline([
      ...keys.map((k): Cmd => ["DEL", `${P}s:${k}`]),
      ["DEL", `${P}u:${id}:s`],
    ]);
  }

  /** The user id behind a session token (and keeps the session alive). */
  async sessionUser(token: string | undefined): Promise<string | null> {
    if (!token || token.length > 100) return null;
    const key = `${P}s:${await sha256Hex(token)}`;
    const id = await this.kv.run<string | null>(["GET", key]);
    if (!id) return null;
    await this.kv.run(["EXPIRE", key, SESSION_TTL]);
    return id;
  }

  /** The student's local date if it's plausible (time zones), otherwise today in UTC. */
  private activityDay(day: string | undefined): string {
    const today = utcDay(this.now());
    if (day && DAY_RE.test(day) && day >= shiftDay(today, -1) && day <= shiftDay(today, 1)) {
      return day;
    }
    return today;
  }

  private async saveProgress(id: string, progress: Progress): Promise<Progress> {
    let json = JSON.stringify(progress);
    if (json.length > MAX_PROGRESS_BYTES) {
      // Saved code is the only part that can get big; drop it before losing anything else.
      progress = { ...progress, code: {}, challengeCode: {} };
      json = JSON.stringify(progress);
    }
    await this.kv.run(["SET", `${P}u:${id}:p`, json]);
    return progress;
  }

  /**
   * Puts the student in this week's league. On the first visit of a new week
   * last week's league is settled: the top places move up, the last ones move
   * down. Done lazily per student, so no scheduled job is needed.
   */
  private async resolveLeague(id: string, fields: Record<string, string>): Promise<number> {
    const now = this.now();
    const week = isoWeek(now);
    if (fields.leagueWeek === week) return tierOf(fields.league);
    let tier = tierOf(fields.league);
    let last: LeagueResult | undefined;
    const prev = isoWeek(new Date(now.getTime() - 7 * DAY * 1000));
    if (fields.leagueWeek === prev) {
      const key = `${P}lb:lg:${prev}:${tier}`;
      const [rank, score, card] = await this.kv.pipeline([
        ["ZREVRANK", key, id],
        ["ZSCORE", key, id],
        ["ZCARD", key],
      ]);
      if (rank !== null && num(score) > 0) {
        const players = num(card);
        const r = num(rank);
        const { promote, demote } = leagueZones(players);
        const from = tier;
        if (r < promote && num(score) >= PROMOTE_MIN_XP && tier < lastTier) tier++;
        else if (r >= players - demote && tier > 0) tier--;
        last = { week: prev, from, to: tier, rank: r + 1 };
      }
    }
    const leagueLast = last ? JSON.stringify(last) : "";
    await this.kv.run([
      "HSET",
      `${P}u:${id}`,
      "league",
      tier,
      "leagueWeek",
      week,
      "leagueLast",
      leagueLast,
    ]);
    Object.assign(fields, { league: String(tier), leagueWeek: week, leagueLast });
    return tier;
  }

  /**
   * Pays verified XP. "every" counts for all boards (work done while signed
   * in); "all" only for the all-time board (progress brought into an account).
   */
  private async award(
    id: string,
    user: User,
    progress: Progress,
    xp: number,
    day: string,
    scope: "every" | "all",
  ): Promise<{ progress: Progress; added: number }> {
    const now = this.now();
    const today = utcDay(now);
    const week = isoWeek(now);
    const f = user.fields;
    let dayXp = f.dayKey === today ? num(f.dayXp) : 0;
    const added = scope === "every" ? Math.min(xp, Math.max(0, DAILY_XP_CAP - dayXp)) : xp;
    const total = num(f.xp) + added;

    let p: Progress = { ...progress, xp: total };
    if (xp > 0) {
      p.days = [...new Set([...p.days, day])].sort().slice(-400);
      const xpDays = { ...p.xpDays, [day]: (p.xpDays[day] ?? 0) + added };
      for (const k of Object.keys(xpDays).sort().slice(0, -60)) delete xpDays[k];
      p.xpDays = xpDays;
    }
    const latest = p.days.filter((d) => d <= shiftDay(today, 1)).at(-1);
    const streak = latest ? streakEndingAt(p.days, latest) : 0;
    if (scope === "every") dayXp += added;

    p = await this.saveProgress(id, p);
    const cmds: Cmd[] = [
      ["HSET", `${P}u:${id}`, "xp", total, "dayKey", today, "dayXp", dayXp, "streak", streak],
    ];
    if (added > 0) {
      cmds.push(["ZINCRBY", `${P}lb:all`, added, id]);
      this.boardCache.delete(`${P}lb:all`);
      if (scope === "every") {
        const league = `${P}lb:lg:${week}:${tierOf(f.league)}`;
        // The student should see their new XP on the boards right away.
        for (const k of [league, `${P}lb:d:${today}`, `${P}lb:w:${week}`]) {
          this.boardCache.delete(k);
        }
        cmds.push(
          ["ZINCRBY", `${P}lb:d:${today}`, added, id],
          ["EXPIRE", `${P}lb:d:${today}`, 3 * DAY],
          ["ZINCRBY", `${P}lb:w:${week}`, added, id],
          ["EXPIRE", `${P}lb:w:${week}`, 15 * DAY],
          ["ZINCRBY", league, added, id],
          ["EXPIRE", league, 22 * DAY],
        );
      }
    }
    if (streak > 0 && latest) {
      cmds.push(["ZADD", `${P}lb:streak`, streak, id], ["HSET", `${P}lb:sday`, id, latest]);
    }
    await this.kv.pipeline(cmds);
    Object.assign(f, { xp: String(total), dayKey: today, dayXp: String(dayXp) });
    return { progress: p, added };
  }

  /** Brings checked progress from this browser into the account (all-time board only). */
  private async importLocal(id: string, user: User, raw: unknown): Promise<Progress> {
    const local = normalizeProgress(raw);
    const { xp, progress } = verifyImport(local, user.progress);
    const merged = withServerOwned(progress, local);
    const { progress: saved } = await this.award(id, user, merged, xp, utcDay(this.now()), "all");
    return saved;
  }

  // ------------------------------------------------------------------ accounts

  async signup(
    input: { username: string; password: string; progress?: unknown },
    ip: string,
  ): Promise<Result<Session & { recoveryCode: string }>> {
    const name = input.username.trim();
    const bad = usernameError(name) ?? passwordError(input.password);
    if (bad) return fail(bad);
    if (await this.limited("signup", ip)) return fail("rate_limited");

    const id = newId();
    const claimed = await this.kv.run(["SET", `${P}u:name:${name.toLowerCase()}`, id, "NX"]);
    if (claimed !== "OK") return fail("username_taken");

    const recoveryCode = newRecoveryCode();
    const created = this.now().toISOString();
    await this.kv.pipeline([
      [
        "HSET",
        `${P}u:${id}`,
        "name",
        name,
        "pass",
        await hashPassword(input.password),
        "rec",
        await sha256Hex(normalizeRecoveryCode(recoveryCode)),
        "created",
        created,
        "xp",
        0,
      ],
      ["HSET", `${P}lb:names`, id, name],
    ]);
    const user = (await this.loadUser(id))!;
    await this.resolveLeague(id, user.fields);
    const progress =
      input.progress === undefined
        ? await this.saveProgress(id, user.progress)
        : await this.importLocal(id, user, input.progress);
    const token = await this.startSession(id);
    return {
      ok: true,
      token,
      recoveryCode,
      user: { id, name, xp: progress.xp, createdAt: created },
      progress,
    };
  }

  async login(
    input: { username: string; password: string; progress?: unknown },
    ip: string,
  ): Promise<Result<Session>> {
    const lower = input.username.trim().toLowerCase();
    if (!lower || lower.length > 40 || input.password.length > 200) return fail("bad_credentials");
    if ((await this.limited("login", ip)) || (await this.limited("loginName", lower))) {
      return fail("rate_limited");
    }
    const id = await this.idForName(lower);
    const user = id ? await this.loadUser(id) : null;
    if (!id || !user) {
      await burnPasswordCheck(input.password);
      return fail("bad_credentials");
    }
    if (!(await verifyPassword(input.password, user.fields.pass ?? ""))) {
      return fail("bad_credentials");
    }
    let { progress } = user;
    if (input.progress !== undefined) progress = await this.importLocal(id, user, input.progress);
    const token = await this.startSession(id);
    return {
      ok: true,
      token,
      user: { ...this.publicUser(id, user.fields), xp: progress.xp },
      progress,
    };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token || token.length > 100) return;
    const key = await sha256Hex(token);
    const id = await this.kv.run<string | null>(["GET", `${P}s:${key}`]);
    await this.kv.pipeline([
      ["DEL", `${P}s:${key}`],
      ...(id ? [["SREM", `${P}u:${id}:s`, key] as Cmd] : []),
    ]);
  }

  async me(token: string | undefined): Promise<WithProgress | null> {
    const id = await this.sessionUser(token);
    if (!id) return null;
    const user = await this.loadUser(id);
    if (!user) return null;
    return { user: this.publicUser(id, user.fields), progress: user.progress };
  }

  /** Stores what only the browser knows (saved code, hints, daily goal). Never adds XP. */
  async sync(
    token: string | undefined,
    input: { progress: unknown },
  ): Promise<Result<WithProgress>> {
    const id = await this.sessionUser(token);
    if (!id) return fail("unauthorized");
    if (await this.limited("sync", id)) return fail("rate_limited");
    const user = await this.loadUser(id);
    if (!user) return fail("unauthorized");
    const progress = await this.saveProgress(
      id,
      withServerOwned(user.progress, normalizeProgress(input.progress)),
    );
    return { ok: true, user: this.publicUser(id, user.fields), progress };
  }

  /** Checks something the student finished and pays its XP. */
  async claim(
    token: string | undefined,
    claim: Claim,
  ): Promise<Result<WithProgress & { outcome: ClaimOutcome }>> {
    const id = await this.sessionUser(token);
    if (!id) return fail("unauthorized");
    if (await this.limited("claim", id)) return fail("rate_limited");
    const user = await this.loadUser(id);
    if (!user) return fail("unauthorized");

    const nowMs = this.now().getTime();
    if (claim?.kind === "practice" && nowMs - num(user.fields.lastPractice) < PRACTICE_GAP_MS) {
      return fail("rate_limited");
    }
    const verdict = verifyClaim(claim, user.progress);
    if (typeof verdict === "string") return fail(verdict);

    await this.resolveLeague(id, user.fields);
    const { progress, added } = await this.award(
      id,
      user,
      verdict.apply(user.progress),
      verdict.xp,
      this.activityDay(claim.day),
      "every",
    );
    if (claim.kind === "practice") {
      await this.kv.run(["HSET", `${P}u:${id}`, "lastPractice", nowMs]);
    }
    return {
      ok: true,
      user: this.publicUser(id, user.fields),
      progress,
      outcome: { ...verdict.outcome, awarded: added },
    };
  }

  async recover(
    input: { username: string; code: string; password: string },
    ip: string,
  ): Promise<Result<Session & { recoveryCode: string }>> {
    const bad = passwordError(input.password);
    if (bad) return fail(bad);
    if (await this.limited("recover", ip)) return fail("rate_limited");
    const id = await this.idForName(input.username);
    const user = id ? await this.loadUser(id) : null;
    const given = await sha256Hex(normalizeRecoveryCode(input.code));
    if (!id || !user || !user.fields.rec || given !== user.fields.rec) return fail("bad_recovery");

    // The code is single-use: a new one replaces it.
    const recoveryCode = newRecoveryCode();
    await this.kv.run([
      "HSET",
      `${P}u:${id}`,
      "pass",
      await hashPassword(input.password),
      "rec",
      await sha256Hex(normalizeRecoveryCode(recoveryCode)),
    ]);
    await this.endAllSessions(id);
    const token = await this.startSession(id);
    return {
      ok: true,
      token,
      recoveryCode,
      user: this.publicUser(id, user.fields),
      progress: user.progress,
    };
  }

  async changePassword(
    token: string | undefined,
    input: { current: string; next: string },
  ): Promise<Result<{ token: string }>> {
    const id = await this.sessionUser(token);
    if (!id) return fail("unauthorized");
    const bad = passwordError(input.next);
    if (bad) return fail(bad);
    if (await this.limited("loginName", `pw:${id}`)) return fail("rate_limited");
    const user = await this.loadUser(id);
    if (!user || !(await verifyPassword(input.current, user.fields.pass ?? ""))) {
      return fail("bad_credentials");
    }
    await this.kv.run(["HSET", `${P}u:${id}`, "pass", await hashPassword(input.next)]);
    await this.endAllSessions(id);
    return { ok: true, token: await this.startSession(id) };
  }

  async deleteAccount(
    token: string | undefined,
    input: { password: string },
  ): Promise<Result<object>> {
    const id = await this.sessionUser(token);
    if (!id) return fail("unauthorized");
    if (await this.limited("loginName", `del:${id}`)) return fail("rate_limited");
    const user = await this.loadUser(id);
    if (!user || !(await verifyPassword(input.password, user.fields.pass ?? ""))) {
      return fail("bad_credentials");
    }
    await this.endAllSessions(id);
    const now = this.now();
    const [following, followers] = (await this.kv.pipeline([
      ["SMEMBERS", `${P}u:${id}:f`],
      ["SMEMBERS", `${P}u:${id}:fby`],
    ])) as [string[], string[]];
    await this.kv.pipeline([
      [
        "DEL",
        `${P}u:${id}`,
        `${P}u:${id}:p`,
        `${P}u:${id}:f`,
        `${P}u:${id}:fby`,
        `${P}u:name:${user.fields.name.toLowerCase()}`,
      ],
      ...(following ?? []).map((t): Cmd => ["SREM", `${P}u:${t}:fby`, id]),
      ...(followers ?? []).map((f): Cmd => ["SREM", `${P}u:${f}:f`, id]),
      ["ZREM", `${P}lb:all`, id],
      ["ZREM", `${P}lb:streak`, id],
      ["ZREM", `${P}lb:d:${utcDay(now)}`, id],
      ["ZREM", `${P}lb:w:${isoWeek(now)}`, id],
      ["ZREM", `${P}lb:lg:${isoWeek(now)}:${tierOf(user.fields.league)}`, id],
      ["HDEL", `${P}lb:names`, id],
      ["HDEL", `${P}lb:sday`, id],
    ]);
    this.boardCache.clear();
    return { ok: true };
  }

  // ------------------------------------------------------------------ leaderboards

  private boardKey(board: Board, now: Date): string {
    switch (board) {
      case "day":
        return `${P}lb:d:${utcDay(now)}`;
      case "week":
        return `${P}lb:w:${isoWeek(now)}`;
      case "all":
        return `${P}lb:all`;
      case "streak":
        return `${P}lb:streak`;
    }
  }

  /** A streak is still alive if its last day is at most two UTC days ago (time zones). */
  private streakAlive(lastDay: string | null | undefined, now: Date): boolean {
    return Boolean(lastDay) && lastDay! >= shiftDay(utcDay(now), -2);
  }

  /** Top rows of a sorted set, with names and all-time XP (for level badges). */
  private async topEntries(key: string, now: Date, streak = false): Promise<LeaderboardEntry[]> {
    const cached = this.boardCache.get(key);
    if (cached && now.getTime() - cached.at < 15_000) return cached.entries;

    // Fetch extra rows for the streak board: broken streaks are skipped below.
    const want = streak ? BOARD_SIZE * 2 : BOARD_SIZE;
    const flat = ((await this.kv.run(["ZREVRANGE", key, 0, want - 1, "WITHSCORES"])) ??
      []) as string[];
    const rows: Array<{ id: string; score: number }> = [];
    for (let i = 0; i + 1 < flat.length; i += 2)
      rows.push({ id: flat[i], score: num(flat[i + 1]) });

    let entries: LeaderboardEntry[] = [];
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const cmds: Cmd[] = [
        ["HMGET", `${P}lb:names`, ...ids],
        ["ZMSCORE", `${P}lb:all`, ...ids],
      ];
      if (streak) cmds.push(["HMGET", `${P}lb:sday`, ...ids]);
      const [names, xps, sdays = []] = await this.kv.pipeline(cmds);
      const stale: string[] = [];
      rows.forEach((r, i) => {
        const name = (names as Array<string | null>)[i];
        if (!name || r.score <= 0) return;
        if (streak && !this.streakAlive((sdays as Array<string | null>)[i], now)) {
          stale.push(r.id);
          return;
        }
        entries.push({ rank: 0, id: r.id, name, score: r.score, xp: num((xps as unknown[])[i]) });
      });
      if (stale.length > 0) {
        await this.kv.pipeline([
          ["ZREM", `${P}lb:streak`, ...stale],
          ["HDEL", `${P}lb:sday`, ...stale],
        ]);
      }
      entries = entries.slice(0, BOARD_SIZE);
      // Equal scores share a rank.
      entries.forEach((e, i) => {
        e.rank = i > 0 && entries[i - 1].score === e.score ? entries[i - 1].rank : i + 1;
      });
    }
    this.boardCache.set(key, { at: now.getTime(), entries });
    return entries;
  }

  private async myRow(
    key: string,
    id: string,
    entries: LeaderboardEntry[],
    alive = true,
  ): Promise<{ rank: number | null; score: number }> {
    const inTop = entries.find((e) => e.id === id);
    if (inTop) return { rank: inTop.rank, score: inTop.score };
    const [rank, score] = await this.kv.pipeline([
      ["ZREVRANK", key, id],
      ["ZSCORE", key, id],
    ]);
    const s = alive ? num(score) : 0;
    return { rank: s > 0 && rank !== null ? num(rank) + 1 : null, score: s };
  }

  async leaderboard(board: Board, token?: string): Promise<LeaderboardResult> {
    if (!BOARDS.includes(board)) board = "all";
    const now = this.now();
    const key = this.boardKey(board, now);
    const entries = await this.topEntries(key, now, board === "streak");
    const result: LeaderboardResult = { board, entries };
    if (board === "day") result.resetsAt = nextUtcMidnight(now).toISOString();
    if (board === "week") result.resetsAt = nextUtcMonday(now).toISOString();

    const id = await this.sessionUser(token);
    if (id) {
      let alive = true;
      if (board === "streak") {
        alive = this.streakAlive(
          await this.kv.run<string | null>(["HGET", `${P}lb:sday`, id]),
          now,
        );
      }
      result.me = await this.myRow(key, id, entries, alive);
    }
    return result;
  }

  // ------------------------------------------------------------------ leagues

  async league(token: string | undefined): Promise<Result<LeagueBoard>> {
    const id = await this.sessionUser(token);
    if (!id) return fail("unauthorized");
    const user = await this.loadUser(id);
    if (!user) return fail("unauthorized");
    const tier = await this.resolveLeague(id, user.fields);
    const now = this.now();
    const week = isoWeek(now);
    const key = `${P}lb:lg:${week}:${tier}`;
    const entries = await this.topEntries(key, now);
    const players = num(await this.kv.run(["ZCARD", key]));
    let last: LeagueResult | undefined;
    try {
      const parsed = user.fields.leagueLast ? JSON.parse(user.fields.leagueLast) : undefined;
      if (parsed && typeof parsed.week === "string") last = parsed;
    } catch {
      // ignore a broken value
    }
    return {
      ok: true,
      week,
      tier,
      entries,
      me: await this.myRow(key, id, entries),
      players,
      ...leagueZones(players),
      resetsAt: nextUtcMonday(now).toISOString(),
      last,
    };
  }

  // ------------------------------------------------------------------ friends

  async follow(token: string | undefined, name: string): Promise<Result<object>> {
    const id = await this.sessionUser(token);
    if (!id) return fail("unauthorized");
    if (await this.limited("follow", id)) return fail("rate_limited");
    const target = await this.idForName(name);
    if (!target) return fail("not_found");
    if (target === id) return fail("bad_request");
    const count = num(await this.kv.run(["SCARD", `${P}u:${id}:f`]));
    if (count >= MAX_FRIENDS) return fail("too_many_friends");
    await this.kv.pipeline([
      ["SADD", `${P}u:${id}:f`, target],
      ["SADD", `${P}u:${target}:fby`, id],
    ]);
    return { ok: true };
  }

  async unfollow(token: string | undefined, target: string): Promise<Result<object>> {
    const id = await this.sessionUser(token);
    if (!id) return fail("unauthorized");
    await this.kv.pipeline([
      ["SREM", `${P}u:${id}:f`, target],
      ["SREM", `${P}u:${target}:fby`, id],
    ]);
    return { ok: true };
  }

  /** The people the student follows (and the student), ranked by this week's XP. */
  async friends(token: string | undefined): Promise<Result<{ rows: FriendRow[] }>> {
    const id = await this.sessionUser(token);
    if (!id) return fail("unauthorized");
    const now = this.now();
    const following = ((await this.kv.run<string[]>(["SMEMBERS", `${P}u:${id}:f`])) ?? []).slice(
      0,
      MAX_FRIENDS,
    );
    const ids = [id, ...following.filter((f) => f !== id)];
    const [names, week, all, streaks, sdays] = await this.kv.pipeline([
      ["HMGET", `${P}lb:names`, ...ids],
      ["ZMSCORE", `${P}lb:w:${isoWeek(now)}`, ...ids],
      ["ZMSCORE", `${P}lb:all`, ...ids],
      ["ZMSCORE", `${P}lb:streak`, ...ids],
      ["HMGET", `${P}lb:sday`, ...ids],
    ]);
    const rows: FriendRow[] = [];
    ids.forEach((fid, i) => {
      const name = (names as Array<string | null>)[i];
      if (!name) return;
      const alive = this.streakAlive((sdays as Array<string | null>)[i], now);
      rows.push({
        id: fid,
        name,
        week: num((week as unknown[])[i]),
        xp: num((all as unknown[])[i]),
        streak: alive ? num((streaks as unknown[])[i]) : 0,
        me: fid === id,
      });
    });
    rows.sort((a, b) => b.week - a.week || b.xp - a.xp);
    return { ok: true, rows };
  }

  // ------------------------------------------------------------------ public profiles

  async profile(
    name: string,
    token: string | undefined,
  ): Promise<Result<{ profile: PublicProfile }>> {
    const id = await this.idForName(name);
    const user = id ? await this.loadUser(id) : null;
    if (!id || !user) return fail("not_found");
    const viewer = await this.sessionUser(token);
    const tier = await this.resolveLeague(id, user.fields);
    const now = this.now();
    const [weekXp, following, followers] = await this.kv.pipeline([
      ["ZSCORE", `${P}lb:w:${isoWeek(now)}`, id],
      viewer && viewer !== id ? ["SISMEMBER", `${P}u:${viewer}:f`, id] : ["SCARD", `${P}none`],
      ["SCARD", `${P}u:${id}:fby`],
    ]);
    const p = user.progress;
    const latest = p.days.filter((d) => d <= shiftDay(utcDay(now), 1)).at(-1);
    const streak = latest && this.streakAlive(latest, now) ? streakEndingAt(p.days, latest) : 0;
    return {
      ok: true,
      profile: {
        id,
        name: user.fields.name,
        createdAt: user.fields.created,
        xp: num(user.fields.xp),
        streak,
        league: tier,
        weekXp: num(weekXp),
        quiz: p.quiz,
        homework: p.homework,
        challenges: p.challenges,
        stars: p.stars,
        days: p.days.slice(-140),
        achievements: [...earned(p)],
        isMe: viewer === id,
        following: Boolean(viewer && viewer !== id && num(following) === 1),
        followers: num(followers),
      },
    };
  }
}
