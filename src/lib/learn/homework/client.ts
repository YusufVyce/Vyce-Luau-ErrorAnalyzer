/**
 * Runs homework off the main thread so an endless loop in student code can
 * never freeze the page. Falls back to the main thread if workers aren't
 * available (e.g. very old browsers).
 */
import type { HomeworkResult } from "./harness";
import type { SampleModule, SampleResult } from "../runSample";

let worker: Worker | undefined;
let seq = 0;
const pending = new Map<
  number,
  { resolve: (r: HomeworkResult) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker | undefined {
  if (typeof window === "undefined" || typeof Worker === "undefined") return undefined;
  if (!worker) {
    try {
      worker = new Worker(new URL("./homework.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (
        e: MessageEvent<{ id: number; result?: HomeworkResult; error?: string }>,
      ) => {
        const p = pending.get(e.data.id);
        if (!p) return;
        pending.delete(e.data.id);
        if (e.data.result) p.resolve(e.data.result);
        else p.reject(new Error(e.data.error ?? "Unknown error"));
      };
      worker.onerror = () => {
        for (const p of pending.values()) p.reject(new Error("The code runner crashed"));
        pending.clear();
        worker?.terminate();
        worker = undefined;
      };
    } catch {
      worker = undefined;
    }
  }
  return worker;
}

type Job = {
  lessonId?: string;
  challengeId?: string;
  sample?: { where?: string; modules: SampleModule[] };
  code: string;
  lang: "en" | "tr";
};

async function runOnMainThread(job: Job): Promise<HomeworkResult> {
  if (job.sample) {
    const { runSample } = await import("../runSample");
    return runSample(job.code, job.sample.where, job.sample.modules) as unknown as HomeworkResult;
  }
  if (job.challengeId) {
    const [{ challengeById }, { runChallenge }] = await Promise.all([
      import("@/lib/challenges/challenges"),
      import("@/lib/challenges/runner"),
    ]);
    const ch = challengeById(job.challengeId);
    if (!ch) throw new Error("Unknown challenge");
    return runChallenge(ch, job.code, job.lang);
  }
  const [{ exerciseFor }, { runHomework }] = await Promise.all([
    import("./exercises"),
    import("./harness"),
  ]);
  const ex = exerciseFor(job.lessonId ?? "");
  if (!ex) throw new Error("No homework for this lesson");
  return runHomework(ex, job.code, job.lang);
}

function run(job: Job, timeoutMs: number): Promise<HomeworkResult> {
  const w = getWorker();
  if (!w) return runOnMainThread(job);
  const id = ++seq;
  return new Promise<HomeworkResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, ...job });
    setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      // A stuck run: restart the worker so the next check starts clean.
      worker?.terminate();
      worker = undefined;
      reject(
        new Error(
          job.lang === "tr"
            ? "Kodunun çalışması çok uzun sürdü. task.wait() olmayan bir döngü mü var?"
            : "Your code took too long to run. Is there a loop without task.wait()?",
        ),
      );
    }, timeoutMs);
  });
}

export function checkHomework(
  lessonId: string,
  code: string,
  lang: "en" | "tr" = "en",
  timeoutMs = 12000,
): Promise<HomeworkResult> {
  return run({ lessonId, code, lang }, timeoutMs);
}

export function checkChallenge(
  challengeId: string,
  code: string,
  lang: "en" | "tr" = "en",
  timeoutMs = 12000,
): Promise<HomeworkResult> {
  return run({ challengeId, code, lang }, timeoutMs);
}

/** Runs a lesson code sample (off the main thread when possible). */
export function runLessonSample(
  code: string,
  where: string | undefined,
  modules: SampleModule[],
  lang: "en" | "tr" = "en",
): Promise<SampleResult> {
  return run({ sample: { where, modules }, code, lang }, 12000) as unknown as Promise<SampleResult>;
}
