import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Gamepad2,
  Lightbulb,
  ListChecks,
  MapPin,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { CodeBlock } from "@/components/CodeBlock";
import { Visual } from "@/components/learn/Visuals";
import { analyzerLink, CHAPTERS, LESSONS, type Lesson } from "@/lib/learn/lessons";

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
          "A free, beginner-friendly Roblox Studio scripting course: Luau basics, events, leaderstats, tweens, RemoteEvents and DataStores, with pictures and examples from popular Roblox games.",
      },
    ],
  }),
  component: LearnPage,
});

const STORAGE_KEY = "vyce-learn-progress-v1";

function readProgress(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeProgress(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Private mode / blocked storage: progress just won't persist.
  }
}

function Paragraph({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <p className="text-[15px] leading-relaxed text-zinc-300">
      {parts.map((p, i) =>
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

function Quiz({ quiz, lessonId }: { quiz: NonNullable<Lesson["quiz"]>; lessonId: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [lessonId]);
  const correct = picked === quiz.answer;
  return (
    <section
      className="rounded-xl border border-violet-500/25 bg-violet-500/[0.05] p-5 space-y-3"
      aria-label="Quick check"
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-violet-300">
        Quick check
      </div>
      <p className="font-medium text-zinc-100">{quiz.question}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {quiz.options.map((option, i) => {
          const state =
            picked === null
              ? "idle"
              : i === quiz.answer
                ? "right"
                : i === picked
                  ? "wrong"
                  : "idle";
          return (
            <button
              key={option}
              type="button"
              onClick={() => setPicked(i)}
              disabled={picked !== null && correct}
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
          {correct ? "Correct! " : "Not quite — try again. "}
          {correct && <span className="text-zinc-300">{quiz.why}</span>}
        </p>
      )}
    </section>
  );
}

function LessonView({ lesson }: { lesson: Lesson }) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-emerald-300">
            {lesson.chapter}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {lesson.minutes} min
          </span>
        </div>
        <h1 className="text-3xl font-bold leading-tight text-zinc-50 md:text-4xl">
          {lesson.title}
        </h1>
        <p className="text-base text-zinc-400">{lesson.summary}</p>
      </header>

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
        <section className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Gamepad2 className="h-4 w-4" aria-hidden="true" /> In real games: {lesson.game.name}
          </div>
          <Paragraph text={lesson.game.text} />
        </section>
      )}

      {lesson.tryIt && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <ListChecks className="h-4 w-4" aria-hidden="true" /> Try it in Studio
          </div>
          <ol className="space-y-2">
            {lesson.tryIt.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-zinc-300">
                <span className="shrink-0 whitespace-nowrap font-mono text-xs text-emerald-400 pt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {lesson.mistake && (
        <section className="rounded-xl border border-red-500/25 bg-red-500/[0.04] p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-300">
            <AlertOctagon className="h-4 w-4" aria-hidden="true" /> Common mistake
          </div>
          <CodeBlock code={lesson.mistake.code} title="This code…" tone="bad" copyable={false} />
          <div className="rounded-lg border border-red-500/20 bg-black/40 px-3 py-2 font-mono text-[13px] text-red-300">
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

      {lesson.quiz && <Quiz quiz={lesson.quiz} lessonId={lesson.id} />}
    </article>
  );
}

function LearnPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/learn" });
  const [done, setDone] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("ep-body");
    setDone(readProgress());
    return () => document.body.classList.remove("ep-body");
  }, []);

  const index = Math.max(
    0,
    LESSONS.findIndex((l) => l.id === search.lesson),
  );
  const lesson = LESSONS[index];
  const prev = LESSONS[index - 1];
  const next = LESSONS[index + 1];
  const progress = Math.round((done.length / LESSONS.length) * 100);
  const isDone = done.includes(lesson.id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMenuOpen(false);
  }, [lesson.id]);

  const byChapter = useMemo(
    () =>
      CHAPTERS.map((chapter) => ({
        chapter,
        lessons: LESSONS.filter((l) => l.chapter === chapter),
      })),
    [],
  );

  function go(id: string) {
    navigate({ search: { lesson: id } });
  }

  function toggleDone() {
    const updated = isDone ? done.filter((id) => id !== lesson.id) : [...done, lesson.id];
    setDone(updated);
    writeProgress(updated);
  }

  function completeAndNext() {
    if (!isDone) {
      const updated = [...done, lesson.id];
      setDone(updated);
      writeProgress(updated);
    }
    if (next) go(next.id);
  }

  const sidebar = (
    <nav aria-label="Lessons" className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Your progress</span>
          <span className="font-semibold text-emerald-300">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {byChapter.map(({ chapter, lessons }) => (
        <div key={chapter} className="space-y-1">
          <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {chapter}
          </div>
          {lessons.map((l) => {
            const active = l.id === lesson.id;
            const complete = done.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => go(l.id)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                  active
                    ? "bg-emerald-500/10 text-emerald-200"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                {complete ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-400"
                    aria-label="completed"
                  />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-zinc-700" aria-hidden="true" />
                )}
                <span className="truncate">{l.title}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <SiteNav />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="ep-aurora" aria-hidden="true" />

        <header className="relative z-10 py-10 text-center md:py-12 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
            <span className="ep-dot" /> Free course · {LESSONS.length} lessons
          </div>
          <h1 className="serif-title text-4xl leading-tight text-zinc-50 md:text-5xl">
            Learn Roblox scripting{" "}
            <span className="italic bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">
              from zero
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-zinc-400 md:text-base">
            Step by step, with pictures, copy-paste code and examples from the kind of games you
            already play — obbies, simulators, horror and roleplay.
          </p>
        </header>

        <div className="relative z-10 lg:hidden mb-4">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-left text-sm text-zinc-300"
          >
            {menuOpen
              ? "Hide lessons"
              : `Lesson ${index + 1} of ${LESSONS.length} · ${lesson.title}`}{" "}
            ▾
          </button>
          {menuOpen && (
            <div className="mt-2 rounded-xl border border-zinc-800 bg-[#0b0f13] p-3">{sidebar}</div>
          )}
        </div>

        <div className="relative z-10 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto pr-2">
              {sidebar}
            </div>
          </aside>

          <main className="ep-card min-w-0 p-5 md:p-8">
            <LessonView lesson={lesson} />

            <footer className="mt-10 flex flex-col gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={toggleDone}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-zinc-700 text-zinc-300 hover:border-emerald-500/40"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {isDone ? "Completed" : "Mark as done"}
              </button>
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
                {next ? (
                  <button
                    type="button"
                    onClick={completeAndNext}
                    className="ep-cta inline-flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-semibold"
                  >
                    Next: {next.title} <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <Link
                    to="/"
                    className="ep-cta inline-flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-semibold"
                  >
                    Go fix some errors →
                  </Link>
                )}
              </div>
            </footer>
          </main>
        </div>
      </div>
    </>
  );
}
