/**
 * Shared UI helpers for all-time leaderboard rank (1-based).
 * Keeps PickCard, coupon sidebar, and leaderboard medal display consistent.
 */

export const TIPSTER_RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

/** Medal emoji for ranks 1–3; null otherwise. */
export function tipsterRankMedal(rank: number): string | null {
  if (rank >= 1 && rank <= 3) return TIPSTER_RANK_MEDALS[rank - 1];
  return null;
}

/** Circular badge Tailwind classes (PickCard-style). */
export function tipsterRankBadgeClass(rank: number | null | undefined): string {
  if (rank == null || rank < 1) return 'bg-slate-200 text-slate-700';
  if (rank === 1) return 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-white shadow-md';
  if (rank === 2) return 'bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 text-white shadow-md';
  if (rank === 3) return 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md';
  if (rank <= 10) return 'bg-gradient-to-r from-amber-200 to-yellow-300 text-amber-900';
  return 'bg-slate-200 text-slate-800';
}

/** Inner label: medals, numeric rank, or em dash when unranked. */
export function tipsterRankBadgeContent(rank: number | null | undefined): string | number {
  if (rank != null && rank > 0) {
    const medal = tipsterRankMedal(rank);
    if (medal) return medal;
    return rank;
  }
  return '—';
}

/** Compact text for stat grids: "#4" or "—". */
export function formatTipsterRankHash(rank: number | null | undefined): string {
  if (rank != null && rank > 0) return `#${rank}`;
  return '—';
}
