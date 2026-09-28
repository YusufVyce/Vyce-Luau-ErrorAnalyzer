/**
 * Grades challenges in the offline simulator. Function challenges append a
 * hidden footer that calls the student's function with every test's
 * arguments and prints a canonical text form of each result; the reference
 * solution goes through the exact same footer to produce the expected values.
 */
import {
  runHomework,
  type Exercise,
  type Harness,
  type HomeworkResult,
} from "@/lib/learn/homework/harness";
import { World } from "@/lib/luau/roblox/world";
import type { Challenge, FunctionChallenge } from "./challenges";

const TAG = "__TEST__|";

/** Lua that turns any value into stable text (sorted keys, rounded floats). */
const SERIALIZER = `
local function __ser(v, depth)
	depth = depth or 0
	local t = type(v)
	if t == "string" then return string.format("%q", v) end
	if t == "number" then
		if v ~= v then return "nan" end
		if v == math.floor(v) then return tostring(v) end
		return tostring(math.floor(v * 10000 + 0.5) / 10000)
	end
	if t ~= "table" then return tostring(v) end
	if depth > 5 then return "{…}" end
	local keys = {}
	for k in pairs(v) do table.insert(keys, k) end
	table.sort(keys, function(a, b)
		local ta, tb = type(a), type(b)
		if ta ~= tb then return ta < tb end
		if ta == "number" or ta == "string" then return a < b end
		return tostring(a) < tostring(b)
	end)
	local isArray = #keys == #v
	local parts = {}
	for _, k in ipairs(keys) do
		if isArray then
			table.insert(parts, __ser(v[k], depth + 1))
		elseif type(k) == "string" and string.match(k, "^[%a_][%w_]*$") then
			table.insert(parts, k .. " = " .. __ser(v[k], depth + 1))
		else
			table.insert(parts, "[" .. __ser(k, depth + 1) .. "] = " .. __ser(v[k], depth + 1))
		end
	end
	return "{" .. table.concat(parts, ", ") .. "}"
end
`;

export function footerFor(ch: FunctionChallenge): string {
  const cases = ch.tests.map((tc) => `\tfunction() return __f(${tc.args}) end,`).join("\n");
  return `
local __f = ${ch.fn}
if type(__f) ~= "function" then
	print("${TAG}missing")
else
${SERIALIZER}
	local __cases = {
${cases}
	}
	for __i, __c in ipairs(__cases) do
		local __ok, __r = pcall(__c)
		if __ok then
			print("${TAG}" .. __i .. "|ok|" .. __ser(__r))
		else
			print("${TAG}" .. __i .. "|err|" .. tostring(__r))
		end
	end
end
`;
}

interface CaseResult {
  ok: boolean;
  value: string;
}

function parse(world: World): { missing: boolean; cases: Map<number, CaseResult> } {
  const cases = new Map<number, CaseResult>();
  let missing = false;
  for (const o of world.output) {
    if (o.kind !== "print" || !o.text.startsWith(TAG)) continue;
    const rest = o.text.slice(TAG.length);
    if (rest === "missing") {
      missing = true;
      continue;
    }
    const m = rest.match(/^(\d+)\|(ok|err)\|([\s\S]*)$/);
    if (m) cases.set(Number(m[1]), { ok: m[2] === "ok", value: m[3] });
  }
  return { missing, cases };
}

const referenceCache = new Map<string, Map<number, CaseResult>>();

/** Expected results: the reference solution run through the same footer. */
export function referenceResults(ch: FunctionChallenge): Map<number, CaseResult> {
  const cached = referenceCache.get(ch.id);
  if (cached) return cached;
  const w = new World({ timeoutSteps: 2_000_000, maxTotalSteps: 10_000_000 });
  w.addScript({
    source: `${ch.solution}\n${footerFor(ch)}`,
    parent: w.service("ServerScriptService"),
  });
  w.run(1);
  const { cases } = parse(w);
  referenceCache.set(ch.id, cases);
  return cases;
}

/** Visible examples, e.g. `formatTime(75) → "1:15"`. */
export function examplesFor(ch: FunctionChallenge): Array<{ call: string; result: string }> {
  const ref = referenceResults(ch);
  return ch.tests
    .map((tc, i) => ({ tc, r: ref.get(i + 1) }))
    .filter(({ tc }) => !tc.hidden)
    .map(({ tc, r }) => ({ call: `${ch.fn}(${tc.args})`, result: r?.value ?? "?" }));
}

function gradeFunction(h: Harness, ch: FunctionChallenge) {
  const w = h.newWorld();
  h.addStudentScript(w, w.service("ServerScriptService"));
  w.run(1);
  const got = parse(w);
  const expected = referenceResults(ch);
  if (got.missing) {
    h.check(
      h.t(`A function called ${ch.fn} exists`, `${ch.fn} adında bir fonksiyon var`),
      false,
      h.t(
        `Define it with: local function ${ch.fn}(...) — the name must match exactly.`,
        `Şöyle tanımla: local function ${ch.fn}(...) — isim birebir aynı olmalı.`,
      ),
    );
    return;
  }
  let hiddenNo = 0;
  ch.tests.forEach((tc, i) => {
    const exp = expected.get(i + 1);
    const res = got.cases.get(i + 1);
    const hiddenLabel = tc.hidden ? ++hiddenNo : 0;
    const label = tc.hidden
      ? h.t(`Hidden test #${hiddenLabel}`, `Gizli test #${hiddenLabel}`)
      : `${ch.fn}(${tc.args}) → ${exp?.value ?? "?"}`;
    if (!res) {
      h.check(
        label,
        false,
        h.t(
          "Didn't run — your script stopped before this test.",
          "Çalışmadı — scriptin bu testten önce durdu.",
        ),
      );
      return;
    }
    if (!res.ok) {
      h.check(label, false, `${h.t("Error:", "Hata:")} ${res.value}`);
      return;
    }
    const pass = exp !== undefined && res.value === exp.value;
    const detail = tc.hidden
      ? h.t(
          `${ch.fn}(${tc.args}) returned ${res.value}, expected ${exp?.value}`,
          `${ch.fn}(${tc.args}) sonucu ${res.value}, beklenen ${exp?.value}`,
        )
      : h.t(`Your function returned ${res.value}`, `Fonksiyonun ${res.value} döndürdü`);
    h.check(label, pass, detail);
  });
}

export function challengeExercise(ch: Challenge, lang: "en" | "tr"): Exercise {
  return {
    lessonId: `challenge:${ch.id}`,
    title: ch.title[lang],
    kind: "write",
    goal: ch.prompt[lang],
    steps: [],
    scriptKind: "Script",
    location: "ServerScriptService › Challenge",
    starter: ch.starter,
    hints: ch.hints[lang],
    solution: ch.solution,
    testFooter: ch.kind === "function" ? footerFor(ch) : undefined,
    grade: (h) => (ch.kind === "function" ? gradeFunction(h, ch) : ch.grade(h)),
  };
}

export function runChallenge(
  ch: Challenge,
  code: string,
  lang: "en" | "tr" = "en",
): HomeworkResult {
  return runHomework(challengeExercise(ch, lang), code, lang);
}
