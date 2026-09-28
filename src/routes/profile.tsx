import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Flame, Lock, RotateCcw, Upload, UserRound } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { ACHIEVEMENT_ICONS } from "@/components/ProgressBits";
import { CHALLENGES } from "@/lib/challenges/challenges";
import { ACHIEVEMENTS, earned } from "@/lib/learn/achievements";
import { drawCertificate, type CertificateData } from "@/lib/learn/certificate";
import { LESSONS } from "@/lib/learn/lessons";
import {
  clearProgress,
  EMPTY_PROGRESS,
  lessonComplete,
  levelFor,
  LEVELS,
  loadProgress,
  normalizeProgress,
  saveProgress,
  streakOf,
  today,
  type Progress,
} from "@/lib/learn/progress";
import { useLang, useT } from "@/lib/prefs";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Vyce LuaUtility" },
      {
        name: "description",
        content: "Your Roblox scripting progress: level, streak, achievements and certificate.",
      },
    ],
  }),
  component: ProfilePage,
});

const NAME_KEY = "vyce-cert-name";

function LevelRing({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" aria-hidden="true">
      <defs>
        <linearGradient id="lvl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--syn-purple)" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="url(#lvl)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, value))}
        className="transition-[stroke-dashoffset] duration-700"
      />
    </svg>
  );
}

/** GitHub-style grid of the last 18 weeks. */
function Heatmap({ days }: { days: string[] }) {
  const t = useT();
  const set = new Set(days);
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (17 * 7 + end.getDay()));
  const cells: Array<{ key: string; active: boolean; future: boolean }> = [];
  const d = new Date(start);
  while (cells.length < 18 * 7) {
    const key = today(d);
    cells.push({ key, active: set.has(key), future: d > end });
    d.setDate(d.getDate() + 1);
  }
  return (
    <div className="space-y-2">
      <div
        className="grid w-fit max-w-full auto-cols-[13px] grid-flow-col grid-rows-7 gap-[4px] overflow-x-auto"
        role="img"
        aria-label={t("prof.heatmap")}
      >
        {cells.map((c) => (
          <span
            key={c.key}
            title={c.key}
            className={`h-3 w-3 rounded-[3px] ${
              c.future
                ? "bg-transparent"
                : c.active
                  ? "bg-[linear-gradient(135deg,var(--brand),var(--syn-purple))] shadow-[0_0_8px_-2px_var(--brand)]"
                  : "bg-surface-2"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-ink-3">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-surface-2" /> {t("prof.inactive")}
        <span className="ml-2 h-2.5 w-2.5 rounded-[3px] bg-brand" /> {t("prof.active")}
      </div>
    </div>
  );
}

function ProfilePage() {
  const t = useT();
  const lang = useLang();
  const [p, setP] = useState<Progress>(EMPTY_PROGRESS);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setP(loadProgress());
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      // ignore
    }
    const on = (e: Event) => setP((e as CustomEvent<Progress>).detail);
    window.addEventListener("vyce-progress", on);
    return () => window.removeEventListener("vyce-progress", on);
  }, []);

  const lvl = levelFor(p.xp);
  const lessonsDone = LESSONS.filter((l) => lessonComplete(p, l)).length;
  const complete = lessonsDone === LESSONS.length;
  const got = earned(p);
  const streak = streakOf(p.days);
  const cert: CertificateData = useMemo(
    () => ({
      name,
      lessons: LESSONS.length,
      xp: p.xp,
      level: lvl.title,
      challenges: p.challenges.length,
      date: today(),
      lang,
    }),
    [name, p.xp, p.challenges.length, lvl.title, lang],
  );

  useEffect(() => {
    if (canvasRef.current) drawCertificate(canvasRef.current, cert);
    // Redraw once web fonts are ready so the canvas uses them.
    document.fonts?.ready.then(() => canvasRef.current && drawCertificate(canvasRef.current, cert));
  }, [cert]);

  function saveName(v: string) {
    setName(v);
    try {
      localStorage.setItem(NAME_KEY, v);
    } catch {
      // ignore
    }
  }

  function download() {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `vyce-certificate-${(name || "roblox").replace(/[^\w-]+/g, "_")}.png`;
    a.click();
  }

  function exportData() {
    const blob = new Blob(
      [JSON.stringify({ app: "vyce-luautility", version: 2, progress: p }, null, 2)],
      {
        type: "application/json",
      },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vyce-progress-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importData(file: File) {
    try {
      const raw = JSON.parse(await file.text());
      const next = normalizeProgress(raw?.progress ?? raw);
      if (!window.confirm(t("prof.importConfirm", { xp: next.xp }))) return;
      saveProgress(next);
      setP(next);
      setMsg(t("prof.imported"));
    } catch {
      setMsg(t("prof.importBad"));
    }
  }

  function reset() {
    if (!window.confirm(t("prof.resetConfirm"))) return;
    clearProgress();
    setP({ ...EMPTY_PROGRESS });
    setMsg(t("prof.resetDone"));
  }

  const stats: Array<[string, string]> = [
    [t("prof.lessons"), `${lessonsDone}/${LESSONS.length}`],
    [t("prof.homework"), String(p.homework.length)],
    [t("prof.challenges"), `${p.challenges.length}/${CHALLENGES.length}`],
    [t("prof.daysActive"), String(p.days.length)],
  ];

  return (
    <PageShell>
      <PageHeader
        sticker={
          <>
            <UserRound className="h-4 w-4 text-brand" aria-hidden="true" /> {t("prof.sticker")}
          </>
        }
        title={
          <>
            {t("prof.title1")} <span className="ep-mark">{t("prof.title2")}</span>
          </>
        }
      >
        {t("prof.lead")}
      </PageHeader>

      <div className="relative z-10 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className="ep-card ep-card-accent flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <div className="relative mx-auto shrink-0 sm:mx-0">
            <LevelRing value={lvl.progress} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-[11px] text-ink-3">LVL</span>
              <span className="font-mono text-4xl font-semibold text-ink">{lvl.level}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="text-2xl font-semibold tracking-tight text-ink">{lvl.title}</div>
              <div className="font-mono text-[13px] text-ink-3">
                {p.xp} XP
                {lvl.nextAt !== undefined && ` · ${t("prof.toNext", { n: lvl.nextAt - p.xp })}`}
              </div>
            </div>
            <ol className="flex flex-wrap gap-1.5">
              {LEVELS.map((l, i) => (
                <li
                  key={l.title}
                  className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${
                    i + 1 < lvl.level
                      ? "bg-brand-soft text-brand"
                      : i + 1 === lvl.level
                        ? "bg-[linear-gradient(135deg,var(--brand),var(--syn-purple))] text-white"
                        : "bg-surface-2 text-ink-3"
                  }`}
                >
                  {l.title}
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="ep-card flex flex-col justify-between gap-5 p-6">
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${streak > 0 ? "bg-orange-500/15 text-orange-400 shadow-[0_0_30px_-6px_rgba(251,146,60,0.6)]" : "bg-surface-2 text-ink-3"}`}
            >
              <Flame className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <div className="font-mono text-3xl font-semibold text-ink">
                {t("ch.days", { n: streak })}
              </div>
              <div className="text-[13px] text-ink-3">
                {t(streak > 0 ? "prof.streakOn" : "prof.streakOff")}
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {stats.map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line bg-surface-2/60 px-3 py-2">
                <dt className="text-[12px] text-ink-3">{k}</dt>
                <dd className="font-mono text-lg font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="relative z-10 mt-5 ep-card space-y-4 p-6">
        <div className="ep-label">
          <b>//</b> {t("prof.activity")}
        </div>
        <Heatmap days={p.days} />
      </section>

      <section className="relative z-10 mt-10 space-y-4">
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
            const [cur, goal] = a.progress(p);
            const done = cur >= goal;
            const Icon = ACHIEVEMENT_ICONS[a.icon];
            return (
              <li
                key={a.id}
                className={`ep-card flex flex-col gap-3 p-4 ${done ? "" : "opacity-70"}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      done
                        ? "bg-[linear-gradient(135deg,var(--brand),var(--syn-purple))] text-white shadow-[0_0_20px_-6px_var(--brand)]"
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
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand),var(--syn-purple))]"
                      style={{ width: `${Math.min(100, (cur / goal) * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-ink-3">
                    {cur}/{goal}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="relative z-10 mt-10 space-y-4">
        <div className="ep-label">
          <b>//</b> {t("prof.certificate")}
        </div>
        <div className="ep-card grid gap-6 p-6 lg:grid-cols-[1fr_280px]">
          <div className="relative overflow-hidden rounded-xl border border-line">
            <canvas
              ref={canvasRef}
              className={`block h-auto w-full ${complete ? "" : "blur-[6px]"}`}
            />
            {!complete && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/40 p-6 text-center">
                <Lock className="h-8 w-8 text-ink" aria-hidden="true" />
                <div className="font-semibold text-ink">
                  {t("prof.certLocked", { n: LESSONS.length - lessonsDone })}
                </div>
                <Link to="/learn" className="ep-cta rounded-xl px-4 py-2 text-sm font-semibold">
                  {t("learn.s1t")} →
                </Link>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium text-ink">{t("prof.certName")}</span>
              <input
                value={name}
                onChange={(e) => saveName(e.target.value.slice(0, 40))}
                placeholder="Builderman"
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-ink placeholder-zinc-500 focus:border-brand-line focus:outline-none"
              />
            </label>
            <button
              type="button"
              disabled={!complete}
              onClick={download}
              className="ep-cta inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> {t("prof.certDownload")}
            </button>
            <p className="text-[12px] leading-relaxed text-ink-3">{t("prof.certNote")}</p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mt-10 space-y-4">
        <div className="ep-label">
          <b>//</b> {t("prof.data")}
        </div>
        <div className="ep-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[13px] leading-relaxed text-ink-3">{t("prof.dataNote")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-ink-2 hover:border-brand-line hover:text-ink"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> {t("prof.export")}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-ink-2 hover:border-brand-line hover:text-ink"
            >
              <Upload className="h-4 w-4" aria-hidden="true" /> {t("prof.import")}
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/10"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> {t("prof.reset")}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importData(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        {msg && <p className="text-[13px] text-brand">{msg}</p>}
      </section>
    </PageShell>
  );
}
