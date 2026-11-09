'use client';

import { useCallback, useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { buttonClassName } from '@/components/ui/Button';

type VipTelegramStatus = {
  enabled: boolean;
  configured: boolean;
  chatId: string | null;
  botUsername: string | null;
  webhookUrl: string | null;
  webhookSecretSet: boolean;
};

/**
 * AccaSure1X2 paid VIP Telegram ops — not the free Sure · Two-Fold desk.
 */
export function AdminVipTelegramPanel({
  onMessage,
}: {
  onMessage?: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}) {
  const [telegram, setTelegram] = useState<VipTelegramStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/admin/telegram/vip/status`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) setTelegram((await res.json()) as VipTelegramStatus);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (path: string, okText: (data: Record<string, unknown>) => string, failFallback: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setBusy(true);
    onMessage?.(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/telegram/vip/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      onMessage?.(
        res.ok
          ? { type: 'success', text: okText(data) }
          : { type: 'error', text: getApiErrorMessage(data, failFallback) },
      );
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      id="vip-telegram"
      className="mb-8 scroll-mt-24 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
    >
      <h2 className="text-lg font-semibold text-[var(--text)]">AccaSure1X2 VIP Telegram</h2>
      <p className="text-sm text-[var(--text-muted)]">
        Paid VIP chat for AccaSure1X2 only — separate from the free Sure · Two-Fold desk and the public
        channel. Same bot token; bot must admin BETROLLOVER VIP (invite, ban, post). Set{' '}
        <code className="font-mono text-xs">TELEGRAM_VIP_CHAT_ID</code>,{' '}
        <code className="font-mono text-xs">TELEGRAM_BOT_USERNAME</code>, and{' '}
        <code className="font-mono text-xs">TELEGRAM_WEBHOOK_URL</code>.
      </p>
      <p className="text-sm">
        {loading ? (
          <span className="text-[var(--text-muted)]">Loading…</span>
        ) : telegram?.configured ? (
          <span className="text-emerald-700 dark:text-emerald-300">
            Configured · chat {telegram.chatId || '—'} · @{telegram.botUsername || 'unset'}
            {telegram.webhookSecretSet ? ' · webhook secret set' : ''}
          </span>
        ) : (
          <span className="text-amber-700 dark:text-amber-300">
            Not configured — paying AccaSure1X2 members will not get a Telegram invite yet.
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className={buttonClassName({ variant: 'secondary' })}
          onClick={() => run('test', () => 'Posted a test message to the VIP chat.', 'VIP Telegram test failed')}
        >
          Test VIP post
        </button>
        <button
          type="button"
          disabled={busy}
          className={buttonClassName({ variant: 'secondary' })}
          onClick={() =>
            run('setup-webhook', (d) => `Webhook set to ${String(d.url || 'Telegram')}.`, 'Webhook setup failed')
          }
        >
          Set VIP webhook
        </button>
        <button
          type="button"
          disabled={busy}
          className={buttonClassName({ variant: 'secondary' })}
          onClick={() =>
            run(
              'kick-expired',
              (d) => `Removed ${Number(d.kicked ?? 0)} expired member(s).`,
              'Kick failed',
            )
          }
        >
          Remove expired members
        </button>
      </div>
    </div>
  );
}
