import {
  isDemotedHeadlineLeague,
  isFixtureLive,
  leagueBoost,
  matchScore,
  pickHeadlineMatches,
  type HeadlineMatchRow,
} from './headline-matches.util';

function row(
  partial: Partial<HeadlineMatchRow> & Pick<HeadlineMatchRow, 'id' | 'leagueName' | 'status' | 'matchDate'>,
): HeadlineMatchRow {
  return {
    apiId: partial.id,
    homeTeamName: 'Home',
    awayTeamName: 'Away',
    homeTeamLogo: null,
    awayTeamLogo: null,
    leagueApiId: null,
    statusElapsed: null,
    homeScore: null,
    awayScore: null,
    ...partial,
  };
}

describe('headline-matches.util', () => {
  const now = Date.parse('2026-09-12T12:00:00.000Z');

  it('does not boost Kazakhstan / Russia Premier League by bare name', () => {
    expect(leagueBoost('Premier League', 389)).toBe(0);
    expect(leagueBoost('Premier League', 235)).toBe(0);
    expect(leagueBoost('Premier League', null)).toBe(0);
  });

  it('demotes youth and NWSL', () => {
    expect(isDemotedHeadlineLeague('Liga MX U21')).toBe(true);
    expect(isDemotedHeadlineLeague('NWSL')).toBe(true);
    expect(isDemotedHeadlineLeague('Primera B')).toBe(true);
    expect(leagueBoost('Liga MX U21', 262)).toBe(0);
  });

  it('scores upcoming Ghana / EPL above obscure live football', () => {
    const ghanaSoon = row({
      id: 1,
      leagueName: 'Premier League',
      leagueApiId: 570,
      status: 'NS',
      matchDate: '2026-09-12T18:00:00.000Z',
    });
    const eplSoon = row({
      id: 2,
      leagueName: 'Premier League',
      leagueApiId: 39,
      status: 'NS',
      matchDate: '2026-09-12T15:00:00.000Z',
    });
    const ligaLive = row({
      id: 3,
      leagueName: 'Liga Profesional',
      leagueApiId: 128,
      status: '2H',
      matchDate: '2026-09-12T10:00:00.000Z',
    });
    const nwslLive = row({
      id: 4,
      leagueName: 'NWSL',
      leagueApiId: 254,
      status: '1H',
      matchDate: '2026-09-12T11:00:00.000Z',
    });
    const u21Live = row({
      id: 5,
      leagueName: 'Liga MX U21',
      leagueApiId: 9999,
      status: '2H',
      matchDate: '2026-09-12T11:30:00.000Z',
    });

    expect(matchScore(ghanaSoon, now)).toBeGreaterThan(matchScore(ligaLive, now));
    expect(matchScore(eplSoon, now)).toBeGreaterThan(matchScore(ligaLive, now));
    expect(matchScore(eplSoon, now)).toBeGreaterThan(matchScore(nwslLive, now));
    expect(matchScore(ligaLive, now)).toBeGreaterThan(matchScore(u21Live, now));
  });

  it('picks Ghana and big leagues over live secondary / youth rails', () => {
    const live = [
      row({
        id: 10,
        leagueName: 'Liga Profesional',
        leagueApiId: 128,
        status: '2H',
        matchDate: '2026-09-12T10:00:00.000Z',
      }),
      row({
        id: 11,
        leagueName: 'NWSL',
        leagueApiId: 254,
        status: '1H',
        matchDate: '2026-09-12T11:00:00.000Z',
      }),
      row({
        id: 12,
        leagueName: 'Liga MX U21',
        status: '2H',
        matchDate: '2026-09-12T11:30:00.000Z',
      }),
      row({
        id: 13,
        leagueName: 'Primera B',
        status: '1H',
        matchDate: '2026-09-12T11:45:00.000Z',
      }),
    ];
    const upcoming = [
      row({
        id: 20,
        leagueName: 'Premier League',
        leagueApiId: 570,
        status: 'NS',
        matchDate: '2026-09-12T19:00:00.000Z',
      }),
      row({
        id: 21,
        leagueName: 'Premier League',
        leagueApiId: 39,
        status: 'NS',
        matchDate: '2026-09-12T14:30:00.000Z',
      }),
      row({
        id: 22,
        leagueName: 'UEFA Champions League',
        leagueApiId: 2,
        status: 'NS',
        matchDate: '2026-09-12T19:00:00.000Z',
      }),
    ];

    const picked = pickHeadlineMatches(live, upcoming, 4, now);
    expect(picked.map((m) => m.id)).toEqual([22, 21, 20, 10]);
    expect(picked.every((m) => !isDemotedHeadlineLeague(m.leagueName))).toBe(true);
  });

  it('still prefers live Ghana when it is in play', () => {
    const live = [
      row({
        id: 30,
        leagueName: 'Premier League',
        leagueApiId: 570,
        status: '2H',
        matchDate: '2026-09-12T10:00:00.000Z',
        statusElapsed: 70,
      }),
      row({
        id: 31,
        leagueName: 'Liga Profesional',
        leagueApiId: 128,
        status: '2H',
        matchDate: '2026-09-12T10:00:00.000Z',
      }),
    ];
    const picked = pickHeadlineMatches(live, [], 2, now);
    expect(picked[0].id).toBe(30);
    expect(isFixtureLive(picked[0].status)).toBe(true);
  });
});
