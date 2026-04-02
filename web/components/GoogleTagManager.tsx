'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { getGtmContainerId } from '@/lib/site-config';

type WindowWithDataLayer = Window & { dataLayer?: Record<string, unknown>[] };

const GTM_ID = getGtmContainerId();

/**
 * Google Tag Manager (recommended): add GA4, Ads, etc. in the GTM UI.
 * Client navigations push `virtual_page_view` — use a Custom Event trigger in GTM to send GA4 page_view.
 */
export function GoogleTagManager() {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    if (!GTM_ID) return;
    const path = pathname || '/';
    if (prevPath.current === null) {
      prevPath.current = path;
      return;
    }
    if (prevPath.current === path) return;
    prevPath.current = path;
    const w = window as WindowWithDataLayer;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({
      event: 'virtual_page_view',
      page_path: path,
      page_title: typeof document !== 'undefined' ? document.title : '',
      page_location: typeof window !== 'undefined' ? window.location.href : '',
    });
  }, [pathname]);

  if (!GTM_ID) return null;

  return (
    <Script id="google-tag-manager" strategy="afterInteractive">
      {`
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GTM_ID}');
      `}
    </Script>
  );
}
