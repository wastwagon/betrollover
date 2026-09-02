/**
 * First-party identity + attribution for the page beacon.
 * Device ID (localStorage) = unique browser. Session ID = 30-minute window (GA4-style).
 */

const DEVICE_KEY = 'br_device_id';
const SESSION_KEY = 'br_session_id';
const SESSION_AT_KEY = 'br_session_at';
const ATTRIB_KEY = 'br_attrib';
/** Reuse the same session if the last hit was within 30 minutes. */
const SESSION_MS = 30 * 60 * 1000;

export type AnalyticsAttribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  src: string | null;
  landingReferrer: string | null;
};

function randomId(prefix: string): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function readStore(store: Storage | undefined, key: string): string | null {
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(store: Storage | undefined, key: string, value: string): void {
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

function ls(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function ss(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Stable per browser/WebView. Telegram in-app storage often resets. */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const existing = readStore(ls(), DEVICE_KEY);
  if (existing) return existing.slice(0, 64);
  const id = randomId('dev_').slice(0, 64);
  writeStore(ls(), DEVICE_KEY, id);
  return id;
}

/**
 * 30-minute session: same ID after tab close / app background if they return in time.
 * Falls back to sessionStorage, then a one-off id.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const now = Date.now();
  const stored = readStore(ls(), SESSION_KEY);
  const at = parseInt(readStore(ls(), SESSION_AT_KEY) || '0', 10);
  if (stored && now - at < SESSION_MS) {
    writeStore(ls(), SESSION_AT_KEY, String(now));
    writeStore(ss(), SESSION_KEY, stored);
    return stored.slice(0, 64);
  }
  const fromTab = readStore(ss(), SESSION_KEY);
  if (fromTab && !stored) {
    writeStore(ls(), SESSION_KEY, fromTab);
    writeStore(ls(), SESSION_AT_KEY, String(now));
    return fromTab.slice(0, 64);
  }
  const sid = randomId('sess_').slice(0, 64);
  writeStore(ls(), SESSION_KEY, sid);
  writeStore(ls(), SESSION_AT_KEY, String(now));
  writeStore(ss(), SESSION_KEY, sid);
  return sid;
}

function parseAttributionFromLocation(): Partial<AnalyticsAttribution> {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  const utmSource = q.get('utm_source');
  const utmMedium = q.get('utm_medium');
  const utmCampaign = q.get('utm_campaign');
  const src = q.get('src');
  const landingReferrer =
    typeof document !== 'undefined' && document.referrer ? document.referrer.slice(0, 512) : null;
  return {
    utmSource: utmSource || null,
    utmMedium: utmMedium || null,
    utmCampaign: utmCampaign || null,
    src: src || null,
    landingReferrer,
  };
}

/** First-touch UTMs / src for this 30-minute session. */
export function getSessionAttribution(): AnalyticsAttribution {
  const parsed = parseAttributionFromLocation();
  let cached: Partial<AnalyticsAttribution> = {};
  try {
    const raw = readStore(ss(), ATTRIB_KEY) || readStore(ls(), ATTRIB_KEY);
    if (raw) cached = JSON.parse(raw) as Partial<AnalyticsAttribution>;
  } catch {
    cached = {};
  }
  const merged: AnalyticsAttribution = {
    utmSource: parsed.utmSource || cached.utmSource || null,
    utmMedium: parsed.utmMedium || cached.utmMedium || null,
    utmCampaign: parsed.utmCampaign || cached.utmCampaign || null,
    src: parsed.src || cached.src || null,
    landingReferrer: cached.landingReferrer || parsed.landingReferrer || null,
  };
  if (parsed.utmSource || parsed.src || (parsed.landingReferrer && !cached.landingReferrer)) {
    const payload = JSON.stringify(merged);
    writeStore(ss(), ATTRIB_KEY, payload);
    writeStore(ls(), ATTRIB_KEY, payload);
  } else if (!cached.utmSource && !cached.src && merged.landingReferrer) {
    const payload = JSON.stringify(merged);
    writeStore(ss(), ATTRIB_KEY, payload);
  }
  return merged;
}

export function shouldSkipAnalyticsBeacon(): boolean {
  if (typeof navigator === 'undefined') return true;
  const nav = navigator as Navigator & { webdriver?: boolean };
  if (nav.webdriver) return true;
  return false;
}

export function buildPageViewPayload(page: string): Record<string, string | null> {
  const attrib = getSessionAttribution();
  const search = typeof window !== 'undefined' ? window.location.search : '';
  return {
    sessionId: getOrCreateSessionId(),
    deviceId: getOrCreateDeviceId(),
    page: `${page}${search}`.slice(0, 255),
    landingReferrer: attrib.landingReferrer,
    utmSource: attrib.utmSource,
    utmMedium: attrib.utmMedium,
    utmCampaign: attrib.utmCampaign,
    src: attrib.src,
  };
}
