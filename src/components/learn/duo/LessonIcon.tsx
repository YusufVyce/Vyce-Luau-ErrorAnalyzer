import { Braces } from "lucide-react";
import { LESSON_ICONS } from "./icons";

export function LessonIcon({
  id,
  className = "h-5 w-5",
  strokeWidth = 2.25,
}: {
  id: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = LESSON_ICONS[id] ?? Braces;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

/** A small treasure chest closing every unit: shut and grey, or open and glowing. */
export function Chest({ open }: { open: boolean }) {
  const body = open ? "#ffcb6b" : "currentColor";
  const dark = open ? "#b7791f" : "currentColor";
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden="true">
      {open && (
        <g className="vy-chest-glow" fill="#fff6d6">
          <path d="M24 4 l2 6 -2 3 -2 -3z" />
          <path d="M10 10 l5 4 -1 3 -4 -2z" />
          <path d="M38 10 l-5 4 1 3 4 -2z" />
        </g>
      )}
      {open ? (
        <path
          d="M8 20 L12 11 H36 L40 20 Z"
          fill={dark}
          stroke="#7a4d0b"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M8 22 V18 a8 8 0 0 1 8 -8 H32 a8 8 0 0 1 8 8 V22 Z"
          fill={body}
          fillOpacity="0.25"
          stroke={dark}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      <rect
        x="8"
        y="21"
        width="32"
        height="18"
        rx="3"
        fill={body}
        fillOpacity={open ? 1 : 0.25}
        stroke={open ? "#7a4d0b" : dark}
        strokeWidth="2"
      />
      <rect x="21" y="19" width="6" height="9" rx="2" fill={open ? "#7a4d0b" : "currentColor"} />
      <path d="M8 30 H40" stroke={open ? "#7a4d0b" : dark} strokeWidth="2" opacity="0.5" />
    </svg>
  );
}
