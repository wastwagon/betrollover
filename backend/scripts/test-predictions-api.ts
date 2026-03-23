/**
 * Standalone test: use API key to fetch fixtures, predictions, and odds from API-Football.
 * Verifies we can get under-2.5 data suitable for coupons (no DB required).
 * Usage: API_SPORTS_KEY=yourkey npx ts-node -r tsconfig-paths/register scripts/test-predictions-api.ts
 *    Or: npx ts-node -r tsconfig-paths/register scripts/test-predictions-api.ts <your-api-football-key>
 */

const BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_SPORTS_KEY || process.argv[2] || '';

function parsePercent(val: string | number): number {
  if (typeof val === 'number') return Math.min(1, Math.max(0, val));
  const s = String(val || '').replace(/[^\d.]/g, '');
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n > 1 ? n / 100 : n));
}

async function main() {
  if (!API_KEY) {
    console.error('Set API_SPORTS_KEY or pass key as first arg.');
    process.exit(1);
  }

  const headers = { 'x-apisports-key': API_KEY };

  // 1. Fixtures for today and tomorrow
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const allFixtures: { apiId: number; date: string; home: string; away: string; league: string }[] = [];
  for (const date of dates) {
    const res = await fetch(`${BASE}/fixtures?date=${date}`, { headers });
    const data = await res.json();
    const list = data?.response || [];
    for (const f of list.slice(0, 25)) {
      const fix = f.fixture || {};
      const league = f.league?.name || '';
      allFixtures.push({
        apiId: fix.id,
        date,
        home: f.teams?.home?.name || 'Home',
        away: f.teams?.away?.name || 'Away',
        league,
      });
    }
  }

  console.log(`\nFixtures (next 3 days): ${allFixtures.length}`);
  if (allFixtures.length === 0) {
    console.log('No fixtures. Check API key and date.');
    process.exit(0);
  }

  // 2. Predictions + odds for first 20 fixtures (rate limit friendly)
  const under25Legs: { home: string; away: string; league: string; prob: number; odds: number; ev: number }[] = [];
  const toFetch = allFixtures.slice(0, 20);

  let withPredictions = 0;
  let withUnder25Pred = 0;
  let withUnder25Odds = 0;

  for (let i = 0; i < toFetch.length; i++) {
    const f = toFetch[i];
    const [predRes, oddsRes] = await Promise.all([
      fetch(`${BASE}/predictions?fixture=${f.apiId}`, { headers }),
      fetch(`${BASE}/odds?fixture=${f.apiId}`, { headers }),
    ]);
    const predData = await predRes.json();
    const oddsData = await oddsRes.json();

    let under25Prob = 0;
    const resp = predData?.response?.[0];
    if (resp?.predictions) {
      withPredictions++;
      const g = resp.predictions.goals as Record<string, unknown> | undefined;
      if (g) {
        const under = (g.under as string) || (g['under 2.5'] as string) || (g['Under 2.5'] as string);
        if (under) {
          under25Prob = parsePercent(under);
          if (under25Prob > 0) withUnder25Pred++;
        }
      }
    }

    let under25Odds = 0;
    const oddsList = oddsData?.response?.[0]?.bookmakers || [];
    for (const b of oddsList) {
      const bet = (b.bets || []).find((x: any) => (x.name || '').toLowerCase().includes('goals') && (x.name || '').toLowerCase().includes('over'));
      if (!bet) continue;
      const underVal = (bet.values || []).find((v: any) => (String(v.value || '').toLowerCase().includes('under')));
      if (underVal && underVal.odd) {
        under25Odds = parseFloat(String(underVal.odd));
        if (under25Odds > 0) withUnder25Odds++;
        break;
      }
    }

    if (under25Odds >= 1.2 && under25Odds <= 3.5) {
      const prob = under25Prob > 0 ? under25Prob : 1 / under25Odds;
      if (under25Legs.length < 15) {
        under25Legs.push({
          home: f.home,
          away: f.away,
          league: f.league,
          prob,
          odds: under25Odds,
          ev: prob * under25Odds - 1,
        });
      }
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  const inEngineBand = under25Legs.filter((l) => l.odds >= 1.41 && l.odds <= 2.0).length;
  console.log(`Fixtures with predictions: ${withPredictions}/${toFetch.length}, with under 2.5 in predictions: ${withUnder25Pred}, with under 2.5 odds: ${withUnder25Odds}`);
  console.log(`Under 2.5 legs in engine band (1.41-2.0): ${inEngineBand}, in wider band (1.2-3.5): ${under25Legs.length}`);

  if (under25Legs.length >= 2) {
    const inBand = under25Legs.filter((l) => l.odds >= 1.41 && l.odds <= 2.0);
    const leg1 = under25Legs[0];
    const leg2 = under25Legs[1];
    const combined = leg1.odds * leg2.odds;
    const inRange = combined >= 2 && combined <= 4;
    console.log('\n*** Can form a 2-pick Under 2.5 coupon ***');
    console.log(`  Leg 1: ${leg1.home} vs ${leg1.away} – Under 2.5 @ ${leg1.odds.toFixed(2)}`);
    console.log(`  Leg 2: ${leg2.home} vs ${leg2.away} – Under 2.5 @ ${leg2.odds.toFixed(2)}`);
    console.log(`  Combined odds: ${combined.toFixed(2)} (engine 2.0–4.0: ${inRange ? 'yes' : 'no'})`);
    if (inBand.length >= 2) {
      const c = inBand[0].odds * inBand[1].odds;
      console.log(`  With legs in 1.41–2.0 only: ${inBand.length} legs, example combined ${c.toFixed(2)}`);
    } else {
      console.log('  Note: this sample used wider odds (1.2–3.5). For engine band 1.41–2.0, need more fixtures or a day with lower under 2.5 odds.');
    }
  } else {
    console.log('\nNeed at least 2 Under 2.5 legs (odds 1.2–2.5) to form a coupon. API key works; try a day with more low-odds under 2.5 games.');
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
