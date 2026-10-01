import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Swords,
  Trash2,
  UserCog,
} from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { LeagueBadge } from "@/components/account/LeagueBadge";
import { RoleBadge } from "@/components/account/RoleBadge";
import { adminAct, adminUser } from "@/lib/account/api";
import { useAccount } from "@/lib/account/client";
import {
  accountErrorKey,
  imageUrl,
  type AdminAction,
  type AdminUserDetail,
  type Role,
} from "@/lib/account/shared";
import { CHALLENGE_XP, CHALLENGES } from "@/lib/challenges/challenges";
import { LESSONS } from "@/lib/learn/lessons";
import { chapterName, lessonTitle } from "@/lib/learn/lessons.tr";
import { EMPTY_PROGRESS, lessonComplete, levelFor } from "@/lib/learn/progress";
import { useLang, useT } from "@/lib/prefs";
import { Btn, INPUT, Notice, Panel, Pill, Segmented, useFormat } from "./kit";

type Flash = { kind: "ok" | "error"; text: string } | null;

const BAN_DAYS = [1, 3, 7, 30, 0] as const;

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2/50 px-3 py-2">
      <dt className="text-[11px] text-ink-3">{label}</dt>
      <dd className="text-[14px] font-semibold text-ink">{children}</dd>
    </div>
  );
}

/** Lessons or challenges with checkboxes: tick some, then mark them done or not done. */
function ProgressEditor({
  rows,
  busy,
  onApply,
  doneLabel,
}: {
  rows: Array<{ id: string; label: string; group?: string; done: boolean; note?: ReactNode }>;
  busy: boolean;
  onApply: (ids: string[], done: boolean, xp: boolean) => Promise<boolean>;
  doneLabel: string;
}) {
  const t = useT();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [xp, setXp] = useState(true);
  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const ids = [...picked];
  const doneCount = rows.filter((r) => r.done).length;

  async function apply(done: boolean) {
    if (await onApply(ids, done, xp)) setPicked(new Set());
  }

  let lastGroup: string | undefined;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-ink-3">
          {doneLabel}: <b className="text-ink">{doneCount}</b>/{rows.length}
        </span>
        <span className="ml-auto flex flex-wrap gap-1.5">
          <Btn small onClick={() => setPicked(new Set(rows.map((r) => r.id)))}>
            {t("adm.selectAll")}
          </Btn>
          <Btn
            small
            onClick={() => setPicked(new Set(rows.filter((r) => !r.done).map((r) => r.id)))}
          >
            {t("adm.selectNotDone")}
          </Btn>
          <Btn small onClick={() => setPicked(new Set())} disabled={ids.length === 0}>
            {t("adm.selectNone")}
          </Btn>
        </span>
      </div>
      <ul className="max-h-80 space-y-0.5 overflow-y-auto rounded-lg border border-line p-1">
        {rows.map((r) => {
          const header = r.group && r.group !== lastGroup ? r.group : null;
          lastGroup = r.group;
          return (
            <li key={r.id}>
              {header && (
                <div className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                  {header}
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={picked.has(r.id)}
                  onChange={() => toggle(r.id)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{r.label}</span>
                {r.note}
                {r.done ? (
                  <Pill tone="ok">
                    <Check className="h-3 w-3" aria-hidden="true" /> {t("adm.done")}
                  </Pill>
                ) : (
                  <Pill>{t("adm.notDone")}</Pill>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-[12px] text-ink-2">
          <input
            type="checkbox"
            checked={xp}
            onChange={(e) => setXp(e.target.checked)}
            className="h-4 w-4 accent-[var(--brand)]"
          />
          {t("adm.withXp")}
        </label>
        <span className="ml-auto flex gap-1.5">
          <Btn
            tone="primary"
            small
            busy={busy}
            disabled={ids.length === 0}
            onClick={() => void apply(true)}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {t("adm.markDone", { n: ids.length })}
          </Btn>
          <Btn
            tone="danger"
            small
            busy={busy}
            disabled={ids.length === 0}
            onClick={() => void apply(false)}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("adm.markNotDone", { n: ids.length })}
          </Btn>
        </span>
      </div>
    </div>
  );
}

export function UserDetail({
  id,
  myRole,
  onBack,
  onDeleted,
}: {
  id: string;
  myRole: Role;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const f = useFormat();
  const acc = useAccount();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Ban form
  const [reason, setReason] = useState("");
  const [days, setDays] = useState<number>(7);
  const [customDays, setCustomDays] = useState("");
  const [deletePosts, setDeletePosts] = useState(false);
  // XP form
  const [xpMode, setXpMode] = useState<"add" | "set">("add");
  const [xpAmount, setXpAmount] = useState("100");
  const [xpBoards, setXpBoards] = useState(true);
  // Rename
  const [newName, setNewName] = useState("");

  useEffect(() => {
    let alive = true;
    setUser(null);
    setLoadError(null);
    setFlash(null);
    setCode(null);
    adminUser({ data: { id } })
      .then((r) => {
        if (!alive) return;
        if (r.ok) {
          setUser(r.user);
          setNewName(r.user.name);
        } else setLoadError(t(r.error === "not_found" ? "adm.userGone" : accountErrorKey(r.error)));
      })
      .catch(() => alive && setLoadError(t("acc.err.server_error")));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const progress = useMemo(
    () =>
      user
        ? { ...EMPTY_PROGRESS, quiz: user.quiz, homework: user.homework, stars: user.stars }
        : EMPTY_PROGRESS,
    [user],
  );

  async function act(key: string, action: AdminAction, ok: string): Promise<boolean> {
    setBusy(key);
    setFlash(null);
    const r = await adminAct({ data: { id, action } }).catch(() => null);
    setBusy(null);
    if (!r?.ok) {
      setFlash({ kind: "error", text: t(accountErrorKey(r ? r.error : "server_error")) });
      return false;
    }
    if (!r.user) {
      onDeleted();
      return true;
    }
    setUser(r.user);
    if (r.code) setCode(r.code);
    setFlash({
      kind: "ok",
      text: r.removed !== undefined ? `${ok} ${t("adm.removedPosts", { n: r.removed })}` : ok,
    });
    // Editing yourself: the nav and XP chip show the new numbers.
    if (acc.user?.id === id) {
      acc.updateUser({
        ...acc.user,
        name: r.user.name,
        xp: r.user.xp,
        avatar: r.user.avatar,
        banner: r.user.banner,
      });
    }
    return true;
  }

  if (loadError) {
    return (
      <div className="space-y-3">
        <Btn onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("adm.backToUsers")}
        </Btn>
        <Notice kind="error">{loadError}</Notice>
      </div>
    );
  }
  if (!user) {
    return <div className="ep-card h-64 animate-pulse" aria-busy="true" />;
  }

  const lvl = levelFor(user.xp, lang);
  const isMe = acc.user?.id === user.id;
  const isOwner = user.role === "owner";
  const canBan = !isOwner && !isMe;
  const canDelete = !isOwner && !isMe;
  const ownerView = myRole === "owner";

  function submitBan(e: FormEvent) {
    e.preventDefault();
    const d = days === -1 ? Math.max(1, Math.floor(Number(customDays) || 0)) : days;
    void act("ban", { kind: "ban", reason, days: d, deletePosts }, t("adm.didBan")).then(
      (ok) => ok && setReason(""),
    );
  }

  function submitXp(e: FormEvent) {
    e.preventDefault();
    const amount = Math.round(Number(xpAmount));
    if (!Number.isFinite(amount)) return;
    void act("xp", { kind: "xp", mode: xpMode, amount, boards: xpBoards }, t("adm.didXp"));
  }

  return (
    <div className="space-y-4">
      <Btn onClick={onBack}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("adm.backToUsers")}
      </Btn>

      <section className="ep-card overflow-hidden">
        <div className="relative h-24 sm:h-32">
          {user.banner > 0 ? (
            <img
              src={imageUrl(user.id, "banner", user.banner)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(120deg,var(--brand-soft),transparent_60%)]" />
          )}
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
          <div className="-mt-10 shrink-0 rounded-full border-4 border-surface bg-surface">
            <Avatar id={user.id} name={user.name} avatar={user.avatar} size={80} round />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-ink">{user.name}</h2>
              <RoleBadge role={user.role} />
              {user.ban && (
                <Pill tone="bad">
                  <Ban className="h-3 w-3" aria-hidden="true" /> {t("adm.banned")}
                </Pill>
              )}
              {isMe && <Pill tone="info">{t("adm.you")}</Pill>}
            </div>
            <p className="font-mono text-[11px] text-ink-3">{user.id}</p>
          </div>
          <Link
            to="/u/$name"
            params={{ name: user.name }}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink-2 hover:border-brand-line hover:text-ink sm:self-end"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> {t("adm.openProfile")}
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-2 border-t border-line p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="XP">{f.num(user.xp)}</Stat>
          <Stat label={t("adm.level")}>
            {lvl.level} · {lvl.title}
          </Stat>
          <Stat label={t("adm.streak")}>{t("ch.days", { n: user.streak })}</Stat>
          <Stat label={t("adm.league")}>
            <span className="inline-flex items-center gap-1.5">
              <LeagueBadge tier={user.league} lang={lang} size={18} /> {f.num(user.weekXp)} XP
            </span>
          </Stat>
          <Stat label={t("adm.joined")}>{f.date(user.createdAt)}</Stat>
          <Stat label={t("adm.lastActive")}>{user.lastDay ? f.day(user.lastDay) : "—"}</Stat>
          <Stat label={t("adm.sessions")}>{f.num(user.sessions)}</Stat>
          <Stat label={t("adm.followers")}>
            {f.num(user.followers)} / {f.num(user.following)}
          </Stat>
          <Stat label={t("adm.forumPosts")}>{f.num(user.forumPosts)}</Stat>
          <Stat label={t("prof.homework")}>{f.num(user.homework.length)}</Stat>
          <Stat label={t("prof.challenges")}>
            {user.challenges.length}/{CHALLENGES.length}
          </Stat>
          <Stat label={t("adm.quizzes")}>{f.num(user.quiz.length)}</Stat>
        </dl>
      </section>

      {flash && <Notice kind={flash.kind}>{flash.text}</Notice>}
      {code && (
        <div className="ep-card space-y-2 border-amber-400/40 p-4">
          <p className="text-[13px] text-ink-2">{t("adm.newCodeNote", { name: user.name })}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-surface-2 px-3 py-2 font-mono text-[15px] font-semibold tracking-wider text-ink">
              {code}
            </code>
            <Btn
              small
              onClick={() =>
                void navigator.clipboard?.writeText(code).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                })
              }
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {t(copied ? "acc.codeCopied" : "adm.copy")}
            </Btn>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------------------------------------------------------------- ban */}
        <Panel title={t("adm.banTitle")} icon={<Ban className="h-4 w-4 text-[var(--bad-ink)]" />}>
          {user.ban ? (
            <div className="space-y-3">
              <div className="space-y-1 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-[13px]">
                <p className="text-ink">
                  <b>{t("adm.banReason")}:</b> {user.ban.reason || "—"}
                </p>
                <p className="text-ink-2">
                  {user.ban.until
                    ? t("adm.banUntil", { date: f.dateTime(user.ban.until) })
                    : t("adm.banForever")}
                </p>
                <p className="text-ink-3">
                  {t("adm.banBy", { name: user.ban.by, date: f.dateTime(user.ban.at) })}
                </p>
              </div>
              <Btn
                tone="primary"
                busy={busy === "unban"}
                onClick={() => void act("unban", { kind: "unban" }, t("adm.didUnban"))}
              >
                {t("adm.unban")}
              </Btn>
            </div>
          ) : canBan ? (
            <form onSubmit={submitBan} className="space-y-3">
              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-ink-2">{t("adm.banReason")}</span>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={300}
                  placeholder={t("adm.banReasonHint")}
                  className={INPUT}
                />
              </label>
              <div className="space-y-1">
                <span className="text-[12px] font-medium text-ink-2">{t("adm.banLength")}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Segmented
                    label={t("adm.banLength")}
                    value={String(days)}
                    onChange={(v) => setDays(Number(v))}
                    options={[
                      ...BAN_DAYS.map((d) => ({
                        value: String(d),
                        label:
                          d === 0
                            ? t("adm.forever")
                            : d === 1
                              ? t("adm.oneDay")
                              : t("adm.nDays", { n: d }),
                      })),
                      { value: "-1", label: t("adm.custom") },
                    ]}
                  />
                  {days === -1 && (
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      placeholder={t("adm.daysPlaceholder")}
                      className={`${INPUT} w-28`}
                      aria-label={t("adm.daysPlaceholder")}
                    />
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-ink-2">
                <input
                  type="checkbox"
                  checked={deletePosts}
                  onChange={(e) => setDeletePosts(e.target.checked)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                {t("adm.banDeletePosts")}
              </label>
              <Btn type="submit" tone="danger" busy={busy === "ban"}>
                <Ban className="h-3.5 w-3.5" aria-hidden="true" /> {t("adm.ban")}
              </Btn>
            </form>
          ) : (
            <p className="text-[13px] text-ink-3">
              {t(isMe ? "adm.cantBanSelf" : "adm.cantBanOwner")}
            </p>
          )}
        </Panel>

        {/* ---------------------------------------------------------------- XP */}
        <Panel title={t("adm.xpTitle")} icon={<Sparkles className="h-4 w-4 text-brand" />}>
          <form onSubmit={submitXp} className="space-y-3">
            <Segmented
              label={t("adm.xpTitle")}
              value={xpMode}
              onChange={setXpMode}
              options={[
                { value: "add", label: t("adm.xpAdd") },
                { value: "set", label: t("adm.xpSet") },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                value={xpAmount}
                onChange={(e) => setXpAmount(e.target.value)}
                className={`${INPUT} w-36`}
                aria-label={t("adm.xpAmount")}
                min={xpMode === "set" ? 0 : -10_000_000}
                max={10_000_000}
                required
              />
              {xpMode === "add" &&
                [50, 100, 500, 1000, -100].map((v) => (
                  <Btn key={v} small onClick={() => setXpAmount(String(v))}>
                    {v > 0 ? `+${v}` : v}
                  </Btn>
                ))}
            </div>
            <label className="flex items-start gap-2 text-[12px] text-ink-2">
              <input
                type="checkbox"
                checked={xpBoards}
                onChange={(e) => setXpBoards(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              {t("adm.xpBoards")}
            </label>
            <p className="text-[12px] text-ink-3">
              {t("adm.xpPreview", {
                from: f.num(user.xp),
                to: f.num(
                  Math.max(
                    0,
                    xpMode === "add"
                      ? user.xp + (Math.round(Number(xpAmount)) || 0)
                      : Math.round(Number(xpAmount)) || 0,
                  ),
                ),
              })}
            </p>
            <Btn type="submit" tone="primary" busy={busy === "xp"}>
              {t("adm.apply")}
            </Btn>
          </form>
        </Panel>
      </div>

      {/* ---------------------------------------------------------------- lessons */}
      <Panel title={t("adm.lessonsTitle")} icon={<BookOpen className="h-4 w-4 text-brand" />}>
        <p className="text-[12px] text-ink-3">{t("adm.lessonsNote")}</p>
        <ProgressEditor
          doneLabel={t("adm.completed")}
          busy={busy === "lessons"}
          rows={LESSONS.map((l, i) => ({
            id: l.id,
            label: `${i + 1}. ${lessonTitle(l, lang)}`,
            group: chapterName(l.chapter, lang),
            done: lessonComplete(progress, l),
            note:
              user.stars[l.id] !== undefined ? (
                <span className="text-[11px] text-ink-3" title={t("adm.practiceStars")}>
                  {"★".repeat(user.stars[l.id])}
                  {"☆".repeat(Math.max(0, 3 - user.stars[l.id]))}
                </span>
              ) : undefined,
          }))}
          onApply={(ids, done, xp) =>
            act(
              "lessons",
              { kind: "lessons", ids, done, xp },
              t(done ? "adm.didLessons" : "adm.didUnlessons"),
            )
          }
        />
      </Panel>

      {/* ---------------------------------------------------------------- challenges */}
      <Panel title={t("adm.challengesTitle")} icon={<Swords className="h-4 w-4 text-brand" />}>
        <ProgressEditor
          doneLabel={t("adm.completed")}
          busy={busy === "challenges"}
          rows={CHALLENGES.map((c) => ({
            id: c.id,
            label: c.title[lang],
            done: user.challenges.includes(c.id),
            note: (
              <span className="text-[11px] text-ink-3">
                {t(`ch.${c.difficulty}`)} · {CHALLENGE_XP[c.difficulty]} XP
              </span>
            ),
          }))}
          onApply={(ids, done, xp) =>
            act(
              "challenges",
              { kind: "challenges", ids, done, xp },
              t(done ? "adm.didLessons" : "adm.didUnlessons"),
            )
          }
        />
      </Panel>

      {/* ---------------------------------------------------------------- account */}
      <Panel title={t("adm.accountTitle")} icon={<UserCog className="h-4 w-4 text-brand" />}>
        {!isOwner && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act("rename", { kind: "rename", name: newName }, t("adm.didRename"));
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="block min-w-48 flex-1 space-y-1">
              <span className="text-[12px] font-medium text-ink-2">{t("adm.rename")}</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={20}
                pattern="[A-Za-z0-9_]{3,20}"
                className={INPUT}
              />
            </label>
            <Btn type="submit" busy={busy === "rename"} disabled={newName.trim() === user.name}>
              {t("img.save")}
            </Btn>
          </form>
        )}
        <div className="flex flex-wrap gap-2">
          <Btn
            busy={busy === "recovery"}
            onClick={() => void act("recovery", { kind: "recovery" }, t("adm.didRecovery"))}
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> {t("adm.newCode")}
          </Btn>
          <Btn
            busy={busy === "logout"}
            onClick={() => void act("logout", { kind: "logout" }, t("adm.didLogout"))}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> {t("adm.logoutAll")}
          </Btn>
          {user.avatar > 0 && (
            <Btn
              busy={busy === "avatar"}
              onClick={() =>
                void act("avatar", { kind: "removeImage", image: "avatar" }, t("adm.didImage"))
              }
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("img.removePhoto")}
            </Btn>
          )}
          {user.banner > 0 && (
            <Btn
              busy={busy === "banner"}
              onClick={() =>
                void act("banner", { kind: "removeImage", image: "banner" }, t("adm.didImage"))
              }
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("img.removeBanner")}
            </Btn>
          )}
          {user.forumPosts > 0 && (
            <Btn
              tone="danger"
              busy={busy === "posts"}
              onClick={() =>
                window.confirm(t("adm.confirmPosts", { n: user.forumPosts, name: user.name })) &&
                void act("posts", { kind: "deletePosts" }, t("adm.didPosts"))
              }
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("adm.deletePosts")}
            </Btn>
          )}
          <Btn
            tone="danger"
            busy={busy === "reset"}
            onClick={() =>
              window.confirm(t("adm.confirmReset", { name: user.name })) &&
              void act("reset", { kind: "resetProgress" }, t("adm.didReset"))
            }
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> {t("adm.resetProgress")}
          </Btn>
        </div>
        {ownerView && !isOwner && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <ShieldCheck className="h-4 w-4 text-[var(--info-ink)]" aria-hidden="true" />
            <span className="text-[13px] text-ink-2">
              {user.role === "admin" ? t("adm.isAdmin") : t("adm.notAdmin")}
            </span>
            <Btn
              small
              tone={user.role === "admin" ? "danger" : "primary"}
              busy={busy === "role"}
              onClick={() =>
                void act(
                  "role",
                  { kind: "role", admin: user.role !== "admin" },
                  t(user.role === "admin" ? "adm.didDemote" : "adm.didPromote"),
                )
              }
            >
              {t(user.role === "admin" ? "adm.removeAdmin" : "adm.makeAdmin")}
            </Btn>
          </div>
        )}
        {canDelete && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="flex-1 text-[12px] text-ink-3">{t("adm.deleteNote")}</span>
            <Btn
              tone="danger"
              busy={busy === "delete"}
              onClick={() => {
                const typed = window.prompt(t("adm.confirmDelete", { name: user.name }));
                if (typed?.trim().toLowerCase() === user.name.toLowerCase()) {
                  void act("delete", { kind: "delete" }, t("adm.didDelete"));
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("adm.deleteAccount")}
            </Btn>
          </div>
        )}
      </Panel>
    </div>
  );
}
