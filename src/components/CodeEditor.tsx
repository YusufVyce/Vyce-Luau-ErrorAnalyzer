import { useCallback, useEffect, useRef } from "react";
import { highlightLuau } from "@/components/CodeBlock";

const LINE = 21; // px, must match leading below
const INDENT_AFTER =
  /(\bthen|\bdo|\belse|\brepeat|\bfunction\s*[\w.:]*\s*\([^)]*\)|[{(])\s*(--.*)?$/;

/**
 * Lightweight Luau editor: a transparent textarea over a highlighted <pre>.
 * Supports Tab / Shift+Tab, auto-indent on Enter, Ctrl/⌘+Enter to run, and an
 * error-line marker. No external editor library needed.
 */
export function CodeEditor({
  value,
  onChange,
  onRun,
  errorLine,
  minLines = 10,
  label = "Code editor",
}: {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  errorLine?: number;
  minLines?: number;
  label?: string;
}) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const pre = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const lines = value.split("\n").length;
  const height = Math.max(minLines, lines) * LINE + 24;

  const sync = useCallback(() => {
    if (!ta.current) return;
    if (pre.current) {
      pre.current.scrollTop = ta.current.scrollTop;
      pre.current.scrollLeft = ta.current.scrollLeft;
    }
    if (gutter.current) gutter.current.scrollTop = ta.current.scrollTop;
  }, []);

  useEffect(sync, [value, sync]);

  function insert(text: string, selectStart?: number, selectEnd?: number) {
    const el = ta.current!;
    el.focus();
    // execCommand keeps the browser's undo history working.
    const ok = document.execCommand?.("insertText", false, text);
    if (!ok) {
      el.setRangeText(text, el.selectionStart, el.selectionEnd, "end");
      onChange(el.value);
    }
    if (selectStart !== undefined) el.setSelectionRange(selectStart, selectEnd ?? selectStart);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onRun?.();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end } = el;
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      if (e.shiftKey) {
        if (value[lineStart] === "\t") {
          el.setSelectionRange(lineStart, lineStart + 1);
          insert("", Math.max(lineStart, s - 1), Math.max(lineStart, end - 1));
        }
        return;
      }
      if (s !== end && value.slice(s, end).includes("\n")) {
        const block = value.slice(lineStart, end);
        el.setSelectionRange(lineStart, end);
        insert(block.replace(/^/gm, "\t"));
        return;
      }
      insert("\t");
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const s = el.selectionStart;
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const line = value.slice(lineStart, s);
      const indent = line.match(/^[\t ]*/)![0];
      const extra = INDENT_AFTER.test(line.trimEnd()) ? "\t" : "";
      insert(`\n${indent}${extra}`);
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-zinc-800 bg-[#0b0e12] focus-within:border-emerald-500/40"
      style={{ height }}
    >
      {errorLine !== undefined && errorLine > 0 && (
        <div
          className="pointer-events-none absolute left-0 right-0 bg-red-500/10"
          style={{ top: 12 + (errorLine - 1) * LINE - (ta.current?.scrollTop ?? 0), height: LINE }}
          aria-hidden="true"
        />
      )}
      <div
        ref={gutter}
        className="pointer-events-none absolute bottom-0 left-0 top-0 w-10 select-none overflow-hidden border-r border-zinc-800/80 py-3 text-right font-mono text-[12px] text-zinc-600"
        style={{ lineHeight: `${LINE}px` }}
        aria-hidden="true"
      >
        {Array.from({ length: Math.max(lines, minLines) }, (_, i) => (
          <div key={i} className={`pr-2 ${errorLine === i + 1 ? "text-red-400" : ""}`}>
            {i + 1}
          </div>
        ))}
      </div>
      <pre
        ref={pre}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre py-3 pl-12 pr-3 font-mono text-[13px] text-zinc-200"
        style={{ lineHeight: `${LINE}px`, tabSize: 4 }}
      >
        {highlightLuau(value)}
        {"\n"}
      </pre>
      <textarea
        ref={ta}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={sync}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        wrap="off"
        className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent py-3 pl-12 pr-3 font-mono text-[13px] text-transparent caret-emerald-300 outline-none selection:bg-emerald-500/30"
        style={{ lineHeight: `${LINE}px`, tabSize: 4 }}
      />
    </div>
  );
}
