import { Skeleton, SkeletonHeader, SkeletonTableRow } from '@/components/ui/Skeleton'

export default function ExportLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading export">
      <SkeletonHeader />
      {/* Data portability banner */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full sm:w-3/4" />
      </div>
      {/* Export controls */}
      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-full rounded-lg sm:w-48" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg sm:w-36" />
      </div>
      {/* Export history */}
      <div className="mt-8 space-y-2">
        <Skeleton className="h-5 w-32" />
        {[0, 1, 2].map((i) => (
          <SkeletonTableRow key={i} cols={4} />
        ))}
      </div>
    </div>
  )
}
