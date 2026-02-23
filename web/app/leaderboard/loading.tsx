export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="sticky top-0 z-50 h-16 bg-[var(--card)] border-b border-[var(--border)]" />

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
        {/* Page header */}
        <div className="mb-6">
          <div className="h-3 w-24 rounded-full bg-[var(--border)] animate-pulse mb-2" />
          <div className="h-7 w-40 rounded-lg bg-[var(--border)] animate-pulse mb-1" />
          <div className="h-4 w-64 rounded-full bg-[var(--border)] animate-pulse opacity-60" />
        </div>

        {/* Period + Sport filter tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {['7d', '30d', 'All Time'].map((t) => (
            <div key={t} className="h-9 w-20 rounded-lg bg-[var(--border)] animate-pulse" />
          ))}
        </div>

        {/* Leaderboard rows */}
        <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-5 py-4 animate-pulse ${
                i < 9 ? 'border-b border-[var(--border)]' : ''
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Rank */}
              <div className="w-7 h-7 rounded-full bg-[var(--border)] flex-shrink-0" />
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[var(--border)] flex-shrink-0" />
              {/* Name + username */}
              <div className="flex-1 min-w-0">
                <div className="h-4 w-32 rounded bg-[var(--border)] mb-1.5" />
                <div className="h-3 w-20 rounded bg-[var(--border)] opacity-60" />
              </div>
              {/* Stats */}
              <div className="hidden sm:flex gap-5">
                {[40, 28, 36].map((w, j) => (
                  <div key={j} className={`h-4 rounded bg-[var(--border)]`} style={{ width: w }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
