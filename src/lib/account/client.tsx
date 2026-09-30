/**
 * The signed-in account in the browser. Progress stays local-first (it's
 * still saved to localStorage on every change); while signed in, every
 * change is also sent to the server a few seconds later, and the server's
 * merged copy (other devices, XP limits) comes back into localStorage.
 *
 * "base" is the account XP this browser last heard from the server. XP above
 * it was earned here since then, which is what the server adds to the
 * leaderboards — so XP is never counted twice.
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
  deleteAccount as deleteAccountFn,
  getMe,
  logIn as logInFn,
  logOut as logOutFn,
  recoverAccount,
  signUp as signUpFn,
  syncProgress,
} from "./api";
import type { PublicUser, Result } from "./shared";

const RECORD_KEY = "vyce-account-sync";
const SYNC_DELAY = 3000;

interface SyncRecord {
  uid: string;
  base: number;
}

function readRecord(): SyncRecord | null {
  try {
    const r = JSON.parse(localStorage.getItem(RECORD_KEY) ?? "null");
    return r && typeof r.uid === "string" && typeof r.base === "number" ? r : null;
  } catch {
    return null;
  }
}

function writeRecord(r: SyncRecord | null) {
  try {
    if (r) localStorage.setItem(RECORD_KEY, JSON.stringify(r));
    else localStorage.removeItem(RECORD_KEY);
  } catch {
    // storage blocked: syncing still works for this tab
  }
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

export type AccountStatus = "loading" | "guest" | "user" | "unavailable";

interface AccountContext {
  status: AccountStatus;
  user: PublicUser | null;
  syncing: boolean;
  /** This browser has guest progress that can be added to an account. */
  canImport: boolean;
  /** Signed out because the session ended (not by pressing "Log out"). */
  expired: boolean;
  signUp: (
    name: string,
    password: string,
    importGuest: boolean,
  ) => Promise<Result<{ recoveryCode: string }>>;
  logIn: (name: string, password: string, importGuest: boolean) => Promise<Result<object>>;
  recover: (
    name: string,
    code: string,
    password: string,
  ) => Promise<Result<{ recoveryCode: string }>>;
  logOut: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<Result<object>>;
  deleteAccount: (password: string) => Promise<Result<object>>;
}

const Ctx = createContext<AccountContext | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AccountStatus>("loading");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [canImport, setCanImport] = useState(false);
  const [expired, setExpired] = useState(false);
  const userRef = useRef<PublicUser | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inflight = useRef(false);
  const again = useRef(false);
  /** JSON of the progress the server last confirmed, to skip no-op syncs. */
  const lastSent = useRef("");
  /** Set while we write server data locally, so that write doesn't trigger another sync. */
  const applying = useRef(false);

  const setAccount = useCallback((u: PublicUser | null) => {
    userRef.current = u;
    setUser(u);
    setStatus(u ? "user" : "guest");
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

  /** Replaces this browser's progress with the account's copy. */
  const adopt = useCallback(
    (u: PublicUser, progress: Progress) => {
      store(normalizeProgress({ ...progress, xp: u.xp }));
      writeRecord({ uid: u.id, base: u.xp });
      setAccount(u);
    },
    [setAccount, store],
  );

  const sync = useCallback(async (): Promise<void> => {
    clearTimeout(timer.current);
    const u = userRef.current;
    const rec = readRecord();
    if (!u || !rec || rec.uid !== u.id) return;
    if (inflight.current) {
      again.current = true;
      return;
    }
    const sent = loadProgress();
    const json = JSON.stringify(sent);
    if (json === lastSent.current && sent.xp === rec.base) return;

    inflight.current = true;
    setSyncing(true);
    const r = await call(() => syncProgress({ data: { progress: sent, baseXp: rec.base } }));
    inflight.current = false;
    setSyncing(false);

    if (r.ok) {
      // Keep anything earned while the request was on its way.
      const now = loadProgress();
      const extra = Math.max(0, now.xp - sent.xp);
      const merged = mergeProgress(normalizeProgress(r.progress), now);
      merged.xp = r.user.xp + extra;
      writeRecord({ uid: u.id, base: r.user.xp });
      if (JSON.stringify(merged) !== JSON.stringify(now)) store(merged);
      else lastSent.current = JSON.stringify(now);
      setAccount({ ...r.user });
      if (extra > 0) again.current = true;
    } else if (r.error === "unauthorized") {
      // Session ended: keep the local progress and record, so signing back
      // in to the same account continues from here without double counting.
      setExpired(true);
      setAccount(null);
      return;
    }
    if (again.current) {
      again.current = false;
      timer.current = setTimeout(() => void sync(), SYNC_DELAY);
    }
  }, [setAccount, store]);

  // Who is signed in, when the site opens.
  useEffect(() => {
    let alive = true;
    void call(() => getMe()).then((r) => {
      if (!alive) return;
      const rec = readRecord();
      if (!r.ok) {
        setStatus(r.error === "not_configured" ? "unavailable" : "guest");
        setCanImport(!rec && hasProgress(loadProgress()));
        return;
      }
      if (!r.user || !r.progress) {
        setExpired(Boolean(rec));
        setCanImport(!rec && hasProgress(loadProgress()));
        setAccount(null);
        return;
      }
      if (rec?.uid === r.user.id) {
        setAccount(r.user);
        void sync();
      } else {
        adopt(r.user, r.progress);
      }
    });
    return () => {
      alive = false;
    };
  }, [adopt, setAccount, sync]);

  // Send changes a few seconds after they happen, and right away when the tab is hidden.
  useEffect(() => {
    // Progress events can fire while another component renders, so the
    // actual work always happens in a timer.
    const onProgress = () => {
      if (applying.current) return;
      clearTimeout(timer.current);
      const signedIn = Boolean(userRef.current);
      timer.current = setTimeout(
        () => {
          if (userRef.current) void sync();
          else setCanImport(!readRecord() && hasProgress(loadProgress()));
        },
        signedIn ? SYNC_DELAY : 0,
      );
    };
    const onHide = () => {
      if (document.visibilityState === "hidden" && userRef.current) void sync();
    };
    window.addEventListener("vyce-progress", onProgress);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("vyce-progress", onProgress);
      document.removeEventListener("visibilitychange", onHide);
      clearTimeout(timer.current);
    };
  }, [sync]);

  /** After signing in: continue this browser's copy, or take the account's. */
  const afterAuth = useCallback(
    (u: PublicUser, progress: Progress) => {
      setExpired(false);
      setCanImport(false);
      if (readRecord()?.uid === u.id) {
        setAccount(u);
        void sync();
      } else {
        adopt(u, progress);
      }
    },
    [adopt, setAccount, sync],
  );

  const guestProgress = (importGuest: boolean) => {
    const local = loadProgress();
    return importGuest && !readRecord() && hasProgress(local) ? local : undefined;
  };

  const value = useMemo<AccountContext>(
    () => ({
      status,
      user,
      syncing,
      canImport,
      expired,
      async signUp(name, password, importGuest) {
        const progress = guestProgress(importGuest);
        const r = await call(() => signUpFn({ data: { username: name, password, progress } }));
        if (!r.ok) return r;
        writeRecord(null);
        afterAuth(r.user, r.progress);
        return { ok: true, recoveryCode: r.recoveryCode };
      },
      async logIn(name, password, importGuest) {
        const progress = guestProgress(importGuest);
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
        await sync();
        await call(() => logOutFn());
        writeRecord(null);
        lastSent.current = "";
        // This browser goes back to a fresh guest; the account keeps everything.
        applying.current = true;
        try {
          clearProgress();
        } finally {
          applying.current = false;
        }
        setExpired(false);
        setCanImport(false);
        setAccount(null);
      },
      async changePassword(current, next) {
        return call(() => changePasswordFn({ data: { current, next } }));
      },
      async deleteAccount(password) {
        const r = await call(() => deleteAccountFn({ data: { password } }));
        if (r.ok) {
          // The progress stays in this browser as guest progress.
          writeRecord(null);
          setCanImport(hasProgress(loadProgress()));
          setAccount(null);
        }
        return r;
      },
    }),
    // guestProgress only reads storage.
    [status, user, syncing, canImport, expired, afterAuth, setAccount, sync],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>");
  return ctx;
}
