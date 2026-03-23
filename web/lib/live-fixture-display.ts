/** Compact label for in-play badge: period + optional minute (API-Football `status.elapsed`). */
export function formatLiveFixturePeriod(
  statusShort: string | null | undefined,
  elapsed: number | null | undefined,
): string {
  const s = (statusShort ?? '').trim();
  if (!s) return '';
  if (elapsed != null && Number.isFinite(elapsed) && elapsed >= 0) {
    return `${s} · ${elapsed}'`;
  }
  return s;
}
