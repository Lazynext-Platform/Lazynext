export default function MarketingLoading() {
  return (
    <div className="min-h-screen bg-white" aria-busy="true" aria-label="Loading page">
      {/* Header skeleton */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6">
        <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
        <div className="flex gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 w-16 animate-pulse rounded bg-slate-200" style={{ animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      </div>
      {/* Hero skeleton */}
      <div className="mx-auto max-w-4xl px-6 pt-32 text-center space-y-6">
        <div className="mx-auto h-6 w-48 animate-pulse rounded-full bg-slate-100" />
        <div className="mx-auto h-12 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="mx-auto h-5 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="flex justify-center gap-4 pt-4">
          <div className="h-12 w-36 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-12 w-36 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  )
}
