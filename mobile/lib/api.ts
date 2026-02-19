import { router } from 'expo-router';

/**
 * API base URL for BetRollover backend.
 * Set EXPO_PUBLIC_API_URL for device/simulator (e.g. http://192.168.1.100:6001)
 */
const API_HOST = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6001').replace(/\/$/, '');
export const API_BASE = `${API_HOST}/api/v1`;

/** Web app URL for deep links (e.g. create pick). Set EXPO_PUBLIC_WEB_URL if different. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || API_HOST.replace(/:\d+$/, ':3000')).replace(/\/$/, '');

/** Check if 403 response is age verification required; if so, navigate to verify-age */
export async function checkAgeVerificationRequired(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  try {
    const data = await res.clone().json();
    if (data?.code === 'AGE_VERIFICATION_REQUIRED') {
      router.push('/verify-age');
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/** Check if 403 response is geo-restricted */
export function isGeoRestricted(res: Response, data?: { code?: string }): boolean {
  if (res.status !== 403) return false;
  return data?.code === 'GEO_RESTRICTED';
}
