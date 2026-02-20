'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/site-config';

interface PopularEvent {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  leagueName: string | null;
  matchDate: string;
  tipCount: number;
}

function formatDate(s: string): string {
  try {
    const d = new Date(s);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
}

export function HomePopularEvents() {
  const [events, setEvents] = useState<PopularEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiUrl()}/accumulators/popular-events?limit=6`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-12 md:py-16 border-t border-[var(--border)] bg-[var(--bg-warm)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[var(--text)]">Popular Football Events</h2>
          <Link href="/marketplace" className="text-sm font-medium text-[var(--primary)] hover:underline">
            View marketplace →
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--card)] animate-pulse" />
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="space-y-2">
            {events.map((e) => (
              <Link
                key={e.fixtureId}
                href="/marketplace"
                className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-[var(--text)]">
                    {e.homeTeam} v {e.awayTeam}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {e.leagueName || 'Football'} • {formatDate(e.matchDate)}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-medium">
                  {e.tipCount} tips
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[var(--text-muted)] text-center py-8">No upcoming events with tips yet.</p>
        )}
      </div>
    </section>
  );
}
