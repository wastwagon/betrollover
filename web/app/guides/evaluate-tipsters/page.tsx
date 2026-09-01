import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { DiscoverFamilyNav } from '@/components/DiscoverFamilyNav';
import { EducationRelatedLinks } from '@/components/EducationRelatedLinks';
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
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.eval_intro')}
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.eval_checklist_h')}</h2>
          <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-[var(--text-muted)]">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2 className="text-lg font-semibold mt-6">{t('guides.eval_verify_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.eval_verify_before')}{' '}
            <Link href="/tipsters" className="text-[var(--primary)] hover:underline">
              {t('guides.eval_profiles')}
            </Link>{' '}
            {t('guides.eval_verify_mid')}{' '}
            <Link href="/coupons/archive" className="text-[var(--primary)] hover:underline">
              {t('guides.eval_archive')}
            </Link>{' '}
            {t('guides.eval_verify_after')}
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.eval_risk_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.eval_risk_body')}
          </p>
        </article>
      </main>
      <AppFooter />
    </div>
  );
}
