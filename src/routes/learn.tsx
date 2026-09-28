import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Gamepad2,
  Lightbulb,
  ListChecks,
  Lock,
  MapPin,
  PenLine,
  Star,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { CodeBlock } from "@/components/CodeBlock";
import { Visual } from "@/components/learn/Visuals";
import { HomeworkPanel } from "@/components/learn/HomeworkPanel";
import { PageHeader } from "@/components/PageHeader";
import { analyzerLink, CHAPTERS, LESSONS, type Lesson } from "@/lib/learn/lessons";
import { chapterName, lessonTitle, localizeLesson } from "@/lib/learn/lessons.tr";
import { exerciseFor } from "@/lib/learn/homework/exercises";
import { localizeExercise } from "@/lib/learn/homework/exercises.tr";
import {
  EMPTY_PROGRESS,
  homeworkXp,
  lessonComplete,
  lessonUnlocked,
  levelFor,
  loadProgress,
  saveProgress,
  type Progress,
} from "@/lib/learn/progress";
import { useLang, useT, type TFunction } from "@/lib/prefs";

type LearnSearch = { lesson?: string };

export const Route = createFileRoute("/learn")({
  validateSearch: (search: Record<string, unknown>): LearnSearch => ({
    lesson: typeof search.lesson === "string" ? search.lesson : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Learn Roblox Scripting from Zero — Vyce LuaUtility" },
      {
        name: "description",
        content:
          "A free Roblox Studio scripting course with homework that runs your code in a simulated Roblox server: Luau basics, events, leaderstats, tweens, RemoteEvents and DataStores.",
      },
    ],
  }),
  component: LearnPage,
});

function Paragraph({ text }: { text: string }) {
  return (
    <p className="text-[15px] leading-[1.75] text-zinc-300">
      {text.split(/(`[^`]+`)/g).map((p, i) =>
        p.startsWith("`") && p.endsWith("`") && p.length > 2 ? (
          <code
            key={i}
            className="rounded-md border border-line bg-surface-2 px-1 py-px font-mono text-[0.85em] text-brand-ink"
          >
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}

function Callout({
  tone,
  icon,
  title,
  children,
}: {
  tone: "brand" | "amber" | "red" | "neutral";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const style = {
    brand: "border-brand-line bg-brand-soft",
    amber: "border-amber-500/30 bg-amber-500/[0.06]",
    red: "border-red-500/30 bg-red-500/[0.05]",
    neutral: "border-line bg-surface-2",
  }[tone];
  const iconColor = {
    brand: "text-brand",
    amber: "text-amber-400",
    red: "text-red-400",
    neutral: "text-ink-2",
  }[tone];
  return (
    <section className={`space-y-3 rounded-2xl border p-5 ${style}`}>
      <div className="flex items-center gap-2 text-[15px] font-semibold text-zinc-100">
        <span className={iconColor}>{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function Quiz({
  quiz,
  lessonId,
  solved,
  onAnswer,
  t,
}: {
  quiz: NonNullable<Lesson["quiz"]>;
  lessonId: string;
  solved: boolean;
  onAnswer: (correct: boolean) => void;
  t: TFunction;
}) {
  const [picked, setPicked] = useState<number | null>(solved ? quiz.answer : null);
  useEffect(() => setPicked(solved ? quiz.answer : null), [lessonId, solved, quiz.answer]);
  const correct = picked === quiz.answer;
  return (
    <section
      className="space-y-4 rounded-2xl border border-line bg-surface-2 p-5"
      aria-label={t("learn.quiz")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-zinc-100">
          <span className="ep-step">?</span>
          {t("learn.quiz")}
        </div>
        {solved && (
          <span className="inline-flex items-center gap-1 text-[13px] text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {t("learn.answered")}
          </span>
        )}
      </div>
      <p className="font-medium text-zinc-100">{quiz.question}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {quiz.options.map((option, i) => {
          const state =
            picked === null
              ? "idle"
              : i === quiz.answer && correct
                ? "right"
                : i === picked
                  ? "wrong"
                  : "idle";
          return (
            <button
              key={`${i}-${option}`}
              type="button"
              onClick={() => {
                if (correct) return;
                setPicked(i);
                onAnswer(i === quiz.answer);
              }}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                state === "right"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                  : state === "wrong"
                    ? "border-red-500/50 bg-red-500/10 text-red-200"
                    : "border-line bg-surface text-zinc-300 hover:border-brand-line hover:bg-brand-soft"
              }`}
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 font-mono text-[12px] text-ink-3">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="font-mono text-[13px]">{option}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className={`text-sm ${correct ? "text-emerald-400" : "text-red-400"}`}>
          {t(correct ? "learn.correct" : "learn.wrong")}{" "}
          {correct && <span className="text-zinc-300">{quiz.why}</span>}
        </p>
      )}
    </section>
  );
}

function LessonBody({ lesson, t }: { lesson: Lesson; t: TFunction }) {
  return (
    <>
      {lesson.sections.map((section, i) => (
        <section key={i} className="space-y-4">
          {section.heading && (
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
              {section.heading}
            </h2>
          )}
          {section.text?.map((text, j) => (
            <Paragraph key={j} text={text} />
          ))}
          {section.visual && <Visual id={section.visual.id} caption={section.visual.caption} />}
          {section.list && (
            <ul className="space-y-2.5">
              {section.list.map((item, j) => (
                <li key={j} className="flex gap-3 text-[15px] leading-relaxed text-zinc-300">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {section.code && (
            <div className="space-y-2">
              {section.code.where && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1 text-[12px] text-ink-2">
                  <MapPin className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                  <span className="font-mono">{section.code.where}</span>
                </div>
              )}
              <CodeBlock code={section.code.code} title={section.code.title ?? "Luau"} />
            </div>
          )}
          {section.tip && (
            <div className="flex gap-3 rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-3.5 text-sm text-zinc-200">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
              <span className="leading-relaxed">{section.tip}</span>
            </div>
          )}
        </section>
      ))}

      {lesson.game && (
        <Callout
          tone="amber"
          icon={<Gamepad2 className="h-4 w-4" aria-hidden="true" />}
          title={t("learn.inGames", { name: lesson.game.name })}
        >
          <Paragraph text={lesson.game.text} />
        </Callout>
      )}

      {lesson.tryIt && (
        <Callout
          tone="neutral"
          icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
          title={t("learn.tryIt")}
        >
          <ol className="space-y-2.5">
            {lesson.tryIt.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-zinc-300">
                <span className="ep-step shrink-0">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </Callout>
      )}

      {lesson.mistake && (
        <Callout
          tone="red"
          icon={<AlertOctagon className="h-4 w-4" aria-hidden="true" />}
          title={t("learn.mistake")}
        >
          <CodeBlock
            code={lesson.mistake.code}
            title={t("learn.thisCode")}
            tone="bad"
            copyable={false}
          />
          <div className="code-dark rounded-xl border border-code-line bg-code px-3 py-2 font-mono text-[13px] text-red-400">
            {lesson.mistake.error}
          </div>
          <p className="text-sm text-zinc-300">{lesson.mistake.explain}</p>
          <a
            href={analyzerLink(lesson.mistake.error, lesson.mistake.code)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline"
          >
            {t("learn.openAnalyzer")}
          </a>
        </Callout>
      )}
    </>
  );
}

function LearnPage() {
  const t = useT();
  const lang = useLang();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/learn" });
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
    setLoaded(true);
  }, []);

  const requested = LESSONS.findIndex((l) => l.id === search.lesson);
  const firstOpen = LESSONS.findIndex((l) => !lessonComplete(progress, l));
  const index =
    requested >= 0 ? requested : Math.max(0, firstOpen === -1 ? LESSONS.length - 1 : firstOpen);
  const baseLesson = LESSONS[index];
  const lesson = useMemo(() => localizeLesson(baseLesson, lang), [baseLesson, lang]);
  const unlocked = lessonUnlocked(progress, index);
  const complete = lessonComplete(progress, baseLesson);
  const baseExercise = exerciseFor(baseLesson.id);
  const exercise = useMemo(
    () => (baseExercise ? localizeExercise(baseExercise, lang) : undefined),
    [baseExercise, lang],
  );
  const prev = LESSONS[index - 1];
  const next = LESSONS[index + 1];
  const doneCount = LESSONS.filter((l) => lessonComplete(progress, l)).length;
  const percent = Math.round((doneCount / LESSONS.length) * 100);
  const lvl = levelFor(progress.xp);
  const allDone = doneCount === LESSONS.length;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMenuOpen(false);
  }, [baseLesson.id]);

  const byChapter = useMemo(
    () =>
      CHAPTERS.map((chapter) => ({
        chapter,
        lessons: LESSONS.map((l, i) => ({ l, i })).filter(({ l }) => l.chapter === chapter),
      })),
    [],
  );

  function update(fn: (p: Progress) => Progress) {
    setProgress((p) => {
      const n = fn(p);
      saveProgress(n);
      return n;
    });
  }

  function toast(text: string) {
    setXpToast(text);
    setTimeout(() => setXpToast(null), 2600);
  }

  function go(id: string) {
    navigate({ search: { lesson: id } });
  }

  function onQuiz(correct: boolean) {
    const id = baseLesson.id;
    if (!correct) {
      update((p) => ({ ...p, quizMisses: { ...p.quizMisses, [id]: (p.quizMisses[id] ?? 0) + 1 } }));
      return;
    }
    if (progress.quiz.includes(id)) return;
    const gain = (progress.quizMisses[id] ?? 0) === 0 ? 20 : 10;
    update((p) => ({ ...p, quiz: [...p.quiz, id], xp: p.xp + gain }));
    toast(t("learn.xpQuiz", { n: gain }));
  }

  function onHomework(passed: boolean) {
    const id = baseLesson.id;
    update((p) => ({ ...p, attempts: { ...p.attempts, [id]: (p.attempts[id] ?? 0) + 1 } }));
    if (passed && !progress.homework.includes(id)) {
      const gain = homeworkXp(progress, id);
      update((p) => ({ ...p, homework: [...p.homework, id], xp: p.xp + gain }));
      toast(t("learn.xpHomework", { n: gain }));
    }
  }

  const needs: string[] = [];
  if (baseLesson.quiz && !progress.quiz.includes(baseLesson.id)) needs.push(t("learn.needQuiz"));
  if (exercise && !progress.homework.includes(baseLesson.id)) needs.push(t("learn.needHomework"));

  const sidebar = (
    <nav aria-label={t("learn.lessons")} className="space-y-6">
      <div className="ep-card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] text-ink-3">{t("learn.level", { n: lvl.level })}</div>
            <div className="font-semibold text-ink">{lvl.title}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-xl font-semibold text-brand">{progress.xp}</div>
            <div className="text-[12px] text-ink-3">XP</div>
          </div>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuenow={Math.round(lvl.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("learn.levelProgress")}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width]"
            style={{ width: `${lvl.progress * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[12px] text-ink-3">
          <span>{t("learn.lessonsDone", { n: doneCount, total: LESSONS.length })}</span>
          <span className="font-medium text-brand">{percent}%</span>
        </div>
      </div>
      {byChapter.map(({ chapter, lessons }) => (
        <div key={chapter} className="space-y-1">
          <div className="px-2 pb-1 text-[12px] font-medium text-ink-3">
            {chapterName(chapter, lang)}
          </div>
          {lessons.map(({ l, i }) => {
            const active = l.id === baseLesson.id;
            const done = lessonComplete(progress, l);
            const open = lessonUnlocked(progress, i);
            const hwDone = progress.homework.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => go(l.id)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[14px] transition-colors ${
                  active
                    ? "bg-brand-soft font-medium text-brand"
                    : open
                      ? "text-ink-2 hover:bg-surface-2 hover:text-ink"
                      : "text-ink-3/70"
                }`}
              >
                {done ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-500"
                    aria-label={t("learn.completed")}
                  />
                ) : open ? (
                  <Circle className="h-4 w-4 shrink-0 text-line-strong" aria-hidden="true" />
                ) : (
                  <Lock
                    className="h-3.5 w-3.5 shrink-0 text-ink-3/60"
                    aria-label={t("learn.locked")}
                  />
                )}
                <span className="truncate">{lessonTitle(l, lang)}</span>
                {exerciseFor(l.id) && (
                  <PenLine
                    className={`ml-auto h-3.5 w-3.5 shrink-0 ${hwDone ? "text-emerald-500" : "text-ink-3/60"}`}
                    aria-label={t(hwDone ? "learn.hwPassed" : "learn.hasHw")}
                  />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const firstLocked =
    LESSONS[
      Math.max(
        0,
        LESSONS.findIndex((l) => !lessonComplete(progress, l)),
      )
    ];

  return (
    <PageShell>
      {xpToast && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-lg"
        >
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
          {xpToast}
        </div>
      )}

      <PageHeader
        sticker={
          <>
            <BookOpen className="h-4 w-4 text-brand" aria-hidden="true" />
            {t("learn.sticker", { n: LESSONS.length })}
          </>
        }
        title={
          <>
            {t("learn.title1")} <span className="ep-mark">{t("learn.title2")}</span>
          </>
        }
      >
        {t("learn.lead")}
      </PageHeader>
      <ol className="relative z-10 mb-8 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
        {(
          [
            ["learn.s1t", "learn.s1"],
            ["learn.s2t", "learn.s2"],
            ["learn.s3t", "learn.s3"],
            ["learn.s4t", "learn.s4"],
          ] as const
        ).map(([a, b], i) => (
          <li key={a} className="ep-card flex items-start gap-3 px-3 py-3 sm:px-4">
            <span className="ep-step mt-0.5 shrink-0">{i + 1}</span>
            <span>
              <span className="block font-semibold text-ink">{t(a)}</span>
              <span className="text-[13px] text-ink-3">{t(b)}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="relative z-10 mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-medium text-ink shadow-sm"
        >
          <span className="truncate">
            {menuOpen
              ? t("learn.hideLessons")
              : t("learn.lessonOf", { n: index + 1, total: LESSONS.length, title: lesson.title })}
          </span>
          <span className="ml-3 shrink-0 font-mono text-[12px] text-brand">{progress.xp} XP</span>
        </button>
        {menuOpen && <div className="ep-card mt-2 p-3">{sidebar}</div>}
      </div>

      <div className="relative z-10 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 pb-4">
            {sidebar}
          </div>
        </aside>

        <main className="ep-card min-w-0 p-5 md:p-10">
          {loaded && !unlocked ? (
            <div className="space-y-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface-2">
                <Lock className="h-6 w-6 text-ink-3" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-semibold text-ink">
                {t("learn.lockedTitle", { title: lesson.title })}
              </h1>
              <p className="mx-auto max-w-md text-sm text-ink-2">
                {t("learn.lockedBody", { title: lessonTitle(firstLocked, lang) })}
              </p>
              <button
                type="button"
                onClick={() => go(firstLocked.id)}
                className="ep-cta rounded-xl px-4 py-2 text-sm font-semibold"
              >
                {t("learn.goTo", { title: lessonTitle(firstLocked, lang) })}
              </button>
            </div>
          ) : (
            <article className="mx-auto max-w-3xl space-y-10">
              <header className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-3">
                  <span className="rounded-full border border-brand-line bg-brand-soft px-2.5 py-0.5 font-medium text-brand">
                    {lesson.chapter}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                    {t("learn.minutes", { n: lesson.minutes })}
                  </span>
                  {complete && (
                    <span className="inline-flex items-center gap-1 text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                      {t("learn.completed")}
                    </span>
                  )}
                </div>
                <h1 className="text-[32px] leading-tight font-semibold tracking-tight text-ink md:text-[40px]">
                  {lesson.title}
                </h1>
                <p className="text-lg text-ink-2">{lesson.summary}</p>
                {exercise && (
                  <a
                    href="#homework"
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-line bg-brand-soft px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand hover:text-white"
                  >
                    <PenLine className="h-4 w-4" aria-hidden="true" />
                    {progress.homework.includes(baseLesson.id)
                      ? t("learn.hwDone")
                      : t("learn.hwAtEnd", { title: exercise.title })}
                  </a>
                )}
              </header>

              <LessonBody lesson={lesson} t={t} />

              {lesson.quiz && (
                <Quiz
                  quiz={lesson.quiz}
                  lessonId={lesson.id}
                  solved={progress.quiz.includes(baseLesson.id)}
                  onAnswer={onQuiz}
                  t={t}
                />
              )}

              {exercise && (
                <HomeworkPanel
                  exercise={exercise}
                  code={progress.code[baseLesson.id] ?? exercise.starter}
                  onCode={(code) =>
                    update((p) => ({ ...p, code: { ...p.code, [baseLesson.id]: code } }))
                  }
                  passed={progress.homework.includes(baseLesson.id)}
                  attempts={progress.attempts[baseLesson.id] ?? 0}
                  hintsUsed={progress.hints[baseLesson.id] ?? 0}
                  onChecked={onHomework}
                  onHint={() =>
                    update((p) => ({
                      ...p,
                      hints: {
                        ...p.hints,
                        [baseLesson.id]: Math.min(
                          exercise.hints.length,
                          (p.hints[baseLesson.id] ?? 0) + 1,
                        ),
                      },
                    }))
                  }
                  onSolution={() =>
                    update((p) =>
                      p.solutions.includes(baseLesson.id)
                        ? p
                        : { ...p, solutions: [...p.solutions, baseLesson.id] },
                    )
                  }
                />
              )}

              {allDone && !next && (
                <section className="space-y-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-6 text-center">
                  <Award className="mx-auto h-10 w-10 text-amber-400" aria-hidden="true" />
                  <h2 className="text-2xl font-semibold text-ink">{t("learn.doneTitle")}</h2>
                  <p className="text-sm text-ink-2">
                    {t("learn.doneBody", { n: LESSONS.length, xp: progress.xp, rank: lvl.title })}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link
                      to="/playground"
                      className="ep-cta rounded-xl px-4 py-2 text-sm font-semibold"
                    >
                      {t("learn.openPlayground")}
                    </Link>
                    <Link
                      to="/"
                      className="rounded-xl border border-line px-4 py-2 text-sm text-ink-2 hover:bg-surface-2"
                    >
                      {t("nav.analyzer")}
                    </Link>
                  </div>
                </section>
              )}
            </article>
          )}

          {unlocked && (
            <footer className="mx-auto mt-12 flex max-w-3xl flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[13px] text-ink-3">
                {complete ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />{" "}
                    {t("learn.lessonComplete")}
                  </span>
                ) : (
                  <span>{t("learn.toUnlock", { what: needs.join(t("learn.and")) })}</span>
                )}
              </div>
              <div className="flex gap-2">
                {prev && (
                  <button
                    type="button"
                    onClick={() => go(prev.id)}
                    className="inline-flex min-w-0 items-center gap-1 rounded-xl border border-line px-3 py-2 text-[13px] text-ink-2 hover:bg-surface-2"
                  >
                    <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{lessonTitle(prev, lang)}</span>
                  </button>
                )}
                {next && (
                  <button
                    type="button"
                    onClick={() => go(next.id)}
                    disabled={!complete}
                    className="ep-cta inline-flex min-w-0 items-center gap-1 rounded-xl px-4 py-2 text-[13px] font-semibold"
                    title={complete ? "" : t("learn.finishFirst")}
                  >
                    {complete ? null : <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                    <span className="truncate">
                      {t("learn.next", { title: lessonTitle(next, lang) })}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>
                )}
              </div>
            </footer>
          )}
        </main>
      </div>
    </PageShell>
  );
}
