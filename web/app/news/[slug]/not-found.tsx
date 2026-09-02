import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { IconBook } from '@/components/ios/icons';
import { buttonClassName } from '@/components/ui/button-styles';
import { getLocale, buildT } from '@/lib/i18n';

export default async function NewsArticleNotFound() {
  const locale = await getLocale();
  const t = buildT(locale);
  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-empty w-full min-w-0 px-4 sm:px-0">
        <IconBook className="w-14 h-14 mx-auto mb-4 text-[var(--text-muted)] opacity-50" aria-hidden />
        <h1 className="text-lg font-semibold text-[var(--text)] mb-3">{t('news.article_not_found')}</h1>
        <p className="text-[var(--text-muted)] mb-6">{t('news.article_not_found_desc')}</p>
        <Link href="/news" className={buttonClassName({ className: 'inline-flex' })}>
          {t('news.back_to_news')}
        </Link>
      </main>
      <AppFooter />
    </div>
  );
}
