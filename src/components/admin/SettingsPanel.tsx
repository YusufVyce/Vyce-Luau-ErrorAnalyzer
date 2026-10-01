import { useEffect, useState, type FormEvent } from "react";
import { Megaphone, Settings } from "lucide-react";
import { adminSaveSettings, getSiteNotice } from "@/lib/account/api";
import { setSiteSettings } from "@/lib/account/site";
import { accountErrorKey, DEFAULT_SETTINGS, type SiteSettings } from "@/lib/account/shared";
import { useT } from "@/lib/prefs";
import { Btn, INPUT, Notice, Panel, Segmented } from "./kit";

function Toggle({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 hover:bg-surface-2/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
      />
      <span>
        <span className="block text-[13px] font-medium text-ink">{title}</span>
        <span className="block text-[12px] text-ink-3">{hint}</span>
      </span>
    </label>
  );
}

/** Site-wide switches: an announcement on every page, closing sign-ups, a read-only forum. */
export function SettingsPanel() {
  const t = useT();
  const [s, setS] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    getSiteNotice()
      .then((r) => setS(r.ok ? r.settings : DEFAULT_SETTINGS))
      .catch(() => setS(DEFAULT_SETTINGS));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    setFlash(null);
    const r = await adminSaveSettings({ data: s }).catch(() => null);
    setBusy(false);
    if (r?.ok) {
      setS(r.settings);
      setSiteSettings(r.settings);
      setFlash({ kind: "ok", text: t("adm.saved") });
    } else setFlash({ kind: "error", text: t(accountErrorKey(r ? r.error : "server_error")) });
  }

  if (!s) return <div className="ep-card h-64 animate-pulse" />;
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS({ ...s, [k]: v });

  return (
    <form onSubmit={save} className="space-y-4">
      <Panel title={t("adm.announceTitle")} icon={<Megaphone className="h-4 w-4 text-brand" />}>
        <p className="text-[13px] text-ink-2">{t("adm.announceNote")}</p>
        <textarea
          value={s.announcement}
          onChange={(e) => set("announcement", e.target.value)}
          maxLength={300}
          rows={3}
          placeholder={t("adm.announcePlaceholder")}
          aria-label={t("adm.announceTitle")}
          className={INPUT}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label={t("adm.announceTone")}
            value={s.tone}
            onChange={(v) => set("tone", v)}
            options={[
              { value: "info", label: t("adm.toneInfo") },
              { value: "warn", label: t("adm.toneWarn") },
            ]}
          />
          <span className="text-[12px] text-ink-3">{s.announcement.length}/300</span>
          {s.announcement && (
            <Btn small tone="ghost" onClick={() => set("announcement", "")}>
              {t("adm.clear")}
            </Btn>
          )}
        </div>
      </Panel>
      <Panel title={t("adm.switches")} icon={<Settings className="h-4 w-4 text-brand" />}>
        <Toggle
          checked={s.signupsClosed}
          onChange={(v) => set("signupsClosed", v)}
          title={t("adm.signupsClosed")}
          hint={t("adm.signupsClosedHint")}
        />
        <Toggle
          checked={s.forumReadOnly}
          onChange={(v) => set("forumReadOnly", v)}
          title={t("adm.forumReadOnly")}
          hint={t("adm.forumReadOnlyHint")}
        />
      </Panel>
      {flash && <Notice kind={flash.kind}>{flash.text}</Notice>}
      <Btn type="submit" tone="primary" busy={busy}>
        {t("img.save")}
      </Btn>
    </form>
  );
}
