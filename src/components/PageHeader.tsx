import type { ReactNode } from "react";

/** Left-aligned page intro: a small sticker label, a big title and one paragraph. */
export function PageHeader({
  sticker,
  title,
  children,
}: {
  sticker: ReactNode;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="relative z-10 space-y-4 pt-10 pb-8 md:pt-14">
      <div className="inline-flex -rotate-2 items-center gap-1.5 rounded-md border-2 border-[#1c1a16] bg-[#ffd23f] px-2.5 py-0.5 text-[13px] font-semibold text-[#1c1a16] shadow-[2px_2px_0_#1c1a16]">
        {sticker}
      </div>
      <h1 className="serif-title max-w-3xl text-[38px] leading-[1.02] md:text-[56px]">{title}</h1>
      {children && (
        <p className="max-w-2xl text-base leading-relaxed text-zinc-300 md:text-lg">{children}</p>
      )}
    </header>
  );
}
