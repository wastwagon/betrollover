/**
 * Backtest API-Football /predictions against full-time results (last N days).
 * Fetches finished fixtures from /fixtures, then /predictions per fixture, and
 * scores 1X2 (argmax of home/draw/away %), Over/Under 2.5, and BTTS when data exists.
 *
 * Usage (from backend/):
 *   npx ts-node -r tsconfig-paths/register scripts/analyze-ft-predictions-backtest.ts
 *
 * Env (repo root .env):
 *   API_SPORTS_KEY     — required
 *   LAST_DAYS=7        — calendar days to scan (default 7), ending at END_DATE or today
 *   END_DATE=2025-05-01 — optional YYYY-MM-MM anchor (last day in the window)
 *   MAX_FIXTURES=400   — stop after this many prediction calls (default 400)
 *   DELAY_MS=150       — delay between /predictions calls
 *
 * API usage: ~1 request per calendar day (fixtures, with paging) + 1 per finished fixture (predictions).
 */

import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../.env') });

import { getSportApiBaseUrl } from '../src/config/sports.config';
import { determinePickResult } from '../src/modules/accumulators/settlement-logic';

const BASE = getSportApiBaseUrl('football');
const API_KEY = process.env.API_SPORTS_KEY || '';

const LAST_DAYS = Math.min(14, Math.max(1, parseInt(process.env.LAST_DAYS || '7', 10) || 7));
const MAX_FIXTURES = Math.min(2000, Math.max(10, parseInt(process.env.MAX_FIXTURES || '400', 10) || 400));
const DELAY_MS = Math.max(0, parseInt(process.env.DELAY_MS || '150', 10) || 150);
const END_DATE_STR = (process.env.END_DATE || '').trim();

const FINISHED = new Set(['FT', 'AET', 'PEN']);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parsePercent(val: string | number): number {
  if (typeof val === 'number') return Math.min(1, Math.max(0, val));
  const s = String(val || '').replace(/[^\d.]/g, '');
  const n = parseFloat(s);
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n > 1 ? n / 100 : n));
}

interface ParsedPred {
  home: number | null;
  draw: number | null;
  away: number | null;
  over25: number | null;
  under25: number | null;
  bttsYes: number | null;
  bttsNo: number | null;
}

function parsePredictionsBlock(predictions: Record<string, unknown>): ParsedPred {
  const winner = predictions?.winner as Record<string, string> | undefined;
  const percent = predictions?.percent as Record<string, string> | undefined;
  const homePct = winner?.home ?? percent?.home;
  const drawPct = winner?.draw ?? percent?.draw;
  const awayPct = winner?.away ?? percent?.away;

  const goals = predictions?.goals as Record<string, unknown> | undefined;
  let over25: string | undefined;
  let under25: string | undefined;
  if (goals) {
    over25 = (goals.over as string) || (goals['over 2.5'] as string);
    under25 = (goals.under as string) || (goals['under 2.5'] as string);
  }

  const btts = predictions?.btts as Record<string, string> | undefined;

  return {
    home: homePct != null ? parsePercent(homePct) : null,
    draw: drawPct != null ? parsePercent(drawPct) : null,
    away: awayPct != null ? parsePercent(awayPct) : null,
    over25: over25 ? parsePercent(over25) : null,
    under25: under25 ? parsePercent(under25) : null,
    bttsYes: btts?.yes != null ? parsePercent(btts.yes) : null,
    bttsNo: btts?.no != null ? parsePercent(btts.no) : null,
  };
}

function actual1x2(h: number, a: number): 'home' | 'draw' | 'away' {
  if (h > a) return 'home';
  if (h < a) return 'away';
  return 'draw';
}

/** Pick 1X2 by highest API probability (requires all three). */
function predicted1x2(p: ParsedPred): 'home' | 'draw' | 'away' | null {
  if (p.home == null || p.draw == null || p.away == null) return null;
  const m = Math.max(p.home, p.draw, p.away);
  if (p.home === m) return 'home';
  if (p.draw === m) return 'draw';
  return 'away';
}

function checkOutcome(
  selectedOutcome: string,
  homeScore: number,
  awayScore: number,
  homeTeam?: string,
  awayTeam?: string,
  htHome?: number | null,
  htAway?: number | null,
): boolean {
  const outcome = (selectedOutcome || '').trim().toLowerCase();
  return (
    determinePickResult(
      outcome,
      homeScore,
      awayScore,
      homeTeam,
      awayTeam,
      htHome ?? null,
      htAway ?? null,
    ) === 'won'
  );
}

interface FinishedFx {
  apiId: number;
  date: string;
  league: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  htHome: number | null;
  htAway: number | null;
  status: string;
}

function rowToFinished(row: any, dateStr: string): FinishedFx | null {
  const fix = row.fixture || {};
  const status = fix.status?.short || '';
  const goals = row.goals;
  if (!FINISHED.has(status)) return null;
  if (goals?.home == null || goals?.away == null) return null;
  const h = Number(goals.home);
  const a = Number(goals.away);
  if (Number.isNaN(h) || Number.isNaN(a)) return null;
  const ht = row.score?.halftime;
  const hasHt = ht && typeof ht.home === 'number' && typeof ht.away === 'number';
  const htHome = hasHt ? Number(ht.home) : null;
  const htAway = hasHt ? Number(ht.away) : null;
  return {
    apiId: fix.id,
    date: dateStr,
    league: row.league?.name || '',
    home: row.teams?.home?.name || 'Home',
    away: row.teams?.away?.name || 'Away',
    homeScore: h,
    awayScore: a,
    htHome,
    htAway,
    status,
  };
}

/** Paginate fixtures for a date; optionally filter to FT/AET/PEN only. */
async function fetchFixturesDatePage(
  dateStr: string,
  headers: Record<string, string>,
  queryExtra: string,
): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${BASE}/fixtures?date=${dateStr}${queryExtra}&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`fixtures ${dateStr} page ${page}: HTTP ${res.status}`);
      break;
    }
    const data = await res.json();
    if (data?.errors && Object.keys(data.errors).length > 0) {
      console.warn(`fixtures ${dateStr}:`, JSON.stringify(data.errors));
      break;
    }
    const paging = data?.paging;
    if (paging?.total) totalPages = paging.total;
    else totalPages = 1;

    const list = data?.response || [];
    all.push(...list);
    if (!list.length) break;
    page++;
    if (page > 50) break;
  }

  return all;
}

async function fetchFinishedFixturesForDate(
  dateStr: string,
  headers: Record<string, string>,
): Promise<FinishedFx[]> {
  let rows = await fetchFixturesDatePage(dateStr, headers, '&status=FT-AET-PEN');
  if (rows.length === 0) {
    rows = await fetchFixturesDatePage(dateStr, headers, '');
  }

  const out: FinishedFx[] = [];
  for (const row of rows) {
    const f = rowToFinished(row, dateStr);
    if (f) out.push(f);
  }
  return out;
}

async function main() {
  if (!API_KEY) {
    console.error('Missing API_SPORTS_KEY in .env');
    process.exit(1);
  }

  const headers = { 'x-apisports-key': API_KEY };
  const dates: string[] = [];
  const anchor = END_DATE_STR
    ? new Date(`${END_DATE_STR}T12:00:00`)
    : new Date();
  if (END_DATE_STR && Number.isNaN(anchor.getTime())) {
    console.error(`Invalid END_DATE=${END_DATE_STR} (use YYYY-MM-DD)`);
    process.exit(1);
  }
  for (let d = 0; d < LAST_DAYS; d++) {
    const x = new Date(anchor);
    x.setDate(x.getDate() - d);
    dates.push(x.toISOString().slice(0, 10));
  }

  console.log(`\n=== FT backtest: API predictions vs results ===`);
  console.log(
    `Dates (${LAST_DAYS}): ${dates[dates.length - 1]} … ${dates[0]}${END_DATE_STR ? ` (END_DATE=${END_DATE_STR})` : ''}`,
  );
  console.log(`Max prediction fetches: ${MAX_FIXTURES}, delay ${DELAY_MS}ms\n`);

  const all: FinishedFx[] = [];
  for (const dateStr of dates) {
    const batch = await fetchFinishedFixturesForDate(dateStr, headers);
    all.push(...batch);
    await sleep(DELAY_MS);
  }

  // De-dupe by apiId (fixture can appear if overlapping queries — shouldn't for distinct dates)
  const byId = new Map<number, FinishedFx>();
  for (const f of all) {
    if (!byId.has(f.apiId)) byId.set(f.apiId, f);
  }
  let fixtures = [...byId.values()];
  fixtures.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.apiId - b.apiId));
  if (fixtures.length > MAX_FIXTURES) {
    fixtures = fixtures.slice(0, MAX_FIXTURES);
  }

  console.log(`Finished fixtures collected: ${fixtures.length} (unique api ids)\n`);

  let predCalls = 0;
  let noPred = 0;
  let predHttpErr = 0;

  const x2: { correct: number; total: number } = { correct: 0, total: 0 };
  const ou: { correct: number; total: number } = { correct: 0, total: 0 };
  const btts: { correct: number; total: number } = { correct: 0, total: 0 };

  const byLeagueX2 = new Map<string, { correct: number; total: number }>();

  for (let i = 0; i < fixtures.length; i++) {
    const fx = fixtures[i];
    const res = await fetch(`${BASE}/predictions?fixture=${fx.apiId}`, { headers });
    predCalls++;
    if (!res.ok) {
      predHttpErr++;
      if (DELAY_MS) await sleep(DELAY_MS);
      continue;
    }
    const data = await res.json();
    const resp = data?.response?.[0];
    const predictions = resp?.predictions as Record<string, unknown> | undefined;
    if (!predictions) {
      noPred++;
      if (DELAY_MS) await sleep(DELAY_MS);
      continue;
    }

    const p = parsePredictionsBlock(predictions);

    const pick = predicted1x2(p);
    if (pick) {
      const actual = actual1x2(fx.homeScore, fx.awayScore);
      const ok = pick === actual;
      x2.total++;
      if (ok) x2.correct++;
      const key = fx.league || '(unknown)';
      const agg = byLeagueX2.get(key) || { correct: 0, total: 0 };
      agg.total++;
      if (ok) agg.correct++;
      byLeagueX2.set(key, agg);
    }

    if (p.over25 != null && p.under25 != null) {
      const predSide = p.over25 >= p.under25 ? 'over25' : 'under25';
      ou.total++;
      if (checkOutcome(predSide, fx.homeScore, fx.awayScore, fx.home, fx.away, fx.htHome, fx.htAway)) {
        ou.correct++;
      }
    }

    if (p.bttsYes != null) {
      let predBtts: boolean;
      if (p.bttsNo != null) {
        predBtts = p.bttsYes >= p.bttsNo;
      } else {
        predBtts = p.bttsYes > 0.5;
      }
      btts.total++;
      const actualBtts = fx.homeScore > 0 && fx.awayScore > 0;
      const ok = predBtts === actualBtts;
      if (ok) btts.correct++;
    }

    if (DELAY_MS) await sleep(DELAY_MS);
    if ((i + 1) % 25 === 0) process.stdout.write(`  … ${i + 1}/${fixtures.length} predictions\r`);
  }

  console.log(`\nPrediction calls: ${predCalls}, no payload: ${noPred}, HTTP errors: ${predHttpErr}\n`);

  const pct = (c: number, t: number) => (t === 0 ? '—' : `${((100 * c) / t).toFixed(1)}%`);

  console.log('--- Headline (API-Football pre-match-style probabilities vs FT score) ---');
  console.table([
    {
      market: '1X2 (pick max home/draw/away %)',
      correct: x2.correct,
      total: x2.total,
      accuracy: pct(x2.correct, x2.total),
    },
    {
      market: 'Over/Under 2.5 (pick higher of over% vs under%)',
      correct: ou.correct,
      total: ou.total,
      accuracy: pct(ou.correct, ou.total),
    },
    {
      market: 'BTTS (yes if yes%>no% or yes%>50%)',
      correct: btts.correct,
      total: btts.total,
      accuracy: pct(btts.correct, btts.total),
    },
  ]);

  const leagueRows = [...byLeagueX2.entries()]
    .filter(([, v]) => v.total >= 5)
    .map(([league, v]) => ({
      league: league.slice(0, 40),
      n: v.total,
      accuracy: pct(v.correct, v.total),
    }))
    .sort((a, b) => {
      const pa = a.accuracy === '—' ? -1 : parseFloat(a.accuracy);
      const pb = b.accuracy === '—' ? -1 : parseFloat(b.accuracy);
      return pb - pa;
    });

  if (leagueRows.length) {
    console.log('--- 1X2 accuracy by league (min 5 games) ---');
    console.table(leagueRows.slice(0, 25));
  }

  console.log(
    '\nNotes: Predictions are whatever the API returns for that fixture id (usually pre-match model).',
    'Random 1X2 baseline ≈ 33%. Use larger LAST_DAYS + MAX_FIXTURES for stable estimates.\n',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
