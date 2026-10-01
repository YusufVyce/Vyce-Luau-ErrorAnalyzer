import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Award,
  Camera,
  Check,
  Copy,
  Flame,
  ImagePlus,
  Lock,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Avatar } from "@/components/account/Avatar";
import { FormError } from "@/components/account/fields";
import { ACHIEVEMENT_ICONS } from "@/components/ProgressBits";
import { LeagueBadge } from "@/components/account/LeagueBadge";
import { Heatmap, LevelRing } from "@/components/account/ProgressViews";
import { Mascot } from "@/components/learn/duo/Mascot";
import { followUser, getProfile, removeImage, unfollowUser, uploadImage } from "@/lib/account/api";
import { useAccount } from "@/lib/account/client";
import { resizeForUpload } from "@/lib/account/resizeImage";
import {
  accountErrorKey,
  imageUrl,
  type AccountError,
  type ImageKind,
  type PublicProfile,
  type PublicUser,
} from "@/lib/account/shared";
import { CHALLENGES } from "@/lib/challenges/challenges";
import { ACHIEVEMENTS } from "@/lib/learn/achievements";
import { LESSONS } from "@/lib/learn/lessons";
import { EMPTY_PROGRESS, lessonComplete, levelFor } from "@/lib/learn/progress";
import { useLang, useT } from "@/lib/prefs";

export const Route = createFileRoute("/u/$name")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.name} — Vyce LuaUtility` },
      {
        name: "description",
        content: `${params.name}'s Roblox scripting progress: level, streak, league and achievements.`,
      },
    ],
  }),
  component: PublicProfilePage,
});

/** Picks, resizes and uploads a profile photo or banner; removes one too. */
function useImageEditor(onUser: (u: PublicUser) => void) {
  const t = useT();
  const [busy, setBusy] = useState<ImageKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = {
    avatar: useRef<HTMLInputElement>(null),
    banner: useRef<HTMLInputElement>(null),
  };

  async function upload(kind: ImageKind, file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      setError(t("img.notImage"));
      return;
    }
    setBusy(kind);
    const data = await resizeForUpload(file, kind).catch(() => null);
    if (!data) {
      setBusy(null);
      setError(t("img.notImage"));
      return;
    }
    const r = await uploadImage({ data: { kind, data } }).catch(() => null);
    setBusy(null);
    if (r?.ok) onUser(r.user);
    else setError(t(accountErrorKey(r ? r.error : "server_error")));
  }

  async function remove(kind: ImageKind) {
    setError(null);
    setBusy(kind);
    const r = await removeImage({ data: { kind } }).catch(() => null);
    setBusy(null);
    if (r?.ok) onUser(r.user);
    else setError(t(accountErrorKey(r ? r.error : "server_error")));
  }

  /** The hidden file inputs; buttons open them with inputs[kind].current.click(). */
  const fileInputs = (["avatar", "banner"] as const).map((kind) => (
    <input
      key={kind}
      ref={inputs[kind]}
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      className="hidden"
      onChange={(e) => {
        void upload(kind, e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  ));

  return { busy, error, inputs, remove, fileInputs };
}

const OVERLAY_BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/55 px-2.5 py-1.5 text-[12px] font-medium text-white backdrop-blur transition-colors hover:bg-black/75 disabled:opacity-60";

function PublicProfilePage() {
  const t = useT();
  const lang = useLang();
  const { name } = Route.useParams();
  const acc = useAccount();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<AccountError | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const editor = useImageEditor((u) => {
    acc.updateUser(u);
    setProfile((p) => (p && p.id === u.id ? { ...p, avatar: u.avatar, banner: u.banner } : p));
  });

  useEffect(() => {
    let alive = true;
    // Signing in reloads the same profile: keep showing it meanwhile.
    setProfile((p) => (p && p.name.toLowerCase() === name.toLowerCase() ? p : null));
    setError(null);
    getProfile({ data: { name } })
      .then((r) => {
        if (!alive) return;
        if (r.ok) setProfile(r.profile);
        else setError(r.error);
      })
      .catch(() => alive && setError("server_error"));
    return () => {
      alive = false;
    };
    // Reload after signing in, so the follow button knows who is looking.
  }, [name, acc.user?.id]);

  async function toggleFollow() {
    if (!profile) return;
    setBusy(true);
    const r = profile.following
      ? await unfollowUser({ data: { id: profile.id } }).catch(() => null)
      : await followUser({ data: { name: profile.name } }).catch(() => null);
    setBusy(false);
    if (r?.ok) {
      setProfile({
        ...profile,
        following: !profile.following,
        followers: profile.followers + (profile.following ? -1 : 1),
      });
    }
  }

  if (error || !profile) {
    return (
      <PageShell>
        <div className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
          <Mascot mood={error ? "sad" : "think"} size={96} />
          {error && (
            <>
              <p className="text-ink-2">
                {error === "not_found" ? t("pr.notFound") : t(accountErrorKey(error))}
              </p>
              <Link to="/leaderboard" className="vy-btn">
                {t("nav.leaderboard")}
              </Link>
            </>
          )}
        </div>
      </PageShell>
    );
  }

  const p = {
    ...EMPTY_PROGRESS,
    xp: profile.xp,
    quiz: profile.quiz,
    homework: profile.homework,
    challenges: profile.challenges,
    stars: profile.stars,
    days: profile.days,
  };
  const lvl = levelFor(profile.xp, lang);
  const lessonsDone = LESSONS.filter((l) => lessonComplete(p, l)).length;
  const licensed = lessonsDone === LESSONS.length;
  const got = new Set(profile.achievements);
  const since = new Date(profile.createdAt).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "long",
  });
  const stats: Array<[string, string]> = [
    [t("prof.lessons"), `${lessonsDone}/${LESSONS.length}`],
    [t("prof.homework"), String(profile.homework.length)],
    [t("prof.challenges"), `${profile.challenges.length}/${CHALLENGES.length}`],
    [t("pr.weekXp"), `${profile.weekXp} XP`],
  ];

  return (
    <PageShell>
      <div className="relative z-10 space-y-5 pt-12 md:pt-16">
        <section className="ep-card ep-card-accent overflow-hidden">
          <div className="relative h-32 sm:h-44">
            {profile.banner > 0 ? (
              <img
                src={imageUrl(profile.id, "banner", profile.banner)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(120deg,var(--brand-soft),transparent_45%),radial-gradient(circle_at_85%_20%,color-mix(in_oklab,var(--syn-purple)_35%,transparent),transparent_55%)]" />
            )}
            {profile.isMe && (
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  type="button"
                  className={OVERLAY_BTN}
                  disabled={editor.busy !== null}
                  onClick={() => editor.inputs.banner.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {editor.busy === "banner" ? t("img.uploading") : t("img.changeBanner")}
                </button>
                {profile.banner > 0 && (
                  <button
                    type="button"
                    className={OVERLAY_BTN}
                    disabled={editor.busy !== null}
                    onClick={() => void editor.remove("banner")}
                    aria-label={t("img.removeBanner")}
                    title={t("img.removeBanner")}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-6 px-6 pb-6 sm:flex-row sm:items-end">
            <div className="relative mx-auto -mt-16 shrink-0 sm:mx-0">
              <div className="rounded-full bg-surface">
                <LevelRing value={lvl.progress} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar
                  id={profile.id}
                  name={profile.name}
                  avatar={profile.avatar}
                  size={92}
                  round
                />
              </div>
              {profile.isMe && (
                <div className="absolute right-0 bottom-1 flex gap-1">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-2 shadow-md transition-colors hover:border-brand-line hover:text-brand disabled:opacity-60"
                    disabled={editor.busy !== null}
                    onClick={() => editor.inputs.avatar.current?.click()}
                    aria-label={t("img.changePhoto")}
                    title={t("img.changePhoto")}
                  >
                    <Camera
                      className={`h-4 w-4 ${editor.busy === "avatar" ? "animate-pulse" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  {profile.avatar > 0 && (
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-3 shadow-md transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-60"
                      disabled={editor.busy !== null}
                      onClick={() => void editor.remove("avatar")}
                      aria-label={t("img.removePhoto")}
                      title={t("img.removePhoto")}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-ink">{profile.name}</h1>
                <p className="text-[13px] text-ink-3">
                  {t("acc.memberSince", { date: since })} ·{" "}
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("pr.followers", { n: profile.followers })}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-start">
                <span className="font-semibold text-ink">
                  {t("lb.level", { n: lvl.level })} · {lvl.title}
                </span>
                <span className="font-mono text-[13px] text-ink-2">{profile.xp} XP</span>
                <span className="inline-flex items-center gap-1 font-mono text-[13px] text-orange-400">
                  <Flame className="h-4 w-4" aria-hidden="true" />
                  {t("ch.days", { n: profile.streak })}
                </span>
                <LeagueBadge tier={profile.league} lang={lang} size={28} />
              </div>
              {licensed && (
                <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[13px] font-semibold text-amber-300">
                  <Award className="h-4 w-4" aria-hidden="true" /> {t("pr.licensed")}
                </p>
              )}
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:w-48">
              {profile.isMe ? (
                <Link
                  to="/profile"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-2 hover:border-brand-line hover:text-ink"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  {t("pr.isMe")}
                </Link>
              ) : acc.status === "user" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleFollow()}
                  className={
                    profile.following
                      ? "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink-2 hover:border-red-500/40 hover:text-red-400"
                      : "ep-cta inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                  }
                >
                  {profile.following ? (
                    <UserMinus className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                  )}
                  {t(profile.following ? "fr.remove" : "fr.add")}
                </button>
              ) : (
                <Link
                  to="/login"
                  search={{ next: "/leaderboard" }}
                  className="ep-cta rounded-xl px-4 py-2 text-center text-sm font-semibold"
                >
                  {t("pr.signinToFollow")}
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(window.location.href).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  });
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-ink-2 hover:border-brand-line hover:text-ink"
              >
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {t(copied ? "acc.codeCopied" : "pr.share")}
              </button>
            </div>
          </div>
          {profile.isMe && (
            <div className="space-y-2 border-t border-line px-6 py-3">
              {editor.fileInputs}
              <p className="text-[12px] text-ink-3">{t("img.hint")}</p>
              <FormError>{editor.error}</FormError>
            </div>
          )}
        </section>

        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(([k, v]) => (
            <div key={k} className="ep-card px-4 py-3">
              <dt className="text-[12px] text-ink-3">{k}</dt>
              <dd className="font-mono text-lg font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="ep-card space-y-4 p-6">
          <div className="ep-label">
            <b>//</b> {t("prof.activity")}
          </div>
          <Heatmap days={profile.days} />
        </section>

        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="ep-label">
              <b>//</b> {t("prof.achievements")}
            </div>
            <span className="font-mono text-[12px] text-ink-3">
              {got.size}/{ACHIEVEMENTS.length}
            </span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ACHIEVEMENTS.map((a) => {
              const done = got.has(a.id);
              const Icon = ACHIEVEMENT_ICONS[a.icon];
              return (
                <li
                  key={a.id}
                  className={`ep-card flex items-center gap-3 p-4 ${done ? "" : "opacity-50"}`}
                >
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      done
                        ? "bg-[linear-gradient(135deg,var(--brand),var(--syn-purple))] text-white"
                        : "bg-surface-2 text-ink-3"
                    }`}
                  >
                    {done ? (
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Lock className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{a.title[lang]}</div>
                    <div className="text-[12px] leading-snug text-ink-3">{a.desc[lang]}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
