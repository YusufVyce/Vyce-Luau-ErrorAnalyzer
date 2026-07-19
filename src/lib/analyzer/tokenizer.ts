export function tokenize(text: string): string[] {
  return text
    .split(" ")
    .map(v => v.trim())
    .filter(Boolean);
}