/** First-touch traffic buckets stored on visitor_sessions.traffic_source */
export const TRAFFIC_SOURCES = [
  'telegram',
  'android_app',
  'ios_app',
  'email',
  'organic',
  'social',
  'referral',
  'direct',
] as const;

export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

const SEARCH_HOSTS = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu', 'yandex', 'ecosia'];
const SOCIAL_HOSTS = [
  'facebook',
  'twitter',
  'x.com',
  'instagram',
  'linkedin',
  'tiktok',
  'youtube',
  'pinterest',
  'whatsapp',
  'reddit',
];

/** Link-preview crawlers and SEO bots — not real visitors. */
const BOT_UA =
  /googlebot|bingbot|yandexbot|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|slackbot|telegrambot|linkedinbot|pinterestbot|applebot|semrush|ahrefs|mj12bot|dotbot|bytespider|gptbot|claudebot|ccbot|petalbot/i;

export function isBotUserAgent(ua?: string | null): boolean {
  if (!ua) return false;
  return BOT_UA.test(ua);
}

function norm(s?: string | null): string {
  return (s || '').trim().toLowerCase();
}

function isInternalReferrer(r: string): boolean {
  if (!r) return true;
  return (
    r.includes('betrollover') ||
    r.includes('localhost') ||
    r.includes('127.0.0.1') ||
    r.startsWith('/')
  );
}

function sourceFromUtmOrSrc(utmSource?: string | null, src?: string | null, utmMedium?: string | null): TrafficSource | null {
  const raw = norm(utmSource) || norm(src);
  const medium = norm(utmMedium);
  if (!raw && !medium) return null;
  const blob = `${raw} ${medium}`;
  if (/\b(telegram|tg)\b/.test(blob)) return 'telegram';
  if (/\b(android_app|androidapp|betrolloverapp)\b/.test(blob) || raw === 'android' || raw === 'app') {
    return 'android_app';
  }
  if (/\b(ios_app|iosapp|betrolloverios)\b/.test(blob) || raw === 'ios') return 'ios_app';
  if (raw === 'email' || medium === 'email' || medium === 'transactional') return 'email';
  if (SEARCH_HOSTS.some((h) => blob.includes(h)) || medium === 'organic') return 'organic';
  if (SOCIAL_HOSTS.some((h) => blob.includes(h)) || medium === 'social' || raw === 'whatsapp') return 'social';
  if (medium === 'referral' || raw) {
    if (SEARCH_HOSTS.some((h) => raw.includes(h))) return 'organic';
    if (SOCIAL_HOSTS.some((h) => raw.includes(h))) return 'social';
    if (raw === 'direct') return 'direct';
    return raw ? 'referral' : null;
  }
  return null;
}

function sourceFromUserAgent(ua?: string | null): TrafficSource | null {
  const u = ua || '';
  if (/Telegram/i.test(u) && !/TelegramBot/i.test(u)) return 'telegram';
  if (/BetRolloveriOS/i.test(u)) return 'ios_app';
  if (/BetRolloverApp|WebViewGold/i.test(u)) return 'android_app';
  if (/Android/i.test(u) && /; wv\)/i.test(u) && !/FBAN|FBAV|Instagram|Line\//i.test(u)) {
    return 'android_app';
  }
  return null;
}

function sourceFromReferrer(referrer?: string | null): TrafficSource | null {
  const r = norm(referrer);
  if (!r || isInternalReferrer(r)) return null;
  if (r.includes('t.me') || r.includes('telegram')) return 'telegram';
  if (SEARCH_HOSTS.some((h) => r.includes(h))) return 'organic';
  if (SOCIAL_HOSTS.some((h) => r.includes(h))) return 'social';
  return 'referral';
}

export function classifyTrafficSource(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  src?: string | null;
  landingReferrer?: string | null;
  userAgent?: string | null;
  page?: string | null;
}): TrafficSource {
  const fromUtm = sourceFromUtmOrSrc(input.utmSource, input.src, input.utmMedium);
  if (fromUtm) return fromUtm;

  const page = input.page || '';
  if (/[?&]src=android_app\b/i.test(page)) return 'android_app';
  if (/[?&]src=ios_app\b/i.test(page)) return 'ios_app';
  if (/[?&]utm_source=telegram\b/i.test(page)) return 'telegram';
  if (/[?&]utm_source=email\b/i.test(page)) return 'email';

  const fromUa = sourceFromUserAgent(input.userAgent);
  if (fromUa) return fromUa;

  const fromRef = sourceFromReferrer(input.landingReferrer);
  if (fromRef) return fromRef;

  return 'direct';
}
