/**
 * Accounts, progress, verified XP, leaderboards, leagues and friends on top
 * of a Redis-like store.
 *
 * Keys (all prefixed with "vyce:"):
 *   u:name:<lowercase name>  → user id (unique usernames)
 *   u:<id>                   → hash: name, pass, rec, created, xp, dayKey, dayXp, streak,
 *                              league, leagueWeek, leagueLast, lastPractice, av, bv
 *                              (av / bv: version of the profile photo / banner, 0 = none)
 *   u:<id>:p                 → progress JSON (the account copy)
 *   u:<id>:s                 → set of session hashes (to sign out everywhere)
 *   u:<id>:f / u:<id>:fby    → sets: who they follow / who follows them
 *   s:<sha256(token)>        → user id, expires after 30 idle days
 *   lb:all / lb:d:<date> / lb:w:<week> / lb:streak → sorted sets of user ids
 *   lb:lg:<week>:<tier>      → sorted set: that week's XP inside one league
 *   lb:names / lb:sday       → hashes: id → display name / last active day
 *   av                       → hash: id → profile photo version (for lists)
 *   img:<id>:avatar|banner   → the image, base64 in chunks (PNG, JPEG, WebP or GIF; see images.ts)
 *   owner / admins           → the owner's id / set of admin ids
 *   bans / namebans          → hashes: id → ban JSON / lowercase name → name-ban JSON
 *   users:created            → sorted set: id by sign-up time
 *   stats:d:<day> / stats:t  → hashes of daily / all-time counters (admin overview)
 *   settings                 → hash: announcement, tone, signupsClosed, forumReadOnly
 *   audit                    → list of admin actions (JSON), newest first
 *   f:…                      → the forum (see forum.ts)
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
  DEFAULT_SETTINGS,
  LEAGUES,
  nameBanned,
  OWNER_NAME,
  passwordError,
  usernameError,
  type AccountError,
  type Board,
  type Claim,
  type ClaimOutcome,
  type FriendRow,
  IMAGE_KINDS,
  IMAGE_SPECS,
  type ImageKind,
  type LeaderboardEntry,
  type LeaderboardResult,
  type LeagueBoard,
  type LeagueResult,
  type BanRecord,
  type NameBan,
  type PublicProfile,
  type PublicUser,
  type Result,
  type Role,
  type SiteSettings,
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
import { decodeBase64, deleteBlobCmds, imageType, loadBlob, saveBlob } from "./images";
import type { Cmd, KV } from "./kv";
import { verifyClaim, verifyImport } from "./verify";

/** Prefix of every key this app stores. */
export const P = "vyce:";
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
  image: { max: 20, window: 60 * 60 },
  forumThread: { max: 5, window: 60 * 60 },
  forumPost: { max: 30, window: 60 * 60 },
  forumBurst: { max: 3, window: 30 },
  forumImage: { max: 30, window: 60 * 60 },
  forumReport: { max: 10, window: 60 * 60 },
} as const;

export type LimitKind = keyof typeof LIMITS;

type Session = { token: string; user: PublicUser; progress: Progress };
type WithProgress = { user: PublicUser; progress: Progress };
export type User = { fields: Record<string, string>; progress: Progress };
export type Person = { name: string; avatar: number; xp: number; role?: Role };

/** Stats counters live this long (days). */
const STATS_TTL = 400 * DAY;

export const fail = (error: AccountError) => ({ ok: false as const, error });

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
export function hash(reply: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(reply))
    for (let i = 0; i + 1 < reply.length; i += 2) out[reply[i]] = reply[i + 1];
  return out;
}

export const num = (v: unknown) => {
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
  private roleCache: { at: number; owner: string | null; admins: Set<string> } | null = null;
  private settingsCache: { at: number; value: SiteSettings } | null = null;

  constructor(
    private kv: KV,
    private now: () => Date = () => new Date(),
  ) {}

  // ------------------------------------------------------------------ helpers

  /** Counts an attempt; true when the caller is over the limit. */
  async limited(kind: LimitKind, key: string): Promise<boolean> {
    const { max, window } = LIMITS[kind];
    const k = `${P}rl:${kind}:${key}`;
    // SET NX starts the window with its expiry; INCR keeps that expiry.
    const [, n] = await this.kv.pipeline([
      ["SET", k, 0, "EX", window, "NX"],
      ["INCR", k],
    ]);
    return num(n) > max;
  }

  /** Account details for the browser, with the role for admins. */
  async publicUser(id: string, h: Record<string, string>): Promise<PublicUser> {
    const role = await this.roleOf(id, h.name ?? "");
    return {
      id,
      name: h.name,
      xp: num(h.xp),
      createdAt: h.created,
      avatar: num(h.av),
      banner: num(h.bv),
      rev: num(h.rev),
      ...(role ? { role } : {}),
    };
  }

  forgetBoards() {
    this.boardCache.clear();
  }

  // ------------------------------------------------------------------ roles, bans, settings

  /** The owner's id and the admin ids (cached briefly). */
  async roles(): Promise<{ owner: string | null; admins: Set<string> }> {
    const now = this.now().getTime();
    if (this.roleCache && now - this.roleCache.at < 30_000) return this.roleCache;
    const [owner, admins] = await this.kv.pipeline([
      ["GET", `${P}owner`],
      ["SMEMBERS", `${P}admins`],
    ]);
    this.roleCache = {
      at: now,
      owner: typeof owner === "string" ? owner : null,
      admins: new Set((admins as string[]) ?? []),
    };
    return this.roleCache;
  }

  forgetRoles() {
    this.roleCache = null;
  }

  /**
   * The owner is the account called "vyce"; the first time it's seen its id
   * is pinned, so the role stays with that account even if the name changes
   * or someone else later takes the name. Admins are added by the owner.
   */
  async roleOf(id: string, name: string): Promise<Role | undefined> {
    const { owner, admins } = await this.roles();
    if (owner) {
      if (owner === id) return "owner";
    } else if (name.toLowerCase() === OWNER_NAME) {
      await this.kv.run(["SET", `${P}owner`, id, "NX"]);
      this.forgetRoles();
      if ((await this.roles()).owner === id) return "owner";
    }
    return admins.has(id) ? "admin" : undefined;
  }

  /** The account's ban if it's still running (expired bans are cleared). */
  async banOf(id: string): Promise<BanRecord | null> {
    const raw = await this.kv.run<string | null>(["HGET", `${P}bans`, id]);
    if (!raw) return null;
    try {
      const ban = JSON.parse(raw) as BanRecord;
      if (ban.until && ban.until <= this.now().getTime()) {
        await this.kv.run(["HDEL", `${P}bans`, id]);
        return null;
      }
      return ban;
    } catch {
      return null;
    }
  }

  private banned(ban: BanRecord) {
    return {
      ok: false as const,
      error: "banned" as const,
      ban: { reason: ban.reason, until: ban.until },
    };
  }

  async nameBans(): Promise<NameBan[]> {
    const h = hash(await this.kv.run(["HGETALL", `${P}namebans`]));
    const out: NameBan[] = [];
    for (const [name, raw] of Object.entries(h)) {
      try {
        const b = JSON.parse(raw) as Omit<NameBan, "name">;
        out.push({ name, mode: b.mode === "contains" ? "contains" : "exact", by: b.by, at: b.at });
      } catch {
        // skip a broken entry
      }
    }
    return out.sort((a, b) => b.at - a.at);
  }

  /** Site settings (cached briefly; every page asks for the announcement). */
  async settings(): Promise<SiteSettings> {
    const now = this.now().getTime();
    if (this.settingsCache && now - this.settingsCache.at < 30_000) return this.settingsCache.value;
    const h = hash(await this.kv.run(["HGETALL", `${P}settings`]));
    const value: SiteSettings = {
      announcement: h.announcement ?? DEFAULT_SETTINGS.announcement,
      tone: h.tone === "warn" ? "warn" : "info",
      signupsClosed: h.signupsClosed === "1",
      forumReadOnly: h.forumReadOnly === "1",
    };
    this.settingsCache = { at: now, value };
    return value;
  }

  forgetSettings() {
    this.settingsCache = null;
  }

  /** Adds to today's and all-time counters for the admin overview. */
  stat(field: string, by = 1): Cmd[] {
    const key = `${P}stats:d:${utcDay(this.now())}`;
    return [
      ["HINCRBY", key, field, by],
      ["EXPIRE", key, STATS_TTL],
      ["HINCRBY", `${P}stats:t`, field, by],
    ];
  }

  async loadUser(id: string): Promise<User | null> {
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

  async idForName(name: string): Promise<string | null> {
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

  async endAllSessions(id: string) {
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

  async saveProgress(id: string, progress: Progress): Promise<Progress> {
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
  async resolveLeague(id: string, fields: Record<string, string>): Promise<number> {
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
    if (added > 0) {
      cmds.push(...this.stat("xp", added));
      if (scope === "every") {
        const active = `${P}stats:a:${today}`;
        cmds.push(["SADD", active, id], ["EXPIRE", active, 40 * DAY]);
      }
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
    if ((await this.settings()).signupsClosed) return fail("signups_closed");
    if (nameBanned(name, await this.nameBans())) return fail("reserved_username");
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
      ["ZADD", `${P}users:created`, this.now().getTime(), id],
      ...this.stat("signups"),
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
      user: await this.publicUser(id, { ...user.fields, xp: String(progress.xp) }),
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
    const ban = await this.banOf(id);
    if (ban) return this.banned(ban);
    let { progress } = user;
    if (input.progress !== undefined) progress = await this.importLocal(id, user, input.progress);
    const token = await this.startSession(id);
    await this.kv.pipeline(this.stat("logins"));
    return {
      ok: true,
      token,
      user: { ...(await this.publicUser(id, user.fields)), xp: progress.xp },
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
    if (await this.banOf(id)) {
      await this.endAllSessions(id);
      return null;
    }
    return { user: await this.publicUser(id, user.fields), progress: user.progress };
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
    return { ok: true, user: await this.publicUser(id, user.fields), progress };
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
    if (claim.kind === "homework" && added > 0) {
      // First time this lesson's homework passed: counts for the admin overview.
      await this.kv.pipeline([["HINCRBY", `${P}stats:lessons`, claim.lessonId, 1]]);
    }
    return {
      ok: true,
      user: await this.publicUser(id, user.fields),
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
    const ban = await this.banOf(id);
    if (ban) return this.banned(ban);

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
      user: await this.publicUser(id, user.fields),
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
    await this.purgeUser(id, user);
    return { ok: true };
  }

  /** Removes an account and everything that points at it (forum posts stay, without a name). */
  async purgeUser(id: string, user: User): Promise<void> {
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
      ...deleteBlobCmds(`${P}img:${id}:avatar`),
      ...deleteBlobCmds(`${P}img:${id}:banner`),
      ...(following ?? []).map((t): Cmd => ["SREM", `${P}u:${t}:fby`, id]),
      ...(followers ?? []).map((f): Cmd => ["SREM", `${P}u:${f}:f`, id]),
      ["ZREM", `${P}lb:all`, id],
      ["ZREM", `${P}lb:streak`, id],
      ["ZREM", `${P}lb:d:${utcDay(now)}`, id],
      ["ZREM", `${P}lb:w:${isoWeek(now)}`, id],
      ["ZREM", `${P}lb:lg:${isoWeek(now)}:${tierOf(user.fields.league)}`, id],
      ["HDEL", `${P}lb:names`, id],
      ["HDEL", `${P}lb:sday`, id],
      ["HDEL", `${P}av`, id],
      ["HDEL", `${P}bans`, id],
      ["SREM", `${P}admins`, id],
      ["ZREM", `${P}users:created`, id],
      ...this.stat("imageBytes", -(num(user.fields.avatarBytes) + num(user.fields.bannerBytes))),
    ]);
    this.boardCache.clear();
    this.forgetRoles();
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
        ["HMGET", `${P}av`, ...ids],
        ["HMGET", `${P}bans`, ...ids],
      ];
      if (streak) cmds.push(["HMGET", `${P}lb:sday`, ...ids]);
      const [names, xps, avs, bans, sdays = []] = await this.kv.pipeline(cmds);
      const stale: string[] = [];
      rows.forEach((r, i) => {
        const name = (names as Array<string | null>)[i];
        // Banned accounts don't show on the boards.
        if (!name || r.score <= 0 || (bans as Array<string | null>)[i]) return;
        if (streak && !this.streakAlive((sdays as Array<string | null>)[i], now)) {
          stale.push(r.id);
          return;
        }
        entries.push({
          rank: 0,
          id: r.id,
          name,
          score: r.score,
          xp: num((xps as unknown[])[i]),
          avatar: num((avs as unknown[])[i]),
        });
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
    const [names, week, all, streaks, sdays, avs] = await this.kv.pipeline([
      ["HMGET", `${P}lb:names`, ...ids],
      ["ZMSCORE", `${P}lb:w:${isoWeek(now)}`, ...ids],
      ["ZMSCORE", `${P}lb:all`, ...ids],
      ["ZMSCORE", `${P}lb:streak`, ...ids],
      ["HMGET", `${P}lb:sday`, ...ids],
      ["HMGET", `${P}av`, ...ids],
    ]);
    const rows: FriendRow[] = [];
    ids.forEach((fid, i) => {
      const name = (names as Array<string | null>)[i];
      if (!name) return;
      const alive = this.streakAlive((sdays as Array<string | null>)[i], now);
      rows.push({
        id: fid,
        name,
        avatar: num((avs as unknown[])[i]),
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
    if (await this.banOf(id)) return fail("banned");
    const viewer = await this.sessionUser(token);
    const tier = await this.resolveLeague(id, user.fields);
    const now = this.now();
    const [weekXp, following, followers] = await this.kv.pipeline([
      ["ZSCORE", `${P}lb:w:${isoWeek(now)}`, id],
      viewer && viewer !== id ? ["SISMEMBER", `${P}u:${viewer}:f`, id] : ["SCARD", `${P}none`],
      ["SCARD", `${P}u:${id}:fby`],
    ]);
    const role = await this.roleOf(id, user.fields.name);
    const viewerName = viewer
      ? await this.kv.run<string | null>(["HGET", `${P}u:${viewer}`, "name"])
      : null;
    const viewerRole = viewer ? await this.roleOf(viewer, viewerName ?? "") : undefined;
    const p = user.progress;
    const latest = p.days.filter((d) => d <= shiftDay(utcDay(now), 1)).at(-1);
    const streak = latest && this.streakAlive(latest, now) ? streakEndingAt(p.days, latest) : 0;
    return {
      ok: true,
      profile: {
        id,
        name: user.fields.name,
        avatar: num(user.fields.av),
        banner: num(user.fields.bv),
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
        ...(role ? { role } : {}),
        ...(viewerRole === "owner" || (viewerRole === "admin" && (!role || viewer === id))
          ? { canManage: true }
          : {}),
      },
    };
  }

  // ------------------------------------------------------------------ profile images

  /** Saves a profile photo or banner (base64 PNG, JPEG, WebP or GIF, cropped by the browser). */
  async setImage(
    token: string | undefined,
    kind: ImageKind,
    data: string,
  ): Promise<Result<{ user: PublicUser }>> {
    const id = await this.sessionUser(token);
    if (!id) return fail("unauthorized");
    if (!IMAGE_KINDS.includes(kind)) return fail("bad_request");
    if (await this.limited("image", id)) return fail("rate_limited");
    const bytes = decodeBase64(data);
    const type = bytes && imageType(bytes);
    const spec = IMAGE_SPECS[kind];
    if (
      !bytes ||
      !type ||
      bytes.length > (type === "image/gif" ? spec.gifMaxBytes : spec.maxBytes)
    ) {
      return fail("bad_image");
    }
    const key = `${P}img:${id}:${kind}`;
    const before = await this.kv.run<number | null>(["HGET", `${P}u:${id}`, `${kind}Bytes`]);
    await saveBlob(this.kv, key, data);
    const version = this.now().getTime();
    const field = kind === "avatar" ? "av" : "bv";
    const cmds: Cmd[] = [
      ["HSET", `${P}u:${id}`, field, version, `${kind}Bytes`, bytes.length],
      ...this.stat("imageBytes", bytes.length - num(before)),
    ];
    if (kind === "avatar") {
      cmds.push(["HSET", `${P}av`, id, version]);
      this.boardCache.clear();
    }
    await this.kv.pipeline(cmds);
    const user = await this.loadUser(id);
    if (!user) return fail("unauthorized");
    return { ok: true, user: await this.publicUser(id, user.fields) };
  }

  /** Deletes a profile photo or banner (the owner, or an admin with `id`). */
  async dropImage(id: string, kind: ImageKind): Promise<void> {
    const before = await this.kv.run<number | null>(["HGET", `${P}u:${id}`, `${kind}Bytes`]);
    const cmds: Cmd[] = [
      ...deleteBlobCmds(`${P}img:${id}:${kind}`),
      ["HDEL", `${P}u:${id}`, kind === "avatar" ? "av" : "bv", `${kind}Bytes`],
      ...this.stat("imageBytes", -num(before)),
    ];
    if (kind === "avatar") {
      cmds.push(["HDEL", `${P}av`, id]);
      this.boardCache.clear();
    }
    await this.kv.pipeline(cmds);
  }

  async removeImage(
    token: string | undefined,
    kind: ImageKind,
  ): Promise<Result<{ user: PublicUser }>> {
    const id = await this.sessionUser(token);
    if (!id) return fail("unauthorized");
    if (!IMAGE_KINDS.includes(kind)) return fail("bad_request");
    await this.dropImage(id, kind);
    const user = await this.loadUser(id);
    if (!user) return fail("unauthorized");
    return { ok: true, user: await this.publicUser(id, user.fields) };
  }

  /** A stored image for the public image route, or null. */
  async image(
    id: string,
    kind: string,
  ): Promise<{ bytes: Uint8Array<ArrayBuffer>; type: string } | null> {
    if (!/^u_[0-9a-f]{1,40}$/.test(id) || !IMAGE_KINDS.includes(kind as ImageKind)) return null;
    const data = await loadBlob(this.kv, `${P}img:${id}:${kind}`);
    const bytes = data ? decodeBase64(data) : null;
    const type = bytes && imageType(bytes);
    return bytes && type ? { bytes, type } : null;
  }

  /** Names, photos and XP for a list of user ids (missing accounts get an empty name). */
  async people(ids: string[]): Promise<Map<string, Person>> {
    const unique = [...new Set(ids)];
    const out = new Map<string, Person>();
    if (unique.length === 0) return out;
    const [[names, avs, xps], { owner, admins }] = await Promise.all([
      this.kv.pipeline([
        ["HMGET", `${P}lb:names`, ...unique],
        ["HMGET", `${P}av`, ...unique],
        ["ZMSCORE", `${P}lb:all`, ...unique],
      ]),
      this.roles(),
    ]);
    unique.forEach((id, i) => {
      const role: Role | undefined = id === owner ? "owner" : admins.has(id) ? "admin" : undefined;
      out.set(id, {
        name: ((names as Array<string | null>)[i] ?? "") || "",
        avatar: num((avs as unknown[])[i]),
        xp: num((xps as unknown[])[i]),
        ...(role ? { role } : {}),
      });
    });
    return out;
  }

  /** The signed-in user's id and name. */
  async viewer(token: string | undefined): Promise<{ id: string; name: string } | null> {
    const id = await this.sessionUser(token);
    if (!id) return null;
    const name = await this.kv.run<string | null>(["HGET", `${P}u:${id}`, "name"]);
    return name ? { id, name } : null;
  }
}
