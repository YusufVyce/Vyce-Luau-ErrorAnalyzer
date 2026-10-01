import { useEffect, useState, type FormEvent } from "react";
import { Crown, ShieldCheck, UserPlus } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { RoleBadge } from "@/components/account/RoleBadge";
import { adminSetRole, adminUsers } from "@/lib/account/api";
import { accountErrorKey, type AdminUserRow } from "@/lib/account/shared";
import { useT } from "@/lib/prefs";
import { Btn, INPUT, Notice, Panel } from "./kit";

/** The owner's list of people who can open the admin panel. */
export function Admins({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useT();
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    let alive = true;
    adminUsers({ data: { query: "", sort: "name", filter: "admins", page: 0 } })
      .then((r) => alive && r.ok && setRows(r.users))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [n]);

  async function set(target: string, admin: boolean) {
    setBusy(target);
    setFlash(null);
    const r = await adminSetRole({ data: { name: target.trim(), admin } }).catch(() => null);
    setBusy(null);
    if (r?.ok) {
      setFlash({
        kind: "ok",
        text: t(admin ? "adm.didPromoteName" : "adm.didDemoteName", { name: target.trim() }),
      });
      setName("");
      setN((x) => x + 1);
    } else {
      setFlash({
        kind: "error",
        text: t(
          r?.error === "not_found"
            ? "acc.err.not_found"
            : accountErrorKey(r ? r.error : "server_error"),
        ),
      });
    }
  }

  function add(e: FormEvent) {
    e.preventDefault();
    void set(name, true);
  }

  return (
    <div className="space-y-4">
      <Panel
        title={t("adm.adminsTitle")}
        icon={<ShieldCheck className="h-4 w-4 text-[var(--tint-info)]" />}
      >
        <p className="text-[13px] text-ink-2">{t("adm.adminsNote")}</p>
        <form onSubmit={add} className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("acc.username")}
            aria-label={t("acc.username")}
            maxLength={20}
            required
            className={`${INPUT} max-w-64`}
          />
          <Btn type="submit" tone="primary" busy={busy === name}>
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> {t("adm.makeAdmin")}
          </Btn>
        </form>
        {flash && <Notice kind={flash.kind}>{flash.text}</Notice>}
      </Panel>
      <Panel title={t("adm.adminList")}>
        {!rows ? (
          <div className="h-20 animate-pulse rounded-lg bg-surface-2" />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5">
                <Avatar id={u.id} name={u.name} avatar={u.avatar} size={32} />
                <button
                  type="button"
                  onClick={() => onOpen(u.id)}
                  className="font-medium text-ink hover:underline"
                >
                  {u.name}
                </button>
                <RoleBadge role={u.role} />
                {u.role === "owner" ? (
                  <Crown className="ml-auto h-4 w-4 text-[var(--tint-warn)]" aria-hidden="true" />
                ) : (
                  <Btn
                    small
                    tone="danger"
                    className="ml-auto"
                    busy={busy === u.name}
                    onClick={() => void set(u.name, false)}
                  >
                    {t("adm.removeAdmin")}
                  </Btn>
                )}
              </li>
            ))}
            {rows.length <= 1 && (
              <li className="py-4 text-center text-[13px] text-ink-3">{t("adm.noAdmins")}</li>
            )}
          </ul>
        )}
      </Panel>
    </div>
  );
}
