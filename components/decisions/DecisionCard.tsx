'use client'

import { cn } from '@/lib/utils/cn'

interface DecisionCardProps {
  question: string
  status: string
  resolution?: string | null
  qualityScore?: number | null
  outcome?: string
  madeBy: string
  createdAt: string
  tags?: string[]
  onClick?: () => void
}

export function DecisionCard({
  question,
  status,
  resolution,
  qualityScore,
  outcome: _outcome,
  madeBy,
  createdAt,
  tags = [],
  onClick,
}: DecisionCardProps) {
  const scoreColor =
    qualityScore !== null && qualityScore !== undefined
      ? qualityScore >= 70 ? 'text-emerald-400 bg-emerald-400/10'
        : qualityScore >= 40 ? 'text-amber-400 bg-amber-400/10'
        : 'text-red-400 bg-red-400/10'
      : ''

  const statusStyle = {
    open: 'bg-orange-400/10 text-orange-400',
    decided: 'bg-emerald-400/10 text-emerald-400',
    reversed: 'bg-red-400/10 text-red-400',
    deferred: 'bg-slate-400/10 text-slate-400',
  }[status] || 'bg-slate-400/10 text-slate-400'

  return (
    <div
      onClick={onClick}
      className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-2xs font-semibold uppercase', statusStyle)}>
          {status}
        </span>
        {qualityScore !== null && qualityScore !== undefined && (
          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', scoreColor)}>
            {qualityScore}
          </span>
        )}
      </div>
      <h3 className="mt-2 text-base font-semibold text-slate-100">{question}</h3>
      {resolution && (
        <p className="mt-1 text-sm text-slate-400 line-clamp-2">{resolution}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{madeBy}</span>
        <span className="text-slate-600">·</span>
        <span>{createdAt}</span>
        {tags.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-2xs">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
