import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

/**
 * Proxy analytics track-event to the backend.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const auth = request.headers.get('authorization');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) headers['Authorization'] = auth;
    const res = await fetch(`${BACKEND_URL}/api/v1/analytics/track-event`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok && res.status !== 404) {
      return NextResponse.json(
        await res.json().catch(() => ({ message: 'Track event failed' })),
        { status: res.status }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
