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

function splitMarketPrediction(prediction: string): { market: string; value: string; raw: string } {
  const raw = (prediction || '').trim();
  const idx = raw.indexOf(':');
  if (idx === -1) return { market: '', value: raw.toLowerCase(), raw: raw.toLowerCase() };
  return {
    market: raw.slice(0, idx).trim().toLowerCase(),
    value: raw.slice(idx + 1).trim().toLowerCase(),
    raw: raw.toLowerCase(),
  };
}

/** Grade a single Asian/spread half-line. Push → void. `signedLine` is the handicap on that side (Home -1 → -1). */
function gradeAsianLine(margin: number, signedLine: number): 'won' | 'lost' | 'void' {
  const diff = margin + signedLine;
  if (Math.abs(diff) < 1e-9) return 'void';
  return diff > 0 ? 'won' : 'lost';
}

/**
 * Asian quarter lines (.25 / .75): split into two half-stakes.
 * Binary tipster settlement: both win → won; both lose → lost; otherwise void (half-win / push mix).
 */
function gradeAsianHandicap(margin: number, signedLine: number): 'won' | 'lost' | 'void' {
  const abs = Math.abs(signedLine);
  const floor = Math.floor(abs + 1e-9);
  const frac = abs - floor;
  const isQuarter = Math.abs(frac - 0.25) < 1e-9 || Math.abs(frac - 0.75) < 1e-9;
  if (!isQuarter) return gradeAsianLine(margin, signedLine);

  let a: number;
  let b: number;
  if (Math.abs(frac - 0.25) < 1e-9) {
    a = floor;
    b = floor + 0.5;
  } else {
    a = floor + 0.5;
    b = floor + 1;
  }
  if (signedLine < 0) {
    a = -a;
    b = -b;
  }
  const g1 = gradeAsianLine(margin, a);
  const g2 = gradeAsianLine(margin, b);
  if (g1 === 'won' && g2 === 'won') return 'won';
  if (g1 === 'lost' && g2 === 'lost') return 'lost';
  return 'void';
}

export type FixtureMatchStatsInput = {
  homeCorners?: number | null;
  awayCorners?: number | null;
  homeYellowCards?: number | null;
  awayYellowCards?: number | null;
  homeRedCards?: number | null;
  awayRedCards?: number | null;
};

function gradeOu(total: number, pred: string): 'won' | 'lost' | null {
  const oum = pred.match(/(?:over|under)\s*([\d.]+)/i);
  if (!oum) return null;
  const line = parseFloat(oum[1]);
  if (!Number.isFinite(line)) return null;
  const side = pickOverUnderSide(pred);
  if (side === 'over') return total > line ? 'won' : 'lost';
  if (side === 'under') return total < line ? 'won' : 'lost';
  return null;
}

/**
 * Pure settlement logic for determining pick result from prediction and scores.
 * Extracted for unit testing. Used by SettlementService.
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
  /** Full-time corners / cards when available. */
  matchStats?: FixtureMatchStatsInput | null,
): 'won' | 'lost' | 'void' | null {
  const pred = (prediction || '').trim().toLowerCase();
  const { market, value } = splitMarketPrediction(prediction);
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

  const homeCorners = matchStats?.homeCorners;
  const awayCorners = matchStats?.awayCorners;
  const hasCorners =
    homeCorners != null &&
    awayCorners != null &&
    Number.isFinite(Number(homeCorners)) &&
    Number.isFinite(Number(awayCorners));
  const cH = hasCorners ? Number(homeCorners) : null;
  const cA = hasCorners ? Number(awayCorners) : null;
  const cTotal = hasCorners && cH !== null && cA !== null ? cH + cA : null;

  const yH = matchStats?.homeYellowCards;
  const yA = matchStats?.awayYellowCards;
  const rH = matchStats?.homeRedCards;
  const rA = matchStats?.awayRedCards;
  const hasYellow =
    yH != null && yA != null && Number.isFinite(Number(yH)) && Number.isFinite(Number(yA));
  const hasRed =
    rH != null && rA != null && Number.isFinite(Number(rH)) && Number.isFinite(Number(rA));
  const yellowTotal = hasYellow ? Number(yH) + Number(yA) : null;
  const redTotal = hasRed ? Number(rH) + Number(rA) : null;
  const cardsTotal =
    yellowTotal != null && redTotal != null
      ? yellowTotal + redTotal
      : yellowTotal != null
        ? yellowTotal
        : null;
  // Booking points: yellow 10, red 25 (common bookmaker convention)
  const bookingPoints =
    hasYellow && hasRed
      ? Number(yH) * 10 + Number(yA) * 10 + Number(rH) * 25 + Number(rA) * 25
      : null;

  // --- Corners / cards markets (before generic O/U so goals total is not used) ---
  const isCornerMarket =
    market.includes('corner') ||
    pred.includes('corners over') ||
    pred.includes('corners asian') ||
    pred.includes('corners 1x2') ||
    pred.includes('corners race') ||
    pred.includes('corners odd') ||
    pred.includes('multicorners');
  const isCardMarket =
    market.includes('card') ||
    market.includes('booking') ||
    pred.includes('yellow cards') ||
    pred.includes('cards over');

  if (isCornerMarket) {
    // Race To / period corners: we only store full-match totals — never grade with FT stats
    if (market.includes('race') || pred.includes('race to') || pred.includes('corners race')) {
      return null;
    }
    if (
      market.includes('1st half') ||
      market.includes('2nd half') ||
      market.includes('first half') ||
      market.includes('second half') ||
      pred.includes('1st half') ||
      pred.includes('2nd half') ||
      pred.includes('first half') ||
      pred.includes('second half')
    ) {
      return null;
    }

    if (!hasCorners || cH === null || cA === null || cTotal === null) return null;

    // Corners 1X2 / Double Chance
    if (market.includes('1x2') || market === 'corners 1x2' || market.includes('corner match')) {
      const homeCWin = cH > cA;
      const awayCWin = cA > cH;
      const cDraw = cH === cA;
      if (value === 'home' || value === '1') return homeCWin ? 'won' : 'lost';
      if (value === 'away' || value === '2') return awayCWin ? 'won' : 'lost';
      if (value === 'draw' || value === 'x') return cDraw ? 'won' : 'lost';
    }
    if (market.includes('double chance') && market.includes('corner')) {
      const homeCWin = cH > cA;
      const awayCWin = cA > cH;
      const cDraw = cH === cA;
      if (value.includes('home') && value.includes('draw')) return homeCWin || cDraw ? 'won' : 'lost';
      if (value.includes('away') && value.includes('draw')) return awayCWin || cDraw ? 'won' : 'lost';
      if (value.includes('home') && value.includes('away')) return homeCWin || awayCWin ? 'won' : 'lost';
    }

    // Corners Asian Handicap: Home -1 / Away +1.5
    if (market.includes('asian handicap') && market.includes('corner')) {
      const hm = value.match(/(home|away)\s*([+-])\s*([\d.]+)/i);
      if (hm) {
        const side = hm[1].toLowerCase();
        const signed = hm[2] === '-' ? -parseFloat(hm[3]) : parseFloat(hm[3]);
        const margin = side === 'home' ? cH - cA : cA - cH;
        return gradeAsianHandicap(margin, signed);
      }
    }

    // Home / Away team corners O/U
    if (market.includes('home corners') || (market.includes('home total corners') && !market.includes('away'))) {
      return gradeOu(cH, value) ?? gradeOu(cH, pred);
    }
    if (market.includes('away corners') || market.includes('away total corners')) {
      return gradeOu(cA, value) ?? gradeOu(cA, pred);
    }

    // Odd/Even corners
    if (market.includes('odd/even') || market.includes('odd/even') || pred.includes('corners odd')) {
      if (/\bodd\b/.test(value) && !/\beven\b/.test(value)) return cTotal % 2 === 1 ? 'won' : 'lost';
      if (/\beven\b/.test(value)) return cTotal % 2 === 0 ? 'won' : 'lost';
    }

    // Range: "6 - 8", "Under 6", "Over 14"
    const range = value.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range && market.includes('range')) {
      const lo = parseInt(range[1], 10);
      const hi = parseInt(range[2], 10);
      return cTotal >= lo && cTotal <= hi ? 'won' : 'lost';
    }
    if (market.includes('range')) {
      const underM = value.match(/under\s*(\d+)/i);
      const overM = value.match(/over\s*(\d+)/i);
      if (underM) return cTotal < parseInt(underM[1], 10) ? 'won' : 'lost';
      if (overM) return cTotal > parseInt(overM[1], 10) ? 'won' : 'lost';
      if (range) {
        const lo = parseInt(range[1], 10);
        const hi = parseInt(range[2], 10);
        return cTotal >= lo && cTotal <= hi ? 'won' : 'lost';
      }
    }

    // Total Corners (3 way): Exactly N / Over N / Under N
    if (market.includes('3 way') || /exactly\s*\d+/i.test(value)) {
      const ex = value.match(/exactly\s*(\d+)/i);
      if (ex) return cTotal === parseInt(ex[1], 10) ? 'won' : 'lost';
    }

    // Generic corners O/U / multicorners (total)
    const ou = gradeOu(cTotal, value) ?? gradeOu(cTotal, pred);
    if (ou) return ou;

    return null;
  }

  if (isCardMarket) {
    // Prefer total cards (Y+R) when both present; else yellow-only markets
    if (market.includes('yellow')) {
      if (!hasYellow || yellowTotal == null) return null;
      const ou = gradeOu(yellowTotal, value) ?? gradeOu(yellowTotal, pred);
      if (ou) return ou;
      return null;
    }
    if (market.includes('booking')) {
      if (bookingPoints == null) return null;
      const ou = gradeOu(bookingPoints, value) ?? gradeOu(bookingPoints, pred);
      if (ou) return ou;
      return null;
    }
    // Cards Over/Under — yellow+red when available
    if (cardsTotal == null) return null;
    const ou = gradeOu(cardsTotal, value) ?? gradeOu(cardsTotal, pred);
    if (ou) return ou;
    return null;
  }

  // --- Half-Time / Full-Time ---
  if (
    market.includes('half-time/full-time') ||
    market.includes('half time/full time') ||
    market.includes('ht/ft') ||
    market === 'double result'
  ) {
    if (!hasHt || htH === null || htA === null) return null;
    const mapTok = (t: string): 'H' | 'D' | 'A' | null => {
      const x = t.trim().toLowerCase();
      if (x === '1' || x === 'home' || x === 'h') return 'H';
      if (x === 'x' || x === 'draw' || x === 'd') return 'D';
      if (x === '2' || x === 'away' || x === 'a') return 'A';
      return null;
    };
    const parts = value.split(/[\/\-]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const htWant = mapTok(parts[0]);
      const ftWant = mapTok(parts[1]);
      if (!htWant || !ftWant) return null;
      const htRes: 'H' | 'D' | 'A' = htH > htA ? 'H' : htA > htH ? 'A' : 'D';
      const ftRes: 'H' | 'D' | 'A' = homeWin ? 'H' : awayWin ? 'A' : 'D';
      return htRes === htWant && ftRes === ftWant ? 'won' : 'lost';
    }
    return null;
  }

  // --- European Handicap (3-way): Home/Draw/Away with home-applied line ---
  if (market.includes('european handicap') || market.includes('3-way handicap') || market === 'handicap result') {
    const m =
      value.match(/^(home|draw|away|1|x|2)\s*([+-])\s*([\d.]+)$/i) ||
      pred.match(/european handicap:\s*(home|draw|away|1|x|2)\s*([+-])\s*([\d.]+)/i);
    if (m) {
      const selRaw = m[1].toLowerCase();
      const sel =
        selRaw === '1' || selRaw === 'home' ? 'home' : selRaw === '2' || selRaw === 'away' ? 'away' : 'draw';
      const homeLine = m[2] === '-' ? -parseFloat(m[3]) : parseFloat(m[3]);
      if (!Number.isFinite(homeLine)) return null;
      const adjHome = homeScore + homeLine;
      if (sel === 'home') return adjHome > awayScore ? 'won' : 'lost';
      if (sel === 'away') return adjHome < awayScore ? 'won' : 'lost';
      return adjHome === awayScore ? 'won' : 'lost';
    }
  }

  // --- Asian Handicap (2-way, void on push / half outcomes) ---
  if (market.includes('asian handicap') && !market.includes('corner')) {
    const hm = value.match(/(home|away)\s*([+-])\s*([\d.]+)/i);
    if (hm) {
      const side = hm[1].toLowerCase();
      const signed = hm[2] === '-' ? -parseFloat(hm[3]) : parseFloat(hm[3]);
      const margin = side === 'home' ? homeScore - awayScore : awayScore - homeScore;
      return gradeAsianHandicap(margin, signed);
    }
  }

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
    // Avoid matching "corners … home/away" already handled
    if (!isCornerMarket) return homeWin || awayWin ? 'won' : 'lost';
  }
  if (pred.includes('1x') || pred.includes('home_draw') || pred.includes('home or draw') || pred.includes('home/draw') || pred.includes('draw/home')) {
    if (!isCornerMarket) return homeWin || draw ? 'won' : 'lost';
  }
  if (pred.includes('x2') || pred.includes('draw_away') || pred.includes('draw or away') || pred.includes('draw/away') || pred.includes('away/draw')) {
    if (!isCornerMarket) return awayWin || draw ? 'won' : 'lost';
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
    const htTot = htH + htA;
    return gradeOu(htTot, pred);
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

  // --- Over/Under full time (goals/points) — not corners/cards ---
  const overUnderMatch = pred.match(/(?:over|under)\s*([\d.]+)/i);
  if (overUnderMatch && !isCornerMarket && !isCardMarket) {
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

  // --- Handicap / Spread (generic Home ±N / Away ±N / team name) ---
  const handicapHomeAway = pred.match(/(?:home|away)\s*([+-])\s*([\d.]+)/i);
  const handicapTeam =
    homeName && awayName
      ? pred.match(new RegExp(`(${escapeRegex(homeName)}|${escapeRegex(awayName)})\\s*([+-])\\s*([\\d.]+)`, 'i'))
      : null;
  const handicapMatch = handicapHomeAway ?? handicapTeam;
  if (handicapMatch) {
    const sign = handicapHomeAway ? handicapMatch[1] : handicapMatch[2];
    const num = parseFloat(handicapHomeAway ? handicapMatch[2] : handicapMatch[3]);
    const signedLine = sign === '-' ? -num : num;
    if (Number.isFinite(signedLine)) {
      const isHome = pred.includes('home') || (handicapTeam && handicapMatch[1]?.toLowerCase() === homeName);
      const isAway = pred.includes('away') || (handicapTeam && handicapMatch[1]?.toLowerCase() === awayName);
      if (isHome && !isAway) return gradeAsianHandicap(homeScore - awayScore, signedLine);
      if (isAway && !isHome) return gradeAsianHandicap(awayScore - homeScore, signedLine);
    }
  }

  // --- Odd/Even (total goals/points), including "Odd/Even: Odd" from coupon builder ---
  if (pred.includes('odd/even') || pred.includes('goals odd/even')) {
    if (isCornerMarket) return null;
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
      return actual1 === expected1 || actual1 === expected2 || actual2 === expected1 || actual2 === expected2
        ? 'won'
        : 'lost';
    }
  }

  // --- Correct Score (football, exact order) ---
  if (market.includes('correct score') || market.includes('exact score')) {
    const scoreMatch = value.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (scoreMatch) {
      const expected = `${scoreMatch[1]}-${scoreMatch[2]}`;
      const actual = `${homeScore}-${awayScore}`;
      return expected === actual ? 'won' : 'lost';
    }
  }
  const scoreMatch = pred.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (scoreMatch && !market.includes('handicap') && !market.includes('corner')) {
    const expected = `${scoreMatch[1]}-${scoreMatch[2]}`;
    const actual = `${homeScore}-${awayScore}`;
    return expected === actual ? 'won' : 'lost';
  }

  return null;
}
