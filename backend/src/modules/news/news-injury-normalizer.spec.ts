import {
  injuryArticleSlug,
  normalizeInjuryRow,
} from './news-injury-normalizer';

describe('news-injury-normalizer', () => {
  it('normalizes football injury rows with fixture date', () => {
    const row = normalizeInjuryRow(
      {
        player: { id: 10, name: 'John Doe', type: 'Missing Fixture', reason: 'Knee Injury' },
        team: { id: 33, name: 'Manchester United' },
        fixture: { id: 1, date: '2026-03-15T15:00:00+00:00' },
      },
      'football',
    );
    expect(row).toMatchObject({
      playerId: 10,
      playerName: 'John Doe',
      teamId: 33,
      teamName: 'Manchester United',
      type: 'Missing Fixture',
      reason: 'Knee Injury',
    });
    expect(row?.publishedAt.toISOString()).toContain('2026-03-15');
  });

  it('normalizes american football injury rows with game date', () => {
    const row = normalizeInjuryRow(
      {
        player: { id: 99, name: 'Patrick Mahomes', type: 'Out', reason: 'Ankle' },
        team: { id: 7, name: 'Kansas City Chiefs' },
        game: { id: 501, date: '2026-01-12T18:00:00+00:00' },
      },
      'american_football',
    );
    expect(row?.playerName).toBe('Patrick Mahomes');
    expect(row?.teamName).toBe('Kansas City Chiefs');
  });

  it('prefixes non-football injury slugs', () => {
    expect(injuryArticleSlug('football', 1, 2, '2026-03-15')).toBe('injury-1-2-2026-03-15');
    expect(injuryArticleSlug('american_football', 1, 2, '2026-03-15')).toBe(
      'american_football-injury-1-2-2026-03-15',
    );
  });

  it('returns null when player or team is missing', () => {
    expect(normalizeInjuryRow({ team: { id: 1, name: 'Team' } }, 'football')).toBeNull();
    expect(normalizeInjuryRow({ player: { id: 1, name: 'Player' } }, 'football')).toBeNull();
  });
});
