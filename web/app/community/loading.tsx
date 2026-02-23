export default function CommunityLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      <div className="h-16 bg-white/5 border-b border-white/10 animate-pulse" />
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 py-6 gap-4">
        {/* Sidebar skeleton */}
        <aside className="w-64 shrink-0 hidden md:flex flex-col gap-2">
          <div className="h-4 w-16 bg-gray-800 rounded animate-pulse mb-2" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </aside>

        {/* Chat panel skeleton */}
        <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="h-6 w-36 bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="flex-1 px-4 py-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 bg-gray-800 rounded animate-pulse" style={{ width: `${50 + (i % 4) * 15}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-800">
            <div className="h-10 bg-gray-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
