/** Append UTM / src query params without clobbering existing keys. */
export function withUtm(
  url: string,
  params: { source?: string; medium?: string; campaign?: string; src?: string },
): string {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://betrollover.com');
    if (params.source && !u.searchParams.get('utm_source')) u.searchParams.set('utm_source', params.source);
    if (params.medium && !u.searchParams.get('utm_medium')) u.searchParams.set('utm_medium', params.medium);
    if (params.campaign && !u.searchParams.get('utm_campaign')) u.searchParams.set('utm_campaign', params.campaign);
    if (params.src && !u.searchParams.get('src')) u.searchParams.set('src', params.src);
    return u.toString();
  } catch {
    return url;
  }
}
