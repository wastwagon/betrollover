/**
 * AI Tipsters — distinct strategy families for long-run performance tracking.
 *
 * Design goals:
 * - Each tipster has a unique strategy_id and different numeric / API gates
 * - No same-rule clones racing for leftover fixtures
 * - Prefer API-Football signals (percent, advice, under_over, comparison)
 * - Live daily cap = min(max_daily_predictions, api_settings.ai_max_coupons_per_day)
 *
 * Track ROI / win rate by strategy_id (not by display name).
 */

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
  /** Stable id for analytics (never rename casually). */
  strategy_id: string;
  risk_level: 'conservative' | 'balanced' | 'aggressive';
  target_odds_min: number;
  target_odds_max: number;
  min_win_probability: number;
  min_expected_value: number;
  /**
   * Relaxes the EV floor: effective EV minimum is max(0, min_expected_value - ev_min_relaxation).
   */
  ev_min_relaxation?: number;
  /** Min API-Football confidence (0-1). When API predictions available, filter by this. */
  min_api_confidence?: number;
  /** When true, only API-backed probabilities qualify (no odds-implied fallback). */
  require_api_probability?: boolean;
  /** Require API advice/winner to agree with the selected 1X2/DC outcome. */
  require_advice_align?: boolean;
  /** Require API under_over direction to match Over/Under specialists. */
  require_under_over?: 'over' | 'under';
  /**
   * Minimum comparison form edge (0–1). Home strategies: formHome - formAway.
   * Away strategies: formAway - formHome. Ignored when comparison missing.
   */
  min_form_edge?: number;
  /**
   * For draw specialists: when comparison exists, |formHome - formAway| must be ≤ this
   * (balanced match). Ignored when comparison missing.
   */
  max_form_imbalance?: number;
  /** Restrict to major domestic/international leagues (see major-leagues.config). */
  major_leagues_only?: boolean;
  /** Reject coarse API percent bins (40/45/50/55/60) that inflate longshot EV. */
  reject_coarse_api_pct?: boolean;
  /** Minimum API prob − implied(1/odds). Extra value gate beyond EV. */
  min_prob_edge?: number;
  leagues_focus: string[];
  bet_types: string[];
  max_daily_predictions: number;
  preference?: string;
  team_filter?: string[];
  /** @deprecated Prefer outcome_specialization: 'home' */
  selection_filter?: string;
  /** Filter by fixture kickoff day. weekend=Sat/Sun, midweek=Tue/Wed/Thu */
  fixture_days?: 'weekend' | 'midweek';
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

/**
 * 25 trackable strategies. Order = fixture allocation order (fixed, not WR-sorted).
 * Re-enabled tipsters use distinct league/day/odds gates (not same-rule clones).
 */
export const AI_TIPSTERS: AiTipsterConfig[] = [
  // --- Unique soft-price flex (benchmark) ---
  {
    username: 'TheGambler',
    display_name: 'The Gambler',
    bio: 'Soft-price flex (1.41–2.2). Higher API bar. 1X2 / BTTS / Under 2.5. Benchmark strategy for tracking.',
    avatar_url: '/avatars/gambler.png',
    personality: {
      strategy_id: 'soft_price_flex',
      risk_level: 'aggressive',
      target_odds_min: 1.41,
      target_odds_max: 2.2,
      min_win_probability: 0.52,
      min_expected_value: 0.04,
      ev_min_relaxation: 0.08,
      min_api_confidence: 0.5,
      require_api_probability: true,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'BTTS', 'Under 2.5'],
      max_daily_predictions: 2,
    },
  },

  // --- 1X2 specialists (different odds + confidence bands) ---
  {
    username: 'SafetyFirstPro',
    display_name: 'Home Favorites',
    bio: 'Home win only when API advice agrees. Short prices 1.70–2.40, high confidence (≥55%), form edge.',
    avatar_url: '/avatars/safety_first.png',
    personality: {
      strategy_id: 'home_favorites_advice',
      risk_level: 'conservative',
      target_odds_min: 1.7,
      target_odds_max: 2.4,
      min_win_probability: 0.55,
      min_expected_value: 0.03,
      min_api_confidence: 0.55,
      require_api_probability: true,
      require_advice_align: true,
      min_form_edge: 0.08,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'SteadyEddie',
    display_name: 'Away Value',
    bio: 'Away win value band 2.20–4.00. Medium API bar (≥48%), positive EV. Distinct from home favorites.',
    avatar_url: '/avatars/steady_eddie.png',
    personality: {
      strategy_id: 'away_value',
      risk_level: 'balanced',
      target_odds_min: 2.2,
      target_odds_max: 4.0,
      min_win_probability: 0.48,
      min_expected_value: 0.05,
      min_api_confidence: 0.48,
      require_api_probability: true,
      min_form_edge: 0.05,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'away',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'ConsistentCarl',
    display_name: 'Draw Specialist',
    bio: 'Draw value @ 2.80–4.50 in major leagues. Rejects coarse API 45/50% bins and circus prices. Track ROI separately.',
    avatar_url: '/avatars/consistent_carl.png',
    personality: {
      strategy_id: 'draw_value',
      risk_level: 'balanced',
      target_odds_min: 2.8,
      target_odds_max: 4.5,
      min_win_probability: 0.28,
      min_expected_value: 0.1,
      min_api_confidence: 0.28,
      require_api_probability: true,
      major_leagues_only: true,
      reject_coarse_api_pct: true,
      min_prob_edge: 0.08,
      max_form_imbalance: 0.12,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'draw',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'UnderdogKing',
    display_name: 'Away Longshot',
    bio: 'Away underdogs @ 2.80–6.00 in major leagues. Low hit-rate / +EV lane. Skips coarse API bins and non-pro leagues.',
    avatar_url: '/avatars/underdog_king.png',
    personality: {
      strategy_id: 'away_longshot',
      risk_level: 'aggressive',
      target_odds_min: 2.8,
      target_odds_max: 6.0,
      min_win_probability: 0.32,
      min_expected_value: 0.1,
      min_api_confidence: 0.32,
      require_api_probability: true,
      major_leagues_only: true,
      reject_coarse_api_pct: true,
      min_prob_edge: 0.08,
      min_form_edge: 0.03,
      preference: 'underdogs',
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'away',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'TopSixSniper',
    display_name: 'Big 6 Home (EPL)',
    bio: 'Premier League only. Big 6 home win with API advice + form edge. Narrow league sample for clean tracking.',
    avatar_url: '/avatars/top_six_sniper.png',
    personality: {
      strategy_id: 'epl_big6_home',
      risk_level: 'conservative',
      target_odds_min: 1.5,
      target_odds_max: 2.3,
      min_win_probability: 0.58,
      min_expected_value: 0.02,
      min_api_confidence: 0.58,
      require_api_probability: true,
      require_advice_align: true,
      min_form_edge: 0.1,
      leagues_focus: ['Premier League'],
      team_filter: ['top_6'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 2,
    },
  },

  // --- Goals specialists (API under_over gate) ---
  {
    username: 'TheBankroller',
    display_name: 'Over 2.5 Confirmed',
    bio: 'Over 2.5 only when API under_over agrees. Odds 1.70–2.50, API ≥55%.',
    avatar_url: '/avatars/bankroller.png',
    personality: {
      strategy_id: 'over25_api_confirm',
      risk_level: 'balanced',
      target_odds_min: 1.7,
      target_odds_max: 2.5,
      min_win_probability: 0.55,
      min_expected_value: 0.03,
      min_api_confidence: 0.55,
      require_api_probability: true,
      require_under_over: 'over',
      leagues_focus: ['All'],
      bet_types: ['Over 2.5'],
      outcome_specialization: 'over25',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'StatsMachine',
    display_name: 'Under 2.5 Confirmed',
    bio: 'Under 2.5 only when API under_over agrees. Odds 1.70–2.50, API ≥55%. Mirror of Over strategy.',
    avatar_url: '/avatars/stats_machine.png',
    personality: {
      strategy_id: 'under25_api_confirm',
      risk_level: 'balanced',
      target_odds_min: 1.7,
      target_odds_max: 2.5,
      min_win_probability: 0.55,
      min_expected_value: 0.03,
      min_api_confidence: 0.55,
      require_api_probability: true,
      require_under_over: 'under',
      leagues_focus: ['All'],
      bet_types: ['Under 2.5'],
      outcome_specialization: 'under25',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'BTTSMaster',
    display_name: 'BTTS Yes',
    bio: 'BTTS Yes only. Higher confidence (≥58%), mid prices 1.65–2.40.',
    avatar_url: '/avatars/btts_master.png',
    personality: {
      strategy_id: 'btts_yes',
      risk_level: 'balanced',
      target_odds_min: 1.65,
      target_odds_max: 2.4,
      min_win_probability: 0.58,
      min_expected_value: 0.03,
      min_api_confidence: 0.58,
      require_api_probability: true,
      leagues_focus: ['All'],
      bet_types: ['BTTS'],
      outcome_specialization: 'btts',
      max_daily_predictions: 2,
    },
  },

  // --- Double chance (distinct outcomes) ---
  {
    username: 'FormExpert',
    display_name: 'Double Chance 1X',
    bio: 'Home or draw (1X). Short DC prices, high combined confidence, advice/win-or-draw gate.',
    avatar_url: '/avatars/form_expert.png',
    personality: {
      strategy_id: 'dc_1x',
      risk_level: 'conservative',
      target_odds_min: 1.2,
      target_odds_max: 1.7,
      min_win_probability: 0.68,
      min_expected_value: 0.02,
      min_api_confidence: 0.68,
      require_api_probability: true,
      require_advice_align: true,
      leagues_focus: ['All'],
      bet_types: ['Double Chance'],
      outcome_specialization: 'home_draw',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'Ligue1Lion',
    display_name: 'Double Chance X2',
    bio: 'Draw or away (X2). Distinct DC lane from 1X for underdog cushion tracking.',
    avatar_url: '/avatars/ligue1_lion.png',
    personality: {
      strategy_id: 'dc_x2',
      risk_level: 'balanced',
      target_odds_min: 1.25,
      target_odds_max: 1.85,
      min_win_probability: 0.62,
      min_expected_value: 0.02,
      min_api_confidence: 0.62,
      require_api_probability: true,
      leagues_focus: ['All'],
      bet_types: ['Double Chance'],
      outcome_specialization: 'draw_away',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'WeekendWarrior',
    display_name: 'Weekend DC 12',
    bio: 'Weekend only. Double chance Home or Away (12). Day-gated so sample stays weekend-slate.',
    avatar_url: '/avatars/weekend_warrior.png',
    personality: {
      strategy_id: 'weekend_dc_12',
      risk_level: 'balanced',
      target_odds_min: 1.2,
      target_odds_max: 1.65,
      min_win_probability: 0.7,
      min_expected_value: 0.015,
      min_api_confidence: 0.7,
      require_api_probability: true,
      fixture_days: 'weekend',
      leagues_focus: ['All'],
      bet_types: ['Double Chance'],
      outcome_specialization: 'home_away',
      max_daily_predictions: 2,
    },
  },

  // --- Flex (different EV / odds bands) ---
  {
    username: 'TheAnalyst',
    display_name: 'High-EV Flex',
    bio: 'Best EV across 1X2 / DC / BTTS / goals in the 2.0–3.5 band. Stricter EV than The Gambler.',
    avatar_url: '/avatars/analyst.png',
    personality: {
      strategy_id: 'high_ev_flex',
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 3.5,
      min_win_probability: 0.48,
      min_expected_value: 0.07,
      min_api_confidence: 0.48,
      require_api_probability: true,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'Double Chance', 'BTTS', 'Over/Under'],
      max_daily_predictions: 2,
    },
  },
  {
    username: 'HighRollerHQ',
    display_name: 'Longshot Flex',
    bio: 'Expanded markets @ 2.80–6.00 in major leagues. High EV / lower hit rate. Rejects coarse API bins.',
    avatar_url: '/avatars/high_roller.png',
    personality: {
      strategy_id: 'longshot_flex',
      risk_level: 'aggressive',
      target_odds_min: 2.8,
      target_odds_max: 6.0,
      min_win_probability: 0.35,
      min_expected_value: 0.12,
      min_api_confidence: 0.35,
      require_api_probability: true,
      major_leagues_only: true,
      reject_coarse_api_pct: true,
      min_prob_edge: 0.1,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'BTTS', 'Over/Under', 'DNB', 'First half', 'Odd/Even'],
      max_daily_predictions: 2,
    },
  },

  // --- League specialists (re-enabled with distinct scopes) ---
  {
    username: 'SerieASavant',
    display_name: 'Serie A Home',
    bio: 'Serie A home wins only. Advice + form edge. League-scoped vs all-league Home Favorites.',
    avatar_url: '/avatars/serie_a_savant.png',
    personality: {
      strategy_id: 'serie_a_home',
      risk_level: 'balanced',
      target_odds_min: 1.75,
      target_odds_max: 2.6,
      min_win_probability: 0.52,
      min_expected_value: 0.03,
      min_api_confidence: 0.52,
      require_api_probability: true,
      require_advice_align: true,
      min_form_edge: 0.06,
      leagues_focus: ['Serie A'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'LaLigaLegend',
    display_name: 'Weekend La Liga BTTS',
    bio: 'La Liga BTTS on weekends only. Day + league scoped vs daily BTTSMaster.',
    avatar_url: '/avatars/laliga_legend.png',
    personality: {
      strategy_id: 'laliga_weekend_btts',
      risk_level: 'balanced',
      target_odds_min: 1.7,
      target_odds_max: 2.5,
      min_win_probability: 0.55,
      min_expected_value: 0.03,
      min_api_confidence: 0.55,
      require_api_probability: true,
      fixture_days: 'weekend',
      leagues_focus: ['La Liga'],
      bet_types: ['BTTS'],
      outcome_specialization: 'btts',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'BundesligaBoss',
    display_name: 'Weekend Bundesliga Under',
    bio: 'Bundesliga Under 2.5 on weekends. League/day scoped vs StatsMachine (all leagues + under_over).',
    avatar_url: '/avatars/bundesliga_boss.png',
    personality: {
      strategy_id: 'bundesliga_weekend_under25',
      risk_level: 'balanced',
      target_odds_min: 1.75,
      target_odds_max: 2.6,
      min_win_probability: 0.52,
      min_expected_value: 0.04,
      min_api_confidence: 0.52,
      require_api_probability: true,
      fixture_days: 'weekend',
      leagues_focus: ['Bundesliga'],
      bet_types: ['Under 2.5'],
      outcome_specialization: 'under25',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'ChampionshipChamp',
    display_name: 'Championship Away',
    bio: 'EFL Championship away wins only. League-scoped road value vs SteadyEddie (all leagues).',
    avatar_url: '/avatars/championship_champ.png',
    personality: {
      strategy_id: 'championship_away',
      risk_level: 'balanced',
      target_odds_min: 2.3,
      target_odds_max: 4.2,
      min_win_probability: 0.46,
      min_expected_value: 0.05,
      min_api_confidence: 0.46,
      require_api_probability: true,
      min_form_edge: 0.04,
      leagues_focus: ['Championship'],
      bet_types: ['1X2'],
      outcome_specialization: 'away',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'PremierLeaguePro',
    display_name: 'Weekend EPL Flex',
    bio: 'Premier League weekends only. Flex across 1X2 / BTTS / goals / DC — slate-scoped vs TheAnalyst.',
    avatar_url: '/avatars/epl_pro.png',
    personality: {
      strategy_id: 'epl_weekend_flex',
      risk_level: 'balanced',
      target_odds_min: 1.85,
      target_odds_max: 3.2,
      min_win_probability: 0.5,
      min_expected_value: 0.05,
      min_api_confidence: 0.5,
      require_api_probability: true,
      fixture_days: 'weekend',
      leagues_focus: ['Premier League'],
      bet_types: ['1X2', 'Over/Under', 'BTTS', 'Double Chance'],
      max_daily_predictions: 2,
    },
  },

  // --- Day / odds variants (re-enabled, not same-rule clones) ---
  {
    username: 'HomeHeroes',
    display_name: 'Home Mid-Price',
    bio: 'Home wins @ 2.20–3.20 (longer than Home Favorites). No advice gate — EV-led mid-price homes.',
    avatar_url: '/avatars/home_heroes.png',
    personality: {
      strategy_id: 'home_mid_price',
      risk_level: 'conservative',
      target_odds_min: 2.2,
      target_odds_max: 3.2,
      min_win_probability: 0.48,
      min_expected_value: 0.05,
      min_api_confidence: 0.48,
      require_api_probability: true,
      min_form_edge: 0.05,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'ValueHunter',
    display_name: 'Draw Mid-Odds',
    bio: 'Draws @ 3.20–5.00 major leagues. Higher prices than ConsistentCarl (2.80–4.50) for separate ROI tracking.',
    avatar_url: '/avatars/value_hunter.png',
    personality: {
      strategy_id: 'draw_mid_odds',
      risk_level: 'balanced',
      target_odds_min: 3.2,
      target_odds_max: 5.0,
      min_win_probability: 0.26,
      min_expected_value: 0.12,
      min_api_confidence: 0.26,
      require_api_probability: true,
      major_leagues_only: true,
      reject_coarse_api_pct: true,
      min_prob_edge: 0.1,
      max_form_imbalance: 0.1,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'draw',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'OverUnderGuru',
    display_name: 'Over 2.5 Value',
    bio: 'Over 2.5 @ 1.90–2.80 without under_over confirm. Value lane vs TheBankroller (confirmed overs).',
    avatar_url: '/avatars/over_under_guru.png',
    personality: {
      strategy_id: 'over25_value',
      risk_level: 'balanced',
      target_odds_min: 1.9,
      target_odds_max: 2.8,
      min_win_probability: 0.5,
      min_expected_value: 0.05,
      min_api_confidence: 0.5,
      require_api_probability: true,
      leagues_focus: ['All'],
      bet_types: ['Over 2.5'],
      outcome_specialization: 'over25',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'CleanSheetChaser',
    display_name: 'Under 2.5 Aggressive',
    bio: 'Under 2.5 @ 1.90–2.90, looser API bar, no under_over gate. Aggressive lane vs StatsMachine.',
    avatar_url: '/avatars/clean_sheet_chaser.png',
    personality: {
      strategy_id: 'under25_aggressive',
      risk_level: 'aggressive',
      target_odds_min: 1.9,
      target_odds_max: 2.9,
      min_win_probability: 0.48,
      min_expected_value: 0.05,
      min_api_confidence: 0.48,
      require_api_probability: true,
      leagues_focus: ['All'],
      bet_types: ['Under 2.5'],
      outcome_specialization: 'under25',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'MidweekMagic',
    display_name: 'Midweek Home',
    bio: 'Home wins on Tue–Thu slates only (cups/Europe). Day-scoped vs SafetyFirstPro / HomeHeroes.',
    avatar_url: '/avatars/midweek_magic.png',
    personality: {
      strategy_id: 'midweek_home',
      risk_level: 'aggressive',
      target_odds_min: 1.8,
      target_odds_max: 2.7,
      min_win_probability: 0.5,
      min_expected_value: 0.04,
      min_api_confidence: 0.5,
      require_api_probability: true,
      require_advice_align: true,
      fixture_days: 'midweek',
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 2,
    },
  },
  {
    username: 'LateBloomer',
    display_name: 'Midweek Away',
    bio: 'Away wins on Tue–Thu only. Day-scoped road value vs SteadyEddie / ChampionshipChamp.',
    avatar_url: '/avatars/late_bloomer.png',
    personality: {
      strategy_id: 'midweek_away',
      risk_level: 'balanced',
      target_odds_min: 2.1,
      target_odds_max: 3.8,
      min_win_probability: 0.47,
      min_expected_value: 0.05,
      min_api_confidence: 0.47,
      require_api_probability: true,
      fixture_days: 'midweek',
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'away',
      max_daily_predictions: 2,
    },
  },
];
