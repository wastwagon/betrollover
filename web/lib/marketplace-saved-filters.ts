/**
 * Persist marketplace filter presets in localStorage.
 */

export type MarketplaceSavedFilter = {
  id: string;
  name: string;
  createdAt: number;
  desk: 'all' | 'acca_desk' | 'community';
  priceFilter: 'all' | 'free' | 'paid' | 'sold';
  sortBy: 'newest' | 'price-low' | 'price-high' | 'tipster-rank' | 'following-only' | 'relevance';
  tipsterSearch: string;
  sport: string;
};

const STORAGE_KEY = 'br_marketplace_saved_filters_v1';
const MAX_SAVED = 6;

function readAll(): MarketplaceSavedFilter[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x.id === 'string' && typeof x.name === 'string');
  } catch {
    return [];
  }
}

function writeAll(list: MarketplaceSavedFilter[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
  } catch {
    /* ignore */
  }
}

export function listMarketplaceSavedFilters(): MarketplaceSavedFilter[] {
  return readAll();
}

export function saveMarketplaceFilter(
  input: Omit<MarketplaceSavedFilter, 'id' | 'createdAt'> & { name: string },
): MarketplaceSavedFilter[] {
  const next: MarketplaceSavedFilter = {
    ...input,
    id: `sf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    name: input.name.trim().slice(0, 40) || 'Saved',
  };
  const list = [next, ...readAll().filter((f) => f.name !== next.name)].slice(0, MAX_SAVED);
  writeAll(list);
  return list;
}

export function deleteMarketplaceSavedFilter(id: string): MarketplaceSavedFilter[] {
  const list = readAll().filter((f) => f.id !== id);
  writeAll(list);
  return list;
}
