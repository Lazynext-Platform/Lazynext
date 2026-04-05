'use client'

import { useState } from 'react'
import {
  GitBranch,
  Plus,
  Search,
  Filter,
  ChevronDown,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type DecisionStatus = 'all' | 'open' | 'decided' | 'reversed'

const sampleDecisions = [
  {
    id: '1',
    question: 'Which authentication provider should we use?',
    status: 'decided' as const,
    resolution: 'Clerk — best DX, generous free tier, Nextjs integration',
    qualityScore: 82,
    outcome: 'good' as const,
    madeBy: 'Avas Patel',
    createdAt: '2 days ago',
    tags: ['infrastructure', 'auth'],
  },
  {
    id: '2',
    question: 'Should we use server components or client components for the canvas?',
    status: 'decided' as const,
    resolution: 'Client components for canvas (React Flow needs client-side), server for data fetching',
    qualityScore: 75,
    outcome: 'pending' as const,
    madeBy: 'Avas Patel',
    createdAt: '3 days ago',
    tags: ['architecture', 'frontend'],
  },
  {
    id: '3',
    question: 'Database hosting — Neon vs Supabase vs PlanetScale?',
    status: 'decided' as const,
    resolution: 'Neon — serverless Postgres, best cold-start performance, ap-south-1 region',
    qualityScore: 91,
    outcome: 'good' as const,
    madeBy: 'Avas Patel',
    createdAt: '5 days ago',
    tags: ['infrastructure', 'database'],
  },
  {
    id: '4',
    question: 'How should we handle real-time collaboration?',
    status: 'open' as const,
    resolution: null,
    qualityScore: null,
    outcome: 'pending' as const,
    madeBy: 'Avas Patel',
    createdAt: '1 day ago',
    tags: ['architecture', 'real-time'],
  },
  {
    id: '5',
    question: 'INR pricing tiers — what price points?',
    status: 'decided' as const,
    resolution: '₹0/₹499/₹999/₹2999 per seat per month',
    qualityScore: 68,
    outcome: 'pending' as const,
    madeBy: 'Avas Patel',
    createdAt: '1 week ago',
    tags: ['pricing', 'business'],
  },
]

function QualityBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-slate-500">—</span>
  const color =
    score >= 70 ? 'text-emerald-400 bg-emerald-400/10' :
    score >= 40 ? 'text-amber-400 bg-amber-400/10' :
    'text-red-400 bg-red-400/10'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {score}
    </span>
  )
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const styles = {
    good: 'text-emerald-400 bg-emerald-400/10',
    bad: 'text-red-400 bg-red-400/10',
    neutral: 'text-slate-400 bg-slate-400/10',
    pending: 'text-slate-500 bg-slate-500/10',
  }
  const icons = { good: CheckCircle2, bad: XCircle, neutral: Clock, pending: Clock }
  const Icon = icons[outcome as keyof typeof icons] || Clock
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[outcome as keyof typeof styles] || styles.pending}`}>
      <Icon className="h-3 w-3" />
      {outcome}
    </span>
  )
}

export default function DecisionsPage() {
  const [filter, setFilter] = useState<DecisionStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = sampleDecisions.filter((d) => {
    if (filter !== 'all' && d.status !== filter) return false
    if (searchQuery && !d.question.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <GitBranch className="h-6 w-6 text-orange-400" />
            Decision Log
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Every decision your team makes, logged with context and scored by AI.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">
          <Plus className="h-4 w-4" />
          New Decision
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Total</p>
          <p className="mt-1 text-xl font-bold text-slate-50">{sampleDecisions.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Open</p>
          <p className="mt-1 text-xl font-bold text-orange-400">
            {sampleDecisions.filter((d) => d.status === 'open').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Avg Quality</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">
            {Math.round(
              sampleDecisions
                .filter((d) => d.qualityScore !== null)
                .reduce((sum, d) => sum + (d.qualityScore || 0), 0) /
                sampleDecisions.filter((d) => d.qualityScore !== null).length
            )}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Good Outcomes</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">
            {sampleDecisions.filter((d) => d.outcome === 'good').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decisions..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
          {(['all', 'open', 'decided', 'reversed'] as DecisionStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                filter === s
                  ? 'bg-brand text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Decision list */}
      <div className="mt-6 space-y-3">
        {filtered.map((decision) => (
          <div
            key={decision.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                    decision.status === 'open' ? 'bg-orange-400/10 text-orange-400' :
                    decision.status === 'decided' ? 'bg-emerald-400/10 text-emerald-400' :
                    'bg-red-400/10 text-red-400'
                  )}>
                    {decision.status}
                  </span>
                  <QualityBadge score={decision.qualityScore} />
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-100">{decision.question}</h3>
                {decision.resolution && (
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">{decision.resolution}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-xs text-slate-500">{decision.madeBy}</span>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs text-slate-500">{decision.createdAt}</span>
                  <span className="text-xs text-slate-600">·</span>
                  <OutcomeBadge outcome={decision.outcome} />
                  {decision.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-700 py-12 text-center">
            <GitBranch className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm text-slate-500">No decisions found</p>
            <p className="text-xs text-slate-600">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
