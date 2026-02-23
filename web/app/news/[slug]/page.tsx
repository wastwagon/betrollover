'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useT } from '@/context/LanguageContext';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { ArticleJsonLd } from '@/components/ArticleJsonLd';

interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  sport?: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  news:                'bg-blue-100 text-blue-700',
  transfer_rumour:     'bg-amber-100 text-amber-700',
  confirmed_transfer:  'bg-emerald-100 text-emerald-700',
  injury:              'bg-red-100 text-red-700',
  gossip:              'bg-purple-100 text-purple-700',
};

const SPORT_ICONS: Record<string, string> = {
  football: '⚽', basketball: '🏀', rugby: '🏉', mma: '🥊',
  volleyball: '🏐', hockey: '🏒', american_football: '🏈', tennis: '🎾',
};

function getCategoryLabel(t: (k: string) => string, cat: string): string {
  const key = `news.category_detail_${cat}` as const;
  const map: Record<string, string> = {
    news: 'news.category_detail_news',
    transfer_rumour: 'news.category_detail_transfer_rumour',
    confirmed_transfer: 'news.category_detail_confirmed_transfer',
    injury: 'news.category_detail_injury',
    gossip: 'news.category_detail_gossip',
  };
  return t(map[cat] ?? cat);
}

function getSportLabel(t: (k: string) => string, sport: string): string {
  return t(`create_pick.sport_${sport}` as 'create_pick.sport_football');
}

function formatDate(s: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function ArticleSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <div className="h-6 w-32 rounded-xl bg-[var(--card)] skeleton" />
            <div className="h-8 w-3/4 rounded-xl bg-[var(--card)] skeleton" />
            <div className="h-4 w-1/2 rounded-xl bg-[var(--card)] skeleton" />
            <div className="h-56 rounded-2xl bg-[var(--card)] skeleton" />
            {[1,2,3,4].map(i => <div key={i} className="h-4 rounded bg-[var(--card)] skeleton" />)}
          </div>
          <div className="lg:w-72 space-y-4">
            <div className="h-[250px] rounded-xl bg-[var(--card)] skeleton" />
            <div className="h-32 rounded-xl bg-[var(--card)] skeleton" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NewsArticlePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const t = useT();

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [related, setRelated] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/news/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: NewsArticle | null) => {
        setArticle(data);
        if (data) {
          // Fetch related articles by same sport (excluding current)
          const sportParam = data.sport ? `&sport=${data.sport}` : '';
          fetch(`/api/news?limit=5${sportParam}`)
            .then((r) => r.ok ? r.json() : [])
            .then((list: NewsArticle[]) =>
              setRelated(Array.isArray(list) ? list.filter((a) => a.slug !== slug).slice(0, 4) : [])
            )
            .catch(() => {});
        }
      })
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <ArticleSkeleton />;

  if (!article) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <UnifiedHeader />
        <main className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-5xl mb-4">📰</p>
          <h1 className="text-2xl font-bold text-[var(--text)] mb-3">{t('news.article_not_found')}</h1>
          <p className="text-[var(--text-muted)] mb-6">{t('news.article_not_found_desc')}</p>
          <Link href="/news" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition-colors">
            {t('news.back_to_news')}
          </Link>
        </main>
        <AppFooter />
      </div>
    );
  }

  const sportLabel = article.sport ? getSportLabel(t, article.sport) : '';
  const categoryColor = CATEGORY_COLORS[article.category] ?? 'bg-slate-100 text-slate-600';
  const categoryLabel = getCategoryLabel(t, article.category);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <ArticleJsonLd
        title={article.title}
        excerpt={article.excerpt}
        imageUrl={article.imageUrl}
        publishedAt={article.publishedAt}
        slug={article.slug}
      />
      <UnifiedHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6 flex-wrap">
          <Link href="/news" className="hover:text-[var(--primary)] transition-colors">{t('nav.news')}</Link>
          <span>/</span>
          {article.sport && (
            <>
              <Link href={`/news?sport=${article.sport}`} className="hover:text-[var(--primary)] transition-colors">
                {SPORT_ICONS[article.sport]} {sportLabel}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="truncate max-w-[200px] text-[var(--text)]">{article.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Article ── */}
          <article className="flex-1 min-w-0">

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${categoryColor}`}>
                {categoryLabel}
              </span>
              {article.sport && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--primary-light)] text-[var(--primary)]">
                  {SPORT_ICONS[article.sport]} {sportLabel}
                </span>
              )}
              {article.publishedAt && (
                <span className="text-sm text-[var(--text-muted)]">{formatDate(article.publishedAt)}</span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] leading-tight mb-4">
              {article.title}
            </h1>

            {/* Excerpt / lead */}
            {article.excerpt && (
              <p className="text-lg text-[var(--text-muted)] leading-relaxed mb-6 border-l-4 border-[var(--primary)]/40 pl-4">
                {article.excerpt}
              </p>
            )}

            {/* Hero image */}
            {article.imageUrl && (
              <div className="relative w-full h-64 sm:h-80 mb-8 rounded-2xl overflow-hidden bg-[var(--card)]">
                <Image
                  src={article.imageUrl}
                  alt={article.title}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 700px"
                  priority
                />
              </div>
            )}

            {/* Body */}
            <div className="prose prose-slate max-w-none text-[var(--text)] text-[15px] leading-relaxed
              [&>p]:mb-5 [&>p]:text-[var(--text)] [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-3
              [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-2
              [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>li]:mb-1
              [&>blockquote]:border-l-4 [&>blockquote]:border-[var(--primary)]/40 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-[var(--text-muted)]"
            >
              {(article.content || '').trim()
                ? article.content.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)
                : <p className="text-[var(--text-muted)] italic">{t('news.full_content_unavailable')}</p>}
            </div>

            {/* Source */}
            {article.sourceUrl && (
              <div className="mt-8 pt-6 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)]">
                  {t('news.source')}:{' '}
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline break-all"
                  >
                    {article.sourceUrl}
                  </a>
                </p>
              </div>
            )}

            {/* Back link */}
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <Link
                href={article.sport ? `/news?sport=${article.sport}` : '/news'}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline"
              >
                {t('news.back_to_news')}
              </Link>
            </div>
          </article>

          {/* ── Sidebar ── */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-4">

              <AdSlot zoneSlug="news-article-sidebar" />

              {/* Related articles */}
              {related.length > 0 && (
                <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <h2 className="text-sm font-bold text-[var(--text)]">
                      {sportLabel ? t('news.sidebar_more_sport_news', { sport: sportLabel }) : t('news.sidebar_more_news')}
                    </h2>
                  </div>
                  <ul className="divide-y divide-[var(--border)]">
                    {related.map((rel) => (
                      <li key={rel.id}>
                        <Link
                          href={`/news/${rel.slug}`}
                          className="flex gap-3 p-3 hover:bg-[var(--bg)] transition-colors group"
                        >
                          {rel.imageUrl ? (
                            <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                              <Image
                                src={rel.imageUrl} alt={rel.title}
                                width={56} height={56}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-[var(--primary-light)] flex items-center justify-center text-xl">
                              {article.sport ? SPORT_ICONS[article.sport] : '📰'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mb-1 ${CATEGORY_COLORS[rel.category] ?? 'bg-slate-100 text-slate-600'}`}>
                              {getCategoryLabel(t, rel.category)}
                            </span>
                            <p className="text-xs font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors leading-snug line-clamp-2">
                              {rel.title}
                            </p>
                            {rel.publishedAt && (
                              <p className="text-[10px] text-[var(--text-muted)] mt-1">{formatDate(rel.publishedAt)}</p>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="px-4 py-3 border-t border-[var(--border)]">
                    <Link
                      href={article.sport ? `/news?sport=${article.sport}` : '/news'}
                      className="text-xs font-semibold text-[var(--primary)] hover:underline"
                    >
                      {sportLabel ? t('news.sidebar_view_all_news', { sport: sportLabel }) : t('news.sidebar_view_all')}
                    </Link>
                  </div>
                </div>
              )}

              {/* Tipster CTA */}
              <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">{t('news.sidebar_tipster_title')}</p>
                <h3 className="font-bold text-base mb-2">
                  {t('news.sidebar_tipster_sub', { sport: sportLabel || t('common.all') })}
                </h3>
                <p className="text-xs opacity-80 leading-relaxed mb-4">
                  {t('news.sidebar_top_tipsters_desc')}
                </p>
                <Link
                  href={article.sport ? `/marketplace?sport=${article.sport}` : '/marketplace'}
                  className="block text-center px-4 py-2 rounded-xl bg-white text-teal-700 text-sm font-bold hover:bg-teal-50 transition-colors"
                >
                  {t('news.sidebar_tipster_btn', { sport: sportLabel || '' })}
                </Link>
              </div>

              {/* Discover CTA */}
              <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4">
                <h3 className="text-sm font-bold text-[var(--text)] mb-2">📚 {t('news.sidebar_discover_title')}</h3>
                <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
                  {t('news.sidebar_discover_desc')}
                </p>
                <Link href="/resources" className="text-xs font-semibold text-[var(--primary)] hover:underline">
                  {t('news.sidebar_discover_browse')}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
