export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 h-16 bg-[var(--card)] border-b border-[var(--border)]" />

      <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
        {/* Page header */}
        <div className="mb-6">
          <div className="h-3 w-24 rounded-full bg-[var(--border)] animate-pulse mb-2" />
          <div className="h-7 w-48 rounded-lg bg-[var(--border)] animate-pulse mb-1" />
          <div className="h-4 w-72 rounded-full bg-[var(--border)] animate-pulse opacity-60" />
        </div>

        {/* Sport chips row */}
        <div className="flex gap-2 mb-4 overflow-hidden">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 h-9 w-24 rounded-lg bg-[var(--border)] animate-pulse"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>

        {/* Filter row */}
        <div className="flex gap-3 mb-5">
          <div className="h-8 w-32 rounded-lg bg-[var(--border)] animate-pulse" />
          <div className="h-8 w-40 rounded-lg bg-[var(--border)] animate-pulse opacity-70" />
        </div>

        {/* Pick cards grid */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Tipster row */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-[var(--border)]" />
                <div className="flex-1">
                  <div className="h-3.5 w-28 rounded bg-[var(--border)] mb-1.5" />
                  <div className="h-3 w-20 rounded bg-[var(--border)] opacity-60" />
                </div>
                <div className="h-6 w-16 rounded-full bg-[var(--border)]" />
              </div>
              {/* Picks rows */}
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="h-10 rounded-xl bg-[var(--border)] mb-2 opacity-60" />
              ))}
              {/* Footer */}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--border)]">
                <div className="h-5 w-16 rounded bg-[var(--border)]" />
                <div className="h-9 w-28 rounded-xl bg-[var(--border)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
