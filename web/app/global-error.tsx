'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Catches errors in the root layout. Must render its own <html> and <body>
 * because the root layout may have failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error?.message || error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc', color: '#1e293b' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, textAlign: 'center' }}>
            The app encountered an error. Try refreshing the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              fontWeight: 600,
              background: '#10b981',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{ marginTop: 12, fontSize: 14, color: '#10b981', textDecoration: 'underline' }}
          >
            Go home
          </Link>
        </div>
      </body>
    </html>
  );
}
