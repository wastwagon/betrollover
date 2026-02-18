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
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold text-[var(--text)]">Something went wrong</h1>
      <p className="mt-4 text-[var(--text-muted)] text-center max-w-md">
        We encountered an unexpected error. Please try again or return to the homepage.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card)] transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
