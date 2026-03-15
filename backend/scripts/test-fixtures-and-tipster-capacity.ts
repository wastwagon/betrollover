/**
 * Standalone (no DB): fetch fixtures for next 7 days from API-Sports, then estimate
 * how many fixtures are available for AI tipsters. Each tipster can get up to 5 single picks.
 *
 * Usage:
 *   API_SPORTS_KEY=your_key npx ts-node -r tsconfig-paths/register scripts/test-fixtures-and-tipster-capacity.ts
 */

const BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_SPORTS_KEY || '';

async function main() {
  console.log('\n=== Fixtures next 7 days + tipster capacity (API only, no DB) ===\n');
  console.log('API_SPORTS_KEY:', API_KEY ? `***${API_KEY.slice(-4)}` : 'NOT SET');
  if (!API_KEY) {
    console.log('Set API_SPORTS_KEY to run.');
    process.exit(1);
  }

  const headers = { 'x-apisports-key': API_KEY };
  const totalTipsters = 25;
  const maxPicksPerTipster = 5;
  const fixturesByDay: { date: string; count: number; leagues: Set<string> }[] = [];

  let totalFixtures = 0;
  const allLeagues = new Set<string>();

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const res = await fetch(`${BASE}/fixtures?date=${dateStr}`, { headers });
    const data = await res.json();
    const list = data?.response || [];
    const leagues = new Set<string>();
    for (const f of list) {
      const name = f.league?.name || '';
      if (name) {
        leagues.add(name);
        allLeagues.add(name);
      }
    }
    fixturesByDay.push({ date: dateStr, count: list.length, leagues });
    totalFixtures += list.length;
    if (i < 3) await new Promise((r) => setTimeout(r, 350));
  }

  console.log('\n--- Fixtures per day (next 7 days) ---');
  for (const { date, count, leagues } of fixturesByDay) {
    console.log(`  ${date}: ${count} fixtures (${leagues.size} leagues)`);
  }
  console.log(`  TOTAL: ${totalFixtures} fixtures, ${allLeagues.size} unique leagues`);

  console.log('\n--- Tipster capacity ---');
  console.log(`  AI tipsters: ${totalTipsters}`);
  console.log(`  Max picks per tipster: ${maxPicksPerTipster}`);
  console.log(`  Theoretically need at least ${totalTipsters} fixtures (1 per tipster) for all to get 1 coupon.`);
  console.log(`  For each to get 5: up to ${totalTipsters * maxPicksPerTipster} fixtures (no overlap).`);
  console.log(`  With ${totalFixtures} fixtures in 7 days, there is enough pool if fixtures have odds + predictions.`);

  console.log('\n--- Next step ---');
  console.log('  Run the full test (with DB) to see per-tipster coupon counts:');
  console.log('  In backend dir: API_SPORTS_KEY=your_key npx ts-node -r tsconfig-paths/register scripts/test-prediction-generation.ts');
  console.log('  (Requires DB connection and fixtures synced via Admin → Sync or scheduler.)\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
