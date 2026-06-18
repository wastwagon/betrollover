import type { TopScorerRow } from './league-insights.service';

export interface MatchSpotlightPlayer {
  playerName: string;
  playerPhoto: string | null;
  teamName: string;
  goals: number | null;
}

function normalizeTeam(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function teamsMatch(scorerTeam: string, fixtureTeam: string): boolean {
  const a = normalizeTeam(scorerTeam);
  const b = normalizeTeam(fixtureTeam);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const words = (name: string) =>
    name
      .toLowerCase()
      .split(/[\s.-]+/)
      .map((w) => normalizeTeam(w))
      .filter((w) => w.length >= 3);
  const short = words(scorerTeam);
  const long = words(fixtureTeam);
  if (short.length && long.length) {
    const [needle, haystack] = short.length <= long.length ? [short, long] : [long, short];
    if (needle.every((part) => haystack.some((h) => h.includes(part) || part.includes(h)))) {
      return true;
    }
  }
  return false;
}

/** Top league scorer playing in this fixture (cache-only data). */
export function pickSpotlightPlayer(
  homeTeamName: string,
  awayTeamName: string,
  scorers: TopScorerRow[],
): MatchSpotlightPlayer | null {
  const candidates = scorers.filter(
    (s) => teamsMatch(s.teamName, homeTeamName) || teamsMatch(s.teamName, awayTeamName),
  );
  if (!candidates.length) return null;

  const best = [...candidates].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
  return {
    playerName: best.playerName,
    playerPhoto: best.playerPhoto,
    teamName: best.teamName,
    goals: best.goals,
  };
}
