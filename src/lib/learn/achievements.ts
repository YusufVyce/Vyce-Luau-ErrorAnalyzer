/**
 * Achievements are computed from progress (nothing extra is stored), so they
 * can never get out of sync with what the learner actually did.
 */
import { CHALLENGES } from "@/lib/challenges/challenges";
import { CHAPTERS, LESSONS } from "./lessons";
import { lessonComplete, levelFor, streakOf, type Progress } from "./progress";

type Text = { en: string; tr: string };

export interface Achievement {
  id: string;
  icon:
    | "code"
    | "book"
    | "flame"
    | "swords"
    | "trophy"
    | "brain"
    | "zap"
    | "star"
    | "crown"
    | "target"
    | "rocket";
  title: Text;
  desc: Text;
  /** [current, goal] */
  progress: (p: Progress) => [number, number];
}

const chapterDone = (p: Progress, chapter: string): [number, number] => {
  const ls = LESSONS.filter((l) => l.chapter === chapter);
  return [ls.filter((l) => lessonComplete(p, l)).length, ls.length];
};

const hardSolved = (p: Progress) =>
  CHALLENGES.filter((c) => c.difficulty === "hard" && p.challenges.includes(c.id)).length;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-script",
    icon: "code",
    title: { en: "Hello, World", tr: "Merhaba Dünya" },
    desc: { en: "Pass your first homework.", tr: "İlk ödevini geç." },
    progress: (p) => [Math.min(1, p.homework.length), 1],
  },
  {
    id: "basics",
    icon: "book",
    title: { en: "Luau Basics", tr: "Luau Temelleri" },
    desc: {
      en: "Finish chapter 2: variables, ifs, loops, functions, tables.",
      tr: "2. bölümü bitir: değişkenler, if'ler, döngüler, fonksiyonlar, tablolar.",
    },
    progress: (p) => chapterDone(p, CHAPTERS[1]),
  },
  {
    id: "game-maker",
    icon: "zap",
    title: { en: "Game Maker", tr: "Oyun Yapımcısı" },
    desc: {
      en: "Finish chapter 3: parts, events, leaderstats, UI, tweens.",
      tr: "3. bölümü bitir: parçalar, event'ler, leaderstats, arayüz, tween'ler.",
    },
    progress: (p) => chapterDone(p, CHAPTERS[2]),
  },
  {
    id: "multiplayer",
    icon: "rocket",
    title: { en: "Multiplayer Ready", tr: "Çok Oyunculuya Hazır" },
    desc: {
      en: "Finish chapter 4: remotes, DataStores, modules.",
      tr: "4. bölümü bitir: remote'lar, DataStore'lar, modüller.",
    },
    progress: (p) => chapterDone(p, CHAPTERS[3]),
  },
  {
    id: "advanced",
    icon: "brain",
    title: { en: "Advanced Scripter", tr: "İleri Seviye Scripter" },
    desc: {
      en: "Finish chapter 6: tags, RunService, raycasts, classes, tools, rounds.",
      tr: "6. bölümü bitir: etiketler, RunService, raycast, sınıflar, tool'lar, turlar.",
    },
    progress: (p) => chapterDone(p, CHAPTERS[5]),
  },
  {
    id: "graduate",
    icon: "crown",
    title: { en: "Graduate", tr: "Mezun" },
    desc: { en: "Complete every lesson in the course.", tr: "Kurstaki bütün dersleri tamamla." },
    progress: (p) => [LESSONS.filter((l) => lessonComplete(p, l)).length, LESSONS.length],
  },
  {
    id: "no-hints",
    icon: "target",
    title: { en: "No Hints Needed", tr: "İpucuna Gerek Yok" },
    desc: {
      en: "Pass 5 homeworks without using a hint or the solution.",
      tr: "5 ödevi ipucu ya da çözüm kullanmadan geç.",
    },
    progress: (p) => [
      Math.min(5, p.homework.filter((id) => !p.hints[id] && !p.solutions.includes(id)).length),
      5,
    ],
  },
  {
    id: "quiz-whiz",
    icon: "star",
    title: { en: "Quiz Whiz", tr: "Soru Ustası" },
    desc: {
      en: "Answer 10 quick checks right on the first try.",
      tr: "10 kısa soruyu ilk denemede doğru cevapla.",
    },
    progress: (p) => [Math.min(10, p.quiz.filter((id) => !p.quizMisses[id]).length), 10],
  },
  {
    id: "challenger",
    icon: "swords",
    title: { en: "Challenger", tr: "Meydan Okuyan" },
    desc: { en: "Solve your first coding challenge.", tr: "İlk kodlama görevini çöz." },
    progress: (p) => [Math.min(1, p.challenges.length), 1],
  },
  {
    id: "problem-solver",
    icon: "swords",
    title: { en: "Problem Solver", tr: "Problem Çözücü" },
    desc: { en: "Solve 10 coding challenges.", tr: "10 kodlama görevi çöz." },
    progress: (p) => [Math.min(10, p.challenges.length), 10],
  },
  {
    id: "hard-mode",
    icon: "flame",
    title: { en: "Hard Mode", tr: "Zor Mod" },
    desc: { en: "Solve 3 hard challenges.", tr: "3 zor görev çöz." },
    progress: (p) => [Math.min(3, hardSolved(p)), 3],
  },
  {
    id: "grandmaster",
    icon: "trophy",
    title: { en: "Grandmaster", tr: "Büyük Usta" },
    desc: { en: "Solve every coding challenge.", tr: "Bütün kodlama görevlerini çöz." },
    progress: (p) => [
      p.challenges.filter((id) => CHALLENGES.some((c) => c.id === id)).length,
      CHALLENGES.length,
    ],
  },
  {
    id: "on-fire",
    icon: "flame",
    title: { en: "On Fire", tr: "Alev Aldın" },
    desc: { en: "Practice 3 days in a row.", tr: "3 gün üst üste çalış." },
    progress: (p) => [Math.min(3, streakOf(p.days)), 3],
  },
  {
    id: "unstoppable",
    icon: "flame",
    title: { en: "Unstoppable", tr: "Durdurulamaz" },
    desc: { en: "Practice 7 days in a row.", tr: "7 gün üst üste çalış." },
    progress: (p) => [Math.min(7, streakOf(p.days)), 7],
  },
  {
    id: "pro",
    icon: "crown",
    title: { en: "Pro Developer", tr: "Profesyonel Geliştirici" },
    desc: {
      en: "Reach the Pro Developer level (1500 XP).",
      tr: "Pro Developer seviyesine ulaş (1500 XP).",
    },
    progress: (p) => [Math.min(1500, p.xp), 1500],
  },
  {
    id: "legend",
    icon: "trophy",
    title: { en: "Legend", tr: "Efsane" },
    desc: { en: "Reach the Legend level (5000 XP).", tr: "Legend seviyesine ulaş (5000 XP)." },
    progress: (p) => [Math.min(5000, p.xp), 5000],
  },
];

export function earned(p: Progress): Set<string> {
  return new Set(
    ACHIEVEMENTS.filter((a) => {
      const [cur, goal] = a.progress(p);
      return cur >= goal;
    }).map((a) => a.id),
  );
}

/** Achievements earned in `after` but not in `before`. */
export function newlyEarned(before: Progress, after: Progress): Achievement[] {
  const had = earned(before);
  const has = earned(after);
  return ACHIEVEMENTS.filter((a) => has.has(a.id) && !had.has(a.id));
}

export { levelFor };
