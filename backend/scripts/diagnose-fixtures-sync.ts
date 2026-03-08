/**
 * Diagnose why some popular fixtures (e.g. Fenerbahçe, Porto) don't show in the app.
 * Run inside the API container (Coolify → BetRollover → Terminal → select api container → Connect).
 *
 * Usage (from backend directory in container):
 *   npx ts-node --transpile-only -O '{"module":"CommonJS"}' scripts/diagnose-fixtures-sync.ts
 * Or with a specific date:
 *   DATE=2025-03-15 npx ts-node --transpile-only -O '{"module":"CommonJS"}' scripts/diagnose-fixtures-sync.ts
 *
 * What it does:
 * 1. Fetches fixtures for the date from API-Sports (same as sync).
 * 2. Shows total from API and breakdown by league (id, name, fixture count).
 * 3. Lists your enabled leagues from DB.
 * 4. Shows which leagues are in the API response but NOT enabled (those fixtures are dropped in sync).
 * 5. Searches for teams like Fenerbahce, Porto and shows their league id/name so you can enable them.
 */

import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../.env') });

const BASE = 'https://v3.football.api-sports.io';
const DATE = process.env.DATE || new Date().toISOString().split('T')[0];
const API_KEY = process.env.API_SPORTS_KEY || '';

async function main() {
  console.log('=== Football fixtures sync diagnostic ===\n');
  console.log('Date:', DATE);
  console.log('API key:', API_KEY ? `***${API_KEY.slice(-4)}` : 'MISSING');
  if (!API_KEY) {
    console.log('\nSet API_SPORTS_KEY in Coolify env or Admin → Settings.');
    process.exit(1);
  }

  const headers = { 'x-apisports-key': API_KEY };

  // 1) Fetch fixtures for date (same URL as FootballSyncService)
  const url = `${BASE}/fixtures?date=${DATE}`;
  console.log('\n1) Fetching from API:', url);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.error('API request failed:', res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const raw = (data.response || []) as any[];
  console.log('   Total fixtures returned by API:', raw.length);

  if (raw.length === 0) {
    console.log('   No fixtures for this date. Try another date (e.g. DATE=2025-03-09).');
    return;
  }

  // 2) Group by league
  const byLeague = new Map<number, { name: string; country: string; fixtures: any[] }>();
  for (const f of raw) {
    const league = f.league;
    if (!league?.id) continue;
    const id = league.id;
    if (!byLeague.has(id)) {
      byLeague.set(id, { name: league.name || '?', country: league.country || '', fixtures: [] });
    }
    byLeague.get(id)!.fixtures.push(f);
  }

  console.log('\n2) Leagues in API response (' + byLeague.size + ' leagues):');
  const sorted = [...byLeague.entries()].sort((a, b) => b[1].fixtures.length - a[1].fixtures.length);
  for (const [id, info] of sorted) {
    console.log(`   League ${id}: ${info.name} (${info.country}) — ${info.fixtures.length} fixtures`);
  }

  // 3) Search for popular teams (Fenerbahce, Porto, etc.)
  const searchTerms = ['Fenerbahce', 'Fenerbahçe', 'Porto', 'Benfica', 'Galatasaray', 'Besiktas'];
  console.log('\n3) Sample teams (Fenerbahce, Porto, etc.) in API response:');
  let found = 0;
  for (const f of raw) {
    const home = (f.teams?.home?.name || '').toLowerCase();
    const away = (f.teams?.away?.name || '').toLowerCase();
    for (const term of searchTerms) {
      const t = term.toLowerCase();
      if (home.includes(t) || away.includes(t)) {
        const league = f.league;
        console.log(`   ${f.teams?.home?.name} vs ${f.teams?.away?.name} — League ID ${league?.id} (${league?.name})`);
        found++;
        break;
      }
    }
  }
  if (found === 0) {
    console.log('   None of the search terms found in fixtures for this date. Try another date or add terms in the script.');
  }

  // 4) DB: enabled leagues (optional)
  const dbUrl = process.env.DATABASE_URL;
  const pgHost = process.env.POSTGRES_HOST || process.env.PGHOST;
  if (!dbUrl && !pgHost) {
    console.log('\n4) Enabled leagues: (DB not configured in env — set DATABASE_URL or POSTGRES_* in Coolify to see this)');
    console.log('   Your sync only keeps fixtures whose league ID is in enabled_leagues (is_active = true).');
    console.log('   If Fenerbahce/Porto leagues are listed above in section 2, note their League ID and add them in Admin → Fixtures → Leagues.');
    return;
  }

  try {
    const { Client } = await import('pg');
    const client = new Client(
      dbUrl
        ? { connectionString: dbUrl, ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false } }
        : {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
            user: process.env.POSTGRES_USER || process.env.PGUSER,
            password: process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD,
            database: process.env.POSTGRES_DB || process.env.PGDATABASE || 'betrollover',
          }
    );
    await client.connect();
    const enabled = await client.query(
      'SELECT api_id, name, is_active FROM enabled_leagues WHERE is_active = true ORDER BY api_id'
    );
    await client.end();

    const enabledIds = new Set((enabled.rows as { api_id: number }[]).map((r) => r.api_id));
    console.log('\n4) Enabled leagues in DB:', enabled.rows.length);
    for (const row of enabled.rows as { api_id: number; name: string }[]) {
      console.log(`   ${row.api_id}: ${row.name}`);
    }

    const inApiNotEnabled = sorted.filter(([id]) => !enabledIds.has(id));
    if (inApiNotEnabled.length > 0) {
      console.log('\n5) Leagues IN API but NOT ENABLED (these fixtures are dropped during sync):');
      for (const [id, info] of inApiNotEnabled) {
        console.log(`   ${id}: ${info.name} (${info.country}) — ${info.fixtures.length} fixtures`);
      }
      console.log('\n   To show these fixtures (e.g. Fenerbahce, Porto), add the league IDs above in Admin → Fixtures → Leagues.');
    }
  } catch (e) {
    console.log('\n4) DB query failed:', (e as Error).message);
    console.log('   Ensure DATABASE_URL or POSTGRES_* are set in Coolify for the api service.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
