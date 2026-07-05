import { NextRequest, NextResponse } from 'next/server';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { OAUTH_TOKEN_COOKIE, verifyGoogleOAuthState } from '@/lib/google-auth-exchange';
import { buildOAuthCompleteLoginUrl } from '@/lib/oauth-complete-url';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';
const APPLE_STATE_COOKIE = 'apple_oauth_state';
const APPLE_NONCE_COOKIE = 'apple_oauth_nonce';

function oauthStateSecret(): string {
  return (process.env.GOOGLE_CLIENT_SECRET || process.env.APPLE_CLIENT_ID || '').trim();
}

function getRedirectBase(request: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (appUrl && appUrl.startsWith('http')) return appUrl.replace(/\/$/, '');
  try {
    const u = new URL(request.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:6002';
  }
}

/** POST: Apple redirects here with form_post (identity_token, user, state). */
export async function POST(request: NextRequest) {
  const base = getRedirectBase(request);
  const loginUrl = new URL('/login', base);

  try {
    const formData = await request.formData();
    const identityToken = formData.get('id_token') ?? formData.get('identity_token');
    const state = formData.get('state');
    const userJson = formData.get('user');

    const idToken = typeof identityToken === 'string' ? identityToken.trim() : '';
    if (!idToken) {
      loginUrl.searchParams.set('error', 'Apple sign-in failed: no token received');
      return NextResponse.redirect(loginUrl, 302);
    }

    const stateStr = typeof state === 'string' ? state : null;
    const cookieState = request.cookies.get(APPLE_STATE_COOKIE)?.value;
    const cookieNonce = request.cookies.get(APPLE_NONCE_COOKIE)?.value;
    const secret = oauthStateSecret();
    const signed = secret ? verifyGoogleOAuthState(stateStr, secret) : { ok: false as const };
    const legacyCookieOk = Boolean(stateStr && cookieState && stateStr === cookieState);
    if (!stateStr || (!signed.ok && !legacyCookieOk)) {
      loginUrl.searchParams.set('error', 'Invalid state. Please try again.');
      return NextResponse.redirect(loginUrl, 302);
    }

    const nonce = signed.ok ? signed.nonce : cookieNonce;

    let user: { email?: string; name?: { firstName?: string; lastName?: string } } | undefined;
    if (typeof userJson === 'string' && userJson) {
      try {
        user = JSON.parse(userJson) as { email?: string; name?: { firstName?: string; lastName?: string } };
      } catch {
        // ignore
      }
    }

    const res = await fetch(`${BACKEND_URL}/api/v1/auth/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken, user, nonce }),
    });

    const raw = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      data = { message: raw || 'Invalid response' };
    }

    if (!res.ok) {
      loginUrl.searchParams.set(
        'error',
        getApiErrorMessage(data, `Sign-in failed (${res.status})`),
      );
      return NextResponse.redirect(loginUrl, 302);
    }

    const token = (data as { access_token?: string }).access_token;
    if (!token) {
      loginUrl.searchParams.set('error', 'No token received');
      return NextResponse.redirect(loginUrl, 302);
    }

    const response = NextResponse.redirect(buildOAuthCompleteLoginUrl(request, '/dashboard'), 302);
    response.cookies.delete(APPLE_STATE_COOKIE);
    response.cookies.delete(APPLE_NONCE_COOKIE);
    response.cookies.set(OAUTH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 120,
      path: '/',
    });
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Apple sign-in failed';
    loginUrl.searchParams.set('error', msg);
    return NextResponse.redirect(loginUrl, 302);
  }
}
