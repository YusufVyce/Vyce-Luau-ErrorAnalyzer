import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Trash2, UserX } from "lucide-react";
import { adminAddNameBan, adminNameBans, adminRemoveNameBan } from "@/lib/account/api";
import { accountErrorKey, type NameBan } from "@/lib/account/shared";
import { useT } from "@/lib/prefs";
import { Btn, INPUT, Notice, Panel, Pill, Segmented, useFormat } from "./kit";

/** Names (or parts of names) nobody can sign up with or rename to. */
export function NameBans() {
  const t = useT();
  const f = useFormat();
  const [data, setData] = useState<{ bans: NameBan[]; matches: Record<string, string[]> } | null>(
    null,
  );
  const [name, setName] = useState("");
  const [mode, setMode] = useState<NameBan["mode"]>("exact");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    let alive = true;
    adminNameBans()
      .then((r) => {
        if (!alive) return;
        if (r.ok) setData({ bans: r.bans, matches: r.matches });
        else setError(t(accountErrorKey(r.error)));
      })
      .catch(() => alive && setError(t("acc.err.server_error")));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy("add");
    setError(null);
    const r = await adminAddNameBan({ data: { name, mode } }).catch(() => null);
    setBusy(null);
    if (r?.ok) {
      setName("");
      setN((x) => x + 1);
    } else
      setError(
        t(
          r?.error === "bad_request"
            ? "adm.nameBanBad"
            : accountErrorKey(r ? r.error : "server_error"),
        ),
      );
  }

  async function remove(ban: string) {
    setBusy(ban);
    const r = await adminRemoveNameBan({ data: { name: ban } }).catch(() => null);
    setBusy(null);
    if (r?.ok) setN((x) => x + 1);
    else setError(t(accountErrorKey(r ? r.error : "server_error")));
  }

  return (
    <div className="space-y-4">
      <Panel
        title={t("adm.nameBansTitle")}
        icon={<UserX className="h-4 w-4 text-[var(--tint-bad)]" />}
      >
        <p className="text-[13px] text-ink-2">{t("adm.nameBansNote")}</p>
        <form onSubmit={add} className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("adm.nameBanPlaceholder")}
            aria-label={t("adm.nameBanPlaceholder")}
            maxLength={20}
            required
            className={`${INPUT} max-w-60`}
          />
          <Segmented
            label={t("adm.nameBanMode")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "exact", label: t("adm.nameExact") },
              { value: "contains", label: t("adm.nameContains") },
            ]}
          />
          <Btn type="submit" tone="primary" busy={busy === "add"}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {t("adm.addNameBan")}
          </Btn>
        </form>
        <p className="text-[12px] text-ink-3">{t("adm.nameModeHint")}</p>
        {error && <Notice kind="error">{error}</Notice>}
      </Panel>

      <Panel title={t("adm.nameBanList", { n: data?.bans.length ?? 0 })}>
        {!data ? (
          <div className="h-24 animate-pulse rounded-lg bg-surface-2" />
        ) : data.bans.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-3">{t("adm.noNameBans")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.bans.map((b) => {
              const taken = data.matches[b.name] ?? [];
              return (
                <li key={b.name} className="flex flex-wrap items-center gap-2 py-2.5">
                  <code className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[13px] text-ink">
                    {b.name}
                  </code>
                  <Pill tone={b.mode === "exact" ? "muted" : "warn"}>
                    {t(b.mode === "exact" ? "adm.nameExact" : "adm.nameContains")}
                  </Pill>
                  <span className="text-[12px] text-ink-3">
                    {t("adm.banBy", { name: b.by, date: f.date(b.at) })}
                  </span>
                  <Btn
                    small
                    tone="ghost"
                    className="ml-auto"
                    busy={busy === b.name}
                    onClick={() => void remove(b.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("adm.remove")}
                  </Btn>
                  {taken.length > 0 && (
                    <p className="w-full text-[12px] text-[var(--tint-warn)]">
                      {t("adm.nameTaken")}{" "}
                      {taken.slice(0, 12).map((name, i) => (
                        <span key={name}>
                          {i > 0 && ", "}
                          <Link to="/u/$name" params={{ name }} className="underline">
                            {name}
                          </Link>
                        </span>
                      ))}
                      {taken.length > 12 && ` +${taken.length - 12}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
