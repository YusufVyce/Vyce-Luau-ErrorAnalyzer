/**
 * The forum: threads in a few categories, replies, and simple moderation.
 *
 * Keys (prefixed like the account keys):
 *   f:seq           → last thread id
 *   f:t:<id>        → hash: title, cat, author, created, last, lastBy, posts, pinned, locked
 *   f:p:<id>        → hash: post number → JSON { a: author id, b: body, c: time, d?: deleted }
 *   f:all / f:c:<c> → sorted sets of thread ids by last activity (ms)
 *   f:pin           → set of pinned thread ids
 *
 * Reading is public. Writing needs an account and is rate-limited. Authors
 * can delete their own posts (deleting the opening post removes the thread);
 * admins (FORUM_ADMINS, "vyce" by default) can delete anything, pin and lock.
 */
import {
  FORUM_CATEGORIES,
  FORUM_PAGE,
  FORUM_POSTS_PAGE,
  forumBodyError,
  forumTitleError,
  type ForumAuthor,
  type ForumCategory,
  type ForumPost,
  type ForumThread,
  type ForumThreadRow,
  type Result,
} from "../shared";
import type { Cmd, KV } from "./kv";
import { fail, hash, num, P, type AccountService } from "./service";

const CATEGORY_IDS = FORUM_CATEGORIES.map((c) => c.id) as string[];

export type ModAction = "pin" | "unpin" | "lock" | "unlock";

interface StoredPost {
  a: string;
  b: string;
  c: number;
  d?: 1;
}

/** Line endings made consistent and runs of blank lines shortened. */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function parsePost(raw: unknown): StoredPost | null {
  if (typeof raw !== "string") return null;
  try {
    const p = JSON.parse(raw) as StoredPost;
    return typeof p.a === "string" && typeof p.b === "string" ? p : null;
  } catch {
    return null;
  }
}

export class ForumService {
  private listCache = new Map<
    string,
    { at: number; value: { threads: ForumThreadRow[]; total: number } }
  >();

  constructor(
    private kv: KV,
    private accounts: AccountService,
    private now: () => Date = () => new Date(),
    private admins: string[] = ["vyce"],
  ) {}

  private isAdmin(name: string): boolean {
    return this.admins.includes(name.toLowerCase());
  }

  private author(
    id: string,
    people: Map<string, { name: string; avatar: number; xp: number }>,
  ): ForumAuthor {
    const p = people.get(id);
    return { id, name: p?.name ?? "", avatar: p?.avatar ?? 0, xp: p?.xp ?? 0 };
  }

  private row(
    id: number,
    h: Record<string, string>,
    people: Map<string, { name: string; avatar: number; xp: number }>,
  ): ForumThreadRow {
    const posts = Math.max(1, num(h.posts));
    return {
      id,
      title: h.title,
      category: (CATEGORY_IDS.includes(h.cat) ? h.cat : "general") as ForumCategory,
      author: this.author(h.author, people),
      createdAt: num(h.created),
      lastAt: num(h.last),
      lastBy: posts > 1 && h.lastBy ? this.author(h.lastBy, people) : null,
      replies: posts - 1,
      pinned: h.pinned === "1",
      locked: h.locked === "1",
    };
  }

  private forgetLists() {
    this.listCache.clear();
  }

  // ------------------------------------------------------------------ reading

  async list(
    category: string,
    page: number,
  ): Promise<Result<{ threads: ForumThreadRow[]; total: number; page: number }>> {
    const cat = CATEGORY_IDS.includes(category) ? category : "all";
    const pg = Math.max(0, Math.min(1000, Math.floor(page) || 0));
    const cacheKey = `${cat}:${pg}`;
    const cached = this.listCache.get(cacheKey);
    if (cached && this.now().getTime() - cached.at < 10_000) {
      return { ok: true, ...cached.value, page: pg };
    }

    const key = cat === "all" ? `${P}f:all` : `${P}f:c:${cat}`;
    const start = pg * FORUM_PAGE;
    const [ids, total, pinned] = (await this.kv.pipeline([
      ["ZREVRANGE", key, start, start + FORUM_PAGE - 1],
      ["ZCARD", key],
      ["SMEMBERS", `${P}f:pin`],
    ])) as [string[], number, string[]];

    const pinnedIds = pg === 0 ? (pinned ?? []) : [];
    const order = [...pinnedIds, ...(ids ?? []).filter((id) => !pinnedIds.includes(id))];
    const hashes = order.length
      ? await this.kv.pipeline(order.map((id): Cmd => ["HGETALL", `${P}f:t:${id}`]))
      : [];
    const found = order
      .map((id, i) => ({ id: Number(id), h: hash(hashes[i]) }))
      .filter((t) => t.h.title && (cat === "all" || t.h.cat === cat));
    const people = await this.accounts.people(
      found.flatMap((t) => [t.h.author, t.h.lastBy].filter(Boolean)),
    );
    const threads = found.map((t) => this.row(t.id, t.h, people));
    const value = { threads, total: num(total) };
    this.listCache.set(cacheKey, { at: this.now().getTime(), value });
    return { ok: true, ...value, page: pg };
  }

  /** One page of a thread; page -1 is the last page. */
  async thread(
    id: number,
    page: number,
    token: string | undefined,
  ): Promise<Result<{ thread: ForumThread }>> {
    if (!Number.isInteger(id) || id <= 0) return fail("not_found");
    const [raw, viewer] = await Promise.all([
      this.kv.run(["HGETALL", `${P}f:t:${id}`]),
      this.accounts.viewer(token),
    ]);
    const h = hash(raw);
    if (!h.title) return fail("not_found");
    const total = Math.max(1, num(h.posts));
    const pages = Math.ceil(total / FORUM_POSTS_PAGE);
    const pg = page < 0 ? pages - 1 : Math.max(0, Math.min(pages - 1, Math.floor(page) || 0));
    const first = pg * FORUM_POSTS_PAGE + 1;
    const numbers = Array.from(
      { length: Math.min(FORUM_POSTS_PAGE, total - first + 1) },
      (_, i) => first + i,
    );
    const rawPosts = (await this.kv.run(["HMGET", `${P}f:p:${id}`, ...numbers])) as unknown[];
    const stored = numbers
      .map((n, i) => ({ n, p: parsePost(rawPosts?.[i]) }))
      .filter((x): x is { n: number; p: StoredPost } => x.p !== null);
    const people = await this.accounts.people([
      h.author,
      ...(h.lastBy ? [h.lastBy] : []),
      ...stored.map((x) => x.p.a),
    ]);
    const posts: ForumPost[] = stored.map(({ n, p }) => ({
      n,
      author: this.author(p.a, people),
      body: p.d ? "" : p.b,
      createdAt: p.c,
      deleted: Boolean(p.d),
    }));
    return {
      ok: true,
      thread: {
        ...this.row(id, h, people),
        posts,
        total,
        page: pg,
        canModerate: Boolean(viewer && this.isAdmin(viewer.name)),
      },
    };
  }

  // ------------------------------------------------------------------ writing

  async create(
    token: string | undefined,
    input: { title: string; category: string; body: string },
  ): Promise<Result<{ id: number }>> {
    const viewer = await this.accounts.viewer(token);
    if (!viewer) return fail("unauthorized");
    const title = input.title.replace(/\s+/g, " ").trim();
    const body = cleanText(input.body);
    if (!CATEGORY_IDS.includes(input.category)) return fail("bad_request");
    const bad = forumTitleError(title) ?? forumBodyError(body);
    if (bad) return fail(bad);
    if (
      (await this.accounts.limited("forumThread", viewer.id)) ||
      (await this.accounts.limited("forumBurst", viewer.id))
    ) {
      return fail("rate_limited");
    }
    const id = num(await this.kv.run(["INCR", `${P}f:seq`]));
    const at = this.now().getTime();
    const post: StoredPost = { a: viewer.id, b: body, c: at };
    await this.kv.pipeline([
      [
        "HSET",
        `${P}f:t:${id}`,
        "title",
        title,
        "cat",
        input.category,
        "author",
        viewer.id,
        "created",
        at,
        "last",
        at,
        "lastBy",
        viewer.id,
        "posts",
        1,
      ],
      ["HSET", `${P}f:p:${id}`, 1, JSON.stringify(post)],
      ["ZADD", `${P}f:all`, at, id],
      ["ZADD", `${P}f:c:${input.category}`, at, id],
    ]);
    this.forgetLists();
    return { ok: true, id };
  }

  async reply(
    token: string | undefined,
    input: { id: number; body: string },
  ): Promise<Result<{ n: number; page: number }>> {
    const viewer = await this.accounts.viewer(token);
    if (!viewer) return fail("unauthorized");
    const body = cleanText(input.body);
    const bad = forumBodyError(body);
    if (bad) return fail(bad);
    const h = hash(await this.kv.run(["HGETALL", `${P}f:t:${input.id}`]));
    if (!h.title) return fail("not_found");
    if (h.locked === "1" && !this.isAdmin(viewer.name)) return fail("locked");
    if (
      (await this.accounts.limited("forumPost", viewer.id)) ||
      (await this.accounts.limited("forumBurst", viewer.id))
    ) {
      return fail("rate_limited");
    }
    const n = num(await this.kv.run(["HINCRBY", `${P}f:t:${input.id}`, "posts", 1]));
    const at = this.now().getTime();
    const post: StoredPost = { a: viewer.id, b: body, c: at };
    await this.kv.pipeline([
      ["HSET", `${P}f:p:${input.id}`, n, JSON.stringify(post)],
      ["HSET", `${P}f:t:${input.id}`, "last", at, "lastBy", viewer.id],
      ["ZADD", `${P}f:all`, at, input.id],
      ["ZADD", `${P}f:c:${h.cat}`, at, input.id],
    ]);
    this.forgetLists();
    return { ok: true, n, page: Math.floor((n - 1) / FORUM_POSTS_PAGE) };
  }

  /** Deletes a post (the author or an admin). Deleting the opening post removes the thread. */
  async remove(
    token: string | undefined,
    input: { id: number; n: number },
  ): Promise<Result<{ threadDeleted: boolean }>> {
    const viewer = await this.accounts.viewer(token);
    if (!viewer) return fail("unauthorized");
    const [rawThread, rawPost] = await this.kv.pipeline([
      ["HGETALL", `${P}f:t:${input.id}`],
      ["HGET", `${P}f:p:${input.id}`, input.n],
    ]);
    const h = hash(rawThread);
    const post = parsePost(rawPost);
    if (!h.title || !post) return fail("not_found");
    if (post.a !== viewer.id && !this.isAdmin(viewer.name)) return fail("forbidden");
    if (input.n === 1) {
      await this.kv.pipeline([
        ["DEL", `${P}f:t:${input.id}`, `${P}f:p:${input.id}`],
        ["ZREM", `${P}f:all`, input.id],
        ["ZREM", `${P}f:c:${h.cat}`, input.id],
        ["SREM", `${P}f:pin`, input.id],
      ]);
      this.forgetLists();
      return { ok: true, threadDeleted: true };
    }
    const gone: StoredPost = { a: post.a, b: "", c: post.c, d: 1 };
    await this.kv.run(["HSET", `${P}f:p:${input.id}`, input.n, JSON.stringify(gone)]);
    return { ok: true, threadDeleted: false };
  }

  async moderate(
    token: string | undefined,
    input: { id: number; action: ModAction },
  ): Promise<Result<object>> {
    const viewer = await this.accounts.viewer(token);
    if (!viewer) return fail("unauthorized");
    if (!this.isAdmin(viewer.name)) return fail("forbidden");
    const exists = await this.kv.run(["HGET", `${P}f:t:${input.id}`, "title"]);
    if (!exists) return fail("not_found");
    const key = `${P}f:t:${input.id}`;
    const cmds: Cmd[] =
      input.action === "pin"
        ? [
            ["HSET", key, "pinned", "1"],
            ["SADD", `${P}f:pin`, input.id],
          ]
        : input.action === "unpin"
          ? [
              ["HSET", key, "pinned", ""],
              ["SREM", `${P}f:pin`, input.id],
            ]
          : [["HSET", key, "locked", input.action === "lock" ? "1" : ""]];
    await this.kv.pipeline(cmds);
    this.forgetLists();
    return { ok: true };
  }
}
