/**
 * AI Tipsters Configuration
 * 25 tipsters. Single-fixture coupons only. Each tipster sets max_daily_predictions (up to 3 here);
 * the live cap is min(that value, api_settings.ai_max_coupons_per_day, default 2 — editable in Admin → Settings).
 * Fixtures limited to target day only (no advance/future coupons).
 * All leagues; global usedFixtureIds ensures no two AI tipsters pick the same fixture.
 *
 * Engine builds multiple candidate rows per fixture (best EV per outcome: home, away, draw,
 * O/U 2.5, BTTS, double chance, DNB, first-half 1X2 when odds exist). Each tipster uses
 * outcome_specialization for strict one-market profiles, or omits it and uses bet_types for multi-market picks.
 * bet_types may include "DNB" / "Draw no bet" and "First half" / "Half time" for those markets.
 * team_filter: ['top_6'] restricts to EPL Big 6 name matching (see epl-big-six.config.ts).
 * TopSixSniper also uses leagues_focus Premier League only (not cups/Europe in that profile).
 *
 * Non–The Gambler tipsters target 2.0+ decimal odds on the single leg.
 * The Gambler keeps ~1.41–2.2 (unchanged).
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
  risk_level: 'conservative' | 'balanced' | 'aggressive';
  target_odds_min: number;
  target_odds_max: number;
  min_win_probability: number;
  min_expected_value: number;
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
    bio: 'Home win only. API-Football probabilities plus odds filter; 2.0+ when we publish. All leagues.',
    avatar_url: '/avatars/safety_first.png',
    personality: {
      risk_level: 'conservative',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'TheBankroller',
    display_name: 'Weekly Over 2.5',
    bio: 'Over 2.5 goals only. Targets games where API goal outlook and price align. All leagues.',
    avatar_url: '/avatars/bankroller.png',
    personality: {
      risk_level: 'conservative',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['Over 2.5'],
      outcome_specialization: 'over25',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'SteadyEddie',
    display_name: 'Weekly Away Value',
    bio: 'Away win only. Road dogs and value away prices when the model and odds agree. All leagues.',
    avatar_url: '/avatars/steady_eddie.png',
    personality: {
      risk_level: 'conservative',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'away',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'ConsistentCarl',
    display_name: 'Weekly Draw',
    bio: 'Draw (X) only. Selective picks from API match-winner % vs draw price; lower min odds than 2.0 goal markets. All leagues.',
    avatar_url: '/avatars/consistent_carl.png',
    personality: {
      risk_level: 'conservative',
      target_odds_min: 1.35,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'draw',
      max_daily_predictions: 3,
    },
  },

  // ============================================
  // WEEKEND (Sat/Sun)
  // ============================================
  {
    username: 'WeekendWarrior',
    display_name: 'Weekend Double Chance 12',
    bio: 'Double chance Home or Away (12) only on weekends. DC lines are often below 2.0 — lower odds floor than goal markets. All leagues.',
    avatar_url: '/avatars/weekend_warrior.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.25,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
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
    bio: 'Weekend only. Picks the strongest edge across 1X2 (incl. draw), goals, BTTS or double chance per coupon. All leagues.',
    avatar_url: '/avatars/epl_pro.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'Over/Under', 'BTTS', 'Double Chance'],
      fixture_days: 'weekend',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'LaLigaLegend',
    display_name: 'Weekend BTTS',
    bio: 'Both teams to score — weekends only. API BTTS signal vs Yes price. All leagues.',
    avatar_url: '/avatars/laliga_legend.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
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
    bio: 'Under 2.5 goals only on weekends. Low-scoring angles when API and unders align. All leagues.',
    avatar_url: '/avatars/bundesliga_boss.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
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
    bio: 'Home win only on midweek slates (cups, Europe). Same API + odds rules as our other home profile.',
    avatar_url: '/avatars/midweek_magic.png',
    personality: {
      risk_level: 'aggressive',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
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
    bio: 'Away win only midweek. Rotation and travel spots when away value clears the bar. All leagues.',
    avatar_url: '/avatars/late_bloomer.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
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
    bio: 'Daily flex: best single leg across 1X2 (incl. draw), double chance, BTTS or goals where data and price match.',
    avatar_url: '/avatars/analyst.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'Double Chance', 'BTTS', 'Over/Under'],
      max_daily_predictions: 3,
    },
  },
  {
    username: 'ValueHunter',
    display_name: 'Daily Draw',
    bio: 'Draw (X) specialist — second draw-focused profile for volume days. API draw % vs draw odds; min odds relaxed vs 2.0 goal picks.',
    avatar_url: '/avatars/value_hunter.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.35,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'draw',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'FormExpert',
    display_name: 'Daily Double Chance 1X',
    bio: 'Home or draw (1X) only. Safer wrapper when API probs and the 1X price align; lower odds floor for DC.',
    avatar_url: '/avatars/form_expert.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.25,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['Double Chance'],
      outcome_specialization: 'home_draw',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'StatsMachine',
    display_name: 'Daily Under 2.5',
    bio: 'Under 2.5 only — cagey fixtures where API under signal and price line up. All leagues.',
    avatar_url: '/avatars/stats_machine.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
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
    bio: 'BTTS Yes only — every day. Pure both-teams-to-score vs API and bookmaker Yes odds.',
    avatar_url: '/avatars/btts_master.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['BTTS'],
      outcome_specialization: 'btts',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'OverUnderGuru',
    display_name: 'Over 2.5 Daily',
    bio: 'Over 2.5 goals only. Goals-market specialist; API over % vs Over 2.5 price.',
    avatar_url: '/avatars/over_under_guru.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['Over 2.5'],
      outcome_specialization: 'over25',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'CleanSheetChaser',
    display_name: 'Under 2.5 Daily',
    bio: 'Under 2.5 only — low-event games when unders are the clearest edge.',
    avatar_url: '/avatars/clean_sheet_chaser.png',
    personality: {
      risk_level: 'aggressive',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
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
    bio: 'Home win only — “tactical” tight-game lean. All leagues; same engine as other home specialists.',
    avatar_url: '/avatars/serie_a_savant.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'Ligue1Lion',
    display_name: 'Double Chance X2',
    bio: 'Draw or away (X2) only. Underdog cushion when API and X2 price align; lower odds floor for double chance.',
    avatar_url: '/avatars/ligue1_lion.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.25,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['Double Chance'],
      outcome_specialization: 'draw_away',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'ChampionshipChamp',
    display_name: 'Away Underdog',
    bio: 'Away win only — physical league narrative; requires away side and value filters.',
    avatar_url: '/avatars/championship_champ.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'away',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'HomeHeroes',
    display_name: 'Home Fortress',
    bio: 'Home win only — fortress narrative. Same outcome_specialization as other home AI tipsters.',
    avatar_url: '/avatars/home_heroes.png',
    personality: {
      risk_level: 'conservative',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'UnderdogKing',
    display_name: 'Away Longshot',
    bio: 'Away win only with minimum price 2.5 — underdog lane on the same API + EV rules.',
    avatar_url: '/avatars/underdog_king.png',
    personality: {
      risk_level: 'aggressive',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['1X2'],
      preference: 'underdogs',
      outcome_specialization: 'away',
      max_daily_predictions: 3,
    },
  },
  {
    username: 'HighRollerHQ',
    display_name: 'High-Odds Multi',
    bio: 'Daily flex: 1X2, DNB, first-half (result + goals), odd/even, BTTS and goals — best EV in the 2.0–5.0 band.',
    avatar_url: '/avatars/high_roller.png',
    personality: {
      risk_level: 'aggressive',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'BTTS', 'Over/Under', 'DNB', 'First half', 'Odd/Even'],
      max_daily_predictions: 3,
    },
  },
  {
    username: 'TheGambler',
    display_name: 'The Gambler',
    bio: 'All-league flex: 1X2 (home, away or draw), BTTS or Under 2.5 — tighter odds band, unchanged profile.',
    avatar_url: '/avatars/gambler.png',
    personality: {
      risk_level: 'aggressive',
      target_odds_min: 1.41,
      target_odds_max: 2.2,
      min_win_probability: 0.52,
      min_expected_value: 0.04,
      min_api_confidence: 0.5,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'BTTS', 'Under 2.5'],
      max_daily_predictions: 3,
    },
  },
  {
    username: 'TopSixSniper',
    display_name: 'Big 6 Home (EPL)',
    bio: 'Premier League only. Home win when the home team is a Big 6 club: Arsenal, Chelsea, Liverpool, Man City, Man Utd, or Tottenham.',
    avatar_url: '/avatars/top_six_sniper.png',
    personality: {
      risk_level: 'conservative',
      target_odds_min: 2.0,
      target_odds_max: 5.0,
      min_win_probability: 0.42,
      min_expected_value: 0.02,
      min_api_confidence: 0.42,
      leagues_focus: ['Premier League'],
      team_filter: ['top_6'],
      bet_types: ['1X2'],
      outcome_specialization: 'home',
      max_daily_predictions: 3,
    },
  },
];
