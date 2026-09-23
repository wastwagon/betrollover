/**
 * Acca Desk tipsters — automated 2-leg free picks via Acca Generator.
 *
 * Bank · Half leads the roster (HT Home only, one slip/day), then
 * Sure + Safe + Medium × (1X2, DC, BTTS, O2.5, O1.5, U1.5, DNB, FH1X2, FHO0.5*, FHO1.5, Mix),
 * plus High for totals (O2.5 / O1.5 / U1.5 / FH Over 1.5).
 * *FHO0.5 is Sure + Safe only (prices too short for Medium/High).
 * Order = fixture allocation order (fixed exclusivity).
 */

import { DEFAULT_ACCA_MARKETS, type AccaRiskLevel } from '../modules/acca-generator/acca-generator.markets';
import type { AccaDeskSlotKey } from './acca-desk-slots';
import {
  BANK_HALF_AVATAR_URL,
  BANK_HALF_BIO,
  BANK_HALF_BLACKLIST_LEAGUE_API_IDS,
  BANK_HALF_DISPLAY_NAME,
  BANK_HALF_EXCLUDE_SLOT_KEYS,
  BANK_HALF_LEG_ODD_MAX,
  BANK_HALF_LEG_ODD_MIN,
  BANK_HALF_LEG_TARGET_ODD,
  BANK_HALF_LEGS,
  BANK_HALF_MARKETS,
  BANK_HALF_MAX_COMBINED_ODDS,
  BANK_HALF_MAX_COUPONS_PER_DAY,
  BANK_HALF_MIN_COMBINED_ODDS,
  BANK_HALF_OUTCOME_KEYS,
  BANK_HALF_REQUIRE_HOME_SCORING_FORM,
  BANK_HALF_SKIP_AMATEUR_LEAGUE_NAMES,
  BANK_HALF_SKIP_CUP_LEAGUE_NAMES,
  BANK_HALF_STRATEGY_ID,
  BANK_HALF_USERNAME,
} from './bank-half.config';

export type AccaDeskTipsterConfig = {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  /** Stable analytics id — do not rename casually. */
  strategy_id: string;
  riskLevel: AccaRiskLevel;
  markets: string[];
  /** Always 2 in v1. */
  legs: 2;
  /** Optional per-desk odd band (overrides the risk profile). */
  oddMin?: number;
  oddMax?: number;
  targetOdd?: number;
  /** API-Football league ids skipped when building this desk's pool. */
  excludeLeagueApiIds?: readonly number[];
  /** Kick-off windows this desk will not publish (e.g. Midnight 1X2). */
  excludeSlotKeys?: readonly AccaDeskSlotKey[];
  skipAmateurLeagueNames?: boolean;
  /** Skip domestic / continental cups (Bank · Half). */
  skipCupLeagueNames?: boolean;
  /**
   * Home side must have scored in its last FT match and not lost by 4+.
   * Used by Bank · Half.
   */
  requireHomeScoringForm?: boolean;
  /** Override ACCA_DESK_MAX_PER_DAY (Bank · Half = 1). */
  maxPerDay?: number;
  /** Inclusive combined-odds floor for the 2-fold. */
  combinedOddMin?: number;
  /** Inclusive combined-odds ceiling for the 2-fold. */
  combinedOddMax?: number;
  /** Do not pair two legs with the same outcome key (AccaSureDC: no 12+12). */
  distinctOutcomeKeys?: boolean;
  /** Intersect with the market catalog (AccaMedium1X2: Home only). */
  allowedOutcomeKeys?: readonly string[];
};

type DeskExtras = Pick<
  AccaDeskTipsterConfig,
  | 'oddMin'
  | 'oddMax'
  | 'targetOdd'
  | 'excludeLeagueApiIds'
  | 'excludeSlotKeys'
  | 'skipAmateurLeagueNames'
  | 'skipCupLeagueNames'
  | 'requireHomeScoringForm'
  | 'maxPerDay'
  | 'combinedOddMin'
  | 'combinedOddMax'
  | 'distinctOutcomeKeys'
  | 'allowedOutcomeKeys'
>;

function desk(
  risk: AccaDeskTipsterConfig['riskLevel'],
  marketKey: string,
  marketLabel: string,
  markets: string[],
  extras?: DeskExtras,
): AccaDeskTipsterConfig {
  const riskLabel = risk.charAt(0).toUpperCase() + risk.slice(1);
  const marketSlug = MARKET_SLUG[marketKey] ?? marketKey.toUpperCase();
  return {
    username: `Acca${riskLabel}${marketSlug}`,
    display_name: `${riskLabel} · ${marketLabel}`,
    bio: `${riskLabel} · ${marketLabel} only. Up to 2 free 2-fold picks a day, clustered by kick-off. Educational odd bands — not guaranteed. 18+.`,
    avatar_url: `/avatars/acca_${risk}_${marketKey}.png?v=2`,
    strategy_id: `acca_desk_${risk}_${marketKey}`,
    riskLevel: risk,
    markets,
    legs: 2,
    ...extras,
  };
}

const MARKET_SLUG: Record<string, string> = {
  '1x2': '1X2',
  dc: 'DC',
  btts: 'BTTS',
  o25: 'O25',
  o15: 'O15',
  u15: 'U15',
  dnb: 'DNB',
  fh1x2: 'FH1X2',
  fh005: 'FHO05',
  fh015: 'FHO15',
  mix: 'Mix',
};

const RISKS: AccaDeskTipsterConfig['riskLevel'][] = ['sure', 'safe', 'medium'];

/** High is totals-only (FT O/U + 1H Over 1.5). 1X2, DC, BTTS, DNB, FH Winner, Mix stay Sure / Safe / Medium. */
const HIGH_MARKET_KEYS = new Set(['o25', 'o15', 'u15', 'fh015']);
/** 1H Over 0.5 legs are ~1.15–1.50 — Sure/Safe only (no Medium/High desks). */
const SURE_SAFE_ONLY_MARKET_KEYS = new Set(['fh005']);

/**
 * AccaSafeO15 / AccaMediumO15 archives: lost Over 1.5 legs were 0-0 or 1-0, mostly
 * Argentine grind. Egypt PL (233) and Brazil Serie B (72) stayed — they still hit.
 */
export const ACCA_O15_BLACKLIST_LEAGUE_API_IDS = [
  128, // Liga Profesional Argentina
  129, // Primera Nacional
  131, // Primera B Metropolitana
  132, // Primera C
  141, // Spain Segunda División
  186, // Algeria Ligue 1
  255, // USL Championship
] as const;

/**
 * Over 1.5 is a short market. Generic Safe/Medium/High bands (1.40–1.75 / 1.70–2.40 / 2.20–3.80)
 * buy low-scoring games. AccaSure1X2 (match winner) is left on the generic Sure 1.20–1.40 band.
 */
export const ACCA_O15_ODDS_BY_RISK: Record<
  AccaRiskLevel,
  { oddMin: number; oddMax: number; targetOdd: number }
> = {
  sure: { oddMin: 1.18, oddMax: 1.32, targetOdd: 1.25 },
  safe: { oddMin: 1.33, oddMax: 1.48, targetOdd: 1.4 },
  medium: { oddMin: 1.49, oddMax: 1.64, targetOdd: 1.56 },
  high: { oddMin: 1.65, oddMax: 1.85, targetOdd: 1.74 },
};

/**
 * 1st Half Over 0.5 — shorter than FT O1.5. Local odds cluster ~1.20–1.54.
 * Sure/Safe only; Medium/High would buy blank first halves.
 */
export const ACCA_FHO05_ODDS_BY_RISK: Record<
  'sure' | 'safe',
  { oddMin: number; oddMax: number; targetOdd: number; combinedOddMin: number; combinedOddMax: number }
> = {
  sure: { oddMin: 1.18, oddMax: 1.32, targetOdd: 1.25, combinedOddMin: 1.45, combinedOddMax: 1.75 },
  safe: { oddMin: 1.33, oddMax: 1.5, targetOdd: 1.4, combinedOddMin: 1.85, combinedOddMax: 2.25 },
};

export const ACCA_FHO05_EXCLUDE_SLOT_KEYS: readonly AccaDeskSlotKey[] = ['midnight'];

export function isAccaO15LeagueAllowed(apiId: number | null | undefined): boolean {
  if (apiId == null || !Number.isFinite(apiId)) return true;
  return !(ACCA_O15_BLACKLIST_LEAGUE_API_IDS as readonly number[]).includes(apiId);
}

/**
 * AccaSafe1X2 Midnight archive: Home favorites in AUS NPL / NWSL / Liga MX / Chile /
 * Ecuador / USL drew or upset at 1.50–1.62. Skip even if they kick off in Early.
 */
export const ACCA_1X2_BLACKLIST_LEAGUE_API_IDS = [
  188, // A-League
  189, // A-League Women
  194, // Victoria NPL
  196, // New South Wales NPL
  242, // Ecuador Liga Pro
  244, // USL Championship (alt id)
  254, // NWSL
  255, // USL Championship
  262, // Liga MX
  263, // Liga de Expansión MX
  265, // Chile Primera División
  266, // Chile Primera B
  339, // Guatemala Liga Nacional
] as const;

/** Safe 1X2: shorter than generic Safe 1.40–1.75 so two legs stay in the 2.20–2.45 slip. */
export const ACCA_SAFE_1X2_ODDS = {
  oddMin: 1.4,
  oddMax: 1.6,
  targetOdd: 1.5,
  combinedOddMin: 2.2,
  combinedOddMax: 2.45,
} as const;

export const ACCA_1X2_EXCLUDE_SLOT_KEYS: readonly AccaDeskSlotKey[] = ['midnight'];

/**
 * AccaMedium1X2 archive: 94 slips at ~3.96 combined, 25.5% vs 25.2% BE (−4.8%).
 * Midnight leftovers are already excluded. Away+Home was −11.0u; combined >4.10
 * was 1–16 (−12.8u); youth exact-winner −6.7u. Keep Evening (flat, unlike Medium DC).
 */
export const ACCA_MEDIUM_1X2_OUTCOME_KEYS = ['home'] as const;
export const ACCA_MEDIUM_1X2_ODDS = {
  combinedOddMax: 4.1,
} as const;

export function isAcca1X2LeagueAllowed(apiId: number | null | undefined): boolean {
  if (apiId == null || !Number.isFinite(apiId)) return true;
  return !(ACCA_1X2_BLACKLIST_LEAGUE_API_IDS as readonly number[]).includes(apiId);
}

/**
 * AccaSureDC archive: U23 / Egypt / Algeria / Chile B / Ecuador 12-draws ate the 1.28 margin.
 * Do not copy the 1X2 Midnight slot ban — DC Midnight was flat.
 */
export const ACCA_SURE_DC_BLACKLIST_LEAGUE_API_IDS = [
  186, // Algeria Ligue 1
  233, // Egypt Premier League
  242, // Ecuador Liga Pro
  266, // Chile Primera B
] as const;

export function isAccaSureDcLeagueAllowed(apiId: number | null | undefined): boolean {
  if (apiId == null || !Number.isFinite(apiId)) return true;
  return !(ACCA_SURE_DC_BLACKLIST_LEAGUE_API_IDS as readonly number[]).includes(apiId);
}

/**
 * AccaSafeDC archive: +5.8% / +6.10u. Midnight is 9–5 (+7.82u) — the whole edge.
 * Early is 11–19 (−3.39u). Youth −3.13u. Do not copy AccaMediumDC Evening+Midnight
 * skip (would flip Safe DC red) or AccaSureDC distinct keys (X2+X2 is +3.68u).
 */
export const ACCA_SAFE_DC_EXCLUDE_SLOT_KEYS: readonly AccaDeskSlotKey[] = ['early'];

/**
 * AccaMediumDC archive: Afternoon X2+X2 is +24u; Evening 2–17 and Midnight 0–4
 * are LATAM/MLS home wins that kill ~2.00 draw-or-away. Keep Early + Afternoon.
 */
export const ACCA_MEDIUM_DC_EXCLUDE_SLOT_KEYS: readonly AccaDeskSlotKey[] = ['evening', 'midnight'];

/**
 * AccaMediumBTTS archive: +25.2% / +20.65u. Evening is +13.96u — do not copy
 * AccaMediumDC’s Evening skip. Midnight 1–6 (−3.45u) is dead 0-0 / 3-0 night games.
 * Combined >4.10 is hygiene (0–4 in 4.10–4.50). Keep youth (n=6).
 */
export const ACCA_MEDIUM_BTTS_EXCLUDE_SLOT_KEYS: readonly AccaDeskSlotKey[] = ['midnight'];
export const ACCA_MEDIUM_BTTS_ODDS = {
  combinedOddMax: 4.1,
} as const;

/**
 * AccaMediumMix archive: +51.4% / +37.54u (t=2.27). Youth 1–9 (−6.07u),
 * almost all Early U21/II. Combined >4.50 is 0–3. Keep Evening, BTTS stacks,
 * Away 1X2 — do not copy AccaSureMix distinct keys or AccaMediumDC Evening skip.
 */
export const ACCA_MEDIUM_MIX_ODDS = {
  combinedOddMax: 4.1,
} as const;

const MARKET_SPECS: { key: string; label: string; markets: string[] }[] = [
  { key: '1x2', label: '1X2 (Match Winner)', markets: ['match_winner'] },
  { key: 'dc', label: 'Double Chance', markets: ['double_chance'] },
  { key: 'btts', label: 'BTTS (Yes)', markets: ['btts'] },
  { key: 'o25', label: 'Over 2.5 Goals', markets: ['over25'] },
  { key: 'o15', label: 'Over 1.5 Goals', markets: ['over15'] },
  { key: 'u15', label: 'Under 1.5 Goals', markets: ['under15'] },
  { key: 'dnb', label: 'Draw No Bet', markets: ['dnb'] },
  { key: 'fh1x2', label: '1st Half Winner', markets: ['fh_winner'] },
  { key: 'fh005', label: '1st Half Over 0.5', markets: ['fh_over05'] },
  { key: 'fh015', label: '1st Half Over 1.5', markets: ['fh_over15'] },
  { key: 'mix', label: 'Mixed Markets', markets: [...new Set(['over15', ...DEFAULT_ACCA_MARKETS])] },
];

function deskRisksForMarket(marketKey: string): AccaDeskTipsterConfig['riskLevel'][] {
  if (SURE_SAFE_ONLY_MARKET_KEYS.has(marketKey)) return ['sure', 'safe'];
  return RISKS;
}

function extrasForDesk(risk: AccaDeskTipsterConfig['riskLevel'], spec: (typeof MARKET_SPECS)[number]): DeskExtras {
  const extras: DeskExtras = {};
  // AccaSure1X2 and other non-O1.5 AccaSure desks keep generic bands and the full league pool.
  if (spec.key === 'fh1x2') {
    // Free Tip / Board HT winners: skip youth + cups (Bank · Half already stricter).
    if (risk === 'sure' || risk === 'safe') {
      extras.skipAmateurLeagueNames = true;
      extras.skipCupLeagueNames = true;
    }
  }
  if (spec.key === 'fh005') {
    const band = ACCA_FHO05_ODDS_BY_RISK[risk as 'sure' | 'safe'];
    if (band) {
      extras.oddMin = band.oddMin;
      extras.oddMax = band.oddMax;
      extras.targetOdd = band.targetOdd;
      extras.combinedOddMin = band.combinedOddMin;
      extras.combinedOddMax = band.combinedOddMax;
    }
    extras.excludeSlotKeys = ACCA_FHO05_EXCLUDE_SLOT_KEYS;
    extras.skipAmateurLeagueNames = true;
    extras.skipCupLeagueNames = true;
  }
  if (spec.key === 'o15') {
    extras.excludeLeagueApiIds = ACCA_O15_BLACKLIST_LEAGUE_API_IDS;
    const band = ACCA_O15_ODDS_BY_RISK[risk];
    extras.oddMin = band.oddMin;
    extras.oddMax = band.oddMax;
    extras.targetOdd = band.targetOdd;
  }
  if (spec.key === '1x2') {
    extras.excludeSlotKeys = ACCA_1X2_EXCLUDE_SLOT_KEYS;
    if (risk === 'sure') {
      // AccaSure1X2 archive: youth −1.59u; Other +18.2%. Keep away legs + Evening.
      extras.skipAmateurLeagueNames = true;
    }
    if (risk === 'safe') {
      extras.excludeLeagueApiIds = ACCA_1X2_BLACKLIST_LEAGUE_API_IDS;
      extras.oddMin = ACCA_SAFE_1X2_ODDS.oddMin;
      extras.oddMax = ACCA_SAFE_1X2_ODDS.oddMax;
      extras.targetOdd = ACCA_SAFE_1X2_ODDS.targetOdd;
      extras.combinedOddMin = ACCA_SAFE_1X2_ODDS.combinedOddMin;
      extras.combinedOddMax = ACCA_SAFE_1X2_ODDS.combinedOddMax;
      extras.skipAmateurLeagueNames = true;
    }
    if (risk === 'medium') {
      extras.allowedOutcomeKeys = ACCA_MEDIUM_1X2_OUTCOME_KEYS;
      extras.combinedOddMax = ACCA_MEDIUM_1X2_ODDS.combinedOddMax;
      extras.skipAmateurLeagueNames = true;
    }
  }
  if (spec.key === 'dc' && risk === 'sure') {
    extras.excludeLeagueApiIds = ACCA_SURE_DC_BLACKLIST_LEAGUE_API_IDS;
    extras.skipAmateurLeagueNames = true;
    extras.distinctOutcomeKeys = true;
  }
  if (spec.key === 'dc' && risk === 'safe') {
    extras.excludeSlotKeys = ACCA_SAFE_DC_EXCLUDE_SLOT_KEYS;
    extras.skipAmateurLeagueNames = true;
  }
  if (spec.key === 'dc' && risk === 'medium') {
    extras.excludeSlotKeys = ACCA_MEDIUM_DC_EXCLUDE_SLOT_KEYS;
  }
  if (spec.key === 'btts' && risk === 'medium') {
    extras.excludeSlotKeys = ACCA_MEDIUM_BTTS_EXCLUDE_SLOT_KEYS;
    extras.combinedOddMax = ACCA_MEDIUM_BTTS_ODDS.combinedOddMax;
  }
  if (spec.key === 'mix' && risk === 'sure') {
    extras.skipAmateurLeagueNames = true;
    extras.distinctOutcomeKeys = true;
  }
  if (spec.key === 'mix' && risk === 'medium') {
    extras.skipAmateurLeagueNames = true;
    extras.combinedOddMax = ACCA_MEDIUM_MIX_ODDS.combinedOddMax;
  }
  // AccaHighO25 archive: youth 0–3 (−3u); Other alone +39%. Keep High band + all slots.
  if (spec.key === 'o25' && risk === 'high') {
    extras.skipAmateurLeagueNames = true;
  }
  return extras;
}

/** Fixed order: Bank · Half first (claims HT homes), then Sure → Safe → Medium; then High totals. */
export const BANK_HALF_TIPSTER: AccaDeskTipsterConfig = {
  username: BANK_HALF_USERNAME,
  display_name: BANK_HALF_DISPLAY_NAME,
  bio: BANK_HALF_BIO,
  avatar_url: BANK_HALF_AVATAR_URL,
  strategy_id: BANK_HALF_STRATEGY_ID,
  riskLevel: 'safe',
  markets: [...BANK_HALF_MARKETS],
  legs: BANK_HALF_LEGS,
  oddMin: BANK_HALF_LEG_ODD_MIN,
  oddMax: BANK_HALF_LEG_ODD_MAX,
  targetOdd: BANK_HALF_LEG_TARGET_ODD,
  combinedOddMin: BANK_HALF_MIN_COMBINED_ODDS,
  combinedOddMax: BANK_HALF_MAX_COMBINED_ODDS,
  allowedOutcomeKeys: [...BANK_HALF_OUTCOME_KEYS],
  excludeSlotKeys: [...BANK_HALF_EXCLUDE_SLOT_KEYS],
  excludeLeagueApiIds: [...BANK_HALF_BLACKLIST_LEAGUE_API_IDS],
  skipAmateurLeagueNames: BANK_HALF_SKIP_AMATEUR_LEAGUE_NAMES,
  skipCupLeagueNames: BANK_HALF_SKIP_CUP_LEAGUE_NAMES,
  requireHomeScoringForm: BANK_HALF_REQUIRE_HOME_SCORING_FORM,
  maxPerDay: BANK_HALF_MAX_COUPONS_PER_DAY,
};

export const ACCA_DESK_TIPSTERS: AccaDeskTipsterConfig[] = [
  BANK_HALF_TIPSTER,
  ...RISKS.flatMap((risk) =>
    MARKET_SPECS.filter((m) => deskRisksForMarket(m.key).includes(risk)).map((m) =>
      desk(risk, m.key, m.label, m.markets, extrasForDesk(risk, m)),
    ),
  ),
  ...MARKET_SPECS.filter((m) => HIGH_MARKET_KEYS.has(m.key)).map((m) =>
    desk('high', m.key, m.label, m.markets, extrasForDesk('high', m)),
  ),
];

export const ACCA_DESK_TIPSTER_TYPE = 'acca_desk';
export const ACCA_DESK_LEGS = 2 as const;
export { ACCA_DESK_EARLY_SLOT_KEYS, ACCA_DESK_MAX_PER_DAY, ACCA_DESK_TIME_SLOTS } from './acca-desk-slots';

/**
 * Paused desks skip publish + show inactive on setup; marketplace/public lists hide them.
 * Do not add AccaSure1X2, VipTwoFold, AccaSafeFH1X2, AccaMediumBTTS, AccaHighO25,
 * BankHalf, AccaSureFHO05, or AccaSafeFHO05 here.
 * Archive-losing desks stay paused until a new sample earns them back.
 */
export const ACCA_DESK_PAUSED_USERNAMES = new Set<string>([
  'AccaSureO25',
  'AccaSureBTTS',
  'AccaSafeO25',
  'AccaMediumO25',
  'AccaSafeBTTS',
  // Short Over 1.5 + High totals that blanked on the public board
  'AccaSureO15',
  'AccaHighU15',
  'AccaHighFHO15',
  'AccaHighO15',
  // Medium exact-winner / DC desks deep in the red
  'AccaMedium1X2',
  'AccaMediumDC',
  'AccaMediumFH1X2',
]);

export function isAccaDeskPublishingPaused(username: string): boolean {
  return ACCA_DESK_PAUSED_USERNAMES.has(username);
}

export function accaDeskPausedUsernames(): string[] {
  return [...ACCA_DESK_PAUSED_USERNAMES];
}

/** TypeORM QB. Bind `:...accaDeskPaused` to `accaDeskPausedUsernames()`. */
export function accaDeskPausedPublicExcludeSql(tipsterAlias = 't'): string {
  return `${tipsterAlias}.username NOT IN (:...accaDeskPaused)`;
}

/** Raw SQL. Usernames are compile-time constants from the pause set. */
export function accaDeskPausedPublicExcludeRawSql(tipsterAlias = 't'): string {
  const names = accaDeskPausedUsernames();
  if (names.length === 0) return 'TRUE';
  const list = names.map((n) => `'${n.replace(/'/g, "''")}'`).join(', ');
  return `${tipsterAlias}.username NOT IN (${list})`;
}

/** Hide paused Acca desk marketplace tickets (ticket owner = tipster user_id). */
export function accaDeskPausedMarketplaceTicketExcludeRawSql(ticketAlias = 't'): string {
  const names = accaDeskPausedUsernames();
  if (names.length === 0) return 'TRUE';
  const list = names.map((n) => `'${n.replace(/'/g, "''")}'`).join(', ');
  return `NOT EXISTS (
    SELECT 1 FROM tipsters paused_acca
    WHERE paused_acca.user_id = ${ticketAlias}.user_id
      AND paused_acca.username IN (${list})
  )`;
}

/** Cron: 00:30 Africa/Accra — catch-up for today’s desk day after midnight. */
export const ACCA_DESK_DAILY_CRON = process.env.ACCA_DESK_DAILY_CRON || '30 0 * * *';

/** Cron: 20:10 Africa/Accra — tomorrow’s desk, after VIP Home+Home at 20:00. */
export const ACCA_DESK_EARLY_CRON = process.env.ACCA_DESK_EARLY_CRON || '10 20 * * *';

export function isAccaDeskEnabled(): boolean {
  const raw = (process.env.ACCA_DESK_ENABLED || 'true').toLowerCase().trim();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}

export function isAccaDeskEarlyPublishEnabled(): boolean {
  const raw = (process.env.ACCA_DESK_EARLY_ENABLED || 'true').toLowerCase().trim();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}
