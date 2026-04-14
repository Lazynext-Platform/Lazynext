import { Skeleton, SkeletonHeader, SkeletonTabs } from '@/components/ui/Skeleton'

export default function AutomationsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading automations">
      <SkeletonHeader hasAction />
      {/* Filter pills */}
      <div className="mt-6 flex gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>
      {/* Automation cards */}
      <div className="mt-4 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:gap-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40 sm:w-56" />
              <Skeleton className="h-3 w-24 sm:w-36" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        ))}
      </div>
      {/* Run history table */}
      <div className="mt-8 space-y-2">
        <Skeleton className="h-5 w-28" />
        <SkeletonTabs count={3} />
        <div className="space-y-1 pt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-32 sm:w-48" />
              <Skeleton className="ml-auto h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
