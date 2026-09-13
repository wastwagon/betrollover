/**
 * VIP two-fold tipster — archive-backed product, separate from Acca Desk.
 *
 * One named bot, 1–2 subscription coupons per desk day.
 * Constructions: Home or Draw + Home or Draw, else Brazil Serie A/B Over 1.5.
 */

export const VIP_TIPSTER_TYPE = 'vip_desk';

export const VIP_TIPSTER = {
  username: 'VipTwoFold',
  display_name: 'VIP · Two-Fold',
  bio: 'Archive-backed VIP 2-folds: Home or Draw (about 1.42–1.70) or Brazil Over 1.5. Combined 2.20–2.80. Up to two slips a day. Educational — not guaranteed. 18+.',
  avatar_url: '/avatars/acca_safe_dc.png?v=2',
  strategy_id: 'vip_desk_two_fold',
  legs: 2 as const,
};

export const VIP_PACKAGE_NAME = 'VIP · Two-Fold Monthly';
export const VIP_PACKAGE_PRICE = 300;
export const VIP_PACKAGE_DURATION_DAYS = 30;

/** Per-leg band. Combined 2.20–2.80 still rejects stacked shorts or two 1.70s. */
export const VIP_LEG_ODD_MIN = 1.42;
export const VIP_LEG_ODD_MAX = 1.7;
export const VIP_LEG_TARGET_ODD = 1.55;
export const VIP_MIN_COMBINED_ODDS = 2.2;
export const VIP_MAX_COMBINED_ODDS = 2.8;

export const VIP_MAX_COUPONS_PER_DAY = 2;

/** API-Football league ids — Brazil Serie A/B, Championship, Italy Serie A, Liga Alef, USL Championship. */
export const VIP_WHITELIST_LEAGUE_API_IDS = [71, 72, 40, 135, 496, 254, 255] as const;

/** Brazil Serie A + Serie B only (Over 1.5 construction). */
export const VIP_BRAZIL_LEAGUE_API_IDS = [71, 72] as const;

/** Argentina Liga Profesional, MLS, USL League One, Egypt Second League. */
export const VIP_BLACKLIST_LEAGUE_API_IDS = [128, 253, 489, 887] as const;

/** Do not pair two Championship legs (England same-country doubles lost in archive). */
export const VIP_REJECT_SAME_LEAGUE_API_IDS = [40] as const;

export type VipConstructionKey = 'home_draw' | 'brazil_over15';

export const VIP_CONSTRUCTIONS: {
  key: VipConstructionKey;
  label: string;
  outcomeKeys: readonly string[];
  leagueApiIds: readonly number[];
}[] = [
  {
    key: 'home_draw',
    label: 'Home or Draw',
    outcomeKeys: ['home_draw'],
    leagueApiIds: VIP_WHITELIST_LEAGUE_API_IDS,
  },
  {
    key: 'brazil_over15',
    label: 'Brazil Over 1.5',
    outcomeKeys: ['over15'],
    leagueApiIds: VIP_BRAZIL_LEAGUE_API_IDS,
  },
];

export function isVipTipsterEnabled(): boolean {
  const raw = (process.env.VIP_TIPSTER_ENABLED || 'true').toLowerCase().trim();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}

export const VIP_TIPSTER_DAILY_CRON = process.env.VIP_TIPSTER_DAILY_CRON || '45 8 * * *';
export const VIP_TIPSTER_EARLY_CRON = process.env.VIP_TIPSTER_EARLY_CRON || '5 20 * * *';

export function isVipAllowedLeagueApiId(apiId: number | null | undefined): boolean {
  if (apiId == null || !Number.isFinite(apiId)) return false;
  if ((VIP_BLACKLIST_LEAGUE_API_IDS as readonly number[]).includes(apiId)) return false;
  return (VIP_WHITELIST_LEAGUE_API_IDS as readonly number[]).includes(apiId);
}

export function isVipBrazilOver15League(apiId: number | null | undefined): boolean {
  if (apiId == null || !Number.isFinite(apiId)) return false;
  return (VIP_BRAZIL_LEAGUE_API_IDS as readonly number[]).includes(apiId);
}
