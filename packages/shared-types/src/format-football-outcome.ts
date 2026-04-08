/**
 * Human-readable labels for football outcome keys (AI engine, accumulator_picks.outcome_key).
 * Unknown values are returned unchanged so free-text coupon labels still display as stored.
 */
export function formatFootballOutcomeLabel(outcome: string | null | undefined): string {
  const raw = (outcome ?? '').trim();
  if (!raw) return '—';
  const o = raw.toLowerCase();
  switch (o) {
    case 'home':
      return 'Home Win';
    case 'away':
      return 'Away Win';
    case 'draw':
      return 'Draw';
    case 'btts':
      return 'BTTS Yes';
    case 'over15':
      return 'Over 1.5';
    case 'under15':
      return 'Under 1.5';
    case 'over25':
      return 'Over 2.5';
    case 'under25':
      return 'Under 2.5';
    case 'over35':
      return 'Over 3.5';
    case 'under35':
      return 'Under 3.5';
    case 'home_away':
      return 'Home or Away (12)';
    case 'home_draw':
      return 'Home or Draw (1X)';
    case 'draw_away':
      return 'Draw or Away (X2)';
    case 'dnb_home':
      return 'Draw No Bet: Home';
    case 'dnb_away':
      return 'Draw No Bet: Away';
    case 'ht_home':
      return 'First Half: Home Win';
    case 'ht_away':
      return 'First Half: Away Win';
    case 'ht_draw':
      return 'First Half: Draw';
    case 'fh_over05':
      return 'First Half: Over 0.5';
    case 'fh_under05':
      return 'First Half: Under 0.5';
    case 'fh_over15':
      return 'First Half: Over 1.5';
    case 'fh_under15':
      return 'First Half: Under 1.5';
    case 'fh_over25':
      return 'First Half: Over 2.5';
    case 'fh_under25':
      return 'First Half: Under 2.5';
    case 'odd_goals':
      return 'Odd/Even: Odd';
    case 'even_goals':
      return 'Odd/Even: Even';
    default:
      return raw;
  }
}
