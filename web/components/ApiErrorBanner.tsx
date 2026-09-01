'use client';

import { useT } from '@/context/LanguageContext';

interface ApiErrorBannerProps {
  message: string;
  onRetry?: () => void;
  /** Show "If this persists, the service may be temporarily down." for connection/server errors */
  showHint?: boolean;
  className?: string;
}

/**
 * Shared banner for API/backend errors with optional retry.
 * Use on login, dashboard, or any page that calls the API.
 */
export function ApiErrorBanner({ message, onRetry, showHint = false, className = '' }: ApiErrorBannerProps) {
  const t = useT();
  const isServerError =
    showHint &&
    (message.toLowerCase().includes('unavailable') ||
      message.toLowerCase().includes('server') ||
      message.toLowerCase().includes('network') ||
      message.toLowerCase().includes('fetch'));

  return (
    <div
      className={`rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive-light)] p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-[var(--destructive)]">{message}</p>
      {isServerError && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{t('auth.backend_unavailable_hint')}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-semibold text-[var(--primary)] hover:underline"
        >
          {t('auth.retry')}
        </button>
      )}
    </div>
  );
}
