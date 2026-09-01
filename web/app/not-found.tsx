import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { buttonClassName } from '@/components/ui/button-styles';
import { getLocale, buildT } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/translations/en';

export const metadata = {
  title: 'Page Not Found | BetRollover',
  robots: { index: false },
};

export default async function NotFound() {
  const locale = await getLocale();
  const t = buildT(locale);

  const QUICK_LINKS: { href: string; labelKey: TranslationKey; descKey: TranslationKey }[] = [
    { href: '/marketplace', labelKey: 'error.quick_marketplace', descKey: 'error.quick_marketplace_desc' },
    { href: '/tipsters', labelKey: 'error.quick_tipsters', descKey: 'error.quick_tipsters_desc' },
    { href: '/leaderboard', labelKey: 'error.quick_leaderboard', descKey: 'error.quick_leaderboard_desc' },
    { href: '/news', labelKey: 'error.quick_news', descKey: 'error.quick_news_desc' },
    { href: '/discover', labelKey: 'error.quick_discover', descKey: 'error.quick_discover_desc' },
    { href: '/create-pick', labelKey: 'error.quick_create', descKey: 'error.quick_create_desc' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 w-full min-w-0">
        <div className="relative mb-6 select-none">
          <span className="font-display text-[7rem] sm:text-[9rem] font-black text-[var(--border)] leading-none tracking-tighter">
            404
          </span>
        </div>

        <h1 className="text-lg sm:text-xl font-semibold text-[var(--text)] mb-3 text-center">
          {t('error.off_side')}
        </h1>
        <p className="text-[var(--text-muted)] text-center max-w-md mb-10 leading-relaxed">
          {t('error.not_found_desc')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-lg mb-10 min-w-0">
          {QUICK_LINKS.map(({ href, labelKey, descKey }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1.5 p-4 rounded-[var(--radius)] bg-[var(--card)] border border-[var(--separator)] hover:border-[var(--primary)] transition-colors text-center"
            >
              <span className="text-sm font-semibold text-[var(--text)]">{t(labelKey)}</span>
              <span className="text-[11px] text-[var(--text-muted)]">{t(descKey)}</span>
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className={buttonClassName()}
        >
          {t('error.back_home')}
        </Link>
      </main>

      <AppFooter />
    </div>
  );
}
