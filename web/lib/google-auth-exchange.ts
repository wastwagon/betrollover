import { NextRequest, NextResponse } from 'next/server';
import { getApiErrorMessage } from '@/lib/api-error-message';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:6001';
export const GOOGLE_OAUTH_STATE_COOKIE = 'google_oauth_state';
export const OAUTH_TOKEN_COOKIE = 'br_oauth_token';

export function getRedirectBase(request: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (appUrl && appUrl.startsWith('http')) return appUrl.replace(/\/$/, '');
  try {
    const u = new URL(request.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:6002';
  }
}

function cookieSecure(request: NextRequest): boolean {
  return request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production';
}

/**
 * Verify Google `id_token` with the API and redirect the browser, optionally setting
 * the short-lived session cookie consumed by `/login` and `/register`.
 */
export async function completeGoogleSignInFromIdToken(
  request: NextRequest,
  idToken: string,
  redirectPath?: string | null,
): Promise<NextResponse> {
  const base = getRedirectBase(request);
  const loginUrl = new URL('/login', base);
  const dashboardUrl = new URL('/dashboard', base);

  const trimmed = idToken.trim();
  if (!trimmed) {
    loginUrl.searchParams.set('error', 'Google sign-in failed: no token received');
    return NextResponse.redirect(loginUrl, 302);
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: trimmed }),
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

    const redirectTo =
      typeof redirectPath === 'string' && redirectPath.startsWith('/')
        ? new URL(redirectPath, base)
        : dashboardUrl;
    const response = NextResponse.redirect(redirectTo, 302);
    response.cookies.set(OAUTH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: cookieSecure(request),
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
