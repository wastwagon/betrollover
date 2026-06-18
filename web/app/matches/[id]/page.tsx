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
import { SITE_URL, SITE_NAME, getAlternates } from '@/lib/site-config';

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
  const canonical = `${SITE_URL}/matches/${detail.id}`;

  return {
    title: `${title} — ${SITE_NAME}`,
    description,
    alternates: {
      canonical,
      languages: getAlternates(`/matches/${detail.id}`),
    },
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

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Live scores', url: `${SITE_URL}/live-scores` },
          { name: pageTitle, url: `${SITE_URL}/matches/${detail.id}` },
        ]}
      />
      <SportsEventJsonLd match={detail} />
      <MatchDetailClient initial={detail} />
    </>
  );
}
