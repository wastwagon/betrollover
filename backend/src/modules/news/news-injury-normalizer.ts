import type { SportType } from '../../config/sports.config';

export interface NormalizedInjury {
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  type: string;
  reason: string;
  publishedAt: Date;
}

function readName(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const o = value as Record<string, unknown>;
  if (typeof o.name === 'string') return o.name;
  if (typeof o.firstname === 'string' || typeof o.lastname === 'string') {
    return `${o.firstname ?? ''} ${o.lastname ?? ''}`.trim();
  }
  return '';
}

function readId(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const id = (value as Record<string, unknown>).id;
  return typeof id === 'number' ? id : Number(id) || 0;
}

function readDate(value: unknown): Date {
  if (!value || typeof value !== 'object') return new Date();
  const o = value as Record<string, unknown>;
  const raw = o.date ?? o.timestamp;
  if (typeof raw === 'string' || typeof raw === 'number') {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** Map API-Sports injury rows (football + american football) into news article fields. */
export function normalizeInjuryRow(
  row: Record<string, unknown>,
  _sport: SportType,
): NormalizedInjury | null {
  const player = row.player as Record<string, unknown> | undefined;
  const team = row.team as Record<string, unknown> | undefined;
  const fixture = (row.fixture ?? row.game) as Record<string, unknown> | undefined;

  const playerName = readName(player);
  const teamName = readName(team);
  if (!playerName || !teamName) return null;

  const playerId = readId(player);
  const teamId = readId(team);
  const type =
    (typeof player?.type === 'string' && player.type) ||
    (typeof row.type === 'string' && row.type) ||
    'Missing Fixture';
  const reason =
    (typeof player?.reason === 'string' && player.reason) ||
    (typeof row.reason === 'string' && row.reason) ||
    'an undisclosed issue';

  return {
    playerId,
    playerName,
    teamId,
    teamName,
    type,
    reason,
    publishedAt: readDate(fixture),
  };
}

export function injuryArticleSlug(
  sport: SportType,
  playerId: number,
  teamId: number,
  dateStr: string,
): string {
  const base = `injury-${playerId}-${teamId}-${dateStr}`;
  return sport === 'football' ? base : `${sport}-${base}`;
}

export function injuryArticleCopy(injury: NormalizedInjury, dateStr: string): {
  title: string;
  excerpt: string;
  content: string;
} {
  const title = `${injury.playerName} sidelined for ${injury.teamName}`;
  const excerpt = `${injury.playerName} is listed as ${injury.type.toLowerCase()} due to ${injury.reason.toLowerCase()}.`;
  const content = `Team news update: ${injury.playerName} will be unavailable for ${injury.teamName}'s upcoming game. The player is currently classified as "${injury.type}" due to ${injury.reason.toLowerCase()}. This status was confirmed ahead of the game on ${dateStr}.`;
  return { title, excerpt, content };
}
