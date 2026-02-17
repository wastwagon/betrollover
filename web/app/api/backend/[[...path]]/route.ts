import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

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
  if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
    const contentType = request.headers.get('content-type');
    if (contentType) headers.set('Content-Type', contentType);
    init.body = request.body;
  }

  const res = await fetch(url.toString(), init);
  const contentType = res.headers.get('Content-Type') || 'application/json';
  const isBinary = contentType.startsWith('image/') || contentType.includes('octet-stream');
  const data = isBinary ? await res.arrayBuffer() : await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': contentType },
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
