export default function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="sticky top-0 z-50 h-16 bg-[var(--card)] border-b border-[var(--border)]" />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-24 max-w-6xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <div className="h-3 w-20 rounded-full bg-[var(--border)] animate-pulse mb-2" />
          <div className="h-7 w-40 rounded-lg bg-[var(--border)] animate-pulse mb-1" />
          <div className="h-4 w-80 rounded-full bg-[var(--border)] animate-pulse opacity-60" />
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-5 border-b border-[var(--border)] pb-3">
          {[80, 60, 90, 70].map((w, i) => (
            <div
              key={i}
              className="h-9 rounded-lg bg-[var(--border)] animate-pulse"
              style={{ width: w, animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>

        {/* Sport filter chips */}
        <div className="flex gap-2 mb-5 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 h-8 w-24 rounded-full bg-[var(--border)] animate-pulse"
              style={{ animationDelay: `${i * 35}ms` }}
            />
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 animate-pulse"
              style={{ animationDelay: `${i * 55}ms` }}
            >
              <div className="flex gap-2 mb-3">
                <div className="h-5 w-16 rounded-full bg-[var(--border)]" />
                <div className="h-5 w-20 rounded-full bg-[var(--border)] opacity-60" />
              </div>
              <div className="h-5 w-3/4 rounded bg-[var(--border)] mb-2" />
              <div className="h-4 w-full rounded bg-[var(--border)] opacity-60 mb-1" />
              <div className="h-4 w-2/3 rounded bg-[var(--border)] opacity-40" />
              <div className="mt-4 flex justify-between items-center">
                <div className="h-3 w-20 rounded bg-[var(--border)] opacity-50" />
                <div className="h-8 w-20 rounded-lg bg-[var(--border)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
