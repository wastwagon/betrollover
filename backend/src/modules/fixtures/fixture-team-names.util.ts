/** True when sync stored API-Sports missing-team fallbacks instead of real clubs. */
export function isPlaceholderTeamNames(home: string | null | undefined, away: string | null | undefined): boolean {
  return (home ?? '').trim() === 'Home' && (away ?? '').trim() === 'Away';
}

/** Extract team names from API response - handles various response structures */
export function extractTeamNames(item: any): { home: string; away: string } {
  const home =
    item?.teams?.home?.name ??
    item?.teams?.home?.team?.name ??
    item?.fixture?.teams?.home?.name ??
    '';
  const away =
    item?.teams?.away?.name ??
    item?.teams?.away?.team?.name ??
    item?.fixture?.teams?.away?.name ??
    '';
  return {
    home: typeof home === 'string' && home.trim() ? home.trim() : 'Home',
    away: typeof away === 'string' && away.trim() ? away.trim() : 'Away',
  };
}
