'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/otp/send`, {
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
      const res = await fetch(`${API_URL}/auth/register`, {
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
      <SiteHeader />
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
                        const res = await fetch(`${API_URL}/auth/otp/send`, {
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
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                    placeholder="8+ chars, upper, lower, number, special (@$!%*?&)"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                    placeholder="Re-enter password"
                  />
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
