import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, earned, newlyEarned } from "./achievements";
import { certificateId } from "./certificate";
import { LESSONS } from "./lessons";
import {
  EMPTY_PROGRESS,
  levelFor,
  normalizeProgress,
  streakOf,
  today,
  withToday,
} from "./progress";

describe("progress", () => {
  it("normalizes broken or foreign backup data", () => {
    const p = normalizeProgress({
      xp: "999",
      quiz: "x",
      homework: ["a", 3],
      hints: [],
      days: ["2026-01-01"],
    });
    expect(p.xp).toBe(0);
    expect(p.quiz).toEqual([]);
    expect(p.homework).toEqual(["a"]);
    expect(p.hints).toEqual({});
    expect(p.challenges).toEqual([]);
    expect(p.days).toEqual(["2026-01-01"]);
  });
  it("counts streaks ending today or yesterday", () => {
    const now = new Date(2026, 8, 28);
    const d = (offset: number) => today(new Date(2026, 8, 28 - offset));
    expect(streakOf([d(0), d(1), d(2)], now)).toBe(3);
    expect(streakOf([d(1), d(2)], now)).toBe(2);
    expect(streakOf([d(0), d(2)], now)).toBe(1);
    expect(streakOf([d(3)], now)).toBe(0);
  });
  it("withToday adds today once", () => {
    const p = withToday(withToday({ ...EMPTY_PROGRESS }));
    expect(p.days).toEqual([today()]);
  });
  it("levels go up with XP", () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(5000).title).toBe("Legend");
  });
});

describe("achievements", () => {
  it("ids are unique and nothing is earned at the start", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(earned({ ...EMPTY_PROGRESS }).size).toBe(0);
  });
  it("detects newly earned achievements", () => {
    const before = { ...EMPTY_PROGRESS };
    const after = { ...EMPTY_PROGRESS, homework: ["first-script"], challenges: ["add"] };
    expect(
      newlyEarned(before, after)
        .map((a) => a.id)
        .sort(),
    ).toEqual(["challenger", "first-script"]);
  });
  it("finishing every lesson earns Graduate", () => {
    const ids = LESSONS.map((l) => l.id);
    expect(earned({ ...EMPTY_PROGRESS, quiz: ids, homework: ids }).has("graduate")).toBe(true);
  });
  it("certificate ids are stable and depend on the data", () => {
    const d = {
      name: "Ann",
      lessons: 26,
      xp: 100,
      level: "Noob",
      challenges: 0,
      date: "2026-09-28",
      lang: "en" as const,
    };
    expect(certificateId(d)).toBe(certificateId({ ...d }));
    expect(certificateId(d)).not.toBe(certificateId({ ...d, name: "Bob" }));
  });
});
