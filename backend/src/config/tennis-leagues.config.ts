/**
 * Default enabled tennis tournament IDs (API-Sports Tennis).
 * Covers Grand Slams, ATP Masters 1000, ATP 500, WTA Premier events.
 * Override via ENABLED_TENNIS_TOURNAMENTS env (comma-separated IDs).
 * Verify / update at: https://dashboard.api-football.com → Tennis → Tournaments
 */
export const DEFAULT_TENNIS_TOURNAMENT_IDS = [
  // Grand Slams
  1,   // Australian Open
  2,   // French Open (Roland Garros)
  3,   // Wimbledon
  4,   // US Open
  // ATP Masters 1000
  5,   // ATP Finals
  6,   // Indian Wells
  7,   // Miami Open
  8,   // Monte-Carlo
  9,   // Madrid Open
  10,  // Italian Open (Rome)
  11,  // Canadian Open
  12,  // Cincinnati Open
  13,  // Shanghai Masters
  14,  // Paris Masters
  // WTA 1000
  20,  // WTA Finals
  21,  // WTA Indian Wells
  22,  // WTA Miami
  23,  // WTA Madrid
  24,  // WTA Rome
  25,  // WTA Canadian Open
  26,  // WTA Cincinnati
];

export function getEnabledTennisTournamentIds(): number[] {
  const raw = process.env.ENABLED_TENNIS_TOURNAMENTS;
  if (!raw?.trim()) return DEFAULT_TENNIS_TOURNAMENT_IDS;
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}
