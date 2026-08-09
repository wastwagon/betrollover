/**
 * Today-only diagnostic: can real major-league fixtures pair into 2-leg safe accas?
 *
 * Usage (from backend):
 *   npx ts-node -r tsconfig-paths/register scripts/diagnose-today-acca-pairs.ts
 *   TARGET_DATE=2026-07-06 FIXTURES_LIMIT=80 npx ts-node -r tsconfig-paths/register scripts/diagnose-today-acca-pairs.ts
 */

import { config } from 'dotenv';
import * as path from 'path';
config({ path: path.resolve(__dirname, '../../.env') });

import { parseApiFootballPredictionsOutcomes } from '../src/modules/fixtures/api-football-predictions.parser';
import {
  findSafest2LegPair,
  resolveAccaPolicy,
  SAFE_2_LEG_ACCA,
} from '../src/modules/predictions/safe-acca.util';
import { isMajorLeagueForSafeAcca } from '../src/config/major-leagues.config';
import { AI_TIPSTERS } from '../src/config/ai-tipsters.config';

const BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_SPORTS_KEY || '';
const TARGET_DATE = process.env.TARGET_DATE || new Date().toISOString().slice(0, 10);
const FIXTURES_LIMIT = Math.min(120, Math.max(10, parseInt(process.env.FIXTURES_LIMIT || '80', 10)));
const DELAY_MS = 320;

interface Leg {
  fixtureId: number;
  home: string;
  away: string;
  league: string;
  apiLeagueId: number | null;
  outcome: string;
  odds: number;
  prob: number;
  fromApi: boolean;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!API_KEY) {
    console.error('API_SPORTS_KEY not set');
    process.exit(1);
  }

  const headers = { 'x-apisports-key': API_KEY };
  const policy = resolveAccaPolicy({
    ...SAFE_2_LEG_ACCA,
    risk_level: 'balanced',
    target_odds_min: 2,
    target_odds_max: 5,
    leagues_focus: ['All'],
    bet_types: ['1X2', 'Double Chance', 'BTTS', 'Over/Under'],
    max_daily_predictions: 3,
  });

  console.log(`\n=== Today acca pair diagnostic: ${TARGET_DATE} ===\n`);

  const res = await fetch(`${BASE}/fixtures?date=${TARGET_DATE}`, { headers });
  const data = await res.json();
  const allFixtures = (data?.response || []) as any[];

  const majorFixtures = allFixtures.filter((f) =>
    isMajorLeagueForSafeAcca(f.league?.name, f.league?.id != null ? Number(f.league.id) : null),
  );

  console.log(`Fixtures on ${TARGET_DATE}: ${allFixtures.length} total, ${majorFixtures.length} major-league`);
  console.log(`Fetching predictions+odds for up to ${FIXTURES_LIMIT} major fixtures...\n`);

  const legs: Leg[] = [];
  const toFetch = majorFixtures.slice(0, FIXTURES_LIMIT);

  for (const f of toFetch) {
    const fix = f.fixture || {};
    const apiId = fix.id;
    const home = f.teams?.home?.name || 'Home';
    const away = f.teams?.away?.name || 'Away';
    const league = f.league?.name || '';
    const apiLeagueId = f.league?.id != null ? Number(f.league.id) : null;

    const [predRes, oddsRes] = await Promise.all([
      fetch(`${BASE}/predictions?fixture=${apiId}`, { headers }),
      fetch(`${BASE}/odds?fixture=${apiId}`, { headers }),
    ]);
    const predData = await predRes.json();
    const oddsData = await oddsRes.json();
    const predictions = predData?.response?.[0]?.predictions || {};
    const parsed = parseApiFootballPredictionsOutcomes(predictions as Record<string, unknown>);

    const oddsByOutcome: Record<string, number> = {};
    for (const b of oddsData?.response?.[0]?.bookmakers || []) {
      for (const bet of b.bets || []) {
        const name = (bet.name || '').toLowerCase();
        for (const v of bet.values || []) {
          const val = String(v.value || '').toLowerCase();
          const odd = parseFloat(String(v.odd));
          if (odd < 1.01) continue;
          if (name.includes('winner') || name.includes('match winner')) {
            if (val.includes('home')) oddsByOutcome.home = odd;
            if (val.includes('away')) oddsByOutcome.away = odd;
            if (val.includes('draw')) oddsByOutcome.draw = odd;
          }
          if (name.includes('goals') && name.includes('over')) {
            if (val.includes('over')) oddsByOutcome.over25 = odd;
            if (val.includes('under')) oddsByOutcome.under25 = odd;
          }
          if (name.includes('both teams') && val.includes('yes')) oddsByOutcome.btts = odd;
        }
      }
    }

    for (const o of parsed) {
      const odds = oddsByOutcome[o.outcome];
      if (odds == null) continue;
      if (odds < policy.legOddsMin || odds > policy.legOddsMax) continue;
      if (o.probability < 0.6) continue;
      legs.push({
        fixtureId: apiId,
        home,
        away,
        league,
        apiLeagueId,
        outcome: o.outcome,
        odds,
        prob: o.probability,
        fromApi: true,
      });
    }
    await sleep(DELAY_MS);
  }

  console.log(`Qualifying legs (major league, odds ${policy.legOddsMin}–${policy.legOddsMax}, API prob ≥60%): ${legs.length}`);
  console.log(`Unique fixtures with ≥1 qualifying leg: ${new Set(legs.map((l) => l.fixtureId)).size}\n`);

  if (legs.length > 0) {
    console.log('Sample qualifying legs:');
    for (const l of legs.slice(0, 12)) {
      console.log(
        `  ${l.home} vs ${l.away} (${l.league}) | ${l.outcome} @ ${l.odds.toFixed(2)} prob=${(l.prob * 100).toFixed(0)}%`,
      );
    }
    if (legs.length > 12) console.log(`  ... +${legs.length - 12} more`);
  }

  const pair = findSafest2LegPair(
    legs.map((l) => ({ fixtureId: l.fixtureId, odds: l.odds, probability: l.prob, fromApi: l.fromApi })),
    policy,
  );
  console.log('\n--- Best possible 2-leg pair (TheAnalyst-style flex) ---');
  if (!pair) {
    console.log('  NO valid pair found (need 2 different fixtures, combined 2.0–3.0, joint prob ≥42%)');
  } else {
    const [a, b] = pair;
    const la = legs.find((l) => l.fixtureId === a.fixtureId && l.odds === a.odds)!;
    const lb = legs.find((l) => l.fixtureId === b.fixtureId && l.odds === b.odds)!;
    const comb = a.odds * b.odds;
    const joint = a.probability * b.probability;
    console.log(`  Combined @ ${comb.toFixed(2)} | joint prob ${(joint * 100).toFixed(1)}%`);
    console.log(`  Leg1: ${la.home} vs ${la.away} — ${la.outcome} @ ${la.odds.toFixed(2)} (${(la.prob * 100).toFixed(0)}%)`);
    console.log(`  Leg2: ${lb.home} vs ${lb.away} — ${lb.outcome} @ ${lb.odds.toFixed(2)} (${(lb.prob * 100).toFixed(0)}%)`);
  }

  console.log(`\n--- Live tipsters (single-fixture) ---`);
  console.log(`  ${AI_TIPSTERS.length} tipsters configured for single-fixture coupons`);

  console.log('\n--- Day-of-week filter (today is ' + new Date(TARGET_DATE + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long' }) + ') ---');
  const day = new Date(TARGET_DATE + 'T12:00:00Z').getDay();
  const weekend = day === 0 || day === 6;
  const midweek = day >= 2 && day <= 4;
  console.log(`  Weekend tipsters active: ${weekend}`);
  console.log(`  Midweek tipsters active: ${midweek}`);
  console.log(`  Daily tipsters: always active\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
