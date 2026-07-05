/**
 * Fetch directly from API-Football (no DB): fixtures + predictions + odds,
 * then simulate which AI tipsters would get coupons. Uses same filters as engine.
 * Fixtures: next 7 days; first FIXTURES_LIMIT fixtures get full predictions+odds fetch.
 *
 * Usage (from backend directory):
 *   API_SPORTS_KEY=your_key npx ts-node -r tsconfig-paths/register scripts/test-ai-tipsters-from-api.ts
 *
 * Optional: FIXTURES_LIMIT=25 (default) max fixtures to fetch predictions for (saves API calls).
 */

import { config } from 'dotenv';
import * as path from 'path';
config({ path: path.resolve(__dirname, '../../.env') });

const BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_SPORTS_KEY || '';
const FIXTURES_LIMIT = Math.min(50, Math.max(10, parseInt(process.env.FIXTURES_LIMIT || '25', 10)));
const DELAY_MS = 350;

// Load AI tipsters config (same as engine)
import { AI_TIPSTERS, AiTipsterPersonality } from '../src/config/ai-tipsters.config';
import { fixtureInvolvesBigSix, isLikelyEplBigSixTeam } from '../src/config/epl-big-six.config';
import { leagueMatchesFocus } from '../src/config/league-focus.util';
import { parseApiFootballPredictionsOutcomes } from '../src/modules/fixtures/api-football-predictions.parser';
import { findSafest2LegPair, resolveAccaPolicy } from '../src/modules/predictions/safe-acca.util';
import { isMajorLeagueForSafeAcca } from '../src/config/major-leagues.config';

interface FixturePrediction {
  fixtureId: number;
  matchDate: Date;
  leagueName: string | null;
  apiLeagueId: number | null;
  selectedOutcome: string;
  odds: number;
  probability: number;
  ev: number;
  fromApi: boolean;
  homeTeam: string;
  awayTeam: string;
}

function impliedProb(odds: number, edge = 0.02): number {
  return Math.min(0.95, 1 / odds + edge);
}

function ev(prob: number, odds: number): number {
  return prob * odds - 1;
}

function matchesFixtureDays(matchDate: Date, fixtureDays?: 'weekend' | 'midweek'): boolean {
  if (!fixtureDays) return true;
  const d = new Date(matchDate).getDay();
  if (fixtureDays === 'weekend') return d === 0 || d === 6;
  if (fixtureDays === 'midweek') return d >= 2 && d <= 4;
  return true;
}

function matchesTeamFilter(
  fp: FixturePrediction,
  personality: AiTipsterPersonality,
): boolean {
  const filters = personality.team_filter;
  if (!filters?.length) return true;
  const spec = personality.outcome_specialization;
  for (const f of filters) {
    if (f.toLowerCase() !== 'top_6') continue;
    if (spec === 'home') {
      if (!isLikelyEplBigSixTeam(fp.homeTeam)) return false;
    } else if (spec === 'away') {
      if (!isLikelyEplBigSixTeam(fp.awayTeam)) return false;
    } else if (!fixtureInvolvesBigSix(fp.homeTeam, fp.awayTeam)) {
      return false;
    }
    return true;
  }
  return true;
}

function filterByPersonality(
  list: FixturePrediction[],
  personality: AiTipsterPersonality,
  excludeFixtureIds: Set<number>,
): FixturePrediction[] {
  const policy = resolveAccaPolicy(personality);
  const leagues = personality.leagues_focus || [];
  const hasAll = leagues.some((l) => l.toLowerCase() === 'all');
  const minConf = personality.min_api_confidence ?? Math.min(0.52, personality.min_win_probability);
  const minProb = personality.min_win_probability;
  const evRelax = personality.ev_min_relaxation ?? 0;
  const evMin = Math.max(0, (personality.min_expected_value ?? 0) - evRelax);

  return list.filter((fp) => {
    if (excludeFixtureIds.has(fp.fixtureId)) return false;
    if (!matchesFixtureDays(fp.matchDate, personality.fixture_days)) return false;
    if (!hasAll && leagues.length > 0) {
      if (!fp.leagueName) return false;
      if (!leagues.some((l) => leagueMatchesFocus(fp.leagueName, l))) return false;
    }
    if (!matchesTeamFilter(fp, personality)) return false;
    if (fp.odds < policy.legOddsMin || fp.odds > policy.legOddsMax) return false;
    if (policy.requireApiProbability && !fp.fromApi) return false;
    if (fp.fromApi) {
      if (fp.probability < minConf) return false;
    } else {
      if (fp.probability < minProb) return false;
    }
    if (!policy.skipEvFilter && fp.ev < evMin) return false;
    if (policy.majorLeaguesOnly && !isMajorLeagueForSafeAcca(fp.leagueName, fp.apiLeagueId)) return false;
    if (personality.selection_filter === 'home_only' && fp.selectedOutcome !== 'home') return false;
    if (personality.preference === 'underdogs') {
      if (fp.selectedOutcome !== 'away' || fp.odds < 2.5) return false;
    }

    const outcomeNorm = fp.selectedOutcome.toLowerCase();

    if (personality.outcome_specialization) {
      return outcomeNorm === personality.outcome_specialization;
    }

    const betTypes = personality.bet_types || [];
    const allows1x2 = betTypes.some((b) => b.toLowerCase().includes('1x2'));
    const allowsBtts = betTypes.some((b) => b.toLowerCase().includes('btts'));
    const allowsOver25 = betTypes.some((b) => b.toLowerCase().includes('over'));
    const allowsUnder25 = betTypes.some((b) => b.toLowerCase().includes('under'));
    const allowsDoubleChance = betTypes.some((b) => b.toLowerCase().includes('double'));
    const allowsDnb = betTypes.some((b) => {
      const x = b.toLowerCase();
      return x.includes('dnb') || x.includes('draw no bet');
    });
    const allowsFirstHalf = betTypes.some((b) => {
      const x = b.toLowerCase();
      return x.includes('first half') || x.includes('1st half') || x.includes('half time') || x === 'ht';
    });
    const normOu = (s: string) => s.toLowerCase().replace(/\s+/g, '');
    const hasOverUnderCombo = betTypes.some((b) => normOu(b) === 'over/under');
    const allowsOver15 =
      allowsOver25 ||
      hasOverUnderCombo ||
      betTypes.some((b) => /over.*1\.5|1\.5.*over|o\s*1\.5/i.test(b));
    const allowsOver35 =
      allowsOver25 ||
      hasOverUnderCombo ||
      betTypes.some((b) => /over.*3\.5|3\.5.*over/i.test(b));
    const allowsUnder15 =
      betTypes.some((b) => /under.*1\.5|1\.5.*under|u\s*1\.5/i.test(b)) || hasOverUnderCombo;
    const allowsUnder35 =
      betTypes.some((b) => /under.*3\.5|3\.5.*under/i.test(b)) || hasOverUnderCombo;
    const allowsOddEven = betTypes.some((b) => {
      const x = b.toLowerCase();
      return x.includes('odd/even') || x.includes('odd even') || (x.includes('odd') && x.includes('even'));
    });

    if (['home', 'away'].includes(outcomeNorm) && !allows1x2) return false;
    if (outcomeNorm === 'draw' && !allows1x2) return false;
    if (outcomeNorm === 'btts' && !allowsBtts) return false;
    if (outcomeNorm === 'over15' && !allowsOver15) return false;
    if (outcomeNorm === 'over25' && !allowsOver25) return false;
    if (outcomeNorm === 'over35' && !allowsOver35) return false;
    if (outcomeNorm === 'under15' && !allowsUnder15) return false;
    if (outcomeNorm === 'under25' && !allowsUnder25) return false;
    if (outcomeNorm === 'under35' && !allowsUnder35) return false;
    if (['home_away', 'home_draw', 'draw_away'].includes(outcomeNorm) && !allowsDoubleChance) return false;
    if (['dnb_home', 'dnb_away'].includes(outcomeNorm) && !allowsDnb) return false;
    if (['ht_home', 'ht_away', 'ht_draw'].includes(outcomeNorm) && !allowsFirstHalf) return false;
    if (
      [
        'fh_over05',
        'fh_under05',
        'fh_over15',
        'fh_under15',
        'fh_over25',
        'fh_under25',
      ].includes(outcomeNorm) &&
      !allowsFirstHalf
    )
      return false;
    if (['odd_goals', 'even_goals'].includes(outcomeNorm) && !allowsOddEven) return false;
    return true;
  });
}

async function main() {
  console.log('\n=== AI tipsters – test from API only (no DB) ===\n');
  console.log('API_SPORTS_KEY:', API_KEY ? `***${API_KEY.slice(-4)}` : 'NOT SET');
  console.log('FIXTURES_LIMIT:', FIXTURES_LIMIT, '\n');
  if (!API_KEY) {
    console.log('Set API_SPORTS_KEY to run.');
    process.exit(1);
  }

  const headers = { 'x-apisports-key': API_KEY };

  // 1. Fixtures next 7 days
  const allFixtures: {
    apiId: number;
    apiLeagueId: number | null;
    date: string;
    home: string;
    away: string;
    league: string;
  }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const res = await fetch(`${BASE}/fixtures?date=${dateStr}`, { headers });
    const data = await res.json();
    const list = data?.response || [];
    for (const f of list) {
      const fix = f.fixture || {};
      allFixtures.push({
        apiId: fix.id,
        apiLeagueId: f.league?.id != null ? Number(f.league.id) : null,
        date: dateStr,
        home: f.teams?.home?.name || 'Home',
        away: f.teams?.away?.name || 'Away',
        league: f.league?.name || '',
      });
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  const toFetch = allFixtures.slice(0, FIXTURES_LIMIT);
  console.log(`Fixtures (next 7 days): ${allFixtures.length}, fetching predictions+odds for first ${toFetch.length}\n`);

  // 2. Predictions + odds per fixture → one best outcome per fixture
  const fixturePredictions: FixturePrediction[] = [];
  for (let i = 0; i < toFetch.length; i++) {
    const f = toFetch[i];
    const [predRes, oddsRes] = await Promise.all([
      fetch(`${BASE}/predictions?fixture=${f.apiId}`, { headers }),
      fetch(`${BASE}/odds?fixture=${f.apiId}`, { headers }),
    ]);
    const predData = await predRes.json();
    const oddsData = await oddsRes.json();
    const resp = predData?.response?.[0];
    const predictions = resp?.predictions || {};
    const parsed = parseApiFootballPredictionsOutcomes(predictions as Record<string, unknown>);
    const outcomes: { outcome: string; prob: number; fromApi: boolean }[] = parsed.map((o) => ({
      outcome: o.outcome,
      prob: o.probability,
      fromApi: true,
    }));

    const bookmakers = oddsData?.response?.[0]?.bookmakers || [];
    const oddsByOutcome: Record<string, number> = {};
    for (const b of bookmakers) {
      for (const bet of b.bets || []) {
        const name = (bet.name || '').toLowerCase();
        for (const v of bet.values || []) {
          const val = String(v.value || '').toLowerCase();
          const odd = parseFloat(String(v.odd));
          if (odd < 1.01) continue;
          if (name.includes('winner') || name.includes('match winner')) {
            if (val.includes('home')) oddsByOutcome['home'] = odd;
            if (val.includes('away')) oddsByOutcome['away'] = odd;
            if (val.includes('draw')) oddsByOutcome['draw'] = odd;
          }
          if (name.includes('goals') && name.includes('over')) {
            if (val.includes('over')) oddsByOutcome['over25'] = odd;
            if (val.includes('under')) oddsByOutcome['under25'] = odd;
          }
          if (name.includes('both teams') && val.includes('yes')) oddsByOutcome['btts'] = odd;
        }
      }
    }

    const candidates: { outcome: string; odds: number; prob: number; ev: number; fromApi: boolean }[] = [];
    const seen = new Set<string>();
    for (const o of outcomes) {
      let odds = oddsByOutcome[o.outcome];
      if (odds == null) continue;
      if (seen.has(o.outcome)) continue;
      seen.add(o.outcome);
      const prob = o.fromApi ? o.prob : impliedProb(odds);
      candidates.push({ outcome: o.outcome, odds, prob, ev: ev(prob, odds), fromApi: o.fromApi });
    }
    for (const out of ['home', 'away', 'draw', 'over25', 'under25', 'btts']) {
      if (seen.has(out)) continue;
      const odds = oddsByOutcome[out];
      if (odds == null) continue;
      candidates.push({
        outcome: out,
        odds,
        prob: impliedProb(odds),
        ev: ev(impliedProb(odds), odds),
        fromApi: false,
      });
    }

    const EMIT_OUTCOMES = [
      'home',
      'away',
      'draw',
      'over15',
      'under15',
      'over25',
      'under25',
      'over35',
      'under35',
      'btts',
      'home_away',
      'home_draw',
      'draw_away',
      'dnb_home',
      'dnb_away',
      'ht_home',
      'ht_away',
      'ht_draw',
      'fh_over05',
      'fh_under05',
      'fh_over15',
      'fh_under15',
      'fh_over25',
      'fh_under25',
      'odd_goals',
      'even_goals',
    ] as const;

    for (const outcomeKey of EMIT_OUTCOMES) {
      const group = candidates.filter((c) => c.outcome === outcomeKey);
      if (group.length === 0) continue;
      const best = [...group].sort((a, b) => b.probability - a.probability)[0];
      if (!best || best.odds < 1.2 || best.odds > 5.5) continue;
      fixturePredictions.push({
        fixtureId: f.apiId,
        matchDate: new Date(f.date + 'T12:00:00Z'),
        leagueName: f.league || null,
        apiLeagueId: f.apiLeagueId,
        selectedOutcome: best.outcome,
        odds: best.odds,
        probability: best.prob,
        ev: best.ev,
        fromApi: best.fromApi,
        homeTeam: f.home,
        awayTeam: f.away,
      });
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`Fixture prediction rows (best EV per outcome per fixture): ${fixturePredictions.length}`);

  const safeLegBand = fixturePredictions.filter((fp) => fp.odds >= 1.28 && fp.odds <= 1.85 && fp.fromApi);
  console.log(`  Safe leg band (1.28–1.85, API prob): ${safeLegBand.length}`);
  if (fixturePredictions.length > 0) {
    console.log('  Sample (real API data):');
    fixturePredictions.slice(0, 8).forEach((fp) => {
      console.log(`    ${fp.homeTeam} vs ${fp.awayTeam} | ${fp.selectedOutcome} @ ${fp.odds.toFixed(2)} | prob=${fp.probability.toFixed(2)} ev=${fp.ev.toFixed(3)}`);
    });
  }
  console.log('');

  // 3. Simulate per-tipster: global usedFixtureIds, 2-leg safe accas (or singles)
  const usedFixtureIds = new Set<number>();
  const picksByTipster = new Map<string, { count: number; samples: string[] }>();

  for (const cfg of AI_TIPSTERS) {
    picksByTipster.set(cfg.username, { count: 0, samples: [] });
  }

  for (const tipsterConfig of AI_TIPSTERS) {
    const policy = resolveAccaPolicy(tipsterConfig.personality);
    const maxForTipster = tipsterConfig.personality.max_daily_predictions ?? 999;
    let count = 0;
    while (count < maxForTipster) {
      const available = filterByPersonality(
        fixturePredictions,
        tipsterConfig.personality,
        usedFixtureIds,
      );
      if (available.length === 0) break;

      if (policy.couponLegs === 2) {
        const pair = findSafest2LegPair(available, policy);
        if (!pair) break;
        const [a, b] = pair;
        const comb = a.odds * b.odds;
        usedFixtureIds.add(a.fixtureId);
        usedFixtureIds.add(b.fixtureId);
        const entry = picksByTipster.get(tipsterConfig.username)!;
        entry.count++;
        if (entry.samples.length < 2) {
          entry.samples.push(
            `@${comb.toFixed(2)}: ${a.homeTeam} vs ${a.awayTeam} (${a.selectedOutcome} ${a.odds.toFixed(2)}) + ${b.homeTeam} vs ${b.awayTeam} (${b.selectedOutcome} ${b.odds.toFixed(2)})`,
          );
        }
      } else {
        const sortKey = policy.selectionMode === 'confidence' ? 'probability' : 'ev';
        const best = [...available].sort((x, y) =>
          sortKey === 'probability' ? y.probability - x.probability : y.ev - x.ev,
        )[0];
        if (!best) break;
        usedFixtureIds.add(best.fixtureId);
        const entry = picksByTipster.get(tipsterConfig.username)!;
        entry.count++;
        if (entry.samples.length < 2) {
          entry.samples.push(
            `@${best.odds.toFixed(2)}: ${best.homeTeam} vs ${best.awayTeam} (${best.selectedOutcome})`,
          );
        }
      }
      count++;
    }
  }

  // 4. Report
  const withPicks = [...picksByTipster.entries()]
    .filter(([, v]) => v.count > 0)
    .sort((a, b) => b[1].count - a[1].count);
  const withZero = [...picksByTipster.entries()].filter(([, v]) => v.count === 0);

  console.log('--- Tipsters WITH coupons (2-leg safe acca simulation) ---');
  for (const [username, v] of withPicks) {
    const cfg = AI_TIPSTERS.find((t) => t.username === username);
    console.log(`  ${cfg?.display_name ?? username} (${username}): ${v.count} coupon(s)`);
    for (const s of v.samples) console.log(`      ${s}`);
  }

  console.log('\n--- Tipsters with 0 coupons ---');
  for (const [username] of withZero) {
    const cfg = AI_TIPSTERS.find((t) => t.username === username);
    console.log(`  ${cfg?.display_name ?? username} (${username})`);
  }

  const totalPicks = withPicks.reduce((s, [, v]) => s + v.count, 0);
  console.log('\n--- Summary ---');
  console.log(`  Tipsters with ≥1 coupon: ${withPicks.length}/${AI_TIPSTERS.length}`);
  console.log(`  Tipsters with 0 coupons: ${withZero.length}`);
  console.log(`  Total coupons (simulated): ${totalPicks}`);
  console.log(
    '  Model: 2 high-confidence API legs per coupon (2.0–3.5 combined) unless coupon_legs=1 profile.',
  );
  console.log('  (No DB – fetched directly from API-Football)\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
