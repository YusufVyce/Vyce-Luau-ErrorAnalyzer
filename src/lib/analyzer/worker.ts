import { detectCodeLanguage, resolvePlatform } from "./language";
import { buildCodeFacts } from "./parser";
import { inferCause } from "./inference";
import type { Platform } from "./types";

type Request = {
  id: string;
  logText: string;
  codeText: string;
  platform?: Platform | "auto";
};

type Response = {
  id: string;
  result: any;
};

self.addEventListener("message", (ev: MessageEvent<Request>) => {
  const { id, logText, codeText, platform } = ev.data;
  const timings: Record<string, number> = {};
  const totalStart = performance.now();

  const t0 = performance.now();
  const resolvedPlatform = resolvePlatform(logText, codeText, platform);
  timings.resolvePlatform = performance.now() - t0;

  const t1 = performance.now();
  const language = detectCodeLanguage(codeText);
  timings.detectLanguage = performance.now() - t1;

  const t2 = performance.now();
  // Delegate heavy parsing to the parser (runs in worker thread)
  const codeFacts = buildCodeFacts(codeText, language);
  timings.buildCodeFacts = performance.now() - t2;

  const t3 = performance.now();
  const analysis = inferCause(logText, codeFacts, resolvedPlatform);
  timings.inferCause = performance.now() - t3;

  const total = performance.now() - totalStart;
  timings.total = total;

  // Attach timings into the result (non-breaking, optional field)
  try {
    analysis.timings = timings;
  } catch (e) {
    // ignore
  }

  const payload: Response = { id, result: analysis };
  // Use postMessage to send result back to main thread
  // Cloneable structured object
  // @ts-ignore - worker global
  self.postMessage(payload);
});

export {};
