import {
  pickTimeClusteredPair,
  slotForKickoff,
  deskDayFixtureWindow,
  addDateStrDays,
  accraDateStr,
  deskDayFromTitle,
  resolveDeskDayArg,
  looksLikeAccaDeskTitle,
} from './acca-desk-slots';

const TZ = 'Africa/Accra';

describe('slotForKickoff', () => {
  it('maps early / afternoon / evening / midnight Accra times', () => {
    expect(slotForKickoff('2026-08-14T06:00:00.000Z', TZ)?.key).toBe('early');
    expect(slotForKickoff('2026-08-14T13:00:00.000Z', TZ)?.key).toBe('early');
    expect(slotForKickoff('2026-08-14T15:00:00.000Z', TZ)?.key).toBe('afternoon');
    expect(slotForKickoff('2026-08-14T19:00:00.000Z', TZ)?.key).toBe('evening');
    expect(slotForKickoff('2026-08-14T22:00:00.000Z', TZ)?.key).toBe('evening');
    expect(slotForKickoff('2026-08-14T23:00:00.000Z', TZ)?.key).toBe('midnight');
    expect(slotForKickoff('2026-08-15T02:00:00.000Z', TZ)?.key).toBe('midnight');
    expect(slotForKickoff('2026-08-15T05:59:00.000Z', TZ)?.key).toBe('midnight');
  });

  it('starts early at 06:00 (not 00:00)', () => {
    expect(slotForKickoff('2026-08-14T05:59:00.000Z', TZ)?.key).toBe('midnight');
    expect(slotForKickoff('2026-08-14T00:30:00.000Z', TZ)?.key).toBe('midnight');
  });
});

describe('deskDayFixtureWindow', () => {
  it('runs from 06:00 desk day to 06:00 next day', () => {
    const { start, end } = deskDayFixtureWindow('2026-08-29', TZ);
    expect(start.toISOString()).toBe('2026-08-29T06:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-30T06:00:00.000Z');
  });
});

describe('addDateStrDays / accraDateStr / deskDayFromTitle', () => {
  it('adds calendar days', () => {
    expect(addDateStrDays('2026-08-29', 1)).toBe('2026-08-30');
  });

  it('formats Accra date', () => {
    expect(accraDateStr(new Date('2026-08-29T21:00:00.000Z'), TZ)).toBe('2026-08-29');
  });

  it('parses desk day from title stamp', () => {
    expect(deskDayFromTitle('Safe · BTTS · Evening · 2-fold @ 2.403 · 2026-08-29')).toBe('2026-08-29');
    expect(deskDayFromTitle('no date here')).toBeNull();
  });

  it('resolves deskDay admin args', () => {
    const now = new Date('2026-08-28T21:00:00.000Z');
    expect(resolveDeskDayArg('today', TZ, now)).toEqual({ deskDayStr: '2026-08-28', today: '2026-08-28' });
    expect(resolveDeskDayArg('tomorrow', TZ, now)).toEqual({ deskDayStr: '2026-08-29', today: '2026-08-28' });
    expect(resolveDeskDayArg('2026-08-31', TZ, now)).toEqual({ deskDayStr: '2026-08-31', today: '2026-08-28' });
    expect(() => resolveDeskDayArg('nope', TZ, now)).toThrow(/deskDay must be/);
  });

  it('detects Acca Desk title shape', () => {
    expect(looksLikeAccaDeskTitle('Safe · BTTS · Midnight · 2-fold @ 2.1 · 2026-08-29')).toBe(true);
    expect(looksLikeAccaDeskTitle('Human tipster special')).toBe(false);
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

  it('allows cross-midnight pair within 3h', () => {
    const pair = pickTimeClusteredPair(
      [
        { fixtureId: 1, matchDate: '2026-08-14T23:30:00.000Z', score: 0.8, outcomeKey: 'home' },
        { fixtureId: 2, matchDate: '2026-08-15T01:30:00.000Z', score: 0.79, outcomeKey: 'away' },
      ],
      maxGap,
      family,
    );
    expect(pair.map((p) => p.fixtureId).sort((a, b) => a - b)).toEqual([1, 2]);
  });
});
