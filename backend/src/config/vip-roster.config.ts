/**
 * Access swap only. Each tipster keeps its own selection rules.
 *
 * VIP plan (one package, one Telegram) is worked by three tipsters:
 * TheAnalyst, LateBloomer, and AccaSure1X2.
 * AccaSure1X2 owns the package and the 2-day rollover board.
 * SureTwoFold keeps Home+Home rules and is the free public tipster.
 */

export const VIP_ROSTER_USERNAMES = ['TheAnalyst', 'LateBloomer', 'AccaSure1X2'] as const;

/** Package owner. A subscription here unlocks live slips for the whole roster. */
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
