import { Skeleton, SkeletonHeader, SkeletonTableRow } from '@/components/ui/Skeleton'

export default function BillingLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading billing">
      <SkeletonHeader />
      {/* Billing toggle */}
      <div className="mt-6 flex justify-center">
        <Skeleton className="h-10 w-48 rounded-full" />
      </div>
      {/* Plan cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-24" />
            <div className="space-y-2">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      {/* Usage bars */}
      <div className="mt-8 space-y-4">
        <Skeleton className="h-5 w-24" />
        {[0, 1].map((i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      {/* Billing history */}
      <div className="mt-8 space-y-2">
        <Skeleton className="h-5 w-32" />
        {[0, 1, 2].map((i) => (
          <SkeletonTableRow key={i} cols={4} />
        ))}
      </div>
    </div>
  )
}
