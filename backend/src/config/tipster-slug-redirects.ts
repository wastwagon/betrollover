/**
 * Tipster URL / username renames for SEO: display name and slug must match.
 * Old usernames keep 301 redirects and are resolved by the tipster API.
 */
export type TipsterSlugRedirect = {
  oldUsername: string;
  newUsername: string;
  displayName: string;
};

/** Human-readable AI tipster slugs (hyphenated, lowercase). */
export const TIPSTER_SLUG_REDIRECTS: readonly TipsterSlugRedirect[] = [
  {
    oldUsername: 'LateBloomer',
    newUsername: 'midweek-value',
    displayName: 'Midweek Away Tips',
  },
  {
    oldUsername: 'HomeHeroes',
    newUsername: 'home-win-daily',
    displayName: 'Home Win Daily',
  },
] as const;

const byOld = new Map(
  TIPSTER_SLUG_REDIRECTS.map((r) => [r.oldUsername.toLowerCase(), r] as const),
);
const byNew = new Map(
  TIPSTER_SLUG_REDIRECTS.map((r) => [r.newUsername.toLowerCase(), r] as const),
);

export function tipsterSlugRedirectFromOld(username: string | null | undefined): TipsterSlugRedirect | null {
  const key = (username || '').trim().toLowerCase();
  if (!key) return null;
  return byOld.get(key) ?? null;
}

export function tipsterSlugRedirectFromNew(username: string | null | undefined): TipsterSlugRedirect | null {
  const key = (username || '').trim().toLowerCase();
  if (!key) return null;
  return byNew.get(key) ?? null;
}

/** Resolve a path/API username to the canonical (new) username when known. */
export function canonicalizeTipsterUsername(username: string | null | undefined): string {
  const raw = (username || '').trim();
  if (!raw) return raw;
  const fromOld = tipsterSlugRedirectFromOld(raw);
  if (fromOld) return fromOld.newUsername;
  return raw;
}
