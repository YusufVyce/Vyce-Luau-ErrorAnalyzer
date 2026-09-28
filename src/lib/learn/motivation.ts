/** Short motivational lines, picked at random. No network, no AI: just lists. */
import type { Lang } from "./path/types";

type Pool = { en: string[]; tr: string[] };

const POOLS = {
  correct: {
    en: [
      "Nice!",
      "Awesome!",
      "You got it!",
      "Perfect!",
      "Great job!",
      "Nailed it!",
      "Correct!",
      "Big brain move! 🧠",
      "Studio-ready!",
      "Clean code!",
    ],
    tr: [
      "Harika!",
      "Süper!",
      "Buldun!",
      "Mükemmel!",
      "Aferin!",
      "Tam isabet!",
      "Doğru!",
      "Beyin fırtınası! 🧠",
      "Studio'ya hazırsın!",
      "Tertemiz kod!",
    ],
  },
  wrong: {
    en: [
      "Not quite, but that's how you learn.",
      "Close! Take another look.",
      "Every scripter hits bugs. Keep going!",
      "Mistakes are just early versions of skills.",
      "Almost! You'll see it again soon.",
    ],
    tr: [
      "Tam değil ama öğrenmek böyle olur.",
      "Yaklaştın! Bir daha bak.",
      "Her scripter hata yapar. Devam!",
      "Hatalar, yeteneklerin ilk sürümüdür.",
      "Az kaldı! Birazdan tekrar göreceksin.",
    ],
  },
  combo: {
    en: ["{n} in a row!", "{n} in a row, you're on fire!", "Combo x{n}!"],
    tr: ["Üst üste {n}!", "Üst üste {n}, alev aldın!", "Kombo x{n}!"],
  },
  start: {
    en: [
      "Let's write some code!",
      "Ready? Let's go!",
      "Five minutes a day builds real games.",
      "You've got this!",
    ],
    tr: [
      "Hadi biraz kod yazalım!",
      "Hazır mısın? Başlıyoruz!",
      "Günde beş dakika, gerçek oyunlar yapar.",
      "Bunu yaparsın!",
    ],
  },
  complete: {
    en: [
      "Lesson complete!",
      "You're getting really good at this!",
      "Another skill unlocked!",
      "That's how real devs are made.",
      "Look at you go!",
    ],
    tr: [
      "Ders tamam!",
      "Bu işte gerçekten iyileşiyorsun!",
      "Yeni bir yetenek açıldı!",
      "Gerçek geliştiriciler böyle yetişir.",
      "Durdurulamıyorsun!",
    ],
  },
  perfect: {
    en: ["Flawless! Not a single mistake!", "Perfect lesson!"],
    tr: ["Kusursuz! Tek bir hata bile yok!", "Mükemmel ders!"],
  },
  hearts: {
    en: [
      "Read the notes and try again. This time you'll crush it!",
      "What you learned is still here. One more try!",
    ],
    tr: [
      "Notlara göz at ve tekrar dene. Bu sefer olacak!",
      "Öğrendiklerin hâlâ seninle. Bir deneme daha!",
    ],
  },
  homework: {
    en: [
      "Boss level! Write real code, the simulator checks it.",
      "Final challenge: your code runs in a mini Roblox server.",
    ],
    tr: [
      "Boss seviyesi! Gerçek kod yaz, simülatör kontrol etsin.",
      "Son görev: kodun mini bir Roblox server'ında çalışacak.",
    ],
  },
} satisfies Record<string, Pool>;

export type MotivationKind = keyof typeof POOLS;

export function motivate(
  kind: MotivationKind,
  lang: Lang,
  vars: Record<string, string | number> = {},
  rand: () => number = Math.random,
): string {
  const list = POOLS[kind][lang];
  const line = list[Math.floor(rand() * list.length)] ?? list[0];
  return line.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** Greeting for the path page, by time of day. */
export function greeting(lang: Lang, hour = new Date().getHours()): string {
  if (lang === "tr") {
    if (hour < 5) return "Gece kuşu musun? 🦉 Hadi bir ders!";
    if (hour < 12) return "Günaydın! ☀️ Bir ders, kahveden iyidir.";
    if (hour < 18) return "Tünaydın! Hadi bir şey inşa edelim.";
    return "İyi akşamlar! 🌙 Günü bir dersle kapat.";
  }
  if (hour < 5) return "Night owl? 🦉 One quick lesson!";
  if (hour < 12) return "Good morning! ☀️ A lesson beats coffee.";
  if (hour < 18) return "Good afternoon! Let's build something.";
  return "Good evening! 🌙 End the day with a lesson.";
}

export { POOLS as MOTIVATION_POOLS };
