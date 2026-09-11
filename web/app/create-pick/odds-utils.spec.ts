import type { FixtureOdd } from './types';
import {
  orderedMarketNames,
  groupOddsByMarket,
  isPickMarketSupported,
} from './odds-utils';

function odd(marketName: string, marketValue: string, id: number): FixtureOdd {
  return { id, marketName, marketValue, odds: 1.5 };
}

describe('create-pick odds-utils', () => {
  it('orders known markets first then alphabetical extras', () => {
    const grouped = groupOddsByMarket([
      odd('Corners Over/Under', 'Over 8.5', 1),
      odd('Match Winner', 'Home', 2),
      odd('Zebra Market', 'A', 3),
      odd('Asian Handicap', 'Home -1', 4),
    ]);
    expect(orderedMarketNames(grouped)).toEqual([
      'Match Winner',
      'Asian Handicap',
      'Corners Over/Under',
      'Zebra Market',
    ]);
  });

  it('hides Race To and period corner markets from the board', () => {
    expect(isPickMarketSupported('Corners Race To')).toBe(false);
    expect(isPickMarketSupported('Total Corners (1st Half)')).toBe(false);
    expect(isPickMarketSupported('Corners Over/Under')).toBe(true);
    const grouped = groupOddsByMarket([
      odd('Match Winner', 'Home', 1),
      odd('Corners Race To', '5', 2),
      odd('Total Corners (2nd Half)', 'Over 4.5', 3),
    ]);
    expect(orderedMarketNames(grouped)).toEqual(['Match Winner']);
  });

  it('orders with a custom preferred list (non-football)', () => {
    const grouped = groupOddsByMarket([
      odd('Totals', 'Over 210.5', 1),
      odd('Moneyline', 'Home', 2),
      odd('Zebra', 'A', 3),
    ]);
    expect(
      orderedMarketNames(grouped, {
        preferredOrder: ['Moneyline', 'Totals'],
        isSupported: () => true,
      }),
    ).toEqual(['Moneyline', 'Totals', 'Zebra']);
  });
});
