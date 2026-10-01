import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  MessagesSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  ShieldOff,
  UserX,
  Users as UsersIcon,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { RoleBadge } from "@/components/account/RoleBadge";
import { RequireAccount } from "@/components/account/RequireAccount";
import { Admins } from "@/components/admin/Admins";
import { Audit } from "@/components/admin/Audit";
import { ForumAdmin } from "@/components/admin/ForumAdmin";
import { NameBans } from "@/components/admin/NameBans";
import { Overview } from "@/components/admin/Overview";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { UserDetail } from "@/components/admin/UserDetail";
import { Users } from "@/components/admin/Users";
import { useAccount } from "@/lib/account/client";
import type { UiKey } from "@/lib/i18n/ui";
import { useT } from "@/lib/prefs";

const TABS = ["overview", "users", "forum", "names", "admins", "settings", "audit"] as const;
type Tab = (typeof TABS)[number];

type AdminSearch = { tab?: Tab; user?: string };

export const Route = createFileRoute("/admin")({
  validateSearch: (s: Record<string, unknown>): AdminSearch => ({
    tab: TABS.includes(s.tab as Tab) ? (s.tab as Tab) : undefined,
    user: typeof s.user === "string" && /^u_[0-9a-f]{1,40}$/.test(s.user) ? s.user : undefined,
  }),
  head: () => ({
    meta: [{ title: "Admin — Vyce LuaUtility" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAccount next="/admin">
      <AdminPage />
    </RequireAccount>
  ),
});

const TAB_INFO: Record<Tab, { key: UiKey; icon: typeof LayoutDashboard; ownerOnly?: boolean }> = {
  overview: { key: "adm.tab.overview", icon: LayoutDashboard },
  users: { key: "adm.tab.users", icon: UsersIcon },
  forum: { key: "adm.tab.forum", icon: MessagesSquare },
  names: { key: "adm.tab.names", icon: UserX },
  admins: { key: "adm.tab.admins", icon: ShieldCheck, ownerOnly: true },
  settings: { key: "adm.tab.settings", icon: Settings },
  audit: { key: "adm.tab.audit", icon: ScrollText },
};

function AdminPage() {
  const t = useT();
  const { user } = useAccount();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin" });
  const [reports, setReports] = useState<number | null>(null);
  const role = user?.role;

  if (!role) {
    return (
      <PageShell>
        <div className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
          <ShieldOff className="h-12 w-12 text-ink-3" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-ink">{t("adm.noAccess")}</h1>
          <p className="text-sm text-ink-2">{t("adm.noAccessBody")}</p>
          <Link to="/" className="vy-btn">
            {t("acc.downHome")}
          </Link>
        </div>
      </PageShell>
    );
  }

  const tabs = TABS.filter((tab) => !TAB_INFO[tab].ownerOnly || role === "owner");
  const tab: Tab =
    search.tab && tabs.includes(search.tab) ? search.tab : search.user ? "users" : "overview";
  const go = (next: AdminSearch) => void navigate({ search: next });
  const openUser = (id: string) => go({ tab: "users", user: id });

  return (
    <PageShell>
      <div className="relative z-10 space-y-5 pt-10 md:pt-12">
        <header className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-400/10 text-[var(--tint-info)]">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">
              {t("adm.title")} <RoleBadge role={role} />
            </h1>
            <p className="text-[13px] text-ink-3">{t("adm.subtitle", { name: user.name })}</p>
          </div>
        </header>

        <nav
          aria-label={t("adm.title")}
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {tabs.map((id) => {
            const { key, icon: Icon } = TAB_INFO[id];
            const active = id === tab;
            return (
              <button
                key={id}
                type="button"
                onClick={() => go({ tab: id })}
                aria-current={active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? "border-brand-line bg-brand-soft text-brand"
                    : "border-line bg-surface text-ink-2 hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t(key)}
                {id === "forum" && reports !== null && reports > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                    {reports}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {tab === "overview" && <Overview />}
        {tab === "users" &&
          (search.user ? (
            <UserDetail
              key={search.user}
              id={search.user}
              myRole={role}
              onBack={() => go({ tab: "users" })}
              onDeleted={() => go({ tab: "users" })}
            />
          ) : (
            <Users onOpen={openUser} />
          ))}
        {tab === "forum" && <ForumAdmin onReports={setReports} />}
        {tab === "names" && <NameBans />}
        {tab === "admins" && role === "owner" && <Admins onOpen={openUser} />}
        {tab === "settings" && <SettingsPanel />}
        {tab === "audit" && <Audit />}
      </div>
    </PageShell>
  );
}
