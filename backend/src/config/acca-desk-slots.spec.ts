import {
  pickTimeClusteredPair,
  slotForKickoff,
} from './acca-desk-slots';

const TZ = 'Africa/Accra';

describe('slotForKickoff', () => {
  it('maps early / afternoon / evening Accra times', () => {
    expect(slotForKickoff('2026-08-14T13:00:00.000Z', TZ)?.key).toBe('early');
    expect(slotForKickoff('2026-08-14T15:00:00.000Z', TZ)?.key).toBe('afternoon');
    expect(slotForKickoff('2026-08-14T19:00:00.000Z', TZ)?.key).toBe('evening');
    expect(slotForKickoff('2026-08-14T22:00:00.000Z', TZ)?.key).toBe('evening');
  });
});

describe('pickTimeClusteredPair', () => {
  const family = (k: string) => k.split('_')[0];
  const maxGap = 3 * 60 * 60 * 1000;

  it('pairs close kick-offs and skips a far isolated favourite', () => {
    const pair = pickTimeClusteredPair(
      [
        { fixtureId: 1, matchDate: '2026-08-14T10:00:00.000Z', score: 0.99, outcomeKey: 'home' },
        { fixtureId: 2, matchDate: '2026-08-14T15:00:00.000Z', score: 0.8, outcomeKey: 'home' },
        { fixtureId: 3, matchDate: '2026-08-14T16:00:00.000Z', score: 0.79, outcomeKey: 'btts_yes' },
      ],
      maxGap,
      family,
    );
    expect(pair.map((p) => p.fixtureId).sort((a, b) => a - b)).toEqual([2, 3]);
  });

  it('allows a 3-hour evening pair', () => {
    const pair = pickTimeClusteredPair(
      [
        { fixtureId: 7, matchDate: '2026-08-14T19:00:00.000Z', score: 0.7, outcomeKey: 'home' },
        { fixtureId: 10, matchDate: '2026-08-14T22:00:00.000Z', score: 0.69, outcomeKey: 'over25' },
      ],
      maxGap,
      family,
    );
    expect(pair.map((p) => p.fixtureId).sort((a, b) => a - b)).toEqual([7, 10]);
  });
});
