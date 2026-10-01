import { useState } from "react";
import { imageUrl } from "@/lib/account/shared";

/**
 * A player's profile photo, or their initial on the site's gradient when
 * they haven't uploaded one (or it fails to load).
 */
export function Avatar({
  id,
  name,
  avatar,
  size = 36,
  round = false,
  className = "",
}: {
  id: string;
  name: string;
  /** Photo version; 0 shows the initial. */
  avatar: number;
  size?: number;
  /** A circle instead of a rounded square. */
  round?: boolean;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  const radius = round
    ? "rounded-full"
    : size >= 64
      ? "rounded-2xl"
      : size >= 28
        ? "rounded-xl"
        : "rounded-md";
  if (avatar > 0 && !broken) {
    return (
      <img
        src={imageUrl(id, "avatar", avatar)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        style={style}
        className={`shrink-0 bg-surface-2 object-cover ${radius} ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: Math.max(10, Math.round(size * 0.42)) }}
      className={`inline-flex shrink-0 items-center justify-center bg-[linear-gradient(135deg,var(--brand),var(--syn-purple))] font-mono font-bold text-white ${radius} ${className}`}
    >
      {(name || "?")[0]?.toUpperCase()}
    </span>
  );
}
