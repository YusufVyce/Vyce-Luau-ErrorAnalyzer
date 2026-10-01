import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Table2, BarChart3 } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { RoleBadge } from "@/components/account/RoleBadge";
import { adminOverview } from "@/lib/account/api";
import {
  accountErrorKey,
  LEAGUES,
  type AdminStats,
  type AdminUserRow,
  type DayStat,
} from "@/lib/account/shared";
import { LESSONS } from "@/lib/learn/lessons";
import { lessonTitle } from "@/lib/learn/lessons.tr";
import { useLang, useT } from "@/lib/prefs";
import { BarList, ColumnChart } from "./charts";
import { Btn, Notice, Panel, Pill, useFormat } from "./kit";

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ep-card px-4 py-3">
      <div className="text-[12px] text-ink-3">{label}</div>
      <div className="text-2xl font-semibold text-ink">{value}</div>
      {sub && <div className="text-[12px] text-ink-3">{sub}</div>}
    </div>
  );
}

function UserList({ rows, metric }: { rows: AdminUserRow[]; metric: (u: AdminUserRow) => string }) {
  const t = useT();
  return (
    <ul className="divide-y divide-line">
      {rows.map((u) => (
        <li key={u.id}>
          <Link
            to="/admin"
            search={{ tab: "users", user: u.id }}
            className="flex items-center gap-3 rounded-md px-1 py-2 hover:bg-surface-2"
          >
            <Avatar id={u.id} name={u.name} avatar={u.avatar} size={28} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
              {u.name}
            </span>
            <RoleBadge role={u.role} />
            {u.banned && <Pill tone="bad">{t("adm.banned")}</Pill>}
            <span className="text-[12px] text-ink-3 tabular-nums">{metric(u)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type Metric = Exclude<keyof DayStat, "day">;

export function Overview() {
  const t = useT();
  const lang = useLang();
  const f = useFormat();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [asTable, setAsTable] = useState(false);
  const [n, setN] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminOverview()
      .then((r) => {
        if (!alive) return;
        setLoading(false);
        if (r.ok) {
          setStats(r.stats);
          setError(null);
        } else setError(t(accountErrorKey(r.error)));
      })
      .catch(() => alive && (setLoading(false), setError(t("acc.err.server_error"))));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  if (!stats) {
    return error ? (
      <Notice kind="error">{error}</Notice>
    ) : (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="ep-card h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  const s = stats;
  const sum = (k: Metric) => s.days.reduce((a, d) => a + d[k], 0);
  const charts: Array<{ key: Metric; title: string }> = [
    { key: "signups", title: t("adm.chart.signups") },
    { key: "active", title: t("adm.chart.active") },
    { key: "logins", title: t("adm.chart.logins") },
    { key: "xp", title: t("adm.chart.xp") },
    { key: "posts", title: t("adm.chart.posts") },
  ];

  return (
    <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-ink-3">{t("adm.statsNote")}</p>
        <div className="flex gap-2">
          <Btn small onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
            {asTable ? (
              <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {t(asTable ? "adm.showCharts" : "adm.showTables")}
          </Btn>
          <Btn small busy={loading} onClick={() => setN((x) => x + 1)}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("adm.refresh")}
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <Tile
          label={t("adm.kpi.users")}
          value={f.compact(s.users)}
          sub={t("adm.kpi.today", { n: f.num(s.signupsToday) })}
        />
        <Tile
          label={t("adm.kpi.signups")}
          value={f.compact(s.signups7)}
          sub={t("adm.kpi.last30", { n: f.num(s.signups30) })}
        />
        <Tile
          label={t("adm.kpi.active")}
          value={f.compact(s.activeToday)}
          sub={t("adm.kpi.week", { n: f.num(s.activeWeek) })}
        />
        <Tile
          label={t("adm.kpi.xp")}
          value={f.compact(s.totalXp)}
          sub={t("adm.kpi.today", { n: f.num(s.xpToday) })}
        />
        <Tile
          label={t("adm.kpi.threads")}
          value={f.compact(s.threads)}
          sub={t("adm.kpi.posts", { n: f.num(s.posts), today: f.num(s.postsToday) })}
        />
        <Tile label={t("adm.kpi.reports")} value={f.num(s.reports)} />
        <Tile
          label={t("adm.kpi.banned")}
          value={f.num(s.banned)}
          sub={t("adm.kpi.admins", { n: f.num(s.admins) })}
        />
        <Tile label={t("adm.kpi.images")} value={f.bytes(s.imageBytes)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map((c) => (
          <Panel
            key={c.key}
            title={c.title}
            actions={
              <span className="text-[12px] text-ink-3">
                {t("adm.chart.total30", { n: f.num(sum(c.key)) })}
              </span>
            }
          >
            {asTable ? (
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-surface text-ink-3">
                    <tr>
                      <th className="py-1 text-left font-medium">{t("adm.day")}</th>
                      <th className="py-1 text-right font-medium">{c.title}</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {[...s.days].reverse().map((d) => (
                      <tr key={d.day} className="border-t border-line">
                        <td className="py-1 text-ink-2">{f.day(d.day)}</td>
                        <td className="py-1 text-right text-ink">{f.num(d[c.key])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ColumnChart
                title={c.title}
                points={s.days.map((d) => ({ label: f.day(d.day), value: d[c.key] }))}
                format={f.compact}
              />
            )}
          </Panel>
        ))}
        <Panel title={t("adm.chart.leagues")}>
          <BarList
            rows={LEAGUES.map((l, i) => ({ key: l.en, label: l[lang], value: s.leagues[i] ?? 0 }))}
            format={f.num}
            labelWidth="w-20"
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("adm.topUsers")}>
          {s.topUsers.length === 0 && <p className="text-[13px] text-ink-3">{t("adm.noXpYet")}</p>}
          <UserList rows={s.topUsers} metric={(u) => `${f.num(u.xp)} XP`} />
        </Panel>
        <Panel title={t("adm.newUsers")}>
          <UserList rows={s.newUsers} metric={(u) => f.date(u.createdAt)} />
        </Panel>
      </div>

      <Panel title={t("adm.chart.lessons")}>
        <p className="text-[12px] text-ink-3">{t("adm.chart.lessonsNote")}</p>
        <BarList
          rows={LESSONS.map((l, i) => ({
            key: l.id,
            label: `${i + 1}. ${lessonTitle(l, lang)}`,
            value: s.lessons.find((x) => x.id === l.id)?.done ?? 0,
          }))}
          format={f.num}
          labelWidth="w-40 sm:w-64"
        />
      </Panel>
    </div>
  );
}
