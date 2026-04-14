import { Skeleton, SkeletonHeader, SkeletonSearch } from '@/components/ui/Skeleton'

export default function DecisionsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading decisions">
      <SkeletonHeader hasAction />
      {/* Search + filter chips */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SkeletonSearch className="sm:max-w-xs" />
        <div className="flex gap-2 overflow-x-auto">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-full" />
          ))}
        </div>
      </div>
      {/* Decision cards */}
      <div className="mt-6 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 sm:w-1/2" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="hidden h-6 w-16 rounded-lg sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
