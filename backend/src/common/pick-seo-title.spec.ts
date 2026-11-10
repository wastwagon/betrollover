import {
  buildPickSeoTitle,
  displayPickTitle,
  isLegacyGenericPickTitle,
  stripPickTitleMachineStamp,
} from '@betrollover/shared-types';

describe('buildPickSeoTitle', () => {
  it('builds a single-match title with date', () => {
    expect(
      buildPickSeoTitle([
        {
          homeTeam: 'Arsenal',
          awayTeam: 'Chelsea',
          matchDate: '2026-11-10T15:00:00.000Z',
          prediction: 'Home',
        },
      ]),
    ).toBe('Arsenal vs Chelsea, 10 Nov 2026');
  });

  it('builds a 2-match pick title', () => {
    expect(
      buildPickSeoTitle([
        {
          homeTeam: 'Arsenal',
          awayTeam: 'Chelsea',
          matchDate: '2026-11-10T15:00:00.000Z',
        },
        {
          homeTeam: 'Liverpool',
          awayTeam: 'Everton',
          matchDate: '2026-11-10T17:30:00.000Z',
        },
      ]),
    ).toBe('2-match pick: Arsenal vs Chelsea + Liverpool vs Everton, 10 Nov 2026');
  });
});

describe('isLegacyGenericPickTitle', () => {
  it('flags Single / desk / 2-fold titles', () => {
    expect(isLegacyGenericPickTitle('Single (2026-11-10) #4094')).toBe(true);
    expect(
      isLegacyGenericPickTitle('Safe · Mixed Markets · Early · 2-fold @ 2.372 · 2026-11-10'),
    ).toBe(true);
    expect(isLegacyGenericPickTitle('Low Odds · Match result · Evening · 2-fold @ 1.96 · 2026-11-10')).toBe(
      true,
    );
  });

  it('keeps plain SEO titles', () => {
    expect(isLegacyGenericPickTitle('Arsenal vs Chelsea, 10 Nov 2026')).toBe(false);
    expect(
      isLegacyGenericPickTitle('2-match pick: Arsenal vs Chelsea + Liverpool vs Everton, 10 Nov 2026'),
    ).toBe(false);
  });
});

describe('stripPickTitleMachineStamp / displayPickTitle', () => {
  it('strips desk day and id stamps', () => {
    expect(stripPickTitleMachineStamp('Arsenal vs Chelsea, 10 Nov 2026 · 2026-11-10 · #4094')).toBe(
      'Arsenal vs Chelsea, 10 Nov 2026',
    );
  });

  it('replaces desk title with SEO title from legs', () => {
    expect(
      displayPickTitle('Safe · Mixed Markets · Early · 2-fold @ 2.372 · 2026-11-10', [
        { homeTeam: 'A', awayTeam: 'B', matchDate: '2026-11-10T12:00:00.000Z' },
        { homeTeam: 'C', awayTeam: 'D', matchDate: '2026-11-10T15:00:00.000Z' },
      ]),
    ).toBe('2-match pick: A vs B + C vs D, 10 Nov 2026');
  });
});
