'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, X, AlertTriangle, Minus, Clock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import type { Decision, DecisionScoreBreakdown } from '@/lib/db/schema'
import { DecisionQualityBadge } from '@/components/decisions/DecisionQualityBadge'

type Verdict = 'good' | 'bad' | 'neutral'

interface Props {
  workspaceSlug: string
  decisions: Decision[]
}

function daysUntil(iso: string | null): string {
  if (!iso) return 'No target date'
  const ms = new Date(iso).getTime() - Date.now()
  const days = Math.round(ms / 86400000)
  if (days < -1) return `${Math.abs(days)} days overdue`
  if (days === -1) return '1 day overdue'
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  return `in ${days} days`
}

function urgencyClass(iso: string | null): string {
  if (!iso) return 'text-slate-400 bg-slate-500/10'
  const ms = new Date(iso).getTime() - Date.now()
  const days = Math.round(ms / 86400000)
  if (days < 0) return 'text-red-400 bg-red-500/10'
  if (days <= 3) return 'text-amber-400 bg-amber-500/10'
  return 'text-slate-400 bg-slate-500/10'
}

function CaptureModal({
  decision,
  onClose,
  onSaved,
}: {
  decision: Decision
  onClose: () => void
  onSaved: () => void
}) {
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [learnings, setLearnings] = useState('')
  const [confidence, setConfidence] = useState(7)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!verdict) {
      setErr('Pick a verdict')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch(`/api/v1/decisions/${decision.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: verdict,
          outcomeNotes: learnings.trim() || undefined,
          outcomeConfidence: confidence,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setErr(body?.error || 'Failed to save')
        setSaving(false)
        return
      }
      onSaved()
      onClose()
    } catch {
      setErr('Network error')
      setSaving(false)
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
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Record outcome</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Decision</p>
            <p className="mt-1 text-sm font-medium text-slate-200">{decision.question}</p>
            {decision.resolution && <p className="mt-1 text-xs text-slate-400">{decision.resolution}</p>}
          </div>

          <div>
            <p className="text-sm font-medium text-slate-300">How did this actually go?</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([
                { key: 'good', label: 'Worked', icon: CheckCircle2, color: 'emerald' },
                { key: 'neutral', label: 'Partial', icon: Minus, color: 'amber' },
                { key: 'bad', label: 'Failed', icon: AlertTriangle, color: 'red' },
              ] as const).map((v) => (
                <button
                  key={v.key}
                  onClick={() => setVerdict(v.key)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-sm transition-colors',
                    verdict === v.key
                      ? `border-${v.color}-500 bg-${v.color}-500/10 text-${v.color}-300`
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  )}
                >
                  <v.icon className="h-5 w-5" />
                  <span className="font-medium">{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="outcome-learnings" className="block text-sm font-medium text-slate-300">
              What did we learn?
            </label>
            <textarea
              id="outcome-learnings"
              value={learnings}
              onChange={(e) => setLearnings(e.target.value)}
              rows={3}
              placeholder="Be specific. What surprised you? What would you do differently?"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="outcome-confidence" className="block text-sm font-medium text-slate-300">
              Confidence in this verdict: <span className="font-bold text-brand">{confidence}</span>/10
            </label>
            <input
              id="outcome-confidence"
              type="range"
              min={1}
              max={10}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>

          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
          <button onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800">Cancel</button>
          <button onClick={save} disabled={saving || !verdict} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : 'Record outcome'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OutcomesClient({ workspaceSlug, decisions }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'))

  useEffect(() => {
    setSelectedId(searchParams.get('id'))
  }, [searchParams])

  const selected = useMemo(() => decisions.find((d) => d.id === selectedId) ?? null, [decisions, selectedId])

  const overdue = decisions.filter((d) => d.expected_by && new Date(d.expected_by).getTime() < Date.now())
  const upcoming = decisions.filter((d) => !d.expected_by || new Date(d.expected_by).getTime() >= Date.now())

  function refresh() {
    startTransition(() => router.refresh())
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <Clock className="h-6 w-6 text-amber-400" />
            Outcomes
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Record how your decisions actually played out. This is the data that makes your AI smarter for <em>your</em> team.
          </p>
        </div>
        <Link
          href={`/workspace/${workspaceSlug}/decisions`}
          className="text-sm text-brand hover:text-brand-hover"
        >
          ← Back to decisions
        </Link>
      </div>

      {decisions.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
          <Clock className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-300">Nothing to review yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Outcomes appear here once a decision is marked &ldquo;decided&rdquo; and an expected date has passed (or any time you want to backfill).
          </p>
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-red-400">
                Overdue ({overdue.length})
              </h2>
              <div className="mt-3 space-y-2">
                {overdue.map((d) => (
                  <OutcomeRow key={d.id} decision={d} onSelect={setSelectedId} />
                ))}
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Waiting to be recorded ({upcoming.length})
            </h2>
            <div className="mt-3 space-y-2">
              {upcoming.length === 0 ? (
                <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-500">
                  All caught up. Come back when your next decision&rsquo;s target date arrives.
                </p>
              ) : (
                upcoming.map((d) => <OutcomeRow key={d.id} decision={d} onSelect={setSelectedId} />)
              )}
            </div>
          </section>
        </>
      )}

      {selected && (
        <CaptureModal
          decision={selected}
          onClose={() => setSelectedId(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )

  function OutcomeRow({ decision, onSelect }: { decision: Decision; onSelect: (id: string) => void }) {
    return (
      <button
        onClick={() => onSelect(decision.id)}
        className="flex w-full items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-left hover:border-slate-700 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-medium text-slate-100">{decision.question}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Logged {new Date(decision.created_at).toLocaleDateString()}
            {decision.resolution && <> · {decision.resolution.slice(0, 80)}{decision.resolution.length > 80 ? '…' : ''}</>}
          </p>
        </div>
        {typeof decision.quality_score === 'number' && (
          <DecisionQualityBadge
            score={decision.quality_score}
            breakdown={decision.score_breakdown as DecisionScoreBreakdown | null}
            rationale={decision.score_rationale}
          />
        )}
        <span className={cn('rounded-full px-2 py-0.5 text-2xs font-medium', urgencyClass(decision.expected_by))}>
          {daysUntil(decision.expected_by)}
        </span>
      </button>
    )
  }
}
