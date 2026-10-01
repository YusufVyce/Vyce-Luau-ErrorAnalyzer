import { beforeEach, describe, expect, it } from "vitest";
import { CHALLENGES } from "@/lib/challenges/challenges";
import { LESSONS } from "@/lib/learn/lessons";
import { AdminService, type Actor } from "./admin";
import { ForumService } from "./forum";
import { CHUNK, decodeBase64, loadBlob, saveBlob } from "./images";
import { MemoryKV } from "./kv";
import { AccountService } from "./service";

let now: Date;
let kv: MemoryKV;
let svc: AccountService;
let forum: ForumService;
let admin: AdminService;

beforeEach(() => {
  now = new Date("2026-10-01T10:00:00Z");
  kv = new MemoryKV(() => now.getTime());
  svc = new AccountService(kv, () => now);
  forum = new ForumService(kv, svc, () => now);
  admin = new AdminService(kv, svc, forum, () => now);
});

const later = (ms: number) => {
  now = new Date(now.getTime() + ms);
};

let ipN = 0;
async function user(name: string) {
  const r = await svc.signup({ username: name, password: "correct horse" }, `10.2.0.${ipN++}`);
  if (!r.ok) throw new Error(`${name}: ${r.error}`);
  return r;
}

async function actorFor(token: string): Promise<Actor> {
  const a = await admin.actor(token);
  if (!a) throw new Error("not an admin");
  return a;
}

const PNG = btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0));
const GIF = btoa("GIF89a" + "\u0000".repeat(20));

describe("roles", () => {
  it("shows roles on profiles and says who may manage them", async () => {
    const owner = await user("vyce");
    const helper = await user("Helper");
    const other = await user("Other");
    await admin.setRoleByName(await actorFor(owner.token), "helper", true);
    svc.forgetRoles();
    const view = async (name: string, token?: string) => {
      const r = await svc.profile(name, token);
      if (!r.ok) throw new Error(r.error);
      return r.profile;
    };
    expect((await view("vyce")).role).toBe("owner");
    expect((await view("helper")).role).toBe("admin");
    expect((await view("other")).role).toBeUndefined();
    // Nobody signed in, or a regular player: no manage link.
    expect((await view("other")).canManage).toBeUndefined();
    expect((await view("helper", other.token)).canManage).toBeUndefined();
    // The owner manages everyone; an admin manages players and themselves, not other staff.
    expect((await view("helper", owner.token)).canManage).toBe(true);
    expect((await view("other", helper.token)).canManage).toBe(true);
    expect((await view("helper", helper.token)).canManage).toBe(true);
    expect((await view("vyce", helper.token)).canManage).toBeUndefined();
  });

  it("makes vyce the owner, pinned to the account, and lets only the owner add admins", async () => {
    const owner = await user("vyce");
    const helper = await user("Helper");
    const other = await user("Other");
    expect((await svc.me(owner.token))?.user.role).toBe("owner");
    expect(await admin.actor(helper.token)).toBeNull();

    const o = await actorFor(owner.token);
    expect(await admin.setRoleByName(o, "helper", true)).toEqual({ ok: true });
    svc.forgetRoles();
    const h = await actorFor(helper.token);
    expect(h.role).toBe("admin");
    expect((await svc.me(helper.token))?.user.role).toBe("admin");

    // Admins can't make admins, act on other admins or on the owner.
    expect(await admin.setRoleByName(h, "other", true)).toEqual({ ok: false, error: "forbidden" });
    expect(await admin.act(h, owner.user.id, { kind: "logout" })).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(
      await admin.act(o, owner.user.id, { kind: "ban", reason: "x", days: 0, deletePosts: false }),
    ).toEqual({ ok: false, error: "forbidden" });
    const r = await admin.act(h, other.user.id, {
      kind: "xp",
      mode: "add",
      amount: 5,
      boards: false,
    });
    expect(r.ok && r.user?.xp).toBe(5);

    // Renaming the owner isn't allowed; the owner role stays with the account id.
    expect(await admin.act(o, owner.user.id, { kind: "rename", name: "boss" })).toEqual({
      ok: false,
      error: "forbidden",
    });
  });
});

describe("bans", () => {
  it("blocks sign-in with the reason, ends sessions and hides the account", async () => {
    const owner = await user("vyce");
    const bad = await user("Griefer");
    const o = await actorFor(owner.token);
    await svc.claim(bad.token, {
      kind: "quiz",
      lessonId: LESSONS.find((l) => l.quiz)!.id,
      answer: LESSONS.find((l) => l.quiz)!.quiz!.answer,
    });
    expect((await svc.leaderboard("all")).entries.map((e) => e.name)).toContain("Griefer");

    const r = await admin.act(o, bad.user.id, {
      kind: "ban",
      reason: "spam",
      days: 2,
      deletePosts: false,
    });
    expect(r.ok && r.user?.banned).toBe(true);
    expect(await svc.me(bad.token)).toBeNull();
    const login = await svc.login({ username: "griefer", password: "correct horse" }, "1.1.1.1");
    expect(login).toMatchObject({ ok: false, error: "banned", ban: { reason: "spam" } });
    expect((await svc.leaderboard("all")).entries.map((e) => e.name)).not.toContain("Griefer");
    expect(await svc.profile("griefer", undefined)).toEqual({ ok: false, error: "banned" });

    // A temporary ban runs out on its own.
    later(3 * 86_400_000);
    expect(
      (await svc.login({ username: "griefer", password: "correct horse" }, "1.1.1.2")).ok,
    ).toBe(true);
  });

  it("bans names exactly or by a part, for sign-ups only", async () => {
    const owner = await user("vyce");
    const o = await actorFor(owner.token);
    await admin.addNameBan(o, "Admin", "exact");
    later(1000);
    await admin.addNameBan(o, "nazi", "contains");
    const signup = (name: string) =>
      svc.signup({ username: name, password: "correct horse" }, `10.3.0.${ipN++}`);
    expect(await signup("ADMIN")).toEqual({ ok: false, error: "reserved_username" });
    expect((await signup("admin2")).ok).toBe(true);
    expect(await signup("xNaziX")).toEqual({ ok: false, error: "reserved_username" });
    const list = await admin.nameBans();
    expect(list.bans.map((b) => [b.name, b.mode])).toEqual([
      ["nazi", "contains"],
      ["admin", "exact"],
    ]);
    expect(list.matches.admin).toEqual([]);
    await admin.removeNameBan(o, "nazi");
    expect((await signup("nazi_hunter")).ok).toBe(true);
    expect(await admin.addNameBan(o, "bad name!", "exact")).toEqual({
      ok: false,
      error: "bad_request",
    });
  });
});

describe("editing accounts", () => {
  it("adds and sets XP, optionally on this week's boards", async () => {
    const owner = await user("vyce");
    const s = await user("Student");
    const o = await actorFor(owner.token);
    let r = await admin.act(o, s.user.id, { kind: "xp", mode: "add", amount: 250, boards: true });
    expect(r.ok && r.user?.xp).toBe(250);
    expect(r.ok && r.user?.weekXp).toBe(250);
    r = await admin.act(o, s.user.id, { kind: "xp", mode: "set", amount: 40, boards: false });
    expect(r.ok && r.user?.xp).toBe(40);
    expect((await svc.leaderboard("all")).entries.find((e) => e.name === "Student")?.score).toBe(
      40,
    );
    r = await admin.act(o, s.user.id, { kind: "xp", mode: "add", amount: -100, boards: false });
    expect(r.ok && r.user?.xp).toBe(0);
  });

  it("completes and removes lessons and challenges, and tells browsers to reload", async () => {
    const owner = await user("vyce");
    const s = await user("Learner");
    const o = await actorFor(owner.token);
    const lesson = LESSONS[0];
    let r = await admin.act(o, s.user.id, {
      kind: "lessons",
      ids: [lesson.id],
      done: true,
      xp: true,
    });
    expect(r.ok && r.user?.homework).toContain(lesson.id);
    expect(r.ok && r.user?.xp).toBeGreaterThan(100);
    const me = await svc.me(s.token);
    expect(me?.user.rev).toBe(1);
    expect(me?.progress.homework).toContain(lesson.id);

    r = await admin.act(o, s.user.id, {
      kind: "lessons",
      ids: [lesson.id],
      done: false,
      xp: true,
    });
    expect(r.ok && r.user?.homework).not.toContain(lesson.id);
    expect(r.ok && r.user?.xp).toBe(0);

    const ch = CHALLENGES[0];
    r = await admin.act(o, s.user.id, { kind: "challenges", ids: [ch.id], done: true, xp: false });
    expect(r.ok && r.user?.challenges).toEqual([ch.id]);
    expect(r.ok && r.user?.xp).toBe(0);

    r = await admin.act(o, s.user.id, { kind: "resetProgress" });
    expect(r.ok && r.user).toMatchObject({ xp: 0, challenges: [], homework: [], quiz: [] });
    expect((await svc.me(s.token))?.user.rev).toBe(4);
  });

  it("renames, makes recovery codes, removes pictures and deletes accounts", async () => {
    const owner = await user("vyce");
    const s = await user("OldName");
    const o = await actorFor(owner.token);
    expect(await admin.act(o, s.user.id, { kind: "rename", name: "vyce" })).toEqual({
      ok: false,
      error: "username_taken",
    });
    const r = await admin.act(o, s.user.id, { kind: "rename", name: "NewName" });
    expect(r.ok && r.user?.name).toBe("NewName");
    expect(
      (await svc.login({ username: "newname", password: "correct horse" }, "1.1.1.3")).ok,
    ).toBe(true);
    expect(
      (await svc.login({ username: "oldname", password: "correct horse" }, "1.1.1.4")).ok,
    ).toBe(false);

    const rec = await admin.act(o, s.user.id, { kind: "recovery" });
    if (!rec.ok || !rec.code) throw new Error("no code");
    const back = await svc.recover(
      { username: "NewName", code: rec.code, password: "new password" },
      "1.1.1.5",
    );
    expect(back.ok).toBe(true);

    await svc.setImage(back.ok ? back.token : "", "avatar", PNG);
    const removed = await admin.act(o, s.user.id, { kind: "removeImage", image: "avatar" });
    expect(removed.ok && removed.user?.avatar).toBe(0);

    expect(await admin.act(o, s.user.id, { kind: "delete" })).toEqual({ ok: true, user: null });
    expect(await svc.profile("newname", undefined)).toEqual({ ok: false, error: "not_found" });
  });
});

describe("settings", () => {
  it("closes sign-ups and makes the forum read-only for everyone but admins", async () => {
    const owner = await user("vyce");
    const s = await user("Poster");
    const o = await actorFor(owner.token);
    await admin.setSettings(o, {
      announcement: "  Maintenance   tonight ",
      tone: "warn",
      signupsClosed: true,
      forumReadOnly: true,
    });
    expect(await svc.settings()).toEqual({
      announcement: "Maintenance tonight",
      tone: "warn",
      signupsClosed: true,
      forumReadOnly: true,
    });
    expect(
      await svc.signup({ username: "Latecomer", password: "correct horse" }, "10.9.9.9"),
    ).toEqual({ ok: false, error: "signups_closed" });
    expect(await forum.create(s.token, { title: "Hello", category: "general", body: "x" })).toEqual(
      {
        ok: false,
        error: "forum_closed",
      },
    );
    expect(
      (await forum.create(owner.token, { title: "News", category: "general", body: "x" })).ok,
    ).toBe(true);
  });
});

describe("overview and audit", () => {
  it("counts sign-ups, logins, XP and posts, and logs admin actions", async () => {
    const owner = await user("vyce");
    const s = await user("Counter");
    await svc.login({ username: "counter", password: "correct horse" }, "1.1.1.6");
    const lesson = LESSONS.find((l) => l.quiz)!;
    await svc.claim(s.token, { kind: "quiz", lessonId: lesson.id, answer: lesson.quiz!.answer });
    await forum.create(s.token, { title: "Stats", category: "general", body: "hi" });
    const o = await actorFor(owner.token);
    await admin.act(o, s.user.id, { kind: "logout" });

    const st = await admin.stats();
    expect(st.users).toBe(2);
    expect(st.signupsToday).toBe(2);
    expect(st.days.at(-1)).toMatchObject({ signups: 2, logins: 1, active: 1, xp: 20, posts: 1 });
    expect(st.totalXp).toBe(20);
    expect(st.threads).toBe(1);
    expect(st.topUsers[0].name).toBe("Counter");
    expect(st.newUsers.map((u) => u.name).sort()).toEqual(["Counter", "vyce"]);
    expect(st.days).toHaveLength(30);

    const log = await admin.audit(0);
    expect(log.entries[0]).toMatchObject({ by: "vyce", action: "logout", target: "Counter" });

    const list = await admin.listUsers({ query: "coun", sort: "xp", filter: "all", page: 0 });
    expect(list.users.map((u) => u.name)).toEqual(["Counter"]);
    const admins = await admin.listUsers({ query: "", sort: "new", filter: "admins", page: 0 });
    expect(admins.users.map((u) => [u.name, u.role])).toEqual([["vyce", "owner"]]);
  });
});

describe("forum pictures and reports", () => {
  it("stores big pictures in chunks", async () => {
    const big = "A".repeat(CHUNK * 2 + 400);
    await saveBlob(kv, "t", big);
    expect(await loadBlob(kv, "t")).toBe(big);
    await saveBlob(kv, "t", "QUJD");
    expect(await loadBlob(kv, "t")).toBe("QUJD");
    expect(await kv.run(["GET", "t:1"])).toBeNull();
  });

  it("attaches pictures to posts, expires unposted ones and deletes them with the post", async () => {
    const a = await user("Shooter");
    const b = await user("Thief");
    const up = await forum.uploadImage(a.token, GIF);
    const spare = await forum.uploadImage(a.token, PNG);
    if (!up.ok || !spare.ok) throw new Error("upload failed");
    expect((await forum.image(up.id))?.type).toBe("image/gif");
    expect(await forum.uploadImage(a.token, btoa("<svg/>"))).toEqual({
      ok: false,
      error: "bad_image",
    });

    // Someone else can't post your picture.
    expect(
      await forum.create(b.token, {
        title: "Stolen",
        category: "general",
        body: "",
        images: [up.id],
      }),
    ).toEqual({ ok: false, error: "bad_request" });

    const t = await forum.create(a.token, {
      title: "Pictures only",
      category: "showcase",
      body: "",
      images: [up.id],
    });
    if (!t.ok) throw new Error(t.error);
    const th = await forum.thread(t.id, 0, undefined);
    expect(th.ok && th.thread.posts[0].images).toEqual([up.id]);

    later(2 * 86_400_000);
    expect(await forum.image(up.id)).not.toBeNull();
    expect(await forum.image(spare.id)).toBeNull();

    await forum.remove(a.token, { id: t.id, n: 1 });
    expect(await forum.image(up.id)).toBeNull();
    expect(decodeBase64(GIF)).not.toBeNull();
  });

  it("collects reports for moderators and removes everything a banned spammer posted", async () => {
    const owner = await user("vyce");
    const spammer = await user("Spammer");
    const reader = await user("Reader");
    const t = await forum.create(owner.token, {
      title: "Welcome",
      category: "general",
      body: "hi",
    });
    if (!t.ok) throw new Error(t.error);
    later(31_000);
    await forum.reply(spammer.token, { id: t.id, body: "buy coins" });
    later(31_000);
    const own = await forum.create(spammer.token, {
      title: "Cheap Robux",
      category: "general",
      body: "!",
    });
    if (!own.ok) throw new Error(own.error);

    expect(await forum.report(reader.token, { id: t.id, n: 2, reason: "spam" })).toEqual({
      ok: true,
    });
    const reports = await forum.reports();
    expect(reports.map((r) => [r.key, r.body, r.reasons[0].reason])).toEqual([
      [`${t.id}:2`, "buy coins", "spam"],
    ]);
    const recent = await forum.recent(0);
    expect(recent.posts.map((p) => p.title)).toEqual(["Cheap Robux", "Welcome", "Welcome"]);

    const o = await actorFor(owner.token);
    const r = await admin.act(o, spammer.user.id, {
      kind: "ban",
      reason: "spam",
      days: 0,
      deletePosts: true,
    });
    expect(r.ok && r.removed).toBe(2);
    expect(await forum.thread(own.id, 0, undefined)).toEqual({ ok: false, error: "not_found" });
    const th = await forum.thread(t.id, 0, undefined);
    expect(th.ok && th.thread.posts[1].deleted).toBe(true);
    expect(await forum.reportCount()).toBe(0);
  });
});
