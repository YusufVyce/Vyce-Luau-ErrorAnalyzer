export function calculateConfidence(
    matched: number,
    total: number
): number {

    if (total === 0) return 0;

    return Math.round((matched / total) * 100);
}