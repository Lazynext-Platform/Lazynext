'use client'

import { useState } from 'react'
import { Activity, Users, CheckSquare, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const metrics = [
  { label: 'Tasks Done', value: '18', total: '34', change: '+12%', trend: 'up' as const, icon: CheckSquare },
  { label: 'Overdue', value: '3', total: null, change: '+1', trend: 'down' as const, icon: AlertTriangle },
  { label: 'Blocked', value: '1', total: null, change: '0', trend: 'flat' as const, icon: Clock },
  { label: 'Decisions', value: '8', total: null, change: '+3', trend: 'up' as const, icon: Activity },
]

const workload = [
  { name: 'Avas Patel', initials: 'AP', tasks: 14, capacity: 16, color: 'bg-indigo-500' },
  { name: 'Priya Shah', initials: 'PS', tasks: 11, capacity: 12, color: 'bg-emerald-500' },
  { name: 'Rahul Dev', initials: 'RD', tasks: 18, capacity: 14, color: 'bg-amber-500' },
  { name: 'Sana Malik', initials: 'SM', tasks: 6, capacity: 12, color: 'bg-pink-500' },
]

const burndownData = [
  { day: 'Mon', ideal: 34, actual: 34 },
  { day: 'Tue', ideal: 29, actual: 31 },
  { day: 'Wed', ideal: 24, actual: 27 },
  { day: 'Thu', ideal: 19, actual: 22 },
  { day: 'Fri', ideal: 14, actual: 18 },
  { day: 'Today', ideal: 9, actual: 16 },
  { day: 'Sun', ideal: 4, actual: null },
]

const activityTimeline = [
  { actor: 'Avas', action: 'completed', target: 'Auth redirect fix', type: 'task', typeColor: 'bg-blue-500', time: '2h ago' },
  { actor: 'Priya', action: 'decided', target: 'Use Neon for DB', type: 'decision', typeColor: 'bg-orange-500', time: '3h ago' },
  { actor: 'Rahul', action: 'moved to Review', target: 'Canvas zoom', type: 'task', typeColor: 'bg-blue-500', time: '5h ago' },
  { actor: 'Sana', action: 'created doc', target: 'API Spec v3', type: 'doc', typeColor: 'bg-emerald-500', time: '6h ago' },
]

const weekComparison = [
  { label: 'Tasks Completed', thisWeek: 18, lastWeek: 14 },
  { label: 'Decisions Made', thisWeek: 8, lastWeek: 5 },
  { label: 'Avg Quality Score', thisWeek: 74, lastWeek: 71 },
  { label: 'Threads Active', thisWeek: 12, lastWeek: 9 },
]

type Period = '7d' | '30d' | '90d'

export default function PulsePage() {
  const [period, setPeriod] = useState<Period>('7d')
  const chartW = 480
  const chartH = 180
  const padX = 40
  const padY = 20

  function toX(i: number) { return padX + (i / (burndownData.length - 1)) * (chartW - padX * 2) }
  function toY(v: number) { return padY + ((34 - v) / 34) * (chartH - padY * 2) }

  const idealLine = burndownData.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.ideal)}`).join(' ')
  const actualPts = burndownData.filter(d => d.actual !== null)
  const actualLine = actualPts.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(burndownData.indexOf(d))},${toY(d.actual!)}`).join(' ')

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-slate-50">Pulse Dashboard</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">Real-time health metrics for your workspace.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-0.5">
          {(['7d', '30d', '90d'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={cn('rounded-md px-3 py-1 text-xs font-medium', period === p ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200')}>{p}</button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const TrendIcon = m.trend === 'up' && m.label !== 'Overdue' ? TrendingUp : m.trend === 'down' ? TrendingDown : Minus
          const trendColor = m.label === 'Overdue' ? (m.trend === 'down' ? 'text-red-400' : 'text-emerald-400') : m.trend === 'up' ? 'text-emerald-400' : m.trend === 'down' ? 'text-red-400' : 'text-slate-400'
          return (
            <div key={m.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{m.label}</span>
                <m.icon className={cn('h-4 w-4', m.label === 'Overdue' ? 'text-red-400' : m.label === 'Blocked' ? 'text-amber-400' : 'text-cyan-400')} />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-50">{m.value}{m.total && <span className="text-base font-normal text-slate-500">/{m.total}</span>}</p>
              <div className={`mt-1 flex items-center gap-1 text-xs ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                {m.change} this week
              </div>
            </div>
          )
        })}
      </div>

      {/* Team Workload */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-slate-100">Team Workload</h2>
        <div className="mt-4 space-y-4">
          {workload.map(w => {
            const pct = Math.round((w.tasks / w.capacity) * 100)
            const overloaded = pct > 100
            return (
              <div key={w.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white', w.color)}>{w.initials}</div>
                    <span className="text-sm text-slate-200">{w.name}</span>
                    {overloaded && <span className="flex items-center gap-0.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400"><AlertTriangle className="h-2.5 w-2.5" /> Overloaded</span>}
                  </div>
                  <span className="text-xs text-slate-500">{w.tasks}/{w.capacity} tasks</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className={cn('h-full rounded-full transition-all', overloaded ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-cyan-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sprint Burndown */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-slate-100">Sprint Burndown</h2>
        <div className="mt-4 overflow-x-auto">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full max-w-lg" preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            {[0, 10, 20, 30].map(v => (
              <g key={v}>
                <line x1={padX} y1={toY(v)} x2={chartW - padX} y2={toY(v)} stroke="#1e293b" strokeWidth={1} />
                <text x={padX - 6} y={toY(v) + 4} textAnchor="end" className="fill-slate-600 text-[10px]">{v}</text>
              </g>
            ))}
            {burndownData.map((d, i) => (
              <text key={i} x={toX(i)} y={chartH - 2} textAnchor="middle" className={cn('fill-slate-500 text-[9px]', d.day === 'Today' && 'fill-cyan-400 font-medium')}>{d.day}</text>
            ))}
            {/* Ideal line */}
            <path d={idealLine} fill="none" stroke="#334155" strokeWidth={1.5} strokeDasharray="6 4" />
            {/* Actual line */}
            <path d={actualLine} fill="none" stroke="#06b6d4" strokeWidth={2} />
            {/* Actual dots */}
            {actualPts.map((d, i) => (
              <circle key={i} cx={toX(burndownData.indexOf(d))} cy={toY(d.actual!)} r={3} className="fill-cyan-400" />
            ))}
          </svg>
        </div>
        <div className="mt-3 flex gap-4 text-[10px] text-slate-500">
          <div className="flex items-center gap-1"><div className="h-px w-4 border-t border-dashed border-slate-500" /> Ideal</div>
          <div className="flex items-center gap-1"><div className="h-0.5 w-4 bg-cyan-500 rounded" /> Actual</div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-slate-100">Recent Activity</h2>
        <div className="mt-4 space-y-3">
          {activityTimeline.map((a, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={cn('mt-0.5 h-2 w-2 rounded-full shrink-0', a.typeColor)} />
              <div>
                <p className="text-sm text-slate-300"><strong className="text-slate-100">{a.actor}</strong> {a.action} <span className="text-cyan-400">{a.target}</span></p>
                <p className="text-[10px] text-slate-600">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Week-over-Week */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-slate-100">Week-over-Week</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {weekComparison.map(w => {
            const diff = w.thisWeek - w.lastWeek
            return (
              <div key={w.label} className="rounded-lg border border-slate-800 p-3">
                <p className="text-[10px] text-slate-500">{w.label}</p>
                <p className="mt-1 text-lg font-bold text-slate-100">{w.thisWeek}</p>
                <p className={cn('text-[10px]', diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-500')}>
                  {diff > 0 ? '+' : ''}{diff} vs last week
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* LazyMind Summary */}
      <div className="mt-6 rounded-xl border border-cyan-800/30 bg-gradient-to-r from-cyan-900/20 to-slate-900 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-cyan-300">LazyMind Weekly Summary</h3>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Your team completed 12% more tasks than last week. <strong className="text-cyan-300">Rahul is overloaded</strong> with 18/14 tasks — consider redistributing 4 tasks to Sana who has capacity. Decision quality improved by 3 points. The sprint burndown shows you&apos;re 7 tasks behind the ideal pace — focus on unblocking the 1 blocked item to get back on track.
        </p>
      </div>
    </div>
  )
}
