'use client'

import Link from 'next/link'
import {
  LayoutGrid,
  GitBranch,
  Search,
  CheckSquare,
  MessageCircle,
  BarChart3,
  AlertTriangle,
  Wrench,
  Clock,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/* ------------------------------------------------------------------
   Shared wrapper
   ------------------------------------------------------------------ */
function StateContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-8', className)}>
      {children}
    </div>
  )
}

function IconCircle({ icon: Icon, colorClass }: { icon: React.ElementType; colorClass: string }) {
  return (
    <div className={cn('flex h-16 w-16 items-center justify-center rounded-2xl', colorClass)}>
      <Icon className="h-8 w-8 opacity-50" />
    </div>
  )
}

function PrimaryButton({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const cls = 'inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors'
  if (href) return <Link href={href} className={cls}>{children}</Link>
  return <button onClick={onClick} className={cls}>{children}</button>
}

function SecondaryButton({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const cls = 'inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-750 hover:text-white transition-colors'
  if (href) return <Link href={href} className={cls}>{children}</Link>
  return <button onClick={onClick} className={cls}>{children}</button>
}

/* ------------------------------------------------------------------
   1. Empty Canvas
   ------------------------------------------------------------------ */
export function EmptyCanvas({ onAddNode, onUseTemplate }: { onAddNode?: () => void; onUseTemplate?: () => void }) {
  return (
    <StateContainer className="py-20">
      <div className="rounded-2xl border-2 border-dashed border-slate-700 px-8 py-16 max-w-md">
        <IconCircle icon={LayoutGrid} colorClass="bg-slate-800 mx-auto" />
        <h2 className="mt-4 text-lg font-semibold text-slate-300">Your canvas is empty</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-sm">
          Drag a node from the sidebar, or use keyboard shortcuts to add your first task, doc, or decision.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <PrimaryButton onClick={onAddNode}>+ Add First Node</PrimaryButton>
          <SecondaryButton onClick={onUseTemplate}>Use a Template</SecondaryButton>
        </div>
        <div className="mt-4 flex justify-center gap-3">
          {[
            { key: 'T', label: 'Task' },
            { key: 'D', label: 'Doc' },
            { key: 'X', label: 'Decision' },
          ].map((s) => (
            <span key={s.key} className="flex items-center gap-1 text-2xs text-slate-500">
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-slate-400">{s.key}</kbd>
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </StateContainer>
  )
}

/* ------------------------------------------------------------------
   2. Empty Decisions
   ------------------------------------------------------------------ */
export function EmptyDecisions({ onLogDecision }: { onLogDecision?: () => void }) {
  return (
    <StateContainer className="py-20">
      <IconCircle icon={GitBranch} colorClass="bg-orange-500/10 text-orange-400" />
      <h2 className="mt-4 text-lg font-semibold text-slate-300">No decisions logged yet</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        Decision DNA tracks every choice your team makes. Log decisions, score their quality, and learn from outcomes over time.
      </p>
      <div className="mt-5">
        <PrimaryButton onClick={onLogDecision}>+ Log First Decision</PrimaryButton>
      </div>
      <p className="mt-4 text-2xs text-slate-600">
        Every decision gets a quality score and becomes searchable forever.
      </p>
    </StateContainer>
  )
}

/* ------------------------------------------------------------------
   3. Empty Search
   ------------------------------------------------------------------ */
export function EmptySearch({ query, onClear }: { query: string; onClear?: () => void }) {
  return (
    <StateContainer className="py-16">
      <IconCircle icon={Search} colorClass="bg-slate-800 text-slate-500" />
      <h2 className="mt-4 text-lg font-semibold text-slate-300">
        No results for &ldquo;{query}&rdquo;
      </h2>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        Try different keywords, or log a past decision to make it searchable.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <PrimaryButton>Log a Past Decision</PrimaryButton>
        <SecondaryButton onClick={onClear}>Clear Search</SecondaryButton>
      </div>
    </StateContainer>
  )
}

/* ------------------------------------------------------------------
   4. Empty Tasks
   ------------------------------------------------------------------ */
export function EmptyTasks({ onAddTask, onImport }: { onAddTask?: () => void; onImport?: () => void }) {
  return (
    <StateContainer className="py-16">
      <IconCircle icon={CheckSquare} colorClass="bg-blue-500/10 text-blue-400" />
      <h2 className="mt-4 text-lg font-semibold text-slate-300">Nothing assigned yet</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        Create tasks or import them from Notion, Linear, or Trello.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <PrimaryButton onClick={onAddTask}>+ Add Task</PrimaryButton>
        <SecondaryButton onClick={onImport}>Import</SecondaryButton>
      </div>
    </StateContainer>
  )
}

/* ------------------------------------------------------------------
   5. Empty Thread
   ------------------------------------------------------------------ */
export function EmptyThread() {
  return (
    <StateContainer className="py-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10">
        <MessageCircle className="h-6 w-6 text-purple-400 opacity-60" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-300">No messages yet</h3>
      <p className="mt-1 text-xs text-slate-500">Threads stay attached to this node forever.</p>
      <input
        type="text"
        placeholder="Write the first comment..."
        autoFocus
        className="mt-3 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
      />
    </StateContainer>
  )
}

/* ------------------------------------------------------------------
   6. Empty Pulse
   ------------------------------------------------------------------ */
export function EmptyPulse({ workspaceSlug }: { workspaceSlug?: string }) {
  return (
    <StateContainer className="py-16">
      <IconCircle icon={BarChart3} colorClass="bg-cyan-500/10 text-cyan-400" />
      <h2 className="mt-4 text-lg font-semibold text-slate-300">PULSE shows you what your team built</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        Dashboards are auto-generated from your workflow activity. No setup required — just start working.
      </p>
      <div className="mt-5">
        {workspaceSlug && (
          <SecondaryButton href={`/workspace/${workspaceSlug}/canvas/default`}>
            Go to Canvas →
          </SecondaryButton>
        )}
      </div>
    </StateContainer>
  )
}

/* ------------------------------------------------------------------
   7. General Error
   ------------------------------------------------------------------ */
export function GeneralError({ error, requestId, onRetry }: { error?: string; requestId?: string; onRetry?: () => void }) {
  return (
    <StateContainer className="py-16">
      <IconCircle icon={AlertTriangle} colorClass="bg-red-500/10 text-red-400" />
      <h2 className="mt-4 text-lg font-semibold text-slate-300">Something went wrong</h2>
      <p className="mt-2 text-sm text-slate-500">We&apos;ve automatically reported this error.</p>
      {(error || requestId) && (
        <div className="mt-4 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-3 text-left">
          {error && <p className="font-mono text-2xs text-red-400">{error}</p>}
          {requestId && <p className="mt-1 font-mono text-2xs text-slate-600">Request ID: {requestId}</p>}
        </div>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <PrimaryButton onClick={onRetry}>Try Again</PrimaryButton>
        <SecondaryButton href="/">Go Home</SecondaryButton>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        If this keeps happening, <Link href="/about" className="text-brand underline hover:text-brand-hover">contact support</Link>.
      </p>
    </StateContainer>
  )
}

/* ------------------------------------------------------------------
   8. 404 Page
   ------------------------------------------------------------------ */
export function NotFoundState() {
  return (
    <StateContainer className="py-20">
      <p className="text-7xl font-extrabold text-slate-800">404</p>
      <h2 className="mt-4 text-lg font-semibold text-slate-300">Page not found</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        This page doesn&apos;t exist or may have been moved.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <PrimaryButton href="/">Go to Dashboard</PrimaryButton>
        <SecondaryButton onClick={() => window.history.back()}>Go Back</SecondaryButton>
      </div>
    </StateContainer>
  )
}

/* ------------------------------------------------------------------
   9. Maintenance
   ------------------------------------------------------------------ */
export function MaintenancePage() {
  return (
    <StateContainer className="py-16">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
        <Wrench className="h-10 w-10 text-amber-400" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-200">We&apos;ll be right back</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        Scheduled maintenance to make Lazynext faster and more reliable.
      </p>
      <div className="mt-5 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 p-4">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Estimated downtime</span>
          <span className="font-semibold text-slate-200">~30 min</span>
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-slate-500">Started at</span>
          <span className="text-slate-300">2:00 AM IST</span>
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-slate-500">Expected return</span>
          <span className="text-slate-300">2:30 AM IST</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <SecondaryButton>Check Status Page</SecondaryButton>
        <SecondaryButton>Follow @lazynext</SecondaryButton>
      </div>
      <div className="mt-8 flex items-center gap-2 text-xs text-slate-600">
        <span className="font-semibold text-brand">Lazynext</span>
        Built for teams. Priced for humans.
      </div>
    </StateContainer>
  )
}

/* ------------------------------------------------------------------
   10. Rate Limit
   ------------------------------------------------------------------ */
export function RateLimitState({ retryIn = 23 }: { retryIn?: number }) {
  return (
    <StateContainer className="py-16">
      <IconCircle icon={Clock} colorClass="bg-amber-500/10 text-amber-400" />
      <h2 className="mt-4 text-lg font-semibold text-slate-300">Slow down there</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        Too many requests. This protects our servers so everyone gets a smooth experience.
      </p>
      <div className="mt-5 w-full max-w-xs rounded-lg border border-amber-500/20 bg-slate-900 p-4">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Rate limit</span>
          <span className="text-slate-300">100 requests/min</span>
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-slate-500">Retry in</span>
          <span className="font-bold text-slate-200">{retryIn} seconds</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: '60%' }} />
        </div>
      </div>
      <div className="mt-5">
        <SecondaryButton>Try Again</SecondaryButton>
      </div>
    </StateContainer>
  )
}

/* ------------------------------------------------------------------
   11. AI Unavailable
   ------------------------------------------------------------------ */
export function AIUnavailable() {
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-slate-700 bg-slate-900 px-8 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
        <Moon className="h-6 w-6 text-amber-400" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-300">LazyMind is resting</h3>
      <p className="mt-1 text-xs text-slate-500">Everything else works normally — your data is safe.</p>
      <div className="mt-4 space-y-1 rounded-md bg-slate-800 p-2">
        <div className="flex justify-between text-2xs">
          <span className="text-slate-400">Groq API</span>
          <span className="text-red-400">unavailable</span>
        </div>
        <div className="flex justify-between text-2xs">
          <span className="text-slate-400">Together AI</span>
          <span className="text-red-400">unavailable</span>
        </div>
      </div>
      <p className="mt-3 text-2xs text-slate-600">We&apos;ll automatically reconnect. No action needed.</p>
    </div>
  )
}

/* ------------------------------------------------------------------
   12. Loading Skeleton
   ------------------------------------------------------------------ */
export function CanvasSkeleton() {
  return (
    <div className="flex h-full w-full" aria-busy="true" aria-label="Loading content">
      {/* Sidebar skeleton */}
      <div className="hidden w-40 flex-col gap-3 border-r border-slate-800 p-3 md:flex">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-800" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-800" style={{ animationDelay: '0.1s' }} />
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-800" style={{ animationDelay: '0.2s' }} />
        <div className="h-px w-full bg-slate-800" />
        <div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
        <div className="h-6 w-full animate-pulse rounded bg-slate-800" />
        <div className="h-6 w-full animate-pulse rounded bg-slate-800" />
      </div>  
      {/* Canvas skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <div className="flex gap-3">
          <div className="h-20 w-48 animate-pulse rounded-lg bg-slate-800" />
          <div className="h-20 w-48 animate-pulse rounded-lg bg-slate-800" style={{ animationDelay: '0.1s' }} />
        </div>
        <div className="flex gap-3 pl-12">
          <div className="h-20 w-48 animate-pulse rounded-lg bg-slate-800" style={{ animationDelay: '0.2s' }} />
          <div className="h-20 w-48 animate-pulse rounded-lg bg-slate-800" style={{ animationDelay: '0.3s' }} />
        </div>
        <div className="flex gap-3 pl-24">
          <div className="h-20 w-48 animate-pulse rounded-lg bg-slate-800" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  )
}

export function DecisionListSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading decisions">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="h-8 w-8 rounded-full bg-slate-800" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 rounded bg-slate-800" />
            <div className="h-3 w-1/2 rounded bg-slate-800" />
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-800" />
        </div>
      ))}
    </div>
  )
}
