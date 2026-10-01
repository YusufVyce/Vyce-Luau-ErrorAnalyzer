import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useT } from "@/lib/prefs";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  hint?: string;
  value: string;
  onValue: (v: string) => void;
};

const INPUT =
  "w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-ink placeholder-zinc-500 focus:border-brand-line focus:outline-none";

/** Labeled text input used by the account forms. */
export function Field({ label, hint, value, onValue, ...rest }: InputProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onValue(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={INPUT}
        {...rest}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-[12px] text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField({ label, hint, value, onValue, ...rest }: InputProps) {
  const t = useT();
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onValue(e.target.value)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${INPUT} pr-11`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={t(shown ? "acc.hide" : "acc.show")}
          title={t(shown ? "acc.hide" : "acc.show")}
          className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-ink-3 hover:text-ink"
        >
          {shown ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-[12px] text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Error line under a form. */
export function FormError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
      {children}
    </p>
  );
}

/** Labeled multi-line text box (forum posts). */
export function TextArea({
  label,
  hint,
  value,
  onValue,
  rows = 6,
  maxLength,
  required,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onValue: (v: string) => void;
  rows?: number;
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onValue(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`${INPUT} resize-y font-[inherit] leading-relaxed`}
      />
      {hint && (
        <p id={`${id}-hint`} className="flex justify-between gap-3 text-[12px] text-ink-3">
          <span>{hint}</span>
          {maxLength ? (
            <span className="shrink-0 font-mono">
              {value.length}/{maxLength}
            </span>
          ) : null}
        </p>
      )}
    </div>
  );
}
