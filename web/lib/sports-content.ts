/**
 * Shared sport keys/icons for content pages (discover, news, resources).
 * Keep in sync with backend `SPORT_TYPES` in sports.config.ts.
 */
import { filterDiscoverySports } from '@/lib/football-only-discovery';

export const CONTENT_SPORT_KEYS_ALL = [
  '',
  'football',
  'basketball',
  'rugby',
  'mma',
  'volleyball',
  'hockey',
  'american_football',
  'tennis',
] as const;

export type ContentSport = (typeof CONTENT_SPORT_KEYS_ALL)[number];

export type ContentSportFilter = Exclude<ContentSport, ''>;

/** Public discovery filters — football-only when FOOTBALL_ONLY_DISCOVERY is on. */
export const CONTENT_SPORT_KEYS = filterDiscoverySports([
  ...CONTENT_SPORT_KEYS_ALL,
]) as ContentSport[];

export const SPORT_ICONS: Record<ContentSport, string> = {
  '': '🌍',
  football: '⚽',
  basketball: '🏀',
  rugby: '🏉',
  mma: '🥊',
  volleyball: '🏐',
  hockey: '🏒',
  american_football: '🏈',
  tennis: '🎾',
};

export const SPORT_META: Record<
  ContentSportFilter,
  { icon: string; label: string; color?: string }
> = {
  football: { icon: '⚽', label: 'Football', color: 'text-emerald-400' },
  basketball: { icon: '🏀', label: 'Basketball', color: 'text-orange-400' },
  rugby: { icon: '🏉', label: 'Rugby', color: 'text-amber-400' },
  mma: { icon: '🥊', label: 'MMA', color: 'text-red-400' },
  volleyball: { icon: '🏐', label: 'Volleyball', color: 'text-blue-400' },
  hockey: { icon: '🏒', label: 'Hockey', color: 'text-cyan-400' },
  american_football: { icon: '🏈', label: 'Amer. Football', color: 'text-purple-400' },
  tennis: { icon: '🎾', label: 'Tennis', color: 'text-yellow-400' },
};

/** Admin + forms: sport tag options (empty = all sports / universal). */
export const SPORT_TAG_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All sports (universal)' },
  ...CONTENT_SPORT_KEYS_ALL.filter((k): k is ContentSportFilter => k !== '').map((k) => ({
    value: k,
    label: SPORT_META[k].label,
  })),
];

export function getContentSportLabel(
  t: (key: string) => string,
  key: ContentSport,
): string {
  if (!key) return t('discover.filter_all');
  return t(`create_pick.sport_${key}` as 'create_pick.sport_football');
}

export const NEWS_SPORT_OPTIONS = CONTENT_SPORT_KEYS_ALL.filter(
  (k): k is ContentSportFilter => k !== '',
).map((k) => ({
  value: k,
  label: SPORT_META[k].label,
}));

export function isContentSportFilter(value: string): value is ContentSportFilter {
  return value !== '' && (CONTENT_SPORT_KEYS_ALL as readonly string[]).includes(value);
}
