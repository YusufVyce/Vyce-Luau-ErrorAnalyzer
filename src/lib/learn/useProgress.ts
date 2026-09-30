import { useCallback, useEffect, useRef, useState } from "react";
import { EMPTY_PROGRESS, loadProgress, saveProgress, withToday, type Progress } from "./progress";

export type ProgressUpdate = (fn: (p: Progress) => Progress, active?: boolean) => void;

/**
 * Progress as page state: loaded after mount, saved on every update, and
 * kept up to date with changes made elsewhere (account sync, other tabs'
 * components). `active` updates also mark today for the streak.
 */
export function useProgressState() {
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [loaded, setLoaded] = useState(false);
  const current = useRef<Progress>(EMPTY_PROGRESS);

  useEffect(() => {
    current.current = loadProgress();
    setProgress(current.current);
    setLoaded(true);
    const on = (e: Event) => {
      const p = (e as CustomEvent<Progress>).detail;
      if (p === current.current) return;
      current.current = p;
      setProgress(p);
    };
    window.addEventListener("vyce-progress", on);
    return () => window.removeEventListener("vyce-progress", on);
  }, []);

  const update: ProgressUpdate = useCallback((fn, active = true) => {
    const next = active ? withToday(fn(current.current)) : fn(current.current);
    current.current = next;
    setProgress(next);
    saveProgress(next);
  }, []);

  return { progress, loaded, update };
}
