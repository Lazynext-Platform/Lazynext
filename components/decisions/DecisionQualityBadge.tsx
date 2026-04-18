'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import type { DecisionScoreBreakdown } from '@/lib/db/schema'

interface DecisionQualityBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  breakdown?: DecisionScoreBreakdown | null
  rationale?: string | null
}

const DIMENSION_LABELS: Array<{ key: keyof DecisionScoreBreakdown; label: string }> = [
  { key: 'clarity', label: 'Clarity' },
  { key: 'data_quality', label: 'Data quality' },
  { key: 'risk_awareness', label: 'Risk awareness' },
  { key: 'alternatives_considered', label: 'Alternatives' },
]

function bandLabel(score: number): string {
  if (score >= 91) return 'Rigorous'
  if (score >= 71) return 'Well-reasoned'
  if (score >= 41) return 'Considered'
  return 'Gut call'
}

export function DecisionQualityBadge({ score, size = 'sm', breakdown, rationale }: DecisionQualityBadgeProps) {
  const [open, setOpen] = useState(false)

  const color =
    score >= 70 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
    score >= 40 ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
    'text-red-400 bg-red-400/10 border-red-400/20'

  const label = bandLabel(score)

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  const hasBreakdown = breakdown && typeof breakdown === 'object'

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => hasBreakdown && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => hasBreakdown && setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span
        className={cn('inline-flex items-center gap-1 rounded-full border font-semibold', color, sizeStyles[size])}
        aria-label={`Quality score: ${score} out of 100, ${label}`}
        tabIndex={hasBreakdown ? 0 : -1}
      >
        {score}
        {size !== 'sm' && <span className="font-normal opacity-70">({label})</span>}
      </span>

      {open && hasBreakdown && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Decision Score &middot; {label}
          </div>
          <div className="space-y-2">
            {DIMENSION_LABELS.map(({ key, label: l }) => {
              const v = breakdown![key] ?? 0
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span>{l}</span>
                    <span className="font-semibold tabular-nums">{v}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        v >= 70 ? 'bg-emerald-500' : v >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                      style={{ width: `${v}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {rationale && (
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
              {rationale}
            </p>
          )}
        </div>
      )}
    </span>
  )
}
