import { isOver15OnlyMarkets, marketsIncludeOver15 } from './acca-generator.markets';

describe('Acca Generator Over 1.5 market helpers', () => {
  it('detects Over 1.5-only selections', () => {
    expect(isOver15OnlyMarkets(['over15'])).toBe(true);
    expect(isOver15OnlyMarkets(['over15', 'over15'])).toBe(true);
    expect(isOver15OnlyMarkets(['over15', 'match_winner'])).toBe(false);
    expect(isOver15OnlyMarkets(['match_winner'])).toBe(false);
    expect(isOver15OnlyMarkets([])).toBe(false);
  });

  it('detects Over 1.5 in a mixed slip', () => {
    expect(marketsIncludeOver15(['over15', 'btts'])).toBe(true);
    expect(marketsIncludeOver15(['over25', 'btts'])).toBe(false);
  });
});
