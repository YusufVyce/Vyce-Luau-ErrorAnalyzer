import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Lock, LockOpen, Pin, PinOff, Send, Trash2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Avatar } from "@/components/account/Avatar";
import { FormError, TextArea } from "@/components/account/fields";
import { Mascot } from "@/components/learn/duo/Mascot";
import { CategoryTag } from "@/components/forum/CategoryTag";
import { ForumBody } from "@/components/forum/ForumBody";
import { fullDate, timeAgo } from "@/components/forum/time";
import { deletePost, getThread, moderateThread, replyThread } from "@/lib/account/api";
import { useAccount } from "@/lib/account/client";
import {
  accountErrorKey,
  FORUM_BODY_MAX,
  FORUM_POSTS_PAGE,
  type AccountError,
  type ForumPost,
  type ForumThread,
} from "@/lib/account/shared";
import { levelFor } from "@/lib/learn/progress";
import { useLang, useT } from "@/lib/prefs";

type ThreadSearch = { p?: number };

export const Route = createFileRoute("/forum/$id")({
  validateSearch: (s: Record<string, unknown>): ThreadSearch => {
    const p = Number(s.p);
    return { p: Number.isInteger(p) && p > 1 ? p : undefined };
  },
  head: () => ({
    meta: [{ title: "Forum — Vyce LuaUtility" }],
  }),
  component: ThreadPage,
});

const SMALL_BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-brand-line hover:text-ink disabled:opacity-60";

function PostCard({
  post,
  isOp,
  canDelete,
  onDelete,
}: {
  post: ForumPost;
  isOp: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const name = post.author.name || t("fo.deletedUser");
  return (
    <li id={`p${post.n}`} className="ep-card flex gap-3 p-4 sm:gap-4 sm:p-5">
      <Avatar id={post.author.id} name={name} avatar={post.author.avatar} size={44} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          {post.author.name ? (
            <Link
              to="/u/$name"
              params={{ name: post.author.name }}
              className="font-semibold text-ink hover:underline"
            >
              {name}
            </Link>
          ) : (
            <span className="font-semibold text-ink-3">{name}</span>
          )}
          {post.author.name && (
            <span className="font-mono text-[11px] text-ink-3">
              {t("lb.level", { n: levelFor(post.author.xp).level })}
            </span>
          )}
          {isOp && (
            <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand uppercase">
              {t("fo.op")}
            </span>
          )}
          <span className="text-ink-3" title={fullDate(post.createdAt, lang)}>
            · {timeAgo(post.createdAt, lang, t("fo.justNow"))}
          </span>
          {canDelete && !post.deleted && (
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-ink-3 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("fo.delete")}
            </button>
          )}
        </div>
        {post.deleted ? (
          <p className="text-sm text-ink-3 italic">{t("fo.deleted")}</p>
        ) : (
          <ForumBody text={post.body} />
        )}
      </div>
    </li>
  );
}

function ThreadPage() {
  const t = useT();
  const lang = useLang();
  const acc = useAccount();
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const page = (search.p ?? 1) - 1;
  const threadId = Number(id);
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [error, setError] = useState<AccountError | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [n, setN] = useState(0);

  const reload = useCallback(() => setN((x) => x + 1), []);

  useEffect(() => {
    let alive = true;
    setError(null);
    if (!Number.isInteger(threadId) || threadId <= 0) {
      setError("not_found");
      return;
    }
    getThread({ data: { id: threadId, page } })
      .then((r) => {
        if (!alive) return;
        if (r.ok) setThread(r.thread);
        else setError(r.error);
      })
      .catch(() => alive && setError("server_error"));
    return () => {
      alive = false;
    };
    // Reload after signing in so delete buttons and moderation show up.
  }, [threadId, page, n, acc.user?.id]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!thread) return;
    setSending(true);
    setFormError(null);
    const r = await replyThread({ data: { id: thread.id, body: reply } }).catch(() => null);
    setSending(false);
    if (!r?.ok) {
      setFormError(t(accountErrorKey(r ? r.error : "server_error")));
      return;
    }
    setReply("");
    if (r.page === page) reload();
    else void navigate({ to: "/forum/$id", params: { id }, search: { p: r.page + 1 } });
    setTimeout(() => document.getElementById(`p${r.n}`)?.scrollIntoView({ block: "center" }), 600);
  }

  async function remove(post: ForumPost) {
    if (!thread) return;
    const whole = post.n === 1;
    if (!window.confirm(t(whole ? "fo.confirmDeleteThread" : "fo.confirmDelete"))) return;
    const r = await deletePost({ data: { id: thread.id, n: post.n } }).catch(() => null);
    if (!r?.ok) {
      setFormError(t(accountErrorKey(r ? r.error : "server_error")));
      return;
    }
    if (r.threadDeleted) void navigate({ to: "/forum", search: {} });
    else reload();
  }

  async function moderate(action: "pin" | "unpin" | "lock" | "unlock") {
    if (!thread) return;
    const r = await moderateThread({ data: { id: thread.id, action } }).catch(() => null);
    if (r?.ok) reload();
    else setFormError(t(accountErrorKey(r ? r.error : "server_error")));
  }

  if (error || !thread) {
    return (
      <PageShell width="max-w-3xl">
        <div className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
          <Mascot mood={error ? "sad" : "think"} size={96} />
          {error && (
            <>
              <p className="text-ink-2">
                {error === "not_found" ? t("fo.notFound") : t(accountErrorKey(error))}
              </p>
              <Link to="/forum" search={{}} className="vy-btn">
                {t("fo.back")}
              </Link>
            </>
          )}
        </div>
      </PageShell>
    );
  }

  const pages = Math.max(1, Math.ceil(thread.total / FORUM_POSTS_PAGE));
  const me = acc.user;
  const canReply = me && (!thread.locked || thread.canModerate);

  return (
    <PageShell width="max-w-3xl">
      <div className="relative z-10 space-y-5 pt-10 md:pt-14">
        <Link
          to="/forum"
          search={{ c: thread.category }}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("fo.back")}
        </Link>

        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryTag id={thread.category} lang={lang} />
            {thread.pinned && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-amber-400">
                <Pin className="h-3.5 w-3.5" aria-hidden="true" /> {t("fo.pinned")}
              </span>
            )}
            {thread.locked && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-3">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" /> {t("fo.locked")}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight break-words text-ink md:text-3xl">
            {thread.title}
          </h1>
          {thread.canModerate && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-semibold text-ink-3">{t("fo.mod")}:</span>
              <button
                type="button"
                className={SMALL_BTN}
                onClick={() => void moderate(thread.pinned ? "unpin" : "pin")}
              >
                {thread.pinned ? (
                  <PinOff className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {t(thread.pinned ? "fo.unpin" : "fo.pin")}
              </button>
              <button
                type="button"
                className={SMALL_BTN}
                onClick={() => void moderate(thread.locked ? "unlock" : "lock")}
              >
                {thread.locked ? (
                  <LockOpen className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {t(thread.locked ? "fo.unlock" : "fo.lock")}
              </button>
            </div>
          )}
        </header>

        <ol className="space-y-3">
          {thread.posts.map((post) => (
            <PostCard
              key={post.n}
              post={post}
              isOp={post.author.id === thread.author.id}
              canDelete={Boolean(me && (me.id === post.author.id || thread.canModerate))}
              onDelete={() => void remove(post)}
            />
          ))}
        </ol>

        {pages > 1 && (
          <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Pages">
            {page > 0 ? (
              <Link
                to="/forum/$id"
                params={{ id }}
                search={{ p: page > 1 ? page : undefined }}
                className="vy-btn"
              >
                ← {t("fo.prev")}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-ink-3">{t("fo.page", { n: page + 1, total: pages })}</span>
            {page + 1 < pages ? (
              <Link to="/forum/$id" params={{ id }} search={{ p: page + 2 }} className="vy-btn">
                {t("fo.next")} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        {thread.locked && !thread.canModerate ? (
          <p className="ep-card flex items-center gap-2 p-4 text-sm text-ink-2">
            <Lock className="h-4 w-4" aria-hidden="true" /> {t("fo.lockedNote")}
          </p>
        ) : canReply ? (
          <form onSubmit={send} className="ep-card space-y-3 p-4 sm:p-5">
            <TextArea
              label={t("fo.replyLabel")}
              hint={t("fo.bodyHint")}
              value={reply}
              onValue={(v) => {
                setReply(v);
                setFormError(null);
              }}
              rows={5}
              maxLength={FORUM_BODY_MAX}
              required
            />
            <FormError>{formError}</FormError>
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className="ep-cta inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {sending ? t("fo.sending") : t("fo.send")}
            </button>
          </form>
        ) : (
          <div className="ep-card flex flex-col items-center gap-3 p-6 text-center">
            <FormError>{formError}</FormError>
            <Link
              to="/login"
              search={{ next: "/forum" }}
              className="ep-cta rounded-xl px-4 py-2 text-sm font-semibold"
            >
              {t("fo.signinReply")}
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}
