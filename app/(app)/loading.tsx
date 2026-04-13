export default function AppLoading() {
  return (
    <div className="flex min-h-screen bg-slate-950" aria-busy="true" aria-label="Loading workspace">
      {/* Sidebar skeleton */}
      <div className="hidden w-60 flex-col border-r border-slate-800 md:flex">
        <div className="flex h-12 items-center border-b border-slate-800 px-4">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="space-y-2 p-3">
          <div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <div className="h-4 w-4 animate-pulse rounded bg-slate-800" style={{ animationDelay: `${i * 0.05}s` }} />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-800" style={{ animationDelay: `${i * 0.05}s` }} />
            </div>
          ))}
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="flex-1">
        <div className="flex h-12 items-center border-b border-slate-800 px-4">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="p-6 space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-800" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-800/60" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
