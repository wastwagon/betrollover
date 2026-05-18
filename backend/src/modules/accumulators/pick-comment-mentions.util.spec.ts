import { extractMentionUsernames } from './pick-comment-mentions.util';

describe('extractMentionUsernames', () => {
  it('extracts unique usernames', () => {
    expect(extractMentionUsernames('Hey @alice and @bob — @alice again')).toEqual(['alice', 'bob']);
  });

  it('caps at max mentions', () => {
    const body = '@ab @bc @cd @de @ef @fg';
    expect(extractMentionUsernames(body, 3)).toHaveLength(3);
  });

  it('returns empty when no mentions', () => {
    expect(extractMentionUsernames('no tags here')).toEqual([]);
  });
});
