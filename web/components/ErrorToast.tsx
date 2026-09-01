'use client';

import { useEffect, useState } from 'react';
import { formatError } from '@/utils/errorMessages';
import { useT } from '@/context/LanguageContext';
import { IconWarning } from '@/components/ios/icons';

interface ErrorToastProps {
  error: unknown;
  onClose: () => void;
  duration?: number;
}

export function ErrorToast({ error, onClose, duration = 5000 }: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const t = useT();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const errorMessage = formatError(error);

  if (!isVisible) return null;

  return (
    <div
      className="fixed z-[70] left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md top-[var(--br-toast-top)] animate-slide-in-right"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-[var(--destructive)]/10 border border-[var(--destructive)]/25 rounded-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0">
          <IconWarning className="w-6 h-6 text-[var(--destructive)]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[var(--destructive)] mb-1">{t('toast.error_title')}</h4>
          <p className="text-sm text-[var(--text)]">{errorMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 text-[var(--destructive)] hover:text-[var(--text)] transition-colors"
          aria-label={t('toast.close_error')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
