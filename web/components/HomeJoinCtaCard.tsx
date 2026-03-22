'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/context/LanguageContext';
import { AUTH_STORAGE_SYNC } from '@/lib/auth-storage-sync';

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
      <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-center items-center text-center border border-slate-600/50">
        <h3 className="text-lg font-semibold mb-1">{t('home.join_card_logged_title')}</h3>
        <p className="text-sm opacity-90 mb-4 leading-relaxed">{t('home.join_card_logged_sub')}</p>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-all shadow-md text-sm"
        >
          {t('home.join_card_logged_btn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-center items-center text-center">
      <h3 className="text-lg font-semibold mb-1">{t('home.join_cta')}</h3>
      <p className="text-sm opacity-85 mb-4 leading-relaxed">{t('home.join_subtitle')}</p>
      <Link
        href="/register"
        className="px-5 py-2.5 rounded-xl bg-white text-[var(--primary)] font-semibold hover:bg-gray-50 transition-all shadow-md text-sm"
      >
        {t('auth.register')} →
      </Link>
    </div>
  );
}
