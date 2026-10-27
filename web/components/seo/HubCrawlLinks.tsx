import { localizeHref, type UrlLocale } from '@/lib/locale-path';

/** Server-rendered fallback links so crawlers always see hub URLs in first HTML. */
export function HubCrawlLinks({
  label,
  links,
  locale = 'en',
  maxLinks = 32,
  rel,
}: {
  label: string;
  links: { href: string; text: string }[];
  locale?: UrlLocale;
  /** Avoid flooding discovery with thousands of archive deep links. */
  maxLinks?: number;
  /** e.g. `nofollow` on archive hubs so Google prioritizes sitemap + marketplace picks. */
  rel?: string;
}) {
  if (links.length === 0) return null;
  const slice = links.slice(0, Math.max(0, maxLinks));
  return (
    <nav className="sr-only" aria-label={label}>
      {slice.map((link) => (
        <a key={link.href} href={localizeHref(link.href, locale)} rel={rel}>
          {link.text}
        </a>
      ))}
    </nav>
  );
}
