import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { DiscoverFamilyNav } from '@/components/DiscoverFamilyNav';
import { EducationRelatedLinks } from '@/components/EducationRelatedLinks';
import { GuidePanel, GuideStack, GuideStep } from '@/components/education/GuideChrome';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('guides.eval_meta_title');
  const description = t('guides.eval_meta_desc');
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: seoAlternates('/guides/evaluate-tipsters', locale),
    openGraph: {
      url: localizedUrl('/guides/evaluate-tipsters', locale),
      title,
      description,
    },
  };
}

export default async function EvaluateTipstersGuidePage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const checklist = [
    t('guides.eval_c1'),
    t('guides.eval_c2'),
    t('guides.eval_c3'),
    t('guides.eval_c4'),
    t('guides.eval_c5'),
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <PageHeader
          label={t('guides.eval_label')}
          title={t('guides.eval_title')}
          tagline={t('guides.eval_tagline')}
        />
        <DiscoverFamilyNav current="guides" />
        <EducationRelatedLinks current="evaluate" />
        <GuideStack>
          <GuidePanel>
            <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">{t('guides.eval_intro')}</p>
          </GuidePanel>
          <div>
            <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
              {t('guides.eval_checklist_h')}
            </h2>
            <GuideStack>
              {checklist.map((item, i) => (
                <GuideStep key={item} index={String(i + 1)} title={item} />
              ))}
            </GuideStack>
          </div>
          <GuideStep title={t('guides.eval_verify_h')}>
            <p>
              {t('guides.eval_verify_before')}{' '}
              <Link href="/tipsters">{t('guides.eval_profiles')}</Link>{' '}
              {t('guides.eval_verify_mid')}{' '}
              <Link href="/coupons/archive">{t('guides.eval_archive')}</Link>{' '}
              {t('guides.eval_verify_after')}
            </p>
          </GuideStep>
          <GuideStep title={t('guides.eval_risk_h')}>
            <p>{t('guides.eval_risk_body')}</p>
          </GuideStep>
        </GuideStack>
      </main>
      <AppFooter />
    </div>
  );
}
