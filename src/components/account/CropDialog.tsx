import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Loader2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { cropForUpload, isGif, type CropRect } from "@/lib/account/imageTools";
import { IMAGE_SPECS, type ImageKind } from "@/lib/account/shared";
import { useT } from "@/lib/prefs";

const MAX_ZOOM = 5;

/**
 * Lets the student place a picture before it's uploaded: drag to move,
 * slider / wheel / pinch-free buttons to zoom. The photo frame is round,
 * the banner frame is a 3:1 strip. GIFs stay animated.
 */
export function CropDialog({
  file,
  kind,
  onCancel,
  onSave,
}: {
  file: File;
  kind: ImageKind;
  onCancel: () => void;
  /** Gets the cropped picture as base64; returns an error message to show, or null when done. */
  onSave: (data: string) => Promise<string | null>;
}) {
  const t = useT();
  const spec = IMAGE_SPECS[kind];
  const aspect = spec.width / spec.height;
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [frameW, setFrameW] = useState(320);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Made in an effect so React's dev double-mount doesn't revoke the URL the picture still uses.
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  // Frame size follows the dialog width.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const size = () => {
      const avail = el.clientWidth;
      setFrameW(kind === "avatar" ? Math.min(320, avail) : Math.min(640, avail));
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    return () => ro.disconnect();
  }, [kind]);

  const frameH = frameW / aspect;
  const base = natural ? Math.max(frameW / natural.w, frameH / natural.h) : 1;
  const scale = base * zoom;
  const dispW = natural ? natural.w * scale : 0;
  const dispH = natural ? natural.h * scale : 0;

  const clamp = useCallback(
    (x: number, y: number, s = scale) => {
      if (!natural) return { x: 0, y: 0 };
      const w = natural.w * s;
      const h = natural.h * s;
      return {
        x: Math.min(0, Math.max(frameW - w, x)),
        y: Math.min(0, Math.max(frameH - h, y)),
      };
    },
    [natural, frameW, frameH, scale],
  );

  // Start centered; keep the picture covering the frame when the size changes.
  useEffect(() => {
    if (!natural) return;
    setOffset((o) =>
      o.x === 0 && o.y === 0 && zoom === 1
        ? clamp((frameW - dispW) / 2, (frameH - dispH) / 2)
        : clamp(o.x, o.y),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, frameW]);

  function setZoomAround(next: number) {
    if (!natural) return;
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    const s = base * z;
    // Keep the point in the middle of the frame where it is.
    const cx = (frameW / 2 - offset.x) / scale;
    const cy = (frameH / 2 - offset.y) / scale;
    setZoom(z);
    setOffset(clamp(frameW / 2 - cx * s, frameH / 2 - cy * s, s));
  }

  function reset() {
    if (!natural) return;
    setZoom(1);
    setOffset(clamp((frameW - natural.w * base) / 2, (frameH - natural.h * base) / 2, base));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    setOffset(clamp(d.ox + e.clientX - d.x, d.oy + e.clientY - d.y));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
      const step = e.shiftKey ? 20 : 5;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [step, 0],
        ArrowRight: [-step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      };
      const m = moves[e.key];
      if (m) {
        e.preventDefault();
        setOffset((o) => clamp(o.x + m[0], o.y + m[1]));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, clamp, onCancel]);

  async function save() {
    if (!natural) return;
    setBusy(true);
    setError(null);
    // Let the spinner paint before the (possibly long) GIF work starts.
    await new Promise((r) => setTimeout(r, 30));
    const rect: CropRect = {
      sx: -offset.x / scale,
      sy: -offset.y / scale,
      sw: frameW / scale,
      sh: frameH / scale,
    };
    const data = await cropForUpload(file, kind, rect).catch(() => null);
    if (!data) {
      setBusy(false);
      setError(t(isGif(file) ? "img.gifTooBig" : "img.notImage"));
      return;
    }
    const message = await onSave(data);
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t(kind === "avatar" ? "img.editPhoto" : "img.editBanner")}
    >
      <div className="ep-card w-full max-w-2xl space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">
            {t(kind === "avatar" ? "img.editPhoto" : "img.editBanner")}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
            aria-label={t("img.cancel")}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div ref={wrap} className="flex w-full justify-center">
          <div
            className="relative cursor-grab touch-none overflow-hidden rounded-xl bg-surface-2 select-none active:cursor-grabbing"
            style={{ width: frameW, height: frameH }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onWheel={(e) => setZoomAround(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
          >
            {url && (
              <img
                src={url}
                alt=""
                draggable={false}
                onLoad={(e) =>
                  setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
                }
                className="pointer-events-none absolute max-w-none"
                style={{
                  left: offset.x,
                  top: offset.y,
                  width: dispW || undefined,
                  height: dispH || undefined,
                }}
              />
            )}
            {kind === "avatar" && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-2 ring-white/80"
              />
            )}
            {kind === "banner" && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-white/70"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoomAround(zoom / 1.2)}
            className="rounded-lg border border-line p-1.5 text-ink-2 hover:text-ink"
            aria-label={t("img.zoomOut")}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomAround(Number(e.target.value))}
            aria-label={t("img.zoom")}
            className="flex-1 accent-[var(--brand)]"
          />
          <button
            type="button"
            onClick={() => setZoomAround(zoom * 1.2)}
            className="rounded-lg border border-line p-1.5 text-ink-2 hover:text-ink"
            aria-label={t("img.zoomIn")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-line p-1.5 text-ink-2 hover:text-ink"
            aria-label={t("img.reset")}
            title={t("img.reset")}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="text-[12px] text-ink-3">
          {t("img.cropHint")}
          {isGif(file) ? ` ${t("img.gifHint")}` : ""}
        </p>
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-[var(--tint-bad)]">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-line px-4 py-2 text-sm text-ink-2 hover:text-ink"
          >
            {t("img.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || !natural}
            className="ep-cta inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? t("img.saving") : t("img.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
