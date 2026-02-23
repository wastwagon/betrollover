/**
 * Client-side analytics helpers.
 * Sends events to the same backend as page views; backend can be extended to store custom events.
 */

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'br_session_id';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

/**
 * Track a custom event (currency change, language change, menu open, etc.).
 * Sends to /api/analytics/track; backend may store or ignore based on implementation.
 */
export function trackEvent(event: string, payload?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined') return;
  const sessionId = getOrCreateSessionId();
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      page: typeof window !== 'undefined' ? window.location.pathname : '/',
      event,
      payload: payload ?? {},
    }),
    keepalive: true,
  }).catch(() => {});
}
