'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/context/LanguageContext';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { AppleSignInButton } from '@/components/AppleSignInButton';
import { consumeOAuthSessionToken } from '@/lib/auth-token-storage';
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
        const token = await consumeOAuthSessionToken();
        if (!token || cancelled) return;
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
      <UnifiedHeader />
      <main className="section-ux-register-main w-full min-w-0 max-w-full pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="relative w-full max-w-[440px] min-w-0 mx-auto px-4 sm:px-0">
          <div className="rounded-2xl border border-[var(--separator)] bg-[var(--card)] px-5 py-8 sm:px-10 sm:py-11 min-w-0 max-w-full shadow-sm">
              <div className="text-center mb-8 sm:mb-9">
                <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] mb-2 sm:sr-only">
                  {t('auth.register_cta')}
                </h1>
                <p className="text-sm sm:text-base font-medium text-[var(--text-muted)] leading-relaxed">
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

            <p className="text-center text-sm text-[var(--text-muted)] mt-9 pt-7 border-t border-[var(--separator)]">
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
