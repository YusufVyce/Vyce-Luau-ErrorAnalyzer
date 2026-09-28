import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  Brain,
  Check,
  Clock,
  Flame,
  Heart,
  Star,
  Target,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { AchievementToaster } from "@/components/ProgressBits";
import { motivate } from "@/lib/learn/motivation";
import {
  correctAnswerText,
  EMPTY_ANSWER,
  isCorrect,
  isReady,
  retryItem,
  type AnswerState,
  type SessionItem,
} from "@/lib/learn/path/session";
import { rng } from "@/lib/learn/path";
import { starsFor } from "@/lib/learn/progress";
import { play, setSoundOn, soundOn } from "@/lib/learn/sound";
import { useLang, useT } from "@/lib/prefs";
import { Confetti } from "./Confetti";
import { Bubble, Mascot } from "./Mascot";
import { ExerciseView, LearnCard, type Phase } from "./Steps";

const HEARTS = 5;

function useCountUp(target: number, ms = 1000) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Modal({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="vy-pop w-full max-w-sm space-y-5 rounded-3xl border-2 border-line bg-surface p-6 text-center shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  color,
  delay,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  color: string;
  delay: number;
}) {
  return (
    <div
      className="vy-rise overflow-hidden rounded-2xl border-2"
      style={{ borderColor: color, animationDelay: `${delay}ms` }}
    >
      <div
        className="px-2 py-1 text-center text-[11px] font-bold tracking-[0.12em] uppercase"
        style={{ background: color, color: "#0b1020" }}
      >
        {label}
      </div>
      <div
        className="flex items-center justify-center gap-1.5 bg-surface px-2 py-3 font-mono text-xl font-bold"
        style={{ color }}
      >
        {icon}
        {value}
      </div>
    </div>
  );
}

export interface LessonSessionProps {
  mode: "lesson" | "review";
  title: string;
  /** Lesson icon shown on the completion screen. */
  icon?: ReactNode;
  build: (seed: number) => SessionItem[];
  takeaway?: string;
  /** Current total XP, today's XP and the goal (the session shows what changed). */
  xp: number;
  todayXp: number;
  dailyGoal: number;
  streak: number;
  onQuiz?: (correct: boolean) => void;
  onPracticeDone: (r: { mistakes: number }) => void;
  homework?: ReactNode;
  homeworkPassed?: boolean;
  notes?: ReactNode;
  onExit: () => void;
  next?: { label: string; go: () => void };
}

export function LessonSession(props: LessonSessionProps) {
  const t = useT();
  const lang = useLang();
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [queue, setQueue] = useState<SessionItem[]>(() => props.build(seed));
  const [total, setTotal] = useState(queue.length);
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>("answer");
  const [answer, setAnswer] = useState<AnswerState>(EMPTY_ANSWER);
  const [hearts, setHearts] = useState(HEARTS);
  const [heartHit, setHeartHit] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [checks, setChecks] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboToast, setComboToast] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const [phrase, setPhrase] = useState("");
  const [finished, setFinished] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [sound, setSound] = useState(true);
  const [reported, setReported] = useState(false);
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const startXp = useRef(props.xp);
  const startToday = useRef(props.todayXp);
  const rand = useRef(rng(seed + 1));

  useEffect(() => {
    setSound(soundOn());
    document.body.classList.add("ep-body");
    return () => document.body.classList.remove("ep-body");
  }, []);

  const current = queue[pos];
  const exercise = current?.kind === "exercise" ? current : null;
  const hasPractice = queue.some((i) => i.kind !== "homework");

  function restart() {
    const s = seed + 7919;
    const items = props.build(s);
    setSeed(s);
    rand.current = rng(s + 1);
    setQueue(items);
    setTotal(items.length);
    setPos(0);
    setPhase("answer");
    setAnswer(EMPTY_ANSWER);
    setHearts(HEARTS);
    setMistakes(0);
    setChecks(0);
    setCombo(0);
    setDone(0);
    setOutOfHearts(false);
    setReported(false);
    startedAt.current = Date.now();
  }

  function report() {
    if (reported || !hasPractice) return;
    setReported(true);
    props.onPracticeDone({ mistakes });
  }

  function finish() {
    report();
    setElapsed(Date.now() - startedAt.current);
    setFinished(true);
    play("complete");
  }

  function advance() {
    const wasRight = !exercise || phase === "right";
    if (wasRight) setDone((d) => d + 1);
    if (phase === "wrong" && hearts <= 0) {
      setOutOfHearts(true);
      return;
    }
    const nextPos = pos + 1;
    setPhase("answer");
    setAnswer(EMPTY_ANSWER);
    if (nextPos >= queue.length) {
      finish();
      return;
    }
    if (queue[nextPos].kind === "homework") report();
    setPos(nextPos);
    window.scrollTo({ top: 0 });
  }

  function check() {
    if (!exercise || !isReady(exercise.step, answer)) return;
    const right = isCorrect(exercise.step, answer);
    setChecks((c) => c + 1);
    if (exercise.quiz) props.onQuiz?.(right);
    if (right) {
      const c = combo + 1;
      setCombo(c);
      setPhase("right");
      setPhrase(motivate("correct", lang));
      if (c >= 3 && (c === 3 || c % 5 === 0)) {
        play("combo");
        setComboToast(motivate("combo", lang, { n: c }));
        setTimeout(() => setComboToast(null), 1800);
      } else play("correct");
    } else {
      setCombo(0);
      setPhase("wrong");
      setMistakes((m) => m + 1);
      setHearts((h) => Math.max(0, h - 1));
      setHeartHit((n) => n + 1);
      setPhrase(motivate("wrong", lang));
      play("wrong");
      // Try it again later, but before the homework.
      const again = retryItem(exercise, rand.current);
      setQueue((q) => {
        const hw = q.findIndex((it, i) => i > pos && it.kind === "homework");
        return hw === -1 ? [...q, again] : [...q.slice(0, hw), again, ...q.slice(hw)];
      });
    }
  }

  const ready = exercise ? isReady(exercise.step, answer) : true;
  const primary = (): void => {
    if (!current || finished || outOfHearts || leaving) return;
    if (current.kind === "homework") {
      if (props.homeworkPassed) advance();
      return;
    }
    if (current.kind === "learn" || phase !== "answer") advance();
    else if (ready) check();
  };
  const primaryRef = useRef(primary);
  primaryRef.current = primary;
  const keyRef = useRef<(n: number) => void>(() => {});
  keyRef.current = (n: number) => {
    if (!exercise || phase !== "answer") return;
    const idx = exercise.perm[n - 1];
    if (idx === undefined) return;
    play("tap");
    if (exercise.step.kind === "order") {
      if (!answer.seq.includes(idx)) setAnswer({ ...answer, seq: [...answer.seq, idx] });
    } else setAnswer({ ...answer, pick: idx });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(TEXTAREA|INPUT|SELECT)$/.test(el.tagName))) return;
      // Dialogs and the homework editor keep their own Enter behaviour.
      if (el?.closest('[role="dialog"], [data-homework]')) return;
      if (e.key === "Enter") {
        e.preventDefault();
        primaryRef.current();
      } else if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        keyRef.current(Number(e.key));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function exit() {
    if (!finished && (done > 0 || pos > 0)) setLeaving(true);
    else props.onExit();
  }

  const percent = finished ? 100 : Math.round((done / Math.max(1, total)) * 100);

  if (finished) {
    return (
      <Complete
        {...props}
        mistakes={mistakes}
        checks={checks}
        elapsed={elapsed}
        xpGained={props.xp - startXp.current}
        goalReached={startToday.current < props.dailyGoal && props.todayXp >= props.dailyGoal}
        hadPractice={hasPractice}
      />
    );
  }

  const wide = current?.kind === "homework";
  const onAnswer = (a: AnswerState) => {
    play("tap");
    setAnswer(a);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AchievementToaster />
      <header className="sticky top-0 z-30 border-b border-line/60 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5 sm:gap-4">
          <button
            type="button"
            onClick={exit}
            aria-label={t("duo.exit")}
            className="rounded-xl p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="relative flex-1">
            <div
              className="vy-bar"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={props.title}
            >
              <div style={{ width: `${Math.max(percent, 3)}%` }} />
            </div>
            {comboToast && (
              <div
                role="status"
                className="vy-pop absolute -top-1 left-1/2 inline-flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full bg-[var(--gold)] px-3 py-1 text-[12px] font-extrabold whitespace-nowrap text-[#2a1b00] shadow-lg"
              >
                <Flame className="vy-flame h-3.5 w-3.5" aria-hidden="true" />
                {comboToast}
              </div>
            )}
          </div>
          <div
            hidden={!queue.some((i) => i.kind === "exercise")}
            className="inline-flex items-center gap-1 font-mono text-[15px] font-bold text-[#ff4b6e]"
            aria-label={t("duo.hearts", { n: hearts })}
            title={t("duo.hearts", { n: hearts })}
          >
            <Heart
              key={heartHit}
              className={`h-6 w-6 fill-[#ff4b6e] ${heartHit ? "vy-heart-lost" : ""}`}
              aria-hidden="true"
            />
            {hearts}
          </div>
          {props.notes && (
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              aria-label={t("duo.notes")}
              title={t("duo.notes")}
              className="rounded-xl p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSoundOn(!sound);
              setSound(!sound);
            }}
            aria-label={t(sound ? "duo.soundOn" : "duo.soundOff")}
            title={t(sound ? "duo.soundOn" : "duo.soundOff")}
            className="hidden rounded-xl p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink sm:block"
          >
            {sound ? (
              <Volume2 className="h-5 w-5" aria-hidden="true" />
            ) : (
              <VolumeX className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pt-8 pb-72">
        <div key={current?.id} className={`vy-rise mx-auto ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
          {current?.kind === "learn" && <LearnCard step={current.step} lang={lang} t={t} />}
          {current?.kind === "exercise" && (
            <ExerciseView
              step={current.step}
              perm={current.perm}
              answer={answer}
              onAnswer={onAnswer}
              phase={phase}
              quiz={current.quiz}
              lang={lang}
              t={t}
            />
          )}
          {current?.kind === "homework" && (
            <div className="space-y-6" data-homework>
              <div className="flex items-center gap-4">
                <Mascot mood={props.homeworkPassed ? "cheer" : "think"} size={84} />
                <div className="space-y-2">
                  <div className="text-[12px] font-bold tracking-[0.14em] text-[var(--syn-orange)] uppercase">
                    {t("duo.hwTitle")}
                  </div>
                  <Bubble>{motivate("homework", lang, {}, () => 0)}</Bubble>
                </div>
              </div>
              {props.homework}
            </div>
          )}
        </div>
      </main>

      <Footer
        t={t}
        current={current}
        phase={phase}
        ready={ready}
        phrase={phrase}
        hearts={hearts}
        combo={combo}
        homeworkPassed={Boolean(props.homeworkPassed)}
        correct={exercise ? correctAnswerText(exercise.step, lang) : ""}
        codeAnswer={exercise ? exercise.step.kind !== "choice" : false}
        explain={exercise ? exercise.step.explain[lang] : ""}
        onPrimary={primary}
      />

      {outOfHearts && (
        <Modal label={t("duo.outTitle")}>
          <Mascot mood="sad" size={110} className="mx-auto" />
          <div className="flex justify-center gap-1" aria-hidden="true">
            {Array.from({ length: HEARTS }, (_, i) => (
              <Heart key={i} className="h-6 w-6 text-ink-3/50" />
            ))}
          </div>
          <h2 className="text-2xl font-extrabold text-ink">{t("duo.outTitle")}</h2>
          <p className="text-[15px] text-ink-2">{motivate("hearts", lang, {}, () => 0)}</p>
          <div className="grid gap-3">
            <button type="button" className="vy-btn vy-btn-ok w-full" onClick={restart}>
              {t("duo.retry")}
            </button>
            {props.notes && (
              <button
                type="button"
                className="vy-btn vy-btn-ghost w-full"
                onClick={() => {
                  restart();
                  setNotesOpen(true);
                }}
              >
                {t("duo.notes")}
              </button>
            )}
            <button
              type="button"
              className="text-sm font-bold tracking-wide text-ink-3 uppercase hover:text-ink"
              onClick={props.onExit}
            >
              {t("duo.quit")}
            </button>
          </div>
        </Modal>
      )}

      {leaving && (
        <Modal label={t("duo.leaveTitle")}>
          <Mascot mood="sad" size={100} className="mx-auto" />
          <h2 className="text-2xl font-extrabold text-ink">{t("duo.leaveTitle")}</h2>
          <p className="text-[15px] text-ink-2">{t("duo.leaveBody")}</p>
          <div className="grid gap-3">
            <button
              type="button"
              className="vy-btn w-full"
              onClick={() => setLeaving(false)}
              autoFocus
            >
              {t("duo.keepLearning")}
            </button>
            <button
              type="button"
              className="text-sm font-bold tracking-wide text-[var(--bad)] uppercase hover:underline"
              onClick={props.onExit}
            >
              {t("duo.endSession")}
            </button>
          </div>
        </Modal>
      )}

      {notesOpen && props.notes && (
        <div className="fixed inset-0 z-[55] flex justify-end bg-black/50 backdrop-blur-sm">
          <button
            type="button"
            className="flex-1 cursor-default"
            aria-label={t("duo.close")}
            onClick={() => setNotesOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t("duo.notesTitle")}
            className="vy-rise h-full w-full max-w-2xl overflow-y-auto border-l border-line bg-canvas p-5 md:p-8"
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-xl font-bold text-ink">
                <BookOpen className="h-5 w-5 text-brand" aria-hidden="true" />
                {t("duo.notesTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setNotesOpen(false)}
                className="rounded-xl p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
                aria-label={t("duo.close")}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-10">{props.notes}</div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Footer({
  t,
  current,
  phase,
  ready,
  phrase,
  hearts,
  combo,
  homeworkPassed,
  correct,
  codeAnswer,
  explain,
  onPrimary,
}: {
  t: ReturnType<typeof useT>;
  current: SessionItem | undefined;
  phase: Phase;
  ready: boolean;
  phrase: string;
  hearts: number;
  combo: number;
  homeworkPassed: boolean;
  correct: string;
  codeAnswer: boolean;
  explain: string;
  onPrimary: () => void;
}) {
  if (!current) return null;
  const tone =
    current.kind === "homework"
      ? homeworkPassed
        ? "ok"
        : "none"
      : current.kind === "exercise" && phase === "right"
        ? "ok"
        : current.kind === "exercise" && phase === "wrong"
          ? "bad"
          : "none";

  let button: ReactNode;
  if (current.kind === "homework") {
    button = (
      <button
        type="button"
        className="vy-btn vy-btn-ok w-full sm:w-auto sm:min-w-44"
        disabled={!homeworkPassed}
        onClick={onPrimary}
      >
        {t("duo.continue")}
      </button>
    );
  } else if (current.kind === "learn") {
    button = (
      <button type="button" className="vy-btn w-full sm:w-auto sm:min-w-44" onClick={onPrimary}>
        {t("duo.continue")}
      </button>
    );
  } else if (phase === "answer") {
    button = (
      <button
        type="button"
        className="vy-btn vy-btn-ok w-full sm:w-auto sm:min-w-44"
        disabled={!ready}
        onClick={onPrimary}
      >
        {t("duo.check")}
      </button>
    );
  } else {
    button = (
      <button
        type="button"
        className={`vy-btn w-full sm:w-auto sm:min-w-44 ${phase === "right" ? "vy-btn-ok" : "vy-btn-bad"}`}
        onClick={onPrimary}
        autoFocus
      >
        {phase === "right" ? t("duo.continue") : t("duo.gotIt")}
      </button>
    );
  }

  let message: ReactNode = null;
  if (current.kind === "homework") {
    message = homeworkPassed ? (
      <FeedbackHead ok text={t("duo.hwPassed")} />
    ) : (
      <p className="text-[14px] text-ink-3">{t("duo.hwNeedPass")}</p>
    );
  } else if (current.kind === "exercise" && phase === "right") {
    message = (
      <div className="space-y-1.5">
        <FeedbackHead ok text={phrase} />
        <p className="text-[14px] leading-relaxed text-ink-2">{explain}</p>
      </div>
    );
  } else if (current.kind === "exercise" && phase === "wrong") {
    message = (
      <div className="min-w-0 space-y-1.5">
        <FeedbackHead ok={false} text={phrase} />
        <div className="text-[14px] font-semibold text-ink">{t("duo.correctAnswer")}</div>
        {codeAnswer ? (
          <pre className="max-h-32 overflow-auto rounded-xl bg-canvas/60 px-3 py-2 font-mono text-[13px] whitespace-pre text-ink [tab-size:2]">
            {correct}
          </pre>
        ) : (
          <p className="text-[15px] text-ink">{correct}</p>
        )}
        <p className="text-[14px] leading-relaxed text-ink-2">{explain}</p>
        {hearts > 0 && <p className="text-[12px] text-ink-3">{t("duo.againLater")}</p>}
      </div>
    );
  } else if (current.kind === "exercise") {
    message = <p className="hidden text-[13px] text-ink-3 md:block">{t("duo.keys")}</p>;
  }

  return (
    <footer
      key={`${current.id}-${phase}-${homeworkPassed}`}
      data-tone={tone}
      className={`fixed inset-x-0 bottom-0 z-40 border-t-2 ${
        tone === "none" ? "border-line bg-canvas/95 backdrop-blur" : "vy-sheet"
      }`}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {tone !== "none" && (
            <Mascot
              mood={tone === "bad" ? "sad" : combo >= 3 ? "cheer" : "happy"}
              size={72}
              className="vy-pop hidden sm:block"
            />
          )}
          <div className="min-w-0 flex-1">{message}</div>
        </div>
        <div className="shrink-0">{button}</div>
      </div>
    </footer>
  );
}

function FeedbackHead({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`vy-pop inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          ok ? "bg-[var(--ok)] text-[var(--ok-ink)]" : "bg-[var(--bad)] text-[var(--bad-ink)]"
        }`}
      >
        {ok ? (
          <Check className="h-5 w-5" strokeWidth={3.5} aria-hidden="true" />
        ) : (
          <X className="h-5 w-5" strokeWidth={3.5} aria-hidden="true" />
        )}
      </span>
      <span className={`text-xl font-extrabold ${ok ? "vy-ok-text" : "vy-bad-text"}`}>{text}</span>
    </div>
  );
}

function Complete(
  props: LessonSessionProps & {
    mistakes: number;
    checks: number;
    elapsed: number;
    xpGained: number;
    goalReached: boolean;
    hadPractice: boolean;
  },
) {
  const t = useT();
  const lang = useLang();
  const xp = useCountUp(props.xpGained);
  const accuracy = props.checks
    ? Math.round(((props.checks - props.mistakes) / props.checks) * 100)
    : 100;
  const secs = Math.round(props.elapsed / 1000);
  const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  const stars = props.mode === "lesson" && props.hadPractice ? starsFor(props.mistakes) : 0;
  const [headline] = useState(() =>
    props.mode === "review"
      ? t("duo.reviewDone")
      : props.hadPractice && props.mistakes === 0
        ? motivate("perfect", lang)
        : motivate("complete", lang),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (props.next) props.next.go();
      else props.onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <div className="flex min-h-screen flex-col">
      <AchievementToaster />
      <Confetti />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-7 text-center">
          <Mascot
            mood={props.hadPractice && props.mistakes === 0 ? "love" : "cheer"}
            size={150}
            className="vy-pop mx-auto"
            title="Vy"
          />
          <div className="space-y-2">
            <h1 className="ep-mark text-[34px] leading-tight font-extrabold tracking-tight md:text-[40px]">
              {headline}
            </h1>
            <p className="inline-flex items-center gap-2 font-medium text-ink-2">
              {props.icon && (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  {props.icon}
                </span>
              )}
              {props.title}
            </p>
          </div>
          {stars > 0 && (
            <div
              className="flex items-end justify-center gap-3"
              aria-label={t("duo.stars", { n: stars })}
            >
              {[1, 2, 3].map((n) => (
                <Star
                  key={n}
                  className={`vy-star ${n === 2 ? "h-16 w-16" : "h-12 w-12"} ${
                    n <= stars ? "fill-[var(--gold)] text-[var(--gold-dark)]" : "text-line-strong"
                  }`}
                  style={{ animationDelay: `${300 + n * 180}ms` }}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              label={t("duo.totalXp")}
              value={String(xp)}
              icon={<Zap className="h-5 w-5 fill-current" aria-hidden="true" />}
              color="var(--gold)"
              delay={200}
            />
            <StatTile
              label={t("duo.accuracy")}
              value={`${accuracy}%`}
              icon={<Target className="h-5 w-5" aria-hidden="true" />}
              color="var(--ok)"
              delay={320}
            />
            <StatTile
              label={t("duo.time")}
              value={time}
              icon={<Clock className="h-5 w-5" aria-hidden="true" />}
              color="var(--syn-cyan)"
              delay={440}
            />
          </div>
          {props.takeaway && (
            <div
              className="vy-rise rounded-2xl border-2 border-brand-line bg-brand-soft p-4 text-left"
              style={{ animationDelay: "560ms" }}
            >
              <div className="mb-1.5 inline-flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-brand uppercase">
                <Brain className="h-4 w-4" aria-hidden="true" />
                {t("duo.remember")}
              </div>
              <p className="text-[16px] leading-relaxed font-semibold text-ink">{props.takeaway}</p>
            </div>
          )}
          <div className="space-y-1.5 text-[14px] font-semibold">
            {props.streak > 0 && (
              <p className="inline-flex items-center gap-1.5 text-[var(--syn-orange)]">
                <Flame className="vy-flame h-5 w-5 fill-current" aria-hidden="true" />
                {t("duo.streakMsg", { n: props.streak })}
              </p>
            )}
            {props.goalReached && (
              <p className="flex items-center justify-center gap-1.5 text-[var(--ok)]">
                <Target className="h-5 w-5" aria-hidden="true" />
                {t("duo.goalMsg")}
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <button type="button" className="vy-btn vy-btn-ghost" onClick={props.onExit}>
              {t("duo.backToPath")}
            </button>
            {props.next && (
              <button type="button" className="vy-btn vy-btn-ok" onClick={props.next.go} autoFocus>
                {t("duo.nextLesson")}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
