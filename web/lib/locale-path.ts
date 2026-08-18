export type UrlLocale = 'en' | 'fr';

/** Path without /fr or /en prefix. */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === '/fr' || pathname === '/en') return '/';
  if (pathname.startsWith('/fr/') || pathname.startsWith('/en/')) {
    return pathname.slice(3) || '/';
  }
  return pathname;
}

export function localeFromPathname(pathname: string): UrlLocale {
  if (pathname === '/fr' || pathname.startsWith('/fr/')) return 'fr';
  return 'en';
}

/**
 * Prefix an internal href with /fr when the current page (or locale) is French.
 * Leaves absolute URLs, hashes, and already-prefixed paths alone.
 */
export function localizeHref(href: string, localeOrPathname: string): string {
  const locale: UrlLocale =
    localeOrPathname === 'en' || localeOrPathname === 'fr'
      ? localeOrPathname
      : localeFromPathname(localeOrPathname);

  if (locale !== 'fr') return href;
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  if (href === '/fr' || href.startsWith('/fr/')) return href;
  if (href === '/en' || href.startsWith('/en/')) return href;

  const qIndex = href.indexOf('?');
  const hIndex = href.indexOf('#');
  let path = href;
  let suffix = '';
  if (qIndex >= 0 && (hIndex < 0 || qIndex < hIndex)) {
    path = href.slice(0, qIndex);
    suffix = href.slice(qIndex);
  } else if (hIndex >= 0) {
    path = href.slice(0, hIndex);
    suffix = href.slice(hIndex);
  }
  if (/\.\w+$/.test(path)) return href;
  const prefixed = path === '/' ? '/fr' : `/fr${path}`;
  return `${prefixed}${suffix}`;
}
