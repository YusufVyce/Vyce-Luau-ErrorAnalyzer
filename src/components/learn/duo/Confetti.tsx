import { useEffect, useRef } from "react";

const COLORS = ["#82aaff", "#c792ea", "#89ddff", "#c3e88d", "#ffcb6b", "#f78c6c", "#ff8cc6"];

/** A one-shot confetti burst drawn on a canvas. Skipped for reduced motion. */
export function Confetti({
  pieces = 150,
  duration = 3600,
}: {
  pieces?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const w = () => canvas.width;
    const h = () => canvas.height;
    const parts = Array.from({ length: pieces }, (_, i) => {
      const fromLeft = i % 2 === 0;
      return {
        x: fromLeft ? w() * 0.1 : w() * 0.9,
        y: h() * 0.62,
        vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 9) * dpr,
        vy: -(11 + Math.random() * 11) * dpr,
        size: (6 + Math.random() * 7) * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        color: COLORS[i % COLORS.length],
        shape: i % 3,
      };
    });
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, w(), h());
      const fade = Math.max(0, 1 - Math.max(0, t - duration * 0.65) / (duration * 0.35));
      ctx.globalAlpha = fade;
      for (const p of parts) {
        p.vy += 0.38 * dpr;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      if (t < duration) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w(), h());
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [pieces, duration]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] h-full w-full"
    />
  );
}
