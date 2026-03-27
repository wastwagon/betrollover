import {
  clampPlatformCommissionPercent,
  splitGrossForTipsterPayout,
  PLATFORM_COMMISSION_DEFAULT,
} from './platform-commission';

describe('clampPlatformCommissionPercent', () => {
  it('defaults invalid values to 30', () => {
    expect(clampPlatformCommissionPercent(undefined)).toBe(PLATFORM_COMMISSION_DEFAULT);
    expect(clampPlatformCommissionPercent(Number.NaN)).toBe(PLATFORM_COMMISSION_DEFAULT);
  });

  it('clamps to 0–50', () => {
    expect(clampPlatformCommissionPercent(-5)).toBe(0);
    expect(clampPlatformCommissionPercent(99)).toBe(50);
    expect(clampPlatformCommissionPercent(30)).toBe(30);
  });
});

describe('splitGrossForTipsterPayout', () => {
  it('matches marketplace pick rounding (30% on 102)', () => {
    const { commission, netPayout } = splitGrossForTipsterPayout(102, 30);
    expect(commission).toBe(30.6);
    expect(netPayout).toBe(71.4);
  });

  it('handles zero commission rate', () => {
    const { commission, netPayout } = splitGrossForTipsterPayout(100, 0);
    expect(commission).toBe(0);
    expect(netPayout).toBe(100);
  });
});
