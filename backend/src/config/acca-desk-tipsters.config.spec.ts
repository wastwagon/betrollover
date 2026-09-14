import {
  ACCA_DESK_PAUSED_USERNAMES,
  ACCA_DESK_TIPSTERS,
  accaDeskPausedPublicExcludeRawSql,
  isAccaDeskPublishingPaused,
} from './acca-desk-tipsters.config';

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
