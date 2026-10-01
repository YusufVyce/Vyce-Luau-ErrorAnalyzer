import { Fragment, type ReactNode } from "react";
import { CodeBlock } from "@/components/CodeBlock";
import { splitFences } from "./fences";

const INLINE = /(`[^`\n]+`|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

/** Inline `code` and plain links; everything else stays text (React escapes it). */
function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((piece, i) => {
    if (piece.startsWith("`") && piece.endsWith("`") && piece.length > 2) {
      return (
        <code
          key={i}
          className="rounded-md border border-line bg-surface-2 px-1 py-px font-mono text-[0.88em] text-brand-ink"
        >
          {piece.slice(1, -1)}
        </code>
      );
    }
    if (/^https?:\/\//.test(piece)) {
      return (
        <a
          key={i}
          href={piece}
          target="_blank"
          rel="nofollow ugc noopener noreferrer"
          className="break-all text-brand underline-offset-2 hover:underline"
        >
          {piece}
        </a>
      );
    }
    return <Fragment key={i}>{piece}</Fragment>;
  });
}

/** A forum post: paragraphs, inline code, links and highlighted code blocks. */
export function ForumBody({ text }: { text: string }) {
  return (
    <div className="min-w-0 space-y-3 text-[15px] leading-relaxed text-ink-2">
      {splitFences(text).map((part, i) =>
        part.code ? (
          <CodeBlock key={i} code={part.text} title={part.lang || "luau"} />
        ) : (
          part.text.split(/\n{2,}/).map((para, j) => (
            <p key={`${i}-${j}`} className="break-words whitespace-pre-wrap">
              {inline(para)}
            </p>
          ))
        ),
      )}
    </div>
  );
}
