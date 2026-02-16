'use client';

import { useEffect, useState } from 'react';
import { formatError } from '@/utils/errorMessages';

interface ErrorToastProps {
  error: unknown;
  onClose: () => void;
  duration?: number;
}

export function ErrorToast({ error, onClose, duration = 5000 }: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);

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
      className="fixed top-4 right-4 z-50 max-w-md animate-slide-in-right"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0">
          <span className="text-2xl">⚠️</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">Error</h4>
          <p className="text-sm text-red-800 dark:text-red-300">{errorMessage}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
          aria-label="Close error message"
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
