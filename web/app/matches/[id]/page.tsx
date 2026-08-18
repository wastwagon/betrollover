import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MatchDetailClient } from '@/components/MatchDetailClient';
import { SportsEventJsonLd } from '@/components/SportsEventJsonLd';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';
import {
  fetchPublicFixtureDetail,
  matchMetaDescription,
  matchPageTitle,
} from '@/lib/match-detail';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const fixtureId = parseInt(id, 10);
  if (!Number.isFinite(fixtureId)) {
    return { title: 'Match not found', robots: { index: false, follow: true } };
  }

  const detail = await fetchPublicFixtureDetail(fixtureId, { revalidate: 60 });
  if (!detail) {
    return { title: 'Match not found', robots: { index: false, follow: true } };
  }

  const title = matchPageTitle(detail);
  const description = matchMetaDescription(detail);
  const locale = await getLocale();
  const path = `/matches/${detail.id}`;
  const canonical = localizedUrl(path, locale);

  return {
    title,
    description,
    alternates: seoAlternates(path, locale),
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fixtureId = parseInt(id, 10);
  if (!Number.isFinite(fixtureId)) notFound();

  const detail = await fetchPublicFixtureDetail(fixtureId, { revalidate: 30 });
  if (!detail) notFound();

  const pageTitle = matchPageTitle(detail);
  const locale = await getLocale();
  const path = `/matches/${detail.id}`;
  const pageUrl = localizedUrl(path, locale);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: localizedUrl('/', locale) },
          { name: 'Live scores', url: localizedUrl('/live-scores', locale) },
          { name: pageTitle, url: pageUrl },
        ]}
      />
      <SportsEventJsonLd match={detail} url={pageUrl} />
      <MatchDetailClient initial={detail} />
    </>
  );
}
