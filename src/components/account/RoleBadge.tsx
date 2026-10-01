import { Crown, ShieldCheck } from "lucide-react";
import type { Role } from "@/lib/account/shared";
import { useT } from "@/lib/prefs";

/** "Founder" for the site owner, "Admin" for the people the owner added. */
export function RoleBadge({ role, className = "" }: { role?: Role; className?: string }) {
  const t = useT();
  if (!role) return null;
  const Icon = role === "owner" ? Crown : ShieldCheck;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
        role === "owner"
          ? "border-amber-400/40 bg-amber-400/10 text-[var(--tint-warn)]"
          : "border-sky-400/40 bg-sky-400/10 text-[var(--tint-info)]"
      } ${className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {t(role === "owner" ? "role.owner" : "role.admin")}
    </span>
  );
}
