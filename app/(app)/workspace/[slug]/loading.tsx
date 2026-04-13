export default function WorkspaceLoading() {
  return (
    <div className="h-full min-h-[60vh] p-6 space-y-4" aria-busy="true" aria-label="Loading workspace content">
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-800" />
        <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-800" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-3 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-pulse rounded bg-slate-800" style={{ animationDelay: `${i * 0.05}s` }} />
              <div className="h-3 w-16 animate-pulse rounded bg-slate-800" style={{ animationDelay: `${i * 0.05}s` }} />
            </div>
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" style={{ animationDelay: `${i * 0.05}s` }} />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-800" style={{ animationDelay: `${i * 0.05}s` }} />
          </div>
        ))}
      </div>
    </div>
  )
}
