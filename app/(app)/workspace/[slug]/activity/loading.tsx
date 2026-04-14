import { Skeleton, SkeletonHeader, SkeletonTabs } from '@/components/ui/Skeleton'

export default function ActivityLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading activity">
      <SkeletonHeader />
      {/* Tab: Feed | Audit */}
      <div className="mt-6">
        <SkeletonTabs count={2} />
      </div>
      {/* Timeline items */}
      <div className="mt-6 space-y-1">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-start gap-3 border-b border-slate-800/30 py-3">
            <Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4 sm:w-1/2" />
              <Skeleton className="h-3 w-full sm:w-2/3" />
              <Skeleton className="h-2 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
