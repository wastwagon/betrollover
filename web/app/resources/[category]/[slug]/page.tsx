'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { AppFooter } from '@/components/AppFooter';

interface ResourceItem {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  type: string;
  durationMinutes: number | null;
  category: { slug: string; name: string };
}

export default function ResourceItemPage() {
  const params = useParams();
  const categorySlug = params?.category as string;
  const itemSlug = params?.slug as string;
  const [item, setItem] = useState<ResourceItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categorySlug || !itemSlug) return;
    fetch(`/api/resources/categories/${categorySlug}/items/${itemSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [categorySlug, itemSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <SiteHeader />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="h-8 w-48 rounded bg-[var(--card)] skeleton mb-6" />
          <div className="h-4 w-full rounded bg-[var(--card)] skeleton mb-4" />
          <div className="h-4 w-full rounded bg-[var(--card)] skeleton" />
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <SiteHeader />
        <main className="max-w-3xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-[var(--text)] mb-4">Resource not found</h1>
          <Link href="/resources" className="text-[var(--primary)] hover:underline">
            Back to Resources
          </Link>
        </main>
        <AppFooter />
      </div>
    );
  }

  const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/resources"
          className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline mb-8 transition-colors"
        >
          ← Back to Resources
        </Link>
        <article className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
              {typeLabel}
            </span>
            {item.durationMinutes && (
              <span className="text-sm text-[var(--text-muted)]">
                {item.durationMinutes} min read
              </span>
            )}
            {item.category?.name && (
              <span className="text-sm text-[var(--text-muted)]">
                · {item.category.name}
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--text)] leading-tight mb-6">
            {item.title}
          </h1>
          <div className="prose prose-slate prose-sm max-w-none text-[var(--text)] text-[15px] leading-relaxed [&>p]:mb-4">
            {(item.content || '').trim()
              ? item.content.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)
              : null}
          </div>
        </article>
      </main>
      <AppFooter />
    </div>
  );
}
