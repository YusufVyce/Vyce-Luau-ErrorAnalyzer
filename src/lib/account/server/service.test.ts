import { beforeEach, describe, expect, it } from "vitest";
import { CHALLENGES } from "@/lib/challenges/challenges";
import { EXERCISES } from "@/lib/learn/homework/exercises";
import { LESSONS } from "@/lib/learn/lessons";
import { PATH } from "@/lib/learn/path";
import { EMPTY_PROGRESS, type Progress } from "@/lib/learn/progress";
import type { Claim, SolvedStep } from "../shared";
import { hashPassword, newRecoveryCode, verifyPassword } from "./crypto";
import { MemoryKV, findUpstashEnv } from "./kv";
import { AccountService, PRACTICE_GAP_MS, isoWeek, leagueZones, streakEndingAt } from "./service";

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

async function signup(
  name = "Builderman",
  extra: Partial<Parameters<typeof svc.signup>[0]> = {},
  ip = IP,
) {
  const r = await svc.signup({ username: name, password: "correct horse", ...extra }, ip);
  if (!r.ok) throw new Error(r.error);
  return r;
}

const hw = (id: string) => EXERCISES.find((e) => e.lessonId === id)!;
const quizAnswer = (id: string) => LESSONS.find((l) => l.id === id)!.quiz!.answer;
const quizIds = LESSONS.filter((l) => l.quiz).map((l) => l.id);

/** The right answer to every exercise step of a lesson. */
function rightAnswers(lessonId: string): SolvedStep[] {
  return PATH[lessonId].steps.flatMap((s, step): SolvedStep[] => {
    if (s.kind === "learn") return [];
    if (s.kind === "order") return [{ lessonId, step, seq: s.lines.map((_, i) => i) }];
    return [{ lessonId, step, pick: s.answer }];
  });
}

async function claim(token: string, c: Claim) {
  const r = await svc.claim(token, c);
  if (!r.ok) throw new Error(r.error);
  return r;
}

const quiz = (token: string, lessonId: string, day?: string) =>
  claim(token, { kind: "quiz", lessonId, answer: quizAnswer(lessonId), day });

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

describe("store settings", () => {
  it("finds Upstash settings under Vercel's names and custom prefixes", () => {
    expect(findUpstashEnv({ KV_REST_API_URL: "https://a", KV_REST_API_TOKEN: "t" })).toEqual({
      url: "https://a",
      token: "t",
    });
    expect(
      findUpstashEnv({ STORAGE_KV_REST_API_URL: "https://b", STORAGE_KV_REST_API_TOKEN: "u" }),
    ).toEqual({ url: "https://b", token: "u" });
    expect(findUpstashEnv({ UPSTASH_REDIS_REST_URL: "https://c" })).toBeNull();
  });
});

describe("accounts", () => {
  it("signs up, keeps the session and never stores the plain password", async () => {
    const r = await signup();
    expect(r.user.name).toBe("Builderman");
    expect(r.token.length).toBeGreaterThan(30);
    expect((await svc.me(r.token))?.user.name).toBe("Builderman");
    const stored = await kv.run<string[]>(["HGETALL", `vyce:u:${r.user.id}`]);
    expect(stored.join(" ")).not.toContain("correct horse");
  });

  it("rejects bad or taken usernames and short passwords", async () => {
    await signup();
    expect(await svc.signup({ username: "builderMAN", password: "12345678" }, IP)).toEqual({
      ok: false,
      error: "username_taken",
    });
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

  it("logs in case-insensitively, rejects wrong passwords and rate-limits guessing", async () => {
    await signup();
    const ok = await svc.login({ username: "builderman", password: "correct horse" }, IP);
    expect(ok.ok).toBe(true);
    expect(await svc.login({ username: "Builderman", password: "nope nope" }, IP)).toEqual({
      ok: false,
      error: "bad_credentials",
    });
    let last;
    for (let i = 0; i < 12; i++) {
      last = await svc.login({ username: "Builderman", password: `guess${i}xx` }, IP);
    }
    expect(last).toEqual({ ok: false, error: "rate_limited" });
    now = new Date(now.getTime() + 16 * 60_000);
    const later = await svc.login({ username: "Builderman", password: "correct horse" }, IP);
    expect(later.ok).toBe(true);
  });

  it("logs out", async () => {
    const r = await signup();
    await svc.logout(r.token);
    expect(await svc.me(r.token)).toBeNull();
  });

  it("resets the password with the single-use recovery code", async () => {
    const r = await signup();
    const ok = await svc.recover(
      { username: "Builderman", code: r.recoveryCode.toLowerCase(), password: "new password" },
      IP,
    );
    expect(ok.ok).toBe(true);
    expect(await svc.me(r.token)).toBeNull();
    const again = await svc.recover(
      { username: "Builderman", code: r.recoveryCode, password: "other password" },
      IP,
    );
    expect(again).toEqual({ ok: false, error: "bad_recovery" });
  });

  it("changes the password", async () => {
    const r = await signup();
    const wrong = await svc.changePassword(r.token, { current: "nope nope", next: "brand new pw" });
    expect(wrong).toEqual({ ok: false, error: "bad_credentials" });
    const changed = await svc.changePassword(r.token, {
      current: "correct horse",
      next: "brand new pw",
    });
    expect(changed.ok).toBe(true);
    expect(await svc.me(r.token)).toBeNull();
  });
});

describe("verified XP", () => {
  it("pays for a right quiz answer once, and less after a miss", async () => {
    const { token } = await signup();
    const wrong = await claim(token, {
      kind: "quiz",
      lessonId: "variables",
      answer: (quizAnswer("variables") + 1) % 4,
    });
    expect(wrong.outcome).toEqual({ awarded: 0, correct: false });
    const right = await quiz(token, "variables");
    expect(right.outcome).toEqual({ awarded: 10, correct: true });
    expect((await quiz(token, "loops")).outcome.awarded).toBe(20);
    const twice = await quiz(token, "loops");
    expect(twice.outcome.awarded).toBe(0);
    expect(twice.user.xp).toBe(30);
  });

  it("runs homework code again on the server before paying", async () => {
    const { token } = await signup();
    const ex = hw("first-script");
    const bad = await svc.claim(token, {
      kind: "homework",
      lessonId: ex.lessonId,
      code: ex.starter,
      hints: 0,
      solution: false,
    });
    expect(bad).toEqual({ ok: false, error: "rejected" });
    const good = await claim(token, {
      kind: "homework",
      lessonId: ex.lessonId,
      code: ex.solution,
      hints: 1,
      solution: false,
    });
    // One hint costs 20 of the 100 XP.
    expect(good.outcome.awarded).toBe(80);
    expect(good.progress.homework).toEqual(["first-script"]);
  });

  it("pays no XP when the solution was looked at, but still counts the task", async () => {
    const { token } = await signup();
    const ex = hw("first-script");
    const seen = await claim(token, {
      kind: "homework",
      lessonId: ex.lessonId,
      code: ex.solution,
      hints: 0,
      solution: true,
    });
    expect(seen.outcome.awarded).toBe(0);
    expect(seen.progress.homework).toEqual(["first-script"]);
    const ch = CHALLENGES[0];
    const peeked = await claim(token, {
      kind: "challenge",
      id: ch.id,
      code: ch.solution,
      hints: 1,
      solution: true,
    });
    expect(peeked.outcome.awarded).toBe(0);
    expect(peeked.progress.challenges).toEqual([ch.id]);
  });

  it("runs challenge code again on the server", async () => {
    const { token } = await signup();
    const ch = CHALLENGES[0];
    const bad = await svc.claim(token, {
      kind: "challenge",
      id: ch.id,
      code: ch.starter,
      hints: 0,
      solution: false,
    });
    expect(bad).toEqual({ ok: false, error: "rejected" });
    const ok = await claim(token, {
      kind: "challenge",
      id: ch.id,
      code: ch.solution,
      hints: 0,
      solution: false,
    });
    expect(ok.outcome.awarded).toBeGreaterThan(0);
    expect(ok.progress.challenges).toEqual([ch.id]);
  });

  it("checks every practice answer and limits how fast practice pays", async () => {
    const { token } = await signup();
    const answers = rightAnswers("first-script");
    const practice = (a: SolvedStep[]) =>
      svc.claim(token, { kind: "practice", lessonId: "first-script", mistakes: 0, answers: a });
    expect(await practice(answers.slice(1))).toEqual({ ok: false, error: "rejected" });
    const wrongPick = answers.map((a) =>
      a.pick !== undefined ? { ...a, pick: ((a.pick ?? 0) + 1) % 2 } : a,
    );
    expect(await practice(wrongPick)).toEqual({ ok: false, error: "rejected" });
    const ok = await practice(answers);
    expect(ok.ok && ok.outcome.awarded).toBe(15);
    expect(ok.ok && ok.progress.stars["first-script"]).toBe(3);
    expect(await practice(answers)).toEqual({ ok: false, error: "rate_limited" });
    now = new Date(now.getTime() + PRACTICE_GAP_MS);
    const again = await practice(answers);
    expect(again.ok && again.outcome.awarded).toBe(10);
  });

  it("never takes XP or finished work from a sync", async () => {
    const { token } = await signup();
    await quiz(token, "loops");
    const s = await svc.sync(token, {
      progress: progress({
        xp: 99_999,
        quiz: ["variables", "tables"],
        homework: ["first-script"],
        code: { "first-script": 'print("hi")' },
        dailyGoal: 120,
      }),
    });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.progress.xp).toBe(20);
    expect(s.progress.quiz).toEqual(["loops"]);
    expect(s.progress.homework).toEqual([]);
    expect(s.progress.code["first-script"]).toBe('print("hi")');
    expect(s.progress.dailyGoal).toBe(120);
  });

  it("counts only checkable work from old browser progress (all-time board only)", async () => {
    const ex = hw("first-script");
    const r = await signup("Oldtimer", {
      progress: progress({
        xp: 999_999,
        homework: ["first-script", "variables"],
        code: { "first-script": ex.solution, variables: "-- nothing" },
        quiz: ["studio-tour"],
        days: ["2025-01-01"],
      }),
    });
    expect(r.progress.homework).toEqual(["first-script"]);
    expect(r.user.xp).toBe(100 + 20);
    expect(r.progress.days).not.toContain("2025-01-01");
    expect((await svc.leaderboard("all")).entries[0]).toMatchObject({ name: "Oldtimer" });
    expect((await svc.leaderboard("week")).entries).toEqual([]);
  });

  it("records the active day and the streak from claims", async () => {
    const { token } = await signup();
    await quiz(token, "loops", "2026-09-29");
    now = new Date("2026-09-30T20:00:00Z");
    const r = await quiz(token, "tables", "2026-09-30");
    expect(r.progress.days).toEqual(["2026-09-29", "2026-09-30"]);
    // A made-up day far away is replaced by today (UTC).
    const far = await quiz(token, "functions", "2020-01-01");
    expect(far.progress.days).not.toContain("2020-01-01");
    expect((await svc.leaderboard("streak")).entries[0]).toMatchObject({ score: 2 });
  });
});

describe("leaderboards", () => {
  async function player(name: string, quizzes: string[]) {
    const r = await signup(name);
    for (const id of quizzes) await quiz(r.token, id);
    return r;
  }

  it("ranks XP by day, week and all time, with shared ranks for ties", async () => {
    const a = await player("Alpha", ["loops"]);
    await player("Bravo", ["loops", "tables"]);
    await player("Charlie", ["tables"]);
    const day = await svc.leaderboard("day", a.token);
    const rows = day.entries.map((e) => [e.rank, e.name, e.score]);
    expect(rows[0]).toEqual([1, "Bravo", 40]);
    expect(rows.slice(1).sort()).toEqual([
      [2, "Alpha", 20],
      [2, "Charlie", 20],
    ]);
    expect(day.me).toEqual({ rank: 2, score: 20 });
    expect(day.resetsAt).toBe("2026-10-01T00:00:00.000Z");
    now = new Date("2026-10-01T01:00:00Z");
    expect((await svc.leaderboard("day")).entries).toEqual([]);
    expect((await svc.leaderboard("week")).entries).toHaveLength(3);
  });

  it("shows my rank when I'm not on the board", async () => {
    const me = await signup("Late");
    expect((await svc.leaderboard("all", me.token)).me).toEqual({ rank: null, score: 0 });
  });
});

describe("leagues", () => {
  it("settles last week: the top players move up, the last ones move down", async () => {
    const players = [];
    // Six players in Bronze; the first earned the most XP, the last the least.
    for (let i = 0; i < 6; i++) {
      const r = await signup(`Player${"abcdef"[i]}`, {}, `10.0.0.${i}`);
      for (const id of quizIds.slice(0, 6 - i)) await quiz(r.token, id);
      players.push(r);
    }
    const before = await svc.league(players[0].token);
    expect(before.ok && [before.tier, before.players]).toEqual([0, 6]);
    expect(leagueZones(6)).toEqual({ promote: 1, demote: 1 });

    now = new Date("2026-10-06T09:00:00Z"); // the next week
    const top = await svc.league(players[0].token);
    expect(top.ok && top.tier).toBe(1);
    expect(top.ok && top.last).toEqual({ week: "2026-W40", from: 0, to: 1, rank: 1 });
    const middle = await svc.league(players[2].token);
    expect(middle.ok && middle.tier).toBe(0);
    // Bronze is the lowest league: nobody drops below it.
    const last = await svc.league(players[5].token);
    expect(last.ok && last.tier).toBe(0);
    // This week's XP goes to the new league's table.
    await quiz(players[0].token, quizIds[10]);
    const silver = await svc.league(players[0].token);
    expect(silver.ok && silver.entries.map((e) => e.name)).toEqual(["Playera"]);
  });

  it("needs some XP before first place moves up", async () => {
    const solo = await signup("Solo");
    await quiz(solo.token, "loops");
    now = new Date("2026-10-06T09:00:00Z");
    const r = await svc.league(solo.token);
    expect(r.ok && r.tier).toBe(0);
  });
});

describe("friends and profiles", () => {
  it("follows by username and ranks friends by this week's XP", async () => {
    const me = await signup("Myself");
    const pal = await signup("Pal");
    await quiz(pal.token, "loops");
    expect(await svc.follow(me.token, "nobody")).toEqual({ ok: false, error: "not_found" });
    expect(await svc.follow(me.token, "myself")).toEqual({ ok: false, error: "bad_request" });
    expect((await svc.follow(me.token, "PAL")).ok).toBe(true);
    const f = await svc.friends(me.token);
    expect(f.ok && f.rows.map((r) => [r.name, r.week, r.me])).toEqual([
      ["Pal", 20, false],
      ["Myself", 0, true],
    ]);
    const prof = await svc.profile("pal", me.token);
    expect(prof.ok && prof.profile).toMatchObject({
      name: "Pal",
      xp: 20,
      following: true,
      followers: 1,
      isMe: false,
      quiz: ["loops"],
    });
    await svc.unfollow(me.token, pal.user.id);
    const after = await svc.profile("Pal", me.token);
    expect(after.ok && after.profile.following).toBe(false);
  });

  it("shows earned achievements but no saved code", async () => {
    const r = await signup("Shown");
    const ex = hw("first-script");
    await claim(r.token, {
      kind: "homework",
      lessonId: ex.lessonId,
      code: ex.solution,
      hints: 0,
      solution: false,
    });
    await svc.sync(r.token, { progress: progress({ code: { "first-script": "SECRET" } }) });
    const p = await svc.profile("Shown", undefined);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.profile.achievements).toContain("first-script");
    expect(JSON.stringify(p.profile)).not.toContain("SECRET");
    expect(await svc.profile("ghost", undefined)).toEqual({ ok: false, error: "not_found" });
  });

  it("deleting an account removes it from boards and friend lists", async () => {
    const me = await signup("Myself");
    const pal = await signup("Pal");
    await quiz(pal.token, "loops");
    await svc.follow(me.token, "Pal");
    expect((await svc.deleteAccount(pal.token, { password: "correct horse" })).ok).toBe(true);
    const f = await svc.friends(me.token);
    expect(f.ok && f.rows.map((r) => r.name)).toEqual(["Myself"]);
    expect((await svc.leaderboard("all")).entries).toEqual([]);
    expect((await svc.signup({ username: "Pal", password: "12345678" }, IP)).ok).toBe(true);
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
