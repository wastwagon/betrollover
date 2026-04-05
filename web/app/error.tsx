'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console or error reporting (e.g. Sentry) in dev/prod
    console.error('Route error:', error?.message || error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-12 w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="max-w-md w-full min-w-0 text-center space-y-6">
        <h1 className="text-xl font-bold text-[var(--text)]">Something went wrong</h1>
        <p className="text-sm text-[var(--text-muted)]">
          We hit an error loading this page. You can try again or go back home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2.5 rounded-xl font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-warm)] transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
