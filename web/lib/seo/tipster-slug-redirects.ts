/**
 * Old tipster URL usernames that 301 to a new slug (see next.config.js + tipster layout).
 * Keep redirect *sources* out of the sitemap so crawlers do not index them.
 * Do not invent the destination username here — only list what the API already returns.
 */
export const TIPSTER_SLUG_REDIRECTS: Record<string, string> = {
  latebloomer: 'midweek-value',
  homeheroes: 'home-win-daily',
  viptwofold: 'SureTwoFold',
  twofold: 'SureTwoFold',
  accasuretwofold: 'SureTwoFold',
};

/** True when this username is a legacy URL that should not appear in the sitemap. */
export function isRedirectedTipsterUsername(username: string): boolean {
  return Boolean(TIPSTER_SLUG_REDIRECTS[(username || '').trim().toLowerCase()]);
}
