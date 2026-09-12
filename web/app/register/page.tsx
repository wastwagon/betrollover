'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage, useT } from '@/context/LanguageContext';
import { AuthCard, AuthPageFallback, AuthShell } from '@/components/AuthShell';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { AppleSignInButton } from '@/components/AppleSignInButton';
import { ApiErrorBanner } from '@/components/ApiErrorBanner';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { getApiUrl } from '@/lib/site-config';
import { consumeOAuthSessionToken, setAuthToken } from '@/lib/auth-token-storage';
import { trackEvent, trackRegistrationStartedOnce } from '@/lib/analytics';
import { Button } from '@/components/ui/Button';
import { Input, fieldControlClassName } from '@/components/ui/Input';
import {
  RecaptchaCheckbox,
  getRecaptchaSiteKey,
  resetRecaptcha,
} from '@/components/RecaptchaCheckbox';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const { lang } = useLanguage();
  const [referralCode, setReferralCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaSiteKey = getRecaptchaSiteKey();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);

  useEffect(() => {
    trackRegistrationStartedOnce();
  }, []);

  useEffect(() => {
    let cancelled = false;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError(t('auth.passwords_mismatch'));
      return;
    }
    if (recaptchaSiteKey && !recaptchaToken) {
      setError(t('auth.recaptcha_required'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          recaptchaToken: recaptchaToken || undefined,
          referralCode: referralCode || undefined,
        }),
      });
      const data = await res.json().catch(() => ({ message: 'Registration failed' }));
      if (!res.ok || typeof data?.access_token !== 'string' || !data.access_token.trim()) {
        resetRecaptcha();
        setRecaptchaToken('');
        setError(getApiErrorMessage(data, t('auth.server_error')));
        return;
      }
      if (!setAuthToken(data.access_token.trim())) {
        setError(t('auth.storage_unavailable'));
        return;
      }
      trackEvent('registration_completed', { method: 'email' }, data.access_token.trim());
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error('Register error:', err);
      resetRecaptcha();
      setRecaptchaToken('');
      setError(t('auth.server_error'));
    } finally {
      setLoading(false);
    }
  };

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
        <AppleSignInButton variant="signup" className="mb-2" disabled={loading} />

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--separator)]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-[var(--card)] text-[var(--text-muted)]">{t('auth.or_use_email')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
          <Input
            id="register-email"
            name="email"
            type="email"
            label={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
            className="min-h-[48px] px-4 py-3 text-base"
            placeholder="you@example.com"
          />
          <div className="min-w-0">
            <label htmlFor="register-password" className="block text-sm font-medium text-[var(--text)] mb-1.5">
              {t('auth.password')}
            </label>
            <div className="relative min-w-0">
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                disabled={loading}
                className={fieldControlClassName(undefined, 'min-h-[48px] px-4 py-3 pr-12 text-base')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 touch-target inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">{t('auth.password_hint')}</p>
          </div>
          <Input
            id="register-confirm-password"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            label={t('auth.confirm_password')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={loading}
            className="min-h-[48px] px-4 py-3 text-base"
          />
          <RecaptchaCheckbox
            siteKey={recaptchaSiteKey}
            hl={lang}
            onToken={setRecaptchaToken}
          />
          {error && (
            <ApiErrorBanner
              message={error}
              onRetry={() => setError('')}
              showHint
              className="mb-2"
            />
          )}
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={loading}
            leading={
              loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : undefined
            }
          >
            {loading ? t('auth.creating_account') : t('auth.register')}
          </Button>
        </form>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed text-center mt-5 mb-2">
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

        <p className="text-center text-sm text-[var(--text-muted)] mt-7 pt-7 border-t border-[var(--separator)]">
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
