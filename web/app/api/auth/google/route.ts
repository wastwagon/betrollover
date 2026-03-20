import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:6001';
const OAUTH_TOKEN_COOKIE = 'br_oauth_token';

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

export async function POST(request: NextRequest) {
  const base = getRedirectBase(request);
  const loginUrl = new URL('/login', base);
  const dashboardUrl = new URL('/dashboard', base);

  try {
    const body = await request.json().catch(() => ({}));
    const idToken = typeof body?.id_token === 'string' ? body.id_token.trim() : '';
    if (!idToken) {
      loginUrl.searchParams.set('error', 'Google sign-in failed: no token received');
      return NextResponse.redirect(loginUrl, 302);
    }

    const res = await fetch(`${BACKEND_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
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

    const redirectTo = typeof body?.redirect === 'string' && body.redirect.startsWith('/')
      ? new URL(body.redirect, base)
      : dashboardUrl;
    const response = NextResponse.redirect(redirectTo, 302);
    response.cookies.set(OAUTH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 120,
      path: '/',
    });
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Google sign-in failed';
    loginUrl.searchParams.set('error', msg);
    return NextResponse.redirect(loginUrl, 302);
  }
}
