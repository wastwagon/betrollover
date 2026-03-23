/** Status codes where API-Football may send a meaningful `status.elapsed` minute. */
const ELAPSED_COMPATIBLE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P']);

/**
 * Persistable minute for a live fixture. Returns null when not applicable or invalid.
 * API-Sports: `fixture.status.elapsed` (number), often null at HT.
 */
export function normalizeFixtureElapsed(statusShort: string | undefined, elapsed: unknown): number | null {
  const s = (statusShort ?? '').trim();
  if (!ELAPSED_COMPATIBLE.has(s)) return null;
  if (elapsed == null) return null;
  const n = typeof elapsed === 'number' ? elapsed : Number(elapsed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(32767, Math.round(n));
}
