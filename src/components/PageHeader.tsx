import type { ReactNode } from "react";

/** Page intro: a small label, a big title and one paragraph. */
export function PageHeader({
  sticker,
  title,
  children,
  center = false,
}: {
  sticker: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  center?: boolean;
}) {
  return (
    <header
      className={`relative z-10 space-y-4 pt-12 pb-10 md:pt-16 ${center ? "text-center" : ""}`}
    >
      <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[13px] font-medium text-ink-2 shadow-sm">
        {sticker}
      </div>
      <h1
        className={`serif-title max-w-3xl text-[36px] leading-[1.05] md:text-[54px] ${center ? "mx-auto" : ""}`}
      >
        {title}
      </h1>
      {children && (
        <p
          className={`max-w-2xl text-base leading-relaxed text-ink-2 md:text-lg ${center ? "mx-auto" : ""}`}
        >
          {children}
        </p>
      )}
    </header>
  );
}
