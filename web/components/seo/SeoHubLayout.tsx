import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';
import { buttonClassName } from '@/components/ui/button-styles';
import { localizedUrl, type UrlLocale } from '@/lib/site-config';

export type SeoHubFaq = { question: string; answer: string };

export type SeoHubSection = {
  heading: string;
  paragraphs: string[];
  links?: Array<{ href: string; label: string }>;
};

export type SeoHubLiveBlock = {
  heading: string;
  empty: string;
  items: Array<{ href: string; title: string; meta?: string }>;
  moreHref?: string;
  moreLabel?: string;
};

type SeoHubLayoutProps = {
  path: string;
  locale: UrlLocale;
  label: string;
  title: string;
  tagline: string;
  intro: string[];
  sections: SeoHubSection[];
  faqs: SeoHubFaq[];
  ctaPrimary?: { href: string; label: string };
  ctaSecondary?: { href: string; label: string };
  live?: SeoHubLiveBlock;
  disclaimer?: string;
};

export function SeoHubLayout({
  path,
  locale,
  label,
  title,
  tagline,
  intro,
  sections,
  faqs,
  ctaPrimary,
  ctaSecondary,
  live,
  disclaimer,
}: SeoHubLayoutProps) {
  const pageUrl = localizedUrl(path, locale);

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: localizedUrl('/', locale) },
          { name: title, url: pageUrl },
        ]}
      />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)] mb-2">
            {label}
          </p>
          <h1 className="font-display text-[1.7rem] sm:text-4xl font-semibold tracking-tight text-[var(--text)] leading-tight">
            {title}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-2xl">
            {tagline}
          </p>
        </header>

        {(ctaPrimary || ctaSecondary) && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mb-8">
            {ctaPrimary ? (
              <Link href={ctaPrimary.href} className={buttonClassName({ className: 'min-h-[48px]' })}>
                {ctaPrimary.label}
              </Link>
            ) : null}
            {ctaSecondary ? (
              <Link
                href={ctaSecondary.href}
                className={buttonClassName({ variant: 'secondary', className: 'min-h-[48px]' })}
              >
                {ctaSecondary.label}
              </Link>
            ) : null}
          </div>
        )}

        <article className="rounded-2xl border border-[var(--separator)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          {intro.map((p) => (
            <p key={p.slice(0, 48)} className="text-sm text-[var(--text-muted)] leading-relaxed mt-3 first:mt-0">
              {p}
            </p>
          ))}

          {sections.map((section) => (
            <section key={section.heading} className="mt-6">
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 48)} className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                  {p}
                </p>
              ))}
              {section.links && section.links.length > 0 ? (
                <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                  {section.links.map((link, i) => (
                    <span key={link.href}>
                      {i > 0 ? ' · ' : null}
                      <Link href={link.href} className="font-semibold text-[var(--primary)] hover:underline">
                        {link.label}
                      </Link>
                    </span>
                  ))}
                </p>
              ) : null}
            </section>
          ))}

          {disclaimer ? (
            <p className="mt-6 text-xs text-[var(--text-tertiary)] leading-relaxed">{disclaimer}</p>
          ) : null}
        </article>

        {live ? (
          <section className="mt-8 rounded-2xl border border-[var(--separator)] bg-[var(--card)] p-6 sm:p-7" aria-labelledby="seo-hub-live">
            <h2 id="seo-hub-live" className="text-lg font-semibold text-[var(--text)]">
              {live.heading}
            </h2>
            {live.items.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">{live.empty}</p>
            ) : (
              <ol className="mt-4 space-y-2">
                {live.items.map((item) => (
                  <li key={item.href} className="text-sm leading-snug">
                    <Link href={item.href} className="font-semibold text-[var(--primary)] hover:underline">
                      {item.title}
                    </Link>
                    {item.meta ? <span className="text-[var(--text-muted)]"> — {item.meta}</span> : null}
                  </li>
                ))}
              </ol>
            )}
            {live.moreHref && live.moreLabel ? (
              <p className="mt-4">
                <Link href={live.moreHref} className="text-sm font-semibold text-[var(--primary)] hover:underline">
                  {live.moreLabel} →
                </Link>
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="mt-8" aria-label="FAQ">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">FAQ</h2>
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
