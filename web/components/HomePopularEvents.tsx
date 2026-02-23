'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/site-config';
import { TeamBadge } from './TeamBadge';
import { useT } from '@/context/LanguageContext';

interface PopularEvent {
  fixtureId: number;
  sport?: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  homeCountryCode?: string | null;
  awayCountryCode?: string | null;
  leagueName: string | null;
  matchDate: string;
  tipCount: number;
}

const SPORT_ICON: Record<string, string> = {
  football: '⚽',
  basketball: '🏀',
  rugby: '🏉',
  mma: '🥊',
  volleyball: '🏐',
  hockey: '🏒',
  american_football: '🏈',
};

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
  const t = useT();
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
          <h2 className="text-2xl font-bold text-[var(--text)]">{t('home.popular_events')}</h2>
          <Link href="/marketplace" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
            {t('home.view_marketplace')} →
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
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--text)] truncate flex items-center gap-2">
                    {(e.homeTeamLogo || e.awayTeamLogo || e.homeCountryCode || e.awayCountryCode) && (
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <TeamBadge logo={e.homeTeamLogo} countryCode={e.homeCountryCode} name={e.homeTeam} size={24} />
                        <TeamBadge logo={e.awayTeamLogo} countryCode={e.awayCountryCode} name={e.awayTeam} size={24} />
                      </span>
                    )}
                    {e.homeTeam} v {e.awayTeam}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
                    {e.sport && SPORT_ICON[e.sport] && (
                      <span className="text-xs">{SPORT_ICON[e.sport]}</span>
                    )}
                    {e.leagueName || (e.sport ? e.sport.charAt(0).toUpperCase() + e.sport.slice(1) : 'Sport')} • {formatDate(e.matchDate)}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-medium flex-shrink-0">
                  {e.tipCount} tips
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[var(--text-muted)] text-center py-8">{t('marketplace.no_picks_sub')}</p>
        )}
      </div>
    </section>
  );
}
