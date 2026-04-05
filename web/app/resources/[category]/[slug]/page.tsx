'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';

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
  const t = useT();
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
      <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <UnifiedHeader />
        <main className="section-ux-page-narrow w-full min-w-0">
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
      <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <UnifiedHeader />
        <main className="section-ux-page-narrow text-center w-full min-w-0 px-4 sm:px-0">
          <h1 className="text-lg font-semibold text-[var(--text)] mb-4">{t('discover.resource_not_found')}</h1>
          <Link href="/discover?tab=guides" className="text-[var(--primary)] hover:underline">
            {t('discover.back_to_discover')}
          </Link>
        </main>
        <AppFooter />
      </div>
    );
  }

  const typeKey = `discover.type_${item.type}` as 'discover.type_article' | 'discover.type_strategy' | 'discover.type_tool';
  const typeLabel = ['article', 'strategy', 'tool'].includes(item.type) ? t(typeKey) : item.type.charAt(0).toUpperCase() + item.type.slice(1);

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page w-full min-w-0">
        <PageHeader
          label={typeLabel}
          title={item.title}
          tagline={
            [
              item.category?.name,
              item.durationMinutes ? t('discover.min_read', { n: String(item.durationMinutes) }) : '',
            ]
              .filter(Boolean)
              .join(' · ') || undefined
          }
        />
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 mb-6">
          <Link
            href="/discover?tab=guides"
            className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full sm:w-auto"
          >
            ← {t('discover.back_to_discover')}
          </Link>
        </div>
        <div className="mb-6">
          <AdSlot zoneSlug="resource-item-full" fullWidth className="w-full max-w-3xl" />
        </div>
        <article className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 sm:p-8 shadow-sm min-w-0">
          <div className="prose prose-slate prose-sm max-w-none text-[var(--text)] text-[15px] leading-relaxed [&>p]:mb-4 min-w-0">
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
