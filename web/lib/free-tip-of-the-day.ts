import { FOOTBALL_SPORT_KEY, isFootballOnlyDiscovery } from '@/lib/football-only-discovery';

export const FREE_TIP_OF_THE_DAY_LIMIT = 4;

export function freeTipOfTheDayQuery(limit = FREE_TIP_OF_THE_DAY_LIMIT): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (isFootballOnlyDiscovery()) params.set('sport', FOOTBALL_SPORT_KEY);
  return params.toString();
}

export function parseFreeTipItems<T extends { id: unknown } = Record<string, unknown> & { id: unknown }>(
  data: unknown,
): T[] {
  if (!data || typeof data !== 'object') return [];
  const items = (data as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.filter(
    (item): item is T => !!item && typeof item === 'object' && 'id' in item,
  ) as T[];
}
