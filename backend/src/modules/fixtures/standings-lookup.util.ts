import type { StandingsTableRow } from './league-insights.service';
import { teamsMatch } from './match-spotlight.util';

export function findStandingRowForTeam(
  rows: StandingsTableRow[],
  teamName: string,
): StandingsTableRow | null {
  return rows.find((r) => teamsMatch(r.teamName, teamName)) ?? null;
}
