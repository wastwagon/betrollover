'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [result, setResult] = useState<{ verified: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setResult(null);
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => setResult(data))
      .catch(() => setResult({ verified: false, message: 'Verification failed' }))
      .finally(() => setLoading(false));
  }, [token]);

  const handleResend = async () => {
    const t = localStorage.getItem('token');
    if (!t) {
      setResendMessage('Please log in to resend the verification email.');
      return;
    }
    setResendLoading(true);
    setResendMessage(null);
    try {
      const res = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setResendMessage(res.ok ? (data.message || 'Verification email sent. Check your inbox.') : (data.message || 'Failed to resend'));
    } catch {
      setResendMessage('Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        {loading ? (
          <div className="animate-pulse">
            <div className="w-16 h-16 rounded-full bg-[var(--primary)]/20 mx-auto mb-6" />
            <p className="text-[var(--text-muted)]">Verifying your email...</p>
          </div>
        ) : result?.verified ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6 text-3xl">
              ✓
            </div>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Email Verified</h1>
            <p className="text-[var(--text-muted)] mb-8">{result.message}</p>
            <Link
              href="/dashboard"
              className="inline-block px-8 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
            >
              Go to Dashboard
            </Link>
          </>
        ) : token ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6 text-3xl">
              ✕
            </div>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Verification Failed</h1>
            <p className="text-[var(--text-muted)] mb-8">{result?.message || 'Invalid or expired token'}</p>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="mb-4 px-6 py-2 rounded-lg font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {resendLoading ? 'Sending...' : 'Resend verification email'}
            </button>
            <br />
            <Link
              href="/login"
              className="inline-block px-8 py-3 rounded-xl font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card)]"
            >
              Back to Login
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Verify Your Email</h1>
            <p className="text-[var(--text-muted)] mb-6">
              Check your inbox for the verification link, or resend it below.
            </p>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="px-8 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {resendLoading ? 'Sending...' : 'Resend verification email'}
            </button>
            {resendMessage && <p className="mt-4 text-sm text-[var(--text-muted)]">{resendMessage}</p>}
            <p className="mt-6">
              <Link href="/login" className="text-sm text-[var(--primary)] hover:underline">
                Back to Login
              </Link>
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
