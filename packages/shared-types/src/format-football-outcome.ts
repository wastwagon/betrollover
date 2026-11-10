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
      return 'Home win';
    case 'away':
      return 'Away win';
    case 'draw':
      return 'Draw';
    case 'match_winner':
    case '1x2':
      return 'Match winner (home, draw or away)';
    case 'btts':
      return 'Both teams to score: Yes';
    case 'over15':
      return 'Over 1.5 goals (2 or more goals)';
    case 'under15':
      return 'Under 1.5 goals (0 or 1 goal)';
    case 'over25':
      return 'Over 2.5 goals (3 or more goals)';
    case 'under25':
      return 'Under 2.5 goals (0–2 goals)';
    case 'over35':
      return 'Over 3.5 goals (4 or more goals)';
    case 'under35':
      return 'Under 3.5 goals (0–3 goals)';
    case 'home_away':
      return 'Home win or away win (no draw)';
    case 'home_draw':
      return 'Home win or draw';
    case 'draw_away':
      return 'Draw or away win';
    case 'dnb_home':
      return 'Draw no bet: home win';
    case 'dnb_away':
      return 'Draw no bet: away win';
    case 'ht_home':
      return 'First-half home win';
    case 'ht_away':
      return 'First-half away win';
    case 'ht_draw':
      return 'First-half draw';
    case 'fh_over05':
      return 'Over 0.5 goals in the first half (at least 1 goal)';
    case 'fh_under05':
      return 'Under 0.5 goals in the first half (no goals)';
    case 'fh_over15':
      return 'Over 1.5 goals in the first half (2 or more goals)';
    case 'fh_under15':
      return 'Under 1.5 goals in the first half (0 or 1 goal)';
    case 'fh_over25':
      return 'Over 2.5 goals in the first half (3 or more goals)';
    case 'fh_under25':
      return 'Under 2.5 goals in the first half (0–2 goals)';
    case 'odd_goals':
      return 'Odd total goals';
    case 'even_goals':
      return 'Even total goals';
    case 'home_score_yes':
      return 'Home team to score: Yes';
    case 'home_score_no':
      return 'Home team to score: No';
    case 'away_score_yes':
      return 'Away team to score: Yes';
    case 'away_score_no':
      return 'Away team to score: No';
    default: {
      // Soften common free-text market titles stored on picks
      if (/^match\s*winner$/i.test(raw)) return 'Match winner (home, draw or away)';
      if (/^first\s*half:\s*over\s*0\.5$/i.test(raw)) {
        return 'Over 0.5 goals in the first half (at least 1 goal)';
      }
      if (/^first\s*half:\s*over\s*1\.5$/i.test(raw)) {
        return 'Over 1.5 goals in the first half (2 or more goals)';
      }
      if (/^over\s*2\.5$/i.test(raw)) return 'Over 2.5 goals (3 or more goals)';
      if (/^over\s*1\.5$/i.test(raw)) return 'Over 1.5 goals (2 or more goals)';
      if (/^home or away \(12\)$/i.test(raw)) return 'Home win or away win (no draw)';
      if (/^draw or away \(x2\)$/i.test(raw)) return 'Draw or away win';
      if (/^home or draw \(1x\)$/i.test(raw)) return 'Home win or draw';
      return raw;
    }
  }
}
