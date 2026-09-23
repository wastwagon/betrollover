import { engineOutcomeKeyFromOddsLine, outcomeKeyFromOddsLine } from './odds-outcome-keys';

describe('outcomeKeyFromOddsLine', () => {
  it('maps 1X2 and double chance (operator precedence)', () => {
    expect(outcomeKeyFromOddsLine('1X2', 'Home')).toBe('home');
    expect(outcomeKeyFromOddsLine('Double Chance', '12')).toBe('home_away');
    expect(outcomeKeyFromOddsLine('Double Chance', 'Home/Away')).toBe('home_away');
    expect(outcomeKeyFromOddsLine('Double Chance', '1X')).toBe('home_draw');
  });

  it('maps DNB and HT', () => {
    expect(outcomeKeyFromOddsLine('DNB', 'Home')).toBe('dnb_home');
    expect(outcomeKeyFromOddsLine('First Half Winner', 'Home')).toBe('ht_home');
  });

  it('maps home/away team score a goal', () => {
    expect(outcomeKeyFromOddsLine('Home Team Score a Goal', 'Yes')).toBe('home_score_yes');
    expect(outcomeKeyFromOddsLine('Away Team Score a Goal', 'No')).toBe('away_score_no');
  });

  it('maps first-half goals over/under lines including 0.5', () => {
    expect(outcomeKeyFromOddsLine('Goals Over/Under First Half', 'Over 0.5')).toBe('fh_over05');
    expect(outcomeKeyFromOddsLine('Goals Over/Under First Half', 'Under 0.5')).toBe('fh_under05');
    expect(outcomeKeyFromOddsLine('Goals Over/Under First Half', 'Over 1.5')).toBe('fh_over15');
  });

  it('correct score sentinel', () => {
    expect(outcomeKeyFromOddsLine('Correct Score', '1-0')).toBe('correct_score');
  });

  it('engine fallback preserves raw value', () => {
    expect(engineOutcomeKeyFromOddsLine('Unknown Market', 'Foo')).toBe('foo');
    expect(engineOutcomeKeyFromOddsLine('Match Winner', 'Home')).toBe('home');
  });
});
