import { useEffect, useState } from "react";
import { getSiteNotice } from "./api";
import { DEFAULT_SETTINGS, type SiteSettings } from "./shared";

/**
 * The site-wide switches and announcement, fetched once per page load and
 * shared by every component that asks (the admin panel refreshes them).
 */
let current: SiteSettings | null = null;
let pending: Promise<SiteSettings> | null = null;
const listeners = new Set<(s: SiteSettings) => void>();

function load(): Promise<SiteSettings> {
  pending ??= getSiteNotice()
    .then((r) => (r.ok ? r.settings : DEFAULT_SETTINGS))
    .catch(() => DEFAULT_SETTINGS)
    .then((s) => {
      current = s;
      listeners.forEach((l) => l(s));
      return s;
    });
  return pending;
}

/** Shows new settings everywhere right away (after the admin panel saves them). */
export function setSiteSettings(s: SiteSettings) {
  current = s;
  pending = Promise.resolve(s);
  listeners.forEach((l) => l(s));
}

export function useSiteSettings(): SiteSettings | null {
  const [s, setS] = useState<SiteSettings | null>(current);
  useEffect(() => {
    listeners.add(setS);
    if (!current) void load();
    else setS(current);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}
