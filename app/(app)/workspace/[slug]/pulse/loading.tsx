import { Skeleton, SkeletonHeader, SkeletonStat } from '@/components/ui/Skeleton'

export default function PulseLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading pulse">
      <SkeletonHeader />
      {/* Period selector */}
      <div className="mt-4 flex gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-8 w-14 rounded-lg" />
        ))}
      </div>
      {/* Metric cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonStat key={i} />
        ))}
      </div>
      {/* Chart area */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-4 h-48 w-full rounded-lg sm:h-64" />
      </div>
      {/* Activity timeline */}
      <div className="mt-8 space-y-3">
        <Skeleton className="h-5 w-28" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 border-b border-slate-800/50 pb-3">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/4 sm:w-1/2" />
              <Skeleton className="h-2 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
