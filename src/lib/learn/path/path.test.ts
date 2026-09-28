import { describe, expect, it } from "vitest";
import { parse } from "@/lib/luau/parser";
import { LESSONS } from "../lessons";
import { runSample } from "../runSample";
import { MOTIVATION_POOLS, motivate } from "../motivation";
import { PATH, choice, reviewExercises, rng, shuffled, t, type L, type Opt, type Step } from ".";
import {
  EMPTY_ANSWER,
  isCorrect,
  isReady,
  lessonItems,
  practiceXp,
  retryItem,
  reviewItems,
} from "./session";

const text = (o: Opt) => (typeof o === "string" ? o : o.en);

function expectText(l: L, where: string) {
  expect(l.en.trim(), `${where} (en)`).not.toBe("");
  expect(l.tr.trim(), `${where} (tr)`).not.toBe("");
}

function expectParses(code: string, where: string) {
  const r = parse(code);
  expect(r.error?.message, `${where}\n${code}`).toBeUndefined();
}

function printed(code: string) {
  const r = runSample(code);
  const problems = r.output.filter((o) => o.kind === "error" || o.kind === "warn");
  return {
    problems: problems.map((o) => o.text),
    out: r.output
      .filter((o) => o.kind === "print")
      .map((o) => o.text)
      .join("\n"),
  };
}

describe("Duolingo-style path content", () => {
  it("has bite-sized steps for every lesson and nothing else", () => {
    expect(Object.keys(PATH).sort()).toEqual(LESSONS.map((l) => l.id).sort());
  });

  for (const lesson of LESSONS) {
    const p = PATH[lesson.id];
    describe(lesson.id, () => {
      it("has cards, exercises, an emoji and a takeaway", () => {
        expect(p.emoji.length).toBeGreaterThan(0);
        expectText(p.takeaway, "takeaway");
        expect(p.steps[0].kind).toBe("learn");
        expect(p.steps.filter((s) => s.kind === "learn").length).toBeGreaterThanOrEqual(2);
        expect(p.steps.filter((s) => s.kind !== "learn").length).toBeGreaterThanOrEqual(3);
        expect(p.steps.length).toBeLessThanOrEqual(10);
      });

      p.steps.forEach((step: Step, i) => {
        const where = `${lesson.id} step ${i} (${step.kind})`;
        it(`${where} is valid in both languages`, () => {
          switch (step.kind) {
            case "learn":
              expectText(step.title, where);
              expectText(step.body, where);
              if (step.hook) expectText(step.hook, where);
              if (step.code) expectParses(step.code, where);
              // Learn cards stay short so they are read, not skimmed.
              expect(step.body.en.length, where).toBeLessThan(260);
              break;
            case "choice":
            case "fill":
            case "predict": {
              if (step.kind !== "predict") expectText(step.prompt, where);
              expectText(step.explain, where);
              expect(step.answer).toBeGreaterThanOrEqual(0);
              expect(step.answer).toBeLessThan(step.options.length);
              expect(step.options.length).toBeGreaterThanOrEqual(2);
              expect(new Set(step.options.map(text)).size, `${where} unique options`).toBe(
                step.options.length,
              );
              for (const o of step.options) if (typeof o !== "string") expectText(o, where);
              if (step.kind === "choice" && step.code) expectParses(step.code, where);
              if (step.kind === "fill") {
                expect(step.code.split("___").length, `${where} has one blank`).toBe(2);
                expectParses(step.code.replace("___", step.options[step.answer]), where);
              }
              if (step.kind === "predict") {
                expectParses(step.code, where);
                const answer = step.options[step.answer];
                expect(typeof answer, `${where}: the answer is real output`).toBe("string");
                const r = printed(step.code);
                expect(r.problems, where).toEqual([]);
                expect(r.out, where).toBe(answer);
              }
              break;
            }
            case "order":
              expectText(step.prompt, where);
              expectText(step.explain, where);
              expect(step.lines.length).toBeGreaterThanOrEqual(3);
              expect(new Set(step.lines.map((l) => l.trim())).size, `${where} unique`).toBe(
                step.lines.length,
              );
              expectParses(step.lines.join("\n"), where);
              break;
          }
        });
      });
    });
  }
});

describe("session helpers", () => {
  it("shuffles into a different order, deterministically", () => {
    const a = shuffled(4, rng(7));
    expect(a).toEqual(shuffled(4, rng(7)));
    expect([...a].sort()).toEqual([0, 1, 2, 3]);
    for (let s = 0; s < 50; s++) expect(shuffled(3, rng(s))).not.toEqual([0, 1, 2]);
    expect(shuffled(1, rng(1))).toEqual([0]);
  });

  it("builds a review from exercises only", () => {
    const r = reviewExercises(["variables", "loops"], 6, rng(3));
    expect(r).toHaveLength(6);
    expect(r.every((x) => (x.step as { kind: string }).kind !== "learn")).toBe(true);
    expect(new Set(r.map((x) => x.lessonId))).toEqual(new Set(["variables", "loops"]));
  });

  it("motivation lines exist in both languages", () => {
    for (const [kind, pool] of Object.entries(MOTIVATION_POOLS)) {
      expect(pool.en.length, kind).toBeGreaterThan(0);
      expect(pool.tr.length, kind).toBeGreaterThan(0);
    }
    expect(motivate("combo", "en", { n: 3 }, () => 0)).toBe("3 in a row!");
    expect(motivate("combo", "tr", { n: 5 }, () => 0)).toBe("Üst üste 5!");
  });
});

describe("lesson sessions", () => {
  const quiz = choice(t("Q?", "S?"), ["a", "b"], 1, t("why", "neden"));

  it("runs the steps, then the quick check, then the homework", () => {
    const items = lessonItems({ lessonId: "variables", quiz, homework: true, seed: 1 });
    expect(items).toHaveLength(PATH.variables.steps.length + 2);
    expect(items.at(-2)).toMatchObject({ kind: "exercise", quiz: true });
    expect(items.at(-1)?.kind).toBe("homework");
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it("can resume straight at the homework", () => {
    const items = lessonItems({
      lessonId: "variables",
      quiz,
      homework: true,
      homeworkOnly: true,
      seed: 1,
    });
    expect(items.map((i) => i.kind)).toEqual(["homework"]);
  });

  it("grades every kind of exercise", () => {
    for (const step of Object.values(PATH).flatMap((p) => p.steps)) {
      if (step.kind === "learn") continue;
      if (step.kind === "order") {
        const right = { ...EMPTY_ANSWER, seq: step.lines.map((_, i) => i) };
        expect(isReady(step, right)).toBe(true);
        expect(isCorrect(step, right)).toBe(true);
        const swapped = {
          ...EMPTY_ANSWER,
          seq: [1, 0, ...step.lines.slice(2).map((_, i) => i + 2)],
        };
        expect(isCorrect(step, swapped)).toBe(false);
        expect(isReady(step, { ...EMPTY_ANSWER, seq: [0] })).toBe(false);
      } else {
        expect(isReady(step, EMPTY_ANSWER)).toBe(false);
        expect(isCorrect(step, { ...EMPTY_ANSWER, pick: step.answer })).toBe(true);
        const other = step.answer === 0 ? 1 : 0;
        expect(isCorrect(step, { ...EMPTY_ANSWER, pick: other })).toBe(false);
      }
    }
  });

  it("brings a missed exercise back with a new id", () => {
    const [item] = reviewItems(["loops"], 5, 1);
    const again = retryItem(item, rng(9));
    expect(again.id).not.toBe(item.id);
    expect(again.kind).toBe("exercise");
  });

  it("gives more XP the first time and for a perfect run", () => {
    expect(practiceXp({ firstTime: true, mistakes: 0 })).toBe(15);
    expect(practiceXp({ firstTime: true, mistakes: 2 })).toBe(10);
    expect(practiceXp({ firstTime: false, mistakes: 1 })).toBe(5);
    expect(practiceXp({ firstTime: false, mistakes: 0, review: true })).toBe(15);
  });
});
