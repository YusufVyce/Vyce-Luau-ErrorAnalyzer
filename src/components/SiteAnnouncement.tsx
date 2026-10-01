import { useState } from "react";
import { AlertTriangle, Megaphone, X } from "lucide-react";
import { useSiteSettings } from "@/lib/account/site";
import { useT } from "@/lib/prefs";

const DISMISS_KEY = "vyce.announcement.dismissed";

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

/** The note an admin set for every page; each visitor can close it until it changes. */
export function SiteAnnouncement() {
  const t = useT();
  const site = useSiteSettings();
  const [dismissed, setDismissed] = useState<string | null>(() =>
    typeof window === "undefined" ? null : readDismissed(),
  );
  const text = site?.announcement.trim();
  if (!site || !text || dismissed === text) return null;
  const warn = site.tone === "warn";
  const Icon = warn ? AlertTriangle : Megaphone;
  return (
    <div
      role="status"
      className={`relative z-30 border-b ${
        warn
          ? "border-amber-400/30 bg-amber-400/10 text-[var(--tint-warn)]"
          : "border-brand-line bg-brand-soft text-ink"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-start gap-2.5 px-4 py-2 text-[13px] leading-relaxed">
        <Icon
          className={`mt-0.5 h-4 w-4 shrink-0 ${warn ? "text-[var(--tint-warn)]" : "text-brand"}`}
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 break-words">{text}</p>
        <button
          type="button"
          onClick={() => {
            setDismissed(text);
            try {
              localStorage.setItem(DISMISS_KEY, text);
            } catch {
              // private mode: it just shows again next time
            }
          }}
          className="-my-0.5 rounded-md p-1 opacity-70 hover:opacity-100"
          aria-label={t("adm.dismissNotice")}
          title={t("adm.dismissNotice")}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
