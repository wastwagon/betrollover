export const ACCA_DESK_SHORTS_EMAIL_MAX = 12;

export type AccaDeskShortLeg = {
  matchDescription: string;
  prediction: string;
  odds: number;
};

export type AccaDeskShort = {
  ticketId: number;
  tipsterUserId: number;
  tipsterDisplayName: string;
  title: string;
  totalOdds: number;
  totalPicks: number;
  legs: AccaDeskShortLeg[];
};

/** Followers only see shorts from Acca Desk bots they follow. */
export function groupAccaDeskShortsByFollower(
  shorts: AccaDeskShort[],
  follows: Array<{ userId: number; tipsterUserId: number }>,
): Map<number, AccaDeskShort[]> {
  const followedByUser = new Map<number, Set<number>>();
  for (const row of follows) {
    const userId = Number(row.userId);
    const tipsterUserId = Number(row.tipsterUserId);
    if (!Number.isFinite(userId) || !Number.isFinite(tipsterUserId)) continue;
    if (!followedByUser.has(userId)) followedByUser.set(userId, new Set());
    followedByUser.get(userId)!.add(tipsterUserId);
  }

  const out = new Map<number, AccaDeskShort[]>();
  for (const [userId, tipsterIds] of followedByUser) {
    const list = shorts.filter((s) => tipsterIds.has(s.tipsterUserId) && s.tipsterUserId !== userId);
    if (list.length) out.set(userId, list);
  }
  return out;
}
