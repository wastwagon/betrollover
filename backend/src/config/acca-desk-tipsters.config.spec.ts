import {
  ACCA_DESK_MAX_PER_DAY,
  ACCA_DESK_PAUSED_USERNAMES,
  ACCA_DESK_TIPSTERS,
  ACCA_1X2_BLACKLIST_LEAGUE_API_IDS,
  ACCA_1X2_EXCLUDE_SLOT_KEYS,
  ACCA_O15_BLACKLIST_LEAGUE_API_IDS,
  ACCA_O15_ODDS_BY_RISK,
  ACCA_SAFE_1X2_ODDS,
  ACCA_MEDIUM_1X2_ODDS,
  ACCA_MEDIUM_1X2_OUTCOME_KEYS,
  ACCA_SURE_DC_BLACKLIST_LEAGUE_API_IDS,
  ACCA_MEDIUM_DC_EXCLUDE_SLOT_KEYS,
  ACCA_SAFE_DC_EXCLUDE_SLOT_KEYS,
  ACCA_MEDIUM_BTTS_EXCLUDE_SLOT_KEYS,
  ACCA_MEDIUM_BTTS_ODDS,
  ACCA_MEDIUM_MIX_ODDS,
  accaDeskPausedPublicExcludeRawSql,
  isAcca1X2LeagueAllowed,
  isAccaDeskPublishingPaused,
  isAccaO15LeagueAllowed,
  isAccaSureDcLeagueAllowed,
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
    expect(sure1x2.excludeSlotKeys).toEqual([...ACCA_1X2_EXCLUDE_SLOT_KEYS]);
    const safeBtts = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSafeBTTS')!;
    expect(safeBtts.excludeLeagueApiIds).toBeUndefined();
    expect(safeBtts.oddMin).toBeUndefined();
    expect(safeBtts.excludeSlotKeys).toBeUndefined();
    expect(safeBtts.distinctOutcomeKeys).toBeUndefined();

    const mix = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSafeMix')!;
    expect(mix.markets).toContain('over15');
    expect(mix.excludeLeagueApiIds).toBeUndefined();
    expect(mix.oddMin).toBeUndefined();
    const fh = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaHighFHO15')!;
    expect(fh.markets).toEqual(['fh_over15']);
    expect(fh.excludeLeagueApiIds).toBeUndefined();
  });
});

describe('AccaSafe1X2 desk shape', () => {
  it('skips Midnight, tightens the Safe band, and blacklists grind 1X2 leagues', () => {
    const safe = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSafe1X2')!;
    expect(safe.markets).toEqual(['match_winner']);
    expect(safe.excludeSlotKeys).toEqual(['midnight']);
    expect(safe.oddMin).toBe(ACCA_SAFE_1X2_ODDS.oddMin);
    expect(safe.oddMax).toBe(ACCA_SAFE_1X2_ODDS.oddMax);
    expect(safe.targetOdd).toBe(ACCA_SAFE_1X2_ODDS.targetOdd);
    expect(safe.combinedOddMin).toBe(2.2);
    expect(safe.combinedOddMax).toBe(2.45);
    expect((safe.oddMax ?? 0) * (safe.oddMax ?? 0)).toBeGreaterThan(safe.combinedOddMax ?? 0);
    expect(safe.skipAmateurLeagueNames).toBe(true);
    expect(safe.excludeLeagueApiIds).toEqual([...ACCA_1X2_BLACKLIST_LEAGUE_API_IDS]);
    expect(isAcca1X2LeagueAllowed(262)).toBe(false);
    expect(isAcca1X2LeagueAllowed(39)).toBe(true);
  });
});

describe('AccaMedium1X2 desk shape', () => {
  it('skips Midnight, keeps Evening, Home-only, amateur skip, combined cap 4.10', () => {
    const medium = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaMedium1X2')!;
    expect(medium.markets).toEqual(['match_winner']);
    expect(medium.excludeSlotKeys).toEqual(['midnight']);
    expect(medium.excludeSlotKeys).not.toContain('evening');
    expect(medium.oddMin).toBeUndefined();
    expect(medium.combinedOddMin).toBeUndefined();
    expect(medium.combinedOddMax).toBe(ACCA_MEDIUM_1X2_ODDS.combinedOddMax);
    expect(medium.combinedOddMax).toBe(4.1);
    expect(medium.allowedOutcomeKeys).toEqual([...ACCA_MEDIUM_1X2_OUTCOME_KEYS]);
    expect(medium.allowedOutcomeKeys).toEqual(['home']);
    expect(medium.skipAmateurLeagueNames).toBe(true);
    expect(medium.excludeLeagueApiIds).toBeUndefined();
    expect(medium.distinctOutcomeKeys).toBeUndefined();

    const sure = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSure1X2')!;
    expect(sure.allowedOutcomeKeys).toBeUndefined();
    expect(sure.skipAmateurLeagueNames).toBeUndefined();
    expect(sure.combinedOddMax).toBeUndefined();
    expect(sure.excludeSlotKeys).toEqual(['midnight']);
  });
});

describe('AccaSureDC desk shape', () => {
  it('keeps Midnight, skips youth/grind leagues, and refuses stacked 12+12', () => {
    const sure = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSureDC')!;
    expect(sure.markets).toEqual(['double_chance']);
    expect(sure.excludeSlotKeys).toBeUndefined();
    expect(sure.skipAmateurLeagueNames).toBe(true);
    expect(sure.distinctOutcomeKeys).toBe(true);
    expect(sure.excludeLeagueApiIds).toEqual([...ACCA_SURE_DC_BLACKLIST_LEAGUE_API_IDS]);
    expect(isAccaSureDcLeagueAllowed(233)).toBe(false);
    expect(isAccaSureDcLeagueAllowed(39)).toBe(true);
    expect(isAccaSureDcLeagueAllowed(253)).toBe(true);

  });
});

describe('AccaSafeDC desk shape', () => {
  it('skips Early and amateur, keeps Midnight/Evening and stacked X2', () => {
    const safe = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSafeDC')!;
    expect(safe.markets).toEqual(['double_chance']);
    expect(safe.excludeSlotKeys).toEqual([...ACCA_SAFE_DC_EXCLUDE_SLOT_KEYS]);
    expect(safe.excludeSlotKeys).toEqual(['early']);
    expect(safe.excludeSlotKeys).not.toContain('midnight');
    expect(safe.excludeSlotKeys).not.toContain('evening');
    expect(safe.skipAmateurLeagueNames).toBe(true);
    expect(safe.distinctOutcomeKeys).toBeUndefined();
    expect(safe.excludeLeagueApiIds).toBeUndefined();
  });
});

describe('AccaMediumDC desk shape', () => {
  it('skips Evening and Midnight, keeps youth and stacked X2', () => {
    const medium = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaMediumDC')!;
    expect(medium.markets).toEqual(['double_chance']);
    expect(medium.excludeSlotKeys).toEqual([...ACCA_MEDIUM_DC_EXCLUDE_SLOT_KEYS]);
    expect(medium.excludeSlotKeys).toEqual(['evening', 'midnight']);
    expect(medium.skipAmateurLeagueNames).toBeUndefined();
    expect(medium.distinctOutcomeKeys).toBeUndefined();
    expect(medium.excludeLeagueApiIds).toBeUndefined();
  });
});

describe('AccaMediumBTTS desk shape', () => {
  it('skips Midnight only, keeps Evening and youth, caps combined at 4.10', () => {
    const medium = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaMediumBTTS')!;
    expect(medium.markets).toEqual(['btts']);
    expect(medium.excludeSlotKeys).toEqual([...ACCA_MEDIUM_BTTS_EXCLUDE_SLOT_KEYS]);
    expect(medium.excludeSlotKeys).toEqual(['midnight']);
    expect(medium.excludeSlotKeys).not.toContain('evening');
    expect(medium.combinedOddMax).toBe(ACCA_MEDIUM_BTTS_ODDS.combinedOddMax);
    expect(medium.combinedOddMax).toBe(4.1);
    expect(medium.skipAmateurLeagueNames).toBeUndefined();
    expect(medium.allowedOutcomeKeys).toBeUndefined();
    expect(medium.excludeLeagueApiIds).toBeUndefined();

    const sure = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSureBTTS')!;
    const safe = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSafeBTTS')!;
    expect(sure.excludeSlotKeys).toBeUndefined();
    expect(sure.combinedOddMax).toBeUndefined();
    expect(safe.excludeSlotKeys).toBeUndefined();
    expect(safe.combinedOddMax).toBeUndefined();
  });
});

describe('AccaSureMix desk shape', () => {
  it('skips youth and stacked identical keys, keeps all slots', () => {
    const sure = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSureMix')!;
    expect(sure.markets).toEqual(expect.arrayContaining(['over15', 'over25', 'btts', 'double_chance', 'match_winner']));
    expect(sure.skipAmateurLeagueNames).toBe(true);
    expect(sure.distinctOutcomeKeys).toBe(true);
    expect(sure.excludeSlotKeys).toBeUndefined();
    expect(sure.excludeLeagueApiIds).toBeUndefined();
    expect(sure.combinedOddMax).toBeUndefined();

    const safe = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaSafeMix')!;
    expect(safe.skipAmateurLeagueNames).toBeUndefined();
    expect(safe.distinctOutcomeKeys).toBeUndefined();
  });
});

describe('AccaMediumMix desk shape', () => {
  it('skips amateur, caps combined at 4.10, keeps Evening and BTTS stacks', () => {
    const medium = ACCA_DESK_TIPSTERS.find((t) => t.username === 'AccaMediumMix')!;
    expect(medium.markets).toEqual(expect.arrayContaining(['over15', 'over25', 'btts', 'double_chance', 'match_winner']));
    expect(medium.skipAmateurLeagueNames).toBe(true);
    expect(medium.combinedOddMax).toBe(ACCA_MEDIUM_MIX_ODDS.combinedOddMax);
    expect(medium.combinedOddMax).toBe(4.1);
    expect(medium.distinctOutcomeKeys).toBeUndefined();
    expect(medium.excludeSlotKeys).toBeUndefined();
    expect(medium.allowedOutcomeKeys).toBeUndefined();
    expect(medium.excludeLeagueApiIds).toBeUndefined();
  });
});

describe('acca desk pause list', () => {
  it('pauses Sure/Safe/Medium O25 + Sure/Safe BTTS; High O25 / Medium BTTS keep publishing', () => {
    expect([...ACCA_DESK_PAUSED_USERNAMES].sort()).toEqual(
      ['AccaMediumO25', 'AccaSafeBTTS', 'AccaSafeO25', 'AccaSureBTTS', 'AccaSureO25'].sort(),
    );
    expect(isAccaDeskPublishingPaused('AccaSureO25')).toBe(true);
    expect(isAccaDeskPublishingPaused('AccaSureBTTS')).toBe(true);
    expect(isAccaDeskPublishingPaused('AccaSafeO25')).toBe(true);
    expect(isAccaDeskPublishingPaused('AccaMediumO25')).toBe(true);
    expect(isAccaDeskPublishingPaused('AccaSafeBTTS')).toBe(true);
    expect(isAccaDeskPublishingPaused('AccaMediumBTTS')).toBe(false);
    expect(isAccaDeskPublishingPaused('AccaHighO25')).toBe(false);
    expect(isAccaDeskPublishingPaused('AccaSure1X2')).toBe(false);
    expect(isAccaDeskPublishingPaused('AccaSureO15')).toBe(false);
    expect(accaDeskPausedPublicExcludeRawSql('t')).toContain("'AccaSureO25'");
    expect(accaDeskPausedPublicExcludeRawSql('t')).toContain("'AccaSureBTTS'");
    expect(accaDeskPausedPublicExcludeRawSql('t')).toContain("'AccaSafeO25'");
    expect(accaDeskPausedPublicExcludeRawSql('t')).toContain("'AccaMediumO25'");
    expect(accaDeskPausedPublicExcludeRawSql('t')).toContain("'AccaSafeBTTS'");
    expect(accaDeskPausedPublicExcludeRawSql('t')).toContain('NOT IN');
  });
});
