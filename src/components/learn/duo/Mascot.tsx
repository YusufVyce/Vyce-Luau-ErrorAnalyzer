import { useId, type ReactNode } from "react";

export type Mood = "idle" | "happy" | "cheer" | "sad" | "think" | "wow" | "love" | "sleepy";

const EYE = "#89ddff";
const HEART = "#ff6b9a";

const heart = (x: number, y: number, s: number) =>
  `M${x} ${y + s * 0.3} C${x} ${y - s * 0.2} ${x - s} ${y - s * 0.2} ${x - s} ${y + s * 0.3} C${x - s} ${y + s * 0.8} ${x} ${y + s * 1.1} ${x} ${y + s * 1.3} C${x} ${y + s * 1.1} ${x + s} ${y + s * 0.8} ${x + s} ${y + s * 0.3} C${x + s} ${y - s * 0.2} ${x} ${y - s * 0.2} ${x} ${y + s * 0.3}Z`;

function Eyes({ mood }: { mood: Mood }) {
  const line = { stroke: EYE, strokeWidth: 4.5, strokeLinecap: "round" as const, fill: "none" };
  switch (mood) {
    case "happy":
    case "cheer":
      return (
        <g {...line}>
          <path d="M40 59 Q46 48 52 59" />
          <path d="M68 59 Q74 48 80 59" />
        </g>
      );
    case "sleepy":
      return (
        <g {...line} strokeWidth={3.5}>
          <path d="M40 55 Q46 60 52 55" />
          <path d="M68 55 Q74 60 80 55" />
        </g>
      );
    case "love":
      return (
        <g className="vy-m-hearteyes" fill={HEART}>
          <path d={heart(46, 49, 7)} />
          <path d={heart(74, 49, 7)} />
        </g>
      );
    case "wow":
      return (
        <g>
          <circle cx="46" cy="55" r="8.5" fill={EYE} />
          <circle cx="74" cy="55" r="8.5" fill={EYE} />
          <circle cx="46" cy="55" r="3.2" fill="#0b0e16" />
          <circle cx="74" cy="55" r="3.2" fill="#0b0e16" />
          <circle cx="49" cy="51.5" r="1.8" fill="#fff" />
          <circle cx="77" cy="51.5" r="1.8" fill="#fff" />
        </g>
      );
    case "sad":
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
    default: {
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
  }
}

function Mouth({ mood }: { mood: Mood }) {
  const common = { stroke: EYE, strokeWidth: 3, strokeLinecap: "round" as const, fill: "none" };
  switch (mood) {
    case "happy":
    case "love":
      return <path d="M53 66 Q60 72 67 66" {...common} />;
    case "cheer":
      return <path d="M53 65 Q60 75 67 65 Z" fill={EYE} />;
    case "wow":
      return <ellipse className="vy-m-mouth-o" cx="60" cy="69" rx="4" ry="5" fill={EYE} />;
    case "sad":
      return <path d="M54 70 Q60 64 66 70" {...common} />;
    case "sleepy":
      return <ellipse className="vy-m-snore" cx="60" cy="68.5" rx="3" ry="2.4" fill={EYE} />;
    case "think":
      return <circle cx="66" cy="68" r="2.4" fill={EYE} />;
    default:
      return <path d="M55 68 H65" {...common} />;
  }
}

/** Little extras around the robot for each mood (sparkles, hearts, Zzz…). */
function Effects({ mood }: { mood: Mood }) {
  switch (mood) {
    case "cheer":
      return (
        <g fill="#ffcb6b">
          <path className="vy-m-twinkle" d="M10 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
          <path
            className="vy-m-twinkle"
            style={{ animationDelay: "300ms" }}
            d="M108 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"
          />
          <path
            className="vy-m-twinkle"
            style={{ animationDelay: "600ms" }}
            d="M112 70 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z"
          />
          <path
            className="vy-m-twinkle"
            style={{ animationDelay: "900ms" }}
            fill="#89ddff"
            d="M6 78 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z"
          />
        </g>
      );
    case "love":
      return (
        <g fill={HEART}>
          <path className="vy-m-float-up" d={heart(104, 30, 6)} />
          <path
            className="vy-m-float-up"
            style={{ animationDelay: "700ms" }}
            d={heart(14, 40, 5)}
          />
          <path
            className="vy-m-float-up"
            style={{ animationDelay: "1400ms" }}
            d={heart(110, 64, 4)}
          />
        </g>
      );
    case "sleepy":
      return (
        <g
          fill="#a6afc2"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight="800"
          className="select-none"
        >
          <text className="vy-m-float-up" x="96" y="26" fontSize="14">
            Z
          </text>
          <text
            className="vy-m-float-up"
            style={{ animationDelay: "800ms" }}
            x="106"
            y="14"
            fontSize="10"
          >
            z
          </text>
          <text
            className="vy-m-float-up"
            style={{ animationDelay: "1600ms" }}
            x="112"
            y="4"
            fontSize="8"
          >
            z
          </text>
        </g>
      );
    case "think":
      return (
        <g fill="#a6afc2">
          <circle className="vy-m-dot" cx="94" cy="16" r="3" />
          <circle
            className="vy-m-dot"
            style={{ animationDelay: "200ms" }}
            cx="103"
            cy="10"
            r="3.5"
          />
          <circle className="vy-m-dot" style={{ animationDelay: "400ms" }} cx="113" cy="4" r="4" />
        </g>
      );
    case "wow":
      return (
        <g className="vy-m-exclaim" fill="#ffcb6b">
          <rect x="103" y="6" width="6" height="18" rx="3" />
          <circle cx="106" cy="30" r="3.5" />
        </g>
      );
    default:
      return null;
  }
}

/**
 * "Vy", the site's blocky robot mascot. Pure SVG + CSS animations: it
 * floats, blinks, glances around, waves, jumps, cries, dreams… so it costs
 * nothing to load. Animations are switched off for reduced motion.
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
  const uid = useId().replace(/:/g, "");
  const head = `vyHead${uid}`;
  const body = `vyBody${uid}`;
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
        <linearGradient id={head} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fb4ff" />
          <stop offset="1" stopColor="#c792ea" />
        </linearGradient>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d93e8" />
          <stop offset="1" stopColor="#6a5fc4" />
        </linearGradient>
      </defs>
      <ellipse className="vy-m-shadow" cx="60" cy="125" rx="26" ry="4" fill="rgba(0,0,0,0.22)" />
      <Effects mood={mood} />
      <g className="vy-m-body">
        <g className="vy-m-antenna">
          <line
            x1="60"
            y1="21"
            x2="60"
            y2="10"
            stroke="#7f8db8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            className="vy-m-bulb"
            cx="60"
            cy="8"
            r="5"
            fill={mood === "love" ? HEART : mood === "sad" ? "#6f788c" : "#ffcb6b"}
          />
        </g>
        <rect className="vy-m-arm-l" x="18" y="90" width="12" height="22" rx="6" fill="#6a5fc4" />
        <rect className="vy-m-arm-r" x="90" y="90" width="12" height="22" rx="6" fill="#6a5fc4" />
        <rect x="32" y="84" width="56" height="34" rx="12" fill={`url(#${body})`} />
        <rect x="47" y="93" width="26" height="14" rx="5" fill="#0b0e16" />
        <text
          className="vy-m-chest"
          x="60"
          y="103.5"
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize="10"
          fontWeight="700"
          fill={mood === "love" ? HEART : EYE}
        >
          {mood === "think" ? "..." : mood === "love" ? "<3" : mood === "sad" ? ":(" : "{}"}
        </text>
        <g className="vy-m-head">
          <rect x="16" y="20" width="88" height="68" rx="20" fill={`url(#${head})`} />
          <rect x="24" y="25" width="38" height="7" rx="3.5" fill="#fff" opacity="0.28" />
          <rect x="26" y="36" width="68" height="40" rx="14" fill="#0b0e16" />
          <g className="vy-m-face">
            <Eyes mood={mood} />
            <Mouth mood={mood} />
          </g>
          <circle
            cx="31"
            cy="78"
            r="4"
            fill="#ff8cc6"
            opacity={mood === "love" || mood === "cheer" ? 0.9 : 0.55}
          />
          <circle
            cx="89"
            cy="78"
            r="4"
            fill="#ff8cc6"
            opacity={mood === "love" || mood === "cheer" ? 0.9 : 0.55}
          />
          {mood === "sad" && (
            <path className="vy-m-tear" d="M83 62 q3 5 0 8 q-3 -3 0 -8z" fill={EYE} />
          )}
        </g>
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
