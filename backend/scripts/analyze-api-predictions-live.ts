/**
 * Live analysis: API-Football /fixtures + /predictions + /odds (no DB).
 * For each supported market, compares model probability to bookmaker-implied prob
 * and reports EV = p_model * odds - 1, aggregated by market.
 *
 * Usage (from backend/):
 *   npx ts-node -r tsconfig-paths/register scripts/analyze-api-predictions-live.ts
 *
 * Env (repo root .env loaded automatically):
 *   API_SPORTS_KEY   — required
 *   DAYS=2           — fetch fixtures for today + next N-1 days (default 2)
 *   MAX_FIXTURES=50  — cap API calls (2 per fixture: predictions + odds)
 *   DELAY_MS=200     — pause between fixtures
 *
 * Disclaimer: API “percent” fields are not verified long-run calibration; treat as
 * exploratory signal only, not proof of edge.
 *
 * Markets with model probability: 1X2, O/U 1.5/2.5/3.5 (when API returns them), BTTS,
 * double chance, DNB (derived from 1X2 by renormalizing out draw), first-half 1X2
 * (when `predictions.half_time` exists), odd/even (when `predictions.odd_even` exists).
 * Model probabilities: `parseApiFootballPredictionsOutcomes` in `api-football-predictions.parser.ts`
 * (aligned with the prediction engine). Odds lines map via `outcomeKeyFromOddsLine`.
 */

import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../.env') });

import { getSportApiBaseUrl } from '../src/config/sports.config';
import { normalizeApiMarketName } from '../src/modules/fixtures/api-market-aliases';
import { outcomeKeyFromOddsLine } from '../src/modules/fixtures/odds-outcome-keys';
import {
  parseApiFootballPredictionsOutcomes,
  type ApiPredictionOutcome,
} from '../src/modules/fixtures/api-football-predictions.parser';

const BASE = getSportApiBaseUrl('football');
const API_KEY = process.env.API_SPORTS_KEY || '';

const DAYS = Math.min(7, Math.max(1, parseInt(process.env.DAYS || '2', 10) || 2));
const MAX_FIXTURES = Math.min(200, Math.max(5, parseInt(process.env.MAX_FIXTURES || '50', 10) || 50));
const DELAY_MS = Math.max(0, parseInt(process.env.DELAY_MS || '200', 10) || 200);

/** Normalized market names to pull from odds (must stay in sync with `outcomeKeyFromOddsLine`). */
const ANALYSIS_MARKETS = new Set<string>([
  'Match Winner',
  'Goals Over/Under',
  'Both Teams To Score',
  'Double Chance',
  'Draw No Bet',
  'Odd/Even',
  'First Half Winner',
  'Goals Over/Under First Half',
]);

/** Best odds per (marketName, marketValue) across bookmakers — mirrors market-filter idea without DB. */
function flattenOdds(oddsJson: any): Array<{ marketName: string; marketValue: string; odds: number }> {
  const out: Array<{ marketName: string; marketValue: string; odds: number }> = [];
  const bookmakers = oddsJson?.response?.[0]?.bookmakers || [];
  for (const bm of bookmakers) {
    for (const bet of bm.bets || []) {
      const marketName = normalizeApiMarketName(bet.name || '');
      if (!ANALYSIS_MARKETS.has(marketName)) continue;
      for (const value of bet.values || []) {
        const marketValue = String(value.value ?? '');
        const odd = parseFloat(String(value.odd));
        if (!marketValue || Number.isNaN(odd) || odd < 1.01) continue;
        const existing = out.find((o) => o.marketName === marketName && o.marketValue === marketValue);
        if (!existing) {
          out.push({ marketName, marketValue, odds: odd });
        } else if (odd > existing.odds) {
          existing.odds = odd;
        }
      }
    }
  }
  return out;
}

function probForOutcome(apiOutcomes: ApiPredictionOutcome[], outcome: string): number | null {
  const o = outcome.toLowerCase();
  if (o === 'home_away') {
    const home = apiOutcomes.find((a) => a.outcome === 'home');
    const away = apiOutcomes.find((a) => a.outcome === 'away');
    if (home && away) return home.probability + away.probability;
    return null;
  }
  if (o === 'home_draw') {
    const home = apiOutcomes.find((a) => a.outcome === 'home');
    const draw = apiOutcomes.find((a) => a.outcome === 'draw');
    if (home && draw) return home.probability + draw.probability;
    return null;
  }
  if (o === 'draw_away') {
    const draw = apiOutcomes.find((a) => a.outcome === 'draw');
    const away = apiOutcomes.find((a) => a.outcome === 'away');
    if (draw && away) return draw.probability + away.probability;
    return null;
  }
  if (o === 'dnb_home' || o === 'dnb_away') {
    const home = apiOutcomes.find((a) => a.outcome === 'home');
    const away = apiOutcomes.find((a) => a.outcome === 'away');
    if (!home || !away) return null;
    const s = home.probability + away.probability;
    if (s <= 0) return null;
    return o === 'dnb_home' ? home.probability / s : away.probability / s;
  }
  const found = apiOutcomes.find((a) => a.outcome === o);
  return found ? found.probability : null;
}

type Row = {
  market: string;
  ev: number;
  prob: number;
  implied: number;
  odds: number;
  fixture: string;
  league: string;
};

function median(nums: number[]): number {
  if (nums.length === 0) return NaN;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function main() {
  if (!API_KEY) {
    console.error('Missing API_SPORTS_KEY in .env (or environment).');
    process.exit(1);
  }

  const headers = { 'x-apisports-key': API_KEY };
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  type Fx = { apiId: number; label: string; league: string };
  const fixtures: Fx[] = [];
  for (const date of dates) {
    const res = await fetch(`${BASE}/fixtures?date=${date}`, { headers });
    if (!res.ok) {
      console.error(`fixtures?date=${date} HTTP ${res.status}`);
      process.exit(1);
    }
    const data = await res.json();
    const list = data?.response || [];
    for (const f of list) {
      const fix = f.fixture || {};
      const apiId = fix.id;
      if (!apiId) continue;
      const home = f.teams?.home?.name || 'Home';
      const away = f.teams?.away?.name || 'Away';
      const league = f.league?.name || '';
      fixtures.push({ apiId, label: `${home} vs ${away}`, league });
      if (fixtures.length >= MAX_FIXTURES) break;
    }
    if (fixtures.length >= MAX_FIXTURES) break;
  }

  console.log(`\n=== Live API analysis (API-Football) ===`);
  console.log(`Dates: ${dates.join(', ')} | fixtures capped: ${fixtures.length} | delay ${DELAY_MS}ms\n`);

  const rows: Row[] = [];
  let predErrors = 0;
  let oddsErrors = 0;
  let noPred = 0;
  let noOddsLines = 0;

  for (let i = 0; i < fixtures.length; i++) {
    const fx = fixtures[i];
    const [predRes, oddsRes] = await Promise.all([
      fetch(`${BASE}/predictions?fixture=${fx.apiId}`, { headers }),
      fetch(`${BASE}/odds?fixture=${fx.apiId}`, { headers }),
    ]);

    if (!predRes.ok) {
      predErrors++;
      if (DELAY_MS) await new Promise((r) => setTimeout(r, DELAY_MS));
      continue;
    }
    if (!oddsRes.ok) {
      oddsErrors++;
      if (DELAY_MS) await new Promise((r) => setTimeout(r, DELAY_MS));
      continue;
    }

    const predData = await predRes.json();
    const oddsData = await oddsRes.json();
    const resp = predData?.response?.[0];
    const apiOutcomes = resp?.predictions
      ? parseApiFootballPredictionsOutcomes(resp.predictions as Record<string, unknown>)
      : [];
    if (apiOutcomes.length === 0) {
      noPred++;
      if (DELAY_MS) await new Promise((r) => setTimeout(r, DELAY_MS));
      continue;
    }

    const flat = flattenOdds(oddsData);
    if (flat.length === 0) {
      noOddsLines++;
      if (DELAY_MS) await new Promise((r) => setTimeout(r, DELAY_MS));
      continue;
    }

    for (const line of flat) {
      const outcome = outcomeKeyFromOddsLine(line.marketName, line.marketValue);
      if (!outcome) continue;
      // Skip full-time draw only (keep ht_draw when API supplies half-time probs).
      if (outcome === 'draw') continue;

      const prob = probForOutcome(apiOutcomes, outcome);
      if (prob == null || prob <= 0) continue;

      const odds = line.odds;
      const implied = 1 / odds;
      const ev = prob * odds - 1;
      rows.push({
        market: outcome,
        ev,
        prob,
        implied,
        odds,
        fixture: fx.label,
        league: fx.league,
      });
    }

    if (DELAY_MS) await new Promise((r) => setTimeout(r, DELAY_MS));
    if ((i + 1) % 10 === 0) process.stdout.write(`  … ${i + 1}/${fixtures.length} fixtures\r`);
  }

  console.log(`\nFetched: pred HTTP errors ${predErrors}, odds HTTP errors ${oddsErrors}`);
  console.log(`No predictions payload: ${noPred}, no odds lines: ${noOddsLines}`);
  console.log(`Comparable (model prob + our market line) rows: ${rows.length}\n`);

  if (rows.length === 0) {
    console.log('Nothing to aggregate. Try MAX_FIXTURES=80 or another day with more games.');
    return;
  }

  const byMarket = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byMarket.get(r.market) || [];
    list.push(r);
    byMarket.set(r.market, list);
  }

  const summary: Array<{
    market: string;
    n: number;
    avg_ev_pct: string;
    med_ev_pct: string;
    pct_ev_pos: string;
    avg_model_pct: string;
    avg_implied_pct: string;
    avg_odds: string;
  }> = [];

  for (const [market, list] of [...byMarket.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const evs = list.map((x) => x.ev);
    const pos = evs.filter((e) => e > 0).length;
    summary.push({
      market,
      n: list.length,
      avg_ev_pct: ((evs.reduce((s, x) => s + x, 0) / evs.length) * 100).toFixed(2),
      med_ev_pct: (median(evs) * 100).toFixed(2),
      pct_ev_pos: ((pos / evs.length) * 100).toFixed(1),
      avg_model_pct: ((list.reduce((s, x) => s + x.prob, 0) / list.length) * 100).toFixed(1),
      avg_implied_pct: ((list.reduce((s, x) => s + x.implied, 0) / list.length) * 100).toFixed(1),
      avg_odds: (list.reduce((s, x) => s + x.odds, 0) / list.length).toFixed(2),
    });
  }

  console.log('--- By market (higher avg_ev_pct = more “value” vs API prob under naive staking) ---');
  console.table(
    [...summary].sort((a, b) => parseFloat(b.avg_ev_pct) - parseFloat(a.avg_ev_pct)),
  );

  const top = [...rows].sort((a, b) => b.ev - a.ev).slice(0, 15);
  console.log('--- Top 15 single lines by EV (exploratory) ---');
  console.table(
    top.map((r) => ({
      market: r.market,
      ev_pct: (r.ev * 100).toFixed(2),
      odds: r.odds.toFixed(2),
      model_pct: (r.prob * 100).toFixed(1),
      implied_pct: (r.implied * 100).toFixed(1),
      league: r.league.slice(0, 28),
      fixture: r.fixture.slice(0, 36),
    })),
  );

  console.log(
    '\nThis is not backtested ROI: it is a snapshot of API model % vs current best filtered odds.\n',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
