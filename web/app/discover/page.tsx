'use client';

import { useEffect, useState, Suspense } from 'react';
import { useT } from '@/context/LanguageContext';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { getApiUrl } from '@/lib/site-config';

const NEWS_API = '/api/news';

type TabId = 'news' | 'guides';

type NewsCategory = 'news' | 'transfer_rumour' | 'confirmed_transfer' | 'gossip' | 'injury';

type NewsSport =
  | 'football'
  | 'basketball'
  | 'rugby'
  | 'mma'
  | 'volleyball'
  | 'hockey'
  | 'american_football'
  | 'tennis';

const SPORT_KEYS: (NewsSport | '')[] = ['', 'football', 'basketball', 'rugby', 'mma', 'volleyball', 'hockey', 'american_football', 'tennis'];
const SPORT_ICONS: Record<string, string> = {
  '': '🌍', football: '⚽', basketball: '🏀', rugby: '🏉', mma: '🥊',
  volleyball: '🏐', hockey: '🏒', american_football: '🏈', tennis: '🎾',
};

function getSportLabel(t: (k: string) => string, key: NewsSport | ''): string {
  if (!key) return t('discover.filter_all');
  return t(`create_pick.sport_${key}` as 'create_pick.sport_football');
}

const SPORT_META: Record<string, { icon: string; label: string; color: string; comingSoon?: boolean }> = {
  football:          { icon: '⚽', label: 'Football',         color: 'text-emerald-400' },
  basketball:        { icon: '🏀', label: 'Basketball',        color: 'text-orange-400',  comingSoon: true },
  rugby:             { icon: '🏉', label: 'Rugby',             color: 'text-amber-400',   comingSoon: true },
  mma:               { icon: '🥊', label: 'MMA',               color: 'text-red-400',     comingSoon: true },
  volleyball:        { icon: '🏐', label: 'Volleyball',        color: 'text-blue-400',    comingSoon: true },
  hockey:            { icon: '🏒', label: 'Hockey',            color: 'text-cyan-400',    comingSoon: true },
  american_football: { icon: '🏈', label: 'Amer. Football',    color: 'text-purple-400',  comingSoon: true },
  tennis:            { icon: '🎾', label: 'Tennis',            color: 'text-yellow-400',  comingSoon: true },
};

interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  category: NewsCategory;
  sport?: string;
  imageUrl: string | null;
  publishedAt: string | null;
}

interface ResourceCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  level: string;
  items: { id: number; slug: string; title: string; excerpt: string | null; type: string; durationMinutes: number | null }[];
}

function getCategoryLabel(t: (k: string) => string, key: NewsCategory | 'all'): string {
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

function getLevelLabel(t: (k: string) => string, level: string): string {
  return t(`discover.level_${level}` as 'discover.level_beginner');
}

function getTypeLabel(t: (k: string) => string, type: string): string {
  if (['article', 'strategy', 'tool'].includes(type)) {
    return t(`discover.type_${type}` as 'discover.type_article');
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const tabParam = searchParams.get('tab');
  const sportParam = searchParams.get('sport') as NewsSport | null;
  const initialTab: TabId = tabParam === 'guides' ? 'guides' : 'news';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [activeSport, setActiveSport] = useState<NewsSport | ''>(sportParam ?? '');

  useEffect(() => {
    const t = tabParam === 'guides' ? 'guides' : 'news';
    setActiveTab(t);
  }, [tabParam]);

  const setTab = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/discover?tab=${tab}${activeSport ? `&sport=${activeSport}` : ''}`, { scroll: false });
  };

  const handleSportChange = (sport: NewsSport | '') => {
    setActiveSport(sport);
    router.replace(`/discover?tab=${activeTab}${sport ? `&sport=${sport}` : ''}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PageHeader
          label={t('nav.discover')}
          title={t('discover.title')}
          tagline={t('discover.subtitle')}
        />

        {/* SEO-rich static content */}
        <section className="mb-8 rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 md:p-8">
          <h2 className="text-xl font-bold text-[var(--text)] mb-3">{t('discover.hub_title')}</h2>
          <p className="text-[var(--text-muted)] leading-relaxed mb-4">
            {t('discover.hub_desc')}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[var(--bg)]/50 border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)] mb-2">📰 {t('discover.news_transfers')}</h3>
              <p className="text-sm text-[var(--text-muted)]">{t('discover.news_transfers_desc')}</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg)]/50 border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)] mb-2">📚 {t('discover.guides_resources')}</h3>
              <p className="text-sm text-[var(--text-muted)]">{t('discover.guides_resources_desc')}</p>
            </div>
          </div>
        </section>

        {/* Sport filter row — shared between tabs */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">{t('news.filter_by_sport')}</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {SPORT_KEYS.map((sfKey) => (
              <button
                key={sfKey || 'all'}
                onClick={() => handleSportChange(sfKey)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeSport === sfKey
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--text)]'
                }`}
              >
                <span>{SPORT_ICONS[sfKey]}</span><span>{getSportLabel(t, sfKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mb-8">
          <div className="flex gap-2">
            {[
              { id: 'news' as TabId, label: t('discover.tab_news'), icon: '📰' },
              { id: 'guides' as TabId, label: t('discover.tab_guides'), icon: '📚' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/50 hover:text-[var(--text)]'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <AdSlot zoneSlug="discover-full" fullWidth className="w-full max-w-3xl" />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            {activeTab === 'news' ? (
              <NewsTab sport={activeSport} />
            ) : (
              <GuidesTab sport={activeSport} />
            )}
          </div>
          <aside className="lg:w-72 flex-shrink-0">
            <div className="sticky top-24">
              <AdSlot zoneSlug={activeTab === 'news' ? 'news-sidebar' : 'resource-sidebar'} />
            </div>
          </aside>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

function NewsTab({ sport }: { sport: NewsSport | '' }) {
  const t = useT();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'all'>('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.set('category', activeCategory);
    if (sport) params.set('sport', sport);
    const url = `${NEWS_API}${params.toString() ? `?${params}` : ''}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setArticles(
          list.map((a: Record<string, unknown>): NewsArticle => ({
            id: Number(a.id) || 0,
            slug: String(a.slug ?? ''),
            title: String(a.title ?? ''),
            excerpt: a.excerpt != null ? String(a.excerpt) : null,
            category: (a.category as NewsCategory) ?? 'news',
            sport: a.sport != null ? String(a.sport) : undefined,
            imageUrl: a.imageUrl != null || a.image_url != null ? String(a.imageUrl ?? a.image_url ?? '') : null,
            publishedAt: a.publishedAt != null || a.published_at != null ? String(a.publishedAt ?? a.published_at ?? '') : null,
          }))
        );
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [activeCategory, sport]);

  const tabs: { key: NewsCategory | 'all'; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'news', label: t('news.category_news') },
    { key: 'transfer_rumour', label: t('news.category_transfer_rumour') },
    { key: 'confirmed_transfer', label: t('news.category_confirmed_transfer') },
    { key: 'injury', label: t('news.category_injury') },
    { key: 'gossip', label: t('news.category_gossip') },
  ];

  const sportMeta = sport ? SPORT_META[sport] : null;

  return (
    <section>
      {/* Category sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeCategory === tab.key
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-[var(--card)] border border-[var(--border)] skeleton" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-12 text-center">
          {sportMeta && sportMeta.comingSoon ? (
            <>
              <div className="text-5xl mb-4">{sportMeta.icon}</div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-2">{t('discover.sport_news_coming_soon', { sport: getSportLabel(t, sport) })}</h3>
              <p className="text-[var(--text-muted)] max-w-md mx-auto mb-4">
                {t('news.coming_soon_desc', { sport: getSportLabel(t, sport) })}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {t('discover.no_news_sub')}{' '}
                <Link href={`/marketplace?sport=${sport}`} className="text-[var(--primary)] hover:underline">
                  {t('news.browse_sport_picks', { sport: getSportLabel(t, sport) })}
                </Link>
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-[var(--text)] mb-2">{t('news.no_articles')}</h3>
              <p className="text-[var(--text-muted)] max-w-md mx-auto">
                {sport ? t('news.no_articles_filtered') : t('news.no_articles_default')}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {articles.map((a) => {
            const artSportMeta = a.sport ? SPORT_META[a.sport] : null;
            return (
              <Link
                key={a.id}
                href={`/news/${a.slug}`}
                className="block rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 overflow-hidden transition-all card-hover"
              >
                <div className="flex flex-col sm:flex-row">
                  {a.imageUrl && (
                    <div className="sm:w-48 h-32 sm:h-auto flex-shrink-0 bg-[var(--bg)] relative">
                      <Image src={a.imageUrl} alt="" width={192} height={128} className="w-full h-full object-cover" unoptimized />
                    </div>
                  )}
                  <div className="p-6 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium text-[var(--primary)] uppercase">
                        {getCategoryLabel(t, a.category)}
                      </span>
                      {artSportMeta && !sport && (
                        <span className={`text-xs font-semibold ${artSportMeta.color}`}>
                          {artSportMeta.icon} {getSportLabel(t, a.sport as NewsSport)}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-[var(--text)] mt-1">{a.title}</h2>
                    {a.excerpt && <p className="text-[var(--text-muted)] mt-2 line-clamp-2">{a.excerpt}</p>}
                    {a.publishedAt && (
                      <p className="text-sm text-[var(--text-muted)] mt-2">
                        {new Date(a.publishedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function GuidesTab({ sport }: { sport: NewsSport | '' }) {
  const t = useT();
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiUrl()}/resources/categories`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const sportMeta = sport ? SPORT_META[sport] : null;

  if (loading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-xl bg-[var(--card)] border border-[var(--border)] skeleton" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-12 text-center">
        {sportMeta ? (
          <>
            <div className="text-5xl mb-4">{sportMeta.icon}</div>
            <h3 className="text-xl font-bold text-[var(--text)] mb-2">{t('discover.guides_coming_soon', { sport: getSportLabel(t, sport) })}</h3>
            <p className="text-[var(--text-muted)] max-w-md mx-auto mb-4">
              {t('discover.guides_coming_desc', { sport: getSportLabel(t, sport) })}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              <Link href="/marketplace" className="text-[var(--primary)] hover:underline">
                {t('discover.marketplace_tipsters')}
              </Link>{' '}
              {t('discover.already_cover', { sport: getSportLabel(t, sport) })}
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-[var(--text)] mb-2">{t('discover.guides_coming_generic')}</h3>
            <p className="text-[var(--text-muted)] max-w-md mx-auto">
              {t('discover.guides_coming_generic_desc')}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-10">
      {sportMeta && (
        <div className="rounded-xl bg-[var(--primary-light)]/30 border border-[var(--primary)]/20 p-4 flex items-center gap-3">
          <span className="text-2xl">{sportMeta.icon}</span>
          <p className="text-sm text-[var(--text-muted)]">
            These guides cover universal tipster strategy principles that apply to <strong className="text-[var(--text)]">{sportMeta.label}</strong> and all sports we cover. Sport-specific guides are coming soon.
          </p>
        </div>
      )}
      {categories.map((cat) => (
        <div key={cat.id} className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 rounded-lg text-sm font-medium bg-[var(--primary-light)] text-[var(--primary)]">
              {getLevelLabel(t, cat.level)}
            </span>
            <h2 className="text-xl font-semibold text-[var(--text)]">{cat.name}</h2>
          </div>
          {cat.description && (
            <p className="text-[var(--text-muted)] mb-6">{cat.description}</p>
          )}
          {cat.items?.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t('discover.no_items')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {cat.items?.map((item) => (
                <Link
                  key={item.id}
                  href={`/resources/${cat.slug}/${item.slug}`}
                  className="block p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary-light)]/20 transition-all"
                >
                  <span className="text-xs font-medium text-[var(--primary)]">
                    {getTypeLabel(t, item.type)}
                  </span>
                  <h3 className="font-semibold text-[var(--text)] mt-1">{item.title}</h3>
                  {item.excerpt && (
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{item.excerpt}</p>
                  )}
                  {item.durationMinutes && (
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      {t('discover.min_read', { n: String(item.durationMinutes) })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg)]">
        <UnifiedHeader />
        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="h-12 w-64 rounded-xl bg-[var(--card)] skeleton mb-6" />
          <div className="h-8 w-full rounded bg-[var(--card)] skeleton" />
        </main>
        <AppFooter />
      </div>
    }>
      <DiscoverContent />
    </Suspense>
  );
}
