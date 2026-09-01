'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useT } from '@/context/LanguageContext';
import { AuthCard, AuthPageFallback, AuthShell } from '@/components/AuthShell';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function ForgotPasswordForm() {
    const t = useT();
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
            const res = await fetch(`${getApiUrl()}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(getApiErrorMessage(data, t('auth.send_reset_failed')));
            }

            setSuccess(getApiErrorMessage(data, t('auth.reset_sent')));
            setStep('reset');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('auth.server_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError(t('auth.passwords_mismatch'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${getApiUrl()}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(getApiErrorMessage(data, t('auth.reset_failed')));
            }

            setSuccess(t('auth.reset_success'));
            setStep('request'); // Reset to initial state or redirect
            setEmail('');
            setCode('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('auth.server_error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell>
            <AuthCard>
                        <div className="text-center mb-8">
                            <h1 className="font-display text-xl font-semibold text-[var(--text)]">
                                {step === 'request' ? t('auth.forgot_title') : t('auth.forgot_reset_title')}
                            </h1>
                            <p className="mt-2 text-[var(--text-muted)]">
                                {step === 'request' ? t('auth.forgot_desc') : t('auth.forgot_reset_desc')}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-[var(--destructive)]/10 text-[var(--destructive)] text-sm font-medium border border-[var(--destructive)]/20" role="alert" aria-live="polite">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-6 p-4 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] text-sm font-medium border border-[var(--primary)]/20" role="status" aria-live="polite">
                                {success}
                            </div>
                        )}

                        {step === 'request' ? (
                            <form onSubmit={handleRequestOtp} className="space-y-5 min-w-0">
                                <Input
                                    id="email"
                                    type="email"
                                    label={t('auth.email_label')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="px-4 py-3"
                                    placeholder="you@example.com"
                                />
                                <Button type="submit" fullWidth size="lg" disabled={loading}>
                                    {loading ? t('auth.sending') : t('auth.send_reset_code')}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-5 min-w-0">
                                <Input
                                    id="code"
                                    type="text"
                                    label={t('auth.reset_code')}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    required
                                    className="px-4 py-3"
                                    placeholder="123456"
                                />
                                <Input
                                    id="newPassword"
                                    type="password"
                                    label={t('auth.new_password')}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    className="px-4 py-3"
                                />
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    label={t('auth.confirm_password_label')}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="px-4 py-3"
                                />
                                <Button type="submit" fullWidth size="lg" disabled={loading}>
                                    {loading ? t('auth.resetting') : t('auth.reset_password_btn')}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setStep('request')}
                                    className="w-full py-2 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                                >
                                    {t('auth.back_to_request')}
                                </button>
                            </form>
                        )}

                        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
                            {t('auth.remember_password')}{' '}
                            <Link href="/login" className="text-[var(--primary)] font-medium hover:underline">
                                {t('auth.login')}
                            </Link>
                        </p>
            </AuthCard>
        </AuthShell>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={<AuthPageFallback />}>
            <ForgotPasswordForm />
        </Suspense>
    );
}
