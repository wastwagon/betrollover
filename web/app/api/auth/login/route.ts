import { NextRequest, NextResponse } from 'next/server';

// Server-side: prefer BACKEND_URL (Docker internal) over NEXT_PUBLIC_API_URL (browser-facing)
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

/** Build redirect base URL: prefer APP_URL so redirects always go to the correct host/port (avoids localhost:3000 vs 6002 confusion) */
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

  try {
    const contentType = request.headers.get('content-type') || '';
    let body: { email?: string; password?: string };
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const form = await request.formData();
      body = { email: form.get('email') as string, password: form.get('password') as string };
    }
    if (!body?.email || !body?.password) {
      const errorUrl = new URL('/login', base);
      errorUrl.searchParams.set('error', 'Email and password required');
      return NextResponse.redirect(errorUrl, 302);
    }

    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorUrl = new URL('/login', base);
      errorUrl.searchParams.set('error', data.message || 'Login failed');
      return NextResponse.redirect(errorUrl, 302);
    }
    const token = data.access_token;
    if (!token) {
      const errorUrl = new URL('/login', base);
      errorUrl.searchParams.set('error', 'No token received');
      return NextResponse.redirect(errorUrl, 302);
    }

    const redirectUrl = new URL('/dashboard', base);
    redirectUrl.searchParams.set('token', token);
    return NextResponse.redirect(redirectUrl, 302);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Login failed';
    const stack = e instanceof Error ? e.stack : undefined;

    // Log detailed error for production debugging
    console.error(`[Login Error] Backend: ${BACKEND_URL} | Msg: ${msg}`, {
      error: e,
      stack,
      url: `${BACKEND_URL}/auth/login`
    });

    const userMsg = msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')
      ? 'Backend unavailable. Please try again.'
      : msg;
    const errorUrl = new URL('/login', base);
    errorUrl.searchParams.set('error', userMsg);
    return NextResponse.redirect(errorUrl, 302);
  }
}
