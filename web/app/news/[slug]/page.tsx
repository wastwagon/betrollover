'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';

interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
}

export default function NewsArticlePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/news/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setArticle)
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <UnifiedHeader />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="h-8 w-48 rounded bg-[var(--card)] skeleton mb-6" />
          <div className="h-4 w-full rounded bg-[var(--card)] skeleton mb-4" />
          <div className="h-4 w-full rounded bg-[var(--card)] skeleton" />
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <UnifiedHeader />
        <main className="max-w-3xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-[var(--text)] mb-4">Article not found</h1>
          <Link href="/discover?tab=news" className="text-[var(--primary)] hover:underline">
            Back to Discover
          </Link>
        </main>
        <AppFooter />
      </div>
    );
  }

  const categoryLabel = article.category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/discover?tab=news"
          className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline mb-8 transition-colors"
        >
          ← Back to Discover
        </Link>
        <article className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
              {categoryLabel}
            </span>
            {article.publishedAt && (
              <span className="text-sm text-[var(--text-muted)]">
                {new Date(article.publishedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--text)] leading-tight mb-6">
            {article.title}
          </h1>
          {article.imageUrl && (
            <div className="relative w-full h-64 mb-6 rounded-xl overflow-hidden">
              <Image src={article.imageUrl} alt="" fill className="object-cover" unoptimized sizes="(max-width: 768px) 100vw, 768px" />
            </div>
          )}
          <div className="prose prose-slate prose-sm max-w-none text-[var(--text)] text-[15px] leading-relaxed [&>p]:mb-4">
            {(article.content || '').trim()
              ? article.content.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)
              : null}
          </div>
          {article.sourceUrl && (
            <p className="mt-8 pt-6 border-t border-[var(--border)] text-sm text-[var(--text-muted)]">
              Source:{' '}
              <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
                {article.sourceUrl}
              </a>
            </p>
          )}
        </article>
      </main>
      <AppFooter />
    </div>
  );
}
