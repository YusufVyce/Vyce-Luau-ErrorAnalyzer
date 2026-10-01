import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/** Width of an element, following resizes. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** A round axis maximum: 1, 2, 2.5, 5 or 10 times a power of ten. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

/** A column with a 4px rounded top and a square foot on the baseline. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export interface ColumnPoint {
  /** Axis / tooltip label (e.g. "Sep 3"). */
  label: string;
  value: number;
}

const PLOT_H = 120;
const AXIS_W = 40;
const X_BAND = 22;

/**
 * One series over time as columns: hairline grid, three round ticks, the
 * highest day labeled, and a tooltip on hover or arrow keys.
 */
export function ColumnChart({
  title,
  points,
  format,
}: {
  title: string;
  points: ColumnPoint[];
  format: (n: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const n = points.length;
  const plotW = Math.max(0, width - AXIS_W);
  const band = n > 0 ? plotW / n : 0;
  const barW = Math.max(1, Math.min(24, band - 2));
  const top = Math.max(0, ...points.map((p) => p.value));
  const max = Math.max(2, niceMax(top));
  // Counts: only whole-number ticks.
  const ticks = Number.isInteger(max / 2) ? [0, max / 2, max] : [0, max];
  const y = (v: number) => PLOT_H - (v / max) * PLOT_H;
  const peak = top > 0 ? points.findIndex((p) => p.value === top) : -1;
  const xLabels = n > 0 ? [0, Math.floor((n - 1) / 2), n - 1] : [];

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - box.left - AXIS_W) / band);
    setActive(i >= 0 && i < n ? i : null);
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setActive((a) => {
      const cur = a ?? n - 1;
      return Math.max(0, Math.min(n - 1, cur + (e.key === "ArrowLeft" ? -1 : 1)));
    });
  }

  const tip = active !== null ? points[active] : null;
  const tipX = active !== null ? AXIS_W + band * active + band / 2 : 0;

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg
          width={width}
          height={PLOT_H + X_BAND + 8}
          role="img"
          aria-label={title}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
          className="block overflow-visible rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand)]"
        >
          <g transform="translate(0,8)">
            {ticks.map((tk) => (
              <g key={tk}>
                <line
                  x1={AXIS_W}
                  x2={width}
                  y1={y(tk)}
                  y2={y(tk)}
                  stroke="var(--line)"
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={AXIS_W - 8}
                  y={y(tk)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-[var(--ink-3)] text-[10px] tabular-nums"
                >
                  {format(tk)}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const h = (p.value / max) * PLOT_H;
              if (h <= 0) return null;
              const x = AXIS_W + band * i + (band - barW) / 2;
              return (
                <path
                  key={i}
                  d={columnPath(x, PLOT_H - h, barW, h)}
                  fill="var(--viz-1)"
                  opacity={active === null || active === i ? 1 : 0.45}
                />
              );
            })}
            {peak >= 0 && active === null && (
              <text
                x={AXIS_W + band * peak + band / 2}
                y={y(top) - 6}
                textAnchor="middle"
                className="fill-[var(--ink-2)] text-[10px] font-semibold"
              >
                {format(top)}
              </text>
            )}
            {active !== null && (
              <line
                x1={tipX}
                x2={tipX}
                y1={0}
                y2={PLOT_H}
                stroke="var(--ink-3)"
                strokeWidth={1}
                opacity={0.5}
              />
            )}
            {xLabels.map((i) => (
              <text
                key={i}
                x={AXIS_W + band * i + band / 2}
                y={PLOT_H + 16}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                className="fill-[var(--ink-3)] text-[10px]"
              >
                {points[i].label}
              </text>
            ))}
          </g>
        </svg>
      )}
      {tip && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-center shadow-lg"
          style={{ left: Math.max(48, Math.min(width - 48, tipX)) }}
        >
          <div className="text-[13px] font-semibold text-ink">{format(tip.value)}</div>
          <div className="text-[11px] whitespace-nowrap text-ink-3">{tip.label}</div>
        </div>
      )}
    </div>
  );
}

export interface BarRow {
  key: string;
  label: string;
  value: number;
}

/**
 * Horizontal bars in a fixed order (leagues, lessons): one color, the value
 * at each bar's tip, a 4px rounded end and a square foot.
 */
export function BarList({
  rows,
  format,
  labelWidth = "w-36",
}: {
  rows: BarRow[];
  format: (n: number) => string;
  labelWidth?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-1">
      {rows.map((r) => (
        <li
          key={r.key}
          className="group flex items-center gap-3 rounded-md px-1 py-0.5 hover:bg-surface-2"
          title={`${r.label}: ${format(r.value)}`}
        >
          <span className={`${labelWidth} shrink-0 truncate text-[12px] text-ink-2`}>
            {r.label}
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className="h-2.5 rounded-r-[4px] bg-[var(--viz-1)] transition-opacity group-hover:opacity-80"
              style={{ width: `${(r.value / max) * 85}%`, minWidth: r.value > 0 ? 2 : 0 }}
            />
            <span className="text-[12px] font-semibold text-ink-2 tabular-nums">
              {format(r.value)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
