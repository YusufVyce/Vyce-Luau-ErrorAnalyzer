/** The plain-language parts of a lesson: a numbered story and a line-by-line walkthrough. */
import { ArrowRight, Baby, ListOrdered } from "lucide-react";
import { highlightLuau } from "@/components/CodeBlock";
import { Rich } from "@/components/learn/Rich";
import { localizeCode } from "@/lib/learn/codeTr";
import { pick, type L, type Lang } from "@/lib/learn/path/types";
import type { Simple } from "@/lib/learn/simple";
import type { TFunction } from "@/lib/prefs";

/** Very short sentences, one per row, like a picture book. */
export function StoryList({ items, lang }: { items: L[]; lang: Lang }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-3 rounded-2xl border border-line bg-surface-2/60 p-3.5 text-[16px] leading-relaxed text-ink md:text-[17px]"
        >
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--syn-purple)_18%,transparent)] text-[13px] font-bold text-[var(--syn-purple)]"
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <span>
            <Rich text={pick(item, lang)} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A code sample with a plain-words note under every line. */
export function WalkThrough({
  lines,
  lang,
}: {
  lines: Array<{ line: string; note: L }>;
  lang: Lang;
}) {
  return (
    <div className="code-dark overflow-hidden rounded-2xl border border-code-line bg-code">
      {lines.map((w, i) => (
        <div key={i} className={i > 0 ? "border-t border-code-line" : undefined}>
          <pre className="overflow-x-auto px-4 pt-3 font-mono text-[14px] leading-[1.7] text-zinc-200 [tab-size:2]">
            <code>{highlightLuau(w.line)}</code>
          </pre>
          <p className="flex gap-2 px-4 pt-1 pb-3 text-[14px] leading-relaxed text-zinc-300">
            <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
            <span>{pick(w.note, lang)}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

/** The "In plain words" box at the top of the lesson notes. */
export function PlainWords({ simple, lang, t }: { simple: Simple; lang: Lang; t: TFunction }) {
  const walk = simple.walk.map((w) => ({ ...w, line: localizeCode(w.line, lang) }));
  return (
    <section className="space-y-5 rounded-2xl border border-[color-mix(in_srgb,var(--syn-purple)_35%,transparent)] bg-[color-mix(in_srgb,var(--syn-purple)_6%,transparent)] p-5 md:p-6">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-[var(--syn-purple)] uppercase">
          <Baby className="h-3.5 w-3.5" aria-hidden="true" />
          {t("notes.plainWords")}
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {pick(simple.title, lang)}
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-2">{pick(simple.intro, lang)}</p>
      </div>
      <StoryList items={simple.story} lang={lang} />
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-[var(--syn-purple)] uppercase">
          <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
          {t("notes.lineByLine")}
        </span>
        <WalkThrough lines={walk} lang={lang} />
      </div>
    </section>
  );
}
