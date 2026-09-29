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
import {
  LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING,
  LEADERBOARD_MIN_SETTLED_WEEKLY,
  TIPSTER_ACTIVE_WITHIN_DAYS,
  TIPSTER_FORM_POST_CAP,
} from '@betrollover/shared-types';

const GUIDE_PATH = '/guides/leaderboard-ranking';

function rankVars() {
  return {
    days: String(TIPSTER_ACTIVE_WITHIN_DAYS),
    cap: String(TIPSTER_FORM_POST_CAP),
    n: String(LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING),
    nWeek: String(LEADERBOARD_MIN_SETTLED_WEEKLY),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('guides.board_meta_title');
  const description = t('guides.board_meta_desc');
  return {
    title,
    description,
    alternates: seoAlternates(GUIDE_PATH, locale),
    openGraph: {
      url: localizedUrl(GUIDE_PATH, locale),
      title,
      description,
    },
  };
}

export default async function LeaderboardRankingGuidePage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const vars = rankVars();
  const faqs = [
    { question: t('guides.board_faq_q1'), answer: t('guides.board_faq_a1', vars) },
    { question: t('guides.board_faq_q2'), answer: t('guides.board_faq_a2', vars) },
    { question: t('guides.board_faq_q3'), answer: t('guides.board_faq_a3') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <PageHeader
          label={t('guides.board_label')}
          title={t('guides.board_title')}
          tagline={t('guides.board_tagline')}
        />
        <DiscoverFamilyNav current="guides" />
        <EducationRelatedLinks current="board" />
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.board_intro')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.board_who_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.board_who_body', vars)}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.board_order_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.board_order_body', vars)}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.board_period_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.board_period_body', vars)}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.board_check_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.board_check_before')}{' '}
            <Link href="/leaderboard" className="text-[var(--primary)] hover:underline">
              {t('nav.leaderboard')}
            </Link>{' '}
            {t('guides.board_check_mid')}{' '}
            <Link href="/coupons/archive" className="text-[var(--primary)] hover:underline">
              {t('guides.eval_archive')}
            </Link>{' '}
            {t('guides.board_check_after')}
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('how_it_works.faq_title')}</h2>
          <dl className="mt-3 space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <dt className="text-sm font-semibold">{faq.question}</dt>
                <dd className="mt-1 text-sm text-[var(--text-muted)] leading-relaxed">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </article>
      </main>
      <AppFooter />
    </div>
  );
}
