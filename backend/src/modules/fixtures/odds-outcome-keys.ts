import { normalizeApiMarketName } from './api-market-aliases';

/**
 * Map one odds row to a stable outcome key used by the prediction engine, scripts, and (where aligned) settlement.
 * `marketName` may be raw API or already canonical — we normalize once.
 * Returns `correct_score` so callers can skip; returns `null` when unknown for that market.
 */
export function outcomeKeyFromOddsLine(marketName: string, marketValue: string): string | null {
  const canonical = normalizeApiMarketName(marketName);
  const v = (marketValue || '').trim().toLowerCase();

  if (canonical === 'Match Winner') {
    if (v.includes('home') || v === '1') return 'home';
    if (v.includes('away') || v === '2') return 'away';
    if (v.includes('draw') || v === 'x') return 'draw';
    return null;
  }
  if (canonical === 'Both Teams To Score') {
    if (v.includes('yes')) return 'btts';
    return null;
  }
  if (canonical === 'Goals Over/Under') {
    if (v.includes('over') && v.includes('1.5')) return 'over15';
    if (v.includes('under') && v.includes('1.5')) return 'under15';
    if (v.includes('over') && v.includes('2.5')) return 'over25';
    if (v.includes('under') && v.includes('2.5')) return 'under25';
    if (v.includes('over') && v.includes('3.5')) return 'over35';
    if (v.includes('under') && v.includes('3.5')) return 'under35';
    return null;
  }
  if (canonical === 'Double Chance') {
    if ((v.includes('home') && v.includes('away')) || v === '12') return 'home_away';
    if ((v.includes('home') && v.includes('draw')) || v === '1x') return 'home_draw';
    if ((v.includes('draw') && v.includes('away')) || v === 'x2') return 'draw_away';
    return null;
  }
  if (canonical === 'Draw No Bet') {
    if (v.includes('home') && !v.includes('away')) return 'dnb_home';
    if (v.includes('away') && !v.includes('home')) return 'dnb_away';
    return null;
  }
  if (canonical === 'Odd/Even') {
    if (v.includes('odd') && !v.includes('even')) return 'odd_goals';
    if (v.includes('even')) return 'even_goals';
    return null;
  }
  if (canonical === 'First Half Winner') {
    if (v.includes('home') || v === '1') return 'ht_home';
    if (v.includes('away') || v === '2') return 'ht_away';
    if (v.includes('draw') || v === 'x') return 'ht_draw';
    return null;
  }
  if (canonical === 'Goals Over/Under First Half') {
    if (v.includes('over') && v.includes('0.5')) return 'fh_over05';
    if (v.includes('under') && v.includes('0.5')) return 'fh_under05';
    if (v.includes('over') && v.includes('1.5')) return 'fh_over15';
    if (v.includes('under') && v.includes('1.5')) return 'fh_under15';
    if (v.includes('over') && v.includes('2.5')) return 'fh_over25';
    if (v.includes('under') && v.includes('2.5')) return 'fh_under25';
    return null;
  }
  if (canonical === 'Correct Score') return 'correct_score';
  return null;
}

/**
 * Engine legacy: use mapped key, else lowercased value (for odd bookmaker labels), else null.
 */
export function engineOutcomeKeyFromOddsLine(marketName: string, marketValue: string): string | null {
  const mapped = outcomeKeyFromOddsLine(marketName, marketValue);
  if (mapped != null) return mapped;
  const raw = (marketValue || '').trim().toLowerCase();
  return raw || null;
}
