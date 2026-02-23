export default function NewsLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="sticky top-0 z-50 h-16 bg-[var(--card)] border-b border-[var(--border)]" />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-24 max-w-6xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <div className="h-3 w-16 rounded-full bg-[var(--border)] animate-pulse mb-2" />
          <div className="h-7 w-32 rounded-lg bg-[var(--border)] animate-pulse mb-1" />
          <div className="h-4 w-64 rounded-full bg-[var(--border)] animate-pulse opacity-60" />
        </div>

        {/* Category tabs + sport chips */}
        <div className="flex gap-2 mb-3 overflow-hidden">
          {[56, 80, 72, 64, 80].map((w, i) => (
            <div
              key={i}
              className="flex-shrink-0 h-9 rounded-lg bg-[var(--border)] animate-pulse"
              style={{ width: w, animationDelay: `${i * 35}ms` }}
            />
          ))}
        </div>
        <div className="flex gap-2 mb-6 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 h-8 w-24 rounded-full bg-[var(--border)] animate-pulse opacity-70"
              style={{ animationDelay: `${i * 30}ms` }}
            />
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex gap-2 mb-3">
                  <div className="h-5 w-20 rounded-full bg-[var(--border)]" />
                  <div className="h-5 w-16 rounded-full bg-[var(--border)] opacity-60" />
                </div>
                <div className="h-5 w-4/5 rounded bg-[var(--border)] mb-2" />
                <div className="h-4 w-full rounded bg-[var(--border)] opacity-60 mb-1" />
                <div className="h-4 w-3/4 rounded bg-[var(--border)] opacity-40 mb-3" />
                <div className="h-3 w-24 rounded bg-[var(--border)] opacity-40" />
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 animate-pulse h-48" />
            <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 animate-pulse h-32 opacity-70" />
          </div>
        </div>
      </div>
    </div>
  );
}
