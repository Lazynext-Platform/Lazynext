import { Skeleton, SkeletonHeader, SkeletonStat } from '@/components/ui/Skeleton'

export default function DecisionHealthLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading decision health">
      <SkeletonHeader />
      {/* Score display */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonStat key={i} />
        ))}
      </div>
      {/* Chart area */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-4 h-48 w-full rounded-lg sm:h-64" />
      </div>
      {/* Decision makers table */}
      <div className="mt-8 space-y-2">
        <Skeleton className="h-5 w-32" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-24 sm:w-32" />
            <Skeleton className="ml-auto h-3 w-12" />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  )
}
