'use client'

import { Activity, CheckSquare, TrendingUp, TrendingDown, Minus, AlertTriangle, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { PulseStats, MemberUser, ActivityEvent } from '@/lib/data/workspace'

interface Props {
  stats: PulseStats
  members: MemberUser[]
  recentEvents: ActivityEvent[]
  workspaceName: string
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function buildSummary(stats: PulseStats, workload: { userId: string; openTasks: number; member?: MemberUser }[]): string {
  const parts: string[] = []
  const taskDelta = stats.tasksDoneThisWeek - stats.tasksDoneLastWeek
  if (stats.tasksDoneLastWeek > 0) {
    const pct = Math.round(((stats.tasksDoneThisWeek - stats.tasksDoneLastWeek) / stats.tasksDoneLastWeek) * 100)
    parts.push(`Your team completed ${stats.tasksDoneThisWeek} ${stats.tasksDoneThisWeek === 1 ? 'task' : 'tasks'} this week — ${pct >= 0 ? `+${pct}%` : `${pct}%`} vs last week.`)
  } else if (stats.tasksDoneThisWeek > 0) {
    parts.push(`Your team completed ${stats.tasksDoneThisWeek} ${stats.tasksDoneThisWeek === 1 ? 'task' : 'tasks'} this week.`)
  }
  if (stats.overdueTasks > 0) {
    parts.push(`${stats.overdueTasks} ${stats.overdueTasks === 1 ? 'task is' : 'tasks are'} overdue — focus there to unblock progress.`)
  }
  const mostLoaded = workload.slice().sort((a, b) => b.openTasks - a.openTasks)[0]
  if (mostLoaded && mostLoaded.openTasks >= 5 && mostLoaded.member) {
    parts.push(`${mostLoaded.member.name || mostLoaded.member.email || 'A teammate'} is carrying ${mostLoaded.openTasks} open tasks — consider redistributing.`)
  }
  if (stats.avgQualityThisWeek !== null && stats.avgQualityLastWeek !== null) {
    const qDelta = stats.avgQualityThisWeek - stats.avgQualityLastWeek
    if (Math.abs(qDelta) >= 3) {
      parts.push(`Decision quality ${qDelta > 0 ? 'improved' : 'dipped'} by ${Math.abs(qDelta)} ${Math.abs(qDelta) === 1 ? 'point' : 'points'}.`)
    }
  }
  if (parts.length === 0) {
    return 'Not much activity to summarize yet — log a few decisions and tasks and check back next week.'
  }
  void taskDelta
  return parts.join(' ')
}

export function PulseClient({ stats, members, recentEvents, workspaceName }: Props) {
  const memberById = new Map(members.map((m) => [m.userId, m]))
  const workload = stats.workload.map((w) => ({ ...w, member: memberById.get(w.userId) }))

  const taskDelta = stats.tasksDoneThisWeek - stats.tasksDoneLastWeek
  const decDelta = stats.decisionsThisWeek - stats.decisionsLastWeek
  const qualityDelta =
    stats.avgQualityThisWeek !== null && stats.avgQualityLastWeek !== null
      ? stats.avgQualityThisWeek - stats.avgQualityLastWeek
      : 0
  const threadsDelta = stats.threadsActiveThisWeek - stats.threadsActiveLastWeek

  const metrics = [
    {
      label: 'Tasks done',
      value: stats.tasksDoneThisWeek,
      total: stats.totalOpenTasks > 0 ? stats.totalOpenTasks + stats.tasksDoneThisWeek : null,
      delta: taskDelta,
      icon: CheckSquare,
      iconColor: 'text-cyan-400',
      higherIsBetter: true,
    },
    {
      label: 'Overdue',
      value: stats.overdueTasks,
      total: null,
      delta: 0,
      icon: AlertTriangle,
      iconColor: 'text-red-400',
      higherIsBetter: false,
    },
    {
      label: 'Open',
      value: stats.totalOpenTasks,
      total: null,
      delta: 0,
      icon: Activity,
      iconColor: 'text-amber-400',
      higherIsBetter: false,
    },
    {
      label: 'Decisions',
      value: stats.decisionsThisWeek,
      total: null,
      delta: decDelta,
      icon: GitBranch,
      iconColor: 'text-orange-400',
      higherIsBetter: true,
    },
  ]

  const maxBurn = Math.max(1, ...stats.burndownDaily.map((d) => d.completed))

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-slate-50">Pulse Dashboard</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">Real-time health for {workspaceName}.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const TrendIcon = m.delta > 0 ? TrendingUp : m.delta < 0 ? TrendingDown : Minus
          const isImprovement = m.higherIsBetter ? m.delta > 0 : m.delta < 0
          const trendColor = m.delta === 0 ? 'text-slate-500' : isImprovement ? 'text-emerald-400' : 'text-red-400'
          return (
            <div key={m.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{m.label}</span>
                <m.icon className={cn('h-4 w-4', m.iconColor)} />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-50">
                {m.value}
                {m.total !== null && <span className="text-base font-normal text-slate-500">/{m.total}</span>}
              </p>
              {m.delta !== 0 && (
                <div className={`mt-1 flex items-center gap-1 text-xs ${trendColor}`}>
                  <TrendIcon className="h-3 w-3" />
                  {m.delta > 0 ? '+' : ''}
                  {m.delta} this week
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-slate-100">Team workload</h2>
        {workload.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No assigned tasks yet — assign some on the Tasks page to see workload here.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {workload
              .sort((a, b) => b.openTasks - a.openTasks)
              .map((w) => {
                const display = w.member?.name || w.member?.email || 'Unknown'
                const max = Math.max(...workload.map((x) => x.openTasks))
                const pct = max > 0 ? Math.round((w.openTasks / max) * 100) : 0
                const overloaded = w.openTasks >= 10
                return (
                  <div key={w.userId}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-3xs font-bold text-white">
                          {w.member?.initials ?? '?'}
                        </div>
                        <span className="text-sm text-slate-200">{display}</span>
                        {overloaded && (
                          <span className="flex items-center gap-0.5 rounded-full bg-red-500/10 px-2 py-0.5 text-2xs font-medium text-red-400">
                            <AlertTriangle className="h-2.5 w-2.5" /> Heavy load
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {w.openTasks} open {w.openTasks === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full bg-slate-800"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${display} workload`}
                    >
                      <div
                        className={cn('h-full rounded-full transition-all', overloaded ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-cyan-500')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-slate-100">Tasks completed — last 7 days</h2>
        {stats.burndownDaily.every((d) => d.completed === 0) ? (
          <p className="mt-4 text-sm text-slate-500">No tasks completed in the last 7 days.</p>
        ) : (
          <div className="mt-4 flex h-32 items-end gap-2">
            {stats.burndownDaily.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-cyan-500/80"
                    style={{ height: `${(d.completed / maxBurn) * 100}%` }}
                    title={`${d.completed} on ${d.date}`}
                    aria-label={`${d.completed} tasks completed on ${d.date}`}
                  />
                </div>
                <span className="text-3xs text-slate-500">{d.day}</span>
                <span className="text-3xs font-medium text-slate-400">{d.completed}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-slate-100">Recent activity</h2>
        {recentEvents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nothing yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {recentEvents.slice(0, 6).map((e) => {
              const actor = memberById.get(e.actorId)
              const display = actor?.name || actor?.email || 'A teammate'
              const dot =
                e.resourceType === 'decision' ? 'bg-orange-500'
                : e.resourceType === 'task' ? 'bg-blue-500'
                : e.resourceType === 'doc' ? 'bg-emerald-500'
                : 'bg-purple-500'
              return (
                <div key={e.id} className="flex items-start gap-3">
                  <div className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', dot)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-300">
                      <strong className="text-slate-100">{display}</strong>{' '}
                      <span className="text-cyan-400">{e.title}</span>
                    </p>
                    <p className="text-2xs text-slate-600">{relativeTime(e.createdAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-slate-100">Week-over-Week</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Tasks completed', thisWeek: stats.tasksDoneThisWeek, lastWeek: stats.tasksDoneLastWeek },
            { label: 'Decisions made', thisWeek: stats.decisionsThisWeek, lastWeek: stats.decisionsLastWeek },
            {
              label: 'Avg quality',
              thisWeek: stats.avgQualityThisWeek ?? 0,
              lastWeek: stats.avgQualityLastWeek ?? 0,
              hide: stats.avgQualityThisWeek === null && stats.avgQualityLastWeek === null,
            },
            { label: 'Threads active', thisWeek: stats.threadsActiveThisWeek, lastWeek: stats.threadsActiveLastWeek },
          ]
            .filter((w) => !w.hide)
            .map((w) => {
              const diff = w.thisWeek - w.lastWeek
              return (
                <div key={w.label} className="rounded-lg border border-slate-800 p-3">
                  <p className="text-2xs text-slate-500">{w.label}</p>
                  <p className="mt-1 text-lg font-bold text-slate-100">{w.thisWeek}</p>
                  <p
                    className={cn(
                      'text-2xs',
                      diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-500',
                    )}
                  >
                    {diff > 0 ? '+' : ''}
                    {diff} vs last week
                  </p>
                </div>
              )
            })}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100">This week, in one paragraph</h3>
        </div>
        <p className="mt-2 text-sm text-slate-300">{buildSummary(stats, workload)}</p>
        <p className="mt-2 text-3xs text-slate-600">
          Computed deterministically from this workspace&apos;s actual decisions, tasks, and threads — not AI-generated. Quality delta vs last week:{' '}
          {qualityDelta > 0 ? `+${qualityDelta}` : qualityDelta} · Threads delta: {threadsDelta > 0 ? `+${threadsDelta}` : threadsDelta}.
        </p>
      </div>
    </div>
  )
}
