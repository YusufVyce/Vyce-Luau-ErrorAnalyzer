export type Part = { code: false; text: string } | { code: true; text: string; lang: string };

/** Splits a post into text and ``` fenced code blocks (an unclosed fence runs to the end). */
export function splitFences(text: string): Part[] {
  const parts: Part[] = [];
  let buf: string[] = [];
  let fence: { lang: string; lines: string[] } | null = null;
  const flushText = () => {
    const t = buf.join("\n").trim();
    if (t) parts.push({ code: false, text: t });
    buf = [];
  };
  for (const line of text.split("\n")) {
    const m = /^\s*```\s*([\w+-]*)\s*$/.exec(line);
    if (fence) {
      if (m && !m[1]) {
        parts.push({ code: true, text: fence.lines.join("\n"), lang: fence.lang });
        fence = null;
      } else fence.lines.push(line);
    } else if (m) {
      flushText();
      fence = { lang: m[1] ?? "", lines: [] };
    } else buf.push(line);
  }
  if (fence) parts.push({ code: true, text: fence.lines.join("\n"), lang: fence.lang });
  flushText();
  return parts;
}
