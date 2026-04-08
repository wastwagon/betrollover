/**
 * Pure parse of API-Football /predictions `predictions` object (no HTTP, no Nest).
 * Covers: winner/percent, goals (1.5/2.5/3.5 + `goals.half` FH O/U), BTTS, half_time 1X2, odd_even.
 * @see https://www.api-football.com/documentation-v3
 */

export interface ApiPredictionOutcome {
  outcome: string;
  probability: number;
  rawPercent?: number;
}

export function parsePercent(val: string | number): number {
  if (typeof val === 'number') return Math.min(1, Math.max(0, val));
  const s = String(val || '').replace(/[^\d.]/g, '');
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n > 1 ? n / 100 : n));
}

export function parseApiFootballPredictionsOutcomes(
  predictions: Record<string, unknown>,
): ApiPredictionOutcome[] {
  const outcomes: ApiPredictionOutcome[] = [];

  const winner = predictions?.winner as Record<string, string> | undefined;
  const percent = predictions?.percent as Record<string, string> | undefined;
  const homePct = winner?.home ?? percent?.home;
  const drawPct = winner?.draw ?? percent?.draw;
  const awayPct = winner?.away ?? percent?.away;
  if (homePct) {
    const p = parsePercent(homePct);
    outcomes.push({ outcome: 'home', probability: p, rawPercent: p * 100 });
  }
  if (drawPct) {
    const p = parsePercent(drawPct);
    outcomes.push({ outcome: 'draw', probability: p, rawPercent: p * 100 });
  }
  if (awayPct) {
    const p = parsePercent(awayPct);
    outcomes.push({ outcome: 'away', probability: p, rawPercent: p * 100 });
  }

  const goals = predictions?.goals as Record<string, unknown> | undefined;
  if (goals) {
    const pick = (keys: string[]): string | undefined => {
      for (const k of keys) {
        const v = goals[k];
        if (v != null && String(v).trim()) return String(v);
      }
      return undefined;
    };
    const over15 = pick(['over 1.5', 'Over 1.5', 'over_1_5']);
    const under15 = pick(['under 1.5', 'Under 1.5', 'under_1_5']);
    const over25 = (goals.over as string) || pick(['over 2.5', 'Over 2.5']);
    const under25 = (goals.under as string) || pick(['under 2.5', 'Under 2.5']);
    const over35 = pick(['over 3.5', 'Over 3.5']);
    const under35 = pick(['under 3.5', 'Under 3.5']);
    if (over15) {
      const p = parsePercent(over15);
      outcomes.push({ outcome: 'over15', probability: p, rawPercent: p * 100 });
    }
    if (under15) {
      const p = parsePercent(under15);
      outcomes.push({ outcome: 'under15', probability: p, rawPercent: p * 100 });
    }
    if (over25) {
      const p = parsePercent(over25);
      outcomes.push({ outcome: 'over25', probability: p, rawPercent: p * 100 });
    }
    if (under25) {
      const p = parsePercent(under25);
      outcomes.push({ outcome: 'under25', probability: p, rawPercent: p * 100 });
    }
    if (over35) {
      const p = parsePercent(over35);
      outcomes.push({ outcome: 'over35', probability: p, rawPercent: p * 100 });
    }
    if (under35) {
      const p = parsePercent(under35);
      outcomes.push({ outcome: 'under35', probability: p, rawPercent: p * 100 });
    }

    const fh = goals.half as Record<string, unknown> | undefined;
    if (fh && typeof fh === 'object') {
      for (const [key, raw] of Object.entries(fh)) {
        const kl = key.toLowerCase().replace(/\s+/g, '');
        if (raw == null || !String(raw).trim()) continue;
        let fhOutcome: string | null = null;
        if (kl.includes('over') && kl.includes('2.5')) fhOutcome = 'fh_over25';
        else if (kl.includes('under') && kl.includes('2.5')) fhOutcome = 'fh_under25';
        else if (kl.includes('over') && kl.includes('1.5')) fhOutcome = 'fh_over15';
        else if (kl.includes('under') && kl.includes('1.5')) fhOutcome = 'fh_under15';
        else if (kl.includes('over') && kl.includes('0.5')) fhOutcome = 'fh_over05';
        else if (kl.includes('under') && kl.includes('0.5')) fhOutcome = 'fh_under05';
        if (fhOutcome) {
          const p = parsePercent(String(raw));
          outcomes.push({ outcome: fhOutcome, probability: p, rawPercent: p * 100 });
        }
      }
    }
  }

  const btts = predictions?.btts as Record<string, string> | undefined;
  if (btts?.yes) {
    const p = parsePercent(btts.yes);
    outcomes.push({ outcome: 'btts', probability: p, rawPercent: p * 100 });
  }

  const halfTime = predictions?.half_time as Record<string, unknown> | undefined;
  if (halfTime) {
    const hH = halfTime.home ?? halfTime['1'];
    const hD = halfTime.draw ?? halfTime.x;
    const hA = halfTime.away ?? halfTime['2'];
    if (hH != null && String(hH).trim()) {
      const p = parsePercent(String(hH));
      outcomes.push({ outcome: 'ht_home', probability: p, rawPercent: p * 100 });
    }
    if (hD != null && String(hD).trim()) {
      const p = parsePercent(String(hD));
      outcomes.push({ outcome: 'ht_draw', probability: p, rawPercent: p * 100 });
    }
    if (hA != null && String(hA).trim()) {
      const p = parsePercent(String(hA));
      outcomes.push({ outcome: 'ht_away', probability: p, rawPercent: p * 100 });
    }
  }

  const oddEven = predictions?.odd_even as Record<string, unknown> | undefined;
  if (oddEven) {
    const oddP = oddEven.odd ?? oddEven.Odd;
    const evenP = oddEven.even ?? oddEven.Even;
    if (oddP != null && String(oddP).trim()) {
      const p = parsePercent(String(oddP));
      outcomes.push({ outcome: 'odd_goals', probability: p, rawPercent: p * 100 });
    }
    if (evenP != null && String(evenP).trim()) {
      const p = parsePercent(String(evenP));
      outcomes.push({ outcome: 'even_goals', probability: p, rawPercent: p * 100 });
    }
  }

  return outcomes;
}
