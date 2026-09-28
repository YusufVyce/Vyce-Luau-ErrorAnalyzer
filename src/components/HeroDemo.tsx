import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Sparkle } from "lucide-react";
import { useT } from "@/lib/prefs";

type Tok = [string, string?];

const KW = "text-[var(--syn-purple)]";
const FN = "text-[#82aaff]";
const STR = "text-[var(--syn-green)]";
const NUM = "text-[var(--syn-orange)]";
const PROP = "text-[var(--syn-cyan)]";
const DIM = "text-zinc-500";

const CODE: Tok[][] = [
  [
    ["local ", KW],
    ["lava ", ""],
    ["= ", DIM],
    ["script", PROP],
    [".Parent", ""],
  ],
  [],
  [
    ["lava", ""],
    [".Touched", PROP],
    [":", DIM],
    ["Connect", FN],
    ["(", DIM],
    ["function", KW],
    ["(hit)", ""],
  ],
  [
    ["    hit", ""],
    [".Parent", ""],
    [".Humanoid", PROP],
    [".Health ", ""],
    ["= ", DIM],
    ["0", NUM],
  ],
  [
    ["end", KW],
    [")", DIM],
  ],
];

const FIX: Array<{ sign: "-" | "+"; toks: Tok[] }> = [
  { sign: "-", toks: [["hit.Parent.Humanoid.Health = 0"]] },
  {
    sign: "+",
    toks: [
      ["local ", KW],
      ["humanoid = hit.Parent:"],
      ["FindFirstChildOfClass", FN],
      ["(", DIM],
      ['"Humanoid"', STR],
      [")", DIM],
    ],
  },
  { sign: "+", toks: [["if not ", KW], ["humanoid "], ["then return end", KW]] },
  { sign: "+", toks: [["humanoid.Health = "], ["0", NUM]] },
];

function Line({ toks }: { toks: Tok[] }) {
  return (
    <>
      {toks.map(([text, cls], i) => (
        <span key={i} className={cls || "text-zinc-200"}>
          {text}
        </span>
      ))}
    </>
  );
}

/** Looping mini editor: buggy code → Output error → analysis → fix. */
export function HeroDemo() {
  const t = useT();
  const [step, setStep] = useState(3);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setStep(0);
    const timings = [1400, 1600, 1500, 4200];
    let current = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      timer = setTimeout(() => {
        current = (current + 1) % 4;
        setStep(current);
        tick();
      }, timings[current]);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="ep-glow ep-glow-code code-dark relative overflow-hidden">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-code-line bg-code-head px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 rounded-md bg-code px-2 py-0.5 font-mono text-[11px] text-zinc-300">
          Lava › Script.lua
        </span>
        <span className="ml-auto font-mono text-[10px] text-zinc-500">Luau</span>
      </div>

      {/* code */}
      <pre className="px-0 py-3 font-mono text-[12.5px] leading-[1.75]">
        {CODE.map((toks, i) => {
          const bad = i === 3 && step >= 1;
          return (
            <div key={i} className={`flex ${bad ? "bg-red-500/10" : ""}`}>
              <span
                className={`w-10 shrink-0 pr-3 text-right select-none ${bad ? "text-red-400" : "text-zinc-600"}`}
              >
                {i + 1}
              </span>
              <span
                className={
                  bad ? "underline decoration-red-400 decoration-wavy underline-offset-4" : ""
                }
              >
                <Line toks={toks} />
              </span>
              {i === 3 && step === 0 && <span className="ep-caret" aria-hidden="true" />}
            </div>
          );
        })}
      </pre>

      {/* output */}
      <div className="border-t border-code-line bg-code-head px-3 py-2 font-mono text-[11.5px]">
        <div className="mb-1 text-[10px] tracking-wider text-zinc-500 uppercase">Output</div>
        {step >= 1 ? (
          <div className="ep-rise text-red-400">
            Workspace.Lava.Script:4: Humanoid is not a valid member of Workspace
            &quot;Workspace&quot;
          </div>
        ) : (
          <div className="text-zinc-600">▸ waiting for Play…</div>
        )}
      </div>

      {/* analysis */}
      <div className="min-h-[168px] border-t border-code-line p-3">
        {step === 2 && (
          <div className="ep-rise space-y-1.5 font-mono text-[11.5px] text-zinc-400">
            <div className="ep-scan flex items-center gap-2 rounded-md px-2 py-1 text-[#82aaff]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />{" "}
              {t("demo.analyzing")}
            </div>
            <div className="px-2">✓ {t("demo.parse")}</div>
            <div className="px-2">✓ {t("demo.trace")}</div>
            <div className="px-2">✓ {t("demo.match")}</div>
          </div>
        )}
        {step === 3 && (
          <div className="ep-rise space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("demo.found")}
              </span>
              <span className="font-mono text-[11px] text-zinc-500">{t("demo.confidence")}</span>
            </div>
            <div className="text-[13px] font-medium text-zinc-100">
              <Sparkle
                className="mr-1 inline h-3.5 w-3.5 text-[var(--syn-purple)]"
                aria-hidden="true"
              />
              {t("demo.title")}
            </div>
            <div className="overflow-hidden rounded-lg border border-code-line font-mono text-[11.5px] leading-[1.7]">
              {FIX.map((l, i) => (
                <div
                  key={i}
                  className={`flex gap-2 px-2 ${l.sign === "-" ? "bg-red-500/10" : "bg-emerald-500/10"}`}
                >
                  <span className={l.sign === "-" ? "text-red-400" : "text-emerald-400"}>
                    {l.sign}
                  </span>
                  <span className={l.sign === "-" ? "text-red-300/80 line-through" : ""}>
                    <Line toks={l.toks} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {step < 2 && (
          <div className="flex h-full min-h-[140px] items-center justify-center font-mono text-[11.5px] text-zinc-600">
            {step === 0 ? t("demo.idle") : t("demo.pasted")}
          </div>
        )}
      </div>
    </div>
  );
}
