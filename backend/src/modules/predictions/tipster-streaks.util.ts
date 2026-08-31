export type TipsterStreaks = {
  /** Signed: +N consecutive wins, -N consecutive losses, from the newest settled pick. */
  currentStreak: number;
  /** Longest consecutive win run (positive count). */
  bestStreak: number;
  /** Longest consecutive loss run (positive count). */
  worstStreak: number;
};

/**
 * Streaks from settled results ordered newest-first (void/pending ignored).
 * Win and loss runs are equivalent whether walked newest-first or oldest-first.
 */
export function computeStreaksFromNewestFirst(rows: { result: string }[]): TipsterStreaks {
  let currentStreak = 0;
  let bestStreak = 0;
  let worstStreak = 0;
  let run = 0;
  let openingSign = 0;
  let openingBroken = false;

  for (const row of rows) {
    const sign = row.result === 'won' ? 1 : row.result === 'lost' ? -1 : 0;
    if (sign === 0) continue;

    if (run === 0 || (run > 0 && sign === 1) || (run < 0 && sign === -1)) {
      run += sign;
    } else {
      run = sign;
    }

    if (run > 0) bestStreak = Math.max(bestStreak, run);
    if (run < 0) worstStreak = Math.max(worstStreak, -run);

    if (openingSign === 0) {
      openingSign = sign;
      currentStreak = run;
    } else if (!openingBroken && sign === openingSign) {
      currentStreak = run;
    } else {
      openingBroken = true;
    }
  }

  return { currentStreak, bestStreak, worstStreak };
}
