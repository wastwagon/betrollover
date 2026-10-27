'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { buttonClassName } from '@/components/ui/button-styles';

/** Avoid leaving crawlers on a bare 500 — offer recovery links (status may still be 500). */
export default function NewsArticleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('News article render error', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-lg font-semibold text-[var(--text)] mb-2">This article could not be loaded</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md">
        The page may have been removed or there was a temporary server issue. Try again or browse current news.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button type="button" onClick={reset} className={buttonClassName({ variant: 'secondary' })}>
          Try again
        </button>
        <Link href="/news" className={buttonClassName()}>
          All news
        </Link>
      </div>
    </div>
  );
}
