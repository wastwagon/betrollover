/**
 * Access swap only. Each tipster keeps its own selection rules.
 *
 * VIP plan (one package, one Telegram) is AccaSure1X2 only (Sure · 1X2).
 * AccaSure1X2 owns the package and the 7-day rollover board.
 * Free Sure · Two-Fold (SureTwoFold / tipster_type vip_desk) is NOT on this roster.
 * TheAnalyst / LateBloomer were removed from VIP — pending slips are ungated on setup.
 * SureTwoFold keeps Home+Home rules and is the free public tipster.
 */

export const VIP_ROSTER_USERNAMES = ['AccaSure1X2'] as const;

/** Former VIP roster — setup ungates their pending subscription-linked slips. */
export const FORMER_VIP_ROSTER_USERNAMES = ['TheAnalyst', 'LateBloomer'] as const;

/** Package owner. A subscription here unlocks live VIP slips for the roster. */
export const VIP_PACKAGE_OWNER_USERNAME = 'AccaSure1X2';

export function isVipRosterUsername(username?: string | null): boolean {
  const u = (username || '').trim().toLowerCase();
  if (!u) return false;
  return VIP_ROSTER_USERNAMES.some((name) => name.toLowerCase() === u);
}

/** Safe to embed: values are fixed constants, not user input. */
export function vipRosterUsernameSqlList(): string {
  return VIP_ROSTER_USERNAMES.map((u) => `'${u.toLowerCase()}'`).join(', ');
}
