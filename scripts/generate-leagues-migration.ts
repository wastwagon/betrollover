#!/usr/bin/env npx ts-node
/**
 * Generate comprehensive professional leagues migration from API-Football.
 *
 * Usage:
 *   API_SPORTS_KEY=your_key npx ts-node scripts/generate-leagues-migration.ts
 *   Or from backend: API_SPORTS_KEY from .env is loaded if dotenv available
 *
 * Output: database/migrations/026_comprehensive_professional_leagues.sql
 */

const API_BASE = 'https://v3.football.api-sports.io';

// Load .env from project root (works when run from repo root)
function loadEnv(): void {
  const path = require('path');
  const fs = require('fs');
  const envPaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../backend/.env'),
    path.join(process.cwd(), '.env'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      for (const line of content.split('\n')) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) {
          const key = m[1].trim();
          const val = m[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      }
      console.error(`Loaded env from ${p}`);
      break;
    }
  }
}

loadEnv();

const key = process.env.API_SPORTS_KEY || process.env.API_FOOTBALL_KEY;
if (!key) {
  console.error('ERROR: Set API_SPORTS_KEY in .env or environment');
  process.exit(1);
}

const headers = { 'x-apisports-key': key };

// Exclude patterns (case-insensitive) - leagues matching these are skipped
const EXCLUDE_PATTERNS = [
  /\b(u17|u18|u19|u20|u21|u23|u-17|u-18|u-19|u-20|u-21|u-23)\b/i,
  /\b(youth|junior|primavera|aspirantes|junioren|juniors)\b/i,
  /\b(women|feminine|damallsvenskan|wsl|nwsl|frauen|femminile|femenina)\b/i,
  /\b(reserve|reserva|2nd team|second team)\b/i,
  /\b(provincial|landesliga|regional|amateur)\b/i,
  /\b(play-off|playoff|promotion|relegation)\s*(round|group)?\b/i,
  /\b(4th|5th|6th)\s*(division|liga)\b/i,
  /\b(derde|vierde|tweede)\s*divisie\b/i,
  /\b(npl|state league|territory)\b/i,
  /\b(cup\s*-\s*women|women's cup)\b/i,
];

// Major cups to INCLUDE (by name substring match)
const MAJOR_CUP_PATTERNS = [
  /champions league/i,
  /europa league/i,
  /europa conference league/i,
  /copa libertadores/i,
  /copa sudamericana/i,
  /conmebol/i,
  /afc champions league/i,
  /caf champions league/i,
  /concacaf champions league/i,
  /world cup(?!\s*-\s*(u17|u20|women))/i,
  /euro(championship)?\s*(?!\s*-\s*(u17|u19|u21|women))/i,
  /africa cup of nations/i,
  /copa america(?!\s*femenina)/i,
  /gold cup(?!\s*-\s*women)/i,
  /asian cup(?!\s*women)/i,
  /fa cup\b/i,
  /coppa italia\b/i,
  /copa del rey\b/i,
  /dfb pokal\b/i,
  /coupe de france\b/i,
  /copa do brasil\b/i,
  /copa argentina\b/i,
  /copa colombia\b/i,
  /copa chile\b/i,
  /emperor cup\b/i,
  /knvb beker\b/i,
  /taça de portugal\b/i,
  /scottish cup\b/i,
  /league cup\b/i,
  /super cup\b/i,
  /community shield\b/i,
];

function shouldExclude(name: string, country: string): boolean {
  if (!name || typeof name !== 'string') return true;
  const n = name.toLowerCase();
  const c = (country || '').toLowerCase();

  for (const p of EXCLUDE_PATTERNS) {
    if (p.test(n) || p.test(c)) return true;
  }

  // Exclude "Cup - Women", "U20", etc. in name
  if (/\bwomen\b/i.test(n) && !/champions league/i.test(n)) return true;
  if (/\b(u17|u18|u19|u20|u21|u23)\b/i.test(n)) return true;

  return false;
}

function isMajorCup(name: string): boolean {
  return MAJOR_CUP_PATTERNS.some((p) => p.test(name));
}

function slugToCountry(slug: string): string {
  if (!slug) return 'World';
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface LeagueItem {
  id: number;
  name: string;
  country: string;
  logo?: string;
  type: 'league' | 'cup';
}

interface ApiLeagueResponse {
  league: { id: number; name: string; country?: string; logo?: string };
  country?: { name?: string; code?: string };
}
async function fetchLeagues(type: 'league' | 'cup', current = true): Promise<LeagueItem[]> {
  const url = `${API_BASE}/leagues?type=${type}${current ? '&current=true' : ''}`;
  const res = await fetch(url, { headers });
  const data = (await res.json()) as { response?: ApiLeagueResponse[]; errors?: Record<string, string> };
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API error: ${JSON.stringify(data.errors)}`);
  }
  const list = data.response || [];
  const out: LeagueItem[] = [];
  for (const item of list) {
    const l = item?.league;
    if (!l?.id || !l?.name) continue;
    const countryName = (item as ApiLeagueResponse).country?.name ?? l.country ?? 'World';
    out.push({
      id: l.id,
      name: l.name,
      country: countryName,
      logo: l.logo,
      type: type as 'league' | 'cup',
    });
  }
  return out;
}

async function main(): Promise<void> {
  process.stderr.write('Fetching leagues from API-Football...\n');
  try {
  const [leagues, cups] = await Promise.all([
    fetchLeagues('league', true),
    fetchLeagues('cup', true),
  ]);

  console.error(`Fetched ${leagues.length} leagues, ${cups.length} cups`);

  const seen = new Set<number>();
  const included: Array<{ id: number; name: string; country: string; type: string; priority: number }> = [];

  // Priority bands
  const TOP_LEAGUES = new Set([
    39, 140, 135, 78, 61, 2, 3, 848, 72, 536, 136, 79, 62, 94, 88, 203, 253, 262, 307, 71, 74, 128,
  ]);
  const TIER2 = new Set([89, 197, 207, 119, 113, 103, 106, 40, 41, 75, 130, 314]);

  let priority = 1;
  for (const l of leagues) {
    if (seen.has(l.id)) continue;
    if (shouldExclude(l.name, l.country)) continue;
    seen.add(l.id);
    const p = TOP_LEAGUES.has(l.id) ? priority++ : TIER2.has(l.id) ? 50 + (priority % 20) : 100 + (included.length % 200);
    included.push({
      id: l.id,
      name: l.name.replace(/'/g, "''"),
      country: slugToCountry(l.country).replace(/'/g, "''"),
      type: 'league',
      priority: p,
    });
  }

  for (const c of cups) {
    if (seen.has(c.id)) continue;
    if (!isMajorCup(c.name)) continue;
    if (shouldExclude(c.name, c.country)) continue;
    seen.add(c.id);
    included.push({
      id: c.id,
      name: c.name.replace(/'/g, "''"),
      country: slugToCountry(c.country).replace(/'/g, "''"),
      type: 'cup',
      priority: 250 + included.filter((x) => x.type === 'cup').length,
    });
  }

  // Sort: leagues first by priority, then cups
  included.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'league' ? -1 : 1;
    return a.priority - b.priority;
  });

  if (included.length === 0) {
    console.error('ERROR: No leagues passed filters. Check API key and API response.');
    process.exit(1);
  }

  // Reassign priorities 1..N for cleaner output
  included.forEach((x, i) => {
    x.priority = i + 1;
  });

  const outPath = require('path').join(__dirname, '../database/migrations/026_comprehensive_professional_leagues.sql');
  const lines: string[] = [
    '-- Comprehensive professional leagues (generated by scripts/generate-leagues-migration.ts)',
    '-- Run: psql -U $DB_USER -d $DB_NAME -f database/migrations/026_comprehensive_professional_leagues.sql',
    '-- Then: Admin → Fixtures → Sync Fixtures',
    '',
    `-- ${included.length} leagues/cups from API-Football (filtered to professional men\'s + major cups)`,
    '',
    'INSERT INTO enabled_leagues (api_id, name, country, priority, is_active, category, api_type) VALUES',
  ];

  const values = included.map(
    (x) =>
      `(${x.id}, '${x.name}', '${x.country}', ${x.priority}, true, '${x.type === 'cup' ? 'cup' : 'domestic'}', '${x.type}')`
  );
  lines.push(values.join(',\n'));
  lines.push('ON CONFLICT (api_id) DO UPDATE SET');
  lines.push("  name = EXCLUDED.name,");
  lines.push("  country = EXCLUDED.country,");
  lines.push("  category = EXCLUDED.category,");
  lines.push("  api_type = EXCLUDED.api_type,");
  lines.push("  updated_at = CURRENT_TIMESTAMP;");
  lines.push('-- Note: priority not updated on conflict to preserve init/migration values');

  const content = lines.join('\n');
  require('fs').writeFileSync(outPath, content, 'utf8');
  process.stderr.write(`Wrote ${included.length} leagues to ${outPath}\n`);
  } catch (err) {
    process.stderr.write('ERROR: ' + String(err) + '\n');
    throw err;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
