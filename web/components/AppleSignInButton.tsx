'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/context/LanguageContext';
import { trackRegistrationStartedOnce } from '@/lib/analytics';

type Variant = 'signin' | 'signup';

interface AppleSignInButtonProps {
  variant?: Variant;
  className?: string;
  disabled?: boolean;
}

/** Sign in with Apple: full-page navigation to /api/auth/apple (must not use Next.js Link to avoid fetch/CORS). */
export function AppleSignInButton({
  variant = 'signin',
  className = '',
  disabled = false,
}: AppleSignInButtonProps) {
  const t = useT();
  const [clientId, setClientId] = useState('');
  // Set clientId only after mount to avoid server/client hydration mismatch (React #418)
  useEffect(() => {
    setClientId(process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || process.env.APPLE_CLIENT_ID || '');
  }, []);
  if (!clientId?.trim()) return null;

  const label = variant === 'signup' ? t('auth.sign_up_with_apple') : t('auth.sign_in_with_apple');

  return (
    <a
      href="/api/auth/apple"
      onClick={() => {
        if (variant === 'signup') trackRegistrationStartedOnce();
      }}
      className={`min-h-[44px] w-full flex items-center justify-center gap-2 rounded-xl border-2 border-black bg-black text-white font-medium hover:bg-gray-900 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:pointer-events-none ${className}`}
      style={{ opacity: disabled ? 0.7 : 1 }}
      aria-label={label}
    >
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-1.26 1.86-2.89 3.64-4.77 5.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.2 2.58-3.34 4.5-3.74 4.25z" />
      </svg>
      <span>{label}</span>
    </a>
  );
}
