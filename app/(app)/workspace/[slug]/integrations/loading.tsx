import { Skeleton, SkeletonHeader } from '@/components/ui/Skeleton'

export default function IntegrationsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading integrations">
      <SkeletonHeader />
      {/* Connected integrations */}
      <div className="mt-8 space-y-3">
        <Skeleton className="h-5 w-36" />
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40 sm:w-56" />
            </div>
            <Skeleton className="h-3 w-3 rounded-full" />
          </div>
        ))}
      </div>
      {/* Available integrations */}
      <div className="mt-8 space-y-3">
        <Skeleton className="h-5 w-44" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32 sm:w-44" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
