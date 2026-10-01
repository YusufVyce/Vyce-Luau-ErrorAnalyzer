import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  Flag,
  Lock,
  LockOpen,
  Pencil,
  Pin,
  PinOff,
  Send,
  Trash2,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Avatar } from "@/components/account/Avatar";
import { Field, FormError, TextArea } from "@/components/account/fields";
import { RoleBadge } from "@/components/account/RoleBadge";
import { Mascot } from "@/components/learn/duo/Mascot";
import { CategoryTag } from "@/components/forum/CategoryTag";
import { ForumBody } from "@/components/forum/ForumBody";
import { PostImages, useForumImages } from "@/components/forum/ForumImages";
import { fullDate, timeAgo } from "@/components/forum/time";
import {
  adminEditThread,
  deletePost,
  getThread,
  moderateThread,
  replyThread,
  reportPost,
} from "@/lib/account/api";
import { useAccount } from "@/lib/account/client";
import { useSiteSettings } from "@/lib/account/site";
import {
  accountErrorKey,
  FORUM_BODY_MAX,
  FORUM_CATEGORIES,
  FORUM_POSTS_PAGE,
  FORUM_REPORT_MAX,
  FORUM_TITLE_MAX,
  FORUM_TITLE_MIN,
  type ForumCategory,
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

function ReportForm({ threadId, n, onDone }: { threadId: number; n: number; onDone: () => void }) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const r = await reportPost({ data: { id: threadId, n, reason } }).catch(() => null);
    if (r?.ok) {
      setState("sent");
      setTimeout(onDone, 2200);
    } else {
      setState("idle");
      setError(t(accountErrorKey(r ? r.error : "server_error")));
    }
  }

  if (state === "sent") {
    return (
      <p className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[13px] text-[var(--ok-ink)]">
        <Check className="h-4 w-4" aria-hidden="true" /> {t("fo.reported")}
      </p>
    );
  }
  return (
    <form onSubmit={send} className="space-y-2 rounded-xl border border-line bg-surface-2 p-3">
      <Field
        label={t("fo.reportWhy")}
        value={reason}
        onValue={setReason}
        maxLength={FORUM_REPORT_MAX}
        placeholder={t("fo.reportPlaceholder")}
        autoFocus
      />
      <FormError>{error}</FormError>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={state === "busy"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-red-500 disabled:opacity-60"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden="true" /> {t("fo.reportSend")}
        </button>
        <button type="button" onClick={onDone} className={SMALL_BTN}>
          {t("img.cancel")}
        </button>
      </div>
    </form>
  );
}

function PostCard({
  post,
  threadId,
  isOp,
  canDelete,
  canReport,
  onDelete,
}: {
  post: ForumPost;
  threadId: number;
  isOp: boolean;
  canDelete: boolean;
  canReport: boolean;
  onDelete: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [reporting, setReporting] = useState(false);
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
          <RoleBadge role={post.author.role} />
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
          <span className="ml-auto flex items-center gap-1">
            {canReport && !post.deleted && !reporting && (
              <button
                type="button"
                onClick={() => setReporting(true)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-ink-3 hover:bg-amber-500/10 hover:text-amber-400"
              >
                <Flag className="h-3.5 w-3.5" aria-hidden="true" /> {t("fo.report")}
              </button>
            )}
            {canDelete && !post.deleted && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-ink-3 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("fo.delete")}
              </button>
            )}
          </span>
        </div>
        {post.deleted ? (
          <p className="text-sm text-ink-3 italic">{t("fo.deleted")}</p>
        ) : (
          <>
            {post.body && <ForumBody text={post.body} />}
            <PostImages ids={post.images ?? []} />
          </>
        )}
        {reporting && (
          <ReportForm threadId={threadId} n={post.n} onDone={() => setReporting(false)} />
        )}
      </div>
    </li>
  );
}

/** Lets a moderator fix a thread's title or move it to another category. */
function EditThreadForm({
  thread,
  onDone,
}: {
  thread: ForumThread;
  onDone: (changed: boolean) => void;
}) {
  const t = useT();
  const lang = useLang();
  const [title, setTitle] = useState(thread.title);
  const [category, setCategory] = useState<ForumCategory>(thread.category);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await adminEditThread({ data: { id: thread.id, title, category } }).catch(() => null);
    setBusy(false);
    if (r?.ok) onDone(true);
    else setError(t(accountErrorKey(r ? r.error : "server_error")));
  }

  return (
    <form onSubmit={save} className="ep-card space-y-3 p-4">
      <Field
        label={t("fo.titleLabel")}
        value={title}
        onValue={setTitle}
        minLength={FORUM_TITLE_MIN}
        maxLength={FORUM_TITLE_MAX}
        required
      />
      <label className="block space-y-1.5">
        <span className="block text-[13px] font-medium text-ink">{t("fo.category")}</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ForumCategory)}
          className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-ink"
        >
          {FORUM_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {lang === "tr" ? c.tr : c.en}
            </option>
          ))}
        </select>
      </label>
      <FormError>{error}</FormError>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="ep-cta rounded-lg px-3 py-1.5 text-[13px] font-semibold disabled:opacity-60"
        >
          {t("img.save")}
        </button>
        <button type="button" onClick={() => onDone(false)} className={SMALL_BTN}>
          {t("img.cancel")}
        </button>
      </div>
    </form>
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
  const [editing, setEditing] = useState(false);
  const images = useForumImages();
  const site = useSiteSettings();

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
    const r = await replyThread({
      data: { id: thread.id, body: reply, images: images.ids },
    }).catch(() => null);
    setSending(false);
    if (!r?.ok) {
      setFormError(t(accountErrorKey(r ? r.error : "server_error")));
      return;
    }
    setReply("");
    images.clear();
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
  const closed = Boolean(site?.forumReadOnly && !thread.canModerate);
  const canReply = me && (!thread.locked || thread.canModerate) && !closed;

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
              <button type="button" className={SMALL_BTN} onClick={() => setEditing((v) => !v)}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                {t("fo.edit")}
              </button>
            </div>
          )}
          {editing && thread.canModerate && (
            <EditThreadForm
              thread={thread}
              onDone={(changed) => {
                setEditing(false);
                if (changed) reload();
              }}
            />
          )}
        </header>

        <ol className="space-y-3">
          {thread.posts.map((post) => (
            <PostCard
              key={post.n}
              post={post}
              threadId={thread.id}
              isOp={post.author.id === thread.author.id}
              canDelete={Boolean(me && (me.id === post.author.id || thread.canModerate))}
              canReport={Boolean(me && me.id !== post.author.id)}
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
        ) : closed && me ? (
          <p className="ep-card flex items-center gap-2 p-4 text-sm text-[var(--warn-ink)]">
            <Lock className="h-4 w-4" aria-hidden="true" /> {t("acc.err.forum_closed")}
          </p>
        ) : canReply ? (
          <form onSubmit={send} {...images.formProps} className="ep-card space-y-3 p-4 sm:p-5">
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
              required={images.ids.length === 0}
            />
            {images.picker}
            <FormError>{formError}</FormError>
            <button
              type="submit"
              disabled={sending || images.uploading || (!reply.trim() && images.ids.length === 0)}
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
