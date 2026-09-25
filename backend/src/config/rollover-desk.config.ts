/**
 * Public 2-day educational rollover — VIP · Two-Fold (VipTwoFold) only.
 * One 2-fold per plan day. Win Day 1 → roll to Day 2; win Day 2 → harvest & new cycle at Day 1.
 * Loss cuts the run and starts Day 1. Auto-attaches after VIP publish; admin can still attach manually.
 * Live tips stay subscription-gated (same as marketplace). Settled tips are public.
 * Not a payout.
 */

import { ACCA_DESK_TIME_SLOTS, type AccaDeskSlotKey } from './acca-desk-slots';
import { VIP_TIPSTER } from './vip-tipster.config';

/** Rollover board owner — existing VIP desk tipster. Do not create a new account. */
export const ROLLOVER_OWNER_USERNAME = VIP_TIPSTER.username;

export const ROLLOVER_OWNER_DISPLAY_FALLBACK = VIP_TIPSTER.display_name;

/**
 * AccaSure1X2 stays on the free public Telegram channel.
 * Do not reuse ROLLOVER_OWNER for channel allowlist — VIP must not post there.
 */
export const PUBLIC_CHANNEL_SURE_USERNAME = 'AccaSure1X2';

/** Plan length: Day 1 stake → Day 2 roll → finish / take-profit example → restart. */
export const ROLLOVER_PLAN_DAYS = 2;
/** Example-money multiplier for empty / future days (VIP combined band ~1.50–1.99). */
export const ROLLOVER_TARGET_ODDS = 1.6;
/** Public board starting example stake (GHS). */
export const ROLLOVER_EXAMPLE_STAKE_GHS = 100;
/** Show cash figures for every plan day. */
export const ROLLOVER_EXAMPLE_MAX_MONEY_DAY = ROLLOVER_PLAN_DAYS;
export const ROLLOVER_TIMEZONE = process.env.PREDICTION_TIMEZONE || 'Africa/Accra';

/** VIP can publish every Acca Desk window, including Midnight. */
export const ROLLOVER_SLOT_ORDER: AccaDeskSlotKey[] = ACCA_DESK_TIME_SLOTS.map((s) => s.key);
