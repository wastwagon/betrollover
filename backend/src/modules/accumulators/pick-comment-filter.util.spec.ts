import { filterPickCommentContent } from './pick-comment-filter.util';

describe('filterPickCommentContent', () => {
  it('allows normal discussion', () => {
    expect(filterPickCommentContent('Great pick, good luck everyone!')).toEqual({ blocked: false });
  });

  it('blocks booking code mentions', () => {
    const result = filterPickCommentContent('Use booking code ABC123XYZ');
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/booking code/i);
  });

  it('blocks explicit odds tip patterns', () => {
    const result = filterPickCommentContent('Take BTTS @ 2.5');
    expect(result.blocked).toBe(true);
  });
});
