import { Skeleton, SkeletonButton } from '@/components/ui/Skeleton'

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen bg-slate-950" aria-busy="true" aria-label="Loading authentication">
      {/* Left panel — form skeleton */}
      <div className="flex w-full flex-col items-center justify-center px-4 sm:px-8 lg:w-1/2">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
          {/* OAuth buttons */}
          <div className="flex gap-3">
            <Skeleton className="h-11 flex-1 rounded-lg" />
            <Skeleton className="h-11 flex-1 rounded-lg" />
          </div>
          {/* Divider */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-px flex-1" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-px flex-1" />
          </div>
          {/* Form fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </div>
          <SkeletonButton wide />
          <Skeleton className="mx-auto h-3 w-48" />
        </div>
      </div>
      {/* Right panel — brand panel (desktop only) */}
      <div className="hidden w-1/2 items-center justify-center bg-brand/5 lg:flex">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-14 w-14 rounded-2xl" />
          <Skeleton className="mx-auto h-6 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
      </div>
    </div>
  )
}
