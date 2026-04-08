import { normalizeApiMarketName } from './api-market-aliases';

describe('normalizeApiMarketName', () => {
  it('maps common API spellings to config keys', () => {
    expect(normalizeApiMarketName('DNB')).toBe('Draw No Bet');
    expect(normalizeApiMarketName('1X2')).toBe('Match Winner');
    expect(normalizeApiMarketName('Goals Over/Under - First Half')).toBe('Goals Over/Under First Half');
    expect(normalizeApiMarketName('Handicap Result')).toBe('European Handicap');
  });

  it('passes through unknown names', () => {
    expect(normalizeApiMarketName('Corners Over/Under')).toBe('Corners Over/Under');
  });
});
