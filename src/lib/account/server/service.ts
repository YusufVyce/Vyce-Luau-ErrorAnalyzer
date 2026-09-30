/**
 * Accounts, progress sync and leaderboards on top of a Redis-like store.
 *
 * Keys (all prefixed with "vyce:"):
 *   u:name:<lowercase name>  → user id (unique usernames)
 *   u:<id>                   → hash: name, pass, rec, created, xp, dayKey, dayXp, streak
 *   u:<id>:p                 → progress JSON (the account copy)
 *   u:<id>:s                 → set of session hashes (to sign out everywhere)
 *   s:<sha256(token)>        → user id, expires after 30 idle days
 *   lb:all / lb:d:<date> / lb:w:<week> / lb:streak → sorted sets of user ids
 *   lb:names / lb:sday       → hashes: id → display name / last active day
 *   rl:<kind>:<key>          → rate-limit counters
 *
 * XP is counted by the server: each sync reports how much XP the browser
 * gained since the last sync, and the server adds it (within limits) to the
 * account and to the day / week / all-time boards. Periods use UTC.
 */
import { mergeProgress, normalizeProgress, type Progress } from "@/lib/learn/progress";
import {
  BOARDS,
  passwordError,
  usernameError,
  type AccountError,
  type Board,
  type LeaderboardEntry,
  type LeaderboardResult,
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

const P = "vyce:";
const DAY = 86_400;
export const SESSION_TTL = 30 * DAY;

/** Most XP one sync may add: more than any single lesson, homework or challenge gives. */
export const SYNC_XP_CAP = 1000;
/** Most XP an account can gain per UTC day (blocks edited-browser-storage cheating). */
export const DAILY_XP_CAP = 3000;
/** Most XP a brand-new account can bring in from the browser's guest progress. */
export const IMPORT_XP_CAP = 20_000;
export const BOARD_SIZE = 50;
/** Largest progress JSON we store per account. */
const MAX_PROGRESS_BYTES = 400_000;

const LIMITS = {
  login: { max: 10, window: 15 * 60 },
  loginName: { max: 8, window: 15 * 60 },
  signup: { max: 5, window: 60 * 60 },
  recover: { max: 5, window: 60 * 60 },
  sync: { max: 40, window: 60 },
} as const;

type Session = { token: string; user: PublicUser; progress: Progress };
/**
 * signup: guest progress becomes the new account (all-time board only).
 * login: guest progress is added to an existing account (all-time board only).
 * sync: progress earned while signed in (every board).
 */
type Mode = "signup" | "login" | "sync";
type WithProgress = { user: PublicUser; progress: Progress };

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

  private async loadUser(id: string) {
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

  /**
   * Adds XP and merges progress into the account. `gained` is how much XP the
   * browser earned since its last sync; the server decides how much counts.
   */
  private async applyProgress(
    id: string,
    user: { fields: Record<string, string>; progress: Progress },
    incoming: Progress | undefined,
    gained: number,
    mode: Mode,
  ): Promise<{ xp: number; progress: Progress; added: number }> {
    const now = this.now();
    const day = utcDay(now);
    const week = isoWeek(now);
    const f = user.fields;
    let dayXp = f.dayKey === day ? num(f.dayXp) : 0;

    let added = Math.max(0, Math.floor(gained));
    if (mode === "signup") added = Math.min(added, IMPORT_XP_CAP);
    else added = Math.min(added, SYNC_XP_CAP, Math.max(0, DAILY_XP_CAP - dayXp));
    const xp = num(f.xp) + added;

    // Browsers count days in local time, which can be up to a day ahead of UTC.
    const hi = shiftDay(day, 1);
    let progress = user.progress;
    if (incoming) {
      // Only a new account takes the browser's whole day history; after
      // that, only days around today can be added (no back-filled streaks).
      const known = new Set(progress.days);
      const lo = shiftDay(day, -1);
      const days = incoming.days.filter(
        (d) => d <= hi && (mode === "signup" || known.has(d) || d >= lo),
      );
      progress = mergeProgress(progress, { ...incoming, days });
    }
    progress.xp = xp;

    const latest = progress.days.filter((d) => d <= hi).at(-1);
    const streak = latest ? streakEndingAt(progress.days, latest) : 0;

    let json = JSON.stringify(progress);
    if (json.length > MAX_PROGRESS_BYTES) {
      // Saved code is the only part that can get big; drop it before losing anything else.
      progress = { ...progress, code: {}, challengeCode: {} };
      json = JSON.stringify(progress);
    }

    if (mode !== "signup") dayXp += added;
    const cmds: Cmd[] = [
      ["SET", `${P}u:${id}:p`, json],
      ["HSET", `${P}u:${id}`, "xp", xp, "dayKey", day, "dayXp", dayXp, "streak", streak],
    ];
    if (added > 0) {
      cmds.push(["ZINCRBY", `${P}lb:all`, added, id]);
      if (mode === "sync") {
        cmds.push(
          ["ZINCRBY", `${P}lb:d:${day}`, added, id],
          ["EXPIRE", `${P}lb:d:${day}`, 3 * DAY],
          ["ZINCRBY", `${P}lb:w:${week}`, added, id],
          ["EXPIRE", `${P}lb:w:${week}`, 15 * DAY],
        );
      }
    }
    if (streak > 0 && latest) {
      cmds.push(["ZADD", `${P}lb:streak`, streak, id], ["HSET", `${P}lb:sday`, id, latest]);
    } else {
      cmds.push(["ZREM", `${P}lb:streak`, id], ["HDEL", `${P}lb:sday`, id]);
    }
    await this.kv.pipeline(cmds);
    return { xp, progress, added };
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
    const guest = input.progress === undefined ? undefined : normalizeProgress(input.progress);
    const applied = await this.applyProgress(id, user, guest, guest?.xp ?? 0, "signup");
    const token = await this.startSession(id);
    return {
      ok: true,
      token,
      recoveryCode,
      user: { id, name, xp: applied.xp, createdAt: created },
      progress: applied.progress,
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
    const id = await this.kv.run<string | null>(["GET", `${P}u:name:${lower}`]);
    const user = id ? await this.loadUser(id) : null;
    if (!id || !user) {
      await burnPasswordCheck(input.password);
      return fail("bad_credentials");
    }
    if (!(await verifyPassword(input.password, user.fields.pass ?? ""))) {
      return fail("bad_credentials");
    }

    let { progress } = user;
    let xp = num(user.fields.xp);
    if (input.progress !== undefined) {
      const guest = normalizeProgress(input.progress);
      ({ progress, xp } = await this.applyProgress(id, user, guest, guest.xp, "login"));
    }
    const token = await this.startSession(id);
    return { ok: true, token, user: { ...this.publicUser(id, user.fields), xp }, progress };
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

  /**
   * Stores the browser's progress. `baseXp` is the account XP the browser
   * last heard from the server; everything above it was earned since.
   */
  async sync(
    token: string | undefined,
    input: { progress: unknown; baseXp: number },
  ): Promise<Result<WithProgress & { added: number }>> {
    const id = await this.sessionUser(token);
    if (!id) return fail("unauthorized");
    if (await this.limited("sync", id)) return fail("rate_limited");
    const user = await this.loadUser(id);
    if (!user) return fail("unauthorized");
    const incoming = normalizeProgress(input.progress);
    const gained = incoming.xp - Math.max(0, Math.floor(num(input.baseXp)));
    const { xp, progress, added } = await this.applyProgress(id, user, incoming, gained, "sync");
    return { ok: true, added, user: { ...this.publicUser(id, user.fields), xp }, progress };
  }

  async recover(
    input: { username: string; code: string; password: string },
    ip: string,
  ): Promise<Result<Session & { recoveryCode: string }>> {
    const bad = passwordError(input.password);
    if (bad) return fail(bad);
    if (await this.limited("recover", ip)) return fail("rate_limited");
    const lower = input.username.trim().toLowerCase();
    const id =
      lower.length <= 40 ? await this.kv.run<string | null>(["GET", `${P}u:name:${lower}`]) : null;
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
    await this.kv.pipeline([
      ["DEL", `${P}u:${id}`, `${P}u:${id}:p`, `${P}u:name:${user.fields.name.toLowerCase()}`],
      ["ZREM", `${P}lb:all`, id],
      ["ZREM", `${P}lb:streak`, id],
      ["ZREM", `${P}lb:d:${utcDay(now)}`, id],
      ["ZREM", `${P}lb:w:${isoWeek(now)}`, id],
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

  private async topEntries(board: Board, now: Date): Promise<LeaderboardEntry[]> {
    const key = this.boardKey(board, now);
    const cached = this.boardCache.get(key);
    if (cached && now.getTime() - cached.at < 15_000) return cached.entries;

    // Fetch extra rows for the streak board: broken streaks are skipped below.
    const want = board === "streak" ? BOARD_SIZE * 2 : BOARD_SIZE;
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
      if (board === "streak") cmds.push(["HMGET", `${P}lb:sday`, ...ids]);
      const [names, xps, sdays = []] = await this.kv.pipeline(cmds);
      const stale: string[] = [];
      rows.forEach((r, i) => {
        const name = (names as Array<string | null>)[i];
        if (!name || r.score <= 0) return;
        if (board === "streak" && !this.streakAlive((sdays as Array<string | null>)[i], now)) {
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

  async leaderboard(board: Board, token?: string): Promise<LeaderboardResult> {
    if (!BOARDS.includes(board)) board = "all";
    const now = this.now();
    const entries = await this.topEntries(board, now);
    const result: LeaderboardResult = { board, entries };
    if (board === "day") result.resetsAt = nextUtcMidnight(now).toISOString();
    if (board === "week") result.resetsAt = nextUtcMonday(now).toISOString();

    const id = await this.sessionUser(token);
    if (id) {
      const inTop = entries.find((e) => e.id === id);
      if (inTop) {
        result.me = { rank: inTop.rank, score: inTop.score };
      } else {
        const key = this.boardKey(board, now);
        const [rank, score, sday] = await this.kv.pipeline([
          ["ZREVRANK", key, id],
          ["ZSCORE", key, id],
          ["HGET", `${P}lb:sday`, id],
        ]);
        const alive = board !== "streak" || this.streakAlive(sday as string | null, now);
        const s = alive ? num(score) : 0;
        result.me = { rank: s > 0 && rank !== null ? num(rank) + 1 : null, score: s };
      }
    }
    return result;
  }
}
