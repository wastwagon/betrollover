import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6">
      <h1 className="text-6xl font-bold text-[var(--primary)]">404</h1>
      <p className="mt-4 text-xl text-[var(--text)]">Page not found</p>
      <p className="mt-2 text-[var(--text-muted)]">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <Link
        href="/"
        className="mt-8 px-6 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all"
      >
        Go Home
      </Link>
    </div>
  );
}
