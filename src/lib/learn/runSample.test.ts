import { describe, expect, it } from "vitest";
import { LESSONS } from "./lessons";
import { runSample } from "./runSample";

describe("lesson samples run in the simulator", () => {
  for (const lesson of LESSONS) {
    const modules = lesson.sections
      .filter((s) => s.code && /ModuleScript/.test(s.code.where ?? ""))
      .map((s) => ({
        name: s.code!.where!.match(/(\w+) \(ModuleScript\)/)?.[1] ?? "Module",
        code: s.code!.code,
      }));
    lesson.sections.forEach((s, i) => {
      if (!s.code) return;
      it(`${lesson.id} #${i} runs without errors`, () => {
        const r = runSample(s.code!.code, s.code!.where, modules);
        expect(
          r.output.filter((o) => o.kind === "error" || o.kind === "warn").map((o) => o.text),
        ).toEqual([]);
      });
    });
  }
  it("records what a kill brick does", () => {
    const events = LESSONS.find((l) => l.id === "events")!;
    const brick = events.sections[1].code!;
    const r = runSample(brick.code, brick.where);
    expect(r.actions).toContain("Player1 touched KillBrick");
    expect(r.changes.some((c) => /Humanoid\.Health: 100 → 0/.test(c))).toBe(true);
  });
});
