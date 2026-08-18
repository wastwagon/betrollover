/**
 * Public 30-day educational rollover — Acca Desk Sure · Over 1.5 only.
 * One 2-fold per calendar day (Africa/Accra). Not a bookmaker payout.
 */

import { ACCA_DESK_TIME_SLOTS, type AccaDeskSlotKey } from './acca-desk-slots';

/** Existing Acca Desk tipster: Sure · Over 1.5 Goals. Do not create a new account. */
export const ROLLOVER_OWNER_USERNAME = 'AccaSureO15';

export const ROLLOVER_PLAN_DAYS = 30;
export const ROLLOVER_TARGET_ODDS = 1.6;
export const ROLLOVER_ODDS_MIN = 1.5;
export const ROLLOVER_ODDS_MAX = 1.75;
export const ROLLOVER_EXAMPLE_STAKE_GHS = 20;
/** Later plan days would show billions at 1.60^n — hide cash figures after this day. */
export const ROLLOVER_EXAMPLE_MAX_MONEY_DAY = 7;
export const ROLLOVER_TIMEZONE = process.env.PREDICTION_TIMEZONE || 'Africa/Accra';

export const ROLLOVER_SLOT_ORDER: AccaDeskSlotKey[] = ACCA_DESK_TIME_SLOTS.map((s) => s.key);

export type RolloverRunStatus = 'active' | 'completed' | 'broken';
export type RolloverDayStatus = 'pending' | 'won' | 'lost' | 'void' | 'skipped';
