import { SkeletonLight } from '@/components/ui/Skeleton'

// NOTE: Next.js wraps this loading state with `app/(auth)/layout.tsx`, so it
// is mounted *inside* the right-hand white form panel. We render only the
// form skeleton here — the real lime brand panel comes from the layout.
// We use SkeletonLight because the form panel is white (default Skeleton is
// slate-800 and would render as a black block).
export default function AuthLoading() {
  return (
    <div className="w-full space-y-6" aria-busy="true" aria-label="Loading authentication">
      <div className="space-y-2">
        <SkeletonLight className="h-8 w-32" />
        <SkeletonLight className="h-4 w-56" />
      </div>
      {/* OAuth buttons */}
      <div className="flex gap-3">
        <SkeletonLight className="h-11 flex-1 rounded-lg" />
        <SkeletonLight className="h-11 flex-1 rounded-lg" />
      </div>
      {/* Divider */}
      <div className="flex items-center gap-3">
        <SkeletonLight className="h-px flex-1" />
        <SkeletonLight className="h-3 w-8" />
        <SkeletonLight className="h-px flex-1" />
      </div>
      {/* Form fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <SkeletonLight className="h-3 w-12" />
          <SkeletonLight className="h-11 w-full rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <SkeletonLight className="h-3 w-16" />
          <SkeletonLight className="h-11 w-full rounded-lg" />
        </div>
      </div>
      <SkeletonLight className="h-11 w-full rounded-lg" />
      <SkeletonLight className="mx-auto h-3 w-48" />
    </div>
  )
}
