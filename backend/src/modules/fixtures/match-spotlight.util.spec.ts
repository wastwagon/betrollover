import { pickSpotlightPlayer } from './match-spotlight.util';

describe('pickSpotlightPlayer', () => {
  const scorers = [
    { rank: 1, playerName: 'Haaland', playerPhoto: null, teamName: 'Manchester City', goals: 18, assists: 2 },
    { rank: 2, playerName: 'Salah', playerPhoto: null, teamName: 'Liverpool', goals: 14, assists: 5 },
    { rank: 3, playerName: 'Other', playerPhoto: null, teamName: 'Burnley', goals: 10, assists: 0 },
  ];

  it('picks highest-scoring player from either team', () => {
    const pick = pickSpotlightPlayer('Manchester City', 'Liverpool', scorers);
    expect(pick?.playerName).toBe('Haaland');
    expect(pick?.goals).toBe(18);
  });

  it('matches abbreviated team names', () => {
    const pick = pickSpotlightPlayer('Man City', 'Liverpool FC', scorers);
    expect(pick?.playerName).toBe('Haaland');
  });

  it('returns null when no scorer matches fixture teams', () => {
    expect(pickSpotlightPlayer('Arsenal', 'Chelsea', scorers)).toBeNull();
  });
});
