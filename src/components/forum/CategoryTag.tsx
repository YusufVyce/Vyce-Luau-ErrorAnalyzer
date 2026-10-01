import { FORUM_CATEGORIES, type ForumCategory } from "@/lib/account/shared";
import type { Lang } from "@/lib/prefs";

/** A forum category's name as a small tag. */
export function CategoryTag({ id, lang }: { id: ForumCategory; lang: Lang }) {
  const c = FORUM_CATEGORIES.find((x) => x.id === id) ?? FORUM_CATEGORIES[0];
  return (
    <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
      {lang === "tr" ? c.tr : c.en}
    </span>
  );
}
