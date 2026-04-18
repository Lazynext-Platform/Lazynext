'use client'

import { useState, useRef, useEffect, useMemo, useCallback, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  GitBranch,
  Plus,
  Search,
  CheckCircle2,
  X,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { DecisionQualityBadge } from '@/components/decisions/DecisionQualityBadge'
import OutcomeReviewModal from '@/components/decisions/OutcomeReviewModal'
import { EmptyDecisions } from '@/components/ui/EmptyStates'
import type { Decision, DecisionScoreBreakdown } from '@/lib/db/schema'

type DecisionStatus = 'all' | 'open' | 'decided' | 'reversed'
type DecisionType = 'reversible' | 'irreversible' | 'experimental'

export interface DecisionsClientProps {
  workspaceId: string
  workspaceSlug: string
  decisions: Decision[]
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

function LogDecisionModal({
  workspaceId,
  onClose,
  onLogged,
}: {
  workspaceId: string
  onClose: () => void
  onLogged: () => void
}) {
  const [question, setQuestion] = useState('')
  const [resolution, setResolution] = useState('')
  const [rationale, setRationale] = useState('')
  const [type, setType] = useState<DecisionType>('reversible')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [options, setOptions] = useState(['', ''])
  const [expectedBy, setExpectedBy] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<{ score: number | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }, [])

  async function handleSubmit() {
    if (!question.trim()) {
      setError('Question is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          question: question.trim(),
          resolution: resolution.trim() || undefined,
          rationale: rationale.trim() || undefined,
          optionsConsidered: options.map((o) => o.trim()).filter(Boolean),
          decisionType: type,
          tags,
          expectedBy: expectedBy ? new Date(expectedBy).toISOString() : undefined,
          isPublic,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body?.error || 'Failed to log decision')
        setSubmitting(false)
        return
      }
      setSubmitted({ score: body?.data?.quality_score ?? null })
      closeTimerRef.current = setTimeout(() => {
        onLogged()
        onClose()
      }, 1500)
    } catch {
      setError('Network error')
      setSubmitting(false)
    }
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-lg mx-3 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-100">Decision logged</h3>
            {submitted.score !== null && (
              <p className="mt-1 text-sm text-slate-400">
                Quality score: <span className="font-bold text-emerald-400">{submitted.score}</span>
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-100">Log a Decision</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label htmlFor="decision-question" className="block text-sm font-medium text-slate-300">
                  Question <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="decision-question"
                  autoFocus
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What decision needs to be made?"
                  rows={2}
                  className={cn(
                    'mt-1.5 w-full rounded-lg border bg-slate-800 px-4 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-1',
                    error ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:border-brand focus:ring-brand'
                  )}
                />
              </div>
              <div>
                <label htmlFor="decision-resolution" className="block text-sm font-medium text-slate-300">Resolution</label>
                <textarea id="decision-resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="What was decided?" rows={2} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:border-brand focus:outline-none" />
              </div>
              <div>
                <label htmlFor="decision-rationale" className="block text-sm font-medium text-slate-300">Rationale</label>
                <textarea id="decision-rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Why? What evidence, risks, alternatives?" rows={3} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:border-brand focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Alternatives considered</label>
                <div className="mt-1.5 space-y-2">
                  {options.map((opt, i) => (
                    <input
                      key={`option-${i}`}
                      value={opt}
                      onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n) }}
                      placeholder={`Option ${i + 1}`}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-brand focus:outline-none"
                    />
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
                  <label htmlFor="decision-expected" className="block text-sm font-medium text-slate-300">We&rsquo;ll know by</label>
                  <input
                    id="decision-expected"
                    type="date"
                    value={expectedBy}
                    onChange={(e) => setExpectedBy(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="decision-tags" className="block text-sm font-medium text-slate-300">Tags</label>
                <div className="mt-1.5 flex gap-1">
                  <input id="decision-tags" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tag, press Enter" className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-brand focus:outline-none" />
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map(t => (
                      <span key={t} className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-2xs text-slate-400">
                        <Tag className="h-2.5 w-2.5" />{t}
                        <button onClick={() => setTags(tags.filter(x => x !== t))} aria-label={`Remove tag ${t}`} className="text-slate-500 hover:text-slate-300">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded" />
                Share as public decision page
              </label>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
              <button onClick={onClose} disabled={submitting} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors disabled:opacity-60">
                {submitting ? 'Logging…' : 'Log Decision'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function DecisionsClient({ workspaceId, workspaceSlug: _slug, decisions }: DecisionsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [filter, setFilter] = useState<DecisionStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showLogModal, setShowLogModal] = useState(searchParams.get('log') === '1')
  const [showOutcomeReview, setShowOutcomeReview] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'quality'>('date')

  // React to URL changes — the global ⌘D handler navigates here with ?log=1.
  useEffect(() => {
    if (searchParams.get('log') === '1') setShowLogModal(true)
  }, [searchParams])

  const filtered = useMemo(() => {
    return decisions
      .filter((d) => {
        if (filter !== 'all' && d.status !== filter) return false
        if (searchQuery && !d.question.toLowerCase().includes(searchQuery.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'quality') return (b.quality_score || 0) - (a.quality_score || 0)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [decisions, filter, searchQuery, sortBy])

  const scored = decisions.filter((d) => typeof d.quality_score === 'number')
  const avgQuality = scored.length > 0
    ? Math.round(scored.reduce((a, d) => a + (d.quality_score ?? 0), 0) / scored.length)
    : null

  const pendingOutcomes = decisions.filter((d) => d.outcome === 'pending' && d.status === 'decided').length

  const handleLogged = useCallback(() => {
    startTransition(() => router.refresh())
  }, [router, startTransition])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <GitBranch className="h-6 w-6 text-orange-400" />
            Decisions
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Capture, score, and learn from every decision. <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-2xs">⌘D</kbd> to log a new one.
          </p>
        </div>
        <button onClick={() => setShowLogModal(true)} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">
          <Plus className="h-4 w-4" /> Log Decision
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-2xs uppercase tracking-wider text-slate-500">Total logged</p>
          <p className="mt-1 text-2xl font-bold text-slate-50">{decisions.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-2xs uppercase tracking-wider text-slate-500">Avg quality score</p>
          <p className={cn('mt-1 text-2xl font-bold', avgQuality === null ? 'text-slate-500' : avgQuality >= 70 ? 'text-emerald-400' : avgQuality >= 40 ? 'text-amber-400' : 'text-red-400')}>
            {avgQuality ?? '—'}
          </p>
          {avgQuality !== null && (
            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${avgQuality}%` }} />
            </div>
          )}
        </div>
        <button onClick={() => setShowOutcomeReview(true)} className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left hover:border-slate-700 transition-colors">
          <p className="text-2xs uppercase tracking-wider text-slate-500">Pending outcomes</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{pendingOutcomes}</p>
          <p className="text-2xs text-amber-400">Review &amp; record results</p>
        </button>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-2xs uppercase tracking-wider text-slate-500">Shared publicly</p>
          <p className="mt-1 text-2xl font-bold text-slate-50">{decisions.filter((d) => d.is_public).length}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decisions…"
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
                className={cn('rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors', filter === s ? 'bg-brand text-white' : 'text-slate-400 hover:text-slate-200')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {filtered.map((d) => (
          <div key={d.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex rounded-full px-2 py-0.5 text-2xs font-semibold uppercase', {
                'bg-orange-400/10 text-orange-400': d.status === 'open',
                'bg-emerald-400/10 text-emerald-400': d.status === 'decided',
                'bg-red-400/10 text-red-400': d.status === 'reversed',
                'bg-slate-400/10 text-slate-400': d.status === 'deferred',
              })}>
                {d.status}
              </span>
              {typeof d.quality_score === 'number' && (
                <DecisionQualityBadge
                  score={d.quality_score}
                  breakdown={d.score_breakdown as DecisionScoreBreakdown | null}
                  rationale={d.score_rationale}
                />
              )}
              {d.is_public && d.public_slug && (
                <a href={`/d/${d.public_slug}`} target="_blank" rel="noreferrer" className="rounded-full bg-blue-400/10 px-2 py-0.5 text-2xs font-semibold uppercase text-blue-400 hover:bg-blue-400/20">
                  Public
                </a>
              )}
            </div>
            <h3 className="mt-2 text-base font-semibold text-slate-100">{d.question}</h3>
            {d.resolution && <p className="mt-1 text-sm text-slate-400 line-clamp-2">{d.resolution}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{relativeTime(d.created_at)}</span>
              {d.outcome !== 'pending' && <><span className="text-slate-600">·</span><span className="capitalize">outcome: {d.outcome}</span></>}
              {d.expected_by && d.outcome === 'pending' && (
                <><span className="text-slate-600">·</span><span>expected {new Date(d.expected_by).toLocaleDateString()}</span></>
              )}
              {d.tags && d.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-2xs">{tag}</span>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && <EmptyDecisions onLogDecision={() => setShowLogModal(true)} />}
      </div>

      {showLogModal && <LogDecisionModal workspaceId={workspaceId} onClose={() => setShowLogModal(false)} onLogged={handleLogged} />}
      {showOutcomeReview && (
        <OutcomeReviewModal
          decisions={decisions
            .filter((d) => d.outcome === 'pending' && d.status === 'decided')
            .map((d) => ({
              id: d.id,
              title: d.question,
              type: (d.decision_type ?? 'reversible') as DecisionType,
              madeAt: relativeTime(d.created_at),
              context: d.resolution ?? '',
            }))}
          onClose={() => setShowOutcomeReview(false)}
        />
      )}
    </div>
  )
}
