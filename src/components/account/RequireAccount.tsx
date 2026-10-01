import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { LogIn, ServerCrash } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Mascot } from "@/components/learn/duo/Mascot";
import { useAccount } from "@/lib/account/client";
import type { LoginNext } from "@/routes/login";
import { useT } from "@/lib/prefs";

/**
 * Pages where progress is earned need an account: signed-out visitors are
 * sent to the login page, and come back here afterwards.
 */
export function RequireAccount({ next, children }: { next: LoginNext; children: ReactNode }) {
  const t = useT();
  const { status } = useAccount();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "signedOut") void navigate({ to: "/login", search: { next }, replace: true });
  }, [status, navigate, next]);

  if (status === "user") return <>{children}</>;

  if (status === "unavailable") {
    return (
      <PageShell>
        <div className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
          <ServerCrash className="h-10 w-10 text-amber-400" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-ink">{t("acc.downTitle")}</h1>
          <p className="text-sm leading-relaxed text-ink-2">{t("acc.downBody")}</p>
          <Link to="/" className="vy-btn">
            {t("acc.downHome")}
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Mascot mood="think" size={96} title={t("duo.loading")} />
      {status === "signedOut" && (
        <Link to="/login" search={{ next }} className="vy-btn inline-flex items-center gap-2">
          <LogIn className="h-4 w-4" aria-hidden="true" /> {t("nav.login")}
        </Link>
      )}
    </div>
  );
}
