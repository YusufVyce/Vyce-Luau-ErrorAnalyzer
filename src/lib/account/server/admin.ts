/**
 * The admin panel. The owner (the "vyce" account) can do everything,
 * including choosing admins; admins can do everything except manage other
 * admins or touch the owner. Every change is written to the audit log.
 */
import { CHALLENGE_XP, challengeById } from "@/lib/challenges/challenges";
import { exerciseFor } from "@/lib/learn/homework/exercises";
import { LESSONS } from "@/lib/learn/lessons";
import { PATH } from "@/lib/learn/path";
import { practiceXp } from "@/lib/learn/path/session";
import { normalizeProgress, type Progress } from "@/lib/learn/progress";
import {
  IMAGE_KINDS,
  LEAGUES,
  usernameError,
  type AdminAction,
  type AdminStats,
  type AdminUserDetail,
  type AdminUserRow,
  type AdminUsersFilter,
  type AdminUsersSort,
  type AuditEntry,
  type BanRecord,
  type DayStat,
  type NameBan,
  type Result,
  type Role,
  type SiteSettings,
} from "../shared";
import { newRecoveryCode, normalizeRecoveryCode, sha256Hex } from "./crypto";
import type { ForumService } from "./forum";
import type { Cmd, KV } from "./kv";
import {
  fail,
  hash,
  isoWeek,
  num,
  P,
  streakEndingAt,
  utcDay,
  type AccountService,
  type User,
} from "./service";
import { homeworkReward } from "./verify";

export type Actor = { id: string; name: string; role: Role };

const DAY_MS = 86_400_000;
const USERS_PAGE = 50;
const AUDIT_KEEP = 1000;
const NAME_RE = /^[a-z0-9_]{1,20}$/;
const QUIZ_XP = 20;

function shiftDay(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return utcDay(d);
}

function parseBan(raw: unknown, now: number): BanRecord | null {
  if (typeof raw !== "string") return null;
  try {
    const b = JSON.parse(raw) as BanRecord;
    return b.until && b.until <= now ? null : b;
  } catch {
    return null;
  }
}

export class AdminService {
  constructor(
    private kv: KV,
    private accounts: AccountService,
    private forum: ForumService,
    private now: () => Date = () => new Date(),
  ) {}

  /** The signed-in owner or admin, or null for everyone else. */
  async actor(token: string | undefined): Promise<Actor | null> {
    const v = await this.accounts.viewer(token);
    if (!v) return null;
    const role = await this.accounts.roleOf(v.id, v.name);
    return role ? { ...v, role } : null;
  }

  private async log(actor: Actor, action: string, target?: string, detail?: string) {
    const entry: AuditEntry = { at: this.now().getTime(), by: actor.name, action, target, detail };
    await this.kv.pipeline([
      ["LPUSH", `${P}audit`, JSON.stringify(entry)],
      ["LTRIM", `${P}audit`, 0, AUDIT_KEEP - 1],
    ]);
  }

  async audit(page: number): Promise<{ entries: AuditEntry[]; total: number }> {
    const start = Math.max(0, page) * 50;
    const [raw, total] = (await this.kv.pipeline([
      ["LRANGE", `${P}audit`, start, start + 49],
      ["LLEN", `${P}audit`],
    ])) as [string[], number];
    const entries = (raw ?? []).flatMap((r) => {
      try {
        return [JSON.parse(r) as AuditEntry];
      } catch {
        return [];
      }
    });
    return { entries, total: num(total) };
  }

  // ------------------------------------------------------------------ users index

  /** Accounts made before the admin panel aren't in users:created yet: add them once. */
  private async ensureUserIndex(): Promise<void> {
    const [count, indexed] = await this.kv.pipeline([
      ["HLEN", `${P}lb:names`],
      ["ZCARD", `${P}users:created`],
    ]);
    if (num(indexed) >= num(count)) return;
    const ids = Object.keys(hash(await this.kv.run(["HGETALL", `${P}lb:names`])));
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const scores = (await this.kv.run(["ZMSCORE", `${P}users:created`, ...chunk])) as unknown[];
      const missing = chunk.filter((_, j) => scores?.[j] === null || scores?.[j] === undefined);
      if (missing.length === 0) continue;
      const created = await this.kv.pipeline(
        missing.map((id): Cmd => ["HGET", `${P}u:${id}`, "created"]),
      );
      const zadd: Cmd = ["ZADD", `${P}users:created`];
      missing.forEach((id, j) => {
        zadd.push(Date.parse(String(created[j] ?? "")) || 0, id);
      });
      await this.kv.run(zadd);
    }
  }

  /** List rows for ids, with names, XP, photos, sign-up time, role and ban state. */
  private async rows(ids: string[], names?: Record<string, string>): Promise<AdminUserRow[]> {
    if (ids.length === 0) return [];
    const [n, xps, created, avs, bans] = await this.kv.pipeline([
      names ? ["HLEN", `${P}none`] : ["HMGET", `${P}lb:names`, ...ids],
      ["ZMSCORE", `${P}lb:all`, ...ids],
      ["ZMSCORE", `${P}users:created`, ...ids],
      ["HMGET", `${P}av`, ...ids],
      ["HMGET", `${P}bans`, ...ids],
    ]);
    const { owner, admins } = await this.accounts.roles();
    const now = this.now().getTime();
    return ids.flatMap((id, i) => {
      const name = names ? names[id] : (n as Array<string | null>)[i];
      if (!name) return [];
      const role: Role | undefined = id === owner ? "owner" : admins.has(id) ? "admin" : undefined;
      return [
        {
          id,
          name,
          avatar: num((avs as unknown[])[i]),
          xp: num((xps as unknown[])[i]),
          createdAt: num((created as unknown[])[i]),
          banned: parseBan((bans as unknown[])[i], now) !== null,
          ...(role ? { role } : {}),
        },
      ];
    });
  }

  async listUsers(input: {
    query: string;
    sort: AdminUsersSort;
    filter: AdminUsersFilter;
    page: number;
  }): Promise<{ users: AdminUserRow[]; total: number }> {
    await this.ensureUserIndex();
    const names = hash(await this.kv.run(["HGETALL", `${P}lb:names`]));
    const q = input.query.trim().toLowerCase();
    const ids = Object.keys(names).filter(
      (id) => !q || names[id].toLowerCase().includes(q) || id === q,
    );
    let rows = await this.rows(ids, names);
    if (input.filter === "banned") rows = rows.filter((r) => r.banned);
    if (input.filter === "admins") rows = rows.filter((r) => r.role);
    rows.sort((a, b) =>
      input.sort === "xp"
        ? b.xp - a.xp
        : input.sort === "name"
          ? a.name.localeCompare(b.name)
          : b.createdAt - a.createdAt,
    );
    const start = Math.max(0, input.page) * USERS_PAGE;
    return { users: rows.slice(start, start + USERS_PAGE), total: rows.length };
  }

  async user(id: string): Promise<AdminUserDetail | null> {
    const user = await this.accounts.loadUser(id);
    if (!user) return null;
    const now = this.now();
    const [row] = await this.rows([id]);
    if (!row) return null;
    const [weekXp, sessions, followers, following, rawBan] = await this.kv.pipeline([
      ["ZSCORE", `${P}lb:w:${isoWeek(now)}`, id],
      ["SCARD", `${P}u:${id}:s`],
      ["SCARD", `${P}u:${id}:fby`],
      ["SCARD", `${P}u:${id}:f`],
      ["HGET", `${P}bans`, id],
    ]);
    const p = user.progress;
    const today = utcDay(now);
    const latest = p.days.filter((d) => d <= shiftDay(today, 1)).at(-1) ?? null;
    const streak = latest && latest >= shiftDay(today, -2) ? streakEndingAt(p.days, latest) : 0;
    return {
      ...row,
      banner: num(user.fields.bv),
      streak,
      league: Math.min(LEAGUES.length - 1, Math.max(0, num(user.fields.league))),
      weekXp: num(weekXp),
      lastDay: latest,
      sessions: num(sessions),
      followers: num(followers),
      following: num(following),
      forumPosts: await this.forum.postCount(id),
      ban: parseBan(rawBan, now.getTime()),
      quiz: p.quiz,
      homework: p.homework,
      challenges: p.challenges,
      stars: p.stars,
    };
  }

  // ------------------------------------------------------------------ actions on one account

  /** Changes XP (all-time; `boards` also changes today's, this week's and the league board). */
  private async changeXp(id: string, user: User, next: number, boards: boolean): Promise<void> {
    const old = num(user.fields.xp);
    const xp = Math.max(0, Math.min(10_000_000, Math.round(next)));
    const delta = xp - old;
    const now = this.now();
    const cmds: Cmd[] = [
      ["HSET", `${P}u:${id}`, "xp", xp],
      xp > 0 ? ["ZADD", `${P}lb:all`, xp, id] : ["ZREM", `${P}lb:all`, id],
    ];
    if (boards && delta !== 0) {
      const week = isoWeek(now);
      for (const key of [
        `${P}lb:d:${utcDay(now)}`,
        `${P}lb:w:${week}`,
        `${P}lb:lg:${week}:${num(user.fields.league)}`,
      ]) {
        cmds.push(["ZINCRBY", key, delta, id]);
      }
    }
    await this.kv.pipeline(cmds);
    user.fields.xp = String(xp);
    this.accounts.forgetBoards();
  }

  /** Saves edited progress and tells the student's browsers to take the new copy. */
  private async saveEdited(id: string, progress: Progress): Promise<void> {
    await this.accounts.saveProgress(id, progress);
    await this.kv.run(["HINCRBY", `${P}u:${id}`, "rev", 1]);
  }

  private lessonEdit(p: Progress, ids: string[], done: boolean): number {
    let xp = 0;
    const practice = practiceXp({ firstTime: true, mistakes: 0 });
    for (const id of ids) {
      const lesson = LESSONS.find((l) => l.id === id);
      if (!lesson) continue;
      const hasHomework = Boolean(exerciseFor(id));
      if (done) {
        if (lesson.quiz && !p.quiz.includes(id)) {
          p.quiz.push(id);
          xp += QUIZ_XP;
        }
        if (hasHomework && !p.homework.includes(id)) {
          p.homework.push(id);
          xp += homeworkReward(false, 0);
        }
        if (PATH[id]) {
          if (!(id in p.stars)) xp += practice;
          p.stars[id] = 3;
        }
      } else {
        if (p.quiz.includes(id)) {
          p.quiz = p.quiz.filter((x) => x !== id);
          xp -= QUIZ_XP;
        }
        if (p.homework.includes(id)) {
          p.homework = p.homework.filter((x) => x !== id);
          xp -= homeworkReward(false, 0);
        }
        if (id in p.stars) {
          delete p.stars[id];
          xp -= practice;
        }
        delete p.quizMisses[id];
      }
    }
    return xp;
  }

  private challengeEdit(p: Progress, ids: string[], done: boolean): number {
    let xp = 0;
    for (const id of ids) {
      const ch = challengeById(id);
      if (!ch) continue;
      const reward = CHALLENGE_XP[ch.difficulty];
      if (done && !p.challenges.includes(id)) {
        p.challenges.push(id);
        xp += reward;
      } else if (!done && p.challenges.includes(id)) {
        p.challenges = p.challenges.filter((x) => x !== id);
        xp -= reward;
      }
    }
    return xp;
  }

  async act(
    actor: Actor,
    id: string,
    action: AdminAction,
  ): Promise<Result<{ user: AdminUserDetail | null; code?: string; removed?: number }>> {
    const user = await this.accounts.loadUser(id);
    if (!user) return fail("not_found");
    const name = user.fields.name;
    const targetRole = await this.accounts.roleOf(id, name);
    // Only the owner touches admins; nobody bans, deletes or demotes the owner.
    if (targetRole && actor.role !== "owner" && id !== actor.id) return fail("forbidden");
    if (targetRole === "owner" && ["ban", "delete", "role", "rename"].includes(action.kind)) {
      return fail("forbidden");
    }
    if (action.kind === "role" && actor.role !== "owner") return fail("forbidden");
    if ((action.kind === "ban" || action.kind === "delete") && id === actor.id) {
      return fail("forbidden");
    }

    let code: string | undefined;
    let removed: number | undefined;
    switch (action.kind) {
      case "ban": {
        const reason = action.reason.replace(/\s+/g, " ").trim().slice(0, 300);
        const days = Math.max(0, Math.min(3650, Math.floor(action.days)));
        const ban: BanRecord = {
          reason,
          until: days > 0 ? this.now().getTime() + days * DAY_MS : 0,
          by: actor.name,
          at: this.now().getTime(),
        };
        await this.kv.run(["HSET", `${P}bans`, id, JSON.stringify(ban)]);
        await this.accounts.endAllSessions(id);
        this.accounts.forgetBoards();
        if (action.deletePosts) removed = await this.forum.removeAllBy(id);
        await this.log(actor, "ban", name, `${days ? `${days}d` : "permanent"}: ${reason}`);
        break;
      }
      case "unban":
        await this.kv.run(["HDEL", `${P}bans`, id]);
        this.accounts.forgetBoards();
        await this.log(actor, "unban", name);
        break;
      case "xp": {
        const amount = Math.round(action.amount);
        if (!Number.isFinite(amount)) return fail("bad_request");
        const before = num(user.fields.xp);
        const next = action.mode === "add" ? before + amount : amount;
        await this.changeXp(id, user, next, action.boards);
        await this.log(actor, "xp", name, `${before} → ${user.fields.xp}`);
        break;
      }
      case "lessons":
      case "challenges": {
        const p = normalizeProgress(user.progress);
        const ids = action.ids.slice(0, 200);
        const xp =
          action.kind === "lessons"
            ? this.lessonEdit(p, ids, action.done)
            : this.challengeEdit(p, ids, action.done);
        await this.saveEdited(id, p);
        if (action.xp && xp !== 0) await this.changeXp(id, user, num(user.fields.xp) + xp, false);
        await this.log(
          actor,
          action.kind,
          name,
          `${action.done ? "+" : "-"}${ids.join(", ")}${action.xp ? ` (${xp >= 0 ? "+" : ""}${xp} XP)` : ""}`,
        );
        break;
      }
      case "resetProgress": {
        const now = this.now();
        const week = isoWeek(now);
        await this.saveEdited(id, normalizeProgress({ dailyGoal: user.progress.dailyGoal }));
        await this.kv.pipeline([
          ["HSET", `${P}u:${id}`, "xp", 0, "streak", 0, "dayXp", 0],
          ["ZREM", `${P}lb:all`, id],
          ["ZREM", `${P}lb:streak`, id],
          ["ZREM", `${P}lb:d:${utcDay(now)}`, id],
          ["ZREM", `${P}lb:w:${week}`, id],
          ["ZREM", `${P}lb:lg:${week}:${num(user.fields.league)}`, id],
          ["HDEL", `${P}lb:sday`, id],
        ]);
        this.accounts.forgetBoards();
        await this.log(actor, "resetProgress", name);
        break;
      }
      case "rename": {
        const next = action.name.trim();
        const bad = usernameError(next);
        if (bad && bad !== "reserved_username") return fail(bad);
        const lower = next.toLowerCase();
        if (lower !== name.toLowerCase()) {
          const claimed = await this.kv.run(["SET", `${P}u:name:${lower}`, id, "NX"]);
          if (claimed !== "OK") return fail("username_taken");
          await this.kv.run(["DEL", `${P}u:name:${name.toLowerCase()}`]);
        }
        await this.kv.pipeline([
          ["HSET", `${P}u:${id}`, "name", next],
          ["HSET", `${P}lb:names`, id, next],
        ]);
        this.accounts.forgetBoards();
        await this.log(actor, "rename", name, `→ ${next}`);
        break;
      }
      case "recovery": {
        code = newRecoveryCode();
        await this.kv.run([
          "HSET",
          `${P}u:${id}`,
          "rec",
          await sha256Hex(normalizeRecoveryCode(code)),
        ]);
        await this.log(actor, "recovery", name);
        break;
      }
      case "logout":
        await this.accounts.endAllSessions(id);
        await this.log(actor, "logout", name);
        break;
      case "removeImage":
        if (!IMAGE_KINDS.includes(action.image)) return fail("bad_request");
        await this.accounts.dropImage(id, action.image);
        await this.log(actor, "removeImage", name, action.image);
        break;
      case "deletePosts":
        removed = await this.forum.removeAllBy(id);
        await this.log(actor, "deletePosts", name, String(removed));
        break;
      case "delete":
        await this.accounts.purgeUser(id, user);
        await this.log(actor, "delete", name);
        return { ok: true, user: null };
      case "role":
        await this.kv.run([action.admin ? "SADD" : "SREM", `${P}admins`, id]);
        this.accounts.forgetRoles();
        await this.log(actor, action.admin ? "addAdmin" : "removeAdmin", name);
        break;
      default:
        return fail("bad_request");
    }
    return { ok: true, user: await this.user(id), code, removed };
  }

  /** Makes someone an admin (or not) by name; the owner only. */
  async setRoleByName(actor: Actor, name: string, admin: boolean): Promise<Result<object>> {
    if (actor.role !== "owner") return fail("forbidden");
    const id = await this.accounts.idForName(name);
    if (!id) return fail("not_found");
    const r = await this.act(actor, id, { kind: "role", admin });
    return r.ok ? { ok: true } : r;
  }

  // ------------------------------------------------------------------ name bans

  async nameBans(): Promise<{ bans: NameBan[]; matches: Record<string, string[]> }> {
    const bans = await this.accounts.nameBans();
    const names = Object.values(hash(await this.kv.run(["HGETALL", `${P}lb:names`])));
    const matches: Record<string, string[]> = {};
    for (const b of bans) {
      matches[b.name] = names
        .filter((n) =>
          b.mode === "exact" ? n.toLowerCase() === b.name : n.toLowerCase().includes(b.name),
        )
        .slice(0, 20);
    }
    return { bans, matches };
  }

  async addNameBan(actor: Actor, name: string, mode: NameBan["mode"]): Promise<Result<object>> {
    const lower = name.trim().toLowerCase();
    if (!NAME_RE.test(lower)) return fail("bad_request");
    await this.kv.run([
      "HSET",
      `${P}namebans`,
      lower,
      JSON.stringify({ mode, by: actor.name, at: this.now().getTime() }),
    ]);
    await this.log(actor, "nameBan", lower, mode);
    return { ok: true };
  }

  async removeNameBan(actor: Actor, name: string): Promise<Result<object>> {
    await this.kv.run(["HDEL", `${P}namebans`, name.trim().toLowerCase()]);
    await this.log(actor, "nameUnban", name.trim().toLowerCase());
    return { ok: true };
  }

  // ------------------------------------------------------------------ settings

  async setSettings(actor: Actor, s: SiteSettings): Promise<Result<{ settings: SiteSettings }>> {
    const announcement = s.announcement.replace(/\s+/g, " ").trim().slice(0, 300);
    await this.kv.run([
      "HSET",
      `${P}settings`,
      "announcement",
      announcement,
      "tone",
      s.tone === "warn" ? "warn" : "info",
      "signupsClosed",
      s.signupsClosed ? "1" : "",
      "forumReadOnly",
      s.forumReadOnly ? "1" : "",
    ]);
    this.accounts.forgetSettings();
    await this.log(
      actor,
      "settings",
      undefined,
      [
        announcement ? `"${announcement}"` : "no announcement",
        s.signupsClosed ? "signups closed" : "signups open",
        s.forumReadOnly ? "forum read-only" : "forum open",
      ].join(", "),
    );
    return { ok: true, settings: await this.accounts.settings() };
  }

  async logForum(actor: Actor, action: string, target: string, detail?: string) {
    await this.log(actor, action, target, detail);
  }

  // ------------------------------------------------------------------ overview

  async stats(): Promise<AdminStats> {
    await this.ensureUserIndex();
    const now = this.now();
    const today = utcDay(now);
    const week = isoWeek(now);
    const days = Array.from({ length: 30 }, (_, i) => shiftDay(today, i - 29));
    const head: Cmd[] = [
      ["HLEN", `${P}lb:names`],
      ["HGETALL", `${P}bans`],
      ["SCARD", `${P}admins`],
      ["ZCARD", `${P}lb:w:${week}`],
      ["ZCARD", `${P}f:all`],
      ["HGETALL", `${P}stats:t`],
      ["HGETALL", `${P}stats:lessons`],
      ["ZREVRANGE", `${P}lb:all`, 0, 19_999, "WITHSCORES"],
      ["ZREVRANGE", `${P}lb:all`, 0, 9],
      ["ZREVRANGE", `${P}users:created`, 0, 9],
    ];
    const leagueCmds: Cmd[] = LEAGUES.map((_, t) => ["ZCARD", `${P}lb:lg:${week}:${t}`]);
    const dayCmds: Cmd[] = days.flatMap((d): Cmd[] => [
      ["HGETALL", `${P}stats:d:${d}`],
      ["SCARD", `${P}stats:a:${d}`],
    ]);
    const r = await this.kv.pipeline([...head, ...leagueCmds, ...dayCmds]);
    const [users, bansRaw, admins, activeWeek, threads, totals, lessonsRaw, allXp, top, newest] = r;
    const leagues = r.slice(head.length, head.length + LEAGUES.length).map(num);
    const dayStats: DayStat[] = days.map((day, i) => {
      const h = hash(r[head.length + LEAGUES.length + i * 2]);
      return {
        day,
        signups: num(h.signups),
        logins: num(h.logins),
        active: num(r[head.length + LEAGUES.length + i * 2 + 1]),
        xp: num(h.xp),
        posts: num(h.posts),
      };
    });
    const nowMs = now.getTime();
    const banned = Object.values(hash(bansRaw)).filter((b) => parseBan(b, nowMs)).length;
    const flat = (allXp as string[]) ?? [];
    let totalXp = 0;
    for (let i = 1; i < flat.length; i += 2) totalXp += num(flat[i]);
    const t = hash(totals);
    const sum = (n: number) => dayStats.slice(-n).reduce((acc, d) => acc + d.signups, 0);
    const lessonCounts = hash(lessonsRaw);
    const [topUsers, newUsers] = await Promise.all([
      this.rows((top as string[]) ?? []),
      this.rows((newest as string[]) ?? []),
    ]);
    return {
      users: num(users),
      banned,
      admins: num(admins) + 1,
      signupsToday: dayStats.at(-1)?.signups ?? 0,
      signups7: sum(7),
      signups30: sum(30),
      activeToday: dayStats.at(-1)?.active ?? 0,
      activeWeek: num(activeWeek),
      totalXp,
      xpToday: dayStats.at(-1)?.xp ?? 0,
      threads: num(threads),
      posts: num(t.posts),
      postsToday: dayStats.at(-1)?.posts ?? 0,
      reports: await this.forum.reportCount(),
      imageBytes: Math.max(0, num(t.imageBytes)),
      leagues,
      days: dayStats,
      topUsers,
      newUsers,
      lessons: LESSONS.map((l) => ({ id: l.id, done: num(lessonCounts[l.id]) })),
    };
  }
}
