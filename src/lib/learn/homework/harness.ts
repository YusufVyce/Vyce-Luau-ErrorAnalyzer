/**
 * Runs a student's homework code inside the simulated Roblox world and turns
 * what happened into beginner-friendly checks. Everything is deterministic
 * and offline: the grader is plain code, no AI or network involved.
 */
import { diagnose } from "@/lib/analyzer/precise/diagnose";
import type { PreciseDiagnosis } from "@/lib/analyzer/precise/types";
import { parse } from "@/lib/luau/parser";
import { Vector3 } from "@/lib/luau/roblox/datatypes";
import type { Instance } from "@/lib/luau/roblox/instance";
import { World, type WorldOptions } from "@/lib/luau/roblox/world";
import { formatNumber, LuaTable, Userdata } from "@/lib/luau/values";

export interface HomeworkCheck {
  label: string;
  pass: boolean;
  detail?: string;
}

export interface ExplorerNode {
  name: string;
  /** Full name, e.g. "Workspace.Lava" — used to look the instance up again. */
  path?: string;
  className: string;
  value?: string;
  children: ExplorerNode[];
}

export interface OutputLine {
  kind: "print" | "warn" | "error" | "info";
  text: string;
  time: number;
}

export interface HomeworkResult {
  passed: boolean;
  checks: HomeworkCheck[];
  output: OutputLine[];
  syntaxError?: { line: number; message: string };
  runtimeError?: { message: string; line?: number };
  diagnosis?: PreciseDiagnosis;
  explorer: ExplorerNode[];
}

export interface Exercise {
  lessonId: string;
  title: string;
  kind: "write" | "fix";
  goal: string;
  steps: string[];
  scriptKind: "Script" | "LocalScript" | "ModuleScript";
  location: string;
  starter: string;
  hints: string[];
  solution: string;
  /** Lua appended to the student's code (same chunk) so tests can read its locals. */
  testFooter?: string;
  grade(h: Harness): void;
}

export const TEST_TAG = "__TEST__";

/** Text the student prints or shows: one string, or English and Turkish versions. */
export type Say = string | { en: string; tr: string };

export class Harness {
  worlds: World[] = [];
  checks: HomeworkCheck[] = [];
  studentPaths = new Set<string>();
  /** World whose Output/Explorer is shown to the student. */
  main?: World;

  constructor(
    public code: string,
    public exercise: Exercise,
    public lang: "en" | "tr" = "en",
  ) {}

  /** Picks the English or Turkish text for a check label or message. */
  t(en: string, tr: string): string {
    return this.lang === "tr" ? tr : en;
  }

  newWorld(options: WorldOptions = {}): World {
    const w = new World({ timeoutSteps: 200_000, maxTotalSteps: 3_000_000, ...options });
    // A baseplate and spawn make the world feel like a new Studio place.
    w.create(
      "Part",
      {
        Name: "Baseplate",
        Size: new Vector3(512, 20, 512),
        Position: new Vector3(0, -10, 0),
        Anchored: true,
      },
      w.workspace,
    );
    w.create(
      "SpawnLocation",
      {
        Name: "SpawnLocation",
        Size: new Vector3(12, 1, 12),
        Position: new Vector3(0, 0.5, 0),
        Anchored: true,
      },
      w.workspace,
    );
    this.worlds.push(w);
    if (!this.main) this.main = w;
    return w;
  }

  /** Adds the student's script. `code` lets a test run a modified copy (e.g. different starting values). */
  addStudentScript(
    world: World,
    parent: Instance,
    opts: { code?: string; name?: string; kind?: Exercise["scriptKind"] } = {},
  ): Instance {
    const source =
      (opts.code ?? this.code) + (this.exercise.testFooter ? `\n${this.exercise.testFooter}` : "");
    const s = world.addScript({
      source,
      kind: opts.kind ?? this.exercise.scriptKind,
      name:
        opts.name ??
        (this.exercise.scriptKind === "ModuleScript" ? "Module" : this.exercise.scriptKind),
      parent,
    });
    this.studentPaths.add(s.getFullName());
    return s;
  }

  check(label: string, pass: boolean, detail?: string): boolean {
    this.checks.push({ label, pass, detail: pass ? undefined : detail });
    return pass;
  }

  prints(world: World = this.main!): string[] {
    return world.output
      .filter((o) => o.kind === "print" && !o.text.startsWith(TEST_TAG))
      .map((o) => o.text);
  }

  printEntries(world: World = this.main!) {
    return world.output.filter((o) => o.kind === "print" && !o.text.startsWith(TEST_TAG));
  }

  /** Values printed by the hidden test footer: print("__TEST__", ...) */
  testValues(world: World = this.main!): string[][] {
    return world.output
      .filter((o) => o.kind === "print" && o.text.startsWith(TEST_TAG))
      .map((o) => o.text.slice(TEST_TAG.length).trim().split(" "));
  }

  studentErrors(world: World = this.main!) {
    return world.errors.filter(
      (e) =>
        !e.script ||
        [...this.studentPaths].some((p) => e.script === p || e.message.startsWith(p)) ||
        e.message.startsWith("Script timeout"),
    );
  }

  /** Picks the text a student is asked to print or show, in the current language. */
  say(text: Say): string {
    return typeof text === "string" ? text : this.t(text.en, text.tr);
  }

  /** True when `value` is the expected text in either language (old English answers still pass). */
  said(value: unknown, text: Say): boolean {
    return typeof text === "string" ? value === text : value === text.en || value === text.tr;
  }

  /** Checks that `expected` was printed (exact line), with a helpful message if not. */
  expectPrinted(expected: Say, label?: string, world: World = this.main!): boolean {
    const shown = this.say(expected);
    label ??= this.t(`Output shows "${shown}"`, `Output'ta "${shown}" yazıyor`);
    const lines = this.prints(world);
    if (lines.some((l) => this.said(l, expected))) return this.check(label, true);
    const loose = (s: string) => s.toLowerCase().replace(/[\s!.,:]/g, "");
    const near = lines.find((l) => loose(l) === loose(shown));
    let detail: string;
    if (near)
      detail = this.t(
        `Almost! You printed "${near}" — compare capital letters, spaces and punctuation with "${shown}".`,
        `Az kaldı! "${near}" yazdırdın — büyük/küçük harfleri, boşlukları ve noktalamayı "${shown}" ile karşılaştır.`,
      );
    else if (lines.length === 0)
      detail = this.t(
        "Nothing was printed. Use print(...) to write to the Output.",
        "Hiçbir şey yazdırılmadı. Output'a yazmak için print(...) kullan.",
      );
    else
      detail = `${this.t("The Output shows:", "Output'ta yazanlar:")} ${lines
        .slice(0, 6)
        .map((l) => `"${l}"`)
        .join(", ")}${lines.length > 6 ? "…" : ""}`;
    return this.check(label, false, detail);
  }

  /** Regex over the student's code with comments and strings removed. */
  codeHas(pattern: RegExp): boolean {
    return pattern.test(stripComments(this.code));
  }
}

function stripComments(code: string): string {
  return code.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, "").replace(/--[^\n]*/g, "");
}

export function fmtValue(v: unknown): string {
  if (v === undefined) return "nil";
  if (typeof v === "number") return formatNumber(v);
  if (typeof v === "string") return `"${v}"`;
  if (typeof v === "boolean") return String(v);
  if (v instanceof Userdata) return v.luaToString();
  return String(v);
}

const HIDDEN = new Set(["Camera", "Terrain"]);
const SHOWN_SERVICES = [
  "Workspace",
  "Players",
  "ReplicatedStorage",
  "ServerScriptService",
  "ServerStorage",
  "StarterGui",
  "Lighting",
];

function snapshot(inst: Instance, depth: number): ExplorerNode {
  const node: ExplorerNode = {
    name: inst.name,
    path: inst.getFullName(),
    className: inst.className,
    children: [],
  };
  if (inst.isA("ValueBase")) node.value = fmtValue(inst.props.get("Value"));
  if (depth <= 0) return node;
  for (const c of inst.children.slice(0, 40)) {
    if (HIDDEN.has(c.className)) continue;
    node.children.push(snapshot(c, depth - 1));
  }
  return node;
}

export function explorerOf(world: World): ExplorerNode[] {
  return SHOWN_SERVICES.map((n) => snapshot(world.service(n), 6)).filter(
    (n) => n.children.length > 0 || n.name === "Workspace",
  );
}

export function runHomework(
  exercise: Exercise,
  code: string,
  lang: "en" | "tr" = "en",
): HomeworkResult {
  const tr = lang === "tr";
  const parsed = parse(code);
  if (parsed.error) {
    const message = `${parsed.error.message}`;
    const log = `${exercise.location.replace(/ › /g, ".")}:${parsed.error.line}: ${message}`;
    return {
      passed: false,
      checks: [
        {
          label: tr ? "Kodunda sözdizimi hatası yok" : "Your code has no syntax errors",
          pass: false,
          detail: `${tr ? "Satır" : "Line"} ${parsed.error.line}: ${message}`,
        },
      ],
      output: [{ kind: "error", text: log, time: 0 }],
      syntaxError: { line: parsed.error.line, message },
      diagnosis: diagnose(log, code) ?? undefined,
      explorer: [],
    };
  }

  const h = new Harness(code, exercise, lang);
  try {
    exercise.grade(h);
  } catch (e) {
    h.check(
      h.t("The checker could run your code", "Kontrol eden kodunu çalıştırabildi"),
      false,
      `${h.t("The simulator hit a problem:", "Simülatör bir sorunla karşılaştı:")} ${(e as Error).message}`,
    );
  }
  const world = h.main;
  const errors = h.worlds.flatMap((w) => h.studentErrors(w));
  const firstError = errors[0];
  let diagnosis: PreciseDiagnosis | undefined;
  if (firstError) {
    diagnosis = diagnose(firstError.message, code) ?? undefined;
    h.checks.unshift({
      label: h.t("Your code runs without errors", "Kodun hatasız çalışıyor"),
      pass: false,
      detail: firstError.message,
    });
  }
  const output: OutputLine[] = (world?.output ?? [])
    .filter((o) => !(o.kind === "print" && o.text.startsWith(TEST_TAG)))
    .map((o) => ({ kind: o.kind, text: o.text, time: o.time }));
  const passed = h.checks.length > 0 && h.checks.every((c) => c.pass) && !firstError;
  return {
    passed,
    checks: h.checks,
    output,
    runtimeError: firstError ? { message: firstError.message, line: firstError.line } : undefined,
    diagnosis,
    explorer: world ? explorerOf(world) : [],
  };
}

export function findPath(world: World, path: string): Instance | undefined {
  return world.find(path);
}

export function isTable(v: unknown): v is LuaTable {
  return v instanceof LuaTable;
}
