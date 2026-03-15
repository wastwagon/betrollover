import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_STATE_COOKIE = 'apple_oauth_state';

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

/** GET: Redirect user to Apple Sign In (state stored in cookie for callback). */
export async function GET(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || process.env.APPLE_CLIENT_ID;
  if (!clientId?.trim()) {
    const base = getRedirectBase(request);
    const loginUrl = new URL('/login', base);
    loginUrl.searchParams.set('error', 'Apple sign-in is not configured.');
    return NextResponse.redirect(loginUrl, 302);
  }

  const base = getRedirectBase(request);
  const redirectUri = `${base}/api/auth/apple/callback`;
  const state = randomBytes(24).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state,
  });

  const response = NextResponse.redirect(`${APPLE_AUTH_URL}?${params.toString()}`, 302);
  response.cookies.set(APPLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return response;
}
