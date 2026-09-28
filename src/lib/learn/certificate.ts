/** Draws the course-completion certificate on a canvas (fully offline). */

export interface CertificateData {
  name: string;
  lessons: number;
  xp: number;
  level: string;
  challenges: number;
  date: string;
  lang: "en" | "tr";
}

const W = 1600;
const H = 1000;

/** Short, stable ID so a certificate can be told apart from another one. */
export function certificateId(d: CertificateData): string {
  let h = 2166136261;
  for (const ch of `${d.name}|${d.date}|${d.xp}|${d.lessons}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return `VYCE-${(h >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCertificate(canvas: HTMLCanvasElement, d: CertificateData) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const tr = d.lang === "tr";
  const sans = '"Geist", system-ui, sans-serif';
  const mono = '"Geist Mono", ui-monospace, monospace';

  // Background, glows and dot grid
  ctx.fillStyle = "#07080c";
  ctx.fillRect(0, 0, W, H);
  for (const [x, y, r, c] of [
    [300, 0, 700, "rgba(130,170,255,0.20)"],
    [1350, 80, 600, "rgba(199,146,234,0.16)"],
    [900, 1050, 700, "rgba(137,221,255,0.08)"],
  ] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let x = 24; x < W; x += 32) for (let y = 24; y < H; y += 32) ctx.fillRect(x, y, 2, 2);

  // Gradient frame
  const frame = ctx.createLinearGradient(0, 0, W, H);
  frame.addColorStop(0, "#82aaff");
  frame.addColorStop(0.5, "#c792ea");
  frame.addColorStop(1, "#89ddff");
  ctx.lineWidth = 3;
  ctx.strokeStyle = frame;
  roundRect(ctx, 40, 40, W - 80, H - 80, 36);
  ctx.stroke();

  // Logo
  ctx.save();
  ctx.translate(130, 130);
  ctx.rotate((12 * Math.PI) / 180);
  const lg = ctx.createLinearGradient(-30, -30, 30, 30);
  lg.addColorStop(0, "#82aaff");
  lg.addColorStop(1, "#c792ea");
  ctx.fillStyle = lg;
  roundRect(ctx, -30, -30, 60, 60, 14);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#fff";
  ctx.font = `700 24px ${mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("{}", 130, 131);
  ctx.textAlign = "left";
  ctx.font = `600 30px ${mono}`;
  ctx.fillStyle = "#eef1f8";
  ctx.fillText("vyce", 180, 132);
  ctx.fillStyle = "#c792ea";
  ctx.fillText(".", 180 + ctx.measureText("vyce").width, 132);
  ctx.fillStyle = "#82aaff";
  ctx.fillText("lua", 180 + ctx.measureText("vyce.").width, 132);

  ctx.textAlign = "right";
  ctx.font = `500 20px ${mono}`;
  ctx.fillStyle = "#6f788c";
  ctx.fillText(certificateId(d), W - 110, 132);

  // Heading
  ctx.textAlign = "center";
  ctx.font = `500 22px ${mono}`;
  ctx.fillStyle = "#c792ea";
  ctx.fillText(tr ? "// BAŞARI SERTİFİKASI" : "// CERTIFICATE OF COMPLETION", W / 2, 290);
  ctx.font = `600 64px ${sans}`;
  ctx.fillStyle = "#eef1f8";
  ctx.fillText(tr ? "Sıfırdan Roblox Scripting" : "Roblox Scripting from Zero", W / 2, 380);
  ctx.font = `400 26px ${sans}`;
  ctx.fillStyle = "#a6afc2";
  ctx.fillText(tr ? "Bu sertifika şu kişiye verilmiştir" : "This certifies that", W / 2, 460);

  // Name
  const name = d.name.trim() || (tr ? "Adın" : "Your Name");
  let size = 96;
  ctx.font = `700 ${size}px ${sans}`;
  while (ctx.measureText(name).width > W - 360 && size > 40) {
    size -= 4;
    ctx.font = `700 ${size}px ${sans}`;
  }
  const nw = ctx.measureText(name).width;
  const ng = ctx.createLinearGradient(W / 2 - nw / 2, 0, W / 2 + nw / 2, 0);
  ng.addColorStop(0, "#82aaff");
  ng.addColorStop(0.55, "#c792ea");
  ng.addColorStop(1, "#89ddff");
  ctx.fillStyle = ng;
  ctx.fillText(name, W / 2, 570);

  ctx.font = `400 26px ${sans}`;
  ctx.fillStyle = "#a6afc2";
  ctx.fillText(
    tr
      ? `${d.lessons} dersin ve ödevin hepsini, gerçek Luau kodu yazarak tamamladı.`
      : `completed all ${d.lessons} lessons and homework by writing real Luau code.`,
    W / 2,
    650,
  );

  // Stats
  const stats: Array<[string, string]> = [
    [String(d.xp), "XP"],
    [d.level, tr ? "Seviye" : "Level"],
    [String(d.challenges), tr ? "Görev" : "Challenges"],
    [d.date, tr ? "Tarih" : "Date"],
  ];
  const bw = 270;
  const gap = 24;
  const startX = W / 2 - (stats.length * bw + (stats.length - 1) * gap) / 2;
  stats.forEach(([v, k], i) => {
    const x = startX + i * (bw + gap);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    roundRect(ctx, x, 720, bw, 110, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = `600 34px ${mono}`;
    ctx.fillStyle = "#eef1f8";
    ctx.fillText(v, x + bw / 2, 765, bw - 20);
    ctx.font = `400 18px ${sans}`;
    ctx.fillStyle = "#6f788c";
    ctx.fillText(k, x + bw / 2, 805);
  });

  // Code signature
  ctx.textAlign = "center";
  ctx.font = `500 22px ${mono}`;
  const parts: Array<[string, string]> = [
    ["print", "#82aaff"],
    ["(", "#6f788c"],
    ['"Hello, Roblox!"', "#c3e88d"],
    [")", "#6f788c"],
    ["  -- ", "#6f788c"],
    [tr ? "ilk satırın" : "your first line", "#6f788c"],
  ];
  const total = parts.reduce((n, [t]) => n + ctx.measureText(t).width, 0);
  let cx = W / 2 - total / 2;
  ctx.textAlign = "left";
  for (const [text, color] of parts) {
    ctx.fillStyle = color;
    ctx.fillText(text, cx, 900);
    cx += ctx.measureText(text).width;
  }
}
