import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { SITE_NAME, seoAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import type { Metadata } from 'next';
import { IconMail, IconUsers, IconShield, IconClipboard } from '@/components/ios/icons';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  return {
    title: t('contact.headline'),
    description: t('contact.intro'),
    alternates: seoAlternates('/contact', locale),
  };
}

export default async function ContactPage() {
  const locale = await getLocale();
  const t = buildT(locale);

  const CONTACTS = [
    {
      icon: IconMail,
      label: t('contact.support_title'),
      value: 'support@betrollover.com',
      href: 'mailto:support@betrollover.com',
      desc: t('contact.support_desc'),
    },
    {
      icon: IconUsers,
      label: t('contact.partnerships_title'),
      value: 'partners@betrollover.com',
      href: 'mailto:partners@betrollover.com',
      desc: t('contact.partnerships_desc'),
    },
    {
      icon: IconShield,
      label: t('contact.report_title'),
      value: 'abuse@betrollover.com',
      href: 'mailto:abuse@betrollover.com',
      desc: t('contact.report_desc'),
    },
    {
      icon: IconClipboard,
      label: t('contact.legal_title'),
      value: 'legal@betrollover.com',
      href: 'mailto:legal@betrollover.com',
      desc: t('contact.legal_desc'),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />

      <main className="w-full min-w-0">
        <div className="section-ux-page w-full min-w-0">
          <PageHeader label={t('contact.badge')} title={t('contact.headline')} tagline={t('contact.intro')} />
          <article className="section-ux-prose min-w-0">
          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-8 leading-relaxed min-w-0">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
              {CONTACTS.map(({ icon: Icon, label, value, href, desc }) => (
                <a
                  key={label}
                  href={href}
                  className="group flex flex-col gap-1 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)] transition-colors"
                >
                  <Icon className="w-5 h-5 text-[var(--primary)] mb-1" />
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    {label}
                  </span>
                  <span className="font-semibold text-[var(--primary)] group-hover:underline text-sm">
                    {value}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{desc}</span>
                </a>
              ))}
            </div>

            <section>
              <h2 className="text-xl font-semibold mb-3">
                {t('contact.response_times_title')}
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>{t('contact.response_time_support')}</li>
                <li>{t('contact.response_time_wallet')}</li>
                <li>{t('contact.response_time_partnership')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">
                {t('contact.before_write')}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {t('contact.guides_lead')}{' '}
                <Link href="/resources" className="text-[var(--primary)] hover:underline">
                  {t('nav.guides')}
                </Link>{' '}
                {t('contact.guides_or')}{' '}
                <Link href="/discover" className="text-[var(--primary)] hover:underline">
                  {t('nav.discover')}
                </Link>{' '}
                {t('contact.guides_trail')}
              </p>
            </section>

            <div className="p-4 rounded-xl bg-[var(--accent-light)] border border-[var(--accent)]/30 text-sm text-[var(--text)]">
              <strong>{t('contact.note_label')}:</strong>{' '}
              {t('contact.note_body', { site: SITE_NAME })}
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
