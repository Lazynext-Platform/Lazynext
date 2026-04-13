export default function GuideLoading() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="border-b border-slate-800 bg-gradient-to-b from-brand/5 to-transparent px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-4 h-14 w-14 animate-pulse rounded-2xl bg-slate-800" />
          <div className="mx-auto h-9 w-64 animate-pulse rounded-lg bg-slate-800" />
          <div className="mx-auto mt-3 h-5 w-96 animate-pulse rounded-lg bg-slate-800/50" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={`guide-skeleton-${i}`} className="h-20 animate-pulse rounded-2xl bg-slate-900 border border-slate-800" />
        ))}
      </div>
    </div>
  )
}
