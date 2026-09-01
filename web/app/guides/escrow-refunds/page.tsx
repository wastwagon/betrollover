import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { DiscoverFamilyNav } from '@/components/DiscoverFamilyNav';
import { EducationRelatedLinks } from '@/components/EducationRelatedLinks';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('guides.escrow_meta_title');
  const description = t('guides.escrow_meta_desc');
  return {
    title,
    description,
    alternates: seoAlternates('/guides/escrow-refunds', locale),
    openGraph: {
      url: localizedUrl('/guides/escrow-refunds', locale),
      title,
      description,
    },
  };
}

export default async function EscrowRefundsGuidePage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const faqs = [
    { question: t('guides.escrow_faq_q1'), answer: t('guides.escrow_faq_a1') },
    { question: t('guides.escrow_faq_q2'), answer: t('guides.escrow_faq_a2') },
    { question: t('guides.escrow_faq_q3'), answer: t('guides.escrow_faq_a3') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <PageHeader
          label={t('guides.escrow_label')}
          title={t('guides.escrow_title')}
          tagline={t('guides.escrow_tagline')}
        />
        <DiscoverFamilyNav current="guides" />
        <EducationRelatedLinks current="escrow" />
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          <h2 className="text-lg font-semibold">{t('guides.escrow_s1_title')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.escrow_s1_body')}
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.escrow_s2_title')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.escrow_s2_body')}
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.escrow_s3_title')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.escrow_s3_body_before')}{' '}
            <Link href="/wallet" className="text-[var(--primary)] hover:underline">
              {t('nav.wallet')}
            </Link>{' '}
            {t('guides.escrow_s3_body_and')}{' '}
            <Link href="/my-purchases" className="text-[var(--primary)] hover:underline">
              {t('nav.purchases')}
            </Link>
            .
          </p>

          <div className="mt-7 rounded-xl border border-[var(--primary)]/25 bg-[var(--primary-light)] p-4">
            <p className="text-xs text-[var(--text)] leading-relaxed">
              {t('guides.escrow_callout')}
            </p>
          </div>
        </article>
      </main>
      <AppFooter />
    </div>
  );
}
