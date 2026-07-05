import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { buildGoogleOAuthState, getRedirectBase } from '@/lib/google-auth-exchange';

const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_STATE_COOKIE = 'apple_oauth_state';
const APPLE_NONCE_COOKIE = 'apple_oauth_nonce';

function oauthStateSecret(): string {
  return (process.env.GOOGLE_CLIENT_SECRET || process.env.APPLE_CLIENT_ID || '').trim();
}

/** GET: Redirect user to Apple Sign In. State/nonce are HMAC-signed (cookie is fallback). */
export async function GET(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || process.env.APPLE_CLIENT_ID;
  if (!clientId?.trim()) {
    const base = getRedirectBase(request);
    const loginUrl = new URL('/login', base);
    loginUrl.searchParams.set('error', 'Apple sign-in is not configured.');
    return NextResponse.redirect(loginUrl, 302);
  }

  const secret = oauthStateSecret();
  const base = getRedirectBase(request);
  const redirectUri = `${base}/api/auth/apple/callback`;
  const nonce = randomBytes(24).toString('hex');
  const state = secret ? buildGoogleOAuthState(secret, null, nonce) : randomBytes(24).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state,
    nonce,
  });

  const response = NextResponse.redirect(`${APPLE_AUTH_URL}?${params.toString()}`, 302);
  response.cookies.set(APPLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 600,
    path: '/',
  });
  response.cookies.set(APPLE_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 600,
    path: '/',
  });
  return response;
}
