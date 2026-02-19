'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { AppFooter } from '@/components/AppFooter';

import { getApiUrl } from '@/lib/site-config';

interface PageData {
  slug: string;
  title: string;
  content: string;
  metaDescription: string | null;
}

export function ContentPage({ slug, fallbackTitle }: { slug: string; fallbackTitle: string }) {
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiUrl()}/pages/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <SiteHeader />
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <SiteHeader />
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <h1 className="text-2xl font-bold text-[var(--text)]">Page not found</h1>
          <Link href="/" className="mt-4 text-[var(--primary)] hover:underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />

      <main>
        <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-6">
          {page.title || fallbackTitle}
        </h1>
        <div className="prose prose-slate max-w-none">
          <div className="text-[var(--text)] whitespace-pre-wrap leading-relaxed">
            {page.content}
          </div>
        </div>
        </article>

        <div className="mt-16">
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
