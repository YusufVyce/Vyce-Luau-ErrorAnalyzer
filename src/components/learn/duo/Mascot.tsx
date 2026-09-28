import type { ReactNode } from "react";

export type Mood = "idle" | "happy" | "cheer" | "sad" | "think";

const EYE = "#89ddff";

function Eyes({ mood }: { mood: Mood }) {
  if (mood === "happy" || mood === "cheer") {
    return (
      <g stroke={EYE} strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M40 59 Q46 48 52 59" />
        <path d="M68 59 Q74 48 80 59" />
      </g>
    );
  }
  if (mood === "sad") {
    return (
      <g>
        <g stroke={EYE} strokeWidth="3" strokeLinecap="round">
          <path d="M40 49 L52 45" />
          <path d="M68 45 L80 49" />
        </g>
        <rect x="41" y="53" width="10" height="8" rx="4" fill={EYE} />
        <rect x="69" y="53" width="10" height="8" rx="4" fill={EYE} />
      </g>
    );
  }
  const dx = mood === "think" ? 4 : 0;
  const dy = mood === "think" ? -4 : 0;
  return (
    <g className="vy-m-eyes" fill={EYE}>
      <rect x={41 + dx} y={47 + dy} width="10" height="16" rx="5" />
      <rect x={69 + dx} y={47 + dy} width="10" height="16" rx="5" />
      <rect x={44 + dx} y={50 + dy} width="3" height="4" rx="1.5" fill="#fff" opacity="0.8" />
      <rect x={72 + dx} y={50 + dy} width="3" height="4" rx="1.5" fill="#fff" opacity="0.8" />
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  const common = { stroke: EYE, strokeWidth: 3, strokeLinecap: "round" as const, fill: "none" };
  switch (mood) {
    case "happy":
      return <path d="M53 66 Q60 72 67 66" {...common} />;
    case "cheer":
      return <ellipse cx="60" cy="67.5" rx="6" ry="4" fill={EYE} />;
    case "sad":
      return <path d="M54 70 Q60 64 66 70" {...common} />;
    case "think":
      return <circle cx="66" cy="68" r="2.4" fill={EYE} />;
    default:
      return <path d="M55 68 H65" {...common} />;
  }
}

/**
 * "Vy", the site's blocky robot mascot. Pure SVG + CSS animations
 * (float, hop, cheer, sad), so it costs nothing to load.
 */
export function Mascot({
  mood = "idle",
  size = 120,
  className = "",
  title,
}: {
  mood?: Mood;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 130"
      width={size}
      height={(size * 130) / 120}
      className={`vy-mascot shrink-0 overflow-visible ${className}`}
      data-mood={mood}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id="vyHead" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fb4ff" />
          <stop offset="1" stopColor="#c792ea" />
        </linearGradient>
        <linearGradient id="vyBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d93e8" />
          <stop offset="1" stopColor="#6a5fc4" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="125" rx="26" ry="4" fill="rgba(0,0,0,0.22)" />
      {mood === "cheer" && (
        <g fill="#ffcb6b">
          <path className="vy-pop" d="M10 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
          <path
            className="vy-pop"
            style={{ animationDelay: "150ms" }}
            d="M108 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"
          />
          <path
            className="vy-pop"
            style={{ animationDelay: "300ms" }}
            d="M112 70 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z"
          />
        </g>
      )}
      <g className="vy-m-body">
        <line
          x1="60"
          y1="21"
          x2="60"
          y2="10"
          stroke="#7f8db8"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle className="vy-m-bulb" cx="60" cy="8" r="5" fill="#ffcb6b" />
        <rect className="vy-m-arm-l" x="18" y="90" width="12" height="22" rx="6" fill="#6a5fc4" />
        <rect className="vy-m-arm-r" x="90" y="90" width="12" height="22" rx="6" fill="#6a5fc4" />
        <rect x="32" y="84" width="56" height="34" rx="12" fill="url(#vyBody)" />
        <rect x="47" y="93" width="26" height="14" rx="5" fill="#0b0e16" />
        <text
          x="60"
          y="103.5"
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize="10"
          fontWeight="700"
          fill={EYE}
        >
          {"{}"}
        </text>
        <rect x="16" y="20" width="88" height="68" rx="20" fill="url(#vyHead)" />
        <rect x="24" y="25" width="38" height="7" rx="3.5" fill="#fff" opacity="0.28" />
        <rect x="26" y="36" width="68" height="40" rx="14" fill="#0b0e16" />
        <Eyes mood={mood} />
        <Mouth mood={mood} />
        <circle cx="31" cy="78" r="4" fill="#ff8cc6" opacity="0.55" />
        <circle cx="89" cy="78" r="4" fill="#ff8cc6" opacity="0.55" />
        {mood === "sad" && (
          <path d="M83 62 q3 5 0 8 q-3 -3 0 -8z" fill={EYE} opacity="0.85" className="vy-pop" />
        )}
      </g>
    </svg>
  );
}

/** A speech bubble; the tail points left (next to the mascot) or down. */
export function Bubble({
  children,
  tail = "left",
  className = "",
}: {
  children: ReactNode;
  tail?: "left" | "down";
  className?: string;
}) {
  return (
    <div
      className={`vy-bubble px-4 py-3 text-[15px] leading-snug ${tail === "down" ? "vy-bubble-up" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
