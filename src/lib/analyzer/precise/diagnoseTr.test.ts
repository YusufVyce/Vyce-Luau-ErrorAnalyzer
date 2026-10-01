import { describe, expect, it } from "vitest";
import { diagnose } from "./diagnose";
import { analyzerLang } from "./lang";
import { ERROR_LIBRARY } from "./library";
import type { PreciseDiagnosis } from "./types";

/** Every sentence the student reads, without code spans and quoted Roblox messages. */
function prose(d: PreciseDiagnosis): string[] {
  return [
    d.title,
    d.summary,
    d.explanation,
    d.analogy ?? "",
    ...d.causes.flatMap((c) => [c.text, c.detail ?? ""]),
    ...d.steps,
    ...(d.breakdown ?? []).map((b) => b.note),
    ...(d.glossary ?? []).map((g) => g.meaning),
    ...d.warnings.flatMap((w) => [w.title, w.message]),
    d.fixCode?.caption ?? "",
  ]
    .map((t) =>
      t
        .replace(/`[^`]*`/g, "")
        .replace(/"[^"]*"/g, "")
        .replace(/“[^”]*”/g, ""),
    )
    .filter(Boolean);
}

const ENGLISH = /\b(the|is|was|your|isn't|doesn't|can't|with|this|that)\b/i;

describe("Turkish diagnoses", () => {
  it("writes the whole explanation in Turkish", () => {
    const d = diagnose(
      "ServerScriptService.Inventory:3: attempt to index nil with 'Value'",
      'local stats = player:WaitForChild("leaderstats")\nlocal coins = stats:FindFirstChild("Coinz")\nprint(coins.Value)',
      "tr",
    )!;
    expect(d.title).toBe("Hiçbir şeyin (nil) .Value alanı kullanıldı");
    expect(d.summary).toContain("nil, bu yüzden");
    expect(d.causes[0].text).toContain('FindFirstChild("Coinz") hiçbir şey bulamadı');
    expect(d.fixCode?.caption).toContain("en fazla 5 saniye");
    expect(d.analogy).toContain("kutu");
    expect(d.breakdown?.at(-1)?.note).toContain("okuyamaz");
    expect(d.glossary?.find((g) => g.term === "nil")?.meaning).toContain("değer yok");
    expect(d.confidenceReasons[0]).toContain("tanınan Roblox mesajı");
  });

  it("keeps English as the default and doesn't leak the language", () => {
    const log = "Workspace.Lava.Script:3: attempt to index nil with 'Humanoid'";
    expect(diagnose(log, "", "tr")!.title).not.toMatch(ENGLISH);
    expect(analyzerLang()).toBe("en");
    expect(diagnose(log, "")!.title).toBe("Tried to use .Humanoid on nothing (nil)");
  });

  it("translates warnings from the static checks", () => {
    const d = diagnose("", "while true do\n\tprint(1)\nend", "tr")!;
    expect(d.title).toBe("Bu kodda 1 olası sorun var");
    expect(d.warnings[0].title).toBe("Döngü hiç beklemiyor");
  });

  it("has no English sentences for any error in the library", () => {
    const english = ERROR_LIBRARY.flatMap((e) =>
      prose(diagnose(e.log, e.code ?? "", "tr")!).filter((text) => ENGLISH.test(text)),
    );
    expect(english).toEqual([]);
  });
});
