'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  GitBranch,
  Plus,
  ArrowRight,
  CheckSquare,
  MessageCircle,
  Heart,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const statCards = [
  { label: 'Assigned to you', value: '7', icon: CheckSquare, accent: 'border-blue-500/30 bg-blue-500/5', iconColor: 'text-blue-400' },
  { label: 'Open Decisions', value: '4', icon: GitBranch, accent: 'border-orange-500/30 bg-orange-500/5', iconColor: 'text-orange-400' },
  { label: 'Unread Threads', value: '5', icon: MessageCircle, accent: 'border-purple-500/30 bg-purple-500/5', iconColor: 'text-purple-400' },
  { label: 'Decision Health', value: '76', icon: Heart, accent: 'border-emerald-500/30 bg-emerald-500/5', iconColor: 'text-emerald-400', suffix: '/100' },
]

const workflows = [
  { name: 'Q2 Product Sprint', updated: '2h ago', tasks: 12, decisions: 4, docs: 3, progress: 68, team: ['AP', 'PK', 'JR'] },
  { name: 'Client Onboarding', updated: '1d ago', tasks: 8, decisions: 2, docs: 5, progress: 45, team: ['AP', 'SM'] },
  { name: 'Bug Triage', updated: '3d ago', tasks: 24, decisions: 1, docs: 0, progress: 82, team: ['PK', 'JR', 'AP', 'SM'] },
]

const teamColors: Record<string, string> = {
  AP: 'bg-indigo-500',
  PK: 'bg-emerald-500',
  JR: 'bg-amber-500',
  SM: 'bg-pink-500',
}

const activity = [
  { actor: 'Raj Kumar', initials: 'RK', color: 'bg-amber-500', action: 'completed', target: 'Fix auth redirect bug', type: 'task', time: '2 hours ago' },
  { actor: 'Priya', initials: 'PK', color: 'bg-emerald-500', action: 'decided', target: 'Use Supabase for DB', type: 'decision', time: '4 hours ago' },
  { actor: 'Avas', initials: 'AP', color: 'bg-indigo-500', action: 'commented on', target: 'Pricing strategy thread', type: 'thread', time: '5 hours ago' },
  { actor: 'Sana', initials: 'SM', color: 'bg-pink-500', action: 'created', target: 'API Design Spec v3', type: 'doc', time: 'Yesterday' },
  { actor: 'Avas', initials: 'AP', color: 'bg-indigo-500', action: 'updated', target: 'Ship onboarding v2', type: 'task', time: 'Yesterday' },
]

const dueSoon = [
  { title: 'Ship onboarding v2', type: 'task', due: 'Tomorrow', urgency: 'text-orange-400 bg-orange-500/10' },
  { title: 'Finalize pricing model', type: 'decision', due: 'Overdue', urgency: 'text-red-400 bg-red-500/10' },
  { title: 'Write migration guide', type: 'doc', due: 'Apr 12', urgency: 'text-yellow-400 bg-yellow-500/10' },
  { title: 'Review auth flow', type: 'task', due: 'Apr 14', urgency: 'text-slate-400 bg-slate-500/10' },
]

const typeBadgeColor: Record<string, string> = {
  task: 'text-blue-400 bg-blue-500/10',
  decision: 'text-orange-400 bg-orange-500/10',
  doc: 'text-emerald-400 bg-emerald-500/10',
  thread: 'text-purple-400 bg-purple-500/10',
}

export default function WorkspaceHomePage() {
  const params = useParams()
  const slug = params.slug as string

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">
            {getGreeting()}, Avas
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Here&apos;s what&apos;s happening in your workspace.
          </p>
        </div>
        <Link
          href={`/workspace/${slug}/canvas/default`}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
        >
          <Plus className="h-4 w-4" /> New Workflow
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((c) => (
          <div
            key={c.label}
            className={cn('rounded-xl border p-5', c.accent)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{c.label}</span>
              <c.icon className={cn('h-4 w-4', c.iconColor)} />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-50">
              {c.value}
              {c.suffix && <span className="text-lg font-normal text-slate-500">{c.suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Workflows */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">Workflows</h2>
          <button className="flex items-center gap-1 text-sm text-brand hover:text-brand-hover transition-colors">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflows.map((wf) => (
            <Link
              key={wf.name}
              href={`/workspace/${slug}/canvas/default`}
              className="group rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-all"
            >
              <h3 className="font-semibold text-slate-50 group-hover:text-brand transition-colors">{wf.name}</h3>
              <p className="mt-1 text-xs text-slate-500">Updated {wf.updated}</p>

              <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                <span>{wf.tasks} tasks</span>
                <span>{wf.decisions} decisions</span>
                {wf.docs > 0 && <span>{wf.docs} docs</span>}
              </div>

              {/* Progress */}
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={wf.progress} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className={cn(
                      'h-full rounded-full',
                      wf.progress >= 70 ? 'bg-emerald-500' : wf.progress >= 40 ? 'bg-blue-500' : 'bg-amber-500'
                    )}
                    style={{ width: `${wf.progress}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-400">{wf.progress}%</span>
              </div>

              {/* Team */}
              <div className="mt-3 flex items-center -space-x-1.5">
                {wf.team.slice(0, 3).map((t) => (
                  <div
                    key={t}
                    className={cn('flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-900 text-3xs font-bold text-white', teamColors[t] || 'bg-slate-500')}
                  >
                    {t}
                  </div>
                ))}
                {wf.team.length > 3 && (
                  <span className="ml-1 text-2xs text-slate-500">+{wf.team.length - 3}</span>
                )}
              </div>
            </Link>
          ))}

          {/* Create new */}
          <Link
            href={`/workspace/${slug}/canvas/default`}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 p-5 text-center hover:border-slate-600 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <Plus className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-400">Create new workflow</p>
            <p className="mt-0.5 text-xs text-slate-600">or use a template</p>
          </Link>
        </div>
      </div>

      {/* Activity + Due Soon */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">Recent Activity</h2>
            <button className="flex items-center gap-1 text-sm text-brand hover:text-brand-hover transition-colors">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {activity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xs font-bold text-white', a.color)}>
                  {a.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-300 truncate" title={`${a.actor} ${a.action} ${a.target}`}>
                    <span className="font-medium text-slate-200">{a.actor}</span>{' '}
                    {a.action}{' '}
                    <span className="font-medium text-slate-200">{a.target}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('rounded-full px-1.5 py-0.5 text-2xs font-medium capitalize', typeBadgeColor[a.type] || 'text-slate-400 bg-slate-500/10')}>{a.type}</span>
                  <span className="text-2xs text-slate-500">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Due Soon */}
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Due Soon</h2>

          <div className="mt-4 space-y-2">
            {dueSoon.map((d, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200 truncate" title={d.title}>{d.title}</p>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-2xs font-medium capitalize', typeBadgeColor[d.type] || 'text-slate-400')}>{d.type}</span>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', d.urgency)}>
                  {d.due}
                </span>
              </div>
            ))}

            {/* LazyMind suggestion */}
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" />
                <span className="text-xs font-semibold text-brand">LazyMind Suggestion</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-300">
                You have 2 open decisions older than 5 days. Consider resolving the pricing model decision — it&apos;s blocking 3 tasks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
