'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/context/LanguageContext';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { AppleSignInButton } from '@/components/AppleSignInButton';
import { emitAuthStorageSync } from '@/lib/auth-storage-sync';
import { trackRegistrationStartedOnce } from '@/lib/analytics';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const [referralCode, setReferralCode] = useState('');
  const loading = false;

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);

  useEffect(() => {
    trackRegistrationStartedOnce();
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Consume and clear short-lived oauth cookie if present to avoid stale cookie loops.
    const consumeSessionCookie = async () => {
      try {
        const res = await fetch('/api/auth/session-token', { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({ token: null }));
        const token = typeof data?.token === 'string' ? data.token.trim() : '';
        if (!token || cancelled) return;
        localStorage.setItem('token', token);
        emitAuthStorageSync();
        router.push('/dashboard');
        router.refresh();
      } catch {
        // Best-effort only.
      }
    };
    void consumeSessionCookie();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg)] relative w-full min-w-0 max-w-full overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.2]"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgb(16 185 129 / 0.12), transparent 55%)',
        }}
      />
      <UnifiedHeader />
      <main className="section-ux-register-main w-full min-w-0 max-w-full">
        <div className="relative w-full max-w-[440px] min-w-0 mx-auto px-4 sm:px-0">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-sm shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-12px_rgb(0_0_0/0.08)] dark:shadow-[0_24px_48px_-12px_rgb(0_0_0/0.35)] px-5 py-8 sm:px-10 sm:py-11 min-w-0 max-w-full">
              <div className="text-center mb-9">
                <h1 className="sr-only">{t('auth.register_cta')}</h1>
                <p className="text-base sm:text-lg font-medium text-[var(--text)] leading-relaxed">
                  {t('auth.register_subtitle')}
                </p>
              </div>

              <GoogleSignInButton variant="signup" className="mb-4" disabled={loading} />
              <AppleSignInButton variant="signup" className="mb-6" disabled={loading} />
              <p className="text-xs text-[var(--text-muted)] leading-relaxed text-center mb-6">
                {t('auth.terms_agree')}{' '}
                <Link href="/terms" className="text-[var(--primary)] hover:underline">
                  {t('auth.terms')}
                </Link>{' '}
                {t('common.and')}{' '}
                <Link href="/privacy" className="text-[var(--primary)] hover:underline">
                  {t('auth.privacy')}
                </Link>
                .
              </p>
              {!!referralCode && (
                <p className="text-xs text-[var(--text-muted)] text-center mb-4">
                  {t('auth.referral_code')}: <span className="font-semibold text-[var(--text)]">{referralCode}</span>
                </p>
              )}

            <p className="text-center text-sm text-[var(--text-muted)] mt-9 pt-7 border-t border-slate-100 dark:border-slate-700/80">
              {t('auth.already_have_account')}{' '}
              <Link href="/login" className="text-[var(--primary)] font-semibold hover:underline underline-offset-2">
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
