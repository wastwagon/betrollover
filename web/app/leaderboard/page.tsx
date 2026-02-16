'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { AppFooter } from '@/components/AppFooter';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

interface LeaderboardEntry {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  roi?: number;
  win_rate?: number;
  total_predictions?: number;
  total_wins?: number;
  total_losses?: number;
  total_profit?: number;
  leaderboard_rank?: number;
  rank?: number;
  monthly_predictions?: number;
  monthly_wins?: number;
  monthly_profit?: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<'all_time' | 'monthly' | 'weekly'>('all_time');
  const [loading, setLoading] = useState(true);
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/leaderboard?period=${period}&limit=50`)
      .then((r) => (r.ok ? r.json() : { leaderboard: [] }))
      .then((data) => setEntries(data.leaderboard || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)]">Leaderboard</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Top tipsters by performance. Follow your favorites and track their results.
          </p>
          <div className="flex gap-2 mt-4">
            {(['all_time', 'monthly', 'weekly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  period === p
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--border)]'
                }`}
              >
                {p === 'all_time' ? 'All Time' : p === 'monthly' ? 'This Month' : 'This Week'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton count={5} />
        ) : entries.length === 0 ? (
          <EmptyState
            title="No leaderboard data"
            description="Tipsters will appear here once they have predictions and results."
            actionLabel="Browse Tipsters"
            actionHref="/tipsters"
          />
        ) : (
          <div className="space-y-3">
            {entries.map((entry, idx) => {
              const rank = entry.rank ?? entry.leaderboard_rank ?? idx + 1;
              const roi = entry.roi ?? entry.monthly_profit;
              return (
                <Link
                  key={entry.id}
                  href={`/tipsters/${entry.username}`}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors"
                >
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--primary)]/20 text-[var(--primary)] font-bold flex items-center justify-center">
                    #{rank}
                  </span>
                  <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-[var(--bg)] border border-[var(--border)]">
                    {entry.avatar_url && !failedAvatars.has(entry.username) ? (
                      <img src={entry.avatar_url} alt={entry.display_name} className="w-full h-full object-cover" onError={() => setFailedAvatars((s) => new Set(s).add(entry.username))} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-[var(--primary)] bg-[var(--primary-light)]">
                        {entry.display_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text)]">{entry.display_name}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {entry.total_predictions ?? entry.monthly_predictions ?? 0} predictions
                      {entry.total_wins != null && ` · ${entry.total_wins}W`}
                      {entry.total_losses != null && ` ${entry.total_losses}L`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${Number(roi) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {period === 'all_time' && entry.roi != null
                        ? `${Number(entry.roi).toFixed(2)}% ROI`
                        : entry.monthly_profit != null
                          ? `${Number(entry.monthly_profit).toFixed(2)} pts`
                          : entry.total_profit != null
                            ? `${Number(entry.total_profit).toFixed(2)} pts`
                            : '—'}
                    </p>
                    {entry.win_rate != null && (
                      <p className="text-xs text-[var(--text-muted)]">{Number(entry.win_rate).toFixed(1)}% win rate</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
