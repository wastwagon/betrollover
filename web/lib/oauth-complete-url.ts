import type { NextRequest } from 'next/server';
import { getRedirectBase } from '@/lib/google-auth-exchange';

/** After OAuth, land on /login so session cookie → localStorage exchange always runs once. */
export function buildOAuthCompleteLoginUrl(
  request: NextRequest,
  redirectPath?: string | null,
): URL {
  const base = getRedirectBase(request);
  const url = new URL('/login', base);
  url.searchParams.set('oauth', '1');
  if (typeof redirectPath === 'string' && redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
    url.searchParams.set('redirect', redirectPath.slice(0, 512));
  }
  return url;
}
