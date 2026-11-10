import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { ProductOfferJsonLd } from '@/components/seo/ProductOfferJsonLd';
import { buttonClassName } from '@/components/ui/button-styles';
import { localizedUrl, seoAlternates, SITE_URL } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
import { getServerBackendOrigin } from '@/lib/seo/server-backend';
import { isAccaDeskTipsterType, isVipRosterUsername } from '@/lib/tipster-kind';

const PATH = '/buy-football-tips';

type VipMarketplaceRow = {
  package: {
    id: number;
    name: string;
    price: number;
    durationDays: number;
    includedSlipsPerPeriod?: number | null;
    channel?: string | null;
  };
  tipster: {
    username: string;
    displayName: string;
    isAi?: boolean;
    tipsterType?: string | null;
  } | null;
};

function publicPlanName(row: VipMarketplaceRow): string {
  const raw = (row.package.name || '').trim();
  const tipsterName = row.tipster?.displayName?.trim() || row.tipster?.username || 'Tipster';
  const automated =
    !!row.tipster?.isAi ||
    isAccaDeskTipsterType(row.tipster?.tipsterType) ||
    isVipRosterUsername(row.tipster?.username);
  if (/accasure|sure\s*·|sure\s*1x2/i.test(raw) || isVipRosterUsername(row.tipster?.username)) {
    return `Match Winner Tips VIP — ${row.package.durationDays} days`;
  }
  if (automated && (!raw || /ai vip/i.test(raw))) {
    return `${tipsterName} VIP — ${row.package.durationDays} days`;
  }
  return raw || `${tipsterName} VIP — ${row.package.durationDays} days`;
}

async function fetchVipPlans(): Promise<VipMarketplaceRow[]> {
  if (!isSubscriptionsEnabled()) return [];
  try {
    const res = await fetch(`${getServerBackendOrigin()}/api/v1/subscriptions/marketplace?limit=50`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    return items as VipMarketplaceRow[];
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('buy.meta_title');
  const description = t('buy.meta_desc');
  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    keywords: [
      'buy football predictions',
      'VIP football tipster subscription',
      'purchase-protected football tips',
      'refund if paid football tip loses',
      'Match Winner Tips VIP',
    ],
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

export default async function BuyFootballTipsPage() {
  const t = buildT(await getLocale());
  const vipOpen = isSubscriptionsEnabled();
  const plans = vipOpen ? await fetchVipPlans() : [];
  const faqs = [
    { question: t('buy.faq_q1'), answer: t('buy.faq_a1') },
    { question: t('buy.faq_q2'), answer: t('buy.faq_a2') },
    { question: t('buy.faq_q3'), answer: t('buy.faq_a3') },
  ];

  const productItems = plans.map((row) => {
    const name = publicPlanName(row);
    const tipsterName = row.tipster?.displayName || row.tipster?.username || 'Tipster';
    return {
      name,
      description: `${name} from ${tipsterName}. ${t('buy.vip_included')} ${t('buy.vip_refund_rule')}`,
      price: Number(row.package.price) || 0,
      currency: 'GHS',
      url: `${SITE_URL.replace(/\/$/, '')}/subscriptions/checkout?packageId=${row.package.id}`,
    };
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <ProductOfferJsonLd items={productItems} />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)] mb-2">
            {t('buy.label')}
          </p>
          <h1 className="font-display text-[1.7rem] sm:text-4xl font-semibold tracking-tight text-[var(--text)] leading-tight">
            {t('buy.title')}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-2xl">
            {t('buy.tagline')}
          </p>
        </header>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mb-8">
          <Link href="/marketplace" className={buttonClassName({ className: 'min-h-[48px]' })}>
            {t('buy.cta_picks')}
          </Link>
          {vipOpen ? (
            <Link href="/subscriptions/marketplace" className={buttonClassName({ variant: 'secondary', className: 'min-h-[48px]' })}>
              {t('buy.cta_vip')}
            </Link>
          ) : null}
          <Link href="/tipsters" className={buttonClassName({ variant: 'ghost', className: 'min-h-[48px]' })}>
            {t('buy.cta_tipsters')}
          </Link>
        </div>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('buy.intro')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('buy.picks_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('buy.picks_body')}{' '}
            <Link href="/guides/purchase-protection" className="font-semibold text-[var(--primary)] hover:underline">
              {t('guides.escrow_short')}
            </Link>
            {' · '}
            <Link href="/football-tips-ghana" className="font-semibold text-[var(--primary)] hover:underline">
              {t('buy.regions_ghana_hub_link')}
            </Link>
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('buy.vip_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('buy.vip_body')}</p>

          {plans.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">{t('buy.vip_empty')}</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {plans.map((row) => {
                const name = publicPlanName(row);
                const tipsterName = row.tipster?.displayName || row.tipster?.username || 'Tipster';
                const automated =
                  !!row.tipster?.isAi ||
                  isAccaDeskTipsterType(row.tipster?.tipsterType) ||
                  isVipRosterUsername(row.tipster?.username);
                const days = row.package.durationDays;
                const price = Number(row.package.price);
                const included =
                  row.package.includedSlipsPerPeriod != null
                    ? t('buy.included_up_to', {
                        count: String(row.package.includedSlipsPerPeriod),
                        days: String(days),
                      })
                    : t('buy.vip_included');
                return (
                  <li
                    key={row.package.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm leading-relaxed"
                  >
                    <p className="font-semibold text-[var(--text)]">{name}</p>
                    <p className="mt-1 text-[var(--text-muted)]">
                      {t('buy.tipster_label')}:{' '}
                      {row.tipster?.username ? (
                        <Link
                          href={`/tipsters/${encodeURIComponent(row.tipster.username)}`}
                          className="font-semibold text-[var(--primary)] hover:underline"
                        >
                          {tipsterName}
                        </Link>
                      ) : (
                        tipsterName
                      )}
                    </p>
                    <p className="mt-1 text-[var(--text-muted)]">
                      {automated ? t('buy.vip_automated_note') : t('buy.vip_human_note')}
                    </p>
                    <p className="mt-2 text-[var(--text)]">
                      {t('buy.price_label')}: <strong>GHS {price.toFixed(2)}</strong>
                    </p>
                    <p className="text-[var(--text)]">
                      {t('buy.length_label')}: <strong>{t('buy.days_unit', { days: String(days) })}</strong>
                    </p>
                    <p className="mt-2 text-[var(--text-muted)]">{included}</p>
                    <p className="mt-2 text-[var(--text-muted)]">{t('buy.vip_refund_rule')}</p>
                    <p className="mt-3">
                      <Link
                        href={`/subscriptions/checkout?packageId=${row.package.id}`}
                        className="font-semibold text-[var(--primary)] hover:underline"
                      >
                        {t('buy.open_checkout', { name })}
                      </Link>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          <h2 className="text-lg font-semibold mt-6">{t('buy.compare_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('buy.compare_body')}{' '}
            <Link href="/leaderboard" className="font-semibold text-[var(--primary)] hover:underline">
              {t('nav.leaderboard')}
            </Link>
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('buy.regions_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('buy.regions_body')}</p>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('buy.marketplace_refund_plain')}{' '}
            <Link href="/how-it-works#refund-rule" className="font-semibold text-[var(--primary)] hover:underline">
              {t('buy.full_refund_rule_link')}
            </Link>
            .
          </p>

          <p className="mt-6 text-xs text-[var(--text-tertiary)] leading-relaxed">{t('buy.not_guaranteed')}</p>
        </article>

        <section className="mt-8" aria-label="FAQ">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{t('how_it_works.faq_title')}</h2>
          <dl className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
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
