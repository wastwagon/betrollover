import type { NonFootballSport } from './types';

/** Market order per sport (non-football) */
export const SPORT_MARKET_ORDERS: Record<NonFootballSport, string[]> = {
  basketball: ['Match Winner', 'Over/Under', 'Home/Away', '3Way Result', 'Goals Over/Under'],
  rugby: ['Match Winner', 'Over/Under', 'Home/Away', '3Way Result', 'Goals Over/Under'],
  mma: ['Match Winner', 'Method of Victory', 'Home/Away'],
  volleyball: ['Match Winner', 'Home/Away', '3Way Result'],
  hockey: ['Match Winner', 'Over/Under', 'Home/Away', '3Way Result'],
  american_football: ['Match Winner', 'Over/Under', 'Home/Away', '3Way Result'],
  tennis: ['Match Winner', 'Over/Under', 'Set Betting', 'Games Over/Under'],
};
