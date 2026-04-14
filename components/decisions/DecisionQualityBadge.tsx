'use client'

import { cn } from '@/lib/utils/cn'

interface DecisionQualityBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export function DecisionQualityBadge({ score, size = 'sm' }: DecisionQualityBadgeProps) {
  const color =
    score >= 70 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
    score >= 40 ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
    'text-red-400 bg-red-400/10 border-red-400/20'

  const label =
    score >= 70 ? 'High' :
    score >= 40 ? 'Medium' :
    'Low'

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full border font-semibold', color, sizeStyles[size])}
      aria-label={`Quality score: ${score} out of 100, ${label}`}
    >
      {score}
      {size !== 'sm' && <span className="font-normal opacity-70">({label})</span>}
    </span>
  )
}
