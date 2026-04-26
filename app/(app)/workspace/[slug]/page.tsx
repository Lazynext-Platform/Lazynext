import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  GitBranch,
  Plus,
  ArrowRight,
  Target,
  Gauge,
  MessageCircle,
  CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  getCurrentMemberWorkspace,
  getWorkspaceStats,
  getRecentDecisions,
  getPendingOutcomes,
} from '@/lib/data/workspace'
import { DecisionQualityBadge } from '@/components/decisions/DecisionQualityBadge'
import type { DecisionScoreBreakdown } from '@/lib/db/schema'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default async function WorkspaceHomePage({ params }: { params: { slug: string } }) {
  const { workspace, isMember } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace) notFound()
  if (!isMember) notFound()

  const [stats, recentDecisions, pending] = await Promise.all([
    getWorkspaceStats(workspace.id, null),
    getRecentDecisions(workspace.id, 8),
    getPendingOutcomes(workspace.id),
  ])

  const statCards = [
    {
      label: 'Open decisions',
      value: String(stats.openDecisions),
      icon: GitBranch,
      accent: 'border-orange-500/30 bg-orange-500/5',
      iconColor: 'text-orange-400',
      href: `/workspace/${params.slug}/decisions`,
    },
    {
      label: 'Pending outcomes',
      value: String(stats.pendingOutcomes),
      icon: Target,
      accent: 'border-amber-500/30 bg-amber-500/5',
      iconColor: 'text-amber-400',
      href: `/workspace/${params.slug}/decisions?filter=pending`,
    },
    {
      label: 'Avg quality score',
      value: stats.avgQualityScore === null ? '—' : String(stats.avgQualityScore),
      suffix: stats.avgQualityScore === null ? '' : '/100',
      icon: Gauge,
      accent: 'border-emerald-500/30 bg-emerald-500/5',
      iconColor: 'text-emerald-400',
      href: `/workspace/${params.slug}/decisions`,
    },
    {
      label: 'Decisions this week',
      value: String(stats.decisionsThisWeek),
      icon: CheckSquare,
      accent: 'border-blue-500/30 bg-blue-500/5',
      iconColor: 'text-blue-400',
      href: `/workspace/${params.slug}/decisions`,
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">
            {getGreeting()}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            The decisions your team made, made better.
          </p>
        </div>
        <Link
          href={`/workspace/${params.slug}/decisions?log=1`}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover transition-colors"
        >
          <Plus className="h-4 w-4" /> Log Decision <kbd className="ml-1 rounded bg-white/10 px-1 text-2xs">⌘D</kbd>
        </Link>
      </div>

      {/* Decision-first stat cards */}
      <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={cn('rounded-xl border p-5 transition-colors hover:border-opacity-60', c.accent)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{c.label}</span>
              <c.icon className={cn('h-4 w-4', c.iconColor)} />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-50">
              {c.value}
              {c.suffix && <span className="text-lg font-normal text-slate-500">{c.suffix}</span>}
            </p>
          </Link>
        ))}
      </div>

      {/* Pending outcomes — the moat's compounding engine, front and center */}
      {pending.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">Outcomes waiting to be recorded</h2>
            <Link
              href={`/workspace/${params.slug}/decisions/outcomes`}
              className="flex items-center gap-1 text-sm text-brand hover:text-brand-hover"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.slice(0, 3).map((d) => (
              <Link
                key={d.id}
                href={`/workspace/${params.slug}/decisions/outcomes?id=${d.id}`}
                className="group rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 hover:border-amber-500/40 transition-colors"
              >
                <p className="line-clamp-2 text-sm font-medium text-slate-100 group-hover:text-amber-200">
                  {d.question}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {d.expected_by
                    ? `Expected ${new Date(d.expected_by).toLocaleDateString()}`
                    : 'No target date set'}
                </p>
                <p className="mt-3 text-xs font-medium text-amber-400">
                  How did this go? →
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent decisions */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">Recent decisions</h2>
          <Link
            href={`/workspace/${params.slug}/decisions`}
            className="flex items-center gap-1 text-sm text-brand hover:text-brand-hover"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentDecisions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
            <GitBranch className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-300">
              No decisions yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Press <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-2xs">⌘D</kbd> to log your first one in 30 seconds.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {recentDecisions.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                <GitBranch className="h-4 w-4 shrink-0 text-orange-400" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-slate-100" title={d.question}>
                    {d.question}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {relativeTime(d.created_at)} · <span className="capitalize">{d.status}</span>
                    {d.outcome !== 'pending' && (
                      <> · outcome: <span className="capitalize">{d.outcome}</span></>
                    )}
                  </p>
                </div>
                {typeof d.quality_score === 'number' && (
                  <DecisionQualityBadge
                    score={d.quality_score}
                    breakdown={d.score_breakdown as DecisionScoreBreakdown | null}
                    rationale={d.score_rationale}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secondary info row — unread threads + assigned */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          href={`/workspace/${params.slug}/tasks`}
          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <CheckSquare className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-sm font-medium text-slate-100">Assigned to you</p>
              <p className="text-xs text-slate-500">{stats.assignedToMe} open tasks</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600" />
        </Link>
        <Link
          href={`/workspace/${params.slug}/canvas/default`}
          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-purple-400" />
            <div>
              <p className="text-sm font-medium text-slate-100">Active threads</p>
              <p className="text-xs text-slate-500">{stats.unreadThreads} open</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600" />
        </Link>
      </div>
    </div>
  )
}
