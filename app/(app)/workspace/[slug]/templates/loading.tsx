import { Skeleton, SkeletonHeader, SkeletonSearch } from '@/components/ui/Skeleton'

export default function TemplatesLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading templates">
      <SkeletonHeader hasAction />
      {/* Category pills */}
      <div className="mt-6 flex gap-2 overflow-x-auto">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      {/* Search */}
      <div className="mt-4">
        <SkeletonSearch />
      </div>
      {/* Template cards grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
