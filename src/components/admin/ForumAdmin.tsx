import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ExternalLink, Flag, MessagesSquare, Trash2 } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { RoleBadge } from "@/components/account/RoleBadge";
import { PostImages } from "@/components/forum/ForumImages";
import {
  adminDeletePost,
  adminDismissReport,
  adminRecentPosts,
  adminReports,
} from "@/lib/account/api";
import {
  accountErrorKey,
  FORUM_POSTS_PAGE,
  type AdminPostRow,
  type ReportRow,
} from "@/lib/account/shared";
import { useT } from "@/lib/prefs";
import { Btn, Notice, Pager, Panel, Pill, Segmented, useFormat } from "./kit";

function PostRow({
  post,
  children,
  onDelete,
  busy,
}: {
  post: AdminPostRow;
  children?: React.ReactNode;
  onDelete: () => void;
  busy: boolean;
}) {
  const t = useT();
  const f = useFormat();
  const name = post.author.name || t("fo.deletedUser");
  const page = Math.floor((post.n - 1) / FORUM_POSTS_PAGE);
  return (
    <li className={`space-y-2 py-3 ${post.deleted ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <Avatar id={post.author.id} name={name} avatar={post.author.avatar} size={22} />
        {post.author.name ? (
          <Link
            to="/admin"
            search={{ tab: "users", user: post.author.id }}
            className="font-semibold text-ink hover:underline"
          >
            {name}
          </Link>
        ) : (
          <span className="font-semibold text-ink-3">{name}</span>
        )}
        <RoleBadge role={post.author.role} />
        <span className="text-ink-3">· {f.dateTime(post.createdAt)}</span>
        {post.n === 1 && <Pill tone="info">{t("adm.threadStart")}</Pill>}
        {post.deleted && <Pill>{t("adm.deleted")}</Pill>}
        <span className="ml-auto flex gap-1.5">
          <Link
            to="/forum/$id"
            params={{ id: String(post.thread) }}
            search={{ p: page > 0 ? page + 1 : undefined }}
            hash={`p${post.n}`}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-ink-2 hover:text-ink"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" /> {t("adm.open")}
          </Link>
          {!post.deleted && (
            <Btn small tone="danger" busy={busy} onClick={onDelete}>
              <Trash2 className="h-3 w-3" aria-hidden="true" /> {t("fo.delete")}
            </Btn>
          )}
        </span>
      </div>
      <p className="text-[13px] font-medium text-ink">{post.title}</p>
      {!post.deleted && post.body && (
        <p className="line-clamp-4 text-[13px] whitespace-pre-wrap text-ink-2">{post.body}</p>
      )}
      {!post.deleted && post.images.length > 0 && <PostImages ids={post.images} />}
      {children}
    </li>
  );
}

/** Reported posts first, then everything new on the forum. */
export function ForumAdmin({ onReports }: { onReports?: (n: number) => void }) {
  const t = useT();
  const f = useFormat();
  const [view, setView] = useState<"reports" | "recent">("reports");
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [recent, setRecent] = useState<{ posts: AdminPostRow[]; total: number } | null>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    const fail = (e: Parameters<typeof accountErrorKey>[0]) =>
      alive && setError(t(accountErrorKey(e)));
    if (view === "reports") {
      adminReports()
        .then((r) => {
          if (!alive) return;
          if (r.ok) {
            setReports(r.reports);
            onReports?.(r.reports.length);
          } else fail(r.error);
        })
        .catch(() => fail("server_error"));
    } else {
      adminRecentPosts({ data: { page } })
        .then((r) =>
          r.ok ? alive && setRecent({ posts: r.posts, total: r.total }) : fail(r.error),
        )
        .catch(() => fail("server_error"));
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, page, n]);

  async function remove(post: AdminPostRow) {
    const whole = post.n === 1;
    if (!window.confirm(t(whole ? "fo.confirmDeleteThread" : "fo.confirmDelete"))) return;
    const key = `${post.thread}:${post.n}`;
    setBusy(key);
    const r = await adminDeletePost({ data: { id: post.thread, n: post.n } }).catch(() => null);
    setBusy(null);
    if (r?.ok) setN((x) => x + 1);
    else setError(t(accountErrorKey(r ? r.error : "server_error")));
  }

  async function dismiss(key: string) {
    setBusy(key);
    const r = await adminDismissReport({ data: { key } }).catch(() => null);
    setBusy(null);
    if (r?.ok) setN((x) => x + 1);
    else setError(t(accountErrorKey(r ? r.error : "server_error")));
  }

  return (
    <Panel
      title={
        <Segmented
          label={t("nav.forum")}
          value={view}
          onChange={setView}
          options={[
            {
              value: "reports",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" /> {t("adm.reports")}
                  {reports && reports.length > 0 && ` (${reports.length})`}
                </span>
              ),
            },
            {
              value: "recent",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <MessagesSquare className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                  {t("adm.recentPosts")}
                </span>
              ),
            },
          ]}
        />
      }
    >
      {error && <Notice kind="error">{error}</Notice>}
      {view === "reports" ? (
        reports === null ? (
          <div className="h-32 animate-pulse rounded-lg bg-surface-2" />
        ) : reports.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink-3">{t("adm.noReports")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {reports.map((r) => (
              <PostRow key={r.key} post={r} busy={busy === r.key} onDelete={() => void remove(r)}>
                <div className="space-y-1.5 rounded-lg border border-amber-400/30 bg-amber-400/5 p-2.5">
                  {r.reasons.map((x, i) => (
                    <p key={i} className="text-[12px] text-ink-2">
                      <Flag
                        className="mr-1 inline h-3 w-3 text-[var(--warn-ink)]"
                        aria-hidden="true"
                      />
                      <b className="text-ink">{x.by}</b>: {x.reason || "—"}{" "}
                      <span className="text-ink-3">· {f.dateTime(x.at)}</span>
                    </p>
                  ))}
                  <Btn small busy={busy === r.key} onClick={() => void dismiss(r.key)}>
                    <Check className="h-3 w-3" aria-hidden="true" /> {t("adm.dismiss")}
                  </Btn>
                </div>
              </PostRow>
            ))}
          </ul>
        )
      ) : recent === null ? (
        <div className="h-32 animate-pulse rounded-lg bg-surface-2" />
      ) : recent.posts.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-3">{t("fo.empty")}</p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {recent.posts.map((p) => (
              <PostRow
                key={`${p.thread}:${p.n}`}
                post={p}
                busy={busy === `${p.thread}:${p.n}`}
                onDelete={() => void remove(p)}
              />
            ))}
          </ul>
          <Pager
            page={page}
            total={recent.total}
            size={30}
            onPage={setPage}
            label={(x, total) => t("fo.page", { n: x, total })}
          />
        </>
      )}
    </Panel>
  );
}
