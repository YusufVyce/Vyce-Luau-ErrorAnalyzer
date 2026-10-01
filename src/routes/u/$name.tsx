import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, Check, Copy, Flame, Lock, UserMinus, UserPlus, Users } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ACHIEVEMENT_ICONS } from "@/components/ProgressBits";
import { LeagueBadge } from "@/components/account/LeagueBadge";
import { Heatmap, LevelRing } from "@/components/account/ProgressViews";
import { Mascot } from "@/components/learn/duo/Mascot";
import { followUser, getProfile, unfollowUser } from "@/lib/account/api";
import { useAccount } from "@/lib/account/client";
import { accountErrorKey, type AccountError, type PublicProfile } from "@/lib/account/shared";
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

function PublicProfilePage() {
  const t = useT();
  const lang = useLang();
  const { name } = Route.useParams();
  const acc = useAccount();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<AccountError | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setProfile(null);
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
        <section className="ep-card ep-card-accent flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <div className="relative mx-auto shrink-0 sm:mx-0">
            <LevelRing value={lvl.progress} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand),var(--syn-purple))] font-mono text-2xl font-bold text-white">
                {profile.name[0]?.toUpperCase()}
              </span>
            </div>
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
              <Link to="/profile" className="vy-btn text-center">
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
