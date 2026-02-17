'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const urlError = searchParams.get('error');
  useEffect(() => {
    if (urlError) setError(decodeURIComponent(urlError));
  }, [urlError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        redirect: 'follow', // Follow redirects automatically
      });

      // After redirect, check the final URL for error parameter
      const finalUrl = new URL(res.url);
      const errorParam = finalUrl.searchParams.get('error');

      if (errorParam) {
        setError(decodeURIComponent(errorParam));
        setLoading(false);
        return;
      }

      // Check if we're on the dashboard (success)
      if (finalUrl.pathname.includes('/dashboard')) {
        // Success - the API route handled the redirect
        window.location.href = res.url;
        return;
      }

      // Fallback: check response status
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Login failed' }));
        setError(data.message || 'Invalid email or password');
        setLoading(false);
        return;
      }

      // Default success case
      router.push('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to server. Please try again.');
      setLoading(false);
    }
  };

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
            <form onSubmit={handleSubmit} className="space-y-5">
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
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200 disabled:opacity-50"
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
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200 disabled:opacity-50"
                />
                <div className="flex justify-end mt-2">
                  <Link href="/forgot-password" className="text-sm text-[var(--primary)] hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600 font-medium" role="alert">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/25 hover:shadow-xl hover:shadow-[var(--primary)]/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
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
