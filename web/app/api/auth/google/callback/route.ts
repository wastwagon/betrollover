import { NextRequest, NextResponse } from 'next/server';
import {
  completeGoogleSignInFromIdToken,
  getRedirectBase,
  GOOGLE_OAUTH_STATE_COOKIE,
  verifyGoogleOAuthState,
} from '@/lib/google-auth-exchange';

const GOOGLE_OAUTH_NEXT_COOKIE = 'google_oauth_next';

/**
 * OAuth redirect target for Google authorization code flow (WebView / embedded browser fallback).
 */
export async function GET(request: NextRequest) {
  const base = getRedirectBase(request);
  const loginUrl = new URL('/login', base);
  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri = `${base}/api/auth/google/callback`;

  const { searchParams } = new URL(request.url);
  const err = searchParams.get('error');
  const errDesc = searchParams.get('error_description');
  if (err) {
    loginUrl.searchParams.set(
      'error',
      errDesc ? `${err}: ${decodeURIComponent(errDesc)}` : err,
    );
    const r = NextResponse.redirect(loginUrl, 302);
    r.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    r.cookies.delete(GOOGLE_OAUTH_NEXT_COOKIE);
    return r;
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookieState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const nextFromCookie = request.cookies.get(GOOGLE_OAUTH_NEXT_COOKIE)?.value;

  const signed = verifyGoogleOAuthState(state, clientSecret);
  const legacyCookieOk =
    Boolean(code && state && cookieState && state === cookieState);
  const stateOk = signed.ok || legacyCookieOk;
  const nextPath = signed.ok ? signed.next : legacyCookieOk ? nextFromCookie : null;

  if (!code || !state || !stateOk) {
    loginUrl.searchParams.set('error', 'Google sign-in was cancelled or the session expired. Please try again.');
    const r = NextResponse.redirect(loginUrl, 302);
    r.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    r.cookies.delete(GOOGLE_OAUTH_NEXT_COOKIE);
    return r;
  }

  if (!clientId || !clientSecret) {
    loginUrl.searchParams.set('error', 'Google sign-in is not configured on the server.');
    const r = NextResponse.redirect(loginUrl, 302);
    r.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    r.cookies.delete(GOOGLE_OAUTH_NEXT_COOKIE);
    return r;
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
    id_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.id_token) {
    const msg =
      tokenJson.error_description ||
      tokenJson.error ||
      `Could not complete Google sign-in (${tokenRes.status})`;
    loginUrl.searchParams.set('error', msg);
    const r = NextResponse.redirect(loginUrl, 302);
    r.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    r.cookies.delete(GOOGLE_OAUTH_NEXT_COOKIE);
    return r;
  }

  const out = await completeGoogleSignInFromIdToken(
    request,
    tokenJson.id_token,
    nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : null,
  );
  out.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  out.cookies.delete(GOOGLE_OAUTH_NEXT_COOKIE);
  return out;
}
