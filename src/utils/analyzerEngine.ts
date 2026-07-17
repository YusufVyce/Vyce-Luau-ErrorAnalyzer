import { analyzeCodeContext, type AnalyzerResult } from "@/lib/analyzer/engine";
import { detectCodeLanguage, resolvePlatform } from "@/lib/analyzer/language";
import { buildCodeFacts } from "@/lib/analyzer/parser";
import { inferCause } from "@/lib/analyzer/inference";
import type { Platform } from "@/lib/error-parser";

export type { Platform } from "@/lib/error-parser";
export type { AnalyzerResult };

let worker: Worker | null = null;
const pending = new Map<string, (res: AnalyzerResult) => void>();

function initWorker() {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    // worker is located relative to this file: ../lib/analyzer/worker.ts
    // Vite will bundle this when using new URL(..., import.meta.url)
    // @ts-ignore
    worker = new Worker(new URL("../lib/analyzer/worker.ts", import.meta.url), { type: "module" });
    worker.addEventListener("message", (ev: MessageEvent) => {
      const { id, result } = ev.data as { id: string; result: AnalyzerResult };
      const resolver = pending.get(id);
      if (resolver) {
        resolver(result);
        pending.delete(id);
      }
    });
    return worker;
  } catch (e) {
    // worker not supported or bundler issue — fall back to sync
    worker = null;
    return null;
  }
}

export async function analyzeErrorAndCode(
  logText: string,
  codeText: string,
  platformFilter?: Platform | "auto",
): Promise<AnalyzerResult> {
  // If running in an environment without a Window or Worker, fall back to sync analysis
  const w = initWorker();
  if (!w) {
    // run synchronously (SSR or unsupported) but still measure per-stage timings
    const timings: Record<string, number> = {};
    const totalStart = typeof performance !== "undefined" ? performance.now() : Date.now();

    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const resolvedPlatform = resolvePlatform(logText, codeText, platformFilter);
    timings.resolvePlatform = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;

    const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const language = detectCodeLanguage(codeText);
    timings.detectLanguage = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t1;

    const t2 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const codeFacts = buildCodeFacts(codeText, language);
    timings.buildCodeFacts = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t2;

    const t3 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const result = inferCause(logText, codeFacts, resolvedPlatform);
    timings.inferCause = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t3;

    timings.total = (typeof performance !== "undefined" ? performance.now() : Date.now()) - totalStart;
    try {
      (result as any).timings = timings;
    } catch {}
    return result;
  }

  return await new Promise<AnalyzerResult>((resolve) => {
    const id = String(Date.now()) + Math.random();
    pending.set(id, resolve);
    w.postMessage({ id, logText, codeText, platform: platformFilter });
  });
}
