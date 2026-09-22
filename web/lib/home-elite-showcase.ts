import { hasPrimaryLeaderboardSample } from '@/lib/leaderboard-sample';

export type EliteShowcaseCard = {
  id: number;
  createdAt?: string;
  tipster?: { username?: string } | null;
};

/** Primary leaderboard sample + positive ROI only. */
export function eliteLeaderboardUsernames(data: unknown): Set<string> {
  const raw = (data as { leaderboard?: unknown[] })?.leaderboard;
  const entries = Array.isArray(raw) ? raw : Array.isArray(data) ? data : [];
  const names = new Set<string>();
  for (const row of entries) {
    const e = row as Record<string, unknown>;
    if (!hasPrimaryLeaderboardSample(e)) continue;
    const roi = Number(e.roi ?? 0);
    if (!Number.isFinite(roi) || roi <= 0) continue;
    const u = (e.username as string | undefined)?.trim().toLowerCase();
    if (u) names.add(u);
  }
  return names;
}

/**
 * One latest pick per tipster.
 * Only primary leaderboard tipsters with positive ROI — no fill from losing desks.
 */
export function pickEliteShowcase<T extends EliteShowcaseCard>(
  all: T[],
  eliteNames: Set<string>,
  max = 6,
): T[] {
  if (!eliteNames.size) return [];
  const newestFirst = [...all].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
  const seenTipster = new Set<string>();
  const out: T[] = [];
  for (const a of newestFirst) {
    const key = a.tipster?.username?.trim().toLowerCase() || `pick:${a.id}`;
    if (seenTipster.has(key)) continue;
    if (!eliteNames.has(key)) continue;
    seenTipster.add(key);
    out.push(a);
    if (out.length >= max) break;
  }
  return out;
}
