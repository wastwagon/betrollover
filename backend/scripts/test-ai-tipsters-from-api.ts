/**
 * Fetch directly from API-Football (no DB): fixtures + predictions + odds,
 * then simulate which AI tipsters would get coupons. Uses same filters as engine.
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

interface FixturePrediction {
  fixtureId: number;
  matchDate: Date;
  leagueName: string | null;
  selectedOutcome: string;
  odds: number;
  probability: number;
  ev: number;
  fromApi: boolean;
  homeTeam: string;
  awayTeam: string;
}

function parsePercent(val: string | number): number {
  if (typeof val === 'number') return Math.min(1, Math.max(0, val));
  const s = String(val || '').replace(/[^\d.]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.min(1, Math.max(0, n > 1 ? n / 100 : n));
}

function impliedProb(odds: number, edge = 0.02): number {
  return Math.min(0.95, 1 / odds + edge);
}

function ev(prob: number, odds: number): number {
  return prob * odds - 1;
}

const LEAGUE_ALIASES: Record<string, string[]> = {
  'premier league': ['premier league', 'english premier league', 'epl'],
  'la liga': ['la liga', 'laliga', 'spanish la liga'],
  'serie a': ['serie a', 'italian serie a'],
  bundesliga: ['bundesliga', 'german bundesliga'],
  'ligue 1': ['ligue 1', 'france ligue 1'],
  championship: ['championship', 'english championship', 'efl championship'],
};

function leagueMatchesFocus(fixtureLeague: string | null, configLeague: string): boolean {
  if (!fixtureLeague) return false;
  const f = fixtureLeague.toLowerCase().trim();
  const c = configLeague.toLowerCase().trim();
  if (f.includes(c)) return true;
  const fNorm = f.replace(/\s+/g, '');
  const cNorm = c.replace(/\s+/g, '');
  if (fNorm.includes(cNorm) || cNorm.includes(fNorm)) return true;
  const aliases = LEAGUE_ALIASES[cNorm] ?? [cNorm];
  return aliases.some((a) => f.includes(a) || fNorm.includes(a.replace(/\s+/g, '')));
}

function filterByPersonality(
  list: FixturePrediction[],
  personality: AiTipsterPersonality,
  excludeFixtureIds: Set<number>,
): FixturePrediction[] {
  const leagues = personality.leagues_focus || [];
  const hasAll = leagues.some((l) => l.toLowerCase() === 'all');
  const minConf = personality.min_api_confidence ?? 0.52;
  const minProb = personality.min_win_probability;
  const evMin = Math.max(0, (personality.min_expected_value ?? 0.04) - 0.08);

  return list.filter((fp) => {
    if (excludeFixtureIds.has(fp.fixtureId)) return false;
    if (!hasAll && leagues.length > 0) {
      if (!fp.leagueName) return false;
      if (!leagues.some((l) => leagueMatchesFocus(fp.leagueName, l))) return false;
    }
    if (fp.odds < personality.target_odds_min || fp.odds > personality.target_odds_max) return false;
    if (fp.fromApi) {
      if (fp.probability < minConf) return false;
    } else {
      if (fp.probability < minProb) return false;
    }
    if (fp.ev < evMin) return false;
    if (personality.selection_filter === 'home_only' && fp.selectedOutcome !== 'home') return false;
    if (personality.preference === 'underdogs') {
      if (fp.selectedOutcome !== 'away' || fp.odds < 2.5) return false;
    }

    const outcomeNorm = fp.selectedOutcome.toLowerCase();
    const betTypes = personality.bet_types || [];
    const allows1x2 = betTypes.some((b) => b.toLowerCase().includes('1x2'));
    const allowsBtts = betTypes.some((b) => b.toLowerCase().includes('btts'));
    const allowsOver25 = betTypes.some((b) => b.toLowerCase().includes('over'));
    const allowsUnder25 = betTypes.some((b) => b.toLowerCase().includes('under'));
    const allowsDoubleChance = betTypes.some((b) => b.toLowerCase().includes('double'));

    if (['home', 'away'].includes(outcomeNorm) && !allows1x2) return false;
    if (outcomeNorm === 'draw') return false;
    if (outcomeNorm === 'btts' && !allowsBtts) return false;
    if (outcomeNorm === 'over25' && !allowsOver25) return false;
    if (outcomeNorm === 'under25' && !allowsUnder25) return false;
    if (outcomeNorm === 'home_away' && !allowsDoubleChance) return false;
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

  // 1. Fixtures next 3 days
  const allFixtures: { apiId: number; date: string; home: string; away: string; league: string }[] = [];
  for (let i = 0; i < 3; i++) {
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
        date: dateStr,
        home: f.teams?.home?.name || 'Home',
        away: f.teams?.away?.name || 'Away',
        league: f.league?.name || '',
      });
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  const toFetch = allFixtures.slice(0, FIXTURES_LIMIT);
  console.log(`Fixtures (next 3 days): ${allFixtures.length}, fetching predictions+odds for first ${toFetch.length}\n`);

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
    const winner = predictions.winner || {};
    const percent = predictions.percent || {};
    const goals = predictions.goals || {};
    const btts = predictions.btts || {};

    const outcomes: { outcome: string; prob: number; fromApi: boolean }[] = [];
    const homePct = winner.home ?? percent.home;
    const awayPct = winner.away ?? percent.away;
    const drawPct = winner.draw ?? percent.draw;
    if (homePct) outcomes.push({ outcome: 'home', prob: parsePercent(homePct), fromApi: true });
    if (awayPct) outcomes.push({ outcome: 'away', prob: parsePercent(awayPct), fromApi: true });
    if (drawPct) outcomes.push({ outcome: 'draw', prob: parsePercent(drawPct), fromApi: true });
    const over25 = goals.over ?? goals['over 2.5'];
    const under25 = goals.under ?? goals['under 2.5'];
    if (over25) outcomes.push({ outcome: 'over25', prob: parsePercent(over25), fromApi: true });
    if (under25) outcomes.push({ outcome: 'under25', prob: parsePercent(under25), fromApi: true });
    if (btts.yes) outcomes.push({ outcome: 'btts', prob: parsePercent(btts.yes), fromApi: true });

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
    for (const out of ['home', 'away', 'over25', 'under25', 'btts']) {
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

    const noDraw = candidates.filter((c) => c.outcome !== 'draw');
    const sorted = (noDraw.length ? noDraw : candidates).sort((a, b) => b.ev - a.ev);
    const best = sorted[0];
    if (best && best.odds >= 1.2 && best.odds <= 3.5) {
      fixturePredictions.push({
        fixtureId: f.apiId,
        matchDate: new Date(f.date + 'T12:00:00Z'),
        leagueName: f.league || null,
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

  console.log(`Fixture predictions (best outcome per fixture): ${fixturePredictions.length}`);

  const inRange = fixturePredictions.filter((fp) => fp.odds >= 1.41 && fp.odds <= 2.0);
  console.log(`  In odds range 1.41–2.0 (engine band): ${inRange.length}`);
  if (fixturePredictions.length > 0) {
    console.log('  Sample (real API data):');
    fixturePredictions.slice(0, 8).forEach((fp) => {
      console.log(`    ${fp.homeTeam} vs ${fp.awayTeam} | ${fp.selectedOutcome} @ ${fp.odds.toFixed(2)} | prob=${fp.probability.toFixed(2)} ev=${fp.ev.toFixed(3)}`);
    });
  }
  console.log('');

  // 3. Simulate per-tipster: global usedFixtureIds, each tipster picks best EV until max_daily
  const usedFixtureIds = new Set<number>();
  const picksByTipster = new Map<string, number>();

  for (const cfg of AI_TIPSTERS) {
    picksByTipster.set(cfg.username, 0);
  }

  for (const tipsterConfig of AI_TIPSTERS) {
    const maxForTipster = tipsterConfig.personality.max_daily_predictions ?? 999;
    let count = 0;
    while (count < maxForTipster) {
      const available = filterByPersonality(
        fixturePredictions,
        tipsterConfig.personality,
        usedFixtureIds,
      );
      if (available.length === 0) break;
      const best = [...available].sort((a, b) => b.ev - a.ev)[0];
      if (!best) break;
      usedFixtureIds.add(best.fixtureId);
      picksByTipster.set(tipsterConfig.username, (picksByTipster.get(tipsterConfig.username) ?? 0) + 1);
      count++;
    }
  }

  // 4. Report
  const withPicks = [...picksByTipster.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const withZero = [...picksByTipster.entries()].filter(([, n]) => n === 0);

  console.log('--- Tipsters WITH coupons (from API simulation) ---');
  for (const [username, n] of withPicks) {
    const cfg = AI_TIPSTERS.find((t) => t.username === username);
    console.log(`  ${cfg?.display_name ?? username} (${username}): ${n} coupon(s)`);
  }

  console.log('\n--- Tipsters with 0 coupons ---');
  for (const [username] of withZero) {
    const cfg = AI_TIPSTERS.find((t) => t.username === username);
    console.log(`  ${cfg?.display_name ?? username} (${username})`);
  }

  const totalPicks = withPicks.reduce((s, [, n]) => s + n, 0);
  console.log('\n--- Summary ---');
  console.log(`  Tipsters with ≥1 coupon: ${withPicks.length}/${AI_TIPSTERS.length}`);
  console.log(`  Tipsters with 0 coupons: ${withZero.length}`);
  console.log(`  Total picks (simulated): ${totalPicks}`);
  console.log('  (No DB – fetched directly from API-Football)\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
