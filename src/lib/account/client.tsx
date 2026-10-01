/**
 * The signed-in account in the browser. Learning needs an account: progress
 * is shown from localStorage right away, and the server keeps the real copy.
 *
 * - Finished work (quiz, practice, homework, challenges) is sent as a claim;
 *   the server checks it and pays the XP. Claims that can't be sent (offline)
 *   wait in a queue in localStorage and go out later.
 * - Everything else the browser knows (saved code, hint counts, daily goal)
 *   is synced a few seconds after it changes.
 * - Whatever the server answers replaces the local XP, so the leaderboard
 *   and the screen always agree.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearProgress,
  hasProgress,
  loadProgress,
  mergeProgress,
  normalizeProgress,
  saveProgress,
  type Progress,
} from "@/lib/learn/progress";
import {
  changePassword as changePasswordFn,
  claimXp,
  deleteAccount as deleteAccountFn,
  getMe,
  logIn as logInFn,
  logOut as logOutFn,
  recoverAccount,
  signUp as signUpFn,
  syncProgress,
} from "./api";
import type { AccountError, Claim, ClaimOutcome, PublicUser, Result } from "./shared";

const RECORD_KEY = "vyce-account-sync";
const QUEUE_KEY = "vyce-pending-claims";
const SYNC_DELAY = 3000;
const MAX_QUEUE = 50;

function readJson<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked: works for this tab only
  }
}

/** Which account this browser's progress belongs to. */
function recordUid(): string | null {
  const r = readJson<{ uid?: unknown }>(RECORD_KEY);
  return r && typeof r.uid === "string" ? r.uid : null;
}

/** The account's progress revision this browser last took (admins bump it when they edit). */
function recordRev(): number {
  const r = readJson<{ rev?: unknown }>(RECORD_KEY);
  return r && typeof r.rev === "number" ? r.rev : 0;
}

function setRecord(uid: string | null, rev = 0) {
  writeJson(RECORD_KEY, uid ? { uid, rev } : null);
}

function readQueue(): Claim[] {
  const q = readJson<Claim[]>(QUEUE_KEY);
  return Array.isArray(q) ? q : [];
}

/** Calls a server function; a network failure becomes an error code instead of a throw. */
async function call<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await fn();
  } catch (e) {
    console.error("[accounts]", e);
    return { ok: false, error: "server_error" };
  }
}

/** Errors worth trying again later (the claim itself may be fine). */
const RETRY: AccountError[] = ["server_error", "rate_limited", "not_configured"];

export type AccountStatus = "loading" | "signedOut" | "user" | "unavailable";

interface AccountContext {
  status: AccountStatus;
  user: PublicUser | null;
  syncing: boolean;
  /** This browser has progress from before accounts that can be added to one. */
  canImport: boolean;
  /** Signed out because the session ended (not by pressing "Log out"). */
  expired: boolean;
  /** Sends finished work to the server; resolves with what it paid. */
  claim: (claim: Claim) => Promise<Result<{ outcome: ClaimOutcome }>>;
  signUp: (
    name: string,
    password: string,
    importLocal: boolean,
  ) => Promise<Result<{ recoveryCode: string }>>;
  logIn: (name: string, password: string, importLocal: boolean) => Promise<Result<object>>;
  recover: (
    name: string,
    code: string,
    password: string,
  ) => Promise<Result<{ recoveryCode: string }>>;
  logOut: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<Result<object>>;
  deleteAccount: (password: string) => Promise<Result<object>>;
  /** Takes account details the server just sent back (e.g. after a new profile photo). */
  updateUser: (user: PublicUser) => void;
}

const Ctx = createContext<AccountContext | null>(null);

/** Takes back what a claim the server refused had added locally. */
function undoClaim(p: Progress, claim: Claim): Progress {
  const drop = (list: string[], id: string) => list.filter((x) => x !== id);
  switch (claim.kind) {
    case "quiz":
      return { ...p, quiz: drop(p.quiz, claim.lessonId) };
    case "homework":
      return { ...p, homework: drop(p.homework, claim.lessonId) };
    case "challenge":
      return { ...p, challenges: drop(p.challenges, claim.id) };
    default:
      return p;
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AccountStatus>("loading");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [canImport, setCanImport] = useState(false);
  const [expired, setExpired] = useState(false);
  const userRef = useRef<PublicUser | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncBusy = useRef(false);
  const syncAgain = useRef(false);
  const flushing = useRef<Promise<void> | null>(null);
  /** JSON of the progress the server last confirmed, to skip no-op syncs. */
  const lastSent = useRef("");
  /** Set while we write server data locally, so that write doesn't trigger a sync. */
  const applying = useRef(false);

  const setAccount = useCallback((u: PublicUser | null) => {
    userRef.current = u;
    setUser(u);
    setStatus(u ? "user" : "signedOut");
  }, []);

  const store = useCallback((p: Progress) => {
    applying.current = true;
    try {
      saveProgress(p, { quiet: true });
    } finally {
      applying.current = false;
    }
    lastSent.current = JSON.stringify(p);
  }, []);

  /**
   * Takes the server's copy. With `keepLocal`, things this browser finished
   * but hasn't had confirmed yet stay visible; XP always comes from the server.
   */
  const adopt = useCallback(
    (u: PublicUser, server: Progress, keepLocal: boolean) => {
      const s = normalizeProgress(server);
      // An admin changed this account's progress: the server copy wins over this browser's.
      const edited = recordUid() === u.id && (u.rev ?? 0) !== recordRev();
      const next = keepLocal && !edited ? mergeProgress(s, loadProgress()) : s;
      next.xp = u.xp;
      store(next);
      setRecord(u.id, u.rev ?? 0);
      setAccount({ ...u });
    },
    [setAccount, store],
  );

  const endSession = useCallback(() => {
    setExpired(true);
    setAccount(null);
  }, [setAccount]);

  /** Sends the queued claims, oldest first. */
  const flush = useCallback((): Promise<void> => {
    if (flushing.current) return flushing.current;
    const run = async () => {
      for (;;) {
        const u = userRef.current;
        const [next] = readQueue();
        if (!u || !next) return;
        const r = await call(() => claimXp({ data: next }));
        if (!r.ok && RETRY.includes(r.error)) return; // try again later
        if (!r.ok && r.error === "unauthorized") {
          endSession();
          return;
        }
        writeJson(QUEUE_KEY, readQueue().slice(1));
        if (r.ok) adopt(r.user, r.progress, true);
        else store({ ...undoClaim(loadProgress(), next), xp: u.xp });
      }
    };
    flushing.current = run().finally(() => {
      flushing.current = null;
    });
    return flushing.current;
  }, [adopt, endSession, store]);

  const sync = useCallback(async (): Promise<void> => {
    clearTimeout(timer.current);
    const u = userRef.current;
    if (!u || recordUid() !== u.id) return;
    if (syncBusy.current) {
      syncAgain.current = true;
      return;
    }
    const sent = loadProgress();
    if (JSON.stringify(sent) === lastSent.current) return;

    syncBusy.current = true;
    setSyncing(true);
    const r = await call(() => syncProgress({ data: { progress: sent } }));
    syncBusy.current = false;
    setSyncing(false);
    if (r.ok) adopt(r.user, r.progress, true);
    else if (r.error === "unauthorized") return endSession();
    if (syncAgain.current) {
      syncAgain.current = false;
      timer.current = setTimeout(() => void sync(), SYNC_DELAY);
    }
  }, [adopt, endSession]);

  // Who is signed in, when the site opens.
  useEffect(() => {
    let alive = true;
    void call(() => getMe()).then((r) => {
      if (!alive) return;
      const mine = recordUid();
      if (!r.ok) {
        setStatus(r.error === "not_configured" ? "unavailable" : "signedOut");
        setCanImport(!mine && hasProgress(loadProgress()));
        return;
      }
      if (!r.user || !r.progress) {
        setExpired(Boolean(mine));
        setCanImport(!mine && hasProgress(loadProgress()));
        setAccount(null);
        return;
      }
      adopt(r.user, r.progress, mine === r.user.id);
      void flush().then(() => sync());
    });
    return () => {
      alive = false;
    };
  }, [adopt, flush, setAccount, sync]);

  // Sync a few seconds after a change, right away when the tab is hidden.
  useEffect(() => {
    // Progress events can fire while another component renders, so the work
    // always happens in a timer.
    const onProgress = () => {
      if (applying.current) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => {
          if (userRef.current) void sync();
          else setCanImport(!recordUid() && hasProgress(loadProgress()));
        },
        userRef.current ? SYNC_DELAY : 0,
      );
    };
    const onHide = () => {
      if (document.visibilityState === "hidden" && userRef.current) void sync();
    };
    const onOnline = () => {
      if (userRef.current) void flush();
    };
    window.addEventListener("vyce-progress", onProgress);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("vyce-progress", onProgress);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onHide);
      clearTimeout(timer.current);
    };
  }, [flush, sync]);

  /** After signing in: keep this browser's unconfirmed work if it's the same account. */
  const afterAuth = useCallback(
    (u: PublicUser, progress: Progress) => {
      setExpired(false);
      setCanImport(false);
      const same = recordUid() === u.id;
      if (!same) writeJson(QUEUE_KEY, null);
      adopt(u, progress, same);
      if (same) void flush().then(() => sync());
    },
    [adopt, flush, sync],
  );

  const value = useMemo<AccountContext>(() => {
    const localForImport = (importLocal: boolean) => {
      const local = loadProgress();
      return importLocal && !recordUid() && hasProgress(local) ? local : undefined;
    };
    const resetBrowser = () => {
      setRecord(null);
      writeJson(QUEUE_KEY, null);
      lastSent.current = "";
      applying.current = true;
      try {
        clearProgress();
      } finally {
        applying.current = false;
      }
      setExpired(false);
      setCanImport(false);
      setAccount(null);
    };
    return {
      status,
      user,
      syncing,
      canImport,
      expired,
      async claim(claim) {
        if (!userRef.current) return { ok: false, error: "unauthorized" };
        const queued = readQueue();
        if (queued.length > 0) {
          // Keep the order: this one waits behind the others.
          writeJson(QUEUE_KEY, [...queued, claim].slice(-MAX_QUEUE));
          void flush();
          return { ok: false, error: "server_error" };
        }
        const r = await call(() => claimXp({ data: claim }));
        if (r.ok) {
          adopt(r.user, r.progress, true);
          return { ok: true, outcome: r.outcome };
        }
        if (r.error === "unauthorized") endSession();
        else if (RETRY.includes(r.error)) writeJson(QUEUE_KEY, [claim]);
        else store({ ...undoClaim(loadProgress(), claim), xp: userRef.current?.xp ?? 0 });
        return r;
      },
      async signUp(name, password, importLocal) {
        const progress = localForImport(importLocal);
        const r = await call(() => signUpFn({ data: { username: name, password, progress } }));
        if (!r.ok) return r;
        setRecord(null);
        afterAuth(r.user, r.progress);
        return { ok: true, recoveryCode: r.recoveryCode };
      },
      async logIn(name, password, importLocal) {
        const progress = localForImport(importLocal);
        const r = await call(() => logInFn({ data: { username: name, password, progress } }));
        if (!r.ok) return r;
        afterAuth(r.user, r.progress);
        return { ok: true };
      },
      async recover(name, code, password) {
        const r = await call(() => recoverAccount({ data: { username: name, code, password } }));
        if (!r.ok) return r;
        afterAuth(r.user, r.progress);
        return { ok: true, recoveryCode: r.recoveryCode };
      },
      async logOut() {
        await flush();
        await sync();
        await call(() => logOutFn());
        // The account keeps everything; this browser starts clean.
        resetBrowser();
      },
      async changePassword(current, next) {
        return call(() => changePasswordFn({ data: { current, next } }));
      },
      async deleteAccount(password) {
        const r = await call(() => deleteAccountFn({ data: { password } }));
        if (r.ok) resetBrowser();
        return r;
      },
      updateUser(u) {
        if (userRef.current?.id === u.id) setAccount({ ...u });
      },
    };
  }, [
    status,
    user,
    syncing,
    canImport,
    expired,
    adopt,
    afterAuth,
    endSession,
    flush,
    setAccount,
    store,
    sync,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>");
  return ctx;
}
