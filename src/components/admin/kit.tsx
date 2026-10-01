import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useLang } from "@/lib/prefs";

/** A titled card in the admin panel. */
export function Panel({
  title,
  icon,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ep-card space-y-4 p-4 sm:p-5 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              {icon}
              {title}
            </h2>
          )}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = "default" | "primary" | "danger" | "ghost";

const TONES: Record<Tone, string> = {
  default: "border border-line bg-surface text-ink-2 hover:border-brand-line hover:text-ink",
  primary: "ep-cta font-semibold",
  danger:
    "border border-red-500/40 bg-red-500/10 text-[var(--bad-ink)] hover:bg-red-500/20 font-medium",
  ghost: "text-ink-3 hover:bg-surface-2 hover:text-ink",
};

export function Btn({
  tone = "default",
  busy = false,
  small = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  busy?: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
        small ? "px-2 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]"
      } ${TONES[tone]} ${className}`}
      {...rest}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export const INPUT =
  "w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder-zinc-500 focus:border-brand-line focus:outline-none";

/** A row of mutually exclusive choices. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap rounded-lg border border-line bg-surface p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
            o.value === value ? "bg-brand-soft text-brand" : "text-ink-3 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A green or red line under an action. */
export function Notice({ kind, children }: { kind: "ok" | "error"; children: ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-[13px] ${
        kind === "ok"
          ? "border-emerald-500/30 bg-emerald-500/10 text-[var(--ok-ink)]"
          : "border-red-500/30 bg-red-500/10 text-[var(--bad-ink)]"
      }`}
    >
      {children}
    </p>
  );
}

export function Pill({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "bad" | "ok" | "warn" | "info";
  children: ReactNode;
}) {
  const cls = {
    muted: "border-line text-ink-3",
    bad: "border-red-500/40 bg-red-500/10 text-[var(--bad-ink)]",
    ok: "border-emerald-500/40 bg-emerald-500/10 text-[var(--ok-ink)]",
    warn: "border-amber-400/40 bg-amber-400/10 text-[var(--warn-ink)]",
    info: "border-sky-400/40 bg-sky-400/10 text-[var(--info-ink)]",
  }[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

export function Pager({
  page,
  total,
  size,
  onPage,
  label,
}: {
  page: number;
  total: number;
  size: number;
  onPage: (p: number) => void;
  label: (n: number, total: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-3 text-[13px]" aria-label="Pages">
      <Btn small disabled={page <= 0} onClick={() => onPage(page - 1)}>
        ←
      </Btn>
      <span className="text-ink-3">{label(page + 1, pages)}</span>
      <Btn small disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>
        →
      </Btn>
    </nav>
  );
}

/** Number and date formatting in the page language. */
export function useFormat() {
  const lang = useLang();
  const locale = lang === "tr" ? "tr-TR" : "en-US";
  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const whole = new Intl.NumberFormat(locale);
  return {
    locale,
    num: (n: number) => whole.format(n),
    compact: (n: number) => (Math.abs(n) < 10_000 ? whole.format(n) : compact.format(n)),
    date: (ms: number | string) =>
      new Date(ms).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }),
    dateTime: (ms: number | string) =>
      new Date(ms).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }),
    day: (day: string) =>
      new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric" }),
    bytes: (b: number) => {
      if (b < 1024) return `${b} B`;
      if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
      return `${(b / 1024 / 1024).toFixed(1)} MB`;
    },
  };
}
