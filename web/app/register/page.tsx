'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { getApiUrl } from '@/lib/site-config';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'form'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      if (!res.ok) throw new Error(data.message || 'Failed to send code');
      setOtpSent(true);
      setStep('form');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Failed to send verification code');
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
          password,
          confirmPassword,
          otpCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      localStorage.setItem('token', data.access_token);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <UnifiedHeader />
      <main className="relative flex flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-[var(--border)] p-8 md:p-10">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[var(--text)]">Create your account</h1>
              <p className="mt-2 text-[var(--text-muted)]">
                {step === 'email' ? 'Verify your email first' : 'Complete your registration'}
              </p>
            </div>

            {step === 'email' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    We&apos;ll send a 6-digit verification code to this address.
                  </p>
                </div>
                {otpError && <p className="text-sm text-red-500">{otpError}</p>}
                <button
                  type="submit"
                  disabled={otpLoading || !email.trim()}
                  className="w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/25 hover:shadow-xl hover:shadow-[var(--primary)]/30 disabled:opacity-50 disabled:hover:shadow-lg transition-all duration-300"
                >
                  {otpLoading ? 'Sending...' : 'Send verification code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-lg bg-[var(--bg-muted)] px-3 py-2 text-sm text-[var(--text-muted)]">
                  Email verified: {email}
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="ml-2 text-[var(--primary)] hover:underline"
                  >
                    Change
                  </button>
                </div>
                <div>
                  <label htmlFor="otpCode" className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    Verification code
                  </label>
                  <input
                    id="otpCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                  />
                  {otpError && <p className="mt-1 text-sm text-red-500">{otpError}</p>}
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
                        if (!res.ok) throw new Error(data.message || 'Failed to resend');
                        setOtpError('');
                      } catch (err) {
                        setOtpError(err instanceof Error ? err.message : 'Failed to resend code');
                      } finally {
                        setOtpLoading(false);
                      }
                    }}
                    disabled={otpLoading}
                    className="mt-1 text-xs text-[var(--primary)] hover:underline disabled:opacity-50"
                  >
                    {otpLoading ? 'Sending...' : 'Resend code'}
                  </button>
                </div>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    minLength={2}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                    placeholder="e.g. John Doe"
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Letters, spaces and hyphens only
                  </p>
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                      placeholder="8+ chars, upper, lower, number, special (@$!%*?&)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                      tabIndex={-1}
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
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                      tabIndex={-1}
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
                    <p className="mt-1 text-sm text-red-500">Passwords do not match</p>
                  )}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !otpCode || password !== confirmPassword}
                  className="w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/25 hover:shadow-xl hover:shadow-[var(--primary)]/30 disabled:opacity-50 disabled:hover:shadow-lg transition-all duration-300"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            )}

            <p className="text-center text-sm text-[var(--text-muted)] mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-[var(--primary)] font-medium hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
