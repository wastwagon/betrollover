'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { getApiUrl } from '@/lib/site-config';
import { useLanguage, useT } from '@/context/LanguageContext';

interface Subscription {
  id: number;
  packageId: number;
  startedAt: string;
  endsAt: string;
  amountPaid: number;
  status: string;
  package?: { id: number; name: string; price: number; durationDays: number };
}

interface FeedPick {
  id: number;
  title: string;
  sport?: string;
  totalPicks: number;
  totalOdds: number;
  price: number;
  purchaseCount: number;
  picks: Array<{ matchDescription?: string; prediction?: string; odds?: number }>;
  tipster?: { displayName: string; username: string; avatarUrl: string | null; winRate: number } | null;
}

function SubscriptionsContent() {
  const t = useT();
  const { lang } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [feedPicks, setFeedPicks] = useState<FeedPick[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);
  const justSubscribed = searchParams.get('subscribed') === '1';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/subscriptions');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const apiUrl = getApiUrl();
    // Keep above-the-fold content responsive by not blocking subscription render on feed fetch.
    fetch(`${apiUrl}/subscriptions/me`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((subs) => {
        setSubscriptions(Array.isArray(subs) ? subs : []);
      })
      .catch(() => {})
      .finally(() => setSubsLoading(false));

    fetch(`${apiUrl}/accumulators/subscription-feed?limit=20`, { headers })
      .then((r) => (r.ok ? r.json().then((d: { items?: FeedPick[] }) => d?.items ?? []) : []))
      .then((feed) => {
        setFeedPicks(Array.isArray(feed) ? feed : []);
      })
      .catch(() => {})
      .finally(() => setFeedLoading(false));
  }, [router]);

  useEffect(() => {
    if (!justSubscribed) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete('subscribed');
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [justSubscribed, pathname, router, searchParams]);

  if (subsLoading) {
    return (
      <DashboardShell>
        <div className="section-ux-dashboard-shell w-full min-w-0 max-w-full overflow-x-hidden">
          <LoadingSkeleton count={4} variant="cards" />
        </div>
      </DashboardShell>
    );
  }

  const activeSubs = subscriptions.filter((s) => s.status === 'active');

  return (
    <DashboardShell>
      <div className="section-ux-dashboard-shell w-full min-w-0 max-w-full overflow-x-hidden">
        <PageHeader
          label={t('subscriptions.page_label')}
          title={t('subscriptions.page_title')}
          tagline={t('subscriptions.page_tagline')}
        />
        {justSubscribed && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-200 p-3 text-sm">
            {t('subscriptions.activated_banner')}
          </div>
        )}

        {activeSubs.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-[var(--border)] min-w-0 max-w-full">
            <p className="text-[var(--text)] font-medium mb-2">{t('subscriptions.page_empty_title')}</p>
            <p className="text-sm text-[var(--text-muted)] mb-3">{t('subscriptions.page_empty_sub')}</p>
            <p className="text-sm text-[var(--text-muted)] mb-6 max-w-[28rem] mx-auto leading-relaxed">
              {t('subscriptions.page_empty_hint')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center min-w-0 max-w-full">
              <Link
                href="/subscriptions/marketplace"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
              >
                {t('subscriptions.empty_cta_vip_marketplace')}
              </Link>
              <Link
                href="/tipsters"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-warm)]"
              >
                {t('subscriptions.empty_cta_tipsters')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="mb-8 min-w-0 max-w-full">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-3 min-w-0">
                <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider min-w-0">
                  {t('subscriptions.active_section_title')}
                </h2>
                <Link
                  href="/subscriptions/marketplace"
                  className="text-xs font-medium text-[var(--primary)] hover:underline w-fit shrink-0"
                >
                  {t('subscriptions.browse_more_vip')}
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
                {activeSubs.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl p-4 border border-[var(--border)] bg-[var(--card)] min-w-0"
                  >
                    <h3 className="font-semibold text-[var(--text)] break-words">
                      {s.package?.name ?? t('subscriptions.package_fallback')}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      {t('subscriptions.ends_on', {
                        date: new Date(s.endsAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB'),
                      })}
                    </p>
                    <p className="text-sm font-medium text-[var(--primary)] mt-2">
                      GHS {Number(s.amountPaid).toFixed(2)}/{s.package?.durationDays ?? 30}d
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="min-w-0 max-w-full">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                {t('subscriptions.feed_section_title')}
              </h2>
              {feedLoading ? (
                <LoadingSkeleton count={2} variant="cards" />
              ) : feedPicks.length === 0 ? (
                <p className="text-[var(--text-muted)]">{t('subscriptions.feed_empty')}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-w-0">
                  {feedPicks.map((pick) => {
                    const tipMeta = pick.tipster;
                    const tipster = tipMeta
                      ? {
                          id: 0,
                          displayName: tipMeta.displayName,
                          username: tipMeta.username,
                          avatarUrl: tipMeta.avatarUrl ?? null,
                          winRate: tipMeta.winRate,
                          totalPicks: 0,
                          wonPicks: 0,
                          lostPicks: 0,
                          rank: 0,
                        }
                      : null;
                    return (
                      <PickCard
                        key={pick.id}
                        id={pick.id}
                        title={pick.title}
                        sport={pick.sport}
                        totalPicks={pick.totalPicks}
                        totalOdds={pick.totalOdds}
                        price={pick.price}
                        purchaseCount={pick.purchaseCount}
                        picks={pick.picks || []}
                        tipster={tipster}
                        isPurchased={true}
                        canPurchase={false}
                        walletBalance={null}
                        onPurchase={() => {}}
                        viewOnly
                        purchasing={false}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="section-ux-dashboard-shell w-full min-w-0 max-w-full overflow-x-hidden">
            <LoadingSkeleton count={4} variant="cards" />
          </div>
        </DashboardShell>
      }
    >
      <SubscriptionsContent />
    </Suspense>
  );
}
