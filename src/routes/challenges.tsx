import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Flame,
  Search,
  Star,
  Swords,
  Trophy,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { HomeworkPanel } from "@/components/learn/HomeworkPanel";
import {
  CHALLENGE_XP,
  CHALLENGES,
  type Challenge,
  type Difficulty,
  type Tag,
} from "@/lib/challenges/challenges";
import { challengeExercise, examplesFor } from "@/lib/challenges/runner";
import { checkChallenge } from "@/lib/learn/homework/client";
import { challengeHintCost, challengeReward } from "@/lib/learn/rewards";
import { gainXp, streakOf, today, withToday, type Progress } from "@/lib/learn/progress";
import { RequireAccount } from "@/components/account/RequireAccount";
import { useAccount } from "@/lib/account/client";
import { useProgressState } from "@/lib/learn/useProgress";
import { useLang, useT } from "@/lib/prefs";
import type { UiKey } from "@/lib/i18n/ui";

type Search = { c?: string };

export const Route = createFileRoute("/challenges")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    c: typeof s.c === "string" ? s.c : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Luau Coding Challenges — Vyce LuaUtility" },
      {
        name: "description",
        content:
          "Practice Roblox Luau with graded coding challenges: strings, tables, game math and real Roblox scripts, tested offline in your browser.",
      },
    ],
  }),
  component: () => (
    <RequireAccount next="/challenges">
      <ChallengesPage />
    </RequireAccount>
  ),
});

const DIFF_STYLE: Record<Difficulty, string> = {
  easy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  hard: "border-red-500/30 bg-red-500/10 text-red-400",
};

const TAGS: Tag[] = [
  "algorithms",
  "basics",
  "math",
  "strings",
  "tables",
  "loops",
  "game",
  "roblox",
];

function Rich({ text }: { text: string }) {
  return (
    <>
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
    </>
  );
}

function DifficultyBadge({ d }: { d: Difficulty }) {
  const t = useT();
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${DIFF_STYLE[d]}`}>
      {t(`ch.${d}` as UiKey)}
    </span>
  );
}

function Examples({ ch }: { ch: Challenge }) {
  const t = useT();
  const examples = useMemo(() => (ch.kind === "function" ? examplesFor(ch) : []), [ch]);
  if (ch.kind !== "function") return null;
  const hidden = ch.tests.filter((x) => x.hidden).length;
  return (
    <div className="space-y-2 pt-2">
      <div className="ep-label">
        <b>//</b> {t("ch.examples")}
      </div>
      <div className="code-dark overflow-x-auto rounded-xl border border-code-line bg-code p-3 font-mono text-[12.5px] leading-[1.8]">
        {examples.map((e) => (
          <div key={e.call} className="whitespace-nowrap">
            <span className="text-[#82aaff]">{e.call}</span>
            <span className="text-zinc-500"> → </span>
            <span className="text-[#c3e88d]">{e.result}</span>
          </div>
        ))}
      </div>
      {hidden > 0 && <p className="text-[12px] text-ink-3">{t("ch.hidden", { n: hidden })}</p>}
    </div>
  );
}

function ChallengesPage() {
  const t = useT();
  const acc = useAccount();
  const lang = useLang();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/challenges" });
  const { progress, update: updateProgress } = useProgressState();
  const [query, setQuery] = useState("");
  const [diff, setDiff] = useState<Difficulty | "all">("all");
  const [tag, setTag] = useState<Tag | "all">("all");
  const [status, setStatus] = useState<"all" | "todo" | "done">("all");
  const [toast, setToast] = useState<string | null>(null);

  const update = (fn: (p: Progress) => Progress) => updateProgress(fn, false);

  const current = CHALLENGES.find((c) => c.id === search.c) ?? CHALLENGES[0];
  const exercise = useMemo(() => challengeExercise(current, lang), [current, lang]);
  const solved = new Set(progress.challenges);
  const q = query.trim().toLowerCase();
  const shown = CHALLENGES.filter(
    (c) =>
      (diff === "all" || c.difficulty === diff) &&
      (tag === "all" || c.tags.includes(tag)) &&
      (status === "all" || (status === "done") === solved.has(c.id)) &&
      (!q || `${c.title.en} ${c.title.tr} ${c.id}`.toLowerCase().includes(q)),
  );
  const count = (d: Difficulty) => CHALLENGES.filter((c) => c.difficulty === d);
  const nextUnsolved = CHALLENGES.find((c) => !solved.has(c.id) && c.id !== current.id);

  function select(id: string) {
    navigate({ search: { c: id } });
    if (window.innerWidth < 1024)
      setTimeout(
        () => document.getElementById("challenge")?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
  }

  function onChecked(passed: boolean, code: string) {
    const id = current.id;
    update((p) =>
      withToday({
        ...p,
        challengeAttempts: { ...p.challengeAttempts, [id]: (p.challengeAttempts[id] ?? 0) + 1 },
      }),
    );
    if (passed && !solved.has(id)) {
      const gain = challengeReward(
        CHALLENGE_XP[current.difficulty],
        progress.challengeSolutions.includes(id),
        progress.challengeHints[id] ?? 0,
      );
      update((p) => gainXp({ ...p, challenges: [...p.challenges, id] }, gain));
      setToast(gain > 0 ? t("ch.xp", { n: gain }) : t("ch.noXp"));
      setTimeout(() => setToast(null), 2600);
      // The server runs the code again before the XP counts.
      void acc.claim({
        kind: "challenge",
        id,
        code,
        hints: progress.challengeHints[id] ?? 0,
        solution: progress.challengeSolutions.includes(id),
        day: today(),
      });
    }
  }

  return (
    <PageShell>
      {toast && (
        <div
          role="status"
          className="ep-rise fixed bottom-5 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-lg"
        >
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
          {toast}
        </div>
      )}
      <PageHeader
        sticker={
          <>
            <Swords className="h-4 w-4 text-brand" aria-hidden="true" />{" "}
            {t("ch.sticker", { n: CHALLENGES.length })}
          </>
        }
        title={
          <>
            {t("ch.title1")} <span className="ep-mark">{t("ch.title2")}</span>
          </>
        }
      >
        {t("ch.lead")}
      </PageHeader>

      <dl className="relative z-10 mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["ch.solved", `${solved.size}/${CHALLENGES.length}`, Trophy, "text-brand"],
            [
              "ch.easy",
              `${count("easy").filter((c) => solved.has(c.id)).length}/${count("easy").length}`,
              Circle,
              "text-emerald-400",
            ],
            [
              "ch.medium",
              `${count("medium").filter((c) => solved.has(c.id)).length}/${count("medium").length}`,
              Circle,
              "text-amber-400",
            ],
            ["ch.streak", t("ch.days", { n: streakOf(progress.days) }), Flame, "text-orange-400"],
          ] as const
        ).map(([k, v, Icon, color]) => (
          <div key={k} className="ep-card flex items-center gap-3 px-4 py-3">
            <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
            <div>
              <dt className="text-[12px] text-ink-3">{t(k)}</dt>
              <dd className="font-mono text-lg font-semibold text-ink">{v}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="relative z-10 grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="ep-card h-fit space-y-4 p-4 lg:sticky lg:top-20">
          <label className="relative block">
            <span className="sr-only">{t("ch.search")}</span>
            <Search
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("ch.search")}
              className="w-full rounded-xl border border-line bg-canvas py-2.5 pr-3 pl-9 font-mono text-[13px] text-ink placeholder-zinc-500 focus:border-brand-line focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiff(d)}
                className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${diff === d ? "border-brand-line bg-brand-soft text-brand" : "border-line text-ink-3 hover:text-ink"}`}
              >
                {t(d === "all" ? "ch.all" : (`ch.${d}` as UiKey))}
              </button>
            ))}
            <span className="mx-1 w-px bg-line" aria-hidden="true" />
            {(["todo", "done"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(status === s ? "all" : s)}
                className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${status === s ? "border-brand-line bg-brand-soft text-brand" : "border-line text-ink-3 hover:text-ink"}`}
              >
                {t(s === "todo" ? "ch.todo" : "ch.done")}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...TAGS] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setTag(g)}
                className={`rounded-md px-2 py-0.5 font-mono text-[11px] transition-colors ${tag === g ? "bg-surface-2 text-ink ring-1 ring-line-strong" : "text-ink-3 hover:text-ink"}`}
              >
                #{t(g === "all" ? "ch.all" : (`tag.${g}` as UiKey))}
              </button>
            ))}
          </div>
          <ul className="-mx-1 max-h-[60vh] space-y-0.5 overflow-y-auto pr-1">
            {shown.map((c) => {
              const active = c.id === current.id;
              const done = solved.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => select(c.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${active ? "bg-brand-soft" : "hover:bg-surface-2"}`}
                  >
                    {done ? (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-emerald-500"
                        aria-label={t("ch.done")}
                      />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-line-strong" aria-hidden="true" />
                    )}
                    <span
                      className={`min-w-0 flex-1 truncate text-[14px] ${active ? "font-medium text-brand" : "text-ink-2"}`}
                    >
                      {c.title[lang]}
                    </span>
                    <DifficultyBadge d={c.difficulty} />
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && (
              <li className="px-2 py-4 text-center text-[13px] text-ink-3">{t("ch.none")}</li>
            )}
          </ul>
        </aside>

        <main id="challenge" className="min-w-0 scroll-mt-20 space-y-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[12px] text-ink-3">
            {current.tags.map((g) => (
              <span key={g} className="rounded-md bg-surface-2 px-2 py-0.5">
                #{t(`tag.${g}` as UiKey)}
              </span>
            ))}
            <span className="ml-auto inline-flex items-center gap-1 text-amber-400">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> +
              {CHALLENGE_XP[current.difficulty]} XP
            </span>
          </div>
          <HomeworkPanel
            key={`${current.id}-${lang}`}
            sectionId="challenge-panel"
            exercise={exercise}
            badge={t(`ch.${current.difficulty}` as UiKey)}
            badgeTone={current.difficulty}
            passedText={t("ch.passed")}
            extra={
              <div className="text-[15px] leading-relaxed text-zinc-300">
                <Examples ch={current} />
              </div>
            }
            runner={(code, l) => checkChallenge(current.id, code, l)}
            code={progress.challengeCode[current.id] ?? current.starter}
            onCode={(code) =>
              update((p) => ({ ...p, challengeCode: { ...p.challengeCode, [current.id]: code } }))
            }
            passed={solved.has(current.id)}
            attempts={progress.challengeAttempts[current.id] ?? 0}
            hintsUsed={progress.challengeHints[current.id] ?? 0}
            onChecked={onChecked}
            onHint={() =>
              update((p) => ({
                ...p,
                challengeHints: {
                  ...p.challengeHints,
                  [current.id]: Math.min(
                    current.hints.en.length,
                    (p.challengeHints[current.id] ?? 0) + 1,
                  ),
                },
              }))
            }
            onSolution={() =>
              update((p) =>
                p.challengeSolutions.includes(current.id)
                  ? p
                  : { ...p, challengeSolutions: [...p.challengeSolutions, current.id] },
              )
            }
            reward={{
              xp: challengeReward(
                CHALLENGE_XP[current.difficulty],
                progress.challengeSolutions.includes(current.id),
                progress.challengeHints[current.id] ?? 0,
              ),
              hintCost: challengeHintCost(CHALLENGE_XP[current.difficulty]),
              solutionSeen: progress.challengeSolutions.includes(current.id),
            }}
          />
          {nextUnsolved && (
            <button
              type="button"
              onClick={() => select(nextUnsolved.id)}
              className="ep-card group flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-transform hover:-translate-y-0.5"
            >
              <span>
                <span className="block text-[12px] text-ink-3">{t("ch.next")}</span>
                <span className="font-medium text-ink">{nextUnsolved.title[lang]}</span>
              </span>
              <span className="flex items-center gap-2">
                <DifficultyBadge d={nextUnsolved.difficulty} />
                <ChevronRight
                  className="h-4 w-4 text-brand transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </button>
          )}
        </main>
      </div>
    </PageShell>
  );
}
