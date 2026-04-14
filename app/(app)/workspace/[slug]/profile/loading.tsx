import { Skeleton, SkeletonHeader, SkeletonTabs } from '@/components/ui/Skeleton'

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading profile">
      <SkeletonHeader />
      {/* Tab navigation */}
      <div className="mt-6">
        <SkeletonTabs count={4} />
      </div>
      {/* Avatar area */}
      <div className="mt-8 flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>
      {/* Form fields */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      {/* Save button */}
      <div className="mt-8 flex justify-end">
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  )
}
