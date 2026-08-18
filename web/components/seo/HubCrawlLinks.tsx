import { localizeHref, type UrlLocale } from '@/lib/locale-path';

/** Server-rendered fallback links so crawlers always see hub URLs in first HTML. */
export function HubCrawlLinks({
  label,
  links,
  locale = 'en',
}: {
  label: string;
  links: { href: string; text: string }[];
  locale?: UrlLocale;
}) {
  if (links.length === 0) return null;
  return (
    <nav className="sr-only" aria-label={label}>
      {links.map((link) => (
        <a key={link.href} href={localizeHref(link.href, locale)}>
          {link.text}
        </a>
      ))}
    </nav>
  );
}
