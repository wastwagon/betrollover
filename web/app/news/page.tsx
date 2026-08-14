'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { AdSlot } from '@/components/AdSlot';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { buttonClassName } from '@/components/ui/Button';
import { getApiUrl } from '@/lib/site-config';
import {
  CONTENT_SPORT_KEYS,
  SPORT_ICONS,
  getContentSportLabel,
  type ContentSport,
  type ContentSportFilter,
} from '@/lib/sports-content';

type NewsCategory = 'all' | 'news' | 'transfer_rumour' | 'confirmed_transfer' | 'injury' | 'gossip';

interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  sport?: string;
  imageUrl: string | null;
  publishedAt: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  news:                'bg-blue-100 text-blue-700',
  transfer_rumour:     'bg-amber-100 text-amber-700',
  confirmed_transfer:  'bg-emerald-100 text-emerald-700',
  injury:              'bg-red-100 text-red-700',
  gossip:              'bg-[var(--accent-light)] text-[var(--accent)]',
};

const CATEGORY_KEYS: NewsCategory[] = ['all', 'news', 'transfer_rumour', 'confirmed_transfer', 'injury', 'gossip'];

function formatDate(s: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getCategoryLabel(t: (k: string) => string, key: NewsCategory): string {
  if (key === 'all') return t('common.all');
  const map: Record<string, string> = {
    news: 'news.category_news',
    transfer_rumour: 'news.category_transfer_rumour',
    confirmed_transfer: 'news.category_confirmed_transfer',
    injury: 'news.category_injury',
    gossip: 'news.category_gossip',
  };
  return t(map[key] ?? key);
}

function NewsContent() {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<NewsCategory>(
    (searchParams.get('category') as NewsCategory) ?? 'all'
  );
  const [activeSport, setActiveSport] = useState<ContentSport>(
    (searchParams.get('sport') as ContentSportFilter) ?? ''
  );

  const pushUrl = useCallback(
    (cat: NewsCategory, sport: ContentSport) => {
      const p = new URLSearchParams();
      if (cat !== 'all') p.set('category', cat);
      if (sport) p.set('sport', sport);
      router.replace(`/news${p.toString() ? `?${p}` : ''}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50', language: lang });
    if (activeCategory !== 'all') params.set('category', activeCategory);
    if (activeSport) params.set('sport', activeSport);
    fetch(`${getApiUrl()}/news?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setArticles(Array.isArray(data) ? data : []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [activeCategory, activeSport, lang]);

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page-wide w-full min-w-0">

        <PageHeader
          label={t('news.page_label')}
          title={t('news.page_title')}
          tagline={t('news.page_tagline')}
        />

        {/* Sport filter row */}
        <div className="mb-5 w-full min-w-0 overflow-hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">{t('news.filter_by_sport')}</p>
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch]">
            {CONTENT_SPORT_KEYS.map(sfKey => (
              <button
                key={sfKey || 'all'}
                type="button"
                onClick={() => { setActiveSport(sfKey); pushUrl(activeCategory, sfKey); }}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeSport === sfKey
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--text)]'
                }`}
              >
                <span>{SPORT_ICONS[sfKey]}</span><span>{getContentSportLabel(t, sfKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category sub-filter */}
        <div className="mb-8 w-full min-w-0 overflow-hidden">
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch]">
          {CATEGORY_KEYS.map(tabKey => (
            <button
              key={tabKey}
              type="button"
              onClick={() => { setActiveCategory(tabKey); pushUrl(tabKey, activeSport); }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeCategory === tabKey
                  ? 'bg-[var(--primary)] text-white shadow-sm'
                  : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
              }`}
            >
              {getCategoryLabel(t, tabKey)}
            </button>
          ))}
        </div>
        </div>

        {/* Main layout — articles + sidebar */}
        <div className="flex flex-col lg:flex-row gap-8 min-w-0">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <LoadingSkeleton key={i} count={1} className="h-36 rounded-2xl" />)}
              </div>
            ) : articles.length === 0 ? (
              <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-12 text-center">
                <p className="font-display text-lg font-semibold text-[var(--text)] mb-1">{t('news.no_articles')}</p>
                <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto mb-4">
                  {activeSport ? t('news.no_articles_filtered') : t('news.no_articles_default')}
                </p>
                <Link
                  href={activeSport ? `/marketplace?sport=${activeSport}` : '/marketplace'}
                  className={buttonClassName({ size: 'sm', className: 'inline-flex' })}
                >
                  {activeSport
                    ? t('news.browse_sport_picks', { sport: getContentSportLabel(t, activeSport) })
                    : t('news.browse_picks')}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {activeSport && (
                  <p className="text-sm text-[var(--text-muted)]">
                    {articles.length} {articles.length === 1 ? t('news.article') : t('news.articles')} · {SPORT_ICONS[activeSport]} {getContentSportLabel(t, activeSport)}
                  </p>
                )}
                {articles.map(article => (
                    <Link
                      key={article.id}
                      href={`/news/${article.slug}`}
                      className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors group"
                    >
                      {article.imageUrl && (
                        <div className="sm:w-44 h-32 sm:h-auto flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
                          <Image
                            src={article.imageUrl} alt={article.title}
                            width={176} height={120}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${CATEGORY_COLORS[article.category] ?? 'bg-slate-100 text-slate-600'}`}>
                            {getCategoryLabel(t, article.category as NewsCategory)}
                          </span>
                          {article.sport && !activeSport && (
                            <span className="text-xs font-semibold text-[var(--text-muted)]">
                              {SPORT_ICONS[article.sport as ContentSportFilter]} {getContentSportLabel(t, article.sport as ContentSportFilter)}
                            </span>
                          )}
                          {article.publishedAt && (
                            <span className="text-xs text-[var(--text-muted)]">{formatDate(article.publishedAt)}</span>
                          )}
                        </div>
                        <h2 className="text-base font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors leading-snug mb-2">
                          {article.title}
                        </h2>
                        {article.excerpt && (
                          <p className="text-sm text-[var(--text-muted)] line-clamp-2 leading-relaxed">{article.excerpt}</p>
                        )}
                      </div>
                    </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:w-72 flex-shrink-0 min-w-0 w-full">
            <div className="lg:sticky lg:top-24 space-y-4">
              <AdSlot zoneSlug="news-sidebar" />
              <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-3">{t('news.sidebar_guides_title')}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                  {t('news.sidebar_guides_desc')}
                </p>
                <Link href="/resources" className={buttonClassName({ variant: 'secondary', size: 'sm', fullWidth: true })}>
                  {t('news.sidebar_browse_guides')}
                </Link>
              </div>
              <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-3">{t('news.sidebar_top_tipsters')}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                  {t('news.sidebar_top_tipsters_desc')}
                </p>
                <Link href="/tipsters" className={buttonClassName({ variant: 'secondary', size: 'sm', fullWidth: true })}>
                  {t('news.sidebar_browse_tipsters')}
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

export default function NewsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <UnifiedHeader />
        <main className="section-ux-page-wide w-full min-w-0">
          <div className="h-10 w-48 rounded-xl bg-[var(--card)] skeleton mb-4" />
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-36 rounded-2xl bg-[var(--card)] skeleton" />)}</div>
        </main>
      </div>
    }>
      <NewsContent />
    </Suspense>
  );
}
