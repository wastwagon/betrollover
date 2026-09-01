import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { DiscoverFamilyNav } from '@/components/DiscoverFamilyNav';
import { EducationRelatedLinks } from '@/components/EducationRelatedLinks';
import { buttonClassName } from '@/components/ui/button-styles';
import { SITE_NAME } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';

export default async function LearnPage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const glossary = [
    { term: t('learn.term_escrow'), def: t('learn.def_escrow') },
    { term: t('learn.term_roi'), def: t('learn.def_roi') },
    { term: t('learn.term_winrate'), def: t('learn.def_winrate') },
    { term: t('learn.term_acca'), def: t('learn.def_acca') },
    { term: t('learn.term_settlement'), def: t('learn.def_settlement') },
    { term: t('learn.term_void'), def: t('learn.def_void') },
    { term: t('learn.term_pick'), def: t('learn.def_pick') },
    { term: t('learn.term_tipster'), def: t('learn.def_tipster') },
  ];
  const evaluate = [
    { title: t('learn.eval_track_title'), desc: t('learn.eval_track_desc') },
    { title: t('learn.eval_consistency_title'), desc: t('learn.eval_consistency_desc') },
    { title: t('learn.eval_transparency_title'), desc: t('learn.eval_transparency_desc') },
    { title: t('learn.eval_price_title'), desc: t('learn.eval_price_desc') },
  ];
  const market = [
    { title: t('learn.market_football_title'), desc: t('learn.market_football_desc') },
    { title: t('learn.market_compare_title'), desc: t('learn.market_compare_desc') },
    { title: t('learn.market_free_title'), desc: t('learn.market_free_desc') },
    { title: t('learn.market_escrow_title'), desc: t('learn.market_escrow_desc') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="w-full min-w-0">
        <div className="section-ux-page w-full min-w-0">
          <PageHeader
            label={t('learn.education')}
            title={t('learn.page_title')}
            tagline={t('learn.page_intro', { site: SITE_NAME })}
          />
          <DiscoverFamilyNav current="learn" />
          <EducationRelatedLinks current="learn" />
          <article className="section-ux-prose min-w-0">
          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-12 leading-relaxed min-w-0">

            <section>
              <h2 className="text-xl font-semibold mb-4">{t('learn.section_platform')}</h2>
              <p>{t('learn.platform_p1', { site: SITE_NAME })}</p>
              <p>{t('learn.platform_p2')}</p>
              <p>
                {t('learn.platform_more_prefix')}{' '}
                <Link href="/how-it-works" className="text-[var(--primary)] hover:underline">{t('learn.cta_how_it_works')}</Link>
                {' '}{t('learn.platform_more_and')}{' '}
                <Link href="/how-it-works#faq" className="text-[var(--primary)] hover:underline">{t('how_it_works.faq_title')}</Link>.
              </p>
            </section>

            <section id="glossary">
              <h2 className="text-xl font-semibold mb-4">{t('learn.section_glossary')}</h2>
              <dl className="space-y-5 min-w-0">
                {glossary.map((item) => (
                  <div key={item.term}>
                    <dt className="font-semibold text-[var(--text)]">{item.term}</dt>
                    <dd className="mt-1 text-[var(--text-muted)]">{item.def}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">{t('learn.section_evaluate')}</h2>
              <p className="mb-4">{t('learn.evaluate_intro')}</p>
              <ul className="list-disc pl-6 space-y-2">
                {evaluate.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    {' — '}
                    {item.desc}
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                {t('learn.evaluate_footer_before')}{' '}
                <Link href="/leaderboard" className="text-[var(--primary)] hover:underline">{t('nav.leaderboard')}</Link>
                {' '}{t('learn.evaluate_footer_mid')}{' '}
                <Link href="/marketplace" className="text-[var(--primary)] hover:underline">{t('nav.marketplace')}</Link>
                {' '}{t('learn.evaluate_footer_after')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">{t('learn.section_marketplace')}</h2>
              <p className="mb-4">{t('learn.market_intro')}</p>
              <ul className="list-disc pl-6 space-y-2">
                {market.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    {' — '}
                    {item.desc}
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                {t('learn.market_footer_new')}{' '}
                <Link href="/how-it-works" className="text-[var(--primary)] hover:underline">{t('learn.cta_how_it_works')}</Link>
                {' '}{t('learn.market_footer_and')}{' '}
                <Link href="/how-it-works#faq" className="text-[var(--primary)] hover:underline">{t('how_it_works.faq_title')}</Link>
                {t('learn.market_footer_then')}{' '}
                <Link href="/marketplace" className="text-[var(--primary)] hover:underline">{t('nav.marketplace')}</Link>
                {' '}{t('learn.market_footer_or')}{' '}
                <Link href="/discover" className="text-[var(--primary)] hover:underline">{t('nav.discover')}</Link>
                {t('learn.market_footer_end')}
              </p>
            </section>

            <div className="mt-10 p-5 rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)]">
              <p className="font-display font-semibold text-[var(--text)] mb-3">{t('learn.cta_ready')}</p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Link
                  href="/marketplace"
                  className={buttonClassName({ className: 'w-full sm:w-auto' })}
                >
                  {t('learn.cta_marketplace')}
                </Link>
                <Link
                  href="/how-it-works"
                  className={buttonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}
                >
                  {t('learn.cta_how_it_works')}
                </Link>
                <Link
                  href="/guides"
                  className={buttonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}
                >
                  {t('learn.open_howtos')}
                </Link>
              </div>
            </div>
          </div>
        </article>
        </div>
        <div className="mt-16">
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
