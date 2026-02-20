'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { getApiUrl } from '@/lib/site-config';

const NEWS_API = '/api/news';

type TabId = 'news' | 'guides';

type NewsCategory = 'news' | 'transfer_rumour' | 'confirmed_transfer' | 'gossip';

interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  category: NewsCategory;
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

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  news: 'News',
  transfer_rumour: 'Transfer Rumours',
  confirmed_transfer: 'Confirmed Transfers',
  gossip: 'Gossip',
};

const levelLabels: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const typeLabels: Record<string, string> = {
  article: 'Article',
  strategy: 'Strategy',
  tool: 'Tool',
};

function DiscoverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const initialTab: TabId = tabParam === 'guides' ? 'guides' : 'news';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    const t = tabParam === 'guides' ? 'guides' : 'news';
    setActiveTab(t);
  }, [tabParam]);

  const setTab = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/discover?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PageHeader
          label="Discover"
          title="Football News, Transfers & Betting Guides"
          tagline="Stay informed with the latest football news, transfer updates, and expert betting strategies."
        />

        {/* SEO-rich static content - in initial HTML for crawlers & LLM readability */}
        <section className="mb-10 rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 md:p-8">
          <h2 className="text-xl font-bold text-[var(--text)] mb-4">Your Hub for Football Insights</h2>
          <p className="text-[var(--text-muted)] leading-relaxed mb-4">
            Explore the latest football news, transfer rumours, and confirmed deals from top leagues worldwide. Our news section keeps you ahead with breaking stories, while our betting guides and resources help you understand odds, bankroll management, and tipster strategies. Whether you&apos;re tracking your favourite club&apos;s signings or learning how to use betting tips responsibly, Discover has you covered.
          </p>
          <p className="text-[var(--text-muted)] leading-relaxed mb-4">
            Browse articles by category—news, transfer rumours, confirmed transfers, and gossip—or dive into beginner and advanced guides on football betting. Combine what you learn here with our verified tipsters and escrow-protected picks for a complete betting toolkit.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-[var(--bg)]/50 border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)] mb-2">News & Transfers</h3>
              <p className="text-sm text-[var(--text-muted)]">Breaking football news, transfer rumours, confirmed deals, and insider gossip from trusted sources.</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg)]/50 border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)] mb-2">Guides & Resources</h3>
              <p className="text-sm text-[var(--text-muted)]">Beginner to advanced betting guides, bankroll strategies, and tips on using accumulator picks wisely.</p>
            </div>
          </div>
        </section>

        <div className="mb-8">
          <div className="flex gap-2">
            {[
              { id: 'news' as TabId, label: 'News & Transfers', icon: '📰' },
              { id: 'guides' as TabId, label: 'Guides & Resources', icon: '📚' },
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

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            {activeTab === 'news' ? (
              <NewsTab />
            ) : (
              <GuidesTab />
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

function NewsTab() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'all'>('all');

  useEffect(() => {
    const category = activeCategory === 'all' ? undefined : activeCategory;
    const url = category ? `${NEWS_API}?category=${category}` : NEWS_API;
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
            imageUrl: a.imageUrl != null || a.image_url != null ? String(a.imageUrl ?? a.image_url ?? '') : null,
            publishedAt: a.publishedAt != null || a.published_at != null ? String(a.publishedAt ?? a.published_at ?? '') : null,
          }))
        );
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const tabs: { key: NewsCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'news', label: 'News' },
    { key: 'transfer_rumour', label: 'Rumours' },
    { key: 'confirmed_transfer', label: 'Confirmed' },
    { key: 'gossip', label: 'Gossip' },
  ];

  return (
    <section>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
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
          <h3 className="font-semibold text-[var(--text)] mb-2">No articles yet</h3>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">We&apos;re preparing the latest football news, transfer rumours, and confirmed deals. Check back soon or explore our betting guides and tipster marketplace in the meantime.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/news/${a.slug}`}
              className="block rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 overflow-hidden transition-all card-hover"
            >
              <div className="flex flex-col sm:flex-row">
                {a.imageUrl && (
                  <div className="sm:w-48 h-32 sm:h-auto flex-shrink-0 bg-[var(--bg)]">
                    <img src={a.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6 flex-1">
                  <span className="text-xs font-medium text-[var(--primary)] uppercase">
                    {CATEGORY_LABELS[a.category]}
                  </span>
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
          ))}
        </div>
      )}
    </section>
  );
}

function GuidesTab() {
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiUrl()}/resources/categories`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

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
        <h3 className="font-semibold text-[var(--text)] mb-2">Guides coming soon</h3>
        <p className="text-[var(--text-muted)] max-w-md mx-auto">We&apos;re building beginner and advanced betting guides to help you understand odds, bankroll management, and how to use tipster picks. In the meantime, browse our marketplace for verified football tips.</p>
      </div>
    );
  }

  return (
    <section className="space-y-10">
      {categories.map((cat) => (
        <div key={cat.id} className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 rounded-lg text-sm font-medium bg-[var(--primary-light)] text-[var(--primary)]">
              {levelLabels[cat.level] || cat.level}
            </span>
            <h2 className="text-xl font-semibold text-[var(--text)]">{cat.name}</h2>
          </div>
          {cat.description && (
            <p className="text-[var(--text-muted)] mb-6">{cat.description}</p>
          )}
          {cat.items?.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No items yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {cat.items?.map((item) => (
                <Link
                  key={item.id}
                  href={`/resources/${cat.slug}/${item.slug}`}
                  className="block p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary-light)]/20 transition-all"
                >
                  <span className="text-xs font-medium text-[var(--primary)]">
                    {typeLabels[item.type] || item.type}
                  </span>
                  <h3 className="font-semibold text-[var(--text)] mt-1">{item.title}</h3>
                  {item.excerpt && (
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{item.excerpt}</p>
                  )}
                  {item.durationMinutes && (
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      {item.durationMinutes} min read
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
