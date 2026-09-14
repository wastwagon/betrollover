export function telegramBotToken(): string | null {
  const t = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  return t || null;
}

export function telegramVipChatId(): string | null {
  const id = (process.env.TELEGRAM_VIP_CHAT_ID || '').trim();
  return id || null;
}

export function telegramVipEnabled(): boolean {
  const v = (process.env.TELEGRAM_VIP_ENABLED || 'true').trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
  return Boolean(telegramBotToken() && telegramVipChatId());
}

export function telegramWebhookSecret(): string | null {
  const s = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  return s || null;
}

export function telegramWebhookUrl(): string | null {
  const explicit = (process.env.TELEGRAM_WEBHOOK_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  return null;
}

export function telegramBotUsername(): string | null {
  const u = (process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '');
  return u || null;
}

export async function telegramApi<T = unknown>(
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  const token = telegramBotToken();
  if (!token) return { ok: false, error: 'not_configured' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; result?: T; description?: string }
      | null;
    if (!res.ok || !json?.ok) {
      return { ok: false, error: json?.description || `HTTP ${res.status}` };
    }
    return { ok: true, result: json.result as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
