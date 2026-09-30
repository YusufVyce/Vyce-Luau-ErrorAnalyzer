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
import { getKV } from "./server/kv";
import { AccountService, SESSION_TTL } from "./server/service";
import type { Progress } from "@/lib/learn/progress";
import type { AccountError, Board, PublicUser, Result } from "./shared";

const COOKIE = "vyce_session";

let svc: AccountService | undefined;

/** One service per server instance, so its short leaderboard cache is shared between requests. */
function service(): AccountService | null {
  if (!svc) {
    const kv = getKV();
    if (kv) svc = new AccountService(kv);
  }
  return svc ?? null;
}

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
  .validator(z.object({ progress: progressObject, baseXp: z.number() }))
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
