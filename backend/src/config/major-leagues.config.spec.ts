import {
  isAmateurLeagueName,
  isMajorLeagueForSafeAcca,
  isYouthOrReserveMatch,
} from './major-leagues.config';

describe('major-leagues.config', () => {
  it('accepts Premier League by api id and name', () => {
    expect(isMajorLeagueForSafeAcca('Premier League', 39)).toBe(true);
    expect(isMajorLeagueForSafeAcca('English Premier League', null)).toBe(true);
  });

  it('rejects obscure NPL leagues', () => {
    expect(isAmateurLeagueName('New South Wales NPL')).toBe(true);
    expect(isAmateurLeagueName(null)).toBe(true);
    expect(isAmateurLeagueName('')).toBe(true);
    expect(isMajorLeagueForSafeAcca('New South Wales NPL', null)).toBe(false);
    expect(isMajorLeagueForSafeAcca('Queensland NPL', null)).toBe(false);
  });

  it('rejects friendlies and accepts Champions League', () => {
    expect(isMajorLeagueForSafeAcca('Friendlies Clubs', null)).toBe(false);
    expect(isMajorLeagueForSafeAcca('UEFA Champions League', 2)).toBe(true);
  });

  it('treats MLS Next Pro and Liga Revelação as amateur pools', () => {
    expect(isAmateurLeagueName('MLS Next Pro')).toBe(true);
    expect(isAmateurLeagueName('Liga Revelação U23')).toBe(true);
    expect(isAmateurLeagueName('Premier League')).toBe(false);
  });

  it('flags U23 / II reserve sides without catching Juan Pablo II College', () => {
    expect(isYouthOrReserveMatch('Moreirense U23 vs Sporting Braga U23')).toBe(true);
    expect(isYouthOrReserveMatch('Argentinos Juniors Res. vs River Plate Res.')).toBe(true);
    expect(isYouthOrReserveMatch('Portland Timbers II vs St. Louis City II')).toBe(true);
    expect(isYouthOrReserveMatch('PAOK II vs Olympiakos Piraeus II')).toBe(true);
    expect(isYouthOrReserveMatch('Juan Pablo II College vs Alianza Lima')).toBe(false);
    expect(isYouthOrReserveMatch('FC Porto vs Manchester City')).toBe(false);
  });
});
