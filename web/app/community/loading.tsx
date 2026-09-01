export default function CommunityLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="h-[4.5rem] bg-[var(--card)] border-b border-[var(--border)] animate-pulse" />
      <div className="section-ux-community-shell flex-1">
        <aside className="w-64 shrink-0 hidden md:flex flex-col gap-2">
          <div className="h-4 w-16 bg-[var(--fill-secondary)] rounded animate-pulse mb-2" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 bg-[var(--fill-secondary)] rounded-lg animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </aside>

        <div className="flex-1 bg-[var(--card)] rounded-xl border border-[var(--border)] flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--separator)]">
            <div className="h-6 w-36 bg-[var(--fill-secondary)] rounded animate-pulse" />
          </div>
          <div className="flex-1 px-4 py-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--fill-secondary)] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-[var(--fill-secondary)] rounded animate-pulse" />
                  <div className="h-4 bg-[var(--fill-secondary)] rounded animate-pulse" style={{ width: `${50 + (i % 4) * 15}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-[var(--separator)]">
            <div className="h-10 bg-[var(--fill-secondary)] rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
