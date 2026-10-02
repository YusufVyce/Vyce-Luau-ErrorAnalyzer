import { describe, expect, it } from "vitest";
import { LESSONS } from "../lessons";
import { SIMPLE } from ".";

describe("plain-language explanations", () => {
  it("exist for every lesson and nothing else", () => {
    expect(Object.keys(SIMPLE).sort()).toEqual(LESSONS.map((l) => l.id).sort());
  });

  for (const [id, s] of Object.entries(SIMPLE)) {
    it(`${id}: is complete and simple in both languages`, () => {
      for (const l of [s.title, s.intro, ...s.story, ...s.walk.map((w) => w.note)]) {
        expect(l.en.trim(), id).not.toBe("");
        expect(l.tr.trim(), id).not.toBe("");
      }
      expect(s.story.length, id).toBeGreaterThanOrEqual(3);
      expect(s.walk.length, id).toBeGreaterThanOrEqual(2);
      // Sentences stay short enough to read at a glance.
      for (const line of s.story) expect(line.en.length, `${id}: ${line.en}`).toBeLessThan(240);
      // Walkthrough lines have no comments: the notes explain them.
      for (const w of s.walk) expect(w.line, id).not.toMatch(/--/);
    });
  }
});
