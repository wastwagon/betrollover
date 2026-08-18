import { accraMinutesSinceMidnight, isSchedulingEnabled } from './scheduling-enabled';

describe('scheduling helpers', () => {
  const tz = 'Africa/Accra';

  it('treats unset ENABLE_SCHEDULING as on', () => {
    const prev = process.env.ENABLE_SCHEDULING;
    delete process.env.ENABLE_SCHEDULING;
    expect(isSchedulingEnabled()).toBe(true);
    process.env.ENABLE_SCHEDULING = 'false';
    expect(isSchedulingEnabled()).toBe(false);
    if (prev === undefined) delete process.env.ENABLE_SCHEDULING;
    else process.env.ENABLE_SCHEDULING = prev;
  });

  it('reads Accra clock for catch-up windows', () => {
    expect(accraMinutesSinceMidnight(new Date('2026-08-18T00:30:00Z'), tz)).toBe(30);
    expect(accraMinutesSinceMidnight(new Date('2026-08-18T09:00:00Z'), tz)).toBe(9 * 60);
  });
});
