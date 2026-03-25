'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/context/LanguageContext';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { AppleSignInButton } from '@/components/AppleSignInButton';
import { getApiUrl } from '@/lib/site-config';
import { emitAuthStorageSync } from '@/lib/auth-storage-sync';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const [step, setStep] = useState<'email' | 'form'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const maxBirthDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  }, []);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('auth.otp_send_failed'));
      setOtpSent(true);
      setStep('form');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : t('auth.otp_send_failed'));
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          username,
          displayName: displayName.trim(),
          dateOfBirth,
          password,
          confirmPassword,
          otpCode,
          ...(referralCode.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
          ...(typeof sessionStorage !== 'undefined' && sessionStorage.getItem('br_session_id')
            ? { sessionId: sessionStorage.getItem('br_session_id') }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('auth.registration_failed'));
      try { (await import('@/lib/analytics')).trackEvent('registration_completed'); } catch { /* noop */ }
      localStorage.setItem('token', data.access_token);
      emitAuthStorageSync();
      const rawRedirect = searchParams.get('redirect');
      const safe =
        rawRedirect &&
        rawRedirect.startsWith('/') &&
        !rawRedirect.startsWith('//') &&
        !rawRedirect.includes('://')
          ? rawRedirect
          : '/dashboard';
      router.push(safe);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registration_failed'));
    } finally {
      setLoading(false);
    }
  }

  const inputBase =
    'w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/40 text-[var(--text)] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/15 transition-colors';
  const inputIcon = 'absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none';

  return (
    <div className="min-h-screen bg-[var(--bg)] relative">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.2]"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgb(16 185 129 / 0.12), transparent 55%)',
        }}
      />
      <UnifiedHeader />
      <main className="section-ux-register-main">
        <div className="relative w-full max-w-[440px]">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-sm shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-12px_rgb(0_0_0/0.08)] dark:shadow-[0_24px_48px_-12px_rgb(0_0_0/0.35)] px-8 py-10 sm:px-10 sm:py-11">
              <div className="text-center mb-9">
                <h1 className="text-[1.65rem] sm:text-3xl font-semibold text-[var(--text)] tracking-[-0.02em] leading-tight">
                  {t('auth.create_account')}
                </h1>
                <p className="mt-2.5 text-sm text-[var(--text-muted)] leading-relaxed">
                  {step === 'email' ? t('auth.verify_email_first') : t('auth.complete_registration')}
                </p>
              </div>

              <GoogleSignInButton variant="signup" className="mb-4" disabled={loading} />
              <AppleSignInButton variant="signup" className="mb-6" disabled={loading} />
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/80 dark:border-slate-600/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  <span className="px-3 bg-white/90 dark:bg-slate-900/60">{t('auth.or_continue_with')}</span>
                </div>
              </div>

              {step === 'email' ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-[var(--text)] mb-2">
                    {t('auth.email_label')}
                  </label>
                  <div className="relative">
                    <span className={inputIcon} aria-hidden>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className={inputBase}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {t('auth.otp_hint')}
                  </p>
                </div>
                {otpError && <p className="text-sm text-red-500" role="alert" aria-live="polite">{otpError}</p>}
                <button
                  type="submit"
                  disabled={otpLoading || !email.trim()}
                  className="w-full py-3.5 rounded-lg text-[15px] font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-45 disabled:pointer-events-none transition-colors"
                >
                  {otpLoading ? t('auth.sending') : t('auth.send_code')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full width: email badge + OTP */}
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-600/60 px-4 py-3 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-[var(--text)] font-medium truncate flex-1 min-w-0">{email}</span>
                  <span className="text-xs text-emerald-600 font-semibold shrink-0">✓ {t('auth.email_verified')}</span>
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-[var(--primary)] font-semibold hover:underline shrink-0"
                  >
                    {t('auth.change')}
                  </button>
                </div>
                <div>
                  <label htmlFor="otpCode" className="block text-sm font-semibold text-[var(--text)] mb-2">
                    {t('auth.verification_code')}
                  </label>
                  <div className="relative">
                    <span className={inputIcon} aria-hidden>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </span>
                    <input
                      id="otpCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      required
                      placeholder={t('auth.enter_6_digit')}
                      className={inputBase}
                    />
                  </div>
                  {otpError && <p className="mt-2 text-sm text-red-500" role="alert" aria-live="polite">{otpError}</p>}
                  <button
                    type="button"
                    onClick={async () => {
                      setOtpError('');
                      setOtpLoading(true);
                      try {
                        const res = await fetch(`${getApiUrl()}/auth/otp/send`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: email.trim().toLowerCase() }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.message || t('auth.otp_send_failed'));
                        setOtpError('');
                      } catch (err) {
                        setOtpError(err instanceof Error ? err.message : t('auth.otp_send_failed'));
                      } finally {
                        setOtpLoading(false);
                      }
                    }}
                    disabled={otpLoading}
                    className="mt-2 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline disabled:opacity-50 transition-colors"
                  >
                    {otpLoading ? t('auth.sending') : t('auth.resend_code')}
                  </button>
                </div>

                {/* Two-column grid for form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="username" className="block text-sm font-semibold text-[var(--text)] mb-2">
                      {t('auth.username_label')}
                    </label>
                    <div className="relative">
                      <span className={inputIcon} aria-hidden>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </span>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        minLength={3}
                        className={inputBase}
                        placeholder="e.g. johndoe"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-semibold text-[var(--text)] mb-2">
                      {t('auth.full_name')}
                    </label>
                    <div className="relative">
                      <span className={inputIcon} aria-hidden>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </span>
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        minLength={2}
                        className={inputBase}
                        placeholder={t('auth.full_name_placeholder')}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">{t('auth.name_hint')}</p>
                  </div>
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-[var(--text)] mb-2">
                      {t('auth.date_of_birth')}
                    </label>
                    <div className="relative">
                      <span className={inputIcon} aria-hidden>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </span>
                      <input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        required
                        max={maxBirthDate}
                        className={inputBase}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">{t('auth.must_be_18')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                      {t('auth.referral_optional')}
                    </label>
                    <div className="relative">
                      <span className={inputIcon} aria-hidden>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </span>
                      <input
                        type="text"
                        maxLength={20}
                        placeholder={t('auth.referral_placeholder')}
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className={inputBase}
                      />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">{t('auth.referral_hint')}</p>
                  </div>
                </div>

                {/* Full width: passwords */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-[var(--text)] mb-2">
                    {t('auth.password_label')}
                  </label>
                  <div className="relative">
                    <span className={inputIcon} aria-hidden>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </span>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className={`${inputBase} pr-12`}
                      placeholder={t('auth.password_placeholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--text)] transition-colors p-1 rounded-lg hover:bg-slate-100"
                      tabIndex={-1}
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
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[var(--text)] mb-2">
                    {t('auth.confirm_password_label')}
                  </label>
                  <div className="relative">
                    <span className={inputIcon} aria-hidden>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </span>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className={`${inputBase} pr-12`}
                      placeholder={t('auth.reenter_password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--text)] transition-colors p-1 rounded-lg hover:bg-slate-100"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? (
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
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{t('auth.passwords_no_match')}</p>
                  )}
                </div>
                {error && <p className="text-sm text-red-500 font-medium" role="alert" aria-live="polite">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !otpCode || !dateOfBirth || password !== confirmPassword}
                  className="w-full py-3.5 rounded-lg text-[15px] font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-45 disabled:pointer-events-none transition-colors"
                >
                  {loading ? t('auth.creating_account') : t('auth.register')}
                </button>
              </form>
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
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
