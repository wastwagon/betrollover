import { WELCOME_STEPS } from './welcome-campaigns.config';

describe('WELCOME_STEPS', () => {
  it('runs day 0 then 1 then 3 with increasing delays', () => {
    expect(WELCOME_STEPS.map((s) => s.key)).toEqual(['welcome_d0', 'welcome_d1', 'welcome_d3']);
    expect(WELCOME_STEPS[0].requiresPrior).toBeNull();
    expect(WELCOME_STEPS[1].requiresPrior).toBe('welcome_d0');
    expect(WELCOME_STEPS[2].requiresPrior).toBe('welcome_d1');
    expect(WELCOME_STEPS[0].minHoursAfterConsent).toBe(0);
    expect(WELCOME_STEPS[1].minHoursAfterConsent).toBe(24);
    expect(WELCOME_STEPS[2].minHoursAfterConsent).toBe(72);
  });
});
