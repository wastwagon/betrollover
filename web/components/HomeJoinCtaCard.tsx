'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/context/LanguageContext';
import { AUTH_STORAGE_SYNC } from '@/lib/auth-storage-sync';
import { Surface } from '@/components/ui/Surface';

/** Home marketing card: register for guests, dashboard CTA when already signed in. */
export function HomeJoinCtaCard() {
  const t = useT();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const sync = () => setLoggedIn(!!(typeof window !== 'undefined' && localStorage.getItem('token')));
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === null) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(AUTH_STORAGE_SYNC, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(AUTH_STORAGE_SYNC, sync);
    };
  }, [pathname]);

  if (loggedIn) {
    return (
      <Surface
        variant="flat"
        padding="md"
        className="!bg-[var(--text)] !border-[var(--text)] text-[var(--card)] flex flex-col justify-center items-center text-center"
      >
        <h3 className="font-display text-lg font-semibold mb-1">{t('home.join_card_logged_title')}</h3>
        <p className="text-sm opacity-85 mb-4 leading-relaxed">{t('home.join_card_logged_sub')}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-[var(--radius)] bg-[var(--card)] text-[var(--text)] font-semibold text-sm min-h-[44px]"
        >
          {t('home.join_card_logged_btn')}
        </Link>
      </Surface>
    );
  }

  return (
    <Surface
      variant="flat"
      padding="md"
      className="!bg-[var(--primary)] !border-[var(--primary)] text-white flex flex-col justify-center items-center text-center"
    >
      <h3 className="font-display text-lg font-semibold mb-1">{t('home.join_cta')}</h3>
      <p className="text-sm opacity-90 mb-4 leading-relaxed">{t('home.join_subtitle')}</p>
      <Link
        href="/register"
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-[var(--radius)] bg-white text-[var(--primary)] font-semibold text-sm min-h-[44px]"
      >
        {t('auth.register')}
      </Link>
    </Surface>
  );
}
