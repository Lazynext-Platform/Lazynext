'use client'

import { useState, useRef, useEffect } from 'react'
import {
  GitBranch,
  Plus,
  Search,
  CheckCircle2,
  X,
  Tag,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { DecisionCard } from '@/components/decisions/DecisionCard'
import OutcomeReviewModal from '@/components/decisions/OutcomeReviewModal'
import { EmptyDecisions } from '@/components/ui/EmptyStates'

type DecisionStatus = 'all' | 'open' | 'decided' | 'reversed'
type DecisionType = 'reversible' | 'irreversible' | 'experimental'

const sampleDecisions = [
  {
    id: '1',
    question: 'Which authentication provider should we use?',
    status: 'decided' as const,
    resolution: 'Supabase Auth — unified auth + DB, RLS, generous free tier',
    qualityScore: 82,
    outcome: 'good' as const,
    madeBy: 'Avas Patel',
    createdAt: '2 days ago',
    tags: ['infrastructure', 'auth'],
    type: 'irreversible' as DecisionType,
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
    type: 'reversible' as DecisionType,
  },
  {
    id: '3',
    question: 'Database hosting — Supabase vs Firebase vs PlanetScale?',
    status: 'decided' as const,
    resolution: 'Supabase — unified Auth + Postgres, RLS policies, real-time subscriptions',
    qualityScore: 91,
    outcome: 'good' as const,
    madeBy: 'Avas Patel',
    createdAt: '5 days ago',
    tags: ['infrastructure', 'database'],
    type: 'irreversible' as DecisionType,
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
    type: 'experimental' as DecisionType,
  },
  {
    id: '5',
    question: 'Pricing tiers — what price points?',
    status: 'decided' as const,
    resolution: '$0/$9/$19/$49 per seat per month',
    qualityScore: 68,
    outcome: 'pending' as const,
    madeBy: 'Avas Patel',
    createdAt: '1 week ago',
    tags: ['pricing', 'business'],
    type: 'reversible' as DecisionType,
  },
  {
    id: '6',
    question: 'Should we use Lemon Squeezy for billing?',
    status: 'decided' as const,
    resolution: 'Yes — Lemon Squeezy handles global payments, tax, and works without company registration',
    qualityScore: 84,
    outcome: 'good' as const,
    madeBy: 'Priya Shah',
    createdAt: '1 week ago',
    tags: ['billing', 'infrastructure'],
    type: 'irreversible' as DecisionType,
  },
  {
    id: '7',
    question: 'Task priority system — 3 levels or 5?',
    status: 'decided' as const,
    resolution: '3 levels (Low/Medium/High) — simpler, less cognitive load',
    qualityScore: 72,
    outcome: 'neutral' as const,
    madeBy: 'Rahul Dev',
    createdAt: '2 weeks ago',
    tags: ['product', 'ux'],
    type: 'reversible' as DecisionType,
  },
]

const qualityDistribution = [
  { range: '70–100', label: 'High quality', count: 4, total: 7, color: 'bg-emerald-500' },
  { range: '40–69', label: 'Medium quality', count: 2, total: 7, color: 'bg-amber-500' },
  { range: '0–39', label: 'Low quality', count: 0, total: 7, color: 'bg-red-500' },
]

function LogDecisionModal({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = useState('')
  const [resolution, setResolution] = useState('')
  const [rationale, setRationale] = useState('')
  const [type, setType] = useState<DecisionType>('reversible')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [options, setOptions] = useState(['', ''])
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(false)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const handleSubmit = () => {
    if (!question.trim()) {
      setError(true)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => setError(false), 1500)
      return
    }
    setSubmitted(true)
    closeTimerRef.current = setTimeout(() => onClose(), 2000)
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div
        className="w-full max-w-lg mx-3 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 motion-safe:animate-pulse">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-100">Decision Logged!</h3>
            <p className="mt-1 text-sm text-slate-400">Quality score: <span className="font-bold text-emerald-400">76</span></p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-100">Log a Decision</h2>
              <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label htmlFor="decision-question" className="block text-sm font-medium text-slate-300">Question <span className="text-red-400">*</span></label>
                <textarea
                  id="decision-question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What decision needs to be made?"
                  rows={2}
                  className={cn(
                    'mt-1.5 w-full rounded-lg border bg-slate-800 px-4 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-1',
                    error && !question.trim() ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:border-brand focus:ring-brand'
                  )}
                />
                {error && !question.trim() && <p className="mt-1 text-xs text-red-400">Question is required</p>}
              </div>
              <div>
                <label htmlFor="decision-resolution" className="block text-sm font-medium text-slate-300">Resolution</label>
                <textarea id="decision-resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="What was decided?" rows={2} maxLength={2000} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
              </div>
              <div>
                <label htmlFor="decision-rationale" className="block text-sm font-medium text-slate-300">Rationale</label>
                <textarea id="decision-rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Why was this decided?" rows={2} maxLength={2000} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Options Considered</label>
                <div className="mt-1.5 space-y-2">
                  {options.map((opt, i) => (
                    <input key={`option-${i}`} value={opt} onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n) }} placeholder={`Option ${i + 1}`} aria-label={`Option ${i + 1}`} maxLength={200} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-brand focus:outline-none" />
                  ))}
                  <button onClick={() => setOptions([...options, ''])} className="text-xs text-brand hover:text-brand-hover">+ Add option</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="decision-type" className="block text-sm font-medium text-slate-300">Type</label>
                  <select id="decision-type" value={type} onChange={(e) => setType(e.target.value as DecisionType)} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-brand focus:outline-none">
                    <option value="reversible">Reversible</option>
                    <option value="irreversible">Irreversible</option>
                    <option value="experimental">Experimental</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="decision-tags" className="block text-sm font-medium text-slate-300">Tags</label>
                  <div className="mt-1.5 flex gap-1">
                    <input id="decision-tags" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tag" className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-brand focus:outline-none" />
                  </div>
                  {tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{tags.map(t => <span key={t} className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-2xs text-slate-400"><Tag className="h-2.5 w-2.5" />{t}<button onClick={() => setTags(tags.filter(x => x !== t))} aria-label={`Remove tag ${t}`} className="text-slate-500 hover:text-slate-300">×</button></span>)}</div>}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800">Cancel</button>
              <button onClick={handleSubmit} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">Log Decision</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function DecisionsPage() {
  const [filter, setFilter] = useState<DecisionStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showLogModal, setShowLogModal] = useState(false)
  const [showOutcomeReview, setShowOutcomeReview] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'quality'>('date')

  const filtered = sampleDecisions.filter((d) => {
    if (filter !== 'all' && d.status !== filter) return false
    if (searchQuery && !d.question.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'quality') return (b.qualityScore || 0) - (a.qualityScore || 0)
    return 0
  })

  const avgQuality = Math.round(
    sampleDecisions.filter((d) => d.qualityScore !== null).reduce((sum, d) => sum + (d.qualityScore || 0), 0) /
    sampleDecisions.filter((d) => d.qualityScore !== null).length
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <GitBranch className="h-6 w-6 text-orange-400" />
            Decision DNA
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Every decision your team makes, logged with context and scored by AI.
          </p>
        </div>
        <button onClick={() => setShowLogModal(true)} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">
          <Plus className="h-4 w-4" />
          Log Decision
        </button>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-2xs uppercase tracking-wider text-slate-500">Decisions This Month</p>
          <p className="mt-1 text-2xl font-bold text-slate-50">{sampleDecisions.length}</p>
          <p className="text-2xs text-emerald-400">+3 from last month</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-2xs uppercase tracking-wider text-slate-500">Avg Quality Score</p>
          <p className={cn('mt-1 text-2xl font-bold', avgQuality >= 70 ? 'text-emerald-400' : avgQuality >= 40 ? 'text-amber-400' : 'text-red-400')}>{avgQuality}</p>
          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800"><div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${avgQuality}%` }} /></div>
        </div>
        <button onClick={() => setShowOutcomeReview(true)} className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left hover:border-slate-700 transition-colors">
          <p className="text-2xs uppercase tracking-wider text-slate-500">Outcomes Tagged</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{sampleDecisions.filter(d => d.outcome !== 'pending').length}/{sampleDecisions.length}</p>
          <p className="text-2xs text-amber-400">{sampleDecisions.filter(d => d.outcome === 'pending').length} need tagging</p>
        </button>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-2xs uppercase tracking-wider text-slate-500">Top Decision Maker</p>
          <p className="mt-1 text-lg font-bold text-slate-50">Avas Patel</p>
          <p className="text-2xs text-slate-500">5 decisions</p>
        </div>
      </div>

      {/* Health Overview — quality distribution */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Quality Distribution</h2>
          <div className="relative">
            <div className="absolute -inset-1 rounded-lg bg-slate-800/50 blur-sm" />
            <div className="relative flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1">
              <Lock className="h-3 w-3 text-amber-400" />
              <span className="text-2xs text-amber-400">Business plan</span>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {qualityDistribution.map((q) => (
            <div key={q.range} className="flex items-center gap-3">
              <span className="w-16 text-xs text-slate-400">{q.range}</span>
              <div className="flex-1 h-6 rounded-md bg-slate-800 overflow-hidden">
                <div className={cn('h-full rounded-md transition-all duration-700', q.color)} style={{ width: `${(q.count / q.total) * 100}%` }} />
              </div>
              <span className="w-10 text-right text-xs font-semibold text-slate-300">{q.count}</span>
              <span className="w-12 text-right text-2xs text-slate-500">{Math.round((q.count / q.total) * 100)}%</span>
            </div>
          ))}
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
            aria-label="Search decisions"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'quality')} aria-label="Sort decisions" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-brand focus:outline-none">
            <option value="date">Sort by Date</option>
            <option value="quality">Sort by Quality</option>
          </select>
          <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
            {(['all', 'open', 'decided', 'reversed'] as DecisionStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  filter === s ? 'bg-brand text-white' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Decision list */}
      <div className="mt-6 space-y-3">
        {filtered.map((decision) => (
          <DecisionCard
            key={decision.id}
            question={decision.question}
            status={decision.status}
            resolution={decision.resolution}
            qualityScore={decision.qualityScore}
            outcome={decision.outcome}
            madeBy={decision.madeBy}
            createdAt={decision.createdAt}
            tags={decision.tags}
          />
        ))}

        {filtered.length === 0 && (
          <EmptyDecisions onLogDecision={() => setShowLogModal(true)} />
        )}
      </div>

      {showLogModal && <LogDecisionModal onClose={() => setShowLogModal(false)} />}
      {showOutcomeReview && (
        <OutcomeReviewModal
          decisions={sampleDecisions
            .filter(d => d.outcome === 'pending')
            .map(d => ({ id: d.id, title: d.question, type: d.type, madeAt: d.createdAt, context: d.resolution || '' }))}
          onClose={() => setShowOutcomeReview(false)}
        />
      )}
    </div>
  )
}
