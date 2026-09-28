import { describe, expect, it } from "vitest";
import { CHALLENGES } from "./challenges";
import { examplesFor, referenceResults, runChallenge } from "./runner";

describe("challenges", () => {
  it("ids are unique", () => {
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
  });
  for (const ch of CHALLENGES) {
    it(`${ch.id}: the solution passes`, () => {
      const r = runChallenge(ch, ch.solution);
      const failed = r.checks.filter((c) => !c.pass);
      expect(failed, JSON.stringify({ failed, out: r.output.slice(0, 8) }, null, 1)).toEqual([]);
      expect(r.passed).toBe(true);
    });
    it(`${ch.id}: the starter code fails with an explanation`, () => {
      const r = runChallenge(ch, ch.starter, "tr");
      expect(r.passed).toBe(false);
      expect(r.checks.some((c) => !c.pass && c.detail)).toBe(true);
    });
    if (ch.kind === "function") {
      it(`${ch.id}: every test has a reference value and visible examples exist`, () => {
        const ref = referenceResults(ch);
        ch.tests.forEach((_, i) => expect(ref.get(i + 1)?.ok, `test ${i + 1}`).toBe(true));
        expect(examplesFor(ch).length).toBeGreaterThan(0);
      });
    }
  }
  it("a wrong answer is caught by the tests", () => {
    const ch = CHALLENGES.find((c) => c.id === "format-time")!;
    const r = runChallenge(
      ch,
      'local function formatTime(s)\n\treturn math.floor(s / 60) .. ":" .. s % 60\nend\n',
    );
    expect(r.passed).toBe(false);
    const fail = r.checks.find((c) => !c.pass)!;
    expect(fail.detail).toContain('"0:5"');
  });
  it("slow recursion times out instead of hanging", () => {
    const ch = CHALLENGES.find((c) => c.id === "fibonacci")!;
    const r = runChallenge(
      ch,
      "local function fibonacci(n)\n\tif n < 2 then return n end\n\treturn fibonacci(n - 1) + fibonacci(n - 2)\nend\n",
    );
    expect(r.passed).toBe(false);
  });
});
