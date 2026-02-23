'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f8fafc' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Something went wrong</h1>
        <p style={{ marginTop: 16, color: '#64748b', textAlign: 'center', maxWidth: 400 }}>
          A critical error occurred. Please refresh the page or try again later.
        </p>
        <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              fontWeight: 600,
              background: '#0d9488',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              fontWeight: 600,
              border: '1px solid #e2e8f0',
              color: '#1e293b',
              textDecoration: 'none',
            }}
          >
            Go Home
          </a>
        </div>
      </body>
    </html>
  );
}
