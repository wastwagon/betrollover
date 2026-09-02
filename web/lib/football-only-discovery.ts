/**
 * Football-only discovery mode.
 *
 * When enabled, public marketplace / tipster / create-pick / SEO surfaces hide
 * multi-sport so we don't advertise sports we can't support yet.
 *
 * Set NEXT_PUBLIC_FOOTBALL_ONLY_DISCOVERY=false (or FOOTBALL_ONLY_DISCOVERY=false)
 * to re-enable multi-sport discovery after API access is funded.
 *
 * Default: true (football-only).
 */

function parseFlag(raw: string | undefined): boolean | null {
  if (raw === undefined || raw === '') return null;
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return null;
}

/** True when multi-sport discovery/SEO should be hidden. */
export function isFootballOnlyDiscovery(): boolean {
  const publicFlag = parseFlag(process.env.NEXT_PUBLIC_FOOTBALL_ONLY_DISCOVERY);
  if (publicFlag !== null) return publicFlag;
  const serverFlag = parseFlag(process.env.FOOTBALL_ONLY_DISCOVERY);
  if (serverFlag !== null) return serverFlag;
  return true;
}

export const FOOTBALL_SPORT_KEY = 'football' as const;

/** Non-football sport keys commonly used in filters / hubs. */
export const MULTISPORT_KEYS = [
  'basketball',
  'rugby',
  'mma',
  'volleyball',
  'hockey',
  'american_football',
  'tennis',
  'multi',
  'multi-sport',
] as const;

export function isMultisportKey(sport: string | null | undefined): boolean {
  if (!sport) return false;
  const s = sport.toLowerCase().trim();
  if (s === FOOTBALL_SPORT_KEY || s === 'all' || s === '') return false;
  return (MULTISPORT_KEYS as readonly string[]).includes(s) || s.includes('multi');
}

/** Keep football (+ optional empty/"all") for discovery filters. */
export function filterDiscoverySports<T extends string>(sports: readonly T[]): T[] {
  if (!isFootballOnlyDiscovery()) return [...sports];
  return sports.filter((s) => {
    const key = String(s).toLowerCase();
    return key === '' || key === 'all' || key === FOOTBALL_SPORT_KEY;
  });
}

/** Marketplace/list row: hide non-football coupons while discovery is football-only. */
export function isDiscoverySportAllowed(sport: string | null | undefined): boolean {
  if (!isFootballOnlyDiscovery()) return true;
  if (sport == null || sport === '') return true; // legacy / unset treated as football-era picks
  const s = sport.toLowerCase().trim();
  return s === FOOTBALL_SPORT_KEY || s === 'soccer';
}

/** Platform rooms plus football. Extra sport rooms stay hidden while discovery is football-only. */
export const FOOTBALL_ONLY_CHAT_SLUGS = ['announcements', 'general', 'football'] as const;

export function isDiscoveryChatRoomAllowed(slug: string | null | undefined): boolean {
  if (!isFootballOnlyDiscovery()) return true;
  if (!slug) return false;
  return (FOOTBALL_ONLY_CHAT_SLUGS as readonly string[]).includes(slug);
}

export function filterDiscoveryChatRooms<T extends { slug: string }>(rooms: T[]): T[] {
  if (!isFootballOnlyDiscovery()) return rooms;
  return rooms.filter((r) => isDiscoveryChatRoomAllowed(r.slug));
}
