import { Skeleton, SkeletonStat, SkeletonCard, SkeletonHeader } from '@/components/ui/Skeleton'

export default function WorkspaceLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading workspace">
      {/* Welcome header */}
      <SkeletonHeader hasAction />
      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonStat key={i} />
        ))}
      </div>
      {/* Recent workflows */}
      <div className="mt-8 space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} lines={2} hasAvatar />
          ))}
        </div>
      </div>
      {/* Activity feed */}
      <div className="mt-8 space-y-3">
        <Skeleton className="h-5 w-28" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 py-2">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/4 sm:w-1/2" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
