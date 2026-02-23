import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    const pathStr = path?.join('/') || '';
    if (!pathStr) return NextResponse.json(null, { status: 404 });
    const locale = (await cookies()).get('br_language')?.value || 'en';
    const sep = pathStr.includes('?') ? '&' : '?';
    const res = await fetch(`${BACKEND_URL}/api/v1/resources/${pathStr}${sep}language=${locale}`, { next: { revalidate: 60 } });
    if (!res.ok) return NextResponse.json(null, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
