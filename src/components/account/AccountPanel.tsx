import { Avatar } from "@/components/account/Avatar";
import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CloudCheck, KeyRound, LogOut, RefreshCw, Trash2, Globe2 } from "lucide-react";
import { useAccount } from "@/lib/account/client";
import { PASSWORD_MIN, accountErrorKey } from "@/lib/account/shared";
import { useLang, useT } from "@/lib/prefs";
import { FormError, PasswordField } from "./fields";

const SMALL_BTN =
  "inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-ink-2 hover:border-brand-line hover:text-ink disabled:opacity-50";

/** The account card on the profile page (replaces the old backup buttons). */
export function AccountPanel() {
  const t = useT();
  const lang = useLang();
  const acc = useAccount();
  const [open, setOpen] = useState<"password" | "delete" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (acc.status === "loading") {
    return <div className="ep-card h-28 animate-pulse p-6" aria-busy="true" />;
  }

  // The profile page is only shown when signed in.
  if (!acc.user) return null;

  const user = acc.user;
  const since = new Date(user.createdAt).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="ep-card space-y-5 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar id={user.id} name={user.name} avatar={user.avatar} size={48} />
          <div>
            <div className="text-lg font-semibold text-ink">{user.name}</div>
            <div className="text-[12px] text-ink-3">{t("acc.memberSince", { date: since })}</div>
            <div
              className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-ink-3"
              aria-live="polite"
            >
              {acc.syncing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <CloudCheck className="h-3.5 w-3.5 text-[var(--syn-green)]" aria-hidden="true" />
              )}
              {t(acc.syncing ? "acc.syncing" : "acc.synced")}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/u/$name" params={{ name: user.name }} className={SMALL_BTN}>
            <Globe2 className="h-4 w-4" aria-hidden="true" /> {t("acc.publicProfile")}
          </Link>
          <button
            type="button"
            className={SMALL_BTN}
            aria-expanded={open === "password"}
            onClick={() => setOpen(open === "password" ? null : "password")}
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" /> {t("acc.changePw")}
          </button>
          <button type="button" className={SMALL_BTN} onClick={() => void acc.logOut()}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> {t("acc.logout")}
          </button>
          <button
            type="button"
            aria-expanded={open === "delete"}
            onClick={() => setOpen(open === "delete" ? null : "delete")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> {t("acc.delete")}
          </button>
        </div>
      </div>
      <p className="text-[12px] text-ink-3">{t("prof.accountNote")}</p>
      {msg && <p className="text-[13px] text-brand">{msg}</p>}
      {open === "password" && (
        <ChangePassword
          onDone={() => {
            setOpen(null);
            setMsg(t("acc.pwChanged"));
          }}
          onCancel={() => setOpen(null)}
        />
      )}
      {open === "delete" && (
        <DeleteAccount
          onDone={() => {
            setOpen(null);
            setMsg(t("acc.deleted"));
          }}
          onCancel={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function ChangePassword({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const t = useT();
  const acc = useAccount();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await acc.changePassword(current, next);
    setBusy(false);
    if (r.ok) onDone();
    else setError(t(accountErrorKey(r.error)));
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-xl border border-line bg-surface-2/40 p-4 sm:grid-cols-2"
    >
      <PasswordField
        label={t("acc.currentPassword")}
        value={current}
        onValue={setCurrent}
        autoComplete="current-password"
        required
      />
      <PasswordField
        label={t("acc.newPassword")}
        hint={t("acc.passwordHint")}
        value={next}
        onValue={setNext}
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        required
      />
      <div className="space-y-3 sm:col-span-2">
        <FormError>{error}</FormError>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="ep-cta rounded-xl px-4 py-2 text-sm font-semibold"
          >
            {t("acc.save")}
          </button>
          <button type="button" onClick={onCancel} className={SMALL_BTN}>
            {t("acc.cancel")}
          </button>
        </div>
      </div>
    </form>
  );
}

function DeleteAccount({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const t = useT();
  const acc = useAccount();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await acc.deleteAccount(password);
    setBusy(false);
    if (r.ok) onDone();
    else setError(t(accountErrorKey(r.error)));
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4"
    >
      <p className="text-[13px] leading-relaxed text-ink-2">{t("acc.deleteNote")}</p>
      <div className="max-w-sm">
        <PasswordField
          label={t("acc.password")}
          value={password}
          onValue={setPassword}
          autoComplete="current-password"
          required
        />
      </div>
      <FormError>{error}</FormError>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> {t("acc.delete")}
        </button>
        <button type="button" onClick={onCancel} className={SMALL_BTN}>
          {t("acc.cancel")}
        </button>
      </div>
    </form>
  );
}
