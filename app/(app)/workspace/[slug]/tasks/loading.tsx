import { Skeleton, SkeletonHeader, SkeletonCard } from '@/components/ui/Skeleton'

export default function TasksLoading() {
  return (
    <div className="max-w-full px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading tasks">
      {/* Header with view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SkeletonHeader />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
      {/* Kanban columns — stacked on mobile, side-by-side on desktop */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['To Do', 'In Progress', 'Review', 'Done'].map((_, col) => (
          <div key={col} className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            {Array.from({ length: 3 - col % 2 }, (__, j) => (
              <div key={j} className="mb-2">
                <SkeletonCard lines={1} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
