/**
 * Client-side analytics helpers.
 * Page views: AnalyticsBeacon. Custom events: trackEvent.
 */

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'br_session_id';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

/** Allowed event types for backend validation */
export type AnalyticsEventType =
  | 'purchase_completed'
  | 'followed_tipster'
  | 'unfollowed_tipster'
  | 'coupon_viewed'
  | 'coupon_purchased'
  | 'registration_started'
  | 'registration_completed'
  | 'language_change'
  | 'currency_change'
  | 'account_menu_open';

/**
 * Track a custom event. Sends to /api/analytics/track-event.
 * Pass token when user is logged in so events are attributed.
 */
export function trackEvent(eventType: AnalyticsEventType, metadata?: Record<string, unknown>, token?: string) {
  if (typeof window === 'undefined') return;
  const sessionId = getOrCreateSessionId();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  fetch('/api/analytics/track-event', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sessionId,
      eventType,
      page: window.location.pathname || '/',
      metadata: metadata ?? {},
    }),
    keepalive: true,
  }).catch(() => {});
}
