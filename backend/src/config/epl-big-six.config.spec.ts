import { fixtureInvolvesBigSix, isLikelyEplBigSixTeam } from './epl-big-six.config';

describe('epl-big-six', () => {
  it('recognises Big 6 names', () => {
    expect(isLikelyEplBigSixTeam('Arsenal')).toBe(true);
    expect(isLikelyEplBigSixTeam('Manchester City')).toBe(true);
    expect(isLikelyEplBigSixTeam('Man United')).toBe(true);
    expect(isLikelyEplBigSixTeam('Tottenham Hotspur')).toBe(true);
    expect(isLikelyEplBigSixTeam('Chelsea')).toBe(true);
    expect(isLikelyEplBigSixTeam('Liverpool')).toBe(true);
  });

  it('rejects non–Big 6', () => {
    expect(isLikelyEplBigSixTeam('Sheffield United')).toBe(false);
    expect(isLikelyEplBigSixTeam('West Ham United')).toBe(false);
    expect(isLikelyEplBigSixTeam('Brighton')).toBe(false);
  });

  it('fixtureInvolvesBigSix', () => {
    expect(fixtureInvolvesBigSix('Luton', 'Arsenal')).toBe(true);
    expect(fixtureInvolvesBigSix('Burnley', 'Everton')).toBe(false);
  });
});
