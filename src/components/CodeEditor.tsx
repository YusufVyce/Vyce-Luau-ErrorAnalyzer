import { useCallback, useEffect, useRef, useState } from "react";
import { highlightLuau } from "@/components/CodeBlock";
import { complete, type Completion } from "@/lib/editor/completions";
import { parse } from "@/lib/luau/parser";

const LINE = 21; // px, must match leading below
const PAD_TOP = 12;
const PAD_LEFT = 48;
const INDENT_AFTER =
  /(\bthen|\bdo|\belse|\brepeat|\bfunction\s*[\w.:]*\s*\([^)]*\)|[{(])\s*(--.*)?$/;
/** Lines that open a block closed by `end`. */
const OPENS_END = /(\bthen|\bdo|\bfunction\s*[\w.:]*\s*\([^)]*\))\s*(--.*)?$/;
const PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
const CLOSERS = new Set([")", "]", "}"]);

const KIND_STYLE: Record<Completion["kind"], { tag: string; color: string }> = {
  keyword: { tag: "k", color: "text-[#c792ea]" },
  global: { tag: "g", color: "text-[#89ddff]" },
  service: { tag: "S", color: "text-[#f78c6c]" },
  class: { tag: "C", color: "text-[#ffcb6b]" },
  enum: { tag: "E", color: "text-[#c3e88d]" },
  function: { tag: "ƒ", color: "text-[#82aaff]" },
  member: { tag: "m", color: "text-[#89ddff]" },
  local: { tag: "v", color: "text-zinc-300" },
};

interface Popup {
  items: Completion[];
  replace: number;
  index: number;
  top: number;
  left: number;
}

/**
 * Lightweight Luau editor: a transparent textarea over a highlighted <pre>.
 * Autocomplete (Roblox APIs, locals, keywords), auto-closing brackets and
 * quotes, auto `end`, Tab / Shift+Tab, Ctrl+/ comments, Ctrl+Enter to run and
 * an error-line marker. No external editor library needed.
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
  const charWidth = useRef(7.8);
  const [popup, setPopup] = useState<Popup | null>(null);
  const lines = value.split("\n").length;
  const height = Math.max(minLines, lines) * LINE + PAD_TOP * 2;

  const sync = useCallback(() => {
    if (!ta.current) return;
    if (pre.current) {
      pre.current.scrollTop = ta.current.scrollTop;
      pre.current.scrollLeft = ta.current.scrollLeft;
    }
    if (gutter.current) gutter.current.scrollTop = ta.current.scrollTop;
  }, []);

  useEffect(sync, [value, sync]);

  useEffect(() => {
    // Measure the monospace character width once, for placing the popup.
    const el = ta.current;
    if (!el) return;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    const cs = getComputedStyle(el);
    ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
    const w = ctx.measureText("MMMMMMMMMM").width / 10;
    if (w > 0) charWidth.current = w;
  }, []);

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

  function updatePopup(el: HTMLTextAreaElement) {
    const caret = el.selectionStart;
    if (caret !== el.selectionEnd) return setPopup(null);
    const before = el.value.slice(0, caret);
    const res = complete(before, el.value);
    if (!res) return setPopup(null);
    const lineIdx = before.split("\n").length - 1;
    const col =
      before.slice(before.lastIndexOf("\n") + 1).replace(/\t/g, "    ").length - res.replace;
    let top = PAD_TOP + (lineIdx + 1) * LINE - el.scrollTop + 2;
    if (top + 8 * 26 > el.clientHeight && top > 8 * 26)
      top -= LINE + Math.min(8, res.items.length) * 26 + 10;
    const left = Math.max(
      4,
      Math.min(PAD_LEFT + col * charWidth.current - el.scrollLeft, el.clientWidth - 260),
    );
    setPopup({ items: res.items, replace: res.replace, index: 0, top, left });
  }

  function accept(item: Completion, replace: number) {
    const el = ta.current!;
    const caret = el.selectionStart;
    el.setSelectionRange(caret - replace, caret);
    insert(item.insert);
    setPopup(null);
  }

  function toggleComment(el: HTMLTextAreaElement) {
    const { selectionStart: s, selectionEnd: e } = el;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    const endIdx = value.indexOf("\n", e);
    const end = endIdx === -1 ? value.length : endIdx;
    const block = value.slice(start, end);
    const rows = block.split("\n");
    const allCommented = rows.every((r) => !r.trim() || /^\s*--/.test(r));
    const next = rows
      .map((r) =>
        allCommented ? r.replace(/^(\s*)-- ?/, "$1") : r.trim() ? r.replace(/^(\s*)/, "$1-- ") : r,
      )
      .join("\n");
    el.setSelectionRange(start, end);
    insert(next, start, start + next.length);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: end } = el;

    if (popup) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const d = e.key === "ArrowDown" ? 1 : -1;
        setPopup({ ...popup, index: (popup.index + d + popup.items.length) % popup.items.length });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        accept(popup.items[popup.index], popup.replace);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setPopup(null);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onRun?.();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      toggleComment(el);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
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
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const line = value.slice(lineStart, s);
      const indent = line.match(/^[\t ]*/)![0];
      const extra = INDENT_AFTER.test(line.trimEnd()) ? "\t" : "";
      const after = value.slice(
        s,
        value.indexOf("\n", s) === -1 ? value.length : value.indexOf("\n", s),
      );
      // Studio-style: close a new block with `end` when the script is missing one.
      // Auto-paired closers after the caret (the ")" of Connect(…)) move after `end`.
      if (OPENS_END.test(line.trimEnd()) && /^[\s)\]}]*$/.test(after)) {
        const full = line + after;
        const missing = (full.match(/\(/g) ?? []).length - (full.match(/\)/g) ?? []).length;
        const closer = `end${")".repeat(Math.max(0, missing))}${after.trim()}`;
        const text = `\n${indent}\t\n${indent}${closer}`;
        // Only when it actually repairs the script: broken now, valid with the `end`.
        const candidate = value.slice(0, s) + text + value.slice(s + after.length);
        if (parse(value).error && !parse(candidate).error) {
          el.setSelectionRange(s, s + after.length);
          insert(text);
          const caret = s + 1 + indent.length + 1;
          el.setSelectionRange(caret, caret);
          return;
        }
      }
      // Enter between a pair like {} puts the closer on its own line.
      if (extra && CLOSERS.has(value[s])) {
        insert(`\n${indent}\t\n${indent}`);
        const caret = s + 1 + indent.length + 1;
        el.setSelectionRange(caret, caret);
        return;
      }
      insert(`\n${indent}${extra}`);
      return;
    }
    if (e.key === "Backspace" && s === end && s > 0) {
      const prev = value[s - 1];
      if (PAIRS[prev] && value[s] === PAIRS[prev]) {
        e.preventDefault();
        el.setSelectionRange(s - 1, s + 1);
        insert("");
        return;
      }
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Typing a closer that's already there just steps over it.
    if ((CLOSERS.has(e.key) || e.key === '"' || e.key === "'") && s === end && value[s] === e.key) {
      e.preventDefault();
      el.setSelectionRange(s + 1, s + 1);
      return;
    }
    if (PAIRS[e.key]) {
      const close = PAIRS[e.key];
      if (s !== end) {
        e.preventDefault();
        const sel = value.slice(s, end);
        insert(e.key + sel + close, s + 1, s + 1 + sel.length);
        return;
      }
      const prev = value[s - 1] ?? "";
      const next = value[s] ?? "";
      const isQuote = e.key === '"' || e.key === "'";
      if (isQuote && /[\w"'\\]/.test(prev)) return;
      if (next && !/[\s)\]},;]/.test(next)) return;
      e.preventDefault();
      insert(e.key + close, s + 1);
    }
  }

  return (
    <div
      className="code-dark relative overflow-hidden rounded-lg border border-code-line bg-code"
      style={{ height }}
    >
      {errorLine !== undefined && errorLine > 0 && (
        <div
          className="pointer-events-none absolute right-0 left-0 bg-red-500/10"
          style={{
            top: PAD_TOP + (errorLine - 1) * LINE - (ta.current?.scrollTop ?? 0),
            height: LINE,
          }}
          aria-hidden="true"
        />
      )}
      <div
        ref={gutter}
        className="pointer-events-none absolute top-0 bottom-0 left-0 w-10 overflow-hidden border-r border-zinc-800/80 py-3 text-right font-mono text-[12px] text-zinc-600 select-none"
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
        className="pointer-events-none absolute inset-0 m-0 overflow-hidden py-3 pr-3 pl-12 font-mono text-[13px] whitespace-pre text-zinc-200"
        style={{ lineHeight: `${LINE}px`, tabSize: 4 }}
      >
        {highlightLuau(value)}
        {"\n"}
      </pre>
      <textarea
        ref={ta}
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={Boolean(popup)}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          updatePopup(e.target);
        }}
        onKeyDown={onKeyDown}
        onScroll={() => {
          sync();
          setPopup(null);
        }}
        onBlur={() => setTimeout(() => setPopup(null), 120)}
        onClick={() => setPopup(null)}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        wrap="off"
        className="absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent py-3 pr-3 pl-12 font-mono text-[13px] whitespace-pre text-transparent caret-sky-300 outline-none selection:bg-sky-400/25"
        style={{ lineHeight: `${LINE}px`, tabSize: 4 }}
      />
      {popup && (
        <ul
          role="listbox"
          className="absolute z-20 w-64 overflow-hidden rounded-lg border border-code-line bg-code-head py-1 shadow-2xl"
          style={{ top: popup.top, left: popup.left }}
        >
          {popup.items.map((item, i) => (
            <li
              key={item.label}
              role="option"
              aria-selected={i === popup.index}
              onMouseDown={(e) => {
                e.preventDefault();
                accept(item, popup.replace);
              }}
              className={`flex cursor-pointer items-center gap-2 px-2 py-1 font-mono text-[12.5px] ${
                i === popup.index ? "bg-sky-400/15 text-zinc-100" : "text-zinc-300 hover:bg-white/5"
              }`}
            >
              <span
                className={`w-4 shrink-0 text-center text-[11px] font-bold ${KIND_STYLE[item.kind].color}`}
              >
                {KIND_STYLE[item.kind].tag}
              </span>
              <span className="truncate">{item.label}</span>
              {item.detail && (
                <span className="ml-auto shrink-0 text-[10px] text-zinc-500">{item.detail}</span>
              )}
            </li>
          ))}
          <li className="border-t border-code-line px-2 pt-1 font-mono text-[10px] text-zinc-500">
            ↑↓ · Tab/Enter · Esc
          </li>
        </ul>
      )}
    </div>
  );
}
