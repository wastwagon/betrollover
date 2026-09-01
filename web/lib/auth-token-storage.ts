import { emitAuthStorageSync } from '@/lib/auth-storage-sync';

function jwtExpired(token: string): boolean {
  const parts = token.split('.');
  if (parts.length < 2) return true;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (base64.length % 4)) % 4;
    const payload = JSON.parse(atob(base64 + '='.repeat(pad))) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= Date.now() + 5000;
  } catch {
    return true;
  }
}

/** Persist JWT; returns false when storage is unavailable (e.g. iOS private mode). */
export function setAuthToken(token: string): boolean {
  if (typeof window === 'undefined') return false;
  const trimmed = token.trim();
  if (!trimmed) return false;
  try {
    localStorage.setItem('token', trimmed);
    emitAuthStorageSync();
    return true;
  } catch {
    return false;
  }
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!localStorage.getItem('token')) return;
    localStorage.removeItem('token');
  } catch {
    return;
  }
  emitAuthStorageSync();
}

/** Live JWT, or null if missing / expired (expired tokens are removed). */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    if (jwtExpired(token)) {
      clearAuthToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function dropAuthIfUnauthorized(res: Response): boolean {
  if (res.status !== 401) return false;
  clearAuthToken();
  return true;
}

/** Exchange short-lived `br_oauth_token` httpOnly cookie for client storage. */
export async function consumeOAuthSessionToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/auth/session-token', { method: 'GET', cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({ token: null }));
    const token = typeof data?.token === 'string' ? data.token.trim() : '';
    if (!token) return null;
    if (!setAuthToken(token)) return token;
    return token;
  } catch {
    return null;
  }
}
