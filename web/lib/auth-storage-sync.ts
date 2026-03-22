/**
 * Same-tab localStorage writes do not fire the `storage` event. Emit this after
 * changing `token` so headers and other client UI can resync without a full reload.
 */
export const AUTH_STORAGE_SYNC = 'betrollover:auth-storage-sync';

export function emitAuthStorageSync(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_STORAGE_SYNC));
}
