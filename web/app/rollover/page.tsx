import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { NavBar } from '@/components/ios/NavBar';
import { RolloverBoard } from '@/components/RolloverBoard';
import { getLocale, buildT } from '@/lib/i18n';

export default async function RolloverPage() {
  const locale = await getLocale();
  const t = buildT(locale);

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="w-full min-w-0">
        <div className="section-ux-page w-full min-w-0">
          <div className="lg:hidden -mx-1 mb-3">
            <NavBar title={t('nav.rollover')} backHref="/" backLabel={t('nav.home')} sticky={false} />
          </div>
          <div className="hidden lg:block">
            <PageHeader label={t('rollover.label')} title={t('rollover.title')} tagline={t('rollover.tagline')} />
          </div>
          <p className="lg:hidden text-sm text-[var(--text-muted)] mb-4">{t('rollover.tagline')}</p>
          <RolloverBoard />
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
