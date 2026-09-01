'use client';

import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { AccaFamilyNav } from '@/components/AccaFamilyNav';
import { buttonClassName } from '@/components/ui/Button';
import { useT } from '@/context/LanguageContext';
import { useAccaGeneratorEnabled } from '@/hooks/useAccaGeneratorEnabled';

/**
 * Public teaser when the visitor is not signed in.
 * The interactive generator stays behind login.
 */
export function AccaGeneratorLanding() {
  const t = useT();
  const enabled = useAccaGeneratorEnabled();

  return (
    <DashboardShell>
      <div className="min-h-[calc(100vh-8rem)] bg-[var(--bg)] w-full min-w-0 max-w-full">
        <div className="section-ux-dashboard-shell min-w-0 max-w-full">
          <PageHeader
            label={t('acca.landing_label')}
            title={enabled ? t('nav.acca_generator') : t('acca.disabled_title')}
            tagline={enabled ? t('acca.landing_disclaimer') : t('acca.disabled_body')}
          />
          <AccaFamilyNav current="build" />

          <div className="mx-auto max-w-3xl space-y-6">
            <aside
              className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-light)] px-4 py-3.5 text-sm text-[var(--text)]"
              role="note"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                {t('acca.landing_disclaimer_kicker')}
              </p>
              <p className="mt-1.5 leading-relaxed">
                {enabled ? t('acca.landing_disclaimer') : t('acca.disabled_body')}
              </p>
            </aside>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
              {enabled ? (
                <>
                  <h2 className="text-base font-semibold text-[var(--text)]">{t('acca.landing_how')}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text-muted)]">
                    <li>{t('acca.landing_step1')}</li>
                    <li>{t('acca.landing_step2')}</li>
                    <li>{t('acca.landing_step3')}</li>
                    <li>{t('acca.landing_step4')}</li>
                  </ol>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Link href="/login?redirect=/acca-generator" className={buttonClassName({ size: 'lg', className: 'min-h-[48px]' })}>
                      {t('acca.landing_sign_in')}
                    </Link>
                    <Link
                      href="/register?redirect=/acca-generator"
                      className={buttonClassName({ variant: 'secondary', size: 'lg', className: 'min-h-[48px]' })}
                    >
                      {t('acca.landing_create_account')}
                    </Link>
                  </div>
                </>
              ) : (
                <h2 className="text-base font-semibold text-[var(--text)]">{t('acca.disabled_title')}</h2>
              )}
              <p className="text-center text-xs text-[var(--text-muted)]">
                {t('acca.landing_already')}{' '}
                <Link href="/marketplace" className="font-medium text-[var(--primary)] underline underline-offset-2">
                  {t('nav.marketplace')}
                </Link>
                {' · '}
                <Link href="/rollover" className="font-medium text-[var(--primary)] underline underline-offset-2">
                  {t('nav.rollover')}
                </Link>
              </p>
            </section>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
