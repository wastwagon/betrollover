import { emitAuthStorageSync } from '@/lib/auth-storage-sync';

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
