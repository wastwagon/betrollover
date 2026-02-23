import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { getLocale, buildT } from '@/lib/i18n';

export const metadata = {
  title: 'Page Not Found | BetRollover',
  robots: { index: false },
};

export default async function NotFound() {
  const locale = await getLocale();
  const t = buildT(locale);

  const QUICK_LINKS = [
    { href: '/marketplace', icon: '🛒', labelKey: 'error.quick_marketplace', descKey: 'error.quick_marketplace_desc' },
    { href: '/tipsters', icon: '👥', labelKey: 'error.quick_tipsters', descKey: 'error.quick_tipsters_desc' },
    { href: '/leaderboard', icon: '🏆', labelKey: 'error.quick_leaderboard', descKey: 'error.quick_leaderboard_desc' },
    { href: '/news', icon: '📰', labelKey: 'error.quick_news', descKey: 'error.quick_news_desc' },
    { href: '/discover', icon: '🔍', labelKey: 'error.quick_discover', descKey: 'error.quick_discover_desc' },
    { href: '/create-pick', icon: '✏️', labelKey: 'error.quick_create', descKey: 'error.quick_create_desc' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <UnifiedHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="relative mb-6 select-none">
          <span className="text-[9rem] font-black text-[var(--border)] leading-none tracking-tighter">
            404
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-5xl">
            ⚽
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] mb-3 text-center">
          {t('error.off_side')}
        </h1>
        <p className="text-[var(--text-muted)] text-center max-w-md mb-10 leading-relaxed">
          {t('error.not_found_desc')}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg mb-10">
          {QUICK_LINKS.map(({ href, icon, labelKey, descKey }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-md transition-all text-center group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
              <span className="text-sm font-semibold text-[var(--text)]">{t(labelKey)}</span>
              <span className="text-[11px] text-[var(--text-muted)]">{t(descKey)}</span>
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className="px-8 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors text-sm"
        >
          {t('error.back_home')}
        </Link>
      </main>

      <AppFooter />
    </div>
  );
}
