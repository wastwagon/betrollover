'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
        },
      ) => number;
      reset: (id?: number) => void;
    };
  }
}

const SCRIPT_SRC = 'https://www.google.com/recaptcha/api.js?render=explicit';

export function getRecaptchaSiteKey(): string {
  return (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '').trim();
}

function loadRecaptchaScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.grecaptcha?.render) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[src^="https://www.google.com/recaptcha/api.js"]');
  if (existing) {
    return new Promise((resolve) => {
      if (window.grecaptcha?.render) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('reCAPTCHA failed to load'));
    document.head.appendChild(script);
  });
}

export function RecaptchaCheckbox({
  siteKey,
  hl = 'en',
  onToken,
}: {
  siteKey: string;
  hl?: string;
  onToken: (token: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey || !hostRef.current) return;
    let cancelled = false;

    const mount = async () => {
      try {
        await loadRecaptchaScript();
        if (cancelled || !hostRef.current || !window.grecaptcha) return;
        window.grecaptcha.ready(() => {
          if (cancelled || !hostRef.current || widgetIdRef.current != null) return;
          hostRef.current.innerHTML = '';
          widgetIdRef.current = window.grecaptcha!.render(hostRef.current, {
            sitekey: siteKey,
            callback: (token) => onTokenRef.current(token),
            'expired-callback': () => onTokenRef.current(''),
          });
        });
      } catch {
        /* widget stays empty; submit will fail server-side */
      }
    };

    void mount();
    return () => {
      cancelled = true;
      widgetIdRef.current = null;
    };
  }, [siteKey, hl]);

  if (!siteKey) return null;

  return (
    <div className="flex justify-center">
      <div ref={hostRef} className="h-[78px] w-[304px]" />
    </div>
  );
}

export function resetRecaptcha(): void {
  try {
    window.grecaptcha?.reset();
  } catch {
    /* ignore */
  }
}
