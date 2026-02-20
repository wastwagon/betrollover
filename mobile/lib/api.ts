/**
 * API base URL for BetRollover backend.
 * Set EXPO_PUBLIC_API_URL for device/simulator (e.g. http://192.168.1.100:6001)
 */
const API_HOST = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6001').replace(/\/$/, '');
export const API_BASE = `${API_HOST}/api/v1`;

/** Web app URL for deep links (e.g. create pick). Set EXPO_PUBLIC_WEB_URL if different. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || API_HOST.replace(/:\d+$/, ':3000')).replace(/\/$/, '');

/** Age verification disabled. Kept for API compatibility - always returns false. */
export async function checkAgeVerificationRequired(_res: Response): Promise<boolean> {
  return false;
}

