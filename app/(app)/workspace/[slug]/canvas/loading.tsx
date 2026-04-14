import { Skeleton, SkeletonHeader, SkeletonSearch } from '@/components/ui/Skeleton'

export default function CanvasListLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading canvases">
      <SkeletonHeader hasAction />
      <div className="mt-6">
        <SkeletonSearch className="max-w-xs" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((j) => (
                  <Skeleton key={j} className="h-6 w-6 rounded-full border-2 border-slate-900" />
                ))}
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
