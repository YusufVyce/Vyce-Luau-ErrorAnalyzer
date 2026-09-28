import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  Award,
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
import { SiteNav } from "@/components/SiteNav";
import { CodeBlock } from "@/components/CodeBlock";
import { Visual } from "@/components/learn/Visuals";
import { HomeworkPanel } from "@/components/learn/HomeworkPanel";
import { PageHeader } from "@/components/PageHeader";
import { analyzerLink, CHAPTERS, LESSONS, type Lesson } from "@/lib/learn/lessons";
import { exerciseFor } from "@/lib/learn/homework/exercises";
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
    <p className="text-[15px] leading-relaxed text-zinc-300">
      {text.split(/(`[^`]+`)/g).map((p, i) =>
        p.startsWith("`") && p.endsWith("`") && p.length > 2 ? (
          <code
            key={i}
            className="rounded bg-zinc-800/80 px-1 py-0.5 font-mono text-[0.85em] text-emerald-200"
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

function Quiz({
  quiz,
  lessonId,
  solved,
  onAnswer,
}: {
  quiz: NonNullable<Lesson["quiz"]>;
  lessonId: string;
  solved: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(solved ? quiz.answer : null);
  useEffect(() => setPicked(solved ? quiz.answer : null), [lessonId, solved, quiz.answer]);
  const correct = picked === quiz.answer;
  return (
    <section
      className="space-y-3 rounded-xl border border-violet-500/25 bg-violet-500/[0.05] p-5"
      aria-label="Quick check"
    >
      <div className="flex items-center justify-between text-[15px] font-bold text-violet-300">
        Quick check
        {solved && (
          <span className="inline-flex items-center gap-1 normal-case tracking-normal text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> answered
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
              key={option}
              type="button"
              onClick={() => {
                if (correct) return;
                setPicked(i);
                onAnswer(i === quiz.answer);
              }}
              className={`rounded-lg border px-3 py-2 text-left font-mono text-sm transition-colors ${
                state === "right"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                  : state === "wrong"
                    ? "border-red-500/50 bg-red-500/10 text-red-200"
                    : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-violet-500/40"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className={`text-sm ${correct ? "text-emerald-300" : "text-red-300"}`}>
          {correct ? "Correct! " : "Not quite — try another answer. "}
          {correct && <span className="text-zinc-300">{quiz.why}</span>}
        </p>
      )}
    </section>
  );
}

function LessonBody({ lesson }: { lesson: Lesson }) {
  return (
    <>
      {lesson.sections.map((section, i) => (
        <section key={i} className="space-y-4">
          {section.heading && (
            <h2 className="text-xl font-semibold text-zinc-100">{section.heading}</h2>
          )}
          {section.text?.map((t, j) => (
            <Paragraph key={j} text={t} />
          ))}
          {section.visual && <Visual id={section.visual.id} caption={section.visual.caption} />}
          {section.list && (
            <ul className="space-y-2">
              {section.list.map((item, j) => (
                <li key={j} className="flex gap-2.5 text-[15px] leading-relaxed text-zinc-300">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {section.code && (
            <div className="space-y-1.5">
              {section.code.where && (
                <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span className="font-mono">{section.code.where}</span>
                </div>
              )}
              <CodeBlock code={section.code.code} title={section.code.title ?? "Luau"} />
            </div>
          )}
          {section.tip && (
            <div className="flex gap-3 rounded-lg border border-sky-500/25 bg-sky-500/[0.06] p-3.5 text-sm text-sky-100">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
              <span className="leading-relaxed">{section.tip}</span>
            </div>
          )}
        </section>
      ))}

      {lesson.game && (
        <section className="space-y-2 rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-5">
          <div className="flex items-center gap-2 text-[15px] font-bold text-amber-300">
            <Gamepad2 className="h-4 w-4" aria-hidden="true" /> In real games: {lesson.game.name}
          </div>
          <Paragraph text={lesson.game.text} />
        </section>
      )}

      {lesson.tryIt && (
        <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="flex items-center gap-2 text-[15px] font-bold text-emerald-300">
            <ListChecks className="h-4 w-4" aria-hidden="true" /> Try it in Studio
          </div>
          <ol className="space-y-2">
            {lesson.tryIt.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-zinc-300">
                <span className="shrink-0 whitespace-nowrap pt-0.5 font-mono text-xs text-emerald-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {lesson.mistake && (
        <section className="space-y-3 rounded-xl border border-red-500/25 bg-red-500/[0.04] p-5">
          <div className="flex items-center gap-2 text-[15px] font-bold text-red-300">
            <AlertOctagon className="h-4 w-4" aria-hidden="true" /> Common mistake
          </div>
          <CodeBlock code={lesson.mistake.code} title="This code…" tone="bad" copyable={false} />
          <div className="code-dark rounded-lg border-2 border-[#1c1a16] bg-[#1e1e1e] px-3 py-2 font-mono text-[13px] text-red-400">
            {lesson.mistake.error}
          </div>
          <p className="text-sm text-zinc-300">{lesson.mistake.explain}</p>
          <a
            href={analyzerLink(lesson.mistake.error, lesson.mistake.code)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20"
          >
            Open this error in the analyzer →
          </a>
        </section>
      )}
    </>
  );
}

function LearnPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/learn" });
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("ep-body");
    setProgress(loadProgress());
    setLoaded(true);
    return () => document.body.classList.remove("ep-body");
  }, []);

  const requested = LESSONS.findIndex((l) => l.id === search.lesson);
  const firstOpen = LESSONS.findIndex((l) => !lessonComplete(progress, l));
  const index =
    requested >= 0 ? requested : Math.max(0, firstOpen === -1 ? LESSONS.length - 1 : firstOpen);
  const lesson = LESSONS[index];
  const unlocked = lessonUnlocked(progress, index);
  const complete = lessonComplete(progress, lesson);
  const exercise = exerciseFor(lesson.id);
  const prev = LESSONS[index - 1];
  const next = LESSONS[index + 1];
  const doneCount = LESSONS.filter((l) => lessonComplete(progress, l)).length;
  const percent = Math.round((doneCount / LESSONS.length) * 100);
  const lvl = levelFor(progress.xp);
  const allDone = doneCount === LESSONS.length;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMenuOpen(false);
  }, [lesson.id]);

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
    if (!correct) {
      update((p) => ({
        ...p,
        quizMisses: { ...p.quizMisses, [lesson.id]: (p.quizMisses[lesson.id] ?? 0) + 1 },
      }));
      return;
    }
    if (progress.quiz.includes(lesson.id)) return;
    const gain = (progress.quizMisses[lesson.id] ?? 0) === 0 ? 20 : 10;
    update((p) => ({ ...p, quiz: [...p.quiz, lesson.id], xp: p.xp + gain }));
    toast(`+${gain} XP — quiz`);
  }

  function onHomework(passed: boolean) {
    update((p) => ({
      ...p,
      attempts: { ...p.attempts, [lesson.id]: (p.attempts[lesson.id] ?? 0) + 1 },
    }));
    if (passed && !progress.homework.includes(lesson.id)) {
      const gain = homeworkXp(progress, lesson.id);
      update((p) => ({ ...p, homework: [...p.homework, lesson.id], xp: p.xp + gain }));
      toast(`+${gain} XP — homework passed!`);
    }
  }

  const needs: string[] = [];
  if (lesson.quiz && !progress.quiz.includes(lesson.id)) needs.push("answer the quick check");
  if (exercise && !progress.homework.includes(lesson.id)) needs.push("pass the homework");

  const sidebar = (
    <nav aria-label="Lessons" className="space-y-5">
      <div className="space-y-3 rounded-xl border-2 border-[#1c1a16] bg-white p-3 shadow-[3px_3px_0_#1c1a16]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-zinc-500">Level {lvl.level}</div>
            <div className="text-sm font-semibold text-zinc-100">{lvl.title}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-bold text-emerald-300">{progress.xp}</div>
            <div className="text-[11px] font-medium text-zinc-500">XP</div>
          </div>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full border-2 border-[#1c1a16] bg-white"
          role="progressbar"
          aria-valuenow={Math.round(lvl.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Level progress"
        >
          <div className="h-full bg-[#2fb45a]" style={{ width: `${lvl.progress * 100}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {doneCount}/{LESSONS.length} lessons
          </span>
          <span className="font-semibold text-emerald-300">{percent}%</span>
        </div>
      </div>
      {byChapter.map(({ chapter, lessons }) => (
        <div key={chapter} className="space-y-1">
          <div className="px-2 text-[15px] font-bold text-zinc-500">{chapter}</div>
          {lessons.map(({ l, i }) => {
            const active = l.id === lesson.id;
            const done = lessonComplete(progress, l);
            const open = lessonUnlocked(progress, i);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => go(l.id)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                  active
                    ? "bg-[#ffd23f] font-semibold text-[#1c1a16]"
                    : open
                      ? "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                      : "text-zinc-600"
                }`}
              >
                {done ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-400"
                    aria-label="completed"
                  />
                ) : open ? (
                  <Circle className="h-4 w-4 shrink-0 text-zinc-700" aria-hidden="true" />
                ) : (
                  <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-700" aria-label="locked" />
                )}
                <span className="truncate">{l.title}</span>
                {exerciseFor(l.id) && (
                  <PenLine
                    className={`ml-auto h-3.5 w-3.5 shrink-0 ${progress.homework.includes(l.id) ? "text-emerald-600" : "text-zinc-600"}`}
                    aria-label={
                      progress.homework.includes(l.id) ? "homework passed" : "has homework"
                    }
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
    <>
      <SiteNav />
      {xpToast && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border-2 border-[#1c1a16] bg-[#ffd23f] px-4 py-2 text-sm font-bold text-[#1c1a16] shadow-[3px_3px_0_#1c1a16]"
        >
          <Star className="mr-1.5 inline h-4 w-4 fill-current" aria-hidden="true" />
          {xpToast}
        </div>
      )}
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-16">
        <PageHeader
          sticker={<>Free course · {LESSONS.length} lessons</>}
          title={
            <>
              Learn Roblox scripting <span className="ep-mark">from zero</span>
            </>
          }
        >
          Every lesson ends with homework: you write real Luau, it runs in a simulated Roblox server
          right here, and you only move on when it works.
        </PageHeader>
        <ol className="relative z-10 mb-8 grid gap-2 text-sm sm:grid-cols-4">
          {[
            ["Read", "a short lesson with pictures"],
            ["Answer", "one quick question"],
            ["Write code", "for the homework"],
            ["Pass", "→ the next lesson unlocks"],
          ].map(([a, b], i) => (
            <li
              key={a}
              className="flex items-center gap-3 rounded-lg border-2 border-[#1c1a16]/15 bg-white px-3 py-2"
            >
              <span className="ep-step shrink-0">{i + 1}</span>
              <span>
                <b className="font-semibold text-zinc-100">{a}</b>{" "}
                <span className="text-zinc-400">{b}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="relative z-10 mb-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="w-full rounded-lg border-2 border-[#1c1a16] bg-white px-4 py-2.5 text-left text-sm font-medium text-zinc-100"
          >
            {menuOpen
              ? "Hide lessons"
              : `Lesson ${index + 1} of ${LESSONS.length} · ${lesson.title} · ${progress.xp} XP`}{" "}
            ▾
          </button>
          {menuOpen && (
            <div className="mt-2 rounded-xl border-2 border-[#1c1a16] bg-[#fffdf8] p-3">
              {sidebar}
            </div>
          )}
        </div>

        <div className="relative z-10 grid gap-8 lg:grid-cols-[270px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto pr-2">
              {sidebar}
            </div>
          </aside>

          <main className="ep-card min-w-0 p-5 md:p-8">
            {loaded && !unlocked ? (
              <div className="space-y-5 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900">
                  <Lock className="h-6 w-6 text-zinc-400" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-bold text-zinc-100">{lesson.title} is locked</h1>
                <p className="mx-auto max-w-md text-sm text-zinc-400">
                  Each lesson builds on the one before. Finish{" "}
                  <span className="text-zinc-200">{firstLocked.title}</span> (quiz + homework) to
                  unlock the next one.
                </p>
                <button
                  type="button"
                  onClick={() => go(firstLocked.id)}
                  className="ep-cta rounded-lg px-4 py-2 text-xs font-semibold"
                >
                  Go to {firstLocked.title} →
                </button>
              </div>
            ) : (
              <article className="space-y-8">
                <header className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-emerald-300">
                      {lesson.chapter}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {lesson.minutes} min
                    </span>
                    {complete && (
                      <span className="inline-flex items-center gap-1 text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> completed
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold leading-tight text-zinc-50 md:text-4xl">
                    {lesson.title}
                  </h1>
                  <p className="text-base text-zinc-400">{lesson.summary}</p>
                  {exercise && (
                    <a
                      href="#homework"
                      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#1c1a16] bg-white px-3 py-1.5 text-sm font-medium text-zinc-100 shadow-[2px_2px_0_#1c1a16] hover:bg-[#ffd23f]"
                    >
                      <PenLine className="h-4 w-4" aria-hidden="true" />
                      {progress.homework.includes(lesson.id)
                        ? "Homework passed ✓"
                        : `Homework at the end: ${exercise.title}`}
                    </a>
                  )}
                </header>

                <LessonBody lesson={lesson} />

                {lesson.quiz && (
                  <Quiz
                    quiz={lesson.quiz}
                    lessonId={lesson.id}
                    solved={progress.quiz.includes(lesson.id)}
                    onAnswer={onQuiz}
                  />
                )}

                {exercise && (
                  <HomeworkPanel
                    exercise={exercise}
                    code={progress.code[lesson.id] ?? exercise.starter}
                    onCode={(code) =>
                      update((p) => ({ ...p, code: { ...p.code, [lesson.id]: code } }))
                    }
                    passed={progress.homework.includes(lesson.id)}
                    attempts={progress.attempts[lesson.id] ?? 0}
                    hintsUsed={progress.hints[lesson.id] ?? 0}
                    onChecked={onHomework}
                    onHint={() =>
                      update((p) => ({
                        ...p,
                        hints: {
                          ...p.hints,
                          [lesson.id]: Math.min(
                            exercise.hints.length,
                            (p.hints[lesson.id] ?? 0) + 1,
                          ),
                        },
                      }))
                    }
                    onSolution={() =>
                      update((p) =>
                        p.solutions.includes(lesson.id)
                          ? p
                          : { ...p, solutions: [...p.solutions, lesson.id] },
                      )
                    }
                  />
                )}

                {allDone && !next && (
                  <section className="space-y-3 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/15 via-emerald-500/10 to-transparent p-6 text-center">
                    <Award className="mx-auto h-10 w-10 text-amber-300" aria-hidden="true" />
                    <h2 className="text-2xl font-bold text-zinc-50">Course complete!</h2>
                    <p className="text-sm text-zinc-300">
                      You finished all {LESSONS.length} lessons with {progress.xp} XP — rank{" "}
                      <span className="font-semibold text-amber-200">{lvl.title}</span>. Now build
                      your own game in Studio, and when something breaks, the analyzer is one click
                      away.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link
                        to="/playground"
                        className="ep-cta rounded-lg px-4 py-2 text-xs font-semibold"
                      >
                        Open the Playground
                      </Link>
                      <Link
                        to="/"
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-200 hover:bg-zinc-900"
                      >
                        Error Analyzer
                      </Link>
                    </div>
                  </section>
                )}
              </article>
            )}

            {unlocked && (
              <footer className="mt-10 flex flex-col gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-zinc-500">
                  {complete ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Lesson complete
                    </span>
                  ) : (
                    <span>To unlock the next lesson: {needs.join(" and ")}.</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {prev && (
                    <button
                      type="button"
                      onClick={() => go(prev.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {prev.title}
                    </button>
                  )}
                  {next && (
                    <button
                      type="button"
                      onClick={() => go(next.id)}
                      disabled={!complete}
                      className="ep-cta inline-flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed"
                      title={complete ? "" : "Finish this lesson first"}
                    >
                      {complete ? null : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                      Next: {next.title} <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </footer>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
