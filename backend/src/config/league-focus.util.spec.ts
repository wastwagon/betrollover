import { leagueMatchesFocus } from './league-focus.util';

describe('leagueMatchesFocus', () => {
  it('matches Premier League with normalised config key', () => {
    expect(leagueMatchesFocus('English Premier League', 'Premier League')).toBe(true);
    expect(leagueMatchesFocus('Premier League', 'Premier League')).toBe(true);
    expect(leagueMatchesFocus('England - Premier League', 'Premier League')).toBe(true);
  });

  it('rejects other competitions for Premier focus', () => {
    expect(leagueMatchesFocus('UEFA Champions League', 'Premier League')).toBe(false);
    expect(leagueMatchesFocus('La Liga', 'Premier League')).toBe(false);
  });

  it('returns false for null league name', () => {
    expect(leagueMatchesFocus(null, 'Premier League')).toBe(false);
  });
});
