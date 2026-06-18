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
      ? `${detail.relatedPicks.total} expert picks available. `
      : '';
  return `${picks}Live score, league standings, and escrow-protected tipster picks for ${detail.homeTeamName} vs ${detail.awayTeamName}. Kickoff ${kickoff}.`;
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
