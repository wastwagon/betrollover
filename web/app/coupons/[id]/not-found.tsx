import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { buttonClassName } from '@/components/ui/button-styles';
import { getLocale, buildT } from '@/lib/i18n';

export default async function CouponNotFound() {
  const t = buildT(await getLocale());
  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0">
      <UnifiedHeader />
      <main className="section-ux-empty w-full min-w-0 text-center px-4">
        <h1 className="text-lg font-semibold text-[var(--text)] mb-3">{t('pick_detail.not_found_title')}</h1>
        <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">{t('pick_detail.not_found_desc')}</p>
        <Link href="/marketplace" className={buttonClassName()}>
          {t('pick_detail.browse_picks_cta')}
        </Link>
      </main>
      <AppFooter />
    </div>
  );
}
