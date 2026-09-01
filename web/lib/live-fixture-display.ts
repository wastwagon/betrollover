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

/** Live period chip — same tokens on pick cards, coupon, live scores, and match detail. */
export const FIXTURE_LIVE_CHIP =
  'inline-flex items-center gap-1 rounded-full bg-[var(--destructive-light)] border border-[var(--destructive)]/25 font-semibold tabular-nums text-[var(--destructive)]';

export const FIXTURE_FT_CHIP =
  'inline-flex items-center rounded-full bg-[var(--fill-secondary)] px-2 py-1 font-semibold uppercase tabular-nums text-[var(--text-muted)]';

export const FIXTURE_NS_CHIP =
  'inline-flex items-center rounded-full bg-[var(--fill-secondary)] px-2 py-1 font-semibold uppercase text-[var(--text-muted)]';
