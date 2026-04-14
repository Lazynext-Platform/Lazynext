import { Skeleton } from '@/components/ui/Skeleton'

export default function GuideLoading() {
  return (
    <div className="min-h-screen bg-slate-950" aria-busy="true" aria-label="Loading guide">
      <div className="border-b border-slate-800 bg-gradient-to-b from-brand/5 to-transparent px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <Skeleton className="mx-auto mb-4 h-14 w-14 rounded-2xl" />
          <Skeleton className="mx-auto h-9 w-48 sm:w-64" />
          <Skeleton className="mx-auto mt-3 h-5 w-64 sm:w-96" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={`guide-skeleton-${i}`} className="h-20 rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </div>
  )
}
