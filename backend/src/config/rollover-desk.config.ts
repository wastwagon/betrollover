/**
 * Public 15-day educational rollover — Acca Desk Sure · 1X2 (AccaSure1X2) only.
 * One 2-fold per plan day. Admin attaches manually — no auto-attach, no odds gate.
 * Acca Desk may still publish AccaSure1X2 to the marketplace; rollover pins are separate.
 * Not a payout.
 */

import { ACCA_DESK_TIME_SLOTS, type AccaDeskSlotKey } from './acca-desk-slots';

/** Existing Acca Desk tipster: Sure · 1X2 (Match Winner). Do not create a new account. */
export const ROLLOVER_OWNER_USERNAME = 'AccaSure1X2';

export const ROLLOVER_OWNER_DISPLAY_FALLBACK = 'Sure · 1X2 (Match Winner)';

export const ROLLOVER_PLAN_DAYS = 15;
/** Example-money multiplier only (not an attach rule). */
export const ROLLOVER_TARGET_ODDS = 2.0;
export const ROLLOVER_EXAMPLE_STAKE_GHS = 20;
/** Later plan days would show huge cash at target^n — hide figures after this day. */
export const ROLLOVER_EXAMPLE_MAX_MONEY_DAY = 7;
export const ROLLOVER_TIMEZONE = process.env.PREDICTION_TIMEZONE || 'Africa/Accra';

export const ROLLOVER_SLOT_ORDER: AccaDeskSlotKey[] = ACCA_DESK_TIME_SLOTS.map((s) => s.key);
