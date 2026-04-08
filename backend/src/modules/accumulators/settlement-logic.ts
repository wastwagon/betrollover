function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Prefer the segment after ':' so "Goals Over/Under: Under 2.5" is not misread as Over (substring "over" in "over/under"). */
function pickOverUnderSide(pred: string): 'over' | 'under' | null {
  const tail = pred.includes(':') ? (pred.split(':').pop() || pred).toLowerCase() : pred.toLowerCase();
  const hasUnder = /\bunder\b/.test(tail);
  const hasOver = /\bover\b/.test(tail);
  if (hasUnder && !hasOver) return 'under';
  if (hasOver && !hasUnder) return 'over';
  if (hasUnder && hasOver) {
    return tail.lastIndexOf('under') > tail.lastIndexOf('over') ? 'under' : 'over';
  }
  return null;
}

/**
 * Pure settlement logic for determining pick result from prediction and scores.
 * Extracted for unit testing. Used by SettlementService.
 * Does NOT handle football-specific logic differently — all sports use the same rules.
 */
export function determinePickResult(
  prediction: string,
  homeScore: number,
  awayScore: number,
  homeTeam?: string,
  awayTeam?: string,
  /** Half-time goals when available (football first-half markets). */
  htHome?: number | null,
  htAway?: number | null,
): 'won' | 'lost' | 'void' | null {
  const pred = (prediction || '').trim().toLowerCase();
  const total = homeScore + awayScore;
  const homeWin = homeScore > awayScore;
  const awayWin = awayScore > homeScore;
  const draw = homeScore === awayScore;
  const bothScored = homeScore > 0 && awayScore > 0;

  const homeName = (homeTeam || '').toLowerCase();
  const awayName = (awayTeam || '').toLowerCase();

  const hasHt =
    htHome != null &&
    htAway != null &&
    Number.isFinite(Number(htHome)) &&
    Number.isFinite(Number(htAway));
  const htH = hasHt ? Number(htHome) : null;
  const htA = hasHt ? Number(htAway) : null;
  const htTotal = hasHt && htH !== null && htA !== null ? htH + htA : null;

  // --- Canonical outcome_key slugs (AI engine / marketplace sync) ---
  if (pred === 'ht_home') {
    if (!hasHt || htH === null || htA === null) return null;
    return htH > htA ? 'won' : 'lost';
  }
  if (pred === 'ht_away') {
    if (!hasHt || htH === null || htA === null) return null;
    return htA > htH ? 'won' : 'lost';
  }
  if (pred === 'ht_draw') {
    if (!hasHt || htH === null || htA === null) return null;
    return htH === htA ? 'won' : 'lost';
  }
  if (pred === 'dnb_home') {
    if (draw) return 'void';
    return homeWin ? 'won' : 'lost';
  }
  if (pred === 'dnb_away') {
    if (draw) return 'void';
    return awayWin ? 'won' : 'lost';
  }
  if (pred === 'over15') return total > 1.5 ? 'won' : 'lost';
  if (pred === 'under15') return total < 1.5 ? 'won' : 'lost';
  if (pred === 'over35') return total > 3.5 ? 'won' : 'lost';
  if (pred === 'under35') return total < 3.5 ? 'won' : 'lost';
  if (pred === 'odd_goals') return total % 2 === 1 ? 'won' : 'lost';
  if (pred === 'even_goals') return total % 2 === 0 ? 'won' : 'lost';
  if (pred === 'fh_over05') {
    if (htTotal === null) return null;
    return htTotal > 0.5 ? 'won' : 'lost';
  }
  if (pred === 'fh_under05') {
    if (htTotal === null) return null;
    return htTotal < 0.5 ? 'won' : 'lost';
  }
  if (pred === 'fh_over15') {
    if (htTotal === null) return null;
    return htTotal > 1.5 ? 'won' : 'lost';
  }
  if (pred === 'fh_under15') {
    if (htTotal === null) return null;
    return htTotal < 1.5 ? 'won' : 'lost';
  }
  if (pred === 'fh_over25') {
    if (htTotal === null) return null;
    return htTotal > 2.5 ? 'won' : 'lost';
  }
  if (pred === 'fh_under25') {
    if (htTotal === null) return null;
    return htTotal < 2.5 ? 'won' : 'lost';
  }

  // --- Double Chance ---
  if (pred.includes('12') || pred.includes('home_away') || pred.includes('home or away') || pred.includes('home/away')) {
    return homeWin || awayWin ? 'won' : 'lost';
  }
  if (pred.includes('1x') || pred.includes('home_draw') || pred.includes('home or draw') || pred.includes('home/draw') || pred.includes('draw/home')) {
    return homeWin || draw ? 'won' : 'lost';
  }
  if (pred.includes('x2') || pred.includes('draw_away') || pred.includes('draw or away') || pred.includes('draw/away') || pred.includes('away/draw')) {
    return awayWin || draw ? 'won' : 'lost';
  }

  if (homeName && (pred.includes(`${homeName} or draw`) || pred.includes(`${homeName}_draw`) || pred.includes(`${homeName} or x`))) {
    return homeWin || draw ? 'won' : 'lost';
  }
  if (awayName && (pred.includes(`${awayName} or draw`) || pred.includes(`draw or ${awayName}`) || pred.includes(`x2`))) {
    return awayWin || draw ? 'won' : 'lost';
  }
  if (homeName && awayName && (pred.includes(`${homeName} or ${awayName}`) || pred.includes(`${homeName}_${awayName}`))) {
    return homeWin || awayWin ? 'won' : 'lost';
  }

  if (/(home|1|[\w\s.-]+) or draw/i.test(pred) || /(home|1|[\w\s.-]+) or x/i.test(pred)) {
    if (!pred.includes('away')) return homeWin || draw ? 'won' : 'lost';
  }
  if (/(away|2|[\w\s.-]+) or draw/i.test(pred) || /draw or (away|2|[\w\s.-]+)/i.test(pred) || /x or (away|2)/i.test(pred)) {
    if (!pred.includes('home') || pred.indexOf('home') > pred.indexOf('away')) return awayWin || draw ? 'won' : 'lost';
  }

  // --- First half winner (1X2 at HT; requires API half-time score) ---
  const isFirstHalf1x2 =
    /first\s*half\s*winner|half\s*time\s*winner|1st\s*half\s*winner|half\s*time\s*result/i.test(pred);
  if (isFirstHalf1x2) {
    if (!hasHt || htH === null || htA === null) return null;
    const hWin = htH > htA;
    const aWin = htA > htH;
    const hDr = htH === htA;
    const afterColon = pred.includes(':') ? pred.split(':').pop()!.trim() : pred;
    if (afterColon === 'home' || afterColon === '1') return hWin ? 'won' : 'lost';
    if (afterColon === 'away' || afterColon === '2') return aWin ? 'won' : 'lost';
    if (afterColon === 'draw' || afterColon === 'x') return hDr ? 'won' : 'lost';
    if (afterColon.includes('home') && !afterColon.includes('away')) return hWin ? 'won' : 'lost';
    if (afterColon.includes('away') && !afterColon.includes('home')) return aWin ? 'won' : 'lost';
    if (afterColon.includes('draw')) return hDr ? 'won' : 'lost';
    return null;
  }

  // --- First half goals Over/Under (requires HT score; do before full-time O/U) ---
  const isFirstHalfOu =
    (/first\s*half|1st\s*half/i.test(pred) || /goals over\/under first half/i.test(pred)) &&
    /over|under/i.test(pred);
  if (isFirstHalfOu) {
    if (!hasHt || htH === null || htA === null) return null;
    const htTotal = htH + htA;
    const oum = pred.match(/(?:over|under)\s*([\d.]+)/i);
    if (oum) {
      const line = parseFloat(oum[1]);
      if (Number.isFinite(line)) {
        const side = pickOverUnderSide(pred);
        if (side === 'over') return htTotal > line ? 'won' : 'lost';
        if (side === 'under') return htTotal < line ? 'won' : 'lost';
      }
    }
    return null;
  }

  // --- Match Winner by team/player name (Odds API sports) ---
  if (pred.startsWith('match winner:')) {
    const picked = pred.replace('match winner:', '').trim();
    if (homeName && picked === homeName) return homeWin ? 'won' : 'lost';
    if (awayName && picked === awayName) return awayWin ? 'won' : 'lost';
    if (homeName && (homeName.includes(picked) || picked.includes(homeName))) return homeWin ? 'won' : 'lost';
    if (awayName && (awayName.includes(picked) || picked.includes(awayName))) return awayWin ? 'won' : 'lost';
    if (picked === 'home' || picked === '1') return homeWin ? 'won' : 'lost';
    if (picked === 'away' || picked === '2') return awayWin ? 'won' : 'lost';
    if (picked === 'draw' || picked === 'x') return draw ? 'won' : 'lost';
    return null;
  }

  // --- Match Winner (1X2) ---
  if (pred === 'home' || pred === '1' || pred === 'home win') return homeWin ? 'won' : 'lost';
  if (pred === 'away' || pred === '2' || pred === 'away win') return awayWin ? 'won' : 'lost';
  if (pred === 'draw' || pred === 'x') return draw ? 'won' : 'lost';

  // --- Over/Under full time (all sports: goals, points, etc.) ---
  const overUnderMatch = pred.match(/(?:over|under)\s*([\d.]+)/i);
  if (overUnderMatch) {
    const line = parseFloat(overUnderMatch[1]);
    if (Number.isFinite(line)) {
      const side = pickOverUnderSide(pred);
      if (side === 'over') return total > line ? 'won' : 'lost';
      if (side === 'under') return total < line ? 'won' : 'lost';
    }
  }
  if (pred.includes('over 3.5') || pred.includes('over3.5')) return total > 3.5 ? 'won' : 'lost';
  if (pred.includes('under 3.5') || pred.includes('under3.5')) return total < 3.5 ? 'won' : 'lost';
  if (pred.includes('over 2.5') || pred.includes('over2.5') || pred === 'over25') return total > 2.5 ? 'won' : 'lost';
  if (pred.includes('under 2.5') || pred.includes('under2.5') || pred === 'under25') return total < 2.5 ? 'won' : 'lost';
  if (pred.includes('over 1.5') || pred.includes('over1.5')) return total > 1.5 ? 'won' : 'lost';
  if (pred.includes('under 1.5') || pred.includes('under1.5')) return total < 1.5 ? 'won' : 'lost';

  // --- Both Teams To Score ---
  if (pred.includes('btts') && pred.includes('no')) return !bothScored ? 'won' : 'lost';
  if (pred.includes('btts') || (pred.includes('both teams') && pred.includes('yes'))) return bothScored ? 'won' : 'lost';
  if (pred.includes('both teams') && pred.includes('no')) return !bothScored ? 'won' : 'lost';

  // --- Draw No Bet (match winner, draw = void) ---
  if (pred.includes('draw no bet') || pred.includes('draw_no_bet') || pred.includes('dnb')) {
    if (draw) return 'void';
    if (pred.includes('home') || (homeName && pred.includes(homeName) && !pred.includes(awayName))) return homeWin ? 'won' : 'lost';
    if (pred.includes('away') || (awayName && pred.includes(awayName) && !pred.includes(homeName))) return awayWin ? 'won' : 'lost';
    return null;
  }

  // --- Handicap / Spread (e.g. "Home -3.5", "Away +2.5", "Lakers -5.5") ---
  // Home -3.5 = home needs to win by >3.5. Home +2.5 = home can lose by <2.5.
  const handicapHomeAway = pred.match(/(?:home|away)\s*([+-])\s*([\d.]+)/i);
  const handicapTeam = homeName && awayName ? pred.match(new RegExp(`(${escapeRegex(homeName)}|${escapeRegex(awayName)})\\s*([+-])\\s*([\\d.]+)`, 'i')) : null;
  const handicapMatch = handicapHomeAway ?? handicapTeam;
  if (handicapMatch) {
    const sign = handicapHomeAway ? handicapMatch[1] : handicapMatch[2];
    const num = parseFloat(handicapHomeAway ? handicapMatch[2] : handicapMatch[3]);
    const line = sign === '-' ? num : -num;
    if (Number.isFinite(line)) {
      const margin = homeScore - awayScore;
      const isHome = pred.includes('home') || (handicapTeam && handicapMatch[1]?.toLowerCase() === homeName);
      const isAway = pred.includes('away') || (handicapTeam && handicapMatch[1]?.toLowerCase() === awayName);
      if (isHome && !isAway) return (margin - line) > 0 ? 'won' : 'lost';
      if (isAway && !isHome) return (-margin - line) > 0 ? 'won' : 'lost';
    }
  }

  // --- Odd/Even (total goals/points), including "Odd/Even: Odd" from coupon builder ---
  if (pred.includes('odd/even') || pred.includes('goals odd/even')) {
    const m = pred.match(/:\s*(odd|even)\b/i);
    if (m) {
      const wantOdd = m[1].toLowerCase() === 'odd';
      return (total % 2 === 1) === wantOdd ? 'won' : 'lost';
    }
  }
  if (/^(odd|even)(\s+total)?$/i.test(pred) || /\b(odd|even)\s+total/i.test(pred)) {
    const wantOdd = /odd/i.test(pred);
    return (total % 2 === 1) === wantOdd ? 'won' : 'lost';
  }

  // --- Set Betting (tennis) ---
  if (pred.includes('set betting') || pred.includes('setbetting')) {
    const setMatch = pred.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (setMatch) {
      const a = parseInt(setMatch[1], 10);
      const b = parseInt(setMatch[2], 10);
      const actual1 = `${homeScore}-${awayScore}`;
      const actual2 = `${awayScore}-${homeScore}`;
      const expected1 = `${a}-${b}`;
      const expected2 = `${b}-${a}`;
      return actual1 === expected1 || actual1 === expected2 || actual2 === expected1 || actual2 === expected2 ? 'won' : 'lost';
    }
  }

  // --- Correct Score (football, exact order) ---
  const scoreMatch = pred.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (scoreMatch) {
    const expected = `${scoreMatch[1]}-${scoreMatch[2]}`;
    const actual = `${homeScore}-${awayScore}`;
    return expected === actual ? 'won' : 'lost';
  }

  return null;
}
