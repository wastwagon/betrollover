/**
 * Tune safe 2-leg acca thresholds using:
 * 1) Settled AI coupons in Postgres (true win-rate backtest when DB is up)
 * 2) Upcoming major-league fixtures (pool size at each joint-prob floor — pre-match API data)
 *
 * Note: API /predictions on finished fixtures often returns distorted % (e.g. 50/50/0).
 * Do not use post-match API predictions for historical win-rate backtests.
 *
 * Usage (from backend/):
 *   npx ts-node -r tsconfig-paths/register scripts/analyze-safe-acca-backtest.ts
 *
 * Env (.env):
 *   API_SPORTS_KEY     — required for upcoming pool diagnostic
 *   LAST_DAYS=30       — DB lookback (default 30)
 *   POOL_DAYS=3        — upcoming days for pool diagnostic (default 3)
 *   MAX_FIXTURES=120   — cap upcoming fixture API calls
 *   DELAY_MS=200
 */

import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../.env') });

import { getSportApiBaseUrl } from '../src/config/sports.config';
import { isMajorLeagueForSafeAcca } from '../src/config/major-leagues.config';
import { normalizeApiMarketName } from '../src/modules/fixtures/api-market-aliases';
import { outcomeKeyFromOddsLine } from '../src/modules/fixtures/odds-outcome-keys';
import { parseApiFootballPredictionsOutcomes } from '../src/modules/fixtures/api-football-predictions.parser';
import { findSafest2LegPair, resolveAccaPolicy, SAFE_ACCA_DEFAULTS } from '../src/modules/predictions/safe-acca.util';
import { SAFE_2_LEG_ACCA } from '../src/config/ai-tipsters.config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const BASE = getSportApiBaseUrl('football');
const API_KEY = process.env.API_SPORTS_KEY || '';
const LAST_DAYS = Math.min(90, Math.max(7, parseInt(process.env.LAST_DAYS || '30', 10) || 30));
const POOL_DAYS = Math.min(7, Math.max(1, parseInt(process.env.POOL_DAYS || '3', 10) || 3));
const MAX_FIXTURES = Math.min(300, Math.max(20, parseInt(process.env.MAX_FIXTURES || '120', 10) || 120));
const DELAY_MS = Math.max(0, parseInt(process.env.DELAY_MS || '200', 10) || 200);

const JOINT_THRESHOLDS = [0.35, 0.38, 0.40, 0.42, 0.45, 0.48] as const;

type PoolLeg = {
  fixtureId: number;
  apiLeagueId: number | null;
  league: string;
  home: string;
  away: string;
  date: string;
  selectedOutcome: string;
  odds: number;
  probability: number;
  fromApi: boolean;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const SAFE_OUTCOMES = [
  'home',
  'home_draw',
  'home_away',
  'draw_away',
  'over25',
  'under25',
  'btts',
] as const;

function flattenOdds(oddsJson: any): Array<{ marketName: string; marketValue: string; odds: number }> {
  const out: Array<{ marketName: string; marketValue: string; odds: number }> = [];
  for (const bm of oddsJson?.response?.[0]?.bookmakers || []) {
    for (const bet of bm.bets || []) {
      const marketName = normalizeApiMarketName(bet.name || '');
      for (const value of bet.values || []) {
        const marketValue = String(value.value ?? '');
        const odd = parseFloat(String(value.odd));
        if (!marketValue || Number.isNaN(odd) || odd < 1.01) continue;
        const existing = out.find((o) => o.marketName === marketName && o.marketValue === marketValue);
        if (!existing) out.push({ marketName, marketValue, odds: odd });
        else if (odd > existing.odds) existing.odds = odd;
      }
    }
  }
  return out;
}

async function fetchUpcomingMajorFixtures(headers: Record<string, string>): Promise<
  Array<{
    apiId: number;
    apiLeagueId: number | null;
    league: string;
    home: string;
    away: string;
    date: string;
  }>
> {
  const out: Array<{
    apiId: number;
    apiLeagueId: number | null;
    league: string;
    home: string;
    away: string;
    date: string;
  }> = [];

  for (let d = 0; d < POOL_DAYS; d++) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + d);
    const dateStr = day.toISOString().slice(0, 10);
    const res = await fetch(`${BASE}/fixtures?date=${dateStr}&status=NS-TBD`, { headers });
    if (!res.ok) continue;
    const data = await res.json();
    for (const row of data?.response || []) {
      const fix = row.fixture || {};
      const apiLeagueId = row.league?.id != null ? Number(row.league.id) : null;
      const league = row.league?.name || '';
      if (!isMajorLeagueForSafeAcca(league, apiLeagueId)) continue;
      out.push({
        apiId: fix.id,
        apiLeagueId,
        league,
        home: row.teams?.home?.name || 'Home',
        away: row.teams?.away?.name || 'Away',
        date: dateStr,
      });
    }
    await sleep(150);
  }
  return out;
}

async function buildUpcomingLegs(
  fx: Awaited<ReturnType<typeof fetchUpcomingMajorFixtures>>[0],
  headers: Record<string, string>,
): Promise<PoolLeg[]> {
  const [predRes, oddsRes] = await Promise.all([
    fetch(`${BASE}/predictions?fixture=${fx.apiId}`, { headers }),
    fetch(`${BASE}/odds?fixture=${fx.apiId}`, { headers }),
  ]);
  const predBlock = (await predRes.json())?.response?.[0]?.predictions;
  if (!predBlock) return [];
  const apiOutcomes = parseApiFootballPredictionsOutcomes(predBlock as Record<string, unknown>);
  const oddsLines = flattenOdds(await oddsRes.json());

  const policy = resolveAccaPolicy({
    ...SAFE_2_LEG_ACCA,
    target_odds_min: 2,
    target_odds_max: 5,
    leagues_focus: ['All'],
    bet_types: ['1X2', 'Double Chance', 'Over/Under', 'BTTS'],
    max_daily_predictions: 1,
    risk_level: 'conservative',
  });

  const legs: PoolLeg[] = [];
  for (const outcomeKey of SAFE_OUTCOMES) {
    const apiOutcome = apiOutcomes.find((o) => o.outcome === outcomeKey);
    if (!apiOutcome) continue;
    let bestOdds: number | null = null;
    for (const line of oddsLines) {
      const key = outcomeKeyFromOddsLine(line.marketName, line.marketValue);
      if (key !== outcomeKey) continue;
      if (line.odds >= policy.legOddsMin && line.odds <= policy.legOddsMax) {
        bestOdds = bestOdds == null ? line.odds : Math.max(bestOdds, line.odds);
      }
    }
    if (bestOdds == null) continue;
    if (apiOutcome.probability < (SAFE_2_LEG_ACCA.min_api_confidence ?? 0.6)) continue;
    legs.push({
      fixtureId: fx.apiId,
      apiLeagueId: fx.apiLeagueId,
      league: fx.league,
      home: fx.home,
      away: fx.away,
      date: fx.date,
      selectedOutcome: outcomeKey,
      odds: bestOdds,
      probability: apiOutcome.probability,
      fromApi: true,
    });
  }
  return legs;
}

async function runUpcomingPoolDiagnostic(headers: Record<string, string>) {
  console.log(`\n=== Upcoming pool diagnostic (next ${POOL_DAYS} days, major leagues) ===\n`);
  const fixtures = await fetchUpcomingMajorFixtures(headers);
  console.log(`Upcoming major-league fixtures: ${fixtures.length}`);

  const toProcess = fixtures.slice(0, MAX_FIXTURES);
  const legsByDate = new Map<string, PoolLeg[]>();

  for (let i = 0; i < toProcess.length; i++) {
    const fx = toProcess[i];
    const legs = await buildUpcomingLegs(fx, headers);
    if (legs.length === 0) continue;
    const list = legsByDate.get(fx.date) || [];
    list.push(...legs);
    legsByDate.set(fx.date, list);
    if ((i + 1) % 25 === 0) process.stderr.write(`  scanned ${i + 1}/${toProcess.length}\n`);
    await sleep(DELAY_MS);
  }

  const allLegs = [...legsByDate.values()].flat();
  console.log(
    `Qualifying legs (≥${((SAFE_2_LEG_ACCA.min_api_confidence ?? 0.6) * 100).toFixed(0)}% API, odds ${SAFE_2_LEG_ACCA.leg_odds_min}–${SAFE_2_LEG_ACCA.leg_odds_max}): ${allLegs.length}`,
  );

  const basePolicy = resolveAccaPolicy({
    ...SAFE_2_LEG_ACCA,
    target_odds_min: 2,
    target_odds_max: 5,
    leagues_focus: ['All'],
    bet_types: ['1X2'],
    max_daily_predictions: 1,
    risk_level: 'conservative',
  });

  const rows: Array<{ min_joint: number; days_with_pair: number; sample_pairs: number; avg_combined: string }> = [];

  for (const minJoint of JOINT_THRESHOLDS) {
    const policy = { ...basePolicy, minJointProbability: minJoint };
    let daysWithPair = 0;
    let samplePairs = 0;
    let combSum = 0;
    for (const [, dayLegs] of legsByDate) {
      const pair = findSafest2LegPair(dayLegs, policy);
      if (!pair) continue;
      daysWithPair++;
      samplePairs++;
      combSum += pair[0].odds * pair[1].odds;
    }
    rows.push({
      min_joint: minJoint,
      days_with_pair: daysWithPair,
      sample_pairs: samplePairs,
      avg_combined: samplePairs > 0 ? (combSum / samplePairs).toFixed(2) : '—',
    });
  }

  console.log('\n--- Days with at least one valid 2-leg pair (by joint-prob floor) ---');
  console.table(rows);
  console.log(
    `\nRecommended live floor: min_joint_probability=${SAFE_ACCA_DEFAULTS.minJointProbability}, min_api_confidence=${SAFE_2_LEG_ACCA.min_api_confidence}\n`,
  );
}

async function runDbBacktest() {
  const url = process.env.DATABASE_URL?.trim();
  let ds: DataSource;
  if (url) {
    ds = new DataSource({ type: 'postgres', url, namingStrategy: new SnakeNamingStrategy(), synchronize: false });
  } else {
    ds = new DataSource({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER || 'betrollover',
      password: process.env.POSTGRES_PASSWORD || 'betrollover_dev',
      database: process.env.POSTGRES_DB || 'betrollover',
      namingStrategy: new SnakeNamingStrategy(),
      synchronize: false,
    });
  }

  try {
    await ds.initialize();
  } catch {
    console.log('(DB unreachable — skipping settled coupon backtest)\n');
    return;
  }

  try {
    console.log(`=== Settled AI coupons (DB, last ${LAST_DAYS} days) ===\n`);
    const rows = (await ds.query(
      `SELECT p.id,
              p.combined_odds,
              p.status,
              p.prediction_date,
              COUNT(pf.id)::int AS legs,
              SUM(CASE WHEN pf.result_status = 'won' THEN 1 ELSE 0 END)::int AS legs_won
       FROM predictions p
       INNER JOIN tipsters t ON t.id = p.tipster_id AND t.is_ai = true
       LEFT JOIN prediction_fixtures pf ON pf.prediction_id = p.id
       WHERE p.status IN ('won', 'lost')
         AND p.prediction_date >= (CURRENT_DATE - INTERVAL '${LAST_DAYS} days')
       GROUP BY p.id, p.combined_odds, p.status, p.prediction_date
       ORDER BY p.prediction_date DESC`,
    )) as Array<{
      id: number;
      combined_odds: string;
      status: string;
      prediction_date: string;
      legs: number;
      legs_won: number;
    }>;

    if (rows.length === 0) {
      console.log('No settled AI coupons in the last 30 days.\n');
      return;
    }

    const accas = rows.filter((r) => Number(r.legs) >= 2);
    const singles = rows.filter((r) => Number(r.legs) < 2);
    const accaWins = accas.filter((r) => r.status === 'won').length;
    const singleWins = singles.filter((r) => r.status === 'won').length;

    console.log(`Total settled: ${rows.length} (${accas.length} multi-leg, ${singles.length} single)`);
    if (accas.length > 0) {
      console.log(`2+ leg acca win rate: ${accaWins}/${accas.length} (${((accaWins / accas.length) * 100).toFixed(1)}%)`);
    }
    if (singles.length > 0) {
      console.log(`Single-leg win rate: ${singleWins}/${singles.length} (${((singleWins / singles.length) * 100).toFixed(1)}%)`);
    }

    const jointRows = (await ds.query(
      `WITH two_leg AS (
         SELECT p.id,
                p.status,
                p.combined_odds,
                MAX(CASE WHEN pf.leg_number = 1 THEN pf.ai_probability END)::float AS p1,
                MAX(CASE WHEN pf.leg_number = 2 THEN pf.ai_probability END)::float AS p2
         FROM predictions p
         INNER JOIN tipsters t ON t.id = p.tipster_id AND t.is_ai = true
         INNER JOIN prediction_fixtures pf ON pf.prediction_id = p.id
         WHERE p.status IN ('won', 'lost')
           AND p.prediction_date >= (CURRENT_DATE - INTERVAL '${LAST_DAYS} days')
         GROUP BY p.id, p.status, p.combined_odds
         HAVING COUNT(pf.id) = 2
           AND MAX(CASE WHEN pf.leg_number = 1 THEN pf.ai_probability END) IS NOT NULL
           AND MAX(CASE WHEN pf.leg_number = 2 THEN pf.ai_probability END) IS NOT NULL
       )
       SELECT CASE
                WHEN p1 * p2 >= 0.48 THEN '0.48+'
                WHEN p1 * p2 >= 0.45 THEN '0.45-0.47'
                WHEN p1 * p2 >= 0.42 THEN '0.42-0.44'
                WHEN p1 * p2 >= 0.40 THEN '0.40-0.41'
                WHEN p1 * p2 >= 0.38 THEN '0.38-0.39'
                ELSE '<0.38'
              END AS joint_bucket,
              COUNT(*)::int AS n,
              SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END)::int AS wins
       FROM two_leg
       GROUP BY 1
       ORDER BY 1 DESC`,
    )) as Array<{ joint_bucket: string; n: number; wins: number }>;

    if (jointRows.length > 0) {
      console.log('\n--- 2-leg accas by stored joint AI probability ---');
      console.table(
        jointRows.map((r) => ({
          joint_bucket: r.joint_bucket,
          settled: r.n,
          wins: r.wins,
          win_pct: r.n > 0 ? `${((r.wins / r.n) * 100).toFixed(1)}%` : '—',
        })),
      );
    }
    console.log('');
  } finally {
    await ds.destroy();
  }
}

async function main() {
  if (!API_KEY) {
    console.error('Set API_SPORTS_KEY in .env');
    process.exit(1);
  }
  const headers = { 'x-apisports-key': API_KEY };
  await runUpcomingPoolDiagnostic(headers);
  await runDbBacktest();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
