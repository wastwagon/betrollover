'use client';

import { useEffect } from 'react';

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
      <h1 className="text-2xl font-bold text-[var(--text)]">Something went wrong</h1>
      <p className="mt-4 text-[var(--text-muted)] text-center max-w-md">
        We encountered an unexpected error. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-8 px-6 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all"
      >
        Try again
      </button>
    </div>
  );
}
