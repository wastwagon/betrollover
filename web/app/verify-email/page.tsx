'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import { AppShell } from '@/components/AppShell';
import { getApiUrl } from '@/lib/site-config';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const t = useT();
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
    fetch(`${getApiUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => setResult(data))
      .catch(() => setResult({ verified: false, message: 'Verification failed' }))
      .finally(() => setLoading(false));
  }, [token]);

  const handleResend = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setResendMessage(t('auth.login_to_resend'));
      return;
    }
    setResendLoading(true);
    setResendMessage(null);
    try {
      const res = await fetch(`${getApiUrl()}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResendMessage(res.ok ? (data.message || t('auth.verification_sent')) : (data.message || t('auth.resend_failed')));
    } catch {
      setResendMessage(t('auth.resend_failed'));
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
            <p className="text-[var(--text-muted)]">{t('auth.verifying')}</p>
          </div>
        ) : result?.verified ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6 text-3xl">
              ✓
            </div>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">{t('auth.email_verified_title')}</h1>
            <p className="text-[var(--text-muted)] mb-8">{result.message}</p>
            <Link
              href="/dashboard"
              className="inline-block px-8 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
            >
              {t('auth.go_dashboard')}
            </Link>
          </>
        ) : token ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6 text-3xl">
              ✕
            </div>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">{t('auth.verification_failed')}</h1>
            <p className="text-[var(--text-muted)] mb-8">{result?.message || t('auth.invalid_token')}</p>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="mb-4 px-6 py-2 rounded-lg font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {resendLoading ? t('auth.sending') : t('auth.resend_verification')}
            </button>
            <br />
            <Link
              href="/login"
              className="inline-block px-8 py-3 rounded-xl font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card)]"
            >
              {t('auth.back_to_login')}
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">{t('auth.verify_title')}</h1>
            <p className="text-[var(--text-muted)] mb-6">
              {t('auth.verify_check_inbox')}
            </p>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="px-8 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {resendLoading ? t('auth.sending') : t('auth.resend_verification')}
            </button>
            {resendMessage && <p className="mt-4 text-sm text-[var(--text-muted)]">{resendMessage}</p>}
            <p className="mt-6">
              <Link href="/login" className="text-sm text-[var(--primary)] hover:underline">
                {t('auth.back_to_login')}
              </Link>
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="max-w-md mx-auto px-4 py-20 text-center">
            <div className="animate-pulse">
              <div className="w-16 h-16 rounded-full bg-[var(--primary)]/20 mx-auto mb-6" />
              <p className="text-[var(--text-muted)]">Loading...</p>
            </div>
          </div>
        </AppShell>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
