'use client'

import { useState } from 'react'
import { Activity, Filter, ShieldCheck, GitBranch, MessageCircle, FileText, CheckSquare, Zap, Table, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ActivityEvent, MemberUser } from '@/lib/data/workspace'

type Tab = 'feed' | 'audit'

interface Props {
  events: ActivityEvent[]
  members: MemberUser[]
  workspaceName: string
}

const resourceIcon: Record<ActivityEvent['resourceType'], { icon: typeof Activity; color: string }> = {
  decision: { icon: GitBranch, color: 'text-orange-400 bg-orange-500/10' },
  task: { icon: CheckSquare, color: 'text-blue-400 bg-blue-500/10' },
  doc: { icon: FileText, color: 'text-emerald-400 bg-emerald-500/10' },
  thread: { icon: MessageCircle, color: 'text-purple-400 bg-purple-500/10' },
  pulse: { icon: BarChart3, color: 'text-cyan-400 bg-cyan-500/10' },
  automation: { icon: Zap, color: 'text-amber-400 bg-amber-500/10' },
  table: { icon: Table, color: 'text-teal-400 bg-teal-500/10' },
  message: { icon: MessageCircle, color: 'text-purple-400 bg-purple-500/10' },
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

function bucketByDate(events: ActivityEvent[]): { label: string; events: ActivityEvent[] }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const buckets = new Map<string, ActivityEvent[]>()
  for (const e of events) {
    const d = new Date(e.createdAt)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    let label: string
    if (dayStart === today.getTime()) label = 'Today'
    else if (dayStart === yesterday.getTime()) label = 'Yesterday'
    else label = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    if (!buckets.has(label)) buckets.set(label, [])
    buckets.get(label)!.push(e)
  }
  return Array.from(buckets, ([label, events]) => ({ label, events }))
}

function actionVerb(e: ActivityEvent): string {
  switch (e.type) {
    case 'decision':
      return 'logged decision'
    case 'message':
      return 'replied in'
    case 'node_created':
      return `created ${e.resourceType}`
  }
}

export function ActivityClient({ events, members, workspaceName }: Props) {
  const [tab, setTab] = useState<Tab>('feed')

  const memberById = new Map(members.map((m) => [m.userId, m]))
  const buckets = bucketByDate(events)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <Activity className="h-6 w-6 text-brand" />
            Activity
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Everything that happened in {workspaceName}.
          </p>
        </div>
      </div>

      <div className="mt-6 flex w-fit gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
        <button
          onClick={() => setTab('feed')}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium',
            tab === 'feed' ? 'bg-brand text-brand-foreground' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          Feed
        </button>
        <button
          onClick={() => setTab('audit')}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium',
            tab === 'audit' ? 'bg-brand text-brand-foreground' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          Audit Log
        </button>
      </div>

      {tab === 'feed' && (
        <div className="mt-6">
          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
              <Activity className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-base font-medium text-slate-200">No activity yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Decisions, tasks, docs and threads will appear here as your team uses the workspace.
              </p>
            </div>
          ) : (
            buckets.map(({ label, events }) => (
              <section key={label} className="mt-6 first:mt-0">
                <p className="mb-3 text-2xs uppercase tracking-wider text-slate-500">{label}</p>
                <div className="relative ml-4 space-y-5 border-l border-slate-800 pl-6">
                  {events.map((e) => {
                    const actor = memberById.get(e.actorId)
                    const display = actor?.name || actor?.email || 'A teammate'
                    const initials = actor?.initials || '?'
                    const meta = resourceIcon[e.resourceType]
                    const ResIcon = meta.icon
                    return (
                      <div key={e.id} className="relative">
                        <div className="absolute -left-[33px] flex items-center">
                          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-2xs font-bold text-white">
                            {initials}
                            <div className={cn('absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-950', meta.color)}>
                              <ResIcon className="h-2.5 w-2.5" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-slate-300">
                            <strong className="text-slate-100">{display}</strong>{' '}
                            {actionVerb(e)}{' '}
                            <span className="font-medium text-brand">{e.title}</span>
                          </p>
                          {e.detail && (
                            <div className="mt-1 rounded-md border-l-2 border-slate-700 bg-slate-800/50 px-3 py-2 text-xs text-slate-400">
                              {e.detail}
                            </div>
                          )}
                          <p className="mt-1 text-2xs text-slate-600">
                            {relativeTime(e.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <button
              disabled
              className="flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-500 opacity-60"
            >
              <Filter className="h-3 w-3" /> Filter
            </button>
          </div>
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-slate-600" />
            <p className="mt-4 text-base font-medium text-slate-200">
              Detailed audit logs are an Enterprise feature
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Per-event audit trail with IP, user agent, and actor metadata is coming soon.
              In the meantime, the Feed tab shows everything that happens in this workspace.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
