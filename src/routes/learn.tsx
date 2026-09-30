import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Brain, Clock, PenLine, Play } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { HomeworkPanel } from "@/components/learn/HomeworkPanel";
import { LessonBody } from "@/components/learn/LessonNotes";
import { LessonIcon } from "@/components/learn/duo/LessonIcon";
import { LessonSession } from "@/components/learn/duo/LessonSession";
import { Bubble, Mascot } from "@/components/learn/duo/Mascot";
import { PathMap } from "@/components/learn/duo/PathMap";
import { LESSONS, type Lesson } from "@/lib/learn/lessons";
import { lessonTitle, localizeLesson } from "@/lib/learn/lessons.tr";
import { exerciseFor } from "@/lib/learn/homework/exercises";
import { localizeExercise } from "@/lib/learn/homework/exercises.tr";
import { PATH, choice, t as text, type ChoiceStep } from "@/lib/learn/path";
import { lessonItems, practiceXp, reviewItems } from "@/lib/learn/path/session";
import {
  doneLessonIds,
  gainXp,
  homeworkXp,
  lessonComplete,
  lessonUnlocked,
  starsFor,
  streakOf,
  todayXp,
  type Progress,
} from "@/lib/learn/progress";
import { useProgressState, type ProgressUpdate } from "@/lib/learn/useProgress";
import { useLang, useT, type TFunction } from "@/lib/prefs";

type LearnSearch = { lesson?: string; view?: "notes"; review?: boolean };

export const Route = createFileRoute("/learn")({
  validateSearch: (search: Record<string, unknown>): LearnSearch => ({
    lesson: typeof search.lesson === "string" ? search.lesson : undefined,
    view: search.view === "notes" ? "notes" : undefined,
    review: search.review === true || search.review === "1" || search.review === 1 || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Learn Roblox Scripting from Zero — Vyce LuaUtility" },
      {
        name: "description",
        content:
          "A free, bite-sized Roblox Studio scripting course: short lessons, quick exercises, streaks and XP, and homework that runs your code in a simulated Roblox server.",
      },
    ],
  }),
  component: LearnPage,
});

type Update = ProgressUpdate;

/** The lesson's graded quick check, as a bilingual choice step. */
function quizStep(lesson: Lesson): ChoiceStep | undefined {
  const en = lesson.quiz;
  const tr = localizeLesson(lesson, "tr").quiz;
  if (!en || !tr) return undefined;
  return choice(
    text(en.question, tr.question),
    en.options.map((o, i) => (o === tr.options[i] ? o : text(o, tr.options[i]))),
    en.answer,
    text(en.why, tr.why),
  );
}

function LearnPage() {
  const t = useT();
  const lang = useLang();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/learn" });
  const { progress, loaded, update } = useProgressState();

  const toPath = () => navigate({ search: {} });
  const go = (id: string, view?: "notes") => navigate({ search: { lesson: id, view } });

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Mascot mood="think" size={96} title={t("duo.loading")} />
      </div>
    );
  }

  const reviewIds = doneLessonIds(progress);
  if (search.review && reviewIds.length > 0) {
    const ids = reviewIds;
    return (
      <LessonSession
        mode="review"
        title={t("duo.review")}
        icon={<Brain className="h-5 w-5" aria-hidden="true" />}
        build={(seed) => reviewItems(ids, seed)}
        xp={progress.xp}
        todayXp={todayXp(progress)}
        dailyGoal={progress.dailyGoal}
        streak={streakOf(progress.days)}
        onPracticeDone={({ mistakes }) =>
          update((p) => gainXp(p, practiceXp({ review: true, firstTime: false, mistakes })))
        }
        onExit={toPath}
      />
    );
  }

  const index = LESSONS.findIndex((l) => l.id === search.lesson);
  if (index >= 0) {
    const base = LESSONS[index];
    if (!lessonUnlocked(progress, index)) {
      return <LockedLesson base={base} progress={progress} t={t} onGo={(id) => go(id)} />;
    }
    if (search.view === "notes") {
      return <NotesPage base={base} onStart={() => go(base.id)} onBack={toPath} />;
    }
    return (
      <LessonRunner
        key={base.id}
        base={base}
        index={index}
        progress={progress}
        update={update}
        onExit={toPath}
        onGo={(id) => go(id)}
      />
    );
  }

  return (
    <PageShell>
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
        {t("duo.intro")}
      </PageHeader>
      <div className="relative z-10">
        <PathMap
          progress={progress}
          lang={lang}
          t={t}
          actions={{
            start: (id) => go(id),
            notes: (id) => go(id, "notes"),
            review: () => navigate({ search: { review: true } }),
            setGoal: (xp) => update((p) => ({ ...p, dailyGoal: xp }), false),
          }}
        />
      </div>
    </PageShell>
  );
}

function LessonRunner({
  base,
  index,
  progress,
  update,
  onExit,
  onGo,
}: {
  base: Lesson;
  index: number;
  progress: Progress;
  update: Update;
  onExit: () => void;
  onGo: (id: string) => void;
}) {
  const t = useT();
  const lang = useLang();
  const id = base.id;
  const lesson = useMemo(() => localizeLesson(base, lang), [base, lang]);
  const baseExercise = exerciseFor(id);
  const exercise = useMemo(
    () => (baseExercise ? localizeExercise(baseExercise, lang) : undefined),
    [baseExercise, lang],
  );
  const hwDone = progress.homework.includes(id);
  // Decided once when the session starts.
  const [plan] = useState(() => ({
    homework: Boolean(baseExercise) && !hwDone,
    homeworkOnly:
      Boolean(baseExercise) && !hwDone && progress.quiz.includes(id) && id in progress.stars,
  }));
  const quiz = useMemo(() => quizStep(base), [base]);
  const build = useCallback(
    (seed: number) => lessonItems({ lessonId: id, quiz, seed, ...plan }),
    [id, quiz, plan],
  );
  const path = PATH[id];
  const next = LESSONS[index + 1];

  function onQuiz(correct: boolean) {
    update((p) => {
      if (p.quiz.includes(id)) return p;
      if (!correct)
        return { ...p, quizMisses: { ...p.quizMisses, [id]: (p.quizMisses[id] ?? 0) + 1 } };
      return gainXp({ ...p, quiz: [...p.quiz, id] }, (p.quizMisses[id] ?? 0) === 0 ? 20 : 10);
    });
  }

  function onPracticeDone({ mistakes }: { mistakes: number }) {
    update((p) => {
      const firstTime = !(id in p.stars);
      const stars = Math.max(p.stars[id] ?? 0, starsFor(mistakes));
      return gainXp(
        { ...p, stars: { ...p.stars, [id]: stars } },
        practiceXp({ firstTime, mistakes }),
      );
    });
  }

  function onHomework(passed: boolean) {
    update((p) => {
      const n = { ...p, attempts: { ...p.attempts, [id]: (p.attempts[id] ?? 0) + 1 } };
      if (!passed || p.homework.includes(id)) return n;
      return gainXp({ ...n, homework: [...n.homework, id] }, homeworkXp(p, id));
    });
  }

  return (
    <LessonSession
      mode="lesson"
      title={lesson.title}
      icon={<LessonIcon id={id} className="h-5 w-5" />}
      build={build}
      takeaway={path?.takeaway[lang]}
      xp={progress.xp}
      todayXp={todayXp(progress)}
      dailyGoal={progress.dailyGoal}
      streak={streakOf(progress.days)}
      onQuiz={onQuiz}
      onPracticeDone={onPracticeDone}
      homeworkPassed={hwDone}
      homework={
        exercise && (
          <HomeworkPanel
            exercise={exercise}
            code={progress.code[id] ?? exercise.starter}
            onCode={(code) => update((p) => ({ ...p, code: { ...p.code, [id]: code } }), false)}
            passed={hwDone}
            attempts={progress.attempts[id] ?? 0}
            hintsUsed={progress.hints[id] ?? 0}
            onChecked={onHomework}
            onHint={() =>
              update((p) => ({
                ...p,
                hints: {
                  ...p.hints,
                  [id]: Math.min(exercise.hints.length, (p.hints[id] ?? 0) + 1),
                },
              }))
            }
            onSolution={() =>
              update((p) =>
                p.solutions.includes(id) ? p : { ...p, solutions: [...p.solutions, id] },
              )
            }
          />
        )
      }
      notes={<LessonBody lesson={lesson} t={t} />}
      onExit={onExit}
      next={
        next && lessonComplete(progress, base)
          ? { label: lessonTitle(next, lang), go: () => onGo(next.id) }
          : undefined
      }
    />
  );
}

function NotesPage({
  base,
  onStart,
  onBack,
}: {
  base: Lesson;
  onStart: () => void;
  onBack: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const lesson = useMemo(() => localizeLesson(base, lang), [base, lang]);
  const path = PATH[base.id];
  const exercise = exerciseFor(base.id);
  return (
    <PageShell>
      <div className="relative z-10 mx-auto max-w-3xl space-y-10 py-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("duo.backToPath")}
        </button>
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-3">
            <span className="rounded-full border border-brand-line bg-brand-soft px-2.5 py-0.5 font-medium text-brand">
              {lesson.chapter}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {t("learn.minutes", { n: lesson.minutes })}
            </span>
            {exercise && (
              <span className="inline-flex items-center gap-1">
                <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                {t("learn.hasHw")}
              </span>
            )}
          </div>
          <h1 className="text-[32px] leading-tight font-semibold tracking-tight text-ink md:text-[40px]">
            <span className="mr-3 inline-flex h-12 w-12 translate-y-[-4px] items-center justify-center rounded-2xl bg-brand-soft align-middle text-brand">
              <LessonIcon id={base.id} className="h-7 w-7" />
            </span>
            {lesson.title}
          </h1>
          <p className="text-lg text-ink-2">{lesson.summary}</p>
          {path && (
            <div className="flex items-center gap-3">
              <Mascot mood="happy" size={64} />
              <Bubble className="font-semibold">{path.takeaway[lang]}</Bubble>
            </div>
          )}
        </header>
        <article className="ep-card space-y-10 p-5 md:p-10">
          <LessonBody lesson={lesson} t={t} />
        </article>
        <div className="sticky bottom-4 z-20 flex justify-center">
          <button type="button" className="vy-btn vy-btn-ok shadow-xl" onClick={onStart}>
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            {t("duo.startLesson")}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function LockedLesson({
  base,
  progress,
  t,
  onGo,
}: {
  base: Lesson;
  progress: Progress;
  t: TFunction;
  onGo: (id: string) => void;
}) {
  const lang = useLang();
  const first = LESSONS.find((l) => !lessonComplete(progress, l)) ?? LESSONS[0];
  return (
    <PageShell>
      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-5 py-20 text-center">
        <Mascot mood="sleepy" size={120} />
        <h1 className="text-2xl font-bold text-ink">
          {t("learn.lockedTitle", { title: lessonTitle(base, lang) })}
        </h1>
        <p className="text-sm text-ink-2">
          {t("learn.lockedBody", { title: lessonTitle(first, lang) })}
        </p>
        <button type="button" className="vy-btn" onClick={() => onGo(first.id)}>
          {t("learn.goTo", { title: lessonTitle(first, lang) })}
        </button>
      </div>
    </PageShell>
  );
}
