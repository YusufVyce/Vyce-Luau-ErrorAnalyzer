import { describe, expect, it } from "vitest";
import { complete } from "./completions";

const labels = (before: string, code = before) =>
  complete(before, code)?.items.map((i) => i.label) ?? [];

describe("editor completions", () => {
  it("suggests services inside GetService", () => {
    expect(labels('game:GetService("Repl')).toContain("ReplicatedStorage");
    expect(complete('game:GetService("Repl', "")?.replace).toBe(4);
  });
  it("suggests classes inside Instance.new", () => {
    expect(labels('Instance.new("IntV')).toEqual(["IntValue"]);
  });
  it("suggests library functions and enums", () => {
    expect(labels("task.wa")).toContain("wait");
    expect(labels("math.fl")).toContain("floor");
    expect(labels("Enum.Mat")).toContain("Material");
    expect(labels("Enum.Material.Ne")).toContain("Neon");
  });
  it("suggests methods after a colon", () => {
    expect(labels("part:FindFirst")).toContain("FindFirstChild");
  });
  it("suggests locals and keywords", () => {
    const code = "local playerCoins = 5\nprint(playerC";
    expect(labels(code, code)).toContain("playerCoins");
    expect(labels("loc")).toContain("local");
  });
  it("stays quiet in comments and for a single letter", () => {
    expect(complete("-- loca", "")).toBeNull();
    expect(complete("l", "")).toBeNull();
  });
});

describe("completion ranking", () => {
  it("puts popular services first", () => {
    expect(complete('game:GetService("Repl', "")?.items[0].label).toBe("ReplicatedStorage");
  });
});
