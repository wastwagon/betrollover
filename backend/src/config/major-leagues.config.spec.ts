import {
  isAmateurLeagueName,
  isMajorLeagueForSafeAcca,
} from './major-leagues.config';

describe('major-leagues.config', () => {
  it('accepts Premier League by api id and name', () => {
    expect(isMajorLeagueForSafeAcca('Premier League', 39)).toBe(true);
    expect(isMajorLeagueForSafeAcca('English Premier League', null)).toBe(true);
  });

  it('rejects obscure NPL leagues', () => {
    expect(isAmateurLeagueName('New South Wales NPL')).toBe(true);
    expect(isMajorLeagueForSafeAcca('New South Wales NPL', null)).toBe(false);
    expect(isMajorLeagueForSafeAcca('Queensland NPL', null)).toBe(false);
  });

  it('rejects friendlies and accepts Champions League', () => {
    expect(isMajorLeagueForSafeAcca('Friendlies Clubs', null)).toBe(false);
    expect(isMajorLeagueForSafeAcca('UEFA Champions League', 2)).toBe(true);
  });
});
