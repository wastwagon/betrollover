'use client';

import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { AccaFamilyNav } from '@/components/AccaFamilyNav';
import { GuideCallout, GuideStack, GuideStep } from '@/components/education/GuideChrome';
import { buttonClassName } from '@/components/ui/Button';
import { useT } from '@/context/LanguageContext';
import { useAccaGeneratorEnabled } from '@/hooks/useAccaGeneratorEnabled';

/**
 * Public teaser when the visitor is not signed in.
 * Generate stays behind login. No VIP subscription is required.
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

          <div className="mx-auto max-w-3xl space-y-4">
            <GuideCallout>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--primary)] mb-1">
                {t('acca.landing_disclaimer_kicker')}
              </span>
              {enabled ? t('acca.landing_disclaimer') : t('acca.disabled_body')}
            </GuideCallout>

            {enabled ? (
              <GuideStack>
                <GuideStep index="1" title={t('acca.landing_how')}>
                  <ol className="mt-1 space-y-2 list-none p-0">
                    <li>{t('acca.landing_step1')}</li>
                    <li>{t('acca.landing_step2')}</li>
                    <li>{t('acca.landing_step3')}</li>
                    <li>{t('acca.landing_step4')}</li>
                  </ol>
                </GuideStep>
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
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
              </GuideStack>
            ) : (
              <p className="text-[15px] font-semibold text-[var(--text)] px-1">{t('acca.disabled_title')}</p>
            )}

            <p className="text-center text-[12px] text-[var(--text-muted)] px-1">
              {t('acca.landing_already')}{' '}
              <Link href="/marketplace" className="font-semibold text-[var(--primary)] no-underline hover:underline">
                {t('nav.marketplace')}
              </Link>
              {' · '}
              <Link href="/rollover" className="font-semibold text-[var(--primary)] no-underline hover:underline">
                {t('nav.rollover')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
