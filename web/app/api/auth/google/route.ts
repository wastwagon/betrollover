import { NextRequest, NextResponse } from 'next/server';
import { completeGoogleSignInFromIdToken, getRedirectBase } from '@/lib/google-auth-exchange';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const idToken = typeof body?.id_token === 'string' ? body.id_token.trim() : '';
    const redirect =
      typeof body?.redirect === 'string' && body.redirect.startsWith('/') ? body.redirect : null;
    return await completeGoogleSignInFromIdToken(request, idToken, redirect);
  } catch (e) {
    const base = getRedirectBase(request);
    const loginUrl = new URL('/login', base);
    const msg = e instanceof Error ? e.message : 'Google sign-in failed';
    loginUrl.searchParams.set('error', msg);
    return NextResponse.redirect(loginUrl, 302);
  }
}
