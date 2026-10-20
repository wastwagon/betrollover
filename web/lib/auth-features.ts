/**
 * Temporary kill-switch for Google sign-in (GIS button + OAuth redirect flow).
 * Set to `true` when ready to turn Google sign-in back on (still requires Google client ID / secret in env).
 */
export const GOOGLE_SIGN_IN_ENABLED = false;

/** Whether Google sign-in should be offered in the UI and via `/api/auth/google*`. */
export function isGoogleSignInEnabled(): boolean {
  if (!GOOGLE_SIGN_IN_ENABLED) return false;
  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
  return !!clientId;
}
