import { beforeEach, describe, expect, it } from "vitest";
import { splitFences } from "@/components/forum/fences";
import { FORUM_POSTS_PAGE, imageUrl } from "../shared";
import { cleanText, ForumService } from "./forum";
import { decodeBase64, imageType } from "./images";
import { MemoryKV } from "./kv";
import { AccountService } from "./service";

let now: Date;
let kv: MemoryKV;
let svc: AccountService;
let forum: ForumService;

beforeEach(() => {
  now = new Date("2026-10-01T10:00:00Z");
  kv = new MemoryKV(() => now.getTime());
  svc = new AccountService(kv, () => now);
  forum = new ForumService(kv, svc, () => now);
});

let ipN = 0;
async function user(name: string) {
  const r = await svc.signup({ username: name, password: "correct horse" }, `10.1.0.${ipN++}`);
  if (!r.ok) throw new Error(r.error);
  return r;
}

const later = (ms: number) => {
  now = new Date(now.getTime() + ms);
};

// Smallest valid files of each kind (only the first bytes matter to the check).
const PNG = btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0));
const WEBP = btoa("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ");
const SVG = btoa('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

describe("profile images", () => {
  it("recognizes PNG, JPEG and WebP and nothing else", () => {
    expect(imageType(decodeBase64(PNG)!)).toBe("image/png");
    expect(imageType(decodeBase64(WEBP)!)).toBe("image/webp");
    expect(imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(imageType(decodeBase64(SVG)!)).toBeNull();
    expect(decodeBase64("not base64!")).toBeNull();
  });

  it("stores a photo, shows its version everywhere and serves it", async () => {
    const a = await user("Painter");
    now = new Date(now.getTime() + 1000);
    const r = await svc.setImage(a.token, "avatar", PNG);
    expect(r.ok && r.user.avatar).toBe(now.getTime());
    const img = await svc.image(a.user.id, "avatar");
    expect(img?.type).toBe("image/png");
    const prof = await svc.profile("painter", undefined);
    expect(prof.ok && prof.profile.avatar).toBe(now.getTime());
    expect(prof.ok && prof.profile.banner).toBe(0);
    expect(imageUrl(a.user.id, "avatar", 5)).toBe(`/api/img/${a.user.id}/avatar?v=5`);

    const removed = await svc.removeImage(a.token, "avatar");
    expect(removed.ok && removed.user.avatar).toBe(0);
    expect(await svc.image(a.user.id, "avatar")).toBeNull();
  });

  it("rejects SVG, junk, oversized files and strangers", async () => {
    const a = await user("Careful");
    expect(await svc.setImage(a.token, "avatar", SVG)).toEqual({ ok: false, error: "bad_image" });
    expect(await svc.setImage(a.token, "banner", "AAAA")).toEqual({
      ok: false,
      error: "bad_image",
    });
    const big = btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47) + "x".repeat(130_000));
    expect(await svc.setImage(a.token, "avatar", big)).toEqual({ ok: false, error: "bad_image" });
    expect(await svc.setImage("nope", "avatar", PNG)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await svc.image("../etc", "avatar")).toBeNull();
    expect(await svc.image(a.user.id, "script")).toBeNull();
  });

  it("deleting an account deletes its images", async () => {
    const a = await user("Leaving");
    await svc.setImage(a.token, "banner", WEBP);
    await svc.deleteAccount(a.token, { password: "correct horse" });
    expect(await svc.image(a.user.id, "banner")).toBeNull();
  });
});

describe("forum", () => {
  it("creates threads, lists them by activity and takes replies", async () => {
    const a = await user("Asker");
    const b = await user("Helper");
    const t1 = await forum.create(a.token, {
      title: "  Why is my   part nil? ",
      category: "help",
      body: "It says\r\n\r\n\r\n\r\n\r\nattempt to index nil",
    });
    expect(t1.ok).toBe(true);
    later(60_000);
    const t2 = await forum.create(b.token, {
      title: "My obby",
      category: "showcase",
      body: "Look!",
    });
    expect(t2.ok).toBe(true);
    if (!t1.ok || !t2.ok) return;

    let list = await forum.list("all", 0);
    expect(list.ok && list.threads.map((t) => t.id)).toEqual([t2.id, t1.id]);
    expect(list.ok && list.threads[1].title).toBe("Why is my part nil?");

    later(60_000);
    const r = await forum.reply(b.token, { id: t1.id, body: "Use WaitForChild" });
    expect(r).toEqual({ ok: true, n: 2, page: 0 });

    later(11_000);
    list = await forum.list("all", 0);
    expect(list.ok && list.threads[0].id).toBe(t1.id);
    expect(list.ok && list.threads[0].replies).toBe(1);
    expect(list.ok && list.threads[0].lastBy?.name).toBe("Helper");

    const help = await forum.list("help", 0);
    expect(help.ok && help.threads.map((t) => t.id)).toEqual([t1.id]);

    const th = await forum.thread(t1.id, 0, undefined);
    expect(th.ok && th.thread.posts.map((p) => [p.n, p.author.name, p.body])).toEqual([
      [1, "Asker", "It says\n\n\nattempt to index nil"],
      [2, "Helper", "Use WaitForChild"],
    ]);
    expect(th.ok && th.thread.canModerate).toBe(false);
  });

  it("checks titles, bodies, categories and sign-in", async () => {
    const a = await user("Writer");
    const bad = { ok: false, error: "bad_request" };
    expect(await forum.create(a.token, { title: "Hi", category: "help", body: "x" })).toEqual(bad);
    expect(await forum.create(a.token, { title: "Hello", category: "help", body: "   " })).toEqual(
      bad,
    );
    expect(await forum.create(a.token, { title: "Hello", category: "spam", body: "x" })).toEqual(
      bad,
    );
    expect(await forum.create(undefined, { title: "Hello", category: "help", body: "x" })).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await forum.reply(a.token, { id: 999, body: "x" })).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("rate-limits bursts of posts", async () => {
    const a = await user("Spammer");
    const results = [];
    for (let i = 0; i < 4; i++) {
      results.push(
        (await forum.create(a.token, { title: `Thread ${i}`, category: "general", body: "x" })).ok,
      );
    }
    expect(results).toEqual([true, true, true, false]);
  });

  it("lets authors delete their posts and admins moderate", async () => {
    const owner = await user("vyce");
    const a = await user("Author");
    const b = await user("Other");
    const t = await forum.create(a.token, { title: "Question", category: "help", body: "?" });
    if (!t.ok) throw new Error(t.error);
    later(31_000);
    await forum.reply(b.token, { id: t.id, body: "answer" });

    expect(await forum.remove(a.token, { id: t.id, n: 2 })).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(await forum.remove(b.token, { id: t.id, n: 2 })).toEqual({
      ok: true,
      threadDeleted: false,
    });
    let th = await forum.thread(t.id, 0, owner.token);
    expect(th.ok && th.thread.posts[1]).toMatchObject({ deleted: true, body: "" });
    expect(th.ok && th.thread.canModerate).toBe(true);

    expect(await forum.moderate(a.token, { id: t.id, action: "lock" })).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(await forum.moderate(owner.token, { id: t.id, action: "lock" })).toEqual({ ok: true });
    later(31_000);
    expect(await forum.reply(b.token, { id: t.id, body: "more" })).toEqual({
      ok: false,
      error: "locked",
    });
    expect((await forum.reply(owner.token, { id: t.id, body: "Locked." })).ok).toBe(true);

    await forum.moderate(owner.token, { id: t.id, action: "pin" });
    const t2 = await forum.create(b.token, { title: "Newer", category: "general", body: "x" });
    expect(t2.ok).toBe(true);
    const list = await forum.list("all", 0);
    expect(list.ok && list.threads[0]).toMatchObject({ id: t.id, pinned: true, locked: true });

    th = await forum.thread(t.id, 0, undefined);
    expect(th.ok && th.thread.canModerate).toBe(false);
    expect(await forum.remove(owner.token, { id: t.id, n: 1 })).toEqual({
      ok: true,
      threadDeleted: true,
    });
    expect(await forum.thread(t.id, 0, undefined)).toEqual({ ok: false, error: "not_found" });
    const after = await forum.list("all", 0);
    expect(after.ok && after.threads.map((x) => x.title)).toEqual(["Newer"]);
  });

  it("pages long threads and shows deleted accounts", async () => {
    const a = await user("Talker");
    const t = await forum.create(a.token, { title: "Long one", category: "general", body: "1" });
    if (!t.ok) throw new Error(t.error);
    for (let i = 2; i <= FORUM_POSTS_PAGE + 2; i++) {
      later(31_000);
      await kv.run(["DEL", `vyce:rl:forumPost:${a.user.id}`]);
      await forum.reply(a.token, { id: t.id, body: String(i) });
    }
    const last = await forum.thread(t.id, -1, undefined);
    expect(last.ok && last.thread.page).toBe(1);
    expect(last.ok && last.thread.posts.map((p) => p.body)).toEqual(["31", "32"]);
    await svc.deleteAccount(a.token, { password: "correct horse" });
    const first = await forum.thread(t.id, 0, undefined);
    expect(first.ok && first.thread.author.name).toBe("");
  });
});

describe("forum text", () => {
  it("cleans line endings and long gaps", () => {
    expect(cleanText("a\r\nb\r\r\r\r\rc  ")).toBe("a\nb\n\n\nc");
  });

  it("splits code fences, including an unclosed one", () => {
    expect(splitFences("Hi\n```lua\nprint(1)\n```\nbye")).toEqual([
      { code: false, text: "Hi" },
      { code: true, text: "print(1)", lang: "lua" },
      { code: false, text: "bye" },
    ]);
    expect(splitFences("```\nlocal x = 1")).toEqual([
      { code: true, text: "local x = 1", lang: "" },
    ]);
  });
});
