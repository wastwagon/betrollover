'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/context/LanguageContext';
import { AuthCard, AuthPageFallback, AuthShell } from '@/components/AuthShell';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { AppleSignInButton } from '@/components/AppleSignInButton';
import { consumeOAuthSessionToken } from '@/lib/auth-token-storage';
import { trackRegistrationStartedOnce } from '@/lib/analytics';
import { buttonClassName } from '@/components/ui/Button';

function RegisterEmailFallback() {
  const t = useT();
  const [hasOauth, setHasOauth] = useState(true);

  useEffect(() => {
    const google = !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
    const apple = !!(process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || process.env.APPLE_CLIENT_ID || '').trim();
    setHasOauth(google || apple);
  }, []);

  if (hasOauth) return null;

  return (
    <Link href="/login" className={buttonClassName({ variant: 'secondary', fullWidth: true, className: 'mb-6' })}>
      {t('auth.continue_with_email')}
    </Link>
  );
}

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
    <AuthShell>
      <AuthCard>
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
              <RegisterEmailFallback />
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
      </AuthCard>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
