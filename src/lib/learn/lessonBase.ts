/** Shared lesson types, the chapter list and the code-sample helper. */
import type { VisualId } from "@/components/learn/Visuals";

export interface LessonCode {
  code: string;
  title?: string;
  /** Where the script goes in Explorer. */
  where?: string;
}

export interface LessonSection {
  heading?: string;
  text?: string[];
  list?: string[];
  code?: LessonCode;
  visual?: { id: VisualId; caption?: string };
  tip?: string;
}

export interface Lesson {
  id: string;
  chapter: string;
  title: string;
  minutes: number;
  summary: string;
  sections: LessonSection[];
  game?: { name: string; text: string };
  tryIt?: string[];
  mistake?: { error: string; code: string; explain: string };
  quiz?: { question: string; options: string[]; answer: number; why: string };
}

/** Strips the first newline so samples can start on their own line. */
export const lua = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values)
    .replace(/^\n/, "")
    .replace(/\s+$/, "");

export const CHAPTERS = [
  "1 · Getting started",
  "2 · Luau basics",
  "3 · Making things happen",
  "4 · Multiplayer & saving",
  "5 · Build a game",
  "6 · Advanced scripting",
  "7 · Luau toolbox",
  "8 · World & players",
  "9 · Servers & projects",
] as const;
