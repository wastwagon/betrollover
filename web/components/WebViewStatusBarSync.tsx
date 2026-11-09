'use client';

import { useEffect } from 'react';
import { syncWebViewGoldStatusBar } from '@/lib/webview-status-bar';

/**
 * Turns the native WebViewGold status bar white to match the site header,
 * without rebuilding the iOS/Android wrapper apps.
 */
export function WebViewStatusBarSync() {
  useEffect(() => {
    syncWebViewGoldStatusBar();
    // WebViewGold may inject isDarkMode after first paint
    const t = window.setTimeout(() => syncWebViewGoldStatusBar(), 400);

    let mq: MediaQueryList | null = null;
    const onScheme = () => syncWebViewGoldStatusBar();
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', onScheme);
    } catch {
      /* ignore */
    }

    return () => {
      window.clearTimeout(t);
      try {
        mq?.removeEventListener('change', onScheme);
      } catch {
        /* ignore */
      }
    };
  }, []);

  return null;
}
