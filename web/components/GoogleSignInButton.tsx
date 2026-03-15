'use client';

import { useRef, useEffect, useState } from 'react';
import { useT } from '@/context/LanguageContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';

type Variant = 'signin' | 'signup';

interface GoogleSignInButtonProps {
  variant?: Variant;
  redirect?: string;
  className?: string;
  disabled?: boolean;
}

export function GoogleSignInButton({
  variant = 'signin',
  redirect,
  className = '',
  disabled = false,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState('');
  const t = useT();

  // Set clientId only after mount to avoid server/client hydration mismatch (React #418)
  useEffect(() => {
    setClientId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '');
  }, []);

  useEffect(() => {
    if (!clientId?.trim()) return;

    if (window.google?.accounts?.id) {
      setScriptReady(true);
      return;
    }

    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => setScriptReady(true));
      if ((existing as HTMLScriptElement).getAttribute('data-loaded') === 'true') setScriptReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      (script as HTMLScriptElement & { 'data-loaded'?: string }).setAttribute('data-loaded', 'true');
      setScriptReady(true);
    };
    document.head.appendChild(script);
    return () => {};
  }, [clientId]);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !clientId || !window.google?.accounts?.id || renderedRef.current) return;
    renderedRef.current = true;

    const handleCredential = async (response: { credential: string }) => {
      setError('');
      setLoading(true);
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_token: response.credential,
            ...(redirect ? { redirect } : {}),
          }),
          redirect: 'follow',
        });
        if (res.url && (res.url.includes('token=') || res.url.includes('/dashboard'))) {
          window.location.href = res.url;
          return;
        }
        const url = new URL(res.url);
        const err = url.searchParams.get('error');
        setError(err ? decodeURIComponent(err) : 'Sign-in failed');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sign-in failed');
      } finally {
        setLoading(false);
      }
    };

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredential,
      auto_select: false,
    });

    window.google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: variant === 'signup' ? 'signup_with' : 'signin_with',
      width: containerRef.current.offsetWidth || 320,
    });
  }, [scriptReady, clientId, variant, redirect]);

  if (!clientId?.trim()) return null;

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="min-h-[44px] flex items-center justify-center [&>div]:!w-full [&>div]:!flex [&>div]:!justify-center"
        style={{ opacity: disabled || loading ? 0.7 : 1, pointerEvents: disabled || loading ? 'none' : 'auto' }}
      />
      {loading && (
        <p className="text-center text-sm text-[var(--text-muted)] mt-2">
          {variant === 'signup' ? t('auth.creating_account') : t('auth.signing_in')}
        </p>
      )}
      {error && (
        <p className="text-center text-sm text-red-600 mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
