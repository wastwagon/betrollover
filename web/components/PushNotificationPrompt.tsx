'use client';

import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useState } from 'react';

export function PushNotificationPrompt() {
  const { supported, permission, registered, loading, error, requestAndRegister } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (!supported || permission === 'denied' || registered || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-lg p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--text)] text-sm">Enable notifications</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Get alerts for new picks, subscriptions, and settlements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)]"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={requestAndRegister}
          disabled={loading}
          className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {loading ? 'Enabling...' : 'Enable'}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="py-2 px-3 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
