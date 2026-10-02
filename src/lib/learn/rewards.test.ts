import { describe, expect, it } from "vitest";
import { challengeHintCost, challengeReward, homeworkReward } from "./rewards";

describe("rewards", () => {
  it("homework: hints cost 20 XP each, the solution pays nothing", () => {
    expect(homeworkReward(false, 0)).toBe(100);
    expect(homeworkReward(false, 2)).toBe(60);
    expect(homeworkReward(false, 9)).toBe(20);
    expect(homeworkReward(true, 0)).toBe(0);
  });

  it("challenges: each hint costs a quarter, the solution pays nothing", () => {
    expect(challengeHintCost(100)).toBe(25);
    expect(challengeReward(100, false, 0)).toBe(100);
    expect(challengeReward(100, false, 1)).toBe(75);
    expect(challengeReward(100, false, 3)).toBe(25);
    expect(challengeReward(100, false, 10)).toBe(25);
    expect(challengeReward(60, true, 0)).toBe(0);
  });
});
