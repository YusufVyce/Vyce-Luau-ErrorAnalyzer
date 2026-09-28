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
      <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 font-mono text-[12px] text-ink-2 backdrop-blur">
        <span className="ep-dot" />
        {sticker}
      </div>
      <h1
        className={`serif-title max-w-3xl text-[40px] leading-[1.02] md:text-[60px] ${center ? "mx-auto" : ""}`}
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
