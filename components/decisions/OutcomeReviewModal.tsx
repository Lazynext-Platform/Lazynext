'use client'

import { useState } from 'react'
import { X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useModalA11y } from '@/lib/utils/useModalA11y'

interface Decision {
  id: string
  title: string
  type: string
  madeAt: string
  context: string
}

interface OutcomeReviewModalProps {
  decisions: Decision[]
  onClose: () => void
}

const outcomes = [
  { emoji: '👍', label: 'Good', value: 'good', color: 'border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' },
  { emoji: '😐', label: 'Neutral', value: 'neutral', color: 'border-amber-500 bg-amber-500/10 hover:bg-amber-500/20' },
  { emoji: '👎', label: 'Bad', value: 'bad', color: 'border-red-500 bg-red-500/10 hover:bg-red-500/20' },
]

export default function OutcomeReviewModal({ decisions, onClose }: OutcomeReviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [learning, setLearning] = useState('')
  const modalRef = useModalA11y()

  const decision = decisions[currentIndex]
  const isLast = currentIndex === decisions.length - 1
  const progress = ((currentIndex + 1) / decisions.length) * 100

  function handleNext() {
    if (isLast) {
      onClose()
    } else {
      setCurrentIndex(i => i + 1)
      setSelectedOutcome(null)
      setNotes('')
      setLearning('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()} role="dialog" aria-modal="true" aria-labelledby="outcome-review-title">
      <div ref={modalRef} className="w-full max-w-[540px] rounded-2xl border border-slate-700 bg-slate-900" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 id="outcome-review-title" className="text-lg font-semibold text-slate-100">Review Outcome</h2>
            <p className="text-xs text-slate-500">{currentIndex + 1} of {decisions.length} decisions</p>
          </div>
          <button onClick={onClose} aria-label="Close outcome review" className="rounded-md p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {decisions.map((d, i) => (
              <div key={d.id} className={cn('h-2 rounded-full transition-all', i === currentIndex ? 'w-6 bg-orange-500' : i < currentIndex ? 'w-2 bg-orange-500/50' : 'w-2 bg-slate-700')} />
            ))}
          </div>

          {/* Decision context card */}
          <div className="rounded-xl border-l-4 border-orange-500 bg-slate-800/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-2xs font-semibold text-orange-400">{decision.type}</span>
              <span className="text-2xs text-slate-600">{decision.madeAt}</span>
            </div>
            <h3 className="text-base font-semibold text-slate-100">{decision.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{decision.context}</p>
          </div>

          {/* Outcome selection */}
          <div className="mt-5">
            <p className="text-sm font-medium text-slate-300 mb-3">How did this turn out?</p>
            <div className="grid grid-cols-3 gap-3">
              {outcomes.map(o => (
                <button key={o.value} onClick={() => setSelectedOutcome(o.value)}
                  aria-pressed={selectedOutcome === o.value}
                  className={cn('flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 transition-all',
                    selectedOutcome === o.value ? o.color : 'border-slate-700 bg-slate-800/50 hover:border-slate-600')}>
                  <span className="text-2xl">{o.emoji}</span>
                  <span className={cn('text-xs font-medium', selectedOutcome === o.value ? 'text-slate-100' : 'text-slate-400')}>{o.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              maxLength={1000}
              placeholder="What happened? Any unexpected outcomes?"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:border-brand focus:outline-none resize-none" />
          </div>

          {/* Learning */}
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-300">Key learning</label>
            <textarea value={learning} onChange={e => setLearning(e.target.value)} rows={2}
              maxLength={1000}
              placeholder="What would you do differently next time?"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:border-brand focus:outline-none resize-none" />
          </div>

          {/* LazyMind suggestion */}
          <div className="mt-4 rounded-lg border border-indigo-800/30 bg-indigo-900/20 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              <span className="text-2xs font-semibold text-indigo-300">LazyMind Suggestion</span>
            </div>
            <p className="text-xs text-slate-400">
              Similar decisions in your workspace had <strong className="text-indigo-300">72% good outcomes</strong> when the team involved 3+ stakeholders. Consider broader input for future {decision.type.toLowerCase()} decisions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
          <button onClick={() => { setCurrentIndex(i => Math.max(0, i - 1)); setSelectedOutcome(null); setNotes(''); setLearning('') }}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 disabled:opacity-50">
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <div className="h-1 w-24 rounded-full bg-slate-800" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <button onClick={handleNext} disabled={!selectedOutcome}
            className="flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed">
            {isLast ? 'Done' : 'Next'} <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
