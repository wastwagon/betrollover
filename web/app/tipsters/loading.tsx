export default function TipstersLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="sticky top-0 z-50 h-16 bg-[var(--card)] border-b border-[var(--border)]" />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-24 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <div className="h-3 w-24 rounded-full bg-[var(--border)] animate-pulse mb-2" />
          <div className="h-7 w-44 rounded-lg bg-[var(--border)] animate-pulse mb-1" />
          <div className="h-4 w-72 rounded-full bg-[var(--border)] animate-pulse opacity-60" />
        </div>

        {/* Search + filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="h-10 flex-1 min-w-[200px] rounded-xl bg-[var(--border)] animate-pulse" />
          <div className="h-10 w-36 rounded-xl bg-[var(--border)] animate-pulse opacity-70" />
        </div>

        {/* Tipster cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[var(--border)]" />
                <div className="flex-1">
                  <div className="h-4 w-28 rounded bg-[var(--border)] mb-1.5" />
                  <div className="h-3 w-20 rounded bg-[var(--border)] opacity-60" />
                </div>
              </div>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="rounded-lg bg-[var(--border)] h-14" />
                ))}
              </div>
              {/* CTA */}
              <div className="h-9 w-full rounded-xl bg-[var(--border)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
