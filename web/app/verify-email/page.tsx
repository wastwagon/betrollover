'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import { AuthCard, AuthPageFallback, AuthShell } from '@/components/AuthShell';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { Button, buttonClassName } from '@/components/ui/Button';
import { IconShield, IconWarning } from '@/components/ios/icons';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const t = useT();
  const [result, setResult] = useState<{ verified?: boolean; message?: unknown } | null>(null);
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
      .then((data: unknown) => setResult(data as { verified?: boolean; message?: unknown }))
      .catch(() => setResult({ verified: false, message: t('auth.verification_failed') }))
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
      setResendMessage(
        res.ok
          ? getApiErrorMessage(data, t('auth.verification_sent'))
          : getApiErrorMessage(data, t('auth.resend_failed')),
      );
    } catch {
      setResendMessage(t('auth.resend_failed'));
    } finally {
      setResendLoading(false);
    }
  };

  const verifiedSubtitle = result?.verified ? getApiErrorMessage(result, '') : '';
  return (
    <AuthShell>
      <AuthCard className="text-center">
        {loading ? (
          <div className="animate-pulse min-w-0">
            <div className="w-16 h-16 rounded-full bg-[var(--primary)]/20 mx-auto mb-6" />
            <p className="text-[var(--text-muted)]">{t('auth.verifying')}</p>
          </div>
        ) : result?.verified ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[var(--primary-light)] flex items-center justify-center mx-auto mb-6 text-[var(--primary)]">
              <IconShield className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-semibold text-[var(--text)] mb-2 min-w-0 break-words">{t('auth.email_verified_title')}</h1>
            {verifiedSubtitle ? (
              <p className="text-[var(--text-muted)] mb-8 min-w-0 break-words">{verifiedSubtitle}</p>
            ) : null}
            <Link
              href="/dashboard"
              className={buttonClassName({ className: 'inline-block' })}
            >
              {t('auth.go_dashboard')}
            </Link>
          </>
        ) : token ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[var(--destructive)]/10 flex items-center justify-center mx-auto mb-6 text-[var(--destructive)]">
              <IconWarning className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-semibold text-[var(--text)] mb-2 min-w-0 break-words">{t('auth.verification_failed')}</h1>
            <p className="text-[var(--text-muted)] mb-8 min-w-0 break-words">
              {result ? getApiErrorMessage(result, t('auth.invalid_token')) : t('auth.invalid_token')}
            </p>
            <Button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="mb-4"
            >
              {resendLoading ? t('auth.sending') : t('auth.resend_verification')}
            </Button>
            <br />
            <Link
              href="/login"
              className={buttonClassName({ variant: 'secondary', className: 'inline-block' })}
            >
              {t('auth.back_to_login')}
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-[var(--text)] mb-2 min-w-0 break-words">{t('auth.verify_title')}</h1>
            <p className="text-[var(--text-muted)] mb-6 min-w-0 break-words">
              {t('auth.verify_check_inbox')}
            </p>
            <Button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? t('auth.sending') : t('auth.resend_verification')}
            </Button>
            {resendMessage && <p className="mt-4 text-sm text-[var(--text-muted)]">{resendMessage}</p>}
            <p className="mt-6">
              <Link href="/login" className="text-sm text-[var(--primary)] hover:underline">
                {t('auth.back_to_login')}
              </Link>
            </p>
          </>
        )}
      </AuthCard>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
