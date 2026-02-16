'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';

// Use /api/news proxy so Next.js server fetches from backend (works in Docker)
const NEWS_API = '/api/news';

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

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  news: 'News',
  transfer_rumour: 'Transfer Rumours',
  confirmed_transfer: 'Confirmed Transfers',
  gossip: 'Gossip',
};

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NewsCategory | 'all'>('all');

  useEffect(() => {
    const category = activeTab === 'all' ? undefined : activeTab;
    const url = category ? `${NEWS_API}?category=${category}` : NEWS_API;
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        // Normalize snake_case from backend to camelCase
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
  }, [activeTab]);

  const tabs: { key: NewsCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'news', label: 'News' },
    { key: 'transfer_rumour', label: 'Rumours' },
    { key: 'confirmed_transfer', label: 'Confirmed' },
    { key: 'gossip', label: 'Gossip' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[var(--text)] mb-6">Football News & Transfers</h1>
            <div className="flex flex-wrap gap-2 mb-8">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.key
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
                <p className="text-[var(--text-muted)]">No articles yet. Check back soon for football news and transfers.</p>
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
          </div>
          <aside className="lg:w-72 flex-shrink-0">
            <div className="sticky top-24">
              <AdSlot zoneSlug="news-sidebar" />
            </div>
          </aside>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
