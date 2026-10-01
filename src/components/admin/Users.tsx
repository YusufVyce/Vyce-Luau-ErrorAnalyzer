import { useEffect, useState } from "react";
import { Ban, Search } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { RoleBadge } from "@/components/account/RoleBadge";
import { adminUsers } from "@/lib/account/api";
import {
  accountErrorKey,
  type AdminUserRow,
  type AdminUsersFilter,
  type AdminUsersSort,
} from "@/lib/account/shared";
import { levelFor } from "@/lib/learn/progress";
import { useT } from "@/lib/prefs";
import { INPUT, Notice, Pager, Panel, Pill, Segmented, useFormat } from "./kit";

const PAGE = 50;

/** Every account: search by name, sort, filter, then open one to manage it. */
export function Users({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useT();
  const f = useFormat();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<AdminUsersSort>("new");
  const [filter, setFilter] = useState<AdminUsersFilter>("all");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ users: AdminUserRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => setPage(0), [debounced, sort, filter]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminUsers({ data: { query: debounced, sort, filter, page } })
      .then((r) => {
        if (!alive) return;
        setLoading(false);
        if (r.ok) {
          setData({ users: r.users, total: r.total });
          setError(null);
        } else setError(t(accountErrorKey(r.error)));
      })
      .catch(() => alive && (setLoading(false), setError(t("acc.err.server_error"))));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, sort, filter, page]);

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-52 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("adm.searchUsers")}
            aria-label={t("adm.searchUsers")}
            className={`${INPUT} pl-9`}
          />
        </label>
        <Segmented
          label={t("adm.sort")}
          value={sort}
          onChange={setSort}
          options={[
            { value: "new", label: t("adm.sortNew") },
            { value: "xp", label: t("adm.sortXp") },
            { value: "name", label: t("adm.sortName") },
          ]}
        />
        <Segmented
          label={t("adm.filter")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t("fo.all") },
            { value: "banned", label: t("adm.filterBanned") },
            { value: "admins", label: t("adm.filterAdmins") },
          ]}
        />
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      {data && (
        <p className="text-[12px] text-ink-3">{t("adm.userCount", { n: f.num(data.total) })}</p>
      )}

      <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
        <table className="w-full min-w-[560px] text-[13px]">
          <thead className="text-left text-[12px] text-ink-3">
            <tr>
              <th className="py-2 pr-3 font-medium">{t("acc.username")}</th>
              <th className="py-2 pr-3 text-right font-medium">XP</th>
              <th className="py-2 pr-3 text-right font-medium">{t("adm.level")}</th>
              <th className="py-2 text-right font-medium">{t("adm.joined")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => (
              <tr
                key={u.id}
                className="cursor-pointer border-t border-line hover:bg-surface-2"
                onClick={() => onOpen(u.id)}
              >
                <td className="py-2 pr-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(u.id);
                    }}
                    className="flex items-center gap-2.5 text-left"
                  >
                    <Avatar id={u.id} name={u.name} avatar={u.avatar} size={28} />
                    <span className="font-medium text-ink hover:underline">{u.name}</span>
                    <RoleBadge role={u.role} />
                    {u.banned && (
                      <Pill tone="bad">
                        <Ban className="h-3 w-3" aria-hidden="true" /> {t("adm.banned")}
                      </Pill>
                    )}
                  </button>
                </td>
                <td className="py-2 pr-3 text-right text-ink-2 tabular-nums">{f.num(u.xp)}</td>
                <td className="py-2 pr-3 text-right text-ink-2 tabular-nums">
                  {levelFor(u.xp).level}
                </td>
                <td className="py-2 text-right text-ink-3 tabular-nums">{f.date(u.createdAt)}</td>
              </tr>
            ))}
            {data && data.users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-ink-3">
                  {t("adm.noUsers")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data && (
        <Pager
          page={page}
          total={data.total}
          size={PAGE}
          onPage={setPage}
          label={(n, total) => t("fo.page", { n, total })}
        />
      )}
    </Panel>
  );
}
