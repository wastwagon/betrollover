'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const urlError = searchParams.get('error');
  useEffect(() => {
    if (urlError) setError(decodeURIComponent(urlError));
  }, [urlError]);

  return (
    <div className="min-h-screen bg-[var(--bg)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <SiteHeader />
      <main className="relative flex flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-[var(--border)] p-8 md:p-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--text)]">Welcome back</h1>
            <p className="mt-2 text-[var(--text-muted)]">Sign in to access your dashboard</p>
          </div>
            <form action="/api/auth/login" method="POST" className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text)] mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--text)] mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--primary)] font-medium" role="alert">{error}</p>
            )}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/25 hover:shadow-xl hover:shadow-[var(--primary)]/30 hover:shadow-xl transition-all duration-300"
            >
              Sign In
            </button>
          </form>
          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[var(--primary)] font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
