'use client'

import { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Tag,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

type TimePeriod = '7d' | '30d' | '90d' | 'all'

const statCards = [
  { label: 'Total Decisions', value: '47', delta: '+8', deltaType: 'up' as const, icon: Target },
  { label: 'Avg Quality Score', value: '76', delta: '+4', deltaType: 'up' as const, icon: BarChart3, progress: 76 },
  { label: 'Outcomes Tagged', value: '38/47', delta: '9 need tagging', deltaType: 'warn' as const, icon: Tag },
  { label: 'Decision Velocity', value: '3.2/wk', delta: '+0.5', deltaType: 'up' as const, icon: TrendingUp },
]

const qualityBars = [
  { range: '70–100', label: 'High quality decisions', count: 28, pct: 60, color: 'bg-emerald-500', helper: 'Well-documented with context and options' },
  { range: '40–69', label: 'Medium quality decisions', count: 15, pct: 32, color: 'bg-amber-500', helper: 'Missing some context or options' },
  { range: '0–39', label: 'Low quality decisions', count: 4, pct: 8, color: 'bg-red-500', helper: 'Needs rationale and options considered' },
]

const outcomeData = [
  { label: 'Good', count: 22, pct: 47, color: '#10B981' },
  { label: 'Bad', count: 5, pct: 11, color: '#EF4444' },
  { label: 'Neutral', count: 11, pct: 23, color: '#6B7280' },
  { label: 'Pending', count: 9, pct: 19, color: '#9CA3AF' },
]

const trendPoints = [
  { week: 'W1', value: 62 }, { week: 'W2', value: 68 }, { week: 'W3', value: 71 },
  { week: 'W4', value: 74 }, { week: 'W5', value: 72 }, { week: 'W6', value: 78 },
  { week: 'Now', value: 76 },
]

const topDecisionMakers = [
  { name: 'Avas Patel', initials: 'AP', decisions: 18, avgQuality: 82, goodPct: 72 },
  { name: 'Priya Shah', initials: 'PS', decisions: 14, avgQuality: 74, goodPct: 64 },
  { name: 'Rahul Dev', initials: 'RD', decisions: 10, avgQuality: 71, goodPct: 60 },
  { name: 'Sana Malik', initials: 'SM', decisions: 5, avgQuality: 68, goodPct: 40 },
]

const typeBreakdown = [
  { type: 'Reversible', count: 24, pct: 51, color: 'bg-blue-500', insight: 'Can be changed later with low cost' },
  { type: 'Irreversible', count: 15, pct: 32, color: 'bg-orange-500', insight: 'Hard to undo — need more context' },
  { type: 'Experimental', count: 8, pct: 17, color: 'bg-purple-500', insight: 'Time-boxed trials and tests' },
]

const tagCloud = [
  { tag: 'infrastructure', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { tag: 'product', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { tag: 'hiring', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { tag: 'pricing', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { tag: 'design', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { tag: 'marketing', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { tag: 'legal', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  { tag: 'architecture', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
]

const untaggedDecisions = [
  { title: 'Switch from Jest to Vitest?', age: '12 days ago' },
  { title: 'Hire contract designer for Q3?', age: '18 days ago' },
  { title: 'Add dark mode to marketing pages?', age: '22 days ago' },
]

export default function DecisionHealthPage() {
  const [period, setPeriod] = useState<TimePeriod>('30d')
  const params = useParams()
  const slug = params.slug as string

  const donutTotal = outcomeData.reduce((s, d) => s + d.count, 0)
  let donutOffset = 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/workspace/${slug}/decisions`} className="mb-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
            <ArrowLeft className="h-3 w-3" /> Back to decisions
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <BarChart3 className="h-6 w-6 text-orange-400" />
            Decision Health Dashboard
          </h1>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
          {(['7d', '30d', '90d', 'all'] as TimePeriod[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', period === p ? 'bg-brand text-white' : 'text-slate-400 hover:text-slate-200')}>
              {p === 'all' ? 'All time' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</span>
              <s.icon className="h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-50">{s.value}</p>
            {'progress' in s && s.progress && (
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800">
                <div className="h-1.5 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${s.progress}%` }} />
              </div>
            )}
            <div className={cn('mt-1 flex items-center gap-1 text-xs',
              s.deltaType === 'up' ? 'text-emerald-400' : s.deltaType === 'warn' ? 'text-amber-400' : 'text-red-400'
            )}>
              {s.deltaType === 'up' && <TrendingUp className="h-3 w-3" />}
              {s.deltaType === 'warn' && <AlertTriangle className="h-3 w-3" />}
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Quality Distribution */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-sm font-semibold text-slate-200">Quality Distribution</h2>
        <div className="mt-4 space-y-4">
          {qualityBars.map((q) => (
            <div key={q.range}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-300">{q.range} — {q.label}</span>
                <span className="text-xs font-semibold text-slate-300">{q.count} ({q.pct}%)</span>
              </div>
              <div className="h-5 w-full rounded-md bg-slate-800 overflow-hidden">
                <div className={cn('h-full rounded-md transition-all duration-700', q.color)} style={{ width: `${q.pct}%` }} />
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500">{q.helper}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Outcome Donut + Trend Chart */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Donut */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-slate-200">Outcome Distribution</h2>
          <div className="mt-4 flex items-center gap-6">
            <div className="relative">
              <svg width="140" height="140" viewBox="0 0 140 140">
                {outcomeData.map((d) => {
                  const segmentAngle = (d.count / donutTotal) * 360
                  const startAngle = donutOffset
                  donutOffset += segmentAngle
                  const startRad = (startAngle - 90) * Math.PI / 180
                  const endRad = (startAngle + segmentAngle - 90) * Math.PI / 180
                  const largeArc = segmentAngle > 180 ? 1 : 0
                  const x1 = 70 + 50 * Math.cos(startRad)
                  const y1 = 70 + 50 * Math.sin(startRad)
                  const x2 = 70 + 50 * Math.cos(endRad)
                  const y2 = 70 + 50 * Math.sin(endRad)
                  return (
                    <path key={d.label} d={`M 70 70 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={d.color} />
                  )
                })}
                <circle cx="70" cy="70" r="30" fill="#0F172A" />
                <text x="70" y="66" textAnchor="middle" className="fill-slate-50 text-lg font-bold">{donutTotal}</text>
                <text x="70" y="80" textAnchor="middle" className="fill-slate-500 text-[10px]">total</text>
              </svg>
            </div>
            <div className="space-y-2">
              {outcomeData.map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-slate-300">{d.label}</span>
                  <span className="text-xs font-semibold text-slate-400">{d.count} ({d.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-slate-200">Quality Trend</h2>
          <div className="mt-4 relative h-40">
            <svg width="100%" height="100%" viewBox="0 0 300 130" preserveAspectRatio="none">
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F6EF7" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#4F6EF7" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((v) => (
                <line key={v} x1="0" y1={130 - (v / 100) * 130} x2="300" y2={130 - (v / 100) * 130} stroke="#334155" strokeWidth="0.5" strokeDasharray="4" />
              ))}
              {/* Area */}
              <path d={`M ${trendPoints.map((p, i) => `${(i / (trendPoints.length - 1)) * 300},${130 - (p.value / 100) * 130}`).join(' L ')} L 300,130 L 0,130 Z`} fill="url(#trendGrad)" />
              {/* Line */}
              <polyline points={trendPoints.map((p, i) => `${(i / (trendPoints.length - 1)) * 300},${130 - (p.value / 100) * 130}`).join(' ')} fill="none" stroke="#4F6EF7" strokeWidth="2" />
              {/* Current point */}
              <circle cx="300" cy={130 - (trendPoints[trendPoints.length - 1].value / 100) * 130} r="4" fill="#4F6EF7" />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
              {trendPoints.map((p) => (
                <span key={p.week} className="text-[9px] text-slate-600">{p.week}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Decision Makers */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-sm font-semibold text-slate-200">Top Decision Makers</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500">
                <th className="py-2 text-left font-medium">Member</th>
                <th className="py-2 text-center font-medium">Decisions</th>
                <th className="py-2 text-center font-medium">Avg Quality</th>
                <th className="py-2 text-center font-medium">Good %</th>
              </tr>
            </thead>
            <tbody>
              {topDecisionMakers.map((m) => (
                <tr key={m.name} className="border-b border-slate-800/50 last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">{m.initials}</div>
                      <span className="text-slate-200">{m.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-center text-slate-300">{m.decisions}</td>
                  <td className={cn('py-3 text-center font-semibold', m.avgQuality >= 70 ? 'text-emerald-400' : m.avgQuality >= 40 ? 'text-amber-400' : 'text-red-400')}>{m.avgQuality}</td>
                  <td className="py-3 text-center text-slate-300">{m.goodPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Type Breakdown + Tag Cloud */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-slate-200">Decision Type Breakdown</h2>
          <div className="mt-4 space-y-4">
            {typeBreakdown.map((t) => (
              <div key={t.type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300">{t.type}</span>
                  <span className="text-xs text-slate-400">{t.count} ({t.pct}%)</span>
                </div>
                <div className="h-4 w-full rounded bg-slate-800 overflow-hidden">
                  <div className={cn('h-full rounded transition-all duration-700', t.color)} style={{ width: `${t.pct}%` }} />
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">{t.insight}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-slate-200">Decision Tags</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {tagCloud.map((t) => (
              <span key={t.tag} className={cn('rounded-full border px-3 py-1 text-xs font-medium', t.color)}>{t.tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Untagged Alert */}
      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-400">3 Decisions Need Outcome Tagging</h3>
            <p className="mt-1 text-xs text-slate-400">These decisions are 30+ days old without tagged outcomes.</p>
            <div className="mt-3 space-y-2">
              {untaggedDecisions.map((d) => (
                <div key={d.title} className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
                  <div>
                    <p className="text-sm text-slate-200">{d.title}</p>
                    <p className="text-[10px] text-slate-500">{d.age}</p>
                  </div>
                  <button className="text-xs font-medium text-brand hover:text-brand-hover">Tag outcome</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LazyMind Insight */}
      <div className="mt-6 rounded-xl border border-brand/20 bg-brand/5 p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-brand mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-brand">LazyMind Insight</h3>
            <p className="mt-1 text-sm text-slate-300">
              Your <strong>hiring decisions</strong> consistently score 15% lower than infrastructure decisions. Consider creating a decision template for hiring to improve quality and consistency.
            </p>
            <div className="mt-3 flex gap-2">
              <button className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/20">Create hiring template</button>
              <button className="text-xs text-slate-500 hover:text-slate-300">Dismiss</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
