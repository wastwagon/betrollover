import { NextRequest, NextResponse } from 'next/server';

const OAUTH_TOKEN_COOKIE = 'br_oauth_token';

/** One-time token exchange: moves short-lived server cookie into client storage flow. */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(OAUTH_TOKEN_COOKIE)?.value?.trim();
  const response = NextResponse.json({ token: token || null }, { status: 200 });
  response.cookies.delete(OAUTH_TOKEN_COOKIE);
  return response;
}
