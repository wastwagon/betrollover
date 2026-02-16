#!/usr/bin/env npx ts-node
/**
 * Sync API-Football transfers into news_articles as confirmed_transfer.
 * Fetches recent transfers for major clubs and creates/updates news articles.
 *
 * Usage:
 *   API_SPORTS_KEY=your_key npx ts-node scripts/sync-transfers-to-news.ts
 *   Or ensure API_SPORTS_KEY is in .env at project root
 *
 * Requires: migration 036 (news_articles), PostgreSQL connection
 */

const API_BASE = 'https://v3.football.api-sports.io';

// Major club team IDs from API-Football (Premier League, La Liga, Serie A, Bundesliga, etc.)
const MAJOR_TEAM_IDS = [
  33, 40, 42, 47, 49, 50, 529, 541, 157, 489, 505, 492, 165, 116, 113, 81, 82,
]; // Man Utd, Liverpool, Arsenal, Spurs, Chelsea, Man City, Barcelona, Real Madrid, Bayern, etc.

function loadEnv(): void {
  const path = require('path');
  const fs = require('fs');
  const envPaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../backend/.env'),
    process.cwd() + '/.env',
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

interface TransferPlayer {
  id: number;
  name: string;
}

interface TransferTeam {
  id: number;
  name: string;
}

interface Transfer {
  player: TransferPlayer;
  update: string;
  date: string;
  type: string;
  teams: {
    in: TransferTeam;
    out: TransferTeam;
  };
}

interface TransfersResponse {
  response?: { player: TransferPlayer; update: string; transfers: Transfer[] }[];
  errors?: Record<string, string>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchTransfersForTeam(teamId: number, season: number): Promise<Transfer[]> {
  const url = `${API_BASE}/transfers?team=${teamId}&season=${season}`;
  const res = await fetch(url, { headers });
  const data = (await res.json()) as TransfersResponse;
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API error: ${JSON.stringify(data.errors)}`);
  }
  const list = data.response || [];
  const all: Transfer[] = [];
  for (const item of list) {
    for (const t of item.transfers || []) {
      if (t?.teams?.in && t?.teams?.out && t?.player?.name) {
        all.push(t);
      }
    }
  }
  return all;
}

async function main(): Promise<void> {
  const season = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  process.stderr.write(`Fetching transfers for season ${season}...\n`);

  const seen = new Set<string>();
  const articles: Array<{
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    date: string;
  }> = [];

  for (const teamId of MAJOR_TEAM_IDS) {
    try {
      const transfers = await fetchTransfersForTeam(teamId, season);
      for (const t of transfers) {
        const key = `${t.player.id}-${t.teams.out.id}-${t.teams.in.id}-${t.date}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const player = t.player.name;
        const fromTeam = t.teams.out.name;
        const toTeam = t.teams.in.name;
        const fee = t.type || 'Undisclosed';
        const date = t.date;

        const slug = slugify(`${player}-${toTeam}-${date}`).slice(0, 90);
        const title = `${player} completes move from ${fromTeam} to ${toTeam}`;
        const excerpt = `The transfer has been confirmed. ${fee !== 'N/A' && fee !== 'Free' ? `Reported fee: ${fee}.` : ''}`;
        const content = `${player} has completed a move from ${fromTeam} to ${toTeam}. The transfer was confirmed on ${date}. ${fee !== 'N/A' && fee !== 'Free' ? `The transfer fee is reported as ${fee}.` : 'The transfer details are undisclosed.'}`;

        articles.push({ slug, title, excerpt, content, date });
      }
      process.stderr.write(`  Team ${teamId}: ${transfers.length} transfers\n`);
    } catch (err) {
      process.stderr.write(`  Team ${teamId} error: ${err}\n`);
    }
    await new Promise((r) => setTimeout(r, 300)); // rate limit
  }

  if (articles.length === 0) {
    process.stderr.write('No transfers found. Run the seed script for sample content.\n');
    process.exit(0);
  }

  // Output SQL for manual insertion or pipe to psql
  const sql = `-- API-Football transfers → news_articles (${articles.length} articles)
INSERT INTO news_articles (slug, title, excerpt, content, category, featured, meta_description, published_at) VALUES
${articles
  .map(
    (a) =>
      `  ('${a.slug.replace(/'/g, "''")}', '${a.title.replace(/'/g, "''")}', '${a.excerpt.replace(/'/g, "''")}', '${a.content.replace(/'/g, "''")}', 'confirmed_transfer', false, '${a.title.replace(/'/g, "''")}', '${a.date}')`
  )
  .join(',\n')}
ON CONFLICT (slug) DO NOTHING;
`;

  const outPath = require('path').join(__dirname, '../database/seeds/transfers-from-api.sql');
  require('fs').writeFileSync(outPath, sql, 'utf8');
  process.stderr.write(`Wrote ${articles.length} transfer articles to ${outPath}\n`);
  process.stderr.write(`Run: docker compose exec -T postgres psql -U betrollover -d betrollover < database/seeds/transfers-from-api.sql\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
