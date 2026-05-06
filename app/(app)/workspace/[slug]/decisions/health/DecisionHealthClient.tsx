'use client'

import { useMemo, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, TrendingUp, Target, Tag, Sparkles, AlertTriangle, ArrowLeft, Users } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ExportPdfButton } from '@/components/decisions/ExportPdfButton'
import type { DecisionHealthStats, DecisionHealthPeriod, MemberUser } from '@/lib/data/workspace'

interface Props {
  stats: DecisionHealthStats
  members: MemberUser[]
  period: DecisionHealthPeriod
  slug: string
  workspaceId: string
  plan: 'free' | 'starter' | 'pro' | 'business' | 'enterprise'
}

const OUTCOME_COLORS: Record<string, string> = {
  good: '#10B981',
  bad: '#EF4444',
  neutral: '#6B7280',
  pending: '#9CA3AF',
}

const TYPE_LABEL: Record<string, string> = {
  reversible: 'Reversible',
  irreversible: 'Irreversible',
  experimental: 'Experimental',
  unspecified: 'Unspecified',
}

const TYPE_COLOR: Record<string, string> = {
  reversible: 'bg-blue-500',
  irreversible: 'bg-orange-500',
  experimental: 'bg-purple-500',
  unspecified: 'bg-slate-500',
}

const TYPE_INSIGHT: Record<string, string> = {
  reversible: 'Can be changed later with low cost',
  irreversible: 'Hard to undo — needs more context',
  experimental: 'Time-boxed trials and tests',
  unspecified: 'No reversibility tagged',
}

function relativeAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} ${months === 1 ? 'month' : 'months'} ago`
}

export function DecisionHealthClient({ stats, members, period, slug, workspaceId, plan }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function setPeriod(p: DecisionHealthPeriod) {
    const params = new URLSearchParams(sp?.toString())
    params.set('period', p)
    startTransition(() => router.replace(`/workspace/${slug}/decisions/health?${params.toString()}`))
  }

  const memberMap = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members])

  const totalDecisions = stats.totalDecisions
  const totalQ = stats.qualityBuckets.high + stats.qualityBuckets.medium + stats.qualityBuckets.low + stats.qualityBuckets.unscored
  const qualityPct = (n: number) => (totalQ > 0 ? Math.round((n / totalQ) * 100) : 0)

  const totalOutcomes = stats.outcomeCounts.good + stats.outcomeCounts.bad + stats.outcomeCounts.neutral + stats.outcomeCounts.pending
  const outcomePct = (n: number) => (totalOutcomes > 0 ? Math.round((n / totalOutcomes) * 100) : 0)

  let donutOffset = 0
  const outcomeData = (['good', 'bad', 'neutral', 'pending'] as const)
    .map((k) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), key: k, count: stats.outcomeCounts[k], color: OUTCOME_COLORS[k] }))
    .filter((d) => d.count > 0)

  // Trend chart — substitute null values with the last seen value (or 0) so the line is continuous.
  let lastVal = 0
  const trendValues = stats.qualityTrend.map((p) => {
    if (p.value !== null) lastVal = p.value
    return lastVal
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
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
        <div className={cn('flex items-center gap-2', isPending && 'opacity-60')}>
          <ExportPdfButton workspaceId={workspaceId} plan={plan} />
          <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
            {(['7d', '30d', '90d', 'all'] as DecisionHealthPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                disabled={isPending}
                className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', period === p ? 'bg-brand text-brand-foreground' : 'text-slate-400 hover:text-slate-200')}
              >
                {p === 'all' ? 'All time' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {totalDecisions === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-base font-medium text-slate-200">No decisions in this period</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Log a decision from the canvas or the decisions page and quality scores, outcomes, trends, and tag insights will populate here.
          </p>
          <Link
            href={`/workspace/${slug}/decisions`}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            Open Decisions
          </Link>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Decisions"
              value={String(stats.totalDecisions)}
              delta={stats.totalDecisionsPrev > 0 ? signed(stats.totalDecisions - stats.totalDecisionsPrev) : null}
              deltaType={stats.totalDecisions >= stats.totalDecisionsPrev ? 'up' : 'down'}
              icon={Target}
            />
            <StatCard
              label="Avg Quality Score"
              value={stats.avgQuality !== null ? String(stats.avgQuality) : '—'}
              progress={stats.avgQuality ?? undefined}
              delta={stats.avgQuality !== null && stats.avgQualityPrev !== null ? signed(stats.avgQuality - stats.avgQualityPrev) : null}
              deltaType={
                stats.avgQuality !== null && stats.avgQualityPrev !== null
                  ? stats.avgQuality >= stats.avgQualityPrev
                    ? 'up'
                    : 'down'
                  : 'flat'
              }
              icon={BarChart3}
            />
            <StatCard
              label="Outcomes Tagged"
              value={`${stats.outcomeTagged}/${stats.totalDecisions}`}
              delta={
                stats.totalDecisions - stats.outcomeTagged > 0
                  ? `${stats.totalDecisions - stats.outcomeTagged} need tagging`
                  : 'All tagged'
              }
              deltaType={stats.totalDecisions === stats.outcomeTagged ? 'up' : 'warn'}
              icon={Tag}
            />
            <StatCard
              label="Decision Velocity"
              value={`${stats.velocityPerWeek}/wk`}
              delta={stats.velocityPerWeekPrev > 0 ? signed(stats.velocityPerWeek - stats.velocityPerWeekPrev) : null}
              deltaType={stats.velocityPerWeek >= stats.velocityPerWeekPrev ? 'up' : 'down'}
              icon={TrendingUp}
            />
          </div>

          {/* Quality distribution */}
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-sm font-semibold text-slate-200">Quality Distribution</h2>
            <div className="mt-4 space-y-4">
              <QualityRow range="70–100" label="High quality" count={stats.qualityBuckets.high} pct={qualityPct(stats.qualityBuckets.high)} color="bg-emerald-500" helper="Well-documented with context and options" />
              <QualityRow range="40–69" label="Medium quality" count={stats.qualityBuckets.medium} pct={qualityPct(stats.qualityBuckets.medium)} color="bg-amber-500" helper="Missing some context or options" />
              <QualityRow range="0–39" label="Low quality" count={stats.qualityBuckets.low} pct={qualityPct(stats.qualityBuckets.low)} color="bg-red-500" helper="Needs rationale and options considered" />
              {stats.qualityBuckets.unscored > 0 && (
                <QualityRow range="—" label="Unscored" count={stats.qualityBuckets.unscored} pct={qualityPct(stats.qualityBuckets.unscored)} color="bg-slate-600" helper="Not yet scored by the quality model" />
              )}
            </div>
          </div>

          {/* Outcome donut + trend */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-sm font-semibold text-slate-200">Outcome Distribution</h2>
              <div className="mt-4 flex items-center gap-6">
                <div className="relative">
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    {outcomeData.map((d) => {
                      const segmentAngle = (d.count / totalOutcomes) * 360
                      const startAngle = donutOffset
                      donutOffset += segmentAngle
                      const startRad = ((startAngle - 90) * Math.PI) / 180
                      const endRad = ((startAngle + segmentAngle - 90) * Math.PI) / 180
                      const largeArc = segmentAngle > 180 ? 1 : 0
                      const x1 = 70 + 50 * Math.cos(startRad)
                      const y1 = 70 + 50 * Math.sin(startRad)
                      const x2 = 70 + 50 * Math.cos(endRad)
                      const y2 = 70 + 50 * Math.sin(endRad)
                      // Single full slice — render a circle to avoid degenerate path.
                      if (segmentAngle >= 359.999) {
                        return <circle key={d.key} cx={70} cy={70} r={50} fill={d.color} />
                      }
                      return (
                        <path key={d.key} d={`M 70 70 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={d.color} />
                      )
                    })}
                    <circle cx="70" cy="70" r="30" fill="#0F172A" />
                    <text x="70" y="66" textAnchor="middle" className="fill-slate-50 text-lg font-bold">{totalOutcomes}</text>
                    <text x="70" y="80" textAnchor="middle" className="fill-slate-500 text-2xs">total</text>
                  </svg>
                </div>
                <div className="space-y-2">
                  {outcomeData.map((d) => (
                    <div key={d.key} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-slate-300">{d.label}</span>
                      <span className="text-xs font-semibold text-slate-400">
                        {d.count} ({outcomePct(d.count)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trend */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-sm font-semibold text-slate-200">Quality Trend (7 weeks)</h2>
              <div className="relative mt-4 h-40">
                {stats.qualityTrend.every((p) => p.value === null) ? (
                  <p className="flex h-full items-center justify-center text-sm text-slate-500">
                    Not enough scored decisions to draw a trend yet.
                  </p>
                ) : (
                  <>
                    <svg width="100%" height="100%" viewBox="0 0 300 130" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#BEFF66" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#BEFF66" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[0, 25, 50, 75, 100].map((v) => (
                        <line key={v} x1="0" y1={130 - (v / 100) * 130} x2="300" y2={130 - (v / 100) * 130} stroke="#334155" strokeWidth="0.5" strokeDasharray="4" />
                      ))}
                      <path
                        d={`M ${trendValues.map((v, i) => `${(i / (trendValues.length - 1)) * 300},${130 - (v / 100) * 130}`).join(' L ')} L 300,130 L 0,130 Z`}
                        fill="url(#trendGrad)"
                      />
                      <polyline
                        points={trendValues.map((v, i) => `${(i / (trendValues.length - 1)) * 300},${130 - (v / 100) * 130}`).join(' ')}
                        fill="none"
                        stroke="#BEFF66"
                        strokeWidth="2"
                      />
                      <circle cx="300" cy={130 - (trendValues[trendValues.length - 1] / 100) * 130} r="4" fill="#BEFF66" />
                    </svg>
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                      {stats.qualityTrend.map((p) => (
                        <span key={p.week} className="text-3xs text-slate-600">{p.week}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Top decision makers */}
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Users className="h-4 w-4 text-slate-400" /> Top Decision Makers
            </h2>
            {stats.topDecisionMakers.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No decisions logged in this period.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm" aria-label="Top decision makers">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-500">
                      <th scope="col" className="py-2 text-left font-medium">Member</th>
                      <th scope="col" className="py-2 text-center font-medium">Decisions</th>
                      <th scope="col" className="py-2 text-center font-medium">Avg Quality</th>
                      <th scope="col" className="py-2 text-center font-medium">Good %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topDecisionMakers.map((m) => {
                      const member = memberMap.get(m.userId)
                      const display = member?.name || member?.email || 'Unknown member'
                      const initials = member?.initials || '?'
                      return (
                        <tr key={m.userId} className="border-b border-slate-800/50 last:border-0">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-2xs font-bold text-white">
                                {initials}
                              </div>
                              <span className="text-slate-200">{display}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center text-slate-300">{m.decisions}</td>
                          <td className={cn('py-3 text-center font-semibold', m.avgQuality >= 70 ? 'text-emerald-400' : m.avgQuality >= 40 ? 'text-amber-400' : m.avgQuality > 0 ? 'text-red-400' : 'text-slate-500')}>
                            {m.avgQuality > 0 ? m.avgQuality : '—'}
                          </td>
                          <td className="py-3 text-center text-slate-300">{m.goodPct}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Type breakdown + tag cloud */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-sm font-semibold text-slate-200">Decision Type Breakdown</h2>
              {stats.typeBreakdown.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No type data yet.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {stats.typeBreakdown.map((t) => {
                    const pct = totalDecisions > 0 ? Math.round((t.count / totalDecisions) * 100) : 0
                    return (
                      <div key={t.type}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs text-slate-300">{TYPE_LABEL[t.type]}</span>
                          <span className="text-xs text-slate-400">{t.count} ({pct}%)</span>
                        </div>
                        <div className="h-4 w-full overflow-hidden rounded bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={TYPE_LABEL[t.type]}>
                          <div className={cn('h-full rounded transition-all duration-700', TYPE_COLOR[t.type])} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-0.5 text-2xs text-slate-500">{TYPE_INSIGHT[t.type]}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-sm font-semibold text-slate-200">Decision Tags</h2>
              {stats.tagCounts.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No tags yet — add tags when logging a decision to see them clustered here.
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {stats.tagCounts.map((t) => (
                    <span
                      key={t.tag}
                      className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300"
                    >
                      {t.tag} <span className="ml-1 text-slate-500">{t.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Untagged stale alert */}
          {stats.untaggedStale.length > 0 && (
            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-400">
                    {stats.untaggedStale.length} {stats.untaggedStale.length === 1 ? 'decision needs' : 'decisions need'} outcome tagging
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    These are 30+ days old and still marked pending. Tagging the outcome unlocks the LazyMind insights below.
                  </p>
                  <div className="mt-3 space-y-2">
                    {stats.untaggedStale.map((d) => (
                      <Link
                        key={d.id}
                        href={`/workspace/${slug}/decisions/${d.id}`}
                        className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2 hover:bg-slate-800"
                      >
                        <div>
                          <p className="text-sm text-slate-200">{d.title}</p>
                          <p className="text-2xs text-slate-500">{relativeAge(d.createdAt)}</p>
                        </div>
                        <span className="text-xs font-medium text-brand hover:text-brand-hover">Tag outcome →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LazyMind insight — only generated when we have signal */}
          {stats.totalDecisions >= 5 && (
            <LazyMindInsight stats={stats} />
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  delta,
  deltaType,
  progress,
  icon: Icon,
}: {
  label: string
  value: string
  delta?: string | null
  deltaType: 'up' | 'down' | 'warn' | 'flat'
  progress?: number
  icon: typeof Target
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-2xs uppercase tracking-wider text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-50">{value}</p>
      {progress !== undefined && (
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-1.5 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      )}
      {delta && (
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-xs',
            deltaType === 'up' ? 'text-emerald-400' : deltaType === 'warn' ? 'text-amber-400' : deltaType === 'down' ? 'text-red-400' : 'text-slate-500',
          )}
        >
          {deltaType === 'up' && <TrendingUp className="h-3 w-3" />}
          {deltaType === 'warn' && <AlertTriangle className="h-3 w-3" />}
          {delta}
        </div>
      )}
    </div>
  )
}

function QualityRow({ range, label, count, pct, color, helper }: { range: string; label: string; count: number; pct: number; color: string; helper: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-slate-300">{range} — {label}</span>
        <span className="text-xs font-semibold text-slate-300">{count} ({pct}%)</span>
      </div>
      <div className="h-5 w-full overflow-hidden rounded-md bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cn('h-full rounded-md transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-2xs text-slate-500">{helper}</p>
    </div>
  )
}

function LazyMindInsight({ stats }: { stats: DecisionHealthStats }) {
  // Pick the highest-signal observation to surface.
  const insights: string[] = []
  const goodPct = stats.totalDecisions > 0 ? (stats.outcomeCounts.good / stats.totalDecisions) * 100 : 0
  const lowQualityPct = stats.totalDecisions > 0 ? (stats.qualityBuckets.low / stats.totalDecisions) * 100 : 0
  const untaggedPct = stats.totalDecisions > 0 ? ((stats.totalDecisions - stats.outcomeTagged) / stats.totalDecisions) * 100 : 0

  if (lowQualityPct >= 25) {
    insights.push(
      `**${Math.round(lowQualityPct)}% of your decisions** score below 40. Logging clearer rationale and at least 2 alternatives considered will lift the quality score significantly.`,
    )
  }
  if (untaggedPct >= 30) {
    insights.push(
      `**${Math.round(untaggedPct)}% of decisions are untagged.** Outcome tags unlock the trend chart's predictive value — try tagging your 5 oldest pending ones.`,
    )
  }
  if (goodPct >= 60 && stats.totalDecisions >= 10) {
    insights.push(
      `**${Math.round(goodPct)}% of tagged outcomes are positive** — your team has strong decision instincts. Consider templating your top decisions to scale that signal.`,
    )
  }
  if (insights.length === 0) {
    insights.push('Keep logging decisions and tagging outcomes — patterns become clearer at 20+ decisions.')
  }

  return (
    <div className="mt-6 rounded-xl border border-brand/20 bg-brand/5 p-5">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div>
          <h3 className="text-sm font-semibold text-brand">LazyMind Insight</h3>
          <p
            className="mt-1 text-sm text-slate-300"
            dangerouslySetInnerHTML={{
              __html: insights[0].replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
            }}
          />
        </div>
      </div>
    </div>
  )
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n)
}
