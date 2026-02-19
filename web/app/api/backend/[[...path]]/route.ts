import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

async function proxyRequest(request: NextRequest, path: string[]) {
  const pathStr = path?.filter(Boolean).join('/') || '';
  const versionedPath = pathStr ? `api/v1/${pathStr}` : 'api/v1';
  const url = new URL(versionedPath.startsWith('api/') ? `/${versionedPath}` : `/${versionedPath}`, BACKEND_URL);
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
  const contentLength = request.headers.get('content-length');
  const hasBody = contentLength && parseInt(contentLength, 10) > 0;
  if (['POST', 'PUT', 'PATCH'].includes(request.method) && hasBody && request.body) {
    const contentType = request.headers.get('content-type');
    if (contentType) headers.set('Content-Type', contentType);
    init.body = request.body;
  }

  try {
    const res = await fetch(url.toString(), init);
    const contentType = res.headers.get('Content-Type') || 'application/json';
    const isBinary = contentType.startsWith('image/') || contentType.includes('octet-stream');
    const data = isBinary ? await res.arrayBuffer() : await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new NextResponse(
      JSON.stringify({ message: 'Backend proxy error', error: msg }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
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
