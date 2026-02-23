export default function TipsterProfileLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="sticky top-0 z-50 h-16 bg-[var(--card)] border-b border-[var(--border)]" />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-24 max-w-5xl mx-auto">
        {/* Profile header card */}
        <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 mb-6 animate-pulse">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-[var(--border)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-7 w-44 rounded-lg bg-[var(--border)] mb-2" />
              <div className="h-4 w-28 rounded bg-[var(--border)] opacity-60 mb-3" />
              {/* Sport badges */}
              <div className="flex gap-2">
                {[52, 68, 60].map((w, i) => (
                  <div key={i} className="h-6 rounded-full bg-[var(--border)] opacity-60" style={{ width: w }} />
                ))}
              </div>
            </div>
            {/* Follow button */}
            <div className="h-10 w-28 rounded-xl bg-[var(--border)]" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[var(--border)] h-16" />
            ))}
          </div>
        </div>

        {/* Sport filter pills */}
        <div className="flex gap-2 mb-5 overflow-hidden">
          {[52, 72, 68, 60, 76].map((w, i) => (
            <div
              key={i}
              className="flex-shrink-0 h-8 rounded-full bg-[var(--border)] animate-pulse"
              style={{ width: w, animationDelay: `${i * 35}ms` }}
            />
          ))}
        </div>

        {/* Coupon cards */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex justify-between mb-3">
                <div className="h-4 w-32 rounded bg-[var(--border)]" />
                <div className="h-6 w-16 rounded-full bg-[var(--border)]" />
              </div>
              <div className="h-10 w-full rounded-xl bg-[var(--border)] mb-2 opacity-60" />
              <div className="h-10 w-full rounded-xl bg-[var(--border)] opacity-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
