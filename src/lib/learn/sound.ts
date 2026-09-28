/**
 * Tiny sound effects made with the Web Audio API (no audio files). Muting is
 * remembered in this browser.
 */
const KEY = "vyce-sound";

let ctx: AudioContext | null = null;

export function soundOn(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // storage blocked: the setting lasts until reload
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  length: number,
  type: OscillatorType = "sine",
  volume = 0.12,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ac.currentTime + start;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + length + 0.02);
}

export type Sfx = "correct" | "wrong" | "complete" | "tap" | "combo";

export function play(sfx: Sfx) {
  if (!soundOn()) return;
  const ac = audio();
  if (!ac) return;
  try {
    switch (sfx) {
      case "tap":
        tone(ac, 660, 0, 0.06, "triangle", 0.05);
        break;
      case "correct":
        tone(ac, 784, 0, 0.14, "triangle");
        tone(ac, 1175, 0.09, 0.22, "triangle");
        break;
      case "combo":
        tone(ac, 880, 0, 0.1, "triangle");
        tone(ac, 1109, 0.07, 0.1, "triangle");
        tone(ac, 1319, 0.14, 0.24, "triangle");
        break;
      case "wrong":
        tone(ac, 220, 0, 0.18, "sawtooth", 0.06);
        tone(ac, 185, 0.12, 0.26, "sawtooth", 0.06);
        break;
      case "complete":
        [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, i * 0.11, 0.3, "triangle", 0.1));
        tone(ac, 1319, 0.5, 0.6, "sine", 0.08);
        break;
    }
  } catch {
    // audio can fail on some browsers: sounds are optional
  }
}
