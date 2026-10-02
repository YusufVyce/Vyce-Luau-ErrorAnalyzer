/**
 * Plain-language explanations: every lesson starts with an everyday
 * comparison, a few very short sentences and a line-by-line walkthrough of
 * a small example, before any jargon. Shown as the first two cards of the
 * lesson and at the top of the lesson notes.
 */
import type { L } from "../path/types";

export interface WalkLine {
  /** One line of Luau (tabs for indentation). */
  line: string;
  /** What that line does, in plain words. */
  note: L;
}

export interface Simple {
  /** Short headline with the comparison, e.g. "pcall is a safety net". */
  title: L;
  /** One or two sentences under the headline. */
  intro: L;
  /** The idea in very short, simple sentences. */
  story: L[];
  /** A small example, explained one line at a time. */
  walk: WalkLine[];
}

type Pair = [en: string, tr: string];

const l = ([en, tr]: Pair): L => ({ en, tr });

/** Builds an entry from [en, tr] pairs; walk lines use 4 spaces per indent level. */
export function simple(
  title: Pair,
  intro: Pair,
  story: Pair[],
  walk: Array<[line: string, en: string, tr: string]>,
): Simple {
  return {
    title: l(title),
    intro: l(intro),
    story: story.map(l),
    walk: walk.map(([line, en, tr]) => ({
      line: line.replace(/^( {4})+/, (m) => "\t".repeat(m.length / 4)),
      note: { en, tr },
    })),
  };
}
