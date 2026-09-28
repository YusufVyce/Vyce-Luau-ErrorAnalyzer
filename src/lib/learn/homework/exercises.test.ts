import { describe, expect, it } from "vitest";
import { EXERCISES } from "./exercises";
import { runHomework } from "./harness";
import { LESSONS } from "../lessons";

describe("homework", () => {
  for (const ex of EXERCISES) {
    it(`${ex.lessonId}: the solution passes`, () => {
      const r = runHomework(ex, ex.solution);
      const failed = r.checks.filter((c) => !c.pass);
      expect(failed, JSON.stringify({ failed, out: r.output.slice(0, 12) }, null, 1)).toEqual([]);
      expect(r.passed).toBe(true);
    });
    it(`${ex.lessonId}: the starter code does not pass`, () => {
      const r = runHomework(ex, ex.starter);
      expect(r.passed).toBe(false);
      expect(r.checks.some((c) => !c.pass && c.detail)).toBe(true);
    });
  }
  it("every lesson except the Studio tour has homework", () => {
    const missing = LESSONS.filter(
      (l) => l.id !== "studio-tour" && !EXERCISES.some((e) => e.lessonId === l.id),
    ).map((l) => l.id);
    expect(missing).toEqual([]);
  });
});
