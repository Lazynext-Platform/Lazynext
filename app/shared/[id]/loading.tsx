import { Skeleton } from '@/components/ui/Skeleton'

export default function SharedLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950" aria-busy="true" aria-label="Loading shared view">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-36 sm:w-48" />
            <Skeleton className="h-3 w-24 sm:w-36" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="hidden h-8 w-28 rounded-lg sm:block" />
        </div>
      </div>
      {/* Canvas area */}
      <div className="relative flex-1">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-4 text-center">
            <Skeleton className="mx-auto h-10 w-10 rounded-full" />
            <Skeleton className="mx-auto h-3 w-32" />
          </div>
        </div>
      </div>
    </div>
  )
}
