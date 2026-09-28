/// <reference lib="webworker" />
import { exerciseFor } from "./exercises";
import { runHomework } from "./harness";

self.onmessage = (
  e: MessageEvent<{ id: number; lessonId: string; code: string; lang?: "en" | "tr" }>,
) => {
  const { id, lessonId, code, lang = "en" } = e.data;
  const exercise = exerciseFor(lessonId);
  if (!exercise) {
    self.postMessage({ id, error: "No homework for this lesson" });
    return;
  }
  try {
    self.postMessage({ id, result: runHomework(exercise, code, lang) });
  } catch (err) {
    self.postMessage({ id, error: (err as Error).message });
  }
};
