import {
  parseApiFootballPredictionsOutcomes,
  parsePercent,
} from './api-football-predictions.parser';

describe('parsePercent', () => {
  it('parses fraction and percent strings', () => {
    expect(parsePercent('45%')).toBeCloseTo(0.45);
    expect(parsePercent('0.45')).toBeCloseTo(0.45);
    expect(parsePercent(0.6)).toBe(0.6);
  });
});

describe('parseApiFootballPredictionsOutcomes', () => {
  it('parses match winner and goals', () => {
    const out = parseApiFootballPredictionsOutcomes({
      percent: { home: '50%', draw: '25%', away: '25%' },
      goals: { over: '60%', under: '40%' },
      btts: { yes: '55%' },
    });
    const by = Object.fromEntries(out.map((o) => [o.outcome, o.probability]));
    expect(by.home).toBeCloseTo(0.5);
    expect(by.draw).toBeCloseTo(0.25);
    expect(by.away).toBeCloseTo(0.25);
    expect(by.over25).toBeCloseTo(0.6);
    expect(by.under25).toBeCloseTo(0.4);
    expect(by.btts).toBeCloseTo(0.55);
  });

  it('parses half_time with home/draw/away and numeric keys', () => {
    const named = parseApiFootballPredictionsOutcomes({
      percent: { home: '40%', draw: '30%', away: '30%' },
      half_time: { home: '35%', draw: '35%', away: '30%' },
    });
    const htNamed = Object.fromEntries(
      named.filter((o) => o.outcome.startsWith('ht_')).map((o) => [o.outcome, o.probability]),
    );
    expect(htNamed.ht_home).toBeCloseTo(0.35);
    expect(htNamed.ht_draw).toBeCloseTo(0.35);
    expect(htNamed.ht_away).toBeCloseTo(0.3);

    const numeric = parseApiFootballPredictionsOutcomes({
      percent: { home: '40%', draw: '30%', away: '30%' },
      half_time: { '1': '42%', x: '28%', '2': '30%' },
    });
    const ht = Object.fromEntries(
      numeric.filter((o) => o.outcome.startsWith('ht_')).map((o) => [o.outcome, o.probability]),
    );
    expect(ht.ht_home).toBeCloseTo(0.42);
    expect(ht.ht_draw).toBeCloseTo(0.28);
    expect(ht.ht_away).toBeCloseTo(0.3);
  });

  it('parses goals 1.5 / 3.5, goals.half FH O/U, and odd_even', () => {
    const out = parseApiFootballPredictionsOutcomes({
      percent: { home: '40%', draw: '30%', away: '30%' },
      goals: {
        'over 1.5': '55%',
        'under 3.5': '40%',
        half: { 'Over 1.5': '50%', 'under 2.5': '45%' },
      },
      odd_even: { odd: '48%', even: '52%' },
    });
    const by = Object.fromEntries(out.map((o) => [o.outcome, o.probability]));
    expect(by.over15).toBeCloseTo(0.55);
    expect(by.under35).toBeCloseTo(0.4);
    expect(by.fh_over15).toBeCloseTo(0.5);
    expect(by.fh_under25).toBeCloseTo(0.45);
    expect(by.odd_goals).toBeCloseTo(0.48);
    expect(by.even_goals).toBeCloseTo(0.52);
  });
});
