import {
  TIPSTER_ACTIVE_WITHIN_DAYS,
  TIPSTER_FORM_POST_CAP,
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
