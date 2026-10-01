import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, KeyRound, LogIn, ShieldAlert, UserPlus } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { Field, FormError, PasswordField } from "@/components/account/fields";
import { Mascot } from "@/components/learn/duo/Mascot";
import { useAccount } from "@/lib/account/client";
import {
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
  accountErrorKey,
  type AccountError,
  type BanInfo,
} from "@/lib/account/shared";
import { useLang, useT } from "@/lib/prefs";

/** Error text for the forms; a ban says why and until when. */
function useErrorText() {
  const t = useT();
  const lang = useLang();
  return (r: { error: AccountError; ban?: BanInfo }) => {
    if (r.error !== "banned" || !r.ban) return t(accountErrorKey(r.error));
    const until = r.ban.until
      ? t("acc.bannedUntil", {
          date: new Date(r.ban.until).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        })
      : t("acc.bannedForever");
    const reason = r.ban.reason ? ` ${t("acc.bannedReason", { reason: r.ban.reason })}` : "";
    return `${t("acc.err.banned")} ${until}${reason}`;
  };
}

type Mode = "login" | "signup" | "recover";
const NEXT = [
  "/profile",
  "/leaderboard",
  "/learn",
  "/challenges",
  "/forum",
  "/forum/new",
  "/admin",
] as const;
type Next = (typeof NEXT)[number];
/** Pages the login page may send people back to. */
export type LoginNext = Next;
type LoginSearch = { mode?: Mode; next?: Next };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    mode: s.mode === "signup" || s.mode === "recover" ? s.mode : undefined,
    // Only our own pages, so the link can't send people somewhere else.
    next: NEXT.includes(s.next as Next) ? (s.next as Next) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Log in — Vyce LuaUtility" },
      {
        name: "description",
        content: "Sign in to save your Roblox scripting progress and join the leaderboard.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const t = useT();
  const acc = useAccount();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const mode: Mode = search.mode ?? "login";
  const next: Next = search.next ?? "/profile";
  /** Shown after sign-up or a password reset, before leaving the page. */
  const [code, setCode] = useState<string | null>(null);

  // Already signed in (and not looking at a fresh recovery code): nothing to do here.
  useEffect(() => {
    if (acc.status === "user" && !code) void navigate({ to: next });
  }, [acc.status, code, navigate, next]);

  const setMode = (m: Mode) =>
    navigate({ to: "/login", search: { mode: m === "login" ? undefined : m, next: search.next } });

  const tabs: Array<{ id: Mode; label: string }> = [
    { id: "login", label: t("acc.tabLogin") },
    { id: "signup", label: t("acc.tabSignup") },
    { id: "recover", label: t("acc.tabRecover") },
  ];

  return (
    <PageShell width="max-w-5xl">
      <PageHeader
        sticker={
          <>
            <UserPlus className="h-4 w-4 text-brand" aria-hidden="true" /> {t("acc.sticker")}
          </>
        }
        title={
          <>
            {t("acc.title1")} <span className="ep-mark">{t("acc.title2")}</span>
          </>
        }
      >
        {t("acc.lead")}
      </PageHeader>

      <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
        <div className="ep-card mx-auto w-full max-w-lg p-6 sm:p-8">
          {code ? (
            <RecoveryCode code={code} onDone={() => navigate({ to: next })} />
          ) : acc.status === "unavailable" ? (
            <div className="space-y-2 text-sm text-ink-2">
              <p className="font-semibold text-ink">{t("acc.downTitle")}</p>
              <p>{t("acc.downBody")}</p>
            </div>
          ) : (
            <>
              <div
                role="tablist"
                className="mb-6 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1"
              >
                {tabs.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={mode === id}
                    onClick={() => setMode(id)}
                    className={`rounded-lg px-1.5 py-2 text-[13px] leading-tight font-medium transition-colors ${
                      mode === id ? "bg-surface text-ink shadow" : "text-ink-3 hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {acc.expired && mode === "login" && (
                <p className="mb-4 text-[13px] text-amber-400">{t("acc.expired")}</p>
              )}
              {mode === "recover" ? (
                <RecoverForm onCode={setCode} />
              ) : (
                <AuthForm
                  key={mode}
                  mode={mode}
                  onCode={setCode}
                  onDone={() => navigate({ to: next })}
                />
              )}
            </>
          )}
        </div>
        <aside className="hidden flex-col items-center gap-4 text-center lg:flex">
          <Mascot mood={mode === "signup" ? "cheer" : "happy"} size={140} />
          <p className="inline-flex items-start gap-2 text-left text-[13px] leading-relaxed text-ink-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            {t("acc.privacy")}
          </p>
        </aside>
      </div>
    </PageShell>
  );
}

function AuthForm({
  mode,
  onCode,
  onDone,
}: {
  mode: "login" | "signup";
  onCode: (code: string) => void;
  onDone: () => void;
}) {
  const t = useT();
  const acc = useAccount();
  const errorText = useErrorText();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [importLocal, setImportGuest] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // An old error disappears as soon as the student changes what they typed.
  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setError(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const withGuest = acc.canImport && importLocal;
    if (mode === "signup") {
      const r = await acc.signUp(name.trim(), password, withGuest);
      setBusy(false);
      if (r.ok) onCode(r.recoveryCode);
      else setError(errorText(r));
    } else {
      const r = await acc.logIn(name.trim(), password, withGuest);
      setBusy(false);
      if (r.ok) onDone();
      else setError(errorText(r));
    }
  }

  const signup = mode === "signup";
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label={t("acc.username")}
        hint={signup ? t("acc.usernameHint") : undefined}
        value={name}
        onValue={edit(setName)}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        minLength={signup ? USERNAME_MIN : undefined}
        maxLength={signup ? USERNAME_MAX : 40}
        pattern={signup ? "[A-Za-z0-9_]+" : undefined}
        required
        autoFocus
      />
      <PasswordField
        label={t("acc.password")}
        hint={signup ? t("acc.passwordHint") : undefined}
        value={password}
        onValue={edit(setPassword)}
        autoComplete={signup ? "new-password" : "current-password"}
        minLength={signup ? PASSWORD_MIN : undefined}
        required
      />
      {acc.canImport && (
        <label className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-2/50 p-3 text-[13px] text-ink-2">
          <input
            type="checkbox"
            checked={importLocal}
            onChange={(e) => setImportGuest(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
          />
          <span>
            {t("acc.importGuest")}
            <span className="mt-1 block text-ink-3">{t("acc.importNote")}</span>
          </span>
        </label>
      )}
      <FormError>{error}</FormError>
      <button
        type="submit"
        disabled={busy}
        className="ep-cta inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
      >
        {signup ? (
          <UserPlus className="h-4 w-4" aria-hidden="true" />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden="true" />
        )}
        {t(signup ? "acc.submitSignup" : "acc.submitLogin")}
      </button>
      <p className="text-[12px] text-ink-3 lg:hidden">{t("acc.privacy")}</p>
    </form>
  );
}

function RecoverForm({ onCode }: { onCode: (code: string) => void }) {
  const t = useT();
  const acc = useAccount();
  const errorText = useErrorText();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // An old error disappears as soon as the student changes what they typed.
  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setError(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await acc.recover(name.trim(), code, password);
    setBusy(false);
    if (r.ok) onCode(r.recoveryCode);
    else setError(errorText(r));
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-[13px] leading-relaxed text-ink-2">{t("acc.recoverNote")}</p>
      <Field
        label={t("acc.username")}
        value={name}
        onValue={edit(setName)}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={40}
        required
      />
      <Field
        label={t("acc.recoveryCode")}
        value={code}
        onValue={edit(setCode)}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={64}
        className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 font-mono text-sm tracking-wider text-ink uppercase placeholder-zinc-500 focus:border-brand-line focus:outline-none"
        required
      />
      <PasswordField
        label={t("acc.newPassword")}
        hint={t("acc.passwordHint")}
        value={password}
        onValue={edit(setPassword)}
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        required
      />
      <FormError>{error}</FormError>
      <button
        type="submit"
        disabled={busy}
        className="ep-cta inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
      >
        <KeyRound className="h-4 w-4" aria-hidden="true" /> {t("acc.submitRecover")}
      </button>
    </form>
  );
}

function RecoveryCode({ code, onDone }: { code: string; onDone: () => void }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-5 text-center">
      <KeyRound className="mx-auto h-10 w-10 text-brand" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-ink">{t("acc.codeTitle")}</h2>
      <p className="text-[13px] leading-relaxed text-ink-2">{t("acc.codeBody")}</p>
      <output className="block rounded-xl border-2 border-dashed border-brand-line bg-brand-soft px-4 py-4 font-mono text-xl font-bold tracking-[0.15em] text-ink select-all">
        {code}
      </output>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => setCopied(true));
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink-2 hover:border-brand-line hover:text-ink"
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {t(copied ? "acc.codeCopied" : "acc.codeCopy")}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="ep-cta inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          {t("acc.codeDone")}
        </button>
      </div>
    </div>
  );
}
