import { cn } from '@/lib/utils/cn'

/* ------------------------------------------------------------------
   Skeleton Primitives
   Responsive, accessible shimmer placeholders for loading states.
   Uses animate-shimmer gradient for a polished loading feel.
   All primitives respect prefers-reduced-motion automatically
   via Tailwind's motion-safe/motion-reduce utilities.
   ------------------------------------------------------------------ */

const shimmerClass =
  'motion-safe:animate-shimmer bg-gradient-to-r from-transparent via-slate-700/20 to-transparent bg-[length:200%_100%]'

/** Base skeleton block with shimmer overlay */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded bg-slate-800 relative overflow-hidden', shimmerClass, className)}
      {...props}
    />
  )
}

/** Circular skeleton (avatars, icons) */
export function SkeletonCircle({ size = 'md', className }: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizes = { xs: 'h-5 w-5', sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-12 w-12', xl: 'h-16 w-16' }
  return <Skeleton className={cn('rounded-full', sizes[size], className)} />
}

/** Text-line skeleton with natural width variance */
export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  const widths = ['w-full', 'w-5/6', 'w-4/5', 'w-3/4', 'w-2/3', 'w-1/2']
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3', widths[i % widths.length])} style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  )
}

/** Card skeleton with optional header and body lines */
export function SkeletonCard({ className, lines = 3, hasAvatar }: { className?: string; lines?: number; hasAvatar?: boolean }) {
  return (
    <div className={cn('rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3', className)}>
      <div className="flex items-center gap-3">
        {hasAvatar && <SkeletonCircle size="sm" />}
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      {lines > 0 && <SkeletonText lines={lines} />}
    </div>
  )
}

/** Stat card skeleton for dashboards */
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2', className)}>
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-2 w-12" />
    </div>
  )
}

/** Table row skeleton */
export function SkeletonTableRow({ cols = 4, className }: { cols?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 py-3 border-b border-slate-800/50', className)}>
      {Array.from({ length: cols }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-8' : i === 1 ? 'flex-1' : 'w-20')} style={{ animationDelay: `${i * 50}ms` }} />
      ))}
    </div>
  )
}

/** Button skeleton */
export function SkeletonButton({ className, wide }: { className?: string; wide?: boolean }) {
  return <Skeleton className={cn('h-9 rounded-lg', wide ? 'w-full' : 'w-24', className)} />
}

/** Tab bar skeleton */
export function SkeletonTabs({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('flex gap-1 border-b border-slate-800 pb-px overflow-x-auto', className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-9 w-20 rounded-t-lg shrink-0 sm:w-24" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  )
}

/** Header skeleton — title + subtitle + optional action */
export function SkeletonHeader({ hasAction, className }: { hasAction?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-40 sm:w-48" />
        <Skeleton className="h-4 w-56 sm:w-72" />
      </div>
      {hasAction && <SkeletonButton className="self-start sm:self-auto" />}
    </div>
  )
}

/** Search bar skeleton */
export function SkeletonSearch({ className }: { className?: string }) {
  return <Skeleton className={cn('h-10 w-full rounded-lg', className)} />
}

/* ------------------------------------------------------------------
   Light theme variants for marketing pages
   ------------------------------------------------------------------ */

const shimmerLight =
  'motion-safe:animate-shimmer bg-gradient-to-r from-transparent via-slate-200/40 to-transparent bg-[length:200%_100%]'

export function SkeletonLight({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded bg-slate-100 relative overflow-hidden', shimmerLight, className)}
      {...props}
    />
  )
}

export function SkeletonLightCard({ className, lines = 2 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-5 space-y-3', className)}>
      <SkeletonLight className="h-5 w-2/3" />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLight key={i} className={cn('h-3', i === 0 ? 'w-full' : 'w-3/4')} style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  )
}
