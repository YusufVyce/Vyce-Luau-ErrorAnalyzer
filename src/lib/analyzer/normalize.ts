
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[:.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}