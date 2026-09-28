/**
 * Runs homework off the main thread so an endless loop in student code can
 * never freeze the page. Falls back to the main thread if workers aren't
 * available (e.g. very old browsers).
 */
import type { HomeworkResult } from "./harness";

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

export async function checkHomework(
  lessonId: string,
  code: string,
  lang: "en" | "tr" = "en",
  timeoutMs = 12000,
): Promise<HomeworkResult> {
  const w = getWorker();
  if (!w) {
    const [{ exerciseFor }, { runHomework }] = await Promise.all([
      import("./exercises"),
      import("./harness"),
    ]);
    const ex = exerciseFor(lessonId);
    if (!ex) throw new Error("No homework for this lesson");
    return runHomework(ex, code, lang);
  }
  const id = ++seq;
  return new Promise<HomeworkResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, lessonId, code, lang });
    setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      // A stuck run: restart the worker so the next check starts clean.
      worker?.terminate();
      worker = undefined;
      reject(
        new Error(
          lang === "tr"
            ? "Kodunun çalışması çok uzun sürdü. task.wait() olmayan bir döngü mü var?"
            : "Your code took too long to run. Is there a loop without task.wait()?",
        ),
      );
    }, timeoutMs);
  });
}
