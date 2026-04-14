import { Skeleton, SkeletonHeader } from '@/components/ui/Skeleton'

export default function ImportLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading import">
      <SkeletonHeader />
      {/* Upload area */}
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/30 p-8 sm:p-12">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="mt-4 h-4 w-40" />
        <Skeleton className="mt-2 h-3 w-56" />
        <Skeleton className="mt-4 h-9 w-28 rounded-lg" />
      </div>
      {/* Supported sources */}
      <div className="mt-8 space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-800 p-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
      {/* How it works */}
      <div className="mt-8 space-y-3">
        <Skeleton className="h-5 w-28" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 sm:w-64" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
