import { Skeleton } from '@/components/ui/Skeleton'

export default function CanvasLoading() {
  return (
    <div className="flex h-[calc(100vh-48px)] flex-col bg-slate-950" aria-busy="true" aria-label="Loading canvas">
      {/* Canvas toolbar */}
      <div className="flex h-10 items-center justify-between border-b border-slate-800 px-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-4 w-32 sm:w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="hidden h-7 w-7 rounded sm:block" />
          <Skeleton className="hidden h-7 w-7 rounded sm:block" />
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      </div>
      {/* Canvas area with dot grid + node placeholders */}
      <div className="relative flex-1 overflow-hidden">
        {/* Dot grid pattern */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Floating tool palette — left on desktop, bottom on mobile */}
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1.5 sm:bottom-auto sm:left-4 sm:top-4 sm:translate-x-0 sm:flex-col">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-lg" />
          ))}
        </div>
        {/* Ghost node placeholders */}
        <div className="absolute left-[15%] top-[20%] hidden sm:block">
          <Skeleton className="h-20 w-44 rounded-xl" />
        </div>
        <div className="absolute left-[45%] top-[30%] hidden sm:block">
          <Skeleton className="h-20 w-44 rounded-xl" />
        </div>
        <div className="absolute left-[35%] top-[55%] hidden lg:block">
          <Skeleton className="h-20 w-44 rounded-xl" />
        </div>
        {/* Center spinner */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-brand" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}
