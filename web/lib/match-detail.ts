import { getApiUrl } from '@/lib/site-config';

export interface MatchSpotlightPlayer {
  playerName: string;
  playerPhoto: string | null;
  teamName: string;
  goals: number | null;
}

export interface MatchStandingSnippet {
  rank: number;
  points: number;
  played: number;
  win: number;
  draw: number;
  loss: number;
}

export interface PublicFixtureDetail {
  id: number;
  apiId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  homeCountryCode: string | null;
  awayCountryCode: string | null;
  leagueName: string | null;
  leagueApiId: number | null;
  country: string | null;
  matchDate: string;
  status: string;
  statusElapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
  htHomeScore: number | null;
  htAwayScore: number | null;
  spotlightPlayer: MatchSpotlightPlayer | null;
  standings: {
    home: MatchStandingSnippet | null;
    away: MatchStandingSnippet | null;
  };
  relatedPicks: { items: Record<string, unknown>[]; total: number };
}

export function matchPageTitle(detail: PublicFixtureDetail): string {
  const league = detail.leagueName ? ` · ${detail.leagueName}` : '';
  return `${detail.homeTeamName} vs ${detail.awayTeamName}${league}`;
}

export function matchMetaDescription(detail: PublicFixtureDetail): string {
  const kickoff = new Date(detail.matchDate).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const picks =
    detail.relatedPicks.total > 0
      ? `${detail.relatedPicks.total} tipster predictions available. `
      : '';
  return `${picks}${detail.homeTeamName} vs ${detail.awayTeamName} prediction page — league standings, kickoff ${kickoff}, and public tipster picks on BetRollover. Not a bookmaker.`;
}

function formatStanding(label: string, row: MatchStandingSnippet | null): string | null {
  if (!row) return null;
  return `${label} sit ${row.rank}${ordinal(row.rank)} on ${row.points} points from ${row.played} matches (${row.win}W ${row.draw}D ${row.loss}L).`;
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/** Plain-text preview for SSR match pages (teams, league, kickoff, standings, related tips). */
export function matchPreviewParagraphs(detail: PublicFixtureDetail): string[] {
  const kickoff = new Date(detail.matchDate).toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const league = detail.leagueName || 'this competition';
  const country = detail.country ? ` (${detail.country})` : '';
  const paras: string[] = [
    `${detail.homeTeamName} vs ${detail.awayTeamName} is scheduled for ${kickoff} in ${league}${country}. This BetRollover match page lists kickoff time, live or final score when available, league table snippets, and public football predictions linked to the fixture. BetRollover is a tipster marketplace — we sell predictions, we do not place bets.`,
  ];

  const homeLine = formatStanding(detail.homeTeamName, detail.standings.home);
  const awayLine = formatStanding(detail.awayTeamName, detail.standings.away);
  if (homeLine || awayLine) {
    paras.push(
      [homeLine, awayLine].filter(Boolean).join(' ') +
        ' Table positions are a snapshot from our standings feed and can change after other results. They are not a full form or head-to-head model.',
    );
  } else {
    paras.push(
      'League standings for both clubs are not available on this fixture yet. Use tipster write-ups and the related predictions below together with the live score once the match starts.',
    );
  }

  if (detail.relatedPicks.total > 0) {
    paras.push(
      `${detail.relatedPicks.total} public prediction${detail.relatedPicks.total === 1 ? '' : 's'} currently link to this match. Free tips may need sign-in to reveal selections. Paid marketplace tips show price and purchase protection on the tip fee. Optional SportyBet or Bet9ja booking codes appear only after reveal when the tipster attached one.`,
    );
  } else {
    paras.push(
      'No public tipster predictions are linked to this fixture yet. Browse the football marketplace for today’s picks, or check back closer to kickoff as tipsters publish.',
    );
  }

  return paras;
}

export async function fetchPublicFixtureDetail(
  id: number,
  options?: { revalidate?: number },
): Promise<PublicFixtureDetail | null> {
  const api = getApiUrl();
  const init: RequestInit =
    options?.revalidate != null ? { next: { revalidate: options.revalidate } } : { cache: 'no-store' };

  try {
    const res = await fetch(`${api}/fixtures/platform/matches/${id}`, init);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.found) return null;
    return data as PublicFixtureDetail;
  } catch {
    return null;
  }
}
