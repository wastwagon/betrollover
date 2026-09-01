import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AccaFamilyNav } from '@/components/AccaFamilyNav';
import { AppFooter } from '@/components/AppFooter';
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
          <PageHeader label={t('rollover.label')} title={t('rollover.title')} tagline={t('rollover.tagline')} />
          <AccaFamilyNav current="climb" />
          <RolloverBoard />
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
