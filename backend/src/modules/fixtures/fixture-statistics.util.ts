/**
 * Parse API-Football /fixtures/statistics into home/away corners and cards.
 * response[] is one entry per team with statistics[{ type, value }].
 */

export type FixtureTeamMatchStats = {
  homeCorners: number | null;
  awayCorners: number | null;
  homeYellowCards: number | null;
  awayYellowCards: number | null;
  homeRedCards: number | null;
  awayRedCards: number | null;
};

function toInt(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const n = parseInt(String(value).replace('%', ''), 10);
  return Number.isFinite(n) ? n : null;
}

function statValue(
  stats: Array<{ type?: string; value?: unknown }> | undefined,
  ...types: string[]
): number | null {
  if (!stats?.length) return null;
  const want = new Set(types.map((t) => t.toLowerCase()));
  for (const row of stats) {
    const t = (row.type || '').toLowerCase();
    if (want.has(t)) return toInt(row.value);
  }
  return null;
}

/**
 * @param apiResponse - full JSON body or `response` array from /fixtures/statistics
 * @param homeTeamName - optional; used to map team rows when order is away-first
 * @param awayTeamName
 */
export function parseFixtureStatisticsResponse(
  apiResponse: any,
  homeTeamName?: string,
  awayTeamName?: string,
): FixtureTeamMatchStats {
  const empty: FixtureTeamMatchStats = {
    homeCorners: null,
    awayCorners: null,
    homeYellowCards: null,
    awayYellowCards: null,
    homeRedCards: null,
    awayRedCards: null,
  };

  const rows: any[] = Array.isArray(apiResponse)
    ? apiResponse
    : apiResponse?.response || [];
  if (rows.length < 1) return empty;

  const homeL = (homeTeamName || '').toLowerCase();
  const awayL = (awayTeamName || '').toLowerCase();

  let homeRow = rows[0];
  let awayRow = rows[1] ?? null;

  if (homeL || awayL) {
    for (const row of rows) {
      const name = String(row?.team?.name || '').toLowerCase();
      if (homeL && (name === homeL || name.includes(homeL) || homeL.includes(name))) homeRow = row;
      if (awayL && (name === awayL || name.includes(awayL) || awayL.includes(name))) awayRow = row;
    }
  }

  const homeStats = homeRow?.statistics as Array<{ type?: string; value?: unknown }> | undefined;
  const awayStats = awayRow?.statistics as Array<{ type?: string; value?: unknown }> | undefined;

  return {
    homeCorners: statValue(homeStats, 'Corner Kicks', 'Corners'),
    awayCorners: awayRow ? statValue(awayStats, 'Corner Kicks', 'Corners') : null,
    homeYellowCards: statValue(homeStats, 'Yellow Cards'),
    awayYellowCards: awayRow ? statValue(awayStats, 'Yellow Cards') : null,
    homeRedCards: statValue(homeStats, 'Red Cards'),
    awayRedCards: awayRow ? statValue(awayStats, 'Red Cards') : null,
  };
}

export function fixtureStatsComplete(s: FixtureTeamMatchStats): boolean {
  return s.homeCorners != null && s.awayCorners != null;
}
