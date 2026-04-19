import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getRedirectBase,
  GOOGLE_OAUTH_STATE_COOKIE,
} from '@/lib/google-auth-exchange';

const GOOGLE_OAUTH_NEXT_COOKIE = 'google_oauth_next';

function cookieOpts(request: NextRequest) {
  const secure = request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production';
  return {
    httpOnly: true as const,
    secure,
    sameSite: 'lax' as const,
    maxAge: 600,
    path: '/',
  };
}

/**
 * Starts Google OAuth (authorization code) for environments where GIS `renderButton`
 * does not work (embedded WebViews). Requires `GOOGLE_CLIENT_SECRET` on the **web** server
 * and redirect URI `https://<your-domain>/api/auth/google/callback` in Google Cloud Console.
 */
export async function GET(request: NextRequest) {
  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const base = getRedirectBase(request);
  const loginUrl = new URL('/login', base);

  if (!clientId || !clientSecret) {
    loginUrl.searchParams.set(
      'error',
      'Google web sign-in redirect is not configured. Add GOOGLE_CLIENT_SECRET to the web service and register the redirect URI in Google Cloud Console.',
    );
    return NextResponse.redirect(loginUrl, 302);
  }

  const redirectUri = `${base}/api/auth/google/callback`;
  const state = crypto.randomBytes(24).toString('hex');
  const nextRaw = new URL(request.url).searchParams.get('next');
  const next =
    typeof nextRaw === 'string' && nextRaw.startsWith('/') && !nextRaw.startsWith('//')
      ? nextRaw.slice(0, 512)
      : null;

  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'offline',
  });
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;

  const response = NextResponse.redirect(googleAuthUrl, 302);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, cookieOpts(request));
  if (next) {
    response.cookies.set(GOOGLE_OAUTH_NEXT_COOKIE, next, cookieOpts(request));
  }
  return response;
}
