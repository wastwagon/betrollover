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
  const title = t('guides.meta_title');
  const description = t('guides.meta_desc');
  return {
    title,
    description,
    alternates: seoAlternates('/guides', locale),
    openGraph: {
      url: localizedUrl('/guides', locale),
      title,
      description,
    },
  };
}

export default async function GuidesIndexPage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const GUIDES = [
    {
      href: '/guides/escrow-refunds',
      title: t('guides.escrow_card_title'),
      summary: t('guides.escrow_card_summary'),
    },
    {
      href: '/guides/evaluate-tipsters',
      title: t('guides.eval_card_title'),
      summary: t('guides.eval_card_summary'),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <PageHeader
          label={t('guides.label')}
          title={t('guides.title')}
          tagline={t('guides.tagline')}
        />
        <DiscoverFamilyNav current="guides" />
        <EducationRelatedLinks current="guides" />

        <div className="space-y-4">
          {GUIDES.map((g) => (
            <article key={g.href} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="text-lg font-semibold text-[var(--text)]">{g.title}</h2>
              <p className="text-sm text-[var(--text-muted)] mt-2">{g.summary}</p>
              <Link href={g.href} className="inline-flex mt-3 text-sm font-semibold text-[var(--primary)] hover:underline">
                {t('guides.read')}
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-6 text-sm text-[var(--text-muted)]">
          {t('guides.library_note')}{' '}
          <Link href="/resources" className="font-semibold text-[var(--primary)] hover:underline">
            {t('guides.library_link')}
          </Link>
        </p>
      </main>
      <AppFooter />
    </div>
  );
}
