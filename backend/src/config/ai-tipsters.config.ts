/**
 * AI Tipsters Configuration
 * 25 tipsters. All 2-fixture accas target combined odds 2.0–4.0 (per leg ~1.41–2.0).
 */

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
  selection_filter?: string;
  /** Filter by fixture kickoff day. weekend=Sat/Sun, midweek=Tue/Wed/Thu */
  fixture_days?: 'weekend' | 'midweek';
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
  // WEEKLY (1 pick, very selective, profit focus)
  // ============================================
  {
    username: 'SafetyFirstPro',
    display_name: 'Weekly Premium',
    bio: 'One quality pick per week. Favorites only. Steady profits over volume.',
    avatar_url: '/avatars/safety_first.png',
    personality: {
      risk_level: 'conservative',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.65,
      min_expected_value: 0.06,
      min_api_confidence: 0.62,
      leagues_focus: ['Premier League', 'La Liga', 'Serie A'],
      bet_types: ['1X2'],
      max_daily_predictions: 1,
    },
  },
  {
    username: 'TheBankroller',
    display_name: 'Weekly Bankroll',
    bio: 'One low-odds acca per week. Combined 2–4 odds. Building the bankroll.',
    avatar_url: '/avatars/bankroller.png',
    personality: {
      risk_level: 'conservative',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.62,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Premier League', 'Bundesliga', 'La Liga', 'Serie A'],
      bet_types: ['1X2', 'Over/Under'],
      max_daily_predictions: 1,
    },
  },
  {
    username: 'SteadyEddie',
    display_name: 'Weekly Steady',
    bio: 'One pick per week. No gambles, just value. Consistent returns.',
    avatar_url: '/avatars/steady_eddie.png',
    personality: {
      risk_level: 'conservative',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.64,
      min_expected_value: 0.05,
      min_api_confidence: 0.57,
      leagues_focus: ['Premier League', 'Ligue 1'],
      bet_types: ['1X2'],
      max_daily_predictions: 1,
    },
  },
  {
    username: 'ConsistentCarl',
    display_name: 'Weekly Elite',
    bio: 'One elite pick per week. 70%+ win rate target. Small but steady profits.',
    avatar_url: '/avatars/consistent_carl.png',
    personality: {
      risk_level: 'conservative',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.68,
      min_expected_value: 0.06,
      min_api_confidence: 0.57,
      leagues_focus: ['Premier League', 'Bundesliga'],
      bet_types: ['1X2'],
      max_daily_predictions: 1,
    },
  },

  // ============================================
  // WEEKEND (Sat/Sun fixtures)
  // ============================================
  {
    username: 'WeekendWarrior',
    display_name: 'Weekend Value',
    bio: 'Weekend fixtures only. Sat & Sun leagues. Value when it matters.',
    avatar_url: '/avatars/weekend_warrior.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.58,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Premier League', 'La Liga'],
      bet_types: ['1X2', 'BTTS', 'Double Chance'],
      max_daily_predictions: 2,
      fixture_days: 'weekend',
    },
  },
  {
    username: 'PremierLeaguePro',
    display_name: 'Weekend EPL',
    bio: 'EPL weekend specialist. Saturday and Sunday Premier League value.',
    avatar_url: '/avatars/epl_pro.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.58,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Premier League'],
      bet_types: ['1X2', 'Over/Under', 'BTTS', 'Double Chance'],
      max_daily_predictions: 2,
      fixture_days: 'weekend',
    },
  },
  {
    username: 'LaLigaLegend',
    display_name: 'Weekend La Liga',
    bio: 'La Liga weekend specialist. Spanish football Sat & Sun.',
    avatar_url: '/avatars/laliga_legend.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.58,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['La Liga'],
      bet_types: ['1X2', 'BTTS'],
      max_daily_predictions: 2,
      fixture_days: 'weekend',
    },
  },
  {
    username: 'BundesligaBoss',
    display_name: 'Weekend Bundesliga',
    bio: 'Bundesliga weekend specialist. German football Sat & Sun.',
    avatar_url: '/avatars/bundesliga_boss.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.58,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Bundesliga'],
      bet_types: ['1X2', 'Over/Under'],
      max_daily_predictions: 2,
      fixture_days: 'weekend',
    },
  },

  // ============================================
  // MIDWEEK (Tue/Wed/Thu – Champions League, Europa, cups)
  // ============================================
  {
    username: 'MidweekMagic',
    display_name: 'Midweek Edge',
    bio: 'Midweek fixtures only. Champions League, Europa, cup games. Rotation expert.',
    avatar_url: '/avatars/midweek_magic.png',
    personality: {
      risk_level: 'aggressive',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.52,
      min_expected_value: 0.04,
      min_api_confidence: 0.5,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'BTTS'],
      max_daily_predictions: 2,
      fixture_days: 'midweek',
    },
  },
  {
    username: 'LateBloomer',
    display_name: 'Midweek Value',
    bio: 'Midweek value hunter. Tue/Wed/Thu when European leagues play.',
    avatar_url: '/avatars/late_bloomer.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.52,
      min_expected_value: 0.04,
      min_api_confidence: 0.5,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'Over/Under'],
      max_daily_predictions: 2,
      fixture_days: 'midweek',
    },
  },

  // ============================================
  // DAILY VALUE (all fixture days, when value appears)
  // ============================================
  {
    username: 'TheAnalyst',
    display_name: 'Daily Value',
    bio: 'Posts daily when value appears. Data-driven. Top 5 leagues.',
    avatar_url: '/avatars/analyst.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.58,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Premier League', 'La Liga', 'Serie A', 'Bundesliga'],
      bet_types: ['1X2', 'BTTS', 'Over/Under', 'Double Chance'],
      max_daily_predictions: 2,
    },
  },
  {
    username: 'ValueHunter',
    display_name: 'Daily Value Hunter',
    bio: 'Only posts when odds are in our favor. Value is everything.',
    avatar_url: '/avatars/value_hunter.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.58,
      min_expected_value: 0.06,
      min_api_confidence: 0.52,
      leagues_focus: ['Premier League', 'Serie A', 'Bundesliga'],
      bet_types: ['1X2'],
      max_daily_predictions: 1,
    },
  },
  {
    username: 'FormExpert',
    display_name: 'Daily Form',
    bio: 'Current form over history. Posts daily when momentum aligns.',
    avatar_url: '/avatars/form_expert.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.58,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Premier League', 'La Liga', 'Bundesliga'],
      bet_types: ['1X2', 'Over/Under'],
      max_daily_predictions: 2,
    },
  },
  {
    username: 'StatsMachine',
    display_name: 'Daily Stats',
    bio: 'Pure mathematics. No emotions. Posts daily when numbers say value.',
    avatar_url: '/avatars/stats_machine.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.52,
      min_expected_value: 0.04,
      min_api_confidence: 0.5,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'Over/Under', 'BTTS'],
      max_daily_predictions: 2,
    },
  },

  // ============================================
  // MARKET SPECIALISTS (name reflects selection type)
  // ============================================
  {
    username: 'BTTSMaster',
    display_name: 'BTTS Daily',
    bio: 'Both Teams To Score specialist. Posts daily when BTTS value appears.',
    avatar_url: '/avatars/btts_master.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.58,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Premier League', 'Bundesliga'],
      bet_types: ['BTTS'],
      max_daily_predictions: 2,
    },
  },
  {
    username: 'OverUnderGuru',
    display_name: 'Over 2.5 Daily',
    bio: 'Over 2.5 goals specialist. Posts daily when goals market has value.',
    avatar_url: '/avatars/over_under_guru.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.59,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Premier League', 'Bundesliga', 'Serie A'],
      bet_types: ['Over 2.5'],
      max_daily_predictions: 2,
    },
  },
  {
    username: 'CleanSheetChaser',
    display_name: 'Under 2.5 Daily',
    bio: 'Under 2.5 goals specialist. Defense-focused. Serie A & La Liga.',
    avatar_url: '/avatars/clean_sheet_chaser.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.59,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Serie A', 'La Liga'],
      bet_types: ['Under 2.5'],
      max_daily_predictions: 2,
    },
  },

  // ============================================
  // LEAGUE SPECIALISTS (daily when value)
  // ============================================
  {
    username: 'SerieASavant',
    display_name: 'Serie A Daily',
    bio: 'Italian football specialist. Tactical. Posts daily when value appears.',
    avatar_url: '/avatars/serie_a_savant.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.58,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Serie A'],
      bet_types: ['1X2', 'Under 2.5'],
      max_daily_predictions: 2,
    },
  },
  {
    username: 'Ligue1Lion',
    display_name: 'Ligue 1 Daily',
    bio: 'French football specialist. PSG and beyond. Daily value.',
    avatar_url: '/avatars/ligue1_lion.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.58,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Ligue 1'],
      bet_types: ['1X2', 'BTTS'],
      max_daily_predictions: 2,
    },
  },
  {
    username: 'ChampionshipChamp',
    display_name: 'Championship Daily',
    bio: 'English Championship specialist. Know every team. Daily when value.',
    avatar_url: '/avatars/championship_champ.png',
    personality: {
      risk_level: 'balanced',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.58,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Championship'],
      bet_types: ['1X2', 'BTTS'],
      max_daily_predictions: 2,
    },
  },

  // ============================================
  // STYLE SPECIALISTS (home, underdog, high odds)
  // ============================================
  {
    username: 'HomeHeroes',
    display_name: 'Home Win Daily',
    bio: 'Home advantage specialist. Fortress teams only. Posts when home value appears.',
    avatar_url: '/avatars/home_heroes.png',
    personality: {
      risk_level: 'conservative',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.52,
      min_expected_value: 0.04,
      min_api_confidence: 0.5,
      leagues_focus: ['All'],
      selection_filter: 'home_only',
      bet_types: ['1X2'],
      max_daily_predictions: 2,
    },
  },
  {
    username: 'UnderdogKing',
    display_name: 'Underdog Daily',
    bio: 'Value specialist. Low-odds accas. Posts when value appears.',
    avatar_url: '/avatars/underdog_king.png',
    personality: {
      risk_level: 'aggressive',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.57,
      min_expected_value: 0.07,
      min_api_confidence: 0.52,
      leagues_focus: ['Premier League', 'Championship', 'La Liga'],
      bet_types: ['1X2'],
      max_daily_predictions: 2,
    },
  },
  {
    username: 'HighRollerHQ',
    display_name: 'High Odds Daily',
    bio: 'Low-odds accas. Combined 2–4. Premium selections.',
    avatar_url: '/avatars/high_roller.png',
    personality: {
      risk_level: 'aggressive',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.55,
      min_expected_value: 0.05,
      min_api_confidence: 0.52,
      leagues_focus: ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'],
      bet_types: ['1X2', 'BTTS', 'Over/Under'],
      max_daily_predictions: 2,
    },
  },
  {
    username: 'TheGambler',
    display_name: 'The Gambler',
    bio: '2–3 picks daily when value appears. 1X2, BTTS, Over/Under. All leagues.',
    avatar_url: '/avatars/gambler.png',
    personality: {
      risk_level: 'aggressive',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.52,
      min_expected_value: 0.04,
      min_api_confidence: 0.5,
      leagues_focus: ['All'],
      bet_types: ['1X2', 'BTTS', 'Over/Under', 'Double Chance'],
      max_daily_predictions: 3,
    },
  },
  {
    username: 'TopSixSniper',
    display_name: 'Big 6 Daily',
    bio: 'EPL Big 6 specialist. Elite teams only. Posts when favorites offer value.',
    avatar_url: '/avatars/top_six_sniper.png',
    personality: {
      risk_level: 'conservative',
      target_odds_min: 1.41,
      target_odds_max: 2.0,
      min_win_probability: 0.63,
      min_expected_value: 0.06,
      min_api_confidence: 0.57,
      leagues_focus: ['Premier League'],
      team_filter: ['top_6'],
      bet_types: ['1X2'],
      max_daily_predictions: 1,
    },
  },
];
