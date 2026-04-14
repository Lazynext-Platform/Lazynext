import { SkeletonLight, SkeletonLightCard } from '@/components/ui/Skeleton'

export default function MarketingLoading() {
  return (
    <div className="min-h-screen bg-white" aria-busy="true" aria-label="Loading page">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4 sm:px-6">
        <SkeletonLight className="h-5 w-24 sm:w-28" />
        <div className="hidden gap-4 sm:flex">
          {[0, 1, 2].map((i) => (
            <SkeletonLight key={i} className="h-4 w-16" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
        <SkeletonLight className="h-9 w-9 rounded-lg sm:hidden" />
      </div>
      {/* Hero */}
      <div className="mx-auto max-w-4xl px-4 pt-16 text-center space-y-4 sm:px-6 sm:pt-24 md:pt-32 md:space-y-6">
        <SkeletonLight className="mx-auto h-6 w-36 rounded-full sm:w-48" />
        <SkeletonLight className="mx-auto h-8 w-full rounded sm:h-10 sm:w-3/4 md:h-12" />
        <SkeletonLight className="mx-auto h-4 w-5/6 rounded sm:h-5 sm:w-2/3" />
        <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center sm:gap-4">
          <SkeletonLight className="h-12 w-full rounded-xl sm:w-36" />
          <SkeletonLight className="h-12 w-full rounded-xl sm:w-36" />
        </div>
      </div>
      {/* Sections */}
      <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 md:pt-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonLightCard key={i} lines={3} className={cn(i >= 3 ? 'hidden sm:block' : '', i >= 4 ? 'sm:hidden lg:block' : '')} />
          ))}
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
