import { Skeleton, SkeletonHeader, SkeletonSearch, SkeletonStat } from '@/components/ui/Skeleton'

export default function MembersLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading members">
      <SkeletonHeader hasAction />
      {/* Stats bar */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
      {/* Search */}
      <div className="mt-6">
        <SkeletonSearch className="max-w-xs" />
      </div>
      {/* Member rows */}
      <div className="mt-4 space-y-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-3 sm:px-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32 sm:w-40" />
              <Skeleton className="h-3 w-40 sm:w-52" />
            </div>
            <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
