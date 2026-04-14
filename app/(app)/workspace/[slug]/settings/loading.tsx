import { Skeleton, SkeletonHeader, SkeletonTabs } from '@/components/ui/Skeleton'

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading settings">
      <SkeletonHeader />
      {/* Tab navigation */}
      <div className="mt-6">
        <SkeletonTabs count={5} />
      </div>
      {/* Form fields */}
      <div className="mt-8 space-y-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        {/* Toggle row */}
        <div className="flex items-center justify-between py-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
        {/* Danger zone */}
        <div className="rounded-xl border border-red-900/30 p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-56 sm:w-72" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
