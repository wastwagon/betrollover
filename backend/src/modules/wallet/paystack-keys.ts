/** Paystack sk_live_ / sk_test_ secrets. Placeholders like sk_live_xxx must not win over env. */
export const PAYSTACK_SECRET_MIN_LENGTH = 24;

export type PaystackKeyKind = 'live' | 'test' | 'invalid';
export type PaystackKeySource = 'db' | 'env' | '';

export function classifyPaystackSecret(raw: string | null | undefined): {
  key: string;
  kind: PaystackKeyKind;
} {
  const key = (raw || '').trim().replace(/^['"]|['"]$/g, '');
  if (key.startsWith('sk_live_') && key.length >= PAYSTACK_SECRET_MIN_LENGTH) {
    return { key, kind: 'live' };
  }
  if (key.startsWith('sk_test_') && key.length >= PAYSTACK_SECRET_MIN_LENGTH) {
    return { key, kind: 'test' };
  }
  return { key: '', kind: 'invalid' };
}

export function preferredPaystackKind(mode: string | null | undefined): 'live' | 'test' {
  return (mode || 'live').toLowerCase().trim() === 'test' ? 'test' : 'live';
}

export function pickPaystackSecret(opts: {
  dbKey?: string | null;
  envKey?: string | null;
  mode?: string | null;
}): { key: string; source: PaystackKeySource; kind: PaystackKeyKind } {
  const preferred = preferredPaystackKind(opts.mode);
  const db = classifyPaystackSecret(opts.dbKey);
  const env = classifyPaystackSecret(opts.envKey);
  if (db.kind === preferred) return { key: db.key, source: 'db', kind: db.kind };
  if (env.kind === preferred) return { key: env.key, source: 'env', kind: env.kind };
  if (db.kind !== 'invalid') return { key: db.key, source: 'db', kind: db.kind };
  if (env.kind !== 'invalid') return { key: env.key, source: 'env', kind: env.kind };
  return { key: '', source: '', kind: 'invalid' };
}

export function mapPaystackClientError(
  message: string | null | undefined,
  fallback = 'Paystack initialization failed',
): string {
  const raw = (message || '').trim();
  const m = raw.toLowerCase();
  if (m.includes('deactivated')) {
    return 'Paystack deposits are disabled for this integration. Open Paystack Dashboard → Settings → API Keys, confirm Live is active, then paste a fresh sk_live_ secret in Admin → Settings (or PAYSTACK_SECRET_KEY).';
  }
  if (m.includes('invalid key')) {
    return 'Paystack secret key is invalid or incomplete. Replace it with the current Live Secret Key from Paystack Dashboard.';
  }
  return raw || fallback;
}
