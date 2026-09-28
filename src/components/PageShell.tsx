import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Logo, SiteNav } from "@/components/SiteNav";
import { useT } from "@/lib/prefs";

/** Nav + page body + footer shared by every page. */
export function PageShell({
  children,
  width = "max-w-6xl",
}: {
  children: ReactNode;
  width?: string;
}) {
  const t = useT();
  useEffect(() => {
    document.body.classList.add("ep-body");
    return () => document.body.classList.remove("ep-body");
  }, []);
  return (
    <>
      <SiteNav />
      <div className={`relative mx-auto w-full ${width} px-4 pb-10`}>{children}</div>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-[13px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Logo className="scale-75" />
            <span>{t("footer.made")}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/" className="hover:text-ink">
              {t("nav.analyzer")}
            </Link>
            <Link to="/errors" className="hover:text-ink">
              {t("nav.errors")}
            </Link>
            <Link to="/learn" className="hover:text-ink">
              {t("nav.learn")}
            </Link>
            <Link to="/playground" className="hover:text-ink">
              {t("nav.playground")}
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
