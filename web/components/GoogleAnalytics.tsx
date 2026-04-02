'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { getGaMeasurementId } from '@/lib/site-config';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA_ID = getGaMeasurementId();

/**
 * Direct GA4 via gtag (fallback when GTM is not configured).
 * Prefer `NEXT_PUBLIC_GTM_ID` + GA4 tag in GTM for the recommended setup.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    if (!GA_ID) return;
    const path = pathname || '/';
    if (prevPath.current === null) {
      prevPath.current = path;
      return;
    }
    if (prevPath.current === path) return;
    prevPath.current = path;
    window.gtag?.('config', GA_ID, { page_path: path });
  }, [pathname]);

  if (!GA_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
