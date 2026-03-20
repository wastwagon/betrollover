import { NextResponse } from 'next/server';
import { getAssetLinksBody } from '@/lib/well-known-mobile';

export const dynamic = 'force-dynamic';

export async function GET() {
  const body = getAssetLinksBody();
  if (!body) {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
    },
  });
}
