'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Use /api/news proxy (works in Docker)
const NEWS_API = '/api/news';

interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  publishedAt: string | null;
}

export function NewsWidget() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);

  useEffect(() => {
    fetch(`${NEWS_API}?limit=8&featured=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setArticles(Array.isArray(data) ? data : []))
      .catch(() => setArticles([]));
  }, []);

  if (articles.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-[var(--bg)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[var(--text)]">Latest News</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Football news, transfers & gossip</p>
          </div>
          <Link
            href="/news"
            className="text-sm text-[var(--primary)] font-semibold hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.slice(0, 6).map((a) => (
            <Link
              key={a.id}
              href={`/news/${a.slug}`}
              className="block p-4 rounded-xl bg-white border border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-md transition-all"
            >
              <span className="text-[10px] font-medium text-[var(--primary)] uppercase">{a.category.replace('_', ' ')}</span>
              <h3 className="font-semibold text-sm text-[var(--text)] mt-1.5 line-clamp-2">{a.title}</h3>
              {a.excerpt && <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{a.excerpt}</p>}
              {a.publishedAt && (
                <p className="text-[10px] text-[var(--text-muted)] mt-2">{new Date(a.publishedAt).toLocaleDateString()}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
