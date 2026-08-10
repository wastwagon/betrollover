import { safeJson } from './fetch-json.util';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse Retry-After as seconds; returns ms or null if unusable */
function retryAfterMs(headers: Headers): number | null {
  const raw = headers.get('retry-after');
  if (!raw) return null;
  const sec = parseInt(raw, 10);
  if (!Number.isFinite(sec) || sec < 0) return null;
  return sec * 1000;
}

function hasBodyRateLimit(data: unknown): boolean {
  const errors = (data as { errors?: Record<string, unknown> } | null)?.errors;
  return !!(errors && typeof errors === 'object' && errors.rateLimit);
}

export const API_SPORTS_RETRY_MAX_ATTEMPTS = 6;

/**
 * Fetch JSON from API-Sports with retries on HTTP 429 and body-level rateLimit errors
 * (API-Sports often returns 200 + `{ errors: { rateLimit: "..." } }` instead of 429).
 */
export async function fetchApiSportsJsonWithRetry<T = unknown>(
  url: string,
  headers: Record<string, string>,
  options: {
    maxAttempts?: number;
    onRetry?: (info: { attempt: number; waitMs: number; reason: string }) => void;
  } = {},
): Promise<{ ok: boolean; status: number; data: T | null; rateLimited: boolean }> {
  const maxAttempts = options.maxAttempts ?? API_SPORTS_RETRY_MAX_ATTEMPTS;
  let lastStatus = 0;
  let lastData: T | null = null;
  let rateLimited = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, { headers });
    lastStatus = res.status;

    if (res.status === 429) {
      rateLimited = true;
      if (attempt >= maxAttempts) break;
      const fromHeader = retryAfterMs(res.headers);
      const exponential = Math.min(2000 * Math.pow(2, attempt - 1), 120_000);
      const waitMs = Math.max(fromHeader ?? 0, exponential);
      options.onRetry?.({ attempt, waitMs, reason: 'HTTP 429' });
      await sleep(waitMs);
      continue;
    }

    const data = await safeJson<T>(res);
    lastData = data;

    if (hasBodyRateLimit(data)) {
      rateLimited = true;
      if (attempt >= maxAttempts) break;
      const fromHeader = retryAfterMs(res.headers);
      const exponential = Math.min(2000 * Math.pow(2, attempt - 1), 120_000);
      const waitMs = Math.max(fromHeader ?? 0, exponential);
      options.onRetry?.({ attempt, waitMs, reason: 'body rateLimit' });
      await sleep(waitMs);
      continue;
    }

    return { ok: res.ok, status: res.status, data, rateLimited: false };
  }

  return { ok: false, status: lastStatus, data: lastData, rateLimited };
}
