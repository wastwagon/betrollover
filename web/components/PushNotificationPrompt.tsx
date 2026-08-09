'use client';

import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useState, useEffect } from 'react';

export function PushNotificationPrompt() {
  const { supported, permission, registered, loading, error, requestAndRegister } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('token'));
  }, []);

  if (!loggedIn || !supported || permission === 'denied' || registered || dismissed) return null;

  return (
    <div
      className="fixed left-4 right-4 z-40 md:left-auto md:right-4 md:bottom-6 md:max-w-sm rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-lg p-4 animate-fade-in"
      style={{
        bottom: 'calc(3.75rem + env(safe-area-inset-bottom, 0px) + 0.75rem)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text)] text-sm">Enable notifications</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Get alerts for new picks, subscriptions, and settlements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="touch-target shrink-0 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          className="touch-target flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {loading ? 'Enabling...' : 'Enable'}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="touch-target py-2.5 px-3 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
