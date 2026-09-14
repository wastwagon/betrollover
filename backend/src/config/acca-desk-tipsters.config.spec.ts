import {
  ACCA_DESK_MAX_PER_DAY,
  ACCA_DESK_PAUSED_USERNAMES,
  ACCA_DESK_TIPSTERS,
  accaDeskPausedPublicExcludeRawSql,
  isAccaDeskPublishingPaused,
} from './acca-desk-tipsters.config';

describe('acca desk daily cap', () => {
  it('caps every roster tipster at two coupons and states that in the bio', () => {
    expect(ACCA_DESK_MAX_PER_DAY).toBe(2);
    expect(ACCA_DESK_TIPSTERS.length).toBeGreaterThan(0);
    for (const tipster of ACCA_DESK_TIPSTERS) {
      expect(tipster.bio).toMatch(/Up to 2 free 2-fold picks a day/);
    }
  });
});

describe('acca desk pause list', () => {
  it('pauses the live losing books without dropping them from the roster', () => {
    expect(ACCA_DESK_PAUSED_USERNAMES.has('AccaSureO15')).toBe(true);
    expect(ACCA_DESK_PAUSED_USERNAMES.has('AccaMediumO25')).toBe(true);
    expect(ACCA_DESK_PAUSED_USERNAMES.has('AccaSure1X2')).toBe(false);
    expect(ACCA_DESK_PAUSED_USERNAMES.has('AccaHighO25')).toBe(false);
    for (const username of ACCA_DESK_PAUSED_USERNAMES) {
      expect(ACCA_DESK_TIPSTERS.some((c) => c.username === username)).toBe(true);
      expect(isAccaDeskPublishingPaused(username)).toBe(true);
    }
    const sql = accaDeskPausedPublicExcludeRawSql('t');
    expect(sql).toContain('AccaSureO15');
    expect(sql).not.toContain('AccaSure1X2');
  });
});
