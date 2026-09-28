/// <reference lib="webworker" />
import { challengeById } from "@/lib/challenges/challenges";
import { runChallenge } from "@/lib/challenges/runner";
import { exerciseFor } from "./exercises";
import { runHomework } from "./harness";
import { runSample, type SampleModule } from "../runSample";

type Job = {
  id: number;
  lessonId?: string;
  challengeId?: string;
  sample?: { where?: string; modules: SampleModule[] };
  code: string;
  lang?: "en" | "tr";
};

self.onmessage = (e: MessageEvent<Job>) => {
  const { id, lessonId, challengeId, sample, code, lang = "en" } = e.data;
  try {
    if (sample) {
      self.postMessage({ id, result: runSample(code, sample.where, sample.modules) });
      return;
    }
    if (challengeId) {
      const ch = challengeById(challengeId);
      if (!ch) throw new Error("Unknown challenge");
      self.postMessage({ id, result: runChallenge(ch, code, lang) });
      return;
    }
    const exercise = exerciseFor(lessonId ?? "");
    if (!exercise) throw new Error("No homework for this lesson");
    self.postMessage({ id, result: runHomework(exercise, code, lang) });
  } catch (err) {
    self.postMessage({ id, error: (err as Error).message });
  }
};
