'use client'

import { Activity, Users, CheckSquare, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const metrics = [
  { label: 'Tasks Completed', value: '24', change: '+12%', trend: 'up' as const, icon: CheckSquare },
  { label: 'Active Members', value: '6', change: '+2', trend: 'up' as const, icon: Users },
  { label: 'Decision Quality', value: '74', change: '-3', trend: 'down' as const, icon: Activity },
  { label: 'Avg Completion', value: '3.2d', change: '0%', trend: 'flat' as const, icon: TrendingUp },
]

const memberActivity = [
  { name: 'Avas Patel', tasks: 12, decisions: 5, avgQuality: 82 },
  { name: 'Priya Shah', tasks: 8, decisions: 3, avgQuality: 71 },
  { name: 'Rahul Dev', tasks: 10, decisions: 2, avgQuality: 68 },
]

export default function PulsePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6 text-cyan-400" />
        <h1 className="text-2xl font-bold text-slate-50">Pulse Dashboard</h1>
      </div>
      <p className="mt-1 text-sm text-slate-400">Real-time health metrics for your workspace.</p>

      {/* Metric cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const TrendIcon = m.trend === 'up' ? TrendingUp : m.trend === 'down' ? TrendingDown : Minus
          const trendColor = m.trend === 'up' ? 'text-emerald-400' : m.trend === 'down' ? 'text-red-400' : 'text-slate-400'
          return (
            <div key={m.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{m.label}</span>
                <m.icon className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-50">{m.value}</p>
              <div className={`mt-1 flex items-center gap-1 text-xs ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                {m.change} this week
              </div>
            </div>
          )
        })}
      </div>

      {/* Workload chart placeholder */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Workload Distribution</h2>
        <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-700">
          <p className="text-sm text-slate-500">Chart renders with live data</p>
        </div>
      </div>

      {/* Team leaderboard */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Team Activity</h2>
        <div className="mt-4">
          <div className="grid grid-cols-4 border-b border-slate-800 pb-2 text-xs font-medium text-slate-500">
            <span>Member</span>
            <span className="text-center">Tasks</span>
            <span className="text-center">Decisions</span>
            <span className="text-center">Avg Quality</span>
          </div>
          {memberActivity.map((m) => (
            <div key={m.name} className="grid grid-cols-4 border-b border-slate-800 py-3 last:border-0">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                  {m.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <span className="text-sm text-slate-200">{m.name}</span>
              </div>
              <span className="text-center text-sm text-slate-300">{m.tasks}</span>
              <span className="text-center text-sm text-slate-300">{m.decisions}</span>
              <span className={`text-center text-sm font-semibold ${
                m.avgQuality >= 70 ? 'text-emerald-400' :
                m.avgQuality >= 40 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {m.avgQuality}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
