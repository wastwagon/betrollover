'use client';

import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { buttonClassName } from '@/components/ui/Button';
import { useT } from '@/context/LanguageContext';

/** Public teaser when the visitor is not signed in. */
export function CreatePickLanding() {
  const t = useT();
  return (
    <DashboardShell>
      <div className="min-h-[calc(100vh-8rem)] bg-[var(--bg)] w-full min-w-0 max-w-full">
        <div className="section-ux-dashboard-shell min-w-0 max-w-full">
          <PageHeader
            label={t('create_pick.title')}
            title={t('create_pick.title')}
            tagline={t('create_pick.tagline')}
          />
          <div className="mx-auto max-w-3xl space-y-6">
            <aside
              className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-light)] px-4 py-3.5 text-sm text-[var(--text)]"
              role="note"
            >
              <p className="leading-relaxed">{t('create_pick.landing_disclaimer')}</p>
            </aside>
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
              <h2 className="text-base font-semibold text-[var(--text)]">{t('create_pick.landing_how')}</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text-muted)]">
                <li>{t('create_pick.landing_step1')}</li>
                <li>{t('create_pick.landing_step2')}</li>
                <li>{t('create_pick.landing_step3')}</li>
              </ol>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/login?redirect=/create-pick" className={buttonClassName({ size: 'lg', className: 'min-h-[48px]' })}>
                  {t('create_pick.landing_sign_in')}
                </Link>
                <Link
                  href="/register?redirect=/create-pick"
                  className={buttonClassName({ variant: 'secondary', size: 'lg', className: 'min-h-[48px]' })}
                >
                  {t('create_pick.landing_join')}
                </Link>
              </div>
              <p className="text-center text-xs text-[var(--text-muted)]">
                {t('acca.landing_already')}{' '}
                <Link href="/marketplace" className="font-medium text-[var(--primary)] underline underline-offset-2">
                  {t('nav.marketplace')}
                </Link>
              </p>
            </section>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
