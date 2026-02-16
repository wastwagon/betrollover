'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

interface ResourceCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  level: string;
  items: { id: number; slug: string; title: string; excerpt: string | null; type: string; durationMinutes: number | null }[];
}

export default function ResourcesPage() {
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/resources/categories`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Resource Center</h1>
            <p className="text-[var(--text-muted)] mb-8">
              Learn betting strategies, bankroll management, and analysis tools.
            </p>

            {loading ? (
              <div className="space-y-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 rounded-xl bg-[var(--card)] border border-[var(--border)] skeleton" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-12 text-center">
                <p className="text-[var(--text-muted)]">No resources yet. Content coming soon.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {categories.map((cat) => (
                  <section key={cat.id} className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6">
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
                  </section>
                ))}
              </div>
            )}
          </div>
          <aside className="lg:w-72 flex-shrink-0">
            <div className="sticky top-24">
              <AdSlot zoneSlug="resource-sidebar" />
            </div>
          </aside>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
