'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

function ForgotPasswordForm() {
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<'request' | 'reset'>('request');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const emailParam = searchParams.get('email');
        const codeParam = searchParams.get('code');
        if (emailParam) setEmail(emailParam);
        if (codeParam) {
            setCode(codeParam);
            setStep('reset');
        }
    }, [searchParams]);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to send reset code');

            setSuccess(data.message);
            setStep('reset');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to reset password');

            setSuccess('Password reset successful! You can now sign in.');
            setStep('request'); // Reset to initial state or redirect
            setEmail('');
            setCode('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message);
        } finally {
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
                            <h1 className="text-2xl font-bold text-[var(--text)]">
                                {step === 'request' ? 'Forgot Password' : 'Reset Password'}
                            </h1>
                            <p className="mt-2 text-[var(--text-muted)]">
                                {step === 'request'
                                    ? 'Enter your email to receive a reset code'
                                    : 'Enter the code sent to your email and your new password'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 italic">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-6 p-4 rounded-xl bg-green-50 text-green-600 text-sm font-medium border border-green-100 italic">
                                {success}
                            </div>
                        )}

                        {step === 'request' ? (
                            <form onSubmit={handleRequestOtp} className="space-y-5">
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
                                        className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/25 hover:shadow-xl hover:shadow-[var(--primary)]/30 transition-all duration-300 disabled:opacity-50"
                                >
                                    {loading ? 'Sending...' : 'Send Reset Code'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-5">
                                <div>
                                    <label htmlFor="code" className="block text-sm font-medium text-[var(--text)] mb-1.5">
                                        Reset Code
                                    </label>
                                    <input
                                        id="code"
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                                        placeholder="123456"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--text)] mb-1.5">
                                        New Password
                                    </label>
                                    <input
                                        id="newPassword"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
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
                                        className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/25 hover:shadow-xl hover:shadow-[var(--primary)]/30 transition-all duration-300 disabled:opacity-50"
                                >
                                    {loading ? 'Resetting...' : 'Reset Password'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep('request')}
                                    className="w-full py-2 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                                >
                                    Back to request
                                </button>
                            </form>
                        )}

                        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
                            Remember your password?{' '}
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

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" /></div>}>
            <ForgotPasswordForm />
        </Suspense>
    );
}
