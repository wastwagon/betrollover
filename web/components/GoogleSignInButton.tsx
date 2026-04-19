'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useT } from '@/context/LanguageContext';
import { trackRegistrationStartedOnce } from '@/lib/analytics';
import { isLikelyEmbeddedWebView } from '@/lib/webview-context';

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

function GoogleGMark({ className = 'w-5 h-5 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  variant = 'signin',
  redirect,
  className = '',
  disabled = false,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState('');
  const [preferRedirect, setPreferRedirect] = useState(false);
  const t = useT();

  const forceRedirect =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GOOGLE_WEBVIEW_USE_REDIRECT === '1';

  useEffect(() => {
    setClientId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '');
  }, []);

  useEffect(() => {
    if (!clientId?.trim()) return;
    if (forceRedirect) {
      setPreferRedirect(true);
      return;
    }
    if (isLikelyEmbeddedWebView()) setPreferRedirect(true);
  }, [clientId, forceRedirect]);

  useEffect(() => {
    if (preferRedirect || !clientId?.trim()) return;
    const id = window.setTimeout(() => {
      const el = containerRef.current;
      if (!el || el.children.length > 0) return;
      setPreferRedirect(true);
    }, 3500);
    return () => window.clearTimeout(id);
  }, [preferRedirect, clientId]);

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      if (variant === 'signup') trackRegistrationStartedOnce();
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
        if (res.url && (res.url.includes('/dashboard') || res.url.includes('/login'))) {
          window.location.href = res.url;
          return;
        }
        const url = new URL(res.url);
        const errParam = url.searchParams.get('error');
        setError(errParam ? decodeURIComponent(errParam) : 'Sign-in failed');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sign-in failed');
      } finally {
        setLoading(false);
      }
    },
    [variant, redirect],
  );

  useEffect(() => {
    if (!clientId?.trim() || preferRedirect) return;

    if (window.google?.accounts?.id) {
      setScriptReady(true);
      return;
    }

    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      const onLoad = () => setScriptReady(true);
      existing.addEventListener('load', onLoad);
      if ((existing as HTMLScriptElement).getAttribute('data-loaded') === 'true') setScriptReady(true);
      return () => existing.removeEventListener('load', onLoad);
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
  }, [clientId, preferRedirect]);

  useEffect(() => {
    if (preferRedirect || !scriptReady || !clientId || !window.google?.accounts?.id) return;
    const el = containerRef.current;
    if (!el) return;

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const paint = () => {
      if (!el.isConnected || !window.google?.accounts?.id) return;
      const w = Math.max(Math.round(el.getBoundingClientRect().width) || el.offsetWidth || 0, 320);
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        auto_select: false,
      });
      el.innerHTML = '';
      window.google.accounts.id.renderButton(el, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: variant === 'signup' ? 'signup_with' : 'signin_with',
        width: w,
      });
    };

    const schedule = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        paint();
      }, 80);
    };

    schedule();
    const ro = new ResizeObserver(() => schedule());
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (debounce) clearTimeout(debounce);
    };
  }, [scriptReady, clientId, variant, preferRedirect, handleCredential]);

  if (!clientId?.trim()) return null;

  const startHref = `/api/auth/google/start${redirect ? `?next=${encodeURIComponent(redirect)}` : ''}`;
  const label = variant === 'signup' ? t('auth.sign_up_with_google') : t('auth.sign_in_with_google');

  return (
    <div className={className}>
      {preferRedirect ? (
        <div className="space-y-2">
          <p className="text-center text-xs text-[var(--text-muted)] leading-snug">{t('auth.google_webview_hint')}</p>
          <a
            href={startHref}
            className="min-h-[44px] w-full flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--border)] bg-white dark:bg-slate-900 text-[var(--text)] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 transition-colors"
            style={{ opacity: disabled ? 0.7 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
            aria-label={label}
          >
            <GoogleGMark />
            <span>{label}</span>
          </a>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="min-h-[44px] w-full flex items-center justify-center [&>div]:!w-full [&>div]:!flex [&>div]:!justify-center"
          style={{ opacity: disabled || loading ? 0.7 : 1, pointerEvents: disabled || loading ? 'none' : 'auto' }}
        />
      )}
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
