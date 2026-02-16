'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TipsterCard, type TipsterCardData } from '@/components/TipsterCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { SiteHeader } from '@/components/SiteHeader';
import { AppFooter } from '@/components/AppFooter';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

export default function TipstersPage() {
  const router = useRouter();
  const [tipsters, setTipsters] = useState<TipsterCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTipsters = useCallback((searchTerm?: string) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const params = new URLSearchParams({ limit: '50', sort_by: 'roi', order: 'desc' });
    if (searchTerm?.trim()) params.set('search', searchTerm.trim());
    fetch(`${API_URL}/tipsters?${params}`, { headers })
      .then((r) => (r.ok ? r.json() : { tipsters: [] }))
      .then((data) => setTipsters(data.tipsters || []))
      .catch(() => setTipsters([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchTipsters(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, fetchTipsters]);

  const handleFollow = (tipster: TipsterCardData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/login?redirect=/tipsters`);
      return;
    }
    const isFollowing = tipster.is_following;
    fetch(`${API_URL}/tipsters/${encodeURIComponent(tipster.username)}/follow`, {
      method: isFollowing ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => {
      if (r.ok) fetchTipsters(search);
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)]">Tipsters</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Browse verified tipsters. Follow your favorites and track their performance.
          </p>
          <div className="mt-4">
            <input
              type="search"
              placeholder="Search tipsters by name or bio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              aria-label="Search tipsters"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <LoadingSkeleton key={i} count={1} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : tipsters.length === 0 ? (
          <EmptyState
            title="No tipsters yet"
            description="Tipsters will appear here soon. Check back later."
            actionLabel="Back to Home"
            actionHref="/"
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tipsters.map((t) => (
              <TipsterCard
                key={t.id}
                tipster={t}
                onFollow={() => handleFollow(t)}
              />
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
