import { beforeEach, describe, expect, it } from "vitest";
import { EMPTY_PROGRESS, type Progress } from "@/lib/learn/progress";
import { hashPassword, newRecoveryCode, verifyPassword } from "./crypto";
import { MemoryKV } from "./kv";
import {
  AccountService,
  DAILY_XP_CAP,
  IMPORT_XP_CAP,
  SYNC_XP_CAP,
  isoWeek,
  streakEndingAt,
} from "./service";

const IP = "203.0.113.7";
const progress = (p: Partial<Progress>): Progress => ({ ...EMPTY_PROGRESS, ...p });

let now: Date;
let kv: MemoryKV;
let svc: AccountService;

beforeEach(() => {
  now = new Date("2026-09-30T10:00:00Z");
  kv = new MemoryKV(() => now.getTime());
  svc = new AccountService(kv, () => now);
});

async function signup(name = "Builderman", extra: Partial<Parameters<typeof svc.signup>[0]> = {}) {
  const r = await svc.signup({ username: name, password: "correct horse", ...extra }, IP);
  if (!r.ok) throw new Error(r.error);
  return r;
}

describe("passwords", () => {
  it("hashes with a salt and verifies", async () => {
    const a = await hashPassword("hunter22");
    const b = await hashPassword("hunter22");
    expect(a).not.toBe(b);
    expect(a.startsWith("pbkdf2-sha256$100000$")).toBe(true);
    expect(await verifyPassword("hunter22", a)).toBe(true);
    expect(await verifyPassword("hunter23", a)).toBe(false);
    expect(await verifyPassword("hunter22", "garbage")).toBe(false);
  });
  it("makes readable recovery codes", () => {
    expect(newRecoveryCode()).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
});

describe("accounts", () => {
  it("signs up, keeps the session and never stores the plain password", async () => {
    const r = await signup();
    expect(r.user.name).toBe("Builderman");
    expect(r.token.length).toBeGreaterThan(30);
    const me = await svc.me(r.token);
    expect(me?.user.name).toBe("Builderman");
    const stored = await kv.run<string[]>(["HGETALL", `vyce:u:${r.user.id}`]);
    expect(stored.join(" ")).not.toContain("correct horse");
  });

  it("rejects bad or taken usernames and short passwords", async () => {
    await signup();
    const taken = await svc.signup({ username: "builderMAN", password: "12345678" }, IP);
    expect(taken).toEqual({ ok: false, error: "username_taken" });
    expect(await svc.signup({ username: "a b", password: "12345678" }, IP)).toEqual({
      ok: false,
      error: "invalid_username",
    });
    expect(await svc.signup({ username: "Admin", password: "12345678" }, IP)).toEqual({
      ok: false,
      error: "reserved_username",
    });
    expect(await svc.signup({ username: "Noob", password: "short" }, IP)).toEqual({
      ok: false,
      error: "invalid_password",
    });
  });

  it("logs in case-insensitively and rejects wrong passwords", async () => {
    await signup();
    const ok = await svc.login({ username: "builderman", password: "correct horse" }, IP);
    expect(ok.ok).toBe(true);
    const bad = await svc.login({ username: "Builderman", password: "nope nope" }, IP);
    expect(bad).toEqual({ ok: false, error: "bad_credentials" });
    const ghost = await svc.login({ username: "Nobody", password: "whatever1" }, IP);
    expect(ghost).toEqual({ ok: false, error: "bad_credentials" });
  });

  it("rate-limits password guessing", async () => {
    await signup();
    let last;
    for (let i = 0; i < 12; i++) {
      last = await svc.login({ username: "Builderman", password: `guess${i}xx` }, IP);
    }
    expect(last).toEqual({ ok: false, error: "rate_limited" });
    // The window ends.
    now = new Date(now.getTime() + 16 * 60_000);
    const r = await svc.login({ username: "Builderman", password: "correct horse" }, IP);
    expect(r.ok).toBe(true);
  });

  it("logs out", async () => {
    const r = await signup();
    await svc.logout(r.token);
    expect(await svc.me(r.token)).toBeNull();
  });

  it("resets the password with the recovery code, once", async () => {
    const r = await signup();
    const bad = await svc.recover(
      { username: "Builderman", code: "AAAA-BBBB-CCCC-DDDD", password: "new password" },
      IP,
    );
    expect(bad).toEqual({ ok: false, error: "bad_recovery" });
    const code = r.recoveryCode.toLowerCase().replace(/-/g, " ");
    const ok = await svc.recover({ username: "Builderman", code, password: "new password" }, IP);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.recoveryCode).not.toBe(r.recoveryCode);
    // Old sessions end, the old code no longer works, the new password does.
    expect(await svc.me(r.token)).toBeNull();
    const again = await svc.recover(
      { username: "Builderman", code: r.recoveryCode, password: "other password" },
      IP,
    );
    expect(again).toEqual({ ok: false, error: "bad_recovery" });
    const login = await svc.login({ username: "Builderman", password: "new password" }, IP);
    expect(login.ok).toBe(true);
  });

  it("changes the password and deletes the account", async () => {
    const r = await signup();
    const wrong = await svc.changePassword(r.token, { current: "nope nope", next: "brand new pw" });
    expect(wrong).toEqual({ ok: false, error: "bad_credentials" });
    const changed = await svc.changePassword(r.token, {
      current: "correct horse",
      next: "brand new pw",
    });
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    expect(await svc.me(r.token)).toBeNull();
    await svc.sync(changed.token, { progress: progress({ xp: 50 }), baseXp: 0 });
    const del = await svc.deleteAccount(changed.token, { password: "brand new pw" });
    expect(del.ok).toBe(true);
    expect(await svc.me(changed.token)).toBeNull();
    expect((await svc.leaderboard("all")).entries).toEqual([]);
    // The name is free again.
    expect((await svc.signup({ username: "Builderman", password: "12345678" }, IP)).ok).toBe(true);
  });
});

describe("progress sync", () => {
  it("brings guest progress into a new account (all-time only)", async () => {
    const r = await signup("Guest1", {
      progress: progress({ xp: 240, quiz: ["studio-tour"], days: ["2026-09-01", "2026-09-30"] }),
    });
    expect(r.user.xp).toBe(240);
    expect(r.progress.quiz).toEqual(["studio-tour"]);
    expect((await svc.leaderboard("all")).entries[0]).toMatchObject({ name: "Guest1", score: 240 });
    expect((await svc.leaderboard("day")).entries).toEqual([]);
  });

  it("caps imported XP", async () => {
    const r = await signup("Guest2", { progress: progress({ xp: 999_999 }) });
    expect(r.user.xp).toBe(IMPORT_XP_CAP);
  });

  it("adds only XP earned since the last sync and merges progress", async () => {
    const r = await signup();
    const a = await svc.sync(r.token, {
      progress: progress({ xp: 40, quiz: ["studio-tour"], days: ["2026-09-30"] }),
      baseXp: 0,
    });
    expect(a.ok && a.user.xp).toBe(40);
    // Another device (base 0) earned 25 and finished a different lesson.
    const b = await svc.sync(r.token, {
      progress: progress({ xp: 25, quiz: ["first-script"] }),
      baseXp: 0,
    });
    expect(b.ok && b.user.xp).toBe(65);
    expect(b.ok && b.progress.quiz.sort()).toEqual(["first-script", "studio-tour"]);
    // Nothing new: nothing added. A lower XP never takes XP away.
    const c = await svc.sync(r.token, { progress: progress({ xp: 10 }), baseXp: 65 });
    expect(c.ok && c.user.xp).toBe(65);
  });

  it("limits XP per sync and per day", async () => {
    const r = await signup();
    const one = await svc.sync(r.token, { progress: progress({ xp: 50_000 }), baseXp: 0 });
    expect(one.ok && one.added).toBe(SYNC_XP_CAP);
    let xp = one.ok ? one.user.xp : 0;
    for (let i = 0; i < 5; i++) {
      const s = await svc.sync(r.token, { progress: progress({ xp: xp + 900 }), baseXp: xp });
      xp = s.ok ? s.user.xp : xp;
    }
    expect(xp).toBe(DAILY_XP_CAP);
    now = new Date("2026-10-01T09:00:00Z");
    const next = await svc.sync(r.token, { progress: progress({ xp: xp + 100 }), baseXp: xp });
    expect(next.ok && next.user.xp).toBe(DAILY_XP_CAP + 100);
  });

  it("does not accept back-filled streak days", async () => {
    const r = await signup();
    const s = await svc.sync(r.token, {
      progress: progress({
        xp: 10,
        days: ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30"],
      }),
      baseXp: 0,
    });
    expect(s.ok && s.progress.days).toEqual(["2026-09-29", "2026-09-30"]);
  });
});

describe("leaderboards", () => {
  async function player(name: string, xp: number, days: string[] = ["2026-09-30"]) {
    const r = await signup(name);
    await svc.sync(r.token, { progress: progress({ xp, days }), baseXp: 0 });
    return r;
  }

  it("ranks by XP for the day, week and all time, with shared ranks for ties", async () => {
    const a = await player("Alpha", 300);
    await player("Bravo", 500);
    await player("Charlie", 300);
    const day = await svc.leaderboard("day", a.token);
    // Ties share a rank (their order among themselves doesn't matter).
    const rows = day.entries.map((e) => [e.rank, e.name, e.score]);
    expect(rows[0]).toEqual([1, "Bravo", 500]);
    expect(rows.slice(1).sort()).toEqual([
      [2, "Alpha", 300],
      [2, "Charlie", 300],
    ]);
    expect(day.me).toEqual({ rank: 2, score: 300 });
    expect(day.resetsAt).toBe("2026-10-01T00:00:00.000Z");
    expect((await svc.leaderboard("week")).resetsAt).toBe("2026-10-05T00:00:00.000Z");
    expect((await svc.leaderboard("all")).entries).toHaveLength(3);
  });

  it("starts a new day and week", async () => {
    await player("Alpha", 300);
    now = new Date("2026-10-01T01:00:00Z");
    expect((await svc.leaderboard("day")).entries).toEqual([]);
    expect((await svc.leaderboard("week")).entries).toHaveLength(1);
    now = new Date("2026-10-05T01:00:00Z");
    expect((await svc.leaderboard("week")).entries).toEqual([]);
    expect((await svc.leaderboard("all")).entries).toHaveLength(1);
  });

  it("ranks streaks and drops broken ones", async () => {
    await signup("Streaky", {
      progress: progress({ xp: 5, days: ["2026-09-28", "2026-09-29", "2026-09-30"] }),
    });
    await player("OneDay", 10, ["2026-09-30"]);
    const s = await svc.leaderboard("streak");
    expect(s.entries.map((e) => [e.name, e.score])).toEqual([
      ["Streaky", 3],
      ["OneDay", 1],
    ]);
    now = new Date("2026-10-04T12:00:00Z");
    expect((await svc.leaderboard("streak")).entries).toEqual([]);
  });

  it("shows my rank when I'm not in the top list", async () => {
    const me = await signup("Late");
    const lb = await svc.leaderboard("all", me.token);
    expect(lb.me).toEqual({ rank: null, score: 0 });
  });
});

describe("dates", () => {
  it("uses ISO weeks", () => {
    expect(isoWeek(new Date("2026-09-30T10:00:00Z"))).toBe("2026-W40");
    expect(isoWeek(new Date("2027-01-01T10:00:00Z"))).toBe("2026-W53");
  });
  it("counts streaks", () => {
    expect(streakEndingAt(["2026-09-29", "2026-09-30", "2026-09-27"], "2026-09-30")).toBe(2);
  });
});
