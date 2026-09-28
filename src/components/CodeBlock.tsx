import { useState, type ReactNode } from "react";

const KEYWORDS = new Set([
  "and",
  "break",
  "continue",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while",
  "type",
  "export",
]);
const BUILTINS = new Set([
  "game",
  "workspace",
  "script",
  "print",
  "warn",
  "error",
  "pcall",
  "xpcall",
  "require",
  "typeof",
  "type",
  "tostring",
  "tonumber",
  "pairs",
  "ipairs",
  "task",
  "math",
  "string",
  "table",
  "Instance",
  "Vector3",
  "Vector2",
  "CFrame",
  "Color3",
  "BrickColor",
  "UDim2",
  "UDim",
  "Enum",
  "TweenInfo",
  "RaycastParams",
  "setmetatable",
  "coroutine",
  "os",
  "self",
  "Random",
  "NumberSequence",
  "ColorSequence",
]);

const TOKEN =
  /(--\[\[[\s\S]*?\]\]|--[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`|\[\[[\s\S]*?\]\])|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+|.)/g;

/** Tiny Luau highlighter — good enough for short teaching/fix snippets. */
export function highlightLuau(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    const [text, comment, str, num, ident] = m;
    const key = i++;
    if (comment)
      out.push(
        <span key={key} className="text-zinc-500 italic">
          {text}
        </span>,
      );
    else if (str)
      out.push(
        <span key={key} className="text-amber-300">
          {text}
        </span>,
      );
    else if (num)
      out.push(
        <span key={key} className="text-orange-300">
          {text}
        </span>,
      );
    else if (ident && KEYWORDS.has(ident))
      out.push(
        <span key={key} className="text-pink-400">
          {text}
        </span>,
      );
    else if (ident && BUILTINS.has(ident))
      out.push(
        <span key={key} className="text-sky-300">
          {text}
        </span>,
      );
    else if (ident && /^[A-Z]/.test(ident))
      out.push(
        <span key={key} className="text-emerald-200">
          {text}
        </span>,
      );
    else out.push(text);
  }
  return out;
}

export async function copyText(content: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = content;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  } catch {
    return false;
  }
}

export function CodeBlock({
  code,
  title,
  tone = "default",
  copyable = true,
}: {
  code: string;
  title?: string;
  tone?: "default" | "good" | "bad";
  copyable?: boolean;
}) {
  const [label, setLabel] = useState("Copy");
  const border =
    tone === "good"
      ? "border-emerald-500/30"
      : tone === "bad"
        ? "border-red-500/30"
        : "border-zinc-800";
  const titleColor =
    tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-red-300" : "text-zinc-400";

  return (
    <div className={`rounded-lg border ${border} bg-[#0b0e12] overflow-hidden`}>
      {(title || copyable) && (
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 px-3 py-1.5">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${titleColor}`}>
            {title ?? "Luau"}
          </span>
          {copyable && (
            <button
              type="button"
              onClick={async () => {
                const ok = await copyText(code);
                setLabel(ok ? "Copied ✓" : "Copy failed");
                setTimeout(() => setLabel("Copy"), 1600);
              }}
              className="text-[11px] rounded px-2 py-0.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              aria-label="Copy code"
            >
              {label}
            </button>
          )}
        </div>
      )}
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed font-mono text-zinc-200">
        <code>{highlightLuau(code)}</code>
      </pre>
    </div>
  );
}
