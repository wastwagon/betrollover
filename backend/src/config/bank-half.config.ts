/**
 * Bank · Half — admin staking 2-fold (first-half home wins only).
 *
 * Archive basis: AccaSafeFH1X2 legs — HT Home @ 1.40–1.59 went 14–2;
 * HT Away @ 1.60–1.69 went 0–2. Combined slips around 2.40 returned +72% on 18
 * picks (pilot sample — treat as rules, not a locked edge).
 *
 * Shape: two HT Home legs @ 1.47–1.60, combined 2.20–2.50. One slip per desk day.
 * Skip the day when no pair exists. No youth, cups, or Midnight.
 */

import type { AccaDeskSlotKey } from './acca-desk-slots';
import { VIP_BLACKLIST_LEAGUE_API_IDS } from './vip-tipster.config';

export const BANK_HALF_USERNAME = 'BankHalf';
export const BANK_HALF_DISPLAY_NAME = 'Bank · Half';
export const BANK_HALF_STRATEGY_ID = 'bank_half_ht_home';

export const BANK_HALF_BIO =
  'Bank · Half: two first-half Home wins (1.47–1.60). Combined 2.20–2.50. One 2-fold a day when a senior-league pair exists — no cups, no youth. Educational — not guaranteed. 18+.';

/** Reuse Safe FH1X2 art until a dedicated avatar ships. */
export const BANK_HALF_AVATAR_URL = '/avatars/acca_safe_fh1x2.png?v=2';

export const BANK_HALF_LEGS = 2 as const;
export const BANK_HALF_MARKETS = ['fh_winner'] as const;
export const BANK_HALF_OUTCOME_KEYS = ['ht_home'] as const;

/** Per-leg band — skips the 1.40–1.46 short homes and the 1.61+ away-leaking zone. */
export const BANK_HALF_LEG_ODD_MIN = 1.47;
export const BANK_HALF_LEG_ODD_MAX = 1.6;
export const BANK_HALF_LEG_TARGET_ODD = 1.54;

export const BANK_HALF_MIN_COMBINED_ODDS = 2.2;
export const BANK_HALF_MAX_COMBINED_ODDS = 2.5;

/** One slip per Accra desk day. Empty day is correct. */
export const BANK_HALF_MAX_COUPONS_PER_DAY = 1;

/** Midnight shorts blank too often on HT markets. */
export const BANK_HALF_EXCLUDE_SLOT_KEYS: readonly AccaDeskSlotKey[] = ['midnight'];

export const BANK_HALF_SKIP_AMATEUR_LEAGUE_NAMES = true;
export const BANK_HALF_SKIP_CUP_LEAGUE_NAMES = true;

/**
 * Require the backed home side scored in its last FT/AET/PEN match, and did not
 * lose that match by 4+ goals. No history → allow (pool stays usable).
 */
export const BANK_HALF_REQUIRE_HOME_SCORING_FORM = true;

/** Same Latvia Home shorts that fail VIP / Sure. */
export const BANK_HALF_BLACKLIST_LEAGUE_API_IDS = [...VIP_BLACKLIST_LEAGUE_API_IDS] as const;
