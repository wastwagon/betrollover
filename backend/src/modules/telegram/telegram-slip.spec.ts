import {
  formatTelegramLegLine,
  isMatchListPickTitle,
  telegramHeadlineWhenLegsListed,
  telegramLegsHaveCopy,
} from './telegram-slip';

describe('telegram-slip clarity helpers', () => {
  it('detects SEO match-list titles', () => {
    expect(
      isMatchListPickTitle('2-match pick: Van vs Ararat-Armenia + El Bayadh vs Taghit, 20 Nov 2026'),
    ).toBe(true);
    expect(isMatchListPickTitle('Arsenal vs Chelsea, 10 Nov 2026')).toBe(true);
    expect(isMatchListPickTitle('AccaSure1X2 · Home or Draw')).toBe(false);
    expect(isMatchListPickTitle('Sure Mix')).toBe(false);
  });

  it('falls back when legs already name the fixtures', () => {
    expect(
      telegramHeadlineWhenLegsListed(
        '2-match pick: A vs B + C vs D, 20 Nov 2026',
        'Free pick',
      ),
    ).toBe('Free pick');
    expect(telegramHeadlineWhenLegsListed('Sure Mix', 'Free pick')).toBe('Sure Mix');
  });

  it('formats open and settled legs once', () => {
    expect(
      formatTelegramLegLine(
        { matchDescription: 'A vs B', prediction: 'Home Win', odds: 1.4, matchDate: '2026-11-20T11:00:00.000Z' },
        'open',
      ),
    ).toMatch(/^• A vs B — Home Win @ 1\.40 · /);
    expect(
      formatTelegramLegLine(
        {
          matchDescription: 'A vs B',
          prediction: 'Home Win',
          result: 'won',
          homeScore: 2,
          awayScore: 0,
        },
        'settled',
      ),
    ).toBe('• A vs B — Home Win · WON FT 2-0');
  });

  it('detects whether legs have copy', () => {
    expect(telegramLegsHaveCopy([{ matchDescription: 'A vs B' }])).toBe(true);
    expect(telegramLegsHaveCopy([{ prediction: 'Home' }])).toBe(true);
    expect(telegramLegsHaveCopy([{ odds: 1.2 }])).toBe(false);
    expect(telegramLegsHaveCopy([])).toBe(false);
  });
});
