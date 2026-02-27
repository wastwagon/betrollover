import { determinePickResult } from './settlement-logic';

describe('settlement-logic', () => {
  describe('Match Winner (1X2)', () => {
    it('home win', () => {
      expect(determinePickResult('home', 2, 1)).toBe('won');
      expect(determinePickResult('1', 2, 1)).toBe('won');
      expect(determinePickResult('home win', 2, 1)).toBe('won');
      expect(determinePickResult('away', 2, 1)).toBe('lost');
      expect(determinePickResult('draw', 2, 1)).toBe('lost');
    });

    it('away win', () => {
      expect(determinePickResult('away', 1, 2)).toBe('won');
      expect(determinePickResult('2', 1, 2)).toBe('won');
      expect(determinePickResult('home', 1, 2)).toBe('lost');
      expect(determinePickResult('draw', 1, 2)).toBe('lost');
    });

    it('draw', () => {
      expect(determinePickResult('draw', 1, 1)).toBe('won');
      expect(determinePickResult('x', 1, 1)).toBe('won');
      expect(determinePickResult('home', 1, 1)).toBe('lost');
      expect(determinePickResult('away', 1, 1)).toBe('lost');
    });
  });

  describe('Double Chance', () => {
    it('12 (home or away)', () => {
      expect(determinePickResult('12', 2, 1)).toBe('won');
      expect(determinePickResult('home/away', 2, 1)).toBe('won');
      expect(determinePickResult('12', 1, 1)).toBe('lost');
    });

    it('1X (home or draw)', () => {
      expect(determinePickResult('1x', 2, 1)).toBe('won');
      expect(determinePickResult('1x', 1, 1)).toBe('won');
      expect(determinePickResult('home/draw', 2, 1)).toBe('won');
      expect(determinePickResult('1x', 1, 2)).toBe('lost');
    });

    it('X2 (draw or away)', () => {
      expect(determinePickResult('x2', 1, 2)).toBe('won');
      expect(determinePickResult('x2', 1, 1)).toBe('won');
      expect(determinePickResult('draw/away', 1, 2)).toBe('won');
      expect(determinePickResult('x2', 2, 1)).toBe('lost');
    });
  });

  describe('Match Winner by team/player name (Odds API)', () => {
    it('home team wins', () => {
      expect(determinePickResult('Match Winner: New Orleans Pelicans', 2, 1, 'New Orleans Pelicans', 'Boston Celtics')).toBe('won');
      expect(determinePickResult('Match Winner: Novak Djokovic', 2, 0, 'Novak Djokovic', 'Jack Draper')).toBe('won');
    });

    it('away team wins', () => {
      expect(determinePickResult('Match Winner: Boston Celtics', 1, 2, 'New Orleans Pelicans', 'Boston Celtics')).toBe('won');
      expect(determinePickResult('Match Winner: Jack Draper', 0, 2, 'Halys', 'Jack Draper')).toBe('won');
    });

    it('partial name match', () => {
      expect(determinePickResult('Match Winner: Pelicans', 2, 1, 'New Orleans Pelicans', 'Boston Celtics')).toBe('won');
    });

    it('positional fallback', () => {
      expect(determinePickResult('Match Winner: home', 2, 1)).toBe('won');
      expect(determinePickResult('Match Winner: away', 1, 2)).toBe('won');
      expect(determinePickResult('Match Winner: draw', 1, 1)).toBe('won');
    });

    it('returns null when no match', () => {
      expect(determinePickResult('Match Winner: Unknown Team', 2, 1, 'Team A', 'Team B')).toBeNull();
    });
  });

  describe('Over/Under', () => {
    it('goals/points', () => {
      expect(determinePickResult('over 2.5', 2, 1)).toBe('won');
      expect(determinePickResult('over 2.5', 2, 0)).toBe('lost');
      expect(determinePickResult('under 2.5', 1, 1)).toBe('won');
      expect(determinePickResult('under 2.5', 2, 1)).toBe('lost');
      expect(determinePickResult('Over 1.5', 1, 1)).toBe('won');
      expect(determinePickResult('Under 3.5', 2, 1)).toBe('won');
    });

    it('basketball points', () => {
      expect(determinePickResult('over 220.5', 110, 115)).toBe('won');
      expect(determinePickResult('under 220.5', 100, 110)).toBe('won');
      expect(determinePickResult('under 220.5', 115, 120)).toBe('lost');
    });
  });

  describe('Both Teams To Score', () => {
    it('BTTS yes', () => {
      expect(determinePickResult('btts yes', 2, 1)).toBe('won');
      expect(determinePickResult('both teams yes', 2, 1)).toBe('won');
      expect(determinePickResult('btts', 2, 1)).toBe('won');
      expect(determinePickResult('btts yes', 2, 0)).toBe('lost');
    });

    it('BTTS no', () => {
      expect(determinePickResult('btts no', 2, 0)).toBe('won');
      expect(determinePickResult('both teams no', 2, 0)).toBe('won');
      expect(determinePickResult('btts no', 2, 1)).toBe('lost');
    });
  });

  describe('Set Betting (tennis)', () => {
    it('order-agnostic: 2-0 wins if actual 2-0 or 0-2', () => {
      expect(determinePickResult('Set Betting: 2-0', 2, 0, 'Novak Djokovic', 'Jack Draper')).toBe('won');
      expect(determinePickResult('Set Betting: 2-0', 0, 2, 'Halys', 'Jack Draper')).toBe('won');
      expect(determinePickResult('Set Betting: 2-1', 2, 1)).toBe('won');
      expect(determinePickResult('Set Betting: 2-1', 1, 2)).toBe('won');
    });

    it('loses when wrong set score', () => {
      expect(determinePickResult('Set Betting: 2-0', 2, 1)).toBe('lost');
      expect(determinePickResult('Set Betting: 2-1', 2, 0)).toBe('lost');
    });
  });

  describe('Correct Score', () => {
    it('exact match', () => {
      expect(determinePickResult('2-1', 2, 1)).toBe('won');
      expect(determinePickResult('1:1', 1, 1)).toBe('won');
      expect(determinePickResult('Correct Score: 2-1', 2, 1)).toBe('won');
    });

    it('no match', () => {
      expect(determinePickResult('2-1', 2, 0)).toBe('lost');
      expect(determinePickResult('1-1', 2, 1)).toBe('lost');
    });
  });

  describe('Draw No Bet', () => {
    it('void on draw', () => {
      expect(determinePickResult('draw no bet home', 1, 1)).toBe('void');
      expect(determinePickResult('dnb away', 1, 1)).toBe('void');
    });

    it('won/lost on result', () => {
      expect(determinePickResult('draw no bet home', 2, 1)).toBe('won');
      expect(determinePickResult('dnb home', 1, 2)).toBe('lost');
      expect(determinePickResult('draw no bet away', 1, 2)).toBe('won');
      expect(determinePickResult('dnb away', 2, 1)).toBe('lost');
    });
  });

  describe('Handicap / Spread', () => {
    it('home minus', () => {
      expect(determinePickResult('home -3.5', 108, 100)).toBe('won'); // margin 8 > 3.5
      expect(determinePickResult('home -3.5', 102, 100)).toBe('lost'); // margin 2 < 3.5
    });

    it('home plus', () => {
      expect(determinePickResult('home +2.5', 98, 100)).toBe('won'); // margin -2 > -2.5
      expect(determinePickResult('home +2.5', 95, 100)).toBe('lost'); // margin -5 < -2.5
    });

    it('away minus', () => {
      expect(determinePickResult('away -3.5', 100, 110)).toBe('won'); // away margin 10 > 3.5
      expect(determinePickResult('away -3.5', 100, 102)).toBe('lost');
    });

    it('away plus', () => {
      expect(determinePickResult('away +2.5', 100, 98)).toBe('won'); // away margin -2 > -2.5
      expect(determinePickResult('away +2.5', 100, 95)).toBe('lost');
    });

    it('team name handicap', () => {
      expect(determinePickResult('Lakers -5.5', 110, 100, 'Lakers', 'Celtics')).toBe('won');
      expect(determinePickResult('Celtics +3.5', 100, 102, 'Lakers', 'Celtics')).toBe('won');
    });
  });

  describe('Odd/Even', () => {
    it('odd total', () => {
      expect(determinePickResult('odd', 2, 1)).toBe('won');
      expect(determinePickResult('odd total', 2, 1)).toBe('won');
      expect(determinePickResult('even', 2, 1)).toBe('lost');
    });

    it('even total', () => {
      expect(determinePickResult('even', 2, 2)).toBe('won');
      expect(determinePickResult('even total', 1, 1)).toBe('won');
      expect(determinePickResult('odd', 2, 2)).toBe('lost');
    });
  });

  describe('Unmatched', () => {
    it('returns null for unknown', () => {
      expect(determinePickResult('exotic market', 2, 1)).toBeNull();
      expect(determinePickResult('', 2, 1)).toBeNull();
    });
  });
});
