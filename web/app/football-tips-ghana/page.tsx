import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { buttonClassName } from '@/components/ui/button-styles';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import { metaKeywordsFromTranslation } from '@/lib/seo/meta-keywords';
import { couponDisplayTitle, type PublicCouponMeta } from '@/lib/seo/public-content';
import { getServerBackendOrigin } from '@/lib/seo/server-backend';
import { fetchLiveScoresHub } from '@/lib/seo/hub-public-data';

const PATH = '/football-tips-ghana';

type GhanaFixtureRow = {
  id: number;
  home: string;
  away: string;
  league: string;
  kickoff?: string;
};

function fixtureLabel(row: Record<string, unknown>): GhanaFixtureRow | null {
  const id = Number(row.id ?? row.fixtureId);
  if (!Number.isFinite(id) || id < 1) return null;
  const home =
    (typeof row.homeTeamName === 'string' && row.homeTeamName) ||
    (typeof row.home === 'string' && row.home) ||
    '';
  const away =
    (typeof row.awayTeamName === 'string' && row.awayTeamName) ||
    (typeof row.away === 'string' && row.away) ||
    '';
  const league =
    (typeof row.leagueName === 'string' && row.leagueName) ||
    (typeof row.league === 'string' && row.league) ||
    '';
  if (!/ghana/i.test(league)) return null;
  if (!home || !away) return null;
  const kickoff =
    (typeof row.matchDate === 'string' && row.matchDate) ||
    (typeof row.kickoff === 'string' && row.kickoff) ||
    undefined;
  return { id, home, away, league, kickoff };
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('ghana_hub.meta_title');
  const description = t('ghana_hub.meta_desc');
  return {
    title,
    description,
    keywords: metaKeywordsFromTranslation(t('ghana_hub.meta_keywords')),
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    alternates: seoAlternates(PATH, locale),
    openGraph: {
      url: localizedUrl(PATH, locale),
      title,
      description,
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

async function fetchLatestSettledPicks(limit = 10): Promise<PublicCouponMeta[]> {
  try {
    const res = await fetch(`${getServerBackendOrigin()}/api/v1/accumulators/archive?limit=${limit}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return items.slice(0, limit) as PublicCouponMeta[];
  } catch {
    return [];
  }
}

export default async function FootballTipsGhanaPage() {
  const t = buildT(await getLocale());
  const [settled, liveScores] = await Promise.all([
    fetchLatestSettledPicks(10),
    fetchLiveScoresHub(60),
  ]);
  const ghanaFixtures: GhanaFixtureRow[] = [];
  if (liveScores) {
    for (const bucket of [liveScores.live, liveScores.upcoming, liveScores.recent]) {
      for (const row of bucket) {
        const parsed = fixtureLabel(row);
        if (!parsed) continue;
        if (ghanaFixtures.some((g) => g.id === parsed.id)) continue;
        ghanaFixtures.push(parsed);
        if (ghanaFixtures.length >= 8) break;
      }
      if (ghanaFixtures.length >= 8) break;
    }
  }
  const faqs = [
    { question: t('ghana_hub.faq_q1'), answer: t('ghana_hub.faq_a1') },
    { question: t('ghana_hub.faq_q2'), answer: t('ghana_hub.faq_a2') },
    { question: t('ghana_hub.faq_q3'), answer: t('ghana_hub.faq_a3') },
    { question: t('ghana_hub.faq_q4'), answer: t('ghana_hub.faq_a4') },
    { question: t('ghana_hub.faq_q5'), answer: t('ghana_hub.faq_a5') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)] mb-2">
            {t('ghana_hub.label')}
          </p>
          <h1 className="font-display text-[1.7rem] sm:text-4xl font-semibold tracking-tight text-[var(--text)] leading-tight">
            {t('ghana_hub.title')}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-2xl">
            {t('ghana_hub.tagline')}
          </p>
        </header>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mb-8">
          <Link href="/marketplace" className={buttonClassName({ className: 'min-h-[48px]' })}>
            {t('ghana_hub.cta_marketplace')}
          </Link>
          <Link href="/buy-football-tips" className={buttonClassName({ variant: 'secondary', className: 'min-h-[48px]' })}>
            {t('ghana_hub.cta_buy')}
          </Link>
          <Link href="/tipsters" className={buttonClassName({ variant: 'secondary', className: 'min-h-[48px]' })}>
            {t('ghana_hub.cta_tipsters')}
          </Link>
        </div>

        <article className="rounded-2xl border border-[var(--separator)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('ghana_hub.intro')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.platform_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('ghana_hub.platform_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.gpl_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('ghana_hub.gpl_body')}{' '}
            <Link href="/ghana-premier-league-predictions" className="font-semibold text-[var(--primary)] hover:underline">
              Ghana Premier League predictions
            </Link>
          </p>
          {ghanaFixtures.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-sm text-[var(--text-muted)]">
              {ghanaFixtures.map((fx) => (
                <li key={fx.id}>
                  <Link href={`/matches/${fx.id}`} className="font-semibold text-[var(--primary)] hover:underline">
                    {fx.home} vs {fx.away} prediction
                  </Link>
                  <span>
                    {' '}
                    — {fx.league}
                    {fx.kickoff ? ` · ${new Date(fx.kickoff).toISOString().slice(0, 16).replace('T', ' ')} UTC` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-muted)]">{t('ghana_hub.gpl_empty')}</p>
          )}

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.momo_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('ghana_hub.momo_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.withdraw_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('ghana_hub.withdraw_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.protection_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('ghana_hub.protection_body')}{' '}
            <Link href="/guides/purchase-protection" className="font-semibold text-[var(--primary)] hover:underline">
              {t('ghana_hub.cta_protection')}
            </Link>
            {' · '}
            <Link href="/track-record" className="font-semibold text-[var(--primary)] hover:underline">
              {t('track_record.nav')}
            </Link>
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.verify_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('ghana_hub.verify_body')}{' '}
            <Link href="/leaderboard" className="font-semibold text-[var(--primary)] hover:underline">
              {t('nav.leaderboard')}
            </Link>
            {' · '}
            <Link href="/guides/read-tipster-stats" className="font-semibold text-[var(--primary)] hover:underline">
              {t('guides.stats_short')}
            </Link>
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.vs_telegram_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('ghana_hub.vs_telegram_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.more_pages_h')}</h2>
          <ul className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed list-disc pl-5 space-y-1">
            <li>
              <Link href="/football-predictions-today" className="font-semibold text-[var(--primary)] hover:underline">
                Football predictions today
              </Link>
            </li>
            <li>
              <Link href="/btts-predictions" className="font-semibold text-[var(--primary)] hover:underline">
                Both teams to score predictions
              </Link>
            </li>
            <li>
              <Link href="/over-2-5-goals-predictions" className="font-semibold text-[var(--primary)] hover:underline">
                Over 2.5 goals predictions
              </Link>
            </li>
            <li>
              <Link href="/buy-football-tips" className="font-semibold text-[var(--primary)] hover:underline">
                {t('buy.nav')}
              </Link>
            </li>
          </ul>

          <p className="mt-6 text-xs text-[var(--text-tertiary)] leading-relaxed">{t('buy.not_guaranteed')}</p>
        </article>

        <section className="mt-8 rounded-2xl border border-[var(--separator)] bg-[var(--card)] p-6 sm:p-7" aria-labelledby="ghana-settled">
          <h2 id="ghana-settled" className="text-lg font-semibold text-[var(--text)]">
            {t('ghana_hub.settled_h')}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t('ghana_hub.settled_sub')}</p>
          {settled.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">{t('ghana_hub.settled_empty')}</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {settled.map((item) => {
                const id = Number(item.id);
                if (!Number.isFinite(id)) return null;
                const title = couponDisplayTitle(item);
                const result = (item.result || 'pending').toLowerCase();
                return (
                  <li key={id} className="text-sm leading-snug">
                    <Link href={`/coupons/${id}`} className="font-semibold text-[var(--primary)] hover:underline">
                      {title}
                    </Link>
                    <span className="text-[var(--text-muted)]">
                      {' '}
                      — {result}
                      {item.tipster?.displayName ? ` · ${item.tipster.displayName}` : ''}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-4">
            <Link href="/coupons/archive" className="text-sm font-semibold text-[var(--primary)] hover:underline">
              {t('header.settled_archive')} →
            </Link>
          </p>
        </section>

        <section className="mt-8" aria-label="FAQ">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{t('how_it_works.faq_title')}</h2>
          <dl className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-[var(--separator)] bg-[var(--card)] p-5">
                <dt className="font-semibold text-[var(--text)]">{faq.question}</dt>
                <dd className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
