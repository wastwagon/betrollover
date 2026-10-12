/**
 * Free two-fold desk — Home+Home only, separate from Acca Desk.
 *
 * Same Acca Desk kick-off windows (Early / Afternoon / Evening / Midnight).
 * Tomorrow’s 20:00 pass only fills Early + Afternoon so Evening cannot eat the 2/day cap.
 * Publishes first so Acca Desk can still mix leftover fixtures.
 * Construction is unchanged: two Home wins @ 1.20–1.40, combined 1.50–1.99.
 * This tipster is free. The VIP plan is the roster in vip-roster.config.ts.
 */

export const VIP_TIPSTER_TYPE = 'vip_desk';

/**
 * Earlier usernames. Setup renames the row in place so history stays on the same account.
 * SureTwoFold is the free Sure-family desk. It is not an Acca Desk persona (those are AccaSure*).
 */
export const FORMER_FREE_DESK_USERNAMES = ['VipTwoFold', 'TwoFold', 'AccaSureTwoFold'] as const;

export const VIP_TIPSTER = {
  username: 'SureTwoFold',
  display_name: 'Sure · Two-Fold',
  bio: 'Sure · Two-Fold: two Home wins (about 1.20–1.40). Combined 1.50–1.99. Up to two free slips a day when clustered homes exist. Educational — not guaranteed. 18+.',
  avatar_url: '/avatars/acca_sure_1x2.png?v=2',
  strategy_id: 'vip_desk_two_fold',
  legs: 2 as const,
};

export const VIP_PACKAGE_NAME = 'VIP Monthly';
export const VIP_PACKAGE_PRICE = 300;
export const VIP_PACKAGE_DURATION_DAYS = 30;

/** Per-leg band matches Acca Sure 1X2. Combined 1.50–1.99 rejects two 1.20s. */
export const VIP_LEG_ODD_MIN = 1.2;
export const VIP_LEG_ODD_MAX = 1.4;
export const VIP_LEG_TARGET_ODD = 1.28;
export const VIP_MIN_COMBINED_ODDS = 1.5;
export const VIP_MAX_COMBINED_ODDS = 1.99;

/** Max published VIP 2-folds per desk day. */
export const VIP_MAX_COUPONS_PER_DAY = 2;

/**
 * Skip amateur / youth / reserve league names and U23/II sides.
 * Same hygiene as AccaSure1X2 — short Home favorites in youth pools blank often.
 */
export const VIP_SKIP_AMATEUR_LEAGUE_NAMES = true;

/**
 * Latvia Virsliga / 1. Liga / Super Cup — 0/4 on archive Home+Home shorts.
 * No whitelist: AccaSure1X2 uses the full enabled-league pool.
 */
export const VIP_BLACKLIST_LEAGUE_API_IDS = [364, 365, 1176] as const;

export type VipConstructionKey = 'home_win';

export const VIP_CONSTRUCTIONS: {
  key: VipConstructionKey;
  label: string;
  outcomeKeys: readonly string[];
}[] = [
  {
    key: 'home_win',
    label: 'Home win',
    outcomeKeys: ['home'],
  },
];

export function isVipTipsterEnabled(): boolean {
  const raw = (process.env.VIP_TIPSTER_ENABLED || 'true').toLowerCase().trim();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}

/** 00:20 Accra — today’s catch-up, before Acca Desk 00:30. */
export const VIP_TIPSTER_DAILY_CRON = process.env.VIP_TIPSTER_DAILY_CRON || '20 0 * * *';
/** 20:00 Accra — tomorrow’s board, before Acca Desk 20:10. */
export const VIP_TIPSTER_EARLY_CRON = process.env.VIP_TIPSTER_EARLY_CRON || '0 20 * * *';

export function isVipAllowedLeagueApiId(apiId: number | null | undefined): boolean {
  if (apiId == null || !Number.isFinite(apiId)) return false;
  return !(VIP_BLACKLIST_LEAGUE_API_IDS as readonly number[]).includes(apiId);
}
