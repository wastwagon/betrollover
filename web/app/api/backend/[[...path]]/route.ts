import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

async function proxyRequest(request: NextRequest, path: string[]) {
  const pathStr = path?.filter(Boolean).join('/') || '';
  const url = new URL(pathStr ? `/${pathStr}` : '/', BACKEND_URL);
  url.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((v, k) => {
    if (k.toLowerCase() === 'host') return;
    headers.set(k, v);
  });

  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const body = await request.text();
      if (body) {
        headers.set('Content-Type', request.headers.get('content-type') || 'application/json');
        init.body = body;
      }
    } catch {
      // no body
    }
  }

  const res = await fetch(url.toString(), init);
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
    },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxyRequest(request, path);
}
