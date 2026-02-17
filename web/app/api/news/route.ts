import { NextRequest, NextResponse } from 'next/server';

// Server-side: use BACKEND_URL (Docker internal) so web container can reach api container
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const featured = searchParams.get('featured');

    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);
    if (featured) params.set('featured', featured);

    const url = `${BACKEND_URL}/news${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
