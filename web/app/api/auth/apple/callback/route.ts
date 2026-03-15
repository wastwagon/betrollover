import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';
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

/** POST: Apple redirects here with form_post (identity_token, user, state). */
export async function POST(request: NextRequest) {
  const base = getRedirectBase(request);
  const loginUrl = new URL('/login', base);
  const dashboardUrl = new URL('/dashboard', base);

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

    const cookieState = request.cookies.get(APPLE_STATE_COOKIE)?.value;
    if (!state || !cookieState || state !== cookieState) {
      loginUrl.searchParams.set('error', 'Invalid state. Please try again.');
      return NextResponse.redirect(loginUrl, 302);
    }

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
      body: JSON.stringify({ id_token: idToken, user }),
    });

    const raw = await res.text();
    let data: { access_token?: string; message?: string };
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw || 'Invalid response' };
    }

    if (!res.ok) {
      loginUrl.searchParams.set('error', data.message || `Sign-in failed (${res.status})`);
      return NextResponse.redirect(loginUrl, 302);
    }

    const token = data.access_token;
    if (!token) {
      loginUrl.searchParams.set('error', 'No token received');
      return NextResponse.redirect(loginUrl, 302);
    }

    dashboardUrl.searchParams.set('token', token);
    const response = NextResponse.redirect(dashboardUrl, 302);
    response.cookies.delete(APPLE_STATE_COOKIE);
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Apple sign-in failed';
    loginUrl.searchParams.set('error', msg);
    return NextResponse.redirect(loginUrl, 302);
  }
}
