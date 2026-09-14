import {
  ACCA_DESK_MAX_PER_DAY,
  ACCA_DESK_PAUSED_USERNAMES,
  ACCA_DESK_TIPSTERS,
  ACCA_O15_BLACKLIST_LEAGUE_API_IDS,
  ACCA_O15_ODDS_BY_RISK,
  accaDeskPausedPublicExcludeRawSql,
  isAccaDeskPublishingPaused,
  isAccaO15LeagueAllowed,
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

describe('acca desk Over 1.5 league filter', () => {
  it('blocks grind leagues that kept AccaSafeO15 in 0-0 / 1-0 losses', () => {
    expect(ACCA_O15_BLACKLIST_LEAGUE_API_IDS).toEqual(
      expect.arrayContaining([128, 129, 131, 132, 141, 186, 255]),
    );
    expect(isAccaO15LeagueAllowed(129)).toBe(false);
    expect(isAccaO15LeagueAllowed(39)).toBe(true);
    expect(isAccaO15LeagueAllowed(72)).toBe(true);
    expect(isAccaO15LeagueAllowed(233)).toBe(true);
  });

  it('gives every Over 1.5 desk grind-league blocks and over-only prices, and leaves AccaSure1X2 alone', () => {
    const o15 = ACCA_DESK_TIPSTERS.filter((t) => t.markets.length === 1 && t.markets[0] === 'over15');
    expect(o15.map((t) => t.username).sort()).toEqual(
      ['AccaHighO15', 'AccaMediumO15', 'AccaSafeO15', 'AccaSureO15'].sort(),
    );
    for (const desk of o15) {
      expect(desk.excludeLeagueApiIds).toEqual([...ACCA_O15_BLACKLIST_LEAGUE_API_IDS]);
      const band = ACCA_O15_ODDS_BY_RISK[desk.riskLevel];
      expect(desk.oddMin).toBe(band.oddMin);
      expect(desk.oddMax).toBe(band.oddMax);
      expect(desk.targetOdd).toBe(band.targetOdd);
    }
    expect(ACCA_O15_ODDS_BY_RISK.sure.oddMax).toBeLessThan(ACCA_O15_ODDS_BY_RISK.safe.oddMin);
    expect(ACCA_O15_ODDS_BY_RISK.safe.oddMax).toBeLessThan(ACCA_O15_ODDS_BY_RISK.medium.oddMin);
    expect(ACCA_O15_ODDS_BY_RISK.medium.oddMax).toBeLessThan(ACCA_O15_ODDS_BY_RISK.high.oddMin);
    expect(ACCA_O15_ODDS_BY_RISK.high.oddMax).toBeLessThan(2);

    const sure1x2 = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSure1X2')!;
    expect(sure1x2.oddMin).toBeUndefined();
    expect(sure1x2.oddMax).toBeUndefined();
    expect(sure1x2.excludeLeagueApiIds).toBeUndefined();
    const dc = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSafeDC')!;
    expect(dc.excludeLeagueApiIds).toBeUndefined();
    expect(dc.oddMin).toBeUndefined();

    const mix = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSafeMix')!;
    expect(mix.markets).toContain('over15');
    expect(mix.excludeLeagueApiIds).toBeUndefined();
    expect(mix.oddMin).toBeUndefined();
    const fh = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaHighFHO15')!;
    expect(fh.markets).toEqual(['fh_over15']);
    expect(fh.excludeLeagueApiIds).toBeUndefined();
  });
});

describe('acca desk pause list', () => {
  it('leaves the full roster publishing, including AccaSure', () => {
    expect(ACCA_DESK_PAUSED_USERNAMES.size).toBe(0);
    expect(isAccaDeskPublishingPaused('AccaMediumO25')).toBe(false);
    expect(isAccaDeskPublishingPaused('AccaSure1X2')).toBe(false);
    expect(isAccaDeskPublishingPaused('AccaSureO15')).toBe(false);
    expect(accaDeskPausedPublicExcludeRawSql('t')).toBe('TRUE');
  });
});
