import { HubCrawlLinks } from '@/components/seo/HubCrawlLinks';
import { getLocale } from '@/lib/i18n';
import { fetchNewsHub, firstSearchParam } from '@/lib/seo/hub-public-data';
import NewsClient from './NewsClient';

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const category = firstSearchParam(sp, 'category');
  const sport = firstSearchParam(sp, 'sport');
  const articles = await fetchNewsHub({ language: locale, category, sport });

  return (
    <>
      <HubCrawlLinks
        locale={locale}
        label="News"
        links={articles.flatMap((row) => {
          const slug = typeof row.slug === 'string' ? row.slug : '';
          if (!slug) return [];
          const title = typeof row.title === 'string' && row.title.trim() ? row.title : slug;
          return [{ href: `/news/${slug}`, text: title }];
        })}
      />
      <NewsClient initialArticles={articles} />
    </>
  );
}
