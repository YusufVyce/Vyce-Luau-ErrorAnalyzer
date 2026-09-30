import { describe, expect, it } from "vitest";
import { LESSONS } from "./lessons";
import { localizeLesson } from "./lessons.tr";
import { EXERCISES } from "./homework/exercises";
import { localizeExercise } from "./homework/exercises.tr";
import { runHomework } from "./homework/harness";
import { localizeCode, untranslatedComments } from "./codeTr";
import { CHALLENGES } from "@/lib/challenges/challenges";
import { challengeExercise } from "@/lib/challenges/runner";
import { parse } from "@/lib/luau/parser";
import { UI } from "@/lib/i18n/ui";

describe("Turkish content", () => {
  it("every UI key has a Turkish translation", () => {
    const missing = Object.keys(UI.en).filter((k) => !UI.tr[k as keyof typeof UI.en]);
    expect(missing).toEqual([]);
  });

  for (const lesson of LESSONS) {
    it(`${lesson.id}: Turkish lesson matches the English structure`, () => {
      const tr = localizeLesson(lesson, "tr");
      expect(tr.title).not.toBe(
        lesson.title === "Script, LocalScript, ModuleScript" ? "" : lesson.title,
      );
      expect(tr.sections.length).toBe(lesson.sections.length);
      lesson.sections.forEach((s, i) => {
        expect(tr.sections[i].text?.length ?? 0).toBe(s.text?.length ?? 0);
        expect(tr.sections[i].list?.length ?? 0).toBe(s.list?.length ?? 0);
        expect(Boolean(tr.sections[i].heading)).toBe(Boolean(s.heading));
        expect(Boolean(tr.sections[i].tip)).toBe(Boolean(s.tip));
        if (s.code) {
          const code = tr.sections[i].code!.code;
          expect(code).toBe(localizeCode(s.code.code, "tr"));
          expect(untranslatedComments(code)).toEqual([]);
          expect(parse(code).error?.message).toBeUndefined();
        }
      });
      expect(tr.quiz?.options.length).toBe(lesson.quiz?.options.length);
      expect(tr.tryIt?.length).toBe(lesson.tryIt?.length);
      if (lesson.game) expect(tr.game?.name).not.toBe(lesson.game.name);
    });
  }

  for (const ex of EXERCISES) {
    it(`${ex.lessonId}: Turkish homework has the same shape and the solution passes`, () => {
      const tr = localizeExercise(ex, "tr");
      expect(tr.title).not.toBe(ex.title);
      expect(tr.steps.length).toBe(ex.steps.length);
      expect(tr.hints.length).toBe(ex.hints.length);
      const r = runHomework(ex, ex.solution, "tr");
      expect(r.passed).toBe(true);
      const bad = runHomework(ex, ex.starter, "tr");
      expect(bad.passed).toBe(false);
      // The Turkish starter and solution (Turkish comments and printed text) work too.
      expect(untranslatedComments(tr.starter)).toEqual([]);
      expect(untranslatedComments(tr.solution)).toEqual([]);
      const trRun = runHomework(tr, tr.solution, "tr");
      expect(trRun.checks.filter((c) => !c.pass)).toEqual([]);
      expect(runHomework(tr, tr.starter, "tr").passed).toBe(false);
    });
  }

  it("check messages are in Turkish when lang is tr", () => {
    const ex = EXERCISES.find((e) => e.lessonId === "first-script")!;
    const r = runHomework(ex, 'print("hi")', "tr");
    expect(r.checks[0].label).toContain("yazıyor");
    expect(r.checks[0].detail).toContain("Output'ta yazanlar");
  });

  it("lesson mistakes and challenge starters have no English comments", () => {
    for (const l of LESSONS) {
      const tr = localizeLesson(l, "tr");
      if (tr.mistake) expect(untranslatedComments(tr.mistake.code), l.id).toEqual([]);
    }
    for (const c of CHALLENGES) {
      const ex = challengeExercise(c, "tr");
      expect(untranslatedComments(ex.starter), c.id).toEqual([]);
    }
  });
});
