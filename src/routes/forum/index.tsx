import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, MessageSquare, MessagesSquare, Pin, Plus } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/account/Avatar";
import { RoleBadge } from "@/components/account/RoleBadge";
import { Mascot } from "@/components/learn/duo/Mascot";
import { CategoryTag } from "@/components/forum/CategoryTag";
import { fullDate, timeAgo } from "@/components/forum/time";
import { listThreads } from "@/lib/account/api";
import { useAccount } from "@/lib/account/client";
import { useSiteSettings } from "@/lib/account/site";
import {
  accountErrorKey,
  FORUM_CATEGORIES,
  FORUM_PAGE,
  type AccountError,
  type ForumCategory,
  type ForumThreadRow,
} from "@/lib/account/shared";
import { useLang, useT } from "@/lib/prefs";

type ForumSearch = { c?: ForumCategory; p?: number };

export const Route = createFileRoute("/forum/")({
  validateSearch: (s: Record<string, unknown>): ForumSearch => {
    const c = FORUM_CATEGORIES.find((x) => x.id === s.c)?.id;
    const p = Number(s.p);
    return { c, p: Number.isInteger(p) && p > 1 ? p : undefined };
  },
  head: () => ({
    meta: [
      { title: "Forum — Vyce LuaUtility" },
      {
        name: "description",
        content:
          "Ask Roblox scripting questions, share your projects and help other Luau learners.",
      },
    ],
  }),
  component: ForumPage,
});

function ThreadRow({ thread }: { thread: ForumThreadRow }) {
  const t = useT();
  const lang = useLang();
  const author = thread.author.name || t("fo.deletedUser");
  return (
    <li className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
      <Avatar id={thread.author.id} name={author} avatar={thread.author.avatar} size={40} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {thread.pinned && (
            <Pin className="h-4 w-4 shrink-0 text-amber-400" aria-label={t("fo.pinned")} />
          )}
          {thread.locked && (
            <Lock className="h-4 w-4 shrink-0 text-ink-3" aria-label={t("fo.locked")} />
          )}
          <Link
            to="/forum/$id"
            params={{ id: String(thread.id) }}
            className="min-w-0 font-semibold break-words text-ink hover:underline"
          >
            {thread.title}
          </Link>
          <CategoryTag id={thread.category} lang={lang} />
        </div>
        <p className="text-[12px] text-ink-3">
          {thread.author.name ? (
            <Link to="/u/$name" params={{ name: thread.author.name }} className="hover:underline">
              {author}
            </Link>
          ) : (
            author
          )}
          {thread.author.role && (
            <RoleBadge role={thread.author.role} className="mx-1 align-middle" />
          )}{" "}
          ·{" "}
          <span title={fullDate(thread.createdAt, lang)}>
            {timeAgo(thread.createdAt, lang, t("fo.justNow"))}
          </span>
          {thread.lastBy && (
            <>
              {" "}
              · {t("fo.lastBy", { name: thread.lastBy.name || t("fo.deletedUser") })}{" "}
              <span title={fullDate(thread.lastAt, lang)}>
                {timeAgo(thread.lastAt, lang, t("fo.justNow"))}
              </span>
            </>
          )}
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[12px] text-ink-3">
        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
        {thread.replies === 1 ? t("fo.reply1") : t("fo.replies", { n: thread.replies })}
      </span>
    </li>
  );
}

function ForumPage() {
  const t = useT();
  const lang = useLang();
  const acc = useAccount();
  const search = Route.useSearch();
  const category = search.c;
  const page = (search.p ?? 1) - 1;
  const [data, setData] = useState<{ threads: ForumThreadRow[]; total: number } | null>(null);
  const [error, setError] = useState<AccountError | null>(null);
  const site = useSiteSettings();

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    listThreads({ data: { category: category ?? "all", page } })
      .then((r) => {
        if (!alive) return;
        if (r.ok) setData({ threads: r.threads, total: r.total });
        else setError(r.error);
      })
      .catch(() => alive && setError("server_error"));
    return () => {
      alive = false;
    };
  }, [category, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / FORUM_PAGE)) : 1;
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-[13px] transition-colors ${
      active
        ? "border-brand-line bg-brand-soft text-brand"
        : "border-line text-ink-2 hover:bg-surface-2 hover:text-ink"
    }`;

  return (
    <PageShell width="max-w-4xl">
      <PageHeader
        sticker={
          <>
            <MessagesSquare className="h-4 w-4 text-brand" aria-hidden="true" /> {t("fo.sticker")}
          </>
        }
        title={
          <>
            {t("fo.title1")} <span className="ep-mark">{t("fo.title2")}</span>
          </>
        }
      >
        {t("fo.lead")}
      </PageHeader>

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Link to="/forum" search={{}} className={chip(!category)}>
              {t("fo.all")}
            </Link>
            {FORUM_CATEGORIES.map((c) => (
              <Link key={c.id} to="/forum" search={{ c: c.id }} className={chip(category === c.id)}>
                {lang === "tr" ? c.tr : c.en}
              </Link>
            ))}
          </div>
          {acc.status === "user" ? (
            <Link
              to="/forum/new"
              search={category ? { c: category } : {}}
              className="ep-cta inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> {t("fo.new")}
            </Link>
          ) : (
            <Link
              to="/login"
              search={{ next: "/forum/new" }}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-line bg-brand-soft px-4 py-2 text-sm font-medium text-brand hover:bg-brand hover:text-white"
            >
              {t("fo.signin")}
            </Link>
          )}
        </div>

        {site?.forumReadOnly && (
          <p className="ep-card flex items-center gap-2 border-amber-400/40 p-4 text-sm text-[var(--warn-ink)]">
            <Lock className="h-4 w-4 shrink-0" aria-hidden="true" /> {t("acc.err.forum_closed")}
          </p>
        )}
        {error ? (
          <div className="ep-card flex flex-col items-center gap-3 p-10 text-center">
            <Mascot mood="sad" size={80} />
            <p className="text-sm text-ink-2">{t(accountErrorKey(error))}</p>
          </div>
        ) : !data ? (
          <ul className="ep-card divide-y divide-line" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-4">
                <span className="h-10 w-10 animate-pulse rounded-xl bg-surface-2" />
                <span className="h-4 flex-1 animate-pulse rounded bg-surface-2" />
              </li>
            ))}
          </ul>
        ) : data.threads.length === 0 ? (
          <div className="ep-card flex flex-col items-center gap-3 p-10 text-center">
            <Mascot mood="think" size={80} />
            <p className="text-sm text-ink-2">{t("fo.empty")}</p>
          </div>
        ) : (
          <ul className="ep-card divide-y divide-line overflow-hidden">
            {data.threads.map((th) => (
              <ThreadRow key={th.id} thread={th} />
            ))}
          </ul>
        )}

        {data && pages > 1 && (
          <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Pages">
            {page > 0 ? (
              <Link
                to="/forum"
                search={{ c: category, p: page > 1 ? page : undefined }}
                className="vy-btn"
              >
                ← {t("fo.prev")}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-ink-3">{t("fo.page", { n: page + 1, total: pages })}</span>
            {page + 1 < pages ? (
              <Link to="/forum" search={{ c: category, p: page + 2 }} className="vy-btn">
                {t("fo.next")} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
        <p className="text-center text-[12px] text-ink-3">{t("fo.rules")}</p>
      </div>
    </PageShell>
  );
}
