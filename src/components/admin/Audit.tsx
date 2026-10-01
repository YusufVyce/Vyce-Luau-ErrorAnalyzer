import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { adminAudit } from "@/lib/account/api";
import { accountErrorKey, type AuditEntry } from "@/lib/account/shared";
import type { UiKey } from "@/lib/i18n/ui";
import { useT } from "@/lib/prefs";
import { Notice, Pager, Panel, useFormat } from "./kit";

const KNOWN = new Set([
  "ban",
  "unban",
  "xp",
  "lessons",
  "challenges",
  "resetProgress",
  "rename",
  "recovery",
  "logout",
  "removeImage",
  "deletePosts",
  "delete",
  "addAdmin",
  "removeAdmin",
  "nameBan",
  "nameUnban",
  "settings",
  "deletePost",
  "deleteThread",
  "editThread",
  "dismissReport",
]);

/** Who did what in the admin panel, newest first. */
export function Audit() {
  const t = useT();
  const f = useFormat();
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ entries: AuditEntry[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    adminAudit({ data: { page } })
      .then((r) => {
        if (!alive) return;
        if (r.ok) setData({ entries: r.entries, total: r.total });
        else setError(t(accountErrorKey(r.error)));
      })
      .catch(() => alive && setError(t("acc.err.server_error")));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <Panel title={t("adm.auditTitle")} icon={<ScrollText className="h-4 w-4 text-brand" />}>
      {error && <Notice kind="error">{error}</Notice>}
      {!data ? (
        <div className="h-32 animate-pulse rounded-lg bg-surface-2" />
      ) : data.entries.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-ink-3">{t("adm.noAudit")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {data.entries.map((e, i) => (
            <li
              key={`${e.at}-${i}`}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2 text-[13px]"
            >
              <span className="w-36 shrink-0 text-[12px] text-ink-3 tabular-nums">
                {f.dateTime(e.at)}
              </span>
              <b className="text-ink">{e.by}</b>
              <span className="text-ink-2">
                {KNOWN.has(e.action) ? t(`adm.log.${e.action}` as UiKey) : e.action}
              </span>
              {e.target && <span className="font-mono text-[12px] text-ink">{e.target}</span>}
              {e.detail && (
                <span className="min-w-0 break-words text-[12px] text-ink-3">— {e.detail}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {data && (
        <Pager
          page={page}
          total={data.total}
          size={50}
          onPage={setPage}
          label={(n, total) => t("fo.page", { n, total })}
        />
      )}
    </Panel>
  );
}
