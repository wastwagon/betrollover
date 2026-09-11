import { parseFixtureStatisticsResponse } from './fixture-statistics.util';

describe('parseFixtureStatisticsResponse', () => {
  it('maps corner and card stats by team name', () => {
    const payload = {
      response: [
        {
          team: { name: 'Home FC' },
          statistics: [
            { type: 'Corner Kicks', value: 7 },
            { type: 'Yellow Cards', value: 2 },
            { type: 'Red Cards', value: 0 },
          ],
        },
        {
          team: { name: 'Away United' },
          statistics: [
            { type: 'Corner Kicks', value: 4 },
            { type: 'Yellow Cards', value: 1 },
            { type: 'Red Cards', value: 1 },
          ],
        },
      ],
    };
    expect(parseFixtureStatisticsResponse(payload, 'Home FC', 'Away United')).toEqual({
      homeCorners: 7,
      awayCorners: 4,
      homeYellowCards: 2,
      awayYellowCards: 1,
      homeRedCards: 0,
      awayRedCards: 1,
    });
  });
});
