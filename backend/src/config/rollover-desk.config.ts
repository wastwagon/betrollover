/**
 * Public 10-day educational rollover — Acca Desk Sure · 1X2 (AccaSure1X2) only.
 * One 2-fold per plan day. Admin attaches manually — no auto-attach, no odds gate.
 * Acca Desk may still publish AccaSure1X2 to the marketplace; rollover pins are separate.
 * Not a payout.
 */

import { ACCA_DESK_TIME_SLOTS, type AccaDeskSlotKey } from './acca-desk-slots';

/** Existing Acca Desk tipster: Sure · 1X2 (Match Winner). Do not create a new account. */
export const ROLLOVER_OWNER_USERNAME = 'AccaSure1X2';

export const ROLLOVER_OWNER_DISPLAY_FALLBACK = 'Sure · 1X2 (Match Winner)';

export const ROLLOVER_PLAN_DAYS = 10;
/** Example-money multiplier for empty / future days (typical AccaSure1X2 band ~1.6+). */
export const ROLLOVER_TARGET_ODDS = 1.6;
/** Public board starting example stake (GHS). */
export const ROLLOVER_EXAMPLE_STAKE_GHS = 100;
/** Show cash figures for every plan day (10 × 1.6 from 100 stays readable). */
export const ROLLOVER_EXAMPLE_MAX_MONEY_DAY = ROLLOVER_PLAN_DAYS;
export const ROLLOVER_TIMEZONE = process.env.PREDICTION_TIMEZONE || 'Africa/Accra';

export const ROLLOVER_SLOT_ORDER: AccaDeskSlotKey[] = ACCA_DESK_TIME_SLOTS.map((s) => s.key);
