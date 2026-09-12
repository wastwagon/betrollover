import {
  TIPSTER_ACTIVE_WITHIN_DAYS,
  TIPSTER_FORM_POST_CAP,
  compareLeaderboardLead,
  computeTipsterFormPoints,
  isTipsterActivePoster,
} from '@betrollover/shared-types';

describe('tipster form points', () => {
  it('returns 0 when the tipster has not posted in the activity window', () => {
    expect(
      computeTipsterFormPoints({
        winRate: 90,
        roi: 300,
        postsInWindow: 20,
        daysSinceLastPost: TIPSTER_ACTIVE_WITHIN_DAYS + 1,
      }),
    ).toBe(0);
    expect(isTipsterActivePoster(null)).toBe(false);
    expect(isTipsterActivePoster(TIPSTER_ACTIVE_WITHIN_DAYS)).toBe(true);
    expect(isTipsterActivePoster(TIPSTER_ACTIVE_WITHIN_DAYS + 1)).toBe(false);
  });

    it('caps extra points from extra posting days so daily desks cannot stack forever', () => {
    const active = {
      winRate: 50,
      roi: 20,
      daysSinceLastPost: 1,
    };
    const atCap = computeTipsterFormPoints({ ...active, postsInWindow: TIPSTER_FORM_POST_CAP });
    const overCap = computeTipsterFormPoints({ ...active, postsInWindow: TIPSTER_FORM_POST_CAP * 4 });
    expect(overCap).toBe(atCap);
  });

  it('ranks a strong recent human above a weaker high-volume desk', () => {
    const human = computeTipsterFormPoints({
      winRate: 80,
      roi: 100,
      postsInWindow: 3,
      daysSinceLastPost: 2,
    });
    const desk = computeTipsterFormPoints({
      winRate: 40,
      roi: 10,
      postsInWindow: 1,
      daysSinceLastPost: 0,
    });
    expect(human).toBeGreaterThan(desk);
  });
});

describe('leaderboard lead sort', () => {
  it('keeps every negative-ROI desk below every non-negative desk, then ranks by form+ROI', () => {
    const rows = [
      { name: 'Sure1X2', form_points: 55, roi: 14.6 },
      { name: 'SureDC', form_points: 51, roi: -2.4 },
      { name: 'SureMix', form_points: 48, roi: -12.6 },
      { name: 'SafeDC', form_points: 46, roi: 9.4 },
      { name: 'SureO15', form_points: 46, roi: -20.8 },
      { name: 'MedMix', form_points: 45, roi: 39.1 },
      { name: 'MedBTTS', form_points: 45, roi: 37.3 },
      { name: 'SafeO15', form_points: 45, roi: 4.1 },
      { name: 'Safe1X2', form_points: 44, roi: 4.2 },
    ];
    const order = [...rows].sort(compareLeaderboardLead).map((r) => r.name);
    expect(order).toEqual([
      'MedMix',
      'MedBTTS',
      'Sure1X2',
      'SafeDC',
      'SafeO15',
      'Safe1X2',
      'SureDC',
      'SureMix',
      'SureO15',
    ]);
    expect(order.indexOf('SureDC')).toBeGreaterThan(order.indexOf('Safe1X2'));
  });
});
