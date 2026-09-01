'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/context/LanguageContext';

interface SuccessToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export function SuccessToast({ message, onClose, duration = 4000 }: SuccessToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const t = useT();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed z-[70] left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md top-[var(--br-toast-top)] animate-slide-in-right"
      role="status"
      aria-live="polite"
    >
      <div className="bg-[var(--primary-light)] border border-[var(--primary)]/30 rounded-xl p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--primary)]/15 flex items-center justify-center">
          <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--primary)]">{message}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 text-[var(--primary)] hover:text-[var(--text)] transition-colors rounded-lg p-1 hover:bg-[var(--primary)]/10"
          aria-label={t('toast.dismiss')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <style jsx>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-slide-in-right { animation: none; }
        }
      `}</style>
    </div>
  );
}
