import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

/**
 * Proxy analytics track to the backend. If the backend returns 404 (e.g. old
 * API image without the route), respond with 200 so the console stays clean.
 */
function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip') || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const referer = request.headers.get('referer') || request.headers.get('referrer');
    const clientIp = getClientIp(request);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (referer) headers['Referer'] = referer;
    const payload = { ...body, ...(clientIp && { clientIp }) };
    const res = await fetch(`${BACKEND_URL}/api/v1/analytics/track`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok && res.status !== 404) {
      return NextResponse.json(
        await res.json().catch(() => ({ message: 'Track failed' })),
        { status: res.status }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
