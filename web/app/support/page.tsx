import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { getLocale, buildT } from '@/lib/i18n';
import { SupportTicketsClient } from './SupportTicketsClient';

export default async function SupportPage() {
  const t = buildT(await getLocale());

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page w-full min-w-0">
        <header className="mb-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)] mb-2">
            {t('support.help_centre')}
          </p>
          <h1 className="font-display text-[1.7rem] sm:text-4xl font-semibold tracking-tight text-[var(--text)] leading-tight">
            {t('support.title')}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
            {t('support.raise_prompt')}
          </p>
        </header>

        <section
          className="mb-6 rounded-2xl border border-[var(--separator)] bg-[var(--card)] p-5 sm:p-6 max-w-3xl"
          aria-labelledby="support-contact-h"
        >
          <h2 id="support-contact-h" className="text-[17px] font-semibold tracking-tight text-[var(--text)]">
            {t('support.contact_facts_h')}
          </h2>
          <p className="mt-2 text-[15px] text-[var(--text-muted)] leading-relaxed">{t('support.contact_facts_body')}</p>
          <p className="mt-3 text-[15px] text-[var(--text)] leading-relaxed">
            {t('support.contact_email_label')}:{' '}
            <a href="mailto:support@betrollover.com" className="font-semibold text-[var(--primary)]">
              support@betrollover.com
            </a>
          </p>
          <p className="mt-2 text-[15px] text-[var(--text)] leading-relaxed">{t('support.dispute_plain')}</p>
          <p className="mt-3 text-[14px] text-[var(--text-muted)] leading-relaxed">
            <Link href="/contact" className="font-semibold text-[var(--primary)]">
              {t('support.link_contact')}
            </Link>
            {' · '}
            <Link href="/how-it-works#refund-rule" className="font-semibold text-[var(--primary)]">
              {t('support.link_refunds')}
            </Link>
            {' · '}
            <Link href="/about" className="font-semibold text-[var(--primary)]">
              {t('nav.about')}
            </Link>
          </p>
        </section>

        <SupportTicketsClient />

        <div className="mt-8 max-w-3xl">
          <AdSlot zoneSlug="support-full" fullWidth className="w-full" />
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
