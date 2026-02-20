import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

/**
 * Proxies avatar resize requests to the backend.
 * Backend serves /avatars/resize (excluded from api/v1 prefix).
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  const size = request.nextUrl.searchParams.get('size') || '96';
  if (!path || !path.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }
  const url = `${BACKEND_URL.replace(/\/$/, '')}/avatars/resize?path=${encodeURIComponent(path)}&size=${size}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: res.status });
    }
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('Content-Type') || 'image/jpeg';
    return new NextResponse(buffer, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return NextResponse.json({ error: 'Avatar service unavailable' }, { status: 502 });
  }
}
