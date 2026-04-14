import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function AppLoading() {
  return (
    <div className="flex min-h-screen bg-slate-950" aria-busy="true" aria-label="Loading workspace">
      {/* Sidebar — hidden on mobile/tablet, visible on desktop */}
      <div className="hidden w-60 flex-col border-r border-slate-800 md:flex">
        <div className="flex h-12 items-center border-b border-slate-800 px-4">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-1 p-3">
          <Skeleton className="mb-2 h-3 w-16" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <Skeleton className="h-4 w-4 rounded" style={{ animationDelay: `${i * 50}ms` }} />
              <Skeleton className="h-3 w-20" style={{ animationDelay: `${i * 50}ms` }} />
            </div>
          ))}
        </div>
      </div>
      {/* Main content */}
      <div className="flex-1">
        {/* Top bar */}
        <div className="flex h-12 items-center justify-between border-b border-slate-800 px-4">
          <Skeleton className="h-4 w-32 sm:w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
        </div>
        {/* Content area */}
        <div className="p-4 space-y-4 sm:p-6">
          <Skeleton className="h-6 w-40 sm:w-48" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} lines={2} className="h-32" />
            ))}
          </div>
        </div>
      </div>
      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-slate-800 bg-slate-950 md:hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-5 w-5 rounded" />
        ))}
      </div>
    </div>
  )
}
