import {
  DIGEST_ACTIVE_WITHIN_HOURS,
  QUIET_14_HOURS,
  QUIET_7_HOURS,
  QUIET_STEPS,
  lastActivityMs,
  pickQuietStep,
} from './quiet-campaigns.config';

describe('QUIET_STEPS', () => {
  it('runs 7d then 14d', () => {
    expect(QUIET_STEPS.map((s) => s.key)).toEqual(['quiet_7d', 'quiet_14d']);
    expect(QUIET_STEPS[0].requiresPrior).toBeNull();
    expect(QUIET_STEPS[1].requiresPrior).toBe('quiet_7d');
    expect(QUIET_STEPS[0].minHoursQuiet).toBe(QUIET_7_HOURS);
    expect(QUIET_STEPS[1].minHoursQuiet).toBe(QUIET_14_HOURS);
    expect(DIGEST_ACTIVE_WITHIN_HOURS).toBe(QUIET_7_HOURS);
  });

  it('picks 7d then 14d and never both at once', () => {
    expect(pickQuietStep(QUIET_7_HOURS - 1, new Set())).toBeNull();
    expect(pickQuietStep(QUIET_7_HOURS, new Set())?.key).toBe('quiet_7d');
    expect(pickQuietStep(QUIET_14_HOURS, new Set())?.key).toBe('quiet_7d');
    expect(pickQuietStep(QUIET_14_HOURS, new Set(['quiet_7d']))?.key).toBe('quiet_14d');
    expect(pickQuietStep(QUIET_14_HOURS, new Set(['quiet_7d', 'quiet_14d']))).toBeNull();
  });

  it('uses the latest of login, purchase, and created', () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const login = new Date('2026-08-01T00:00:00Z');
    const purchase = new Date('2026-08-10T00:00:00Z').getTime();
    expect(lastActivityMs({ lastLogin: login, createdAt: created }, purchase)).toBe(purchase);
    expect(lastActivityMs({ lastLogin: login, createdAt: created }, 0)).toBe(login.getTime());
    expect(lastActivityMs({ lastLogin: null, createdAt: created }, 0)).toBe(created.getTime());
  });
});
