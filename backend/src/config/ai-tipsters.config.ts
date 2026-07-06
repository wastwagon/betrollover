/**
 * AI Tipsters Configuration
 * 25 tipsters. Default: 2-leg safe accas — each leg ≥1.50 odds, combined 2.0–3.0 (e.g. 1.50×1.50=2.25).
 * Each tipster sets max_daily_predictions (up to 3); live cap is min(that, api_settings.ai_max_coupons_per_day).
 * Fixtures limited to target day only (no advance/future coupons).
 * Global usedFixtureIds ensures no two AI tipsters reuse the same fixture on a given day.
 *
 * Engine builds candidate rows per fixture/outcome. Pairs are ranked by joint API probability, not EV.
 * outcome_specialization = strict one-market legs; omit for multi-market flex tipsters.
 * All tipsters use coupon_legs: 2 — singles are blocked in the engine.
 */

/** Default 2-leg safe acca: each leg ≥1.50, combined 2.0–3.0 (not 3+ on a single leg). */
export const SAFE_2_LEG_ACCA: Pick<
  AiTipsterPersonality,
  | 'coupon_legs'
  | 'leg_odds_min'
  | 'leg_odds_max'
  | 'min_combined_odds'
  | 'max_combined_odds'
  | 'min_joint_probability'
  | 'min_win_probability'
  | 'min_api_confidence'
  | 'min_expected_value'
  | 'require_api_probability'
  | 'selection_mode'
  | 'major_leagues_only'
> = {
  coupon_legs: 2,
  leg_odds_min: 1.5,
  leg_odds_max: 1.75,
  min_combined_odds: 2.0,
  max_combined_odds: 3.0,
  min_joint_probability: 0.42,
  min_win_probability: 0.52,
  min_api_confidence: 0.60,
  min_expected_value: 0,
  require_api_probability: true,
  selection_mode: 'confidence',
  major_leagues_only: true,
};

/** Double-chance specialists: same 1.50+ leg floor, combined 2.0–3.0. */
export const SAFE_2_LEG_DC: typeof SAFE_2_LEG_ACCA = {
  ...SAFE_2_LEG_ACCA,
  leg_odds_max: 1.72,
};

/** The Gambler: same 1.50+ leg floor; slightly wider per-leg ceiling, combined cap 3.2. */
export const GAMBLER_2_LEG: typeof SAFE_2_LEG_ACCA = {
  ...SAFE_2_LEG_ACCA,
  leg_odds_min: 1.5,
  leg_odds_max: 1.8,
  max_combined_odds: 3.2,
  min_joint_probability: 0.40,
  min_api_confidence: 0.58,
  require_api_probability: true,
  major_leagues_only: true,
};

/** Strict single-outcome selection; omit for flexible tipsters (bet_types only). */
export type OutcomeSpecialization =
  | 'home'
  | 'away'
  | 'draw'
  | 'over25'
  | 'under25'
  | 'btts'
  | 'home_away'
  | 'home_draw'
  | 'draw_away';

export interface AiTipsterPersonality {
  risk_level: 'conservative' | 'balanced' | 'aggressive';
  /** @deprecated For 2-leg accas use leg_odds_min/max. Kept for coupon_legs: 1 profiles. */
  target_odds_min: number;
  target_odds_max: number;
  /** 2 = safe double (default in engine); 1 = single high-odds coupon. */
  coupon_legs?: 1 | 2;
  /** Per-leg odds when coupon_legs === 2. */
  leg_odds_min?: number;
  leg_odds_max?: number;
  min_combined_odds?: number;
  max_combined_odds?: number;
  /** Minimum prob1 × prob2 for a 2-leg pair. */
  min_joint_probability?: number;
  /** Rank pairs by joint API probability instead of EV. */
  selection_mode?: 'ev' | 'confidence';
  /** When true, only API-backed probabilities qualify (recommended for 2-leg). */
  require_api_probability?: boolean;
  min_win_probability: number;
  min_expected_value: number;
  /**
   * Relaxes the EV floor: effective EV minimum is max(0, min_expected_value - ev_min_relaxation).
   * Omit or 0 for strict filtering; volume profiles may keep a small positive value (e.g. 0.08).
   */
  ev_min_relaxation?: number;
  /** Min API-Football confidence (0-1). When API predictions available, filter by this. */
  min_api_confidence?: number;
  leagues_focus: string[];
  bet_types: string[];
  max_daily_predictions: number;
  preference?: string;
  team_filter?: string[];
  /** @deprecated Prefer outcome_specialization: 'home' */
  selection_filter?: string;
  /** Filter by fixture kickoff day. weekend=Sat/Sun, midweek=Tue/Wed/Thu */
  fixture_days?: 'weekend' | 'midweek';
  /** When true (default for 2-leg), only major domestic/international leagues qualify. */
  major_leagues_only?: boolean;
  /** When set, this tipster only selects coupons on this outcome (API + odds per market). */
  outcome_specialization?: OutcomeSpecialization;
}

export interface AiTipsterConfig {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  personality: AiTipsterPersonality;
}

export const AI_TIPSTERS: AiTipsterConfig[] = [
  // ============================================
  // WEEKLY (single-market specialists, all leagues)
  // ============================================
  {
    username: 'SafetyFirstPro',
    display_name: 'Weekly Home Value',
    bio: 'Home win 2-pick acca. Two high-confidence home legs from API-Football, combined 2.0+ odds.',
    avatar_url: '/avatars/safety_first.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'conservative',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'TheBankroller',
    display_name: 'Weekly Over 2.5',
    bio: 'Over 2.5 goals 2-pick acca. Two API-backed over selections combined to 2.0+ odds.',
    avatar_url: '/avatars/bankroller.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'conservative',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['Over 2.5'],
      outcome_specialization: 'over25',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'SteadyEddie',
    display_name: 'Weekly Away Value',
    bio: 'Away win 2-pick acca. Two confident away legs when API and prices align; 2.0+ combined.',
    avatar_url: '/avatars/steady_eddie.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'conservative',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'away',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'ConsistentCarl',
    display_name: 'Weekly Elite',
    bio: 'Weekly 2-pick X2 acca. Two draw-or-away legs when API confidence and prices align; 2.0+ combined.',
    avatar_url: '/avatars/consistent_carl.png',
    personality: {
      ...SAFE_2_LEG_DC,
      risk_level: 'conservative',
      target_odds_min: 1.25,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['Double Chance'],
      outcome_specialization: 'draw_away',
      max_daily_predictions: 2,
    },
  },

  // ============================================
  // WEEKEND (Sat/Sun)
  // ============================================
  {
    username: 'WeekendWarrior',
    display_name: 'Weekend Double Chance 12',
    bio: 'Weekend 2-pick double chance (12). Two safe Home-or-Away legs combined to 2.0+ odds.',
    avatar_url: '/avatars/weekend_warrior.png',
    personality: {
      ...SAFE_2_LEG_DC,
      risk_level: 'balanced',
      target_odds_min: 1.25,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['Double Chance'],
      fixture_days: 'weekend',
      outcome_specialization: 'home_away',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'PremierLeaguePro',
    display_name: 'Weekend Multi-Market',
    bio: 'Weekend 2-pick flex acca. Best two high-confidence legs across 1X2, goals, BTTS or DC; 2.0+ combined.',
    avatar_url: '/avatars/epl_pro.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'Over/Under', 'BTTS', 'Double Chance'],
      fixture_days: 'weekend',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'LaLigaLegend',
    display_name: 'Weekend BTTS',
    bio: 'Weekend BTTS 2-pick acca. Two confident both-teams-to-score legs combined to 2.0+ odds.',
    avatar_url: '/avatars/laliga_legend.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['BTTS'],
      fixture_days: 'weekend',
      outcome_specialization: 'btts',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'BundesligaBoss',
    display_name: 'Weekend Under 2.5',
    bio: 'Weekend Under 2.5 2-pick acca. Two low-scoring selections with strong API backing; 2.0+ combined.',
    avatar_url: '/avatars/bundesliga_boss.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['Under 2.5'],
      fixture_days: 'weekend',
      outcome_specialization: 'under25',
      max_daily_predictions: 3,
    },
  },

  // ============================================
  // MIDWEEK (Tue–Thu)
  // ============================================
  {
    username: 'MidweekMagic',
    display_name: 'Midweek Home',
    bio: 'Midweek home 2-pick acca. Two confident home wins on Tue–Thu slates; 2.0+ combined.',
    avatar_url: '/avatars/midweek_magic.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'aggressive',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      fixture_days: 'midweek',
      outcome_specialization: 'home',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'LateBloomer',
    display_name: 'Midweek Away',
    bio: 'Midweek away 2-pick acca. Two API-backed away legs on Tue–Thu; 2.0+ combined.',
    avatar_url: '/avatars/late_bloomer.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      fixture_days: 'midweek',
      outcome_specialization: 'away',
      max_daily_predictions: 3,
    },
  },

  // ============================================
  // DAILY (all days)
  // ============================================
  {
    username: 'TheAnalyst',
    display_name: 'Daily Multi-Market',
    bio: 'Daily 2-pick flex acca. Two highest-confidence legs across 1X2, DC, BTTS or goals; 2.0+ combined.',
    avatar_url: '/avatars/analyst.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'Double Chance', 'BTTS', 'Over/Under'],
      max_daily_predictions: 3,
    },
  },
  {
    username: 'ValueHunter',
    display_name: 'Daily Value Hunter',
    bio: 'Daily 2-pick 1X acca. Two home-or-draw legs when value and API confidence align; 2.0+ combined.',
    avatar_url: '/avatars/value_hunter.png',
    personality: {
      ...SAFE_2_LEG_DC,
      risk_level: 'balanced',
      target_odds_min: 1.25,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['Double Chance'],
      outcome_specialization: 'home_draw',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'FormExpert',
    display_name: 'Daily Double Chance 1X',
    bio: 'Daily 2-pick 1X acca. Two home-or-draw legs when API and prices align; 2.0+ combined.',
    avatar_url: '/avatars/form_expert.png',
    personality: {
      ...SAFE_2_LEG_DC,
      risk_level: 'balanced',
      target_odds_min: 1.25,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['Double Chance'],
      outcome_specialization: 'home_draw',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'StatsMachine',
    display_name: 'Daily Under 2.5',
    bio: 'Daily Under 2.5 2-pick acca. Two cagey unders with API backing; 2.0+ combined.',
    avatar_url: '/avatars/stats_machine.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['Under 2.5'],
      outcome_specialization: 'under25',
      max_daily_predictions: 3,
    },
  },

  // ============================================
  // MARKET FLAGS (daily, single outcome)
  // ============================================
  {
    username: 'BTTSMaster',
    display_name: 'BTTS Daily',
    bio: 'BTTS 2-pick acca. Two confident both-teams-to-score legs; 2.0+ combined.',
    avatar_url: '/avatars/btts_master.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['BTTS'],
      outcome_specialization: 'btts',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'OverUnderGuru',
    display_name: 'Over 2.5 Daily',
    bio: 'Over 2.5 2-pick acca. Two goal-heavy selections with API support; 2.0+ combined.',
    avatar_url: '/avatars/over_under_guru.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['Over 2.5'],
      outcome_specialization: 'over25',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'CleanSheetChaser',
    display_name: 'Under 2.5 Daily',
    bio: 'Under 2.5 2-pick acca. Two low-event games when API unders align; 2.0+ combined.',
    avatar_url: '/avatars/clean_sheet_chaser.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'aggressive',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['Under 2.5'],
      outcome_specialization: 'under25',
      max_daily_predictions: 3,
    },
  },

  // ============================================
  // “STYLE” BRANDS (still single-outcome or flex)
  // ============================================
  {
    username: 'SerieASavant',
    display_name: 'Tactical Home',
    bio: 'Tactical home 2-pick acca. Two tight home-win angles; 2.0+ combined.',
    avatar_url: '/avatars/serie_a_savant.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'Ligue1Lion',
    display_name: 'Double Chance X2',
    bio: 'Daily 2-pick X2 acca. Two draw-or-away cushions when API and price align; 2.0+ combined.',
    avatar_url: '/avatars/ligue1_lion.png',
    personality: {
      ...SAFE_2_LEG_DC,
      risk_level: 'balanced',
      target_odds_min: 1.25,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['Double Chance'],
      outcome_specialization: 'draw_away',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'ChampionshipChamp',
    display_name: 'Away Underdog',
    bio: 'Away 2-pick acca. Two confident away wins when API and prices align; 2.0+ combined.',
    avatar_url: '/avatars/championship_champ.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'away',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'HomeHeroes',
    display_name: 'Home Fortress',
    bio: 'Home fortress 2-pick acca. Two strong home-win legs; 2.0+ combined.',
    avatar_url: '/avatars/home_heroes.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'conservative',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'UnderdogKing',
    display_name: 'Underdog Daily',
    bio: 'Daily away 2-pick acca. Two confident away legs at 1.50+ each; 2.0+ combined (no longshot singles).',
    avatar_url: '/avatars/underdog_king.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'aggressive',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'away',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'HighRollerHQ',
    display_name: 'High-Odds Multi',
    bio: 'Daily 2-pick flex acca across 1X2, DNB, HT, odd/even, BTTS and goals; 2.0+ combined.',
    avatar_url: '/avatars/high_roller.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'aggressive',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'BTTS', 'Over/Under', 'DNB', 'First half', 'Odd/Even'],
      max_daily_predictions: 3,
    },
  },
  {
    username: 'TheGambler',
    display_name: 'The Gambler',
    bio: 'All-league 2-pick flex acca. 1X2, BTTS or Under 2.5 — slightly wider leg band; 2.0+ combined.',
    avatar_url: '/avatars/gambler.png',
    personality: {
      ...GAMBLER_2_LEG,
      risk_level: 'aggressive',
      target_odds_min: 1.41,
      target_odds_max: 2.2,
      ev_min_relaxation: 0.08,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'BTTS', 'Under 2.5'],
      max_daily_predictions: 3,
    },
  },
  {
    username: 'TopSixSniper',
    display_name: 'Big 6 Home (EPL)',
    bio: 'Premier League Big 6 home 2-pick acca. Two confident home wins; 2.0+ combined.',
    avatar_url: '/avatars/top_six_sniper.png',
    personality: {
      ...SAFE_2_LEG_ACCA,
      risk_level: 'conservative',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      leagues_focus: ['Premier League'],
      team_filter: ['top_6'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 3,
    },
  },
];
