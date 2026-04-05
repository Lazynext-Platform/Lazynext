'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Network,
  GitBranch,
  Activity,
  Plus,
  ArrowRight,
  CheckSquare,
  FileText,
  Clock,
} from 'lucide-react'

const statCards = [
  { label: 'Active Workflows', value: '12', icon: Network, color: 'text-brand' },
  { label: 'Open Decisions', value: '5', icon: GitBranch, color: 'text-orange-400' },
  { label: 'Tasks In Progress', value: '18', icon: CheckSquare, color: 'text-blue-400' },
  { label: 'Avg Quality Score', value: '74', icon: Activity, color: 'text-emerald-400' },
]

const recentItems = [
  { type: 'task', title: 'Set up CI/CD pipeline', time: '2 hours ago', icon: CheckSquare, color: 'bg-blue-500' },
  { type: 'decision', title: 'Choose auth provider', time: '5 hours ago', icon: GitBranch, color: 'bg-orange-500' },
  { type: 'doc', title: 'API design spec v2', time: '1 day ago', icon: FileText, color: 'bg-emerald-500' },
  { type: 'task', title: 'Implement node creation', time: '1 day ago', icon: CheckSquare, color: 'bg-blue-500' },
  { type: 'decision', title: 'Database provider selection', time: '2 days ago', icon: GitBranch, color: 'bg-orange-500' },
]

export default function WorkspaceHomePage() {
  const params = useParams()
  const slug = params.slug as string

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-400">Here&apos;s what&apos;s happening in your workspace.</p>
        </div>
        <Link
          href={`/workspace/${slug}/canvas/default`}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          New workflow
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-50">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">Recent Activity</h2>
          <button className="flex items-center gap-1 text-sm text-brand hover:text-brand-hover transition-colors">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {recentItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 hover:border-slate-700 transition-colors cursor-pointer"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.color}`}>
                <item.icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{item.title}</p>
                <p className="text-xs text-slate-500 capitalize">{item.type}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                {item.time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href={`/workspace/${slug}/canvas/default`}
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 transition-colors"
        >
          <Network className="h-5 w-5 text-brand" />
          <div>
            <p className="text-sm font-semibold text-slate-200">Open Canvas</p>
            <p className="text-xs text-slate-500">Visual workflow editor</p>
          </div>
        </Link>
        <Link
          href={`/workspace/${slug}/decisions`}
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 transition-colors"
        >
          <GitBranch className="h-5 w-5 text-orange-400" />
          <div>
            <p className="text-sm font-semibold text-slate-200">Decision Log</p>
            <p className="text-xs text-slate-500">Track team decisions</p>
          </div>
        </Link>
        <Link
          href={`/workspace/${slug}/pulse`}
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 transition-colors"
        >
          <Activity className="h-5 w-5 text-cyan-400" />
          <div>
            <p className="text-sm font-semibold text-slate-200">Pulse Dashboard</p>
            <p className="text-xs text-slate-500">Team health metrics</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
