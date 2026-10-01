/**
 * Server functions for accounts and leaderboards. The browser calls these
 * like normal async functions; the handlers only ever run on the server
 * (TanStack Start replaces them with fetch calls in the client bundle).
 *
 * The session lives in an HttpOnly cookie, so page scripts never see it.
 */
import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  getRequestHeader,
  getRequestIP,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import { z } from "zod";
import type { ForumService } from "./server/forum";
import { accountService as service, forumService as forum } from "./server/instance";
import { SESSION_TTL, type AccountService } from "./server/service";
import type { Progress } from "@/lib/learn/progress";
import {
  FORUM_BODY_MAX,
  FORUM_TITLE_MAX,
  IMAGE_SPECS,
  type AccountError,
  type Board,
  type Claim,
  type PublicUser,
  type Result,
} from "./shared";

const COOKIE = "vyce_session";

function clientIp(): string {
  return (
    getRequestHeader("cf-connecting-ip") ??
    getRequestHeader("x-real-ip") ??
    getRequestIP({ xForwardedFor: true }) ??
    "unknown"
  );
}

function setSession(token: string) {
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getRequestProtocol() === "https",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function clearSession() {
  deleteCookie(COOKIE, { path: "/" });
}

/** Runs a handler with the service, turning a missing store or a crash into an error code. */
async function withService<T>(fn: (svc: AccountService) => Promise<Result<T>>): Promise<Result<T>> {
  const s = service();
  if (!s) return { ok: false, error: "not_configured" };
  try {
    return await fn(s);
  } catch (e) {
    console.error("[accounts]", e);
    return { ok: false, error: "server_error" as AccountError };
  }
}

// Only the shape is checked here; normalizeProgress validates and bounds the contents.
const progressObject = z.custom<Progress>(
  (v) => v !== null && typeof v === "object" && !Array.isArray(v),
);
const progressSchema = progressObject.optional();
const username = z.string().max(40);
const password = z.string().max(200);

export const getMe = createServerFn({ method: "GET" }).handler(async () =>
  withService<{ user: PublicUser | null; progress: Progress | null }>(async (svc) => {
    const token = getCookie(COOKIE);
    const me = await svc.me(token);
    if (!me) {
      if (token) clearSession();
      return { ok: true, user: null, progress: null };
    }
    return { ok: true, ...me };
  }),
);

export const signUp = createServerFn({ method: "POST" })
  .validator(z.object({ username, password, progress: progressSchema }))
  .handler(async ({ data }) =>
    withService(async (svc) => {
      const r = await svc.signup(data, clientIp());
      if (!r.ok) return r;
      setSession(r.token);
      const { token: _, ...rest } = r;
      return rest;
    }),
  );

export const logIn = createServerFn({ method: "POST" })
  .validator(z.object({ username, password, progress: progressSchema }))
  .handler(async ({ data }) =>
    withService(async (svc) => {
      const r = await svc.login(data, clientIp());
      if (!r.ok) return r;
      setSession(r.token);
      const { token: _, ...rest } = r;
      return rest;
    }),
  );

export const logOut = createServerFn({ method: "POST" }).handler(async () =>
  withService(async (svc) => {
    await svc.logout(getCookie(COOKIE));
    clearSession();
    return { ok: true as const };
  }),
);

export const recoverAccount = createServerFn({ method: "POST" })
  .validator(z.object({ username, code: z.string().max(64), password }))
  .handler(async ({ data }) =>
    withService(async (svc) => {
      const r = await svc.recover(data, clientIp());
      if (!r.ok) return r;
      setSession(r.token);
      const { token: _, ...rest } = r;
      return rest;
    }),
  );

export const syncProgress = createServerFn({ method: "POST" })
  .validator(z.object({ progress: progressObject }))
  .handler(async ({ data }) =>
    withService(async (svc) => {
      const r = await svc.sync(getCookie(COOKIE), data);
      if (!r.ok && r.error === "unauthorized") clearSession();
      return r;
    }),
  );

export const changePassword = createServerFn({ method: "POST" })
  .validator(z.object({ current: password, next: password }))
  .handler(async ({ data }) =>
    withService(async (svc) => {
      const r = await svc.changePassword(getCookie(COOKIE), data);
      if (!r.ok) return r;
      setSession(r.token);
      return { ok: true as const };
    }),
  );

export const deleteAccount = createServerFn({ method: "POST" })
  .validator(z.object({ password }))
  .handler(async ({ data }) =>
    withService(async (svc) => {
      const r = await svc.deleteAccount(getCookie(COOKIE), data);
      if (r.ok) clearSession();
      return r;
    }),
  );

export const getLeaderboard = createServerFn({ method: "GET" })
  .validator(z.object({ board: z.enum(["day", "week", "all", "streak"]) }))
  .handler(async ({ data }) =>
    withService(async (svc) => ({
      ok: true as const,
      ...(await svc.leaderboard(data.board as Board, getCookie(COOKIE))),
    })),
  );

const day = z.string().max(10).optional();
const solved = z.object({
  lessonId: z.string().max(80),
  step: z.number().int(),
  pick: z.number().int().nullable().optional(),
  seq: z.array(z.number().int()).max(40).optional(),
});
const claimSchema: z.ZodType<Claim> = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("quiz"),
    lessonId: z.string().max(80),
    answer: z.number().int(),
    day,
  }),
  z.object({
    kind: z.literal("homework"),
    lessonId: z.string().max(80),
    code: z.string().max(20_000),
    hints: z.number(),
    solution: z.boolean(),
    day,
  }),
  z.object({
    kind: z.literal("challenge"),
    id: z.string().max(80),
    code: z.string().max(20_000),
    hints: z.number(),
    solution: z.boolean(),
    day,
  }),
  z.object({
    kind: z.literal("practice"),
    lessonId: z.string().max(80).optional(),
    mistakes: z.number(),
    answers: z.array(solved).max(60),
    day,
  }),
]);

/** Reports finished work; the server checks it and pays the XP. */
export const claimXp = createServerFn({ method: "POST" })
  .validator(claimSchema)
  .handler(async ({ data }) =>
    withService(async (svc) => {
      const r = await svc.claim(getCookie(COOKIE), data);
      if (!r.ok && r.error === "unauthorized") clearSession();
      return r;
    }),
  );

export const getLeague = createServerFn({ method: "GET" }).handler(async () =>
  withService((svc) => svc.league(getCookie(COOKIE))),
);

export const getFriends = createServerFn({ method: "GET" }).handler(async () =>
  withService((svc) => svc.friends(getCookie(COOKIE))),
);

export const followUser = createServerFn({ method: "POST" })
  .validator(z.object({ name: username }))
  .handler(async ({ data }) => withService((svc) => svc.follow(getCookie(COOKIE), data.name)));

export const unfollowUser = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().max(40) }))
  .handler(async ({ data }) => withService((svc) => svc.unfollow(getCookie(COOKIE), data.id)));

export const getProfile = createServerFn({ method: "GET" })
  .validator(z.object({ name: username }))
  .handler(async ({ data }) => withService((svc) => svc.profile(data.name, getCookie(COOKIE))));

// ------------------------------------------------------------------ profile images

const imageKind = z.enum(["avatar", "banner"]);
// base64 is 4/3 of the file size; the service checks the real limit.
const imageData = z.string().max(Math.ceil((IMAGE_SPECS.banner.maxBytes * 4) / 3) + 8);

export const uploadImage = createServerFn({ method: "POST" })
  .validator(z.object({ kind: imageKind, data: imageData }))
  .handler(async ({ data }) =>
    withService((svc) => svc.setImage(getCookie(COOKIE), data.kind, data.data)),
  );

export const removeImage = createServerFn({ method: "POST" })
  .validator(z.object({ kind: imageKind }))
  .handler(async ({ data }) => withService((svc) => svc.removeImage(getCookie(COOKIE), data.kind)));

// ------------------------------------------------------------------ forum

/** Like withService, for the forum. */
async function withForum<T>(fn: (f: ForumService) => Promise<Result<T>>): Promise<Result<T>> {
  const f = forum();
  if (!f) return { ok: false, error: "not_configured" };
  try {
    return await fn(f);
  } catch (e) {
    console.error("[forum]", e);
    return { ok: false, error: "server_error" as AccountError };
  }
}

const threadId = z.number().int().positive().max(1e9);

export const listThreads = createServerFn({ method: "GET" })
  .validator(z.object({ category: z.string().max(20), page: z.number().int().min(0).max(1000) }))
  .handler(async ({ data }) => withForum((f) => f.list(data.category, data.page)));

export const getThread = createServerFn({ method: "GET" })
  .validator(z.object({ id: threadId, page: z.number().int().min(-1).max(10_000) }))
  .handler(async ({ data }) => withForum((f) => f.thread(data.id, data.page, getCookie(COOKIE))));

export const createThread = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().max(FORUM_TITLE_MAX * 2),
      category: z.string().max(20),
      body: z.string().max(FORUM_BODY_MAX * 2),
    }),
  )
  .handler(async ({ data }) => withForum((f) => f.create(getCookie(COOKIE), data)));

export const replyThread = createServerFn({ method: "POST" })
  .validator(z.object({ id: threadId, body: z.string().max(FORUM_BODY_MAX * 2) }))
  .handler(async ({ data }) => withForum((f) => f.reply(getCookie(COOKIE), data)));

export const deletePost = createServerFn({ method: "POST" })
  .validator(z.object({ id: threadId, n: z.number().int().positive().max(1e6) }))
  .handler(async ({ data }) => withForum((f) => f.remove(getCookie(COOKIE), data)));

export const moderateThread = createServerFn({ method: "POST" })
  .validator(z.object({ id: threadId, action: z.enum(["pin", "unpin", "lock", "unlock"]) }))
  .handler(async ({ data }) => withForum((f) => f.moderate(getCookie(COOKIE), data)));
