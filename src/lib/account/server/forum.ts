/**
 * The forum: threads in a few categories, replies with pictures, reports
 * and moderation.
 *
 * Keys (prefixed like the account keys):
 *   f:seq            → last thread id
 *   f:t:<id>         → hash: title, cat, author, created, last, lastBy, posts, pinned, locked
 *   f:p:<id>         → hash: post number → JSON { a: author id, b: body, c: time, i?: images, d?: deleted }
 *   f:all / f:c:<c>  → sorted sets of thread ids by last activity (ms)
 *   f:pin            → set of pinned thread ids
 *   f:recent         → sorted set "thread:n" by time (latest posts, for moderators)
 *   u:<id>:posts     → sorted set "thread:n" by time (one person's posts)
 *   f:img:<id>       → a picture (base64 chunks, see images.ts); f:img:<id>:m → hash: owner, type, bytes, post
 *   f:reports        → sorted set "thread:n" by last report time; f:rep:<thread:n> → list of report JSON
 *
 * Reading is public. Writing needs an account and is rate-limited. Authors
 * can delete their own posts (deleting the opening post removes the thread);
 * the owner and admins can delete anything, pin, lock, rename and move.
 */
import {
  FORUM_CATEGORIES,
  FORUM_IMAGE_SPEC,
  FORUM_IMAGES_PER_POST,
  FORUM_PAGE,
  FORUM_POSTS_PAGE,
  FORUM_REPORT_MAX,
  forumBodyError,
  forumTitleError,
  type AdminPostRow,
  type ForumAuthor,
  type ForumCategory,
  type ForumPost,
  type ForumThread,
  type ForumThreadRow,
  type ReportRow,
  type Result,
} from "../shared";
import { newImageId } from "./crypto";
import {
  decodeBase64,
  deleteBlobCmds,
  imageType,
  loadBlob,
  persistBlobCmds,
  saveBlob,
} from "./images";
import type { Cmd, KV } from "./kv";
import { fail, hash, num, P, type AccountService, type Person } from "./service";

const CATEGORY_IDS = FORUM_CATEGORIES.map((c) => c.id) as string[];
/** Pictures that are uploaded but never posted disappear after a day. */
const UNPOSTED_TTL = 86_400;
const RECENT_KEEP = 1000;

export type ModAction = "pin" | "unpin" | "lock" | "unlock";

interface StoredPost {
  a: string;
  b: string;
  c: number;
  i?: string[];
  d?: 1;
}

type Viewer = { id: string; name: string; mod: boolean };

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

const postKey = (thread: number, n: number) => `${thread}:${n}`;

function splitKey(key: string): { thread: number; n: number } | null {
  const m = /^(\d+):(\d+)$/.exec(key);
  return m ? { thread: Number(m[1]), n: Number(m[2]) } : null;
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
  ) {}

  /** The signed-in person, and whether they may moderate. */
  private async viewer(token: string | undefined): Promise<Viewer | null> {
    const v = await this.accounts.viewer(token);
    if (!v) return null;
    return { ...v, mod: Boolean(await this.accounts.roleOf(v.id, v.name)) };
  }

  private author(id: string, people: Map<string, Person>): ForumAuthor {
    const p = people.get(id);
    return {
      id,
      name: p?.name ?? "",
      avatar: p?.avatar ?? 0,
      xp: p?.xp ?? 0,
      ...(p?.role ? { role: p.role } : {}),
    };
  }

  private row(id: number, h: Record<string, string>, people: Map<string, Person>): ForumThreadRow {
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
      this.viewer(token),
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
      images: p.d ? [] : (p.i ?? []),
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
        canModerate: Boolean(viewer?.mod),
      },
    };
  }

  // ------------------------------------------------------------------ pictures

  /** Stores a picture for a post that's being written; it's deleted after a day unless posted. */
  async uploadImage(token: string | undefined, data: string): Promise<Result<{ id: string }>> {
    const viewer = await this.viewer(token);
    if (!viewer) return fail("unauthorized");
    if ((await this.accounts.settings()).forumReadOnly && !viewer.mod) return fail("forum_closed");
    if (await this.accounts.limited("forumImage", viewer.id)) return fail("rate_limited");
    const bytes = decodeBase64(data);
    const type = bytes && imageType(bytes);
    const max = type === "image/gif" ? FORUM_IMAGE_SPEC.gifMaxBytes : FORUM_IMAGE_SPEC.maxBytes;
    if (!bytes || !type || bytes.length > max) return fail("bad_image");
    const id = newImageId();
    await saveBlob(this.kv, `${P}f:img:${id}`, data, UNPOSTED_TTL);
    await this.kv.pipeline([
      ["HSET", `${P}f:img:${id}:m`, "owner", viewer.id, "type", type, "bytes", bytes.length],
      ["EXPIRE", `${P}f:img:${id}:m`, UNPOSTED_TTL],
    ]);
    return { ok: true, id };
  }

  /** A forum picture for the public image route, or null. */
  async image(id: string): Promise<{ bytes: Uint8Array<ArrayBuffer>; type: string } | null> {
    if (!/^i_[0-9a-f]{20}$/.test(id)) return null;
    const data = await loadBlob(this.kv, `${P}f:img:${id}`);
    const bytes = data ? decodeBase64(data) : null;
    const type = bytes && imageType(bytes);
    return bytes && type ? { bytes, type } : null;
  }

  /** Checks pictures someone wants to post: theirs, uploaded, not used yet. */
  private async claimImages(viewer: Viewer, ids: string[]): Promise<string[] | null> {
    const unique = [...new Set(ids)];
    if (unique.length > FORUM_IMAGES_PER_POST) return null;
    if (unique.length === 0) return [];
    const metas = await this.kv.pipeline(unique.map((id): Cmd => ["HGETALL", `${P}f:img:${id}:m`]));
    for (const raw of metas) {
      const m = hash(raw);
      if (m.owner !== viewer.id || m.post) return null;
    }
    return unique;
  }

  /** Makes posted pictures permanent and remembers which post they belong to. */
  private attachCmds(ids: string[], thread: number, n: number): Cmd[] {
    return ids.flatMap((id): Cmd[] => [
      ...persistBlobCmds(`${P}f:img:${id}`),
      ["PERSIST", `${P}f:img:${id}:m`],
      ["HSET", `${P}f:img:${id}:m`, "post", postKey(thread, n)],
    ]);
  }

  private async imageBytes(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const sizes = (await this.kv.pipeline(
      ids.map((id): Cmd => ["HGET", `${P}f:img:${id}:m`, "bytes"]),
    )) as unknown[];
    return sizes.reduce<number>((sum, b) => sum + num(b), 0);
  }

  private async dropImagesCmds(ids: string[]): Promise<Cmd[]> {
    if (ids.length === 0) return [];
    const bytes = await this.imageBytes(ids);
    return [
      ...ids.flatMap((id) => deleteBlobCmds(`${P}f:img:${id}`)),
      ["DEL", ...ids.map((id) => `${P}f:img:${id}:m`)],
      ...this.accounts.stat("imageBytes", -bytes),
    ];
  }

  // ------------------------------------------------------------------ writing

  private async canPost(viewer: Viewer): Promise<boolean> {
    return viewer.mod || !(await this.accounts.settings()).forumReadOnly;
  }

  async create(
    token: string | undefined,
    input: { title: string; category: string; body: string; images?: string[] },
  ): Promise<Result<{ id: number }>> {
    const viewer = await this.viewer(token);
    if (!viewer) return fail("unauthorized");
    if (!(await this.canPost(viewer))) return fail("forum_closed");
    const title = input.title.replace(/\s+/g, " ").trim();
    const body = cleanText(input.body);
    if (!CATEGORY_IDS.includes(input.category)) return fail("bad_request");
    const images = await this.claimImages(viewer, input.images ?? []);
    if (!images) return fail("bad_request");
    const bad = forumTitleError(title) ?? forumBodyError(body, images.length);
    if (bad) return fail(bad);
    if (
      (await this.accounts.limited("forumThread", viewer.id)) ||
      (await this.accounts.limited("forumBurst", viewer.id))
    ) {
      return fail("rate_limited");
    }
    const id = num(await this.kv.run(["INCR", `${P}f:seq`]));
    const at = this.now().getTime();
    const post: StoredPost = {
      a: viewer.id,
      b: body,
      c: at,
      ...(images.length ? { i: images } : {}),
    };
    const imgBytes = await this.imageBytes(images);
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
      ...this.indexCmds(viewer.id, id, 1, at),
      ...this.attachCmds(images, id, 1),
      ...this.accounts.stat("posts"),
      ...this.accounts.stat("threads"),
      ...(imgBytes ? this.accounts.stat("imageBytes", imgBytes) : []),
    ]);
    this.forgetLists();
    return { ok: true, id };
  }

  /** Latest posts (for moderators) and one person's posts. */
  private indexCmds(author: string, thread: number, n: number, at: number): Cmd[] {
    const key = postKey(thread, n);
    return [
      ["ZADD", `${P}f:recent`, at, key],
      ["ZREMRANGEBYRANK", `${P}f:recent`, 0, -(RECENT_KEEP + 1)],
      ["ZADD", `${P}u:${author}:posts`, at, key],
    ];
  }

  async reply(
    token: string | undefined,
    input: { id: number; body: string; images?: string[] },
  ): Promise<Result<{ n: number; page: number }>> {
    const viewer = await this.viewer(token);
    if (!viewer) return fail("unauthorized");
    if (!(await this.canPost(viewer))) return fail("forum_closed");
    const body = cleanText(input.body);
    const images = await this.claimImages(viewer, input.images ?? []);
    if (!images) return fail("bad_request");
    const bad = forumBodyError(body, images.length);
    if (bad) return fail(bad);
    const h = hash(await this.kv.run(["HGETALL", `${P}f:t:${input.id}`]));
    if (!h.title) return fail("not_found");
    if (h.locked === "1" && !viewer.mod) return fail("locked");
    if (
      (await this.accounts.limited("forumPost", viewer.id)) ||
      (await this.accounts.limited("forumBurst", viewer.id))
    ) {
      return fail("rate_limited");
    }
    const n = num(await this.kv.run(["HINCRBY", `${P}f:t:${input.id}`, "posts", 1]));
    const at = this.now().getTime();
    const post: StoredPost = {
      a: viewer.id,
      b: body,
      c: at,
      ...(images.length ? { i: images } : {}),
    };
    const imgBytes = await this.imageBytes(images);
    await this.kv.pipeline([
      ["HSET", `${P}f:p:${input.id}`, n, JSON.stringify(post)],
      ["HSET", `${P}f:t:${input.id}`, "last", at, "lastBy", viewer.id],
      ["ZADD", `${P}f:all`, at, input.id],
      ["ZADD", `${P}f:c:${h.cat}`, at, input.id],
      ...this.indexCmds(viewer.id, input.id, n, at),
      ...this.attachCmds(images, input.id, n),
      ...this.accounts.stat("posts"),
      ...(imgBytes ? this.accounts.stat("imageBytes", imgBytes) : []),
    ]);
    this.forgetLists();
    return { ok: true, n, page: Math.floor((n - 1) / FORUM_POSTS_PAGE) };
  }

  /** Deletes a thread with its posts and pictures. */
  private async dropThread(id: number, h: Record<string, string>): Promise<void> {
    const posts = hash(await this.kv.run(["HGETALL", `${P}f:p:${id}`]));
    const images: string[] = [];
    const keys: Array<{ author: string; key: string }> = [];
    for (const [n, raw] of Object.entries(posts)) {
      const p = parsePost(raw);
      if (!p) continue;
      images.push(...(p.i ?? []));
      keys.push({ author: p.a, key: postKey(id, Number(n)) });
    }
    await this.kv.pipeline([
      ["DEL", `${P}f:t:${id}`, `${P}f:p:${id}`],
      ["ZREM", `${P}f:all`, id],
      ["ZREM", `${P}f:c:${h.cat}`, id],
      ["SREM", `${P}f:pin`, id],
      ...(keys.length ? [["ZREM", `${P}f:recent`, ...keys.map((k) => k.key)] as Cmd] : []),
      ...(keys.length ? [["ZREM", `${P}f:reports`, ...keys.map((k) => k.key)] as Cmd] : []),
      ...keys.map((k): Cmd => ["ZREM", `${P}u:${k.author}:posts`, k.key]),
      ...keys.map((k): Cmd => ["DEL", `${P}f:rep:${k.key}`]),
      ...(await this.dropImagesCmds(images)),
    ]);
    this.forgetLists();
  }

  /** Empties one post (it stays as "deleted" so the numbering doesn't change). */
  private async dropPost(id: number, n: number, post: StoredPost): Promise<void> {
    const gone: StoredPost = { a: post.a, b: "", c: post.c, d: 1 };
    const key = postKey(id, n);
    await this.kv.pipeline([
      ["HSET", `${P}f:p:${id}`, n, JSON.stringify(gone)],
      ["ZREM", `${P}f:recent`, key],
      ["ZREM", `${P}f:reports`, key],
      ["DEL", `${P}f:rep:${key}`],
      ["ZREM", `${P}u:${post.a}:posts`, key],
      ...(await this.dropImagesCmds(post.i ?? [])),
    ]);
  }

  /** Deletes a post (the author or a moderator). Deleting the opening post removes the thread. */
  async remove(
    token: string | undefined,
    input: { id: number; n: number },
  ): Promise<Result<{ threadDeleted: boolean }>> {
    const viewer = await this.viewer(token);
    if (!viewer) return fail("unauthorized");
    const [rawThread, rawPost] = await this.kv.pipeline([
      ["HGETALL", `${P}f:t:${input.id}`],
      ["HGET", `${P}f:p:${input.id}`, input.n],
    ]);
    const h = hash(rawThread);
    const post = parsePost(rawPost);
    if (!h.title || !post) return fail("not_found");
    if (post.a !== viewer.id && !viewer.mod) return fail("forbidden");
    if (input.n === 1) {
      await this.dropThread(input.id, h);
      return { ok: true, threadDeleted: true };
    }
    await this.dropPost(input.id, input.n, post);
    return { ok: true, threadDeleted: false };
  }

  async moderate(
    token: string | undefined,
    input: { id: number; action: ModAction },
  ): Promise<Result<object>> {
    const viewer = await this.viewer(token);
    if (!viewer) return fail("unauthorized");
    if (!viewer.mod) return fail("forbidden");
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

  // ------------------------------------------------------------------ reports

  async report(
    token: string | undefined,
    input: { id: number; n: number; reason: string },
  ): Promise<Result<object>> {
    const viewer = await this.viewer(token);
    if (!viewer) return fail("unauthorized");
    const reason = input.reason.replace(/\s+/g, " ").trim().slice(0, FORUM_REPORT_MAX);
    if (!reason) return fail("bad_request");
    if (await this.accounts.limited("forumReport", viewer.id)) return fail("rate_limited");
    const post = parsePost(await this.kv.run(["HGET", `${P}f:p:${input.id}`, input.n]));
    if (!post || post.d) return fail("not_found");
    const key = postKey(input.id, input.n);
    const at = this.now().getTime();
    await this.kv.pipeline([
      ["ZADD", `${P}f:reports`, at, key],
      ["LPUSH", `${P}f:rep:${key}`, JSON.stringify({ by: viewer.name, reason, at })],
      ["LTRIM", `${P}f:rep:${key}`, 0, 19],
    ]);
    return { ok: true };
  }

  // ------------------------------------------------------------------ admin panel

  private async postRows(keys: string[]): Promise<AdminPostRow[]> {
    const parsed = keys.map(splitKey).filter((k): k is { thread: number; n: number } => k !== null);
    if (parsed.length === 0) return [];
    const raws = await this.kv.pipeline(
      parsed.flatMap(({ thread, n }): Cmd[] => [
        ["HGET", `${P}f:p:${thread}`, n],
        ["HGET", `${P}f:t:${thread}`, "title"],
      ]),
    );
    const rows: Array<{ thread: number; n: number; title: string; p: StoredPost }> = [];
    parsed.forEach(({ thread, n }, i) => {
      const p = parsePost(raws[i * 2]);
      const title = raws[i * 2 + 1];
      if (p && typeof title === "string") rows.push({ thread, n, title, p });
    });
    const people = await this.accounts.people(rows.map((r) => r.p.a));
    return rows.map(({ thread, n, title, p }) => ({
      thread,
      n,
      title,
      author: this.author(p.a, people),
      body: p.d ? "" : p.b,
      images: p.d ? [] : (p.i ?? []),
      createdAt: p.c,
      deleted: Boolean(p.d),
    }));
  }

  /** The newest posts across the forum. */
  async recent(page: number): Promise<{ posts: AdminPostRow[]; total: number }> {
    const start = Math.max(0, page) * 30;
    const [keys, total] = (await this.kv.pipeline([
      ["ZREVRANGE", `${P}f:recent`, start, start + 29],
      ["ZCARD", `${P}f:recent`],
    ])) as [string[], number];
    return { posts: await this.postRows(keys ?? []), total: num(total) };
  }

  async reports(): Promise<ReportRow[]> {
    const keys = ((await this.kv.run(["ZREVRANGE", `${P}f:reports`, 0, 49])) as string[]) ?? [];
    const rows = await this.postRows(keys);
    const lists = keys.length
      ? await this.kv.pipeline(keys.map((k): Cmd => ["LRANGE", `${P}f:rep:${k}`, 0, 19]))
      : [];
    const reasons = new Map<string, ReportRow["reasons"]>();
    keys.forEach((k, i) => {
      const list = ((lists[i] as string[]) ?? []).flatMap((raw) => {
        try {
          return [JSON.parse(raw) as ReportRow["reasons"][number]];
        } catch {
          return [];
        }
      });
      reasons.set(k, list);
    });
    return rows.map((r) => {
      const key = postKey(r.thread, r.n);
      return { ...r, key, reasons: reasons.get(key) ?? [] };
    });
  }

  async reportCount(): Promise<number> {
    return num(await this.kv.run(["ZCARD", `${P}f:reports`]));
  }

  async dismissReport(key: string): Promise<void> {
    if (!splitKey(key)) return;
    await this.kv.pipeline([
      ["ZREM", `${P}f:reports`, key],
      ["DEL", `${P}f:rep:${key}`],
    ]);
  }

  /** Renames a thread or moves it to another category. */
  async editThread(input: {
    id: number;
    title?: string;
    category?: string;
  }): Promise<Result<object>> {
    const h = hash(await this.kv.run(["HGETALL", `${P}f:t:${input.id}`]));
    if (!h.title) return fail("not_found");
    const cmds: Cmd[] = [];
    if (input.title !== undefined) {
      const title = input.title.replace(/\s+/g, " ").trim();
      if (forumTitleError(title)) return fail("bad_request");
      cmds.push(["HSET", `${P}f:t:${input.id}`, "title", title]);
    }
    if (input.category !== undefined && input.category !== h.cat) {
      if (!CATEGORY_IDS.includes(input.category)) return fail("bad_request");
      cmds.push(
        ["HSET", `${P}f:t:${input.id}`, "cat", input.category],
        ["ZREM", `${P}f:c:${h.cat}`, input.id],
        ["ZADD", `${P}f:c:${input.category}`, num(h.last), input.id],
      );
    }
    if (cmds.length) await this.kv.pipeline(cmds);
    this.forgetLists();
    return { ok: true };
  }

  /** How many posts someone has. */
  async postCount(userId: string): Promise<number> {
    return num(await this.kv.run(["ZCARD", `${P}u:${userId}:posts`]));
  }

  /** Deletes everything someone posted (their threads go completely). */
  async removeAllBy(userId: string): Promise<number> {
    const keys =
      ((await this.kv.run(["ZREVRANGE", `${P}u:${userId}:posts`, 0, -1])) as string[]) ?? [];
    let removed = 0;
    for (const key of keys) {
      const k = splitKey(key);
      if (!k) continue;
      const [rawThread, rawPost] = await this.kv.pipeline([
        ["HGETALL", `${P}f:t:${k.thread}`],
        ["HGET", `${P}f:p:${k.thread}`, k.n],
      ]);
      const h = hash(rawThread);
      const post = parsePost(rawPost);
      if (!h.title || !post || post.d) continue;
      if (k.n === 1) await this.dropThread(k.thread, h);
      else await this.dropPost(k.thread, k.n, post);
      removed++;
    }
    await this.kv.run(["DEL", `${P}u:${userId}:posts`]);
    this.forgetLists();
    return removed;
  }
}
