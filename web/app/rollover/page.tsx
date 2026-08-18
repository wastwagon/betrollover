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
        <div className="section-ux-page-wide w-full min-w-0">
          <div className="lg:hidden -mx-1 mb-4">
            <NavBar title={t('nav.rollover')} backHref="/" backLabel={t('nav.home')} sticky={false} />
          </div>
          <div className="hidden lg:block mb-8">
            <PageHeader label={t('rollover.label')} title={t('rollover.title')} tagline={t('rollover.tagline')} />
          </div>
          <p className="lg:hidden text-[15px] text-[var(--text-muted)] leading-snug mb-6">{t('rollover.tagline')}</p>
          <RolloverBoard />
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
