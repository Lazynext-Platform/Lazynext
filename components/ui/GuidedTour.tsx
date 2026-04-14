'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles, SkipForward } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useModalA11y } from '@/lib/utils/useModalA11y'

export interface TourStep {
  /** CSS selector for the element to highlight. null = centered modal (intro/outro). */
  target: string | null
  titleKey: string
  descriptionKey: string
  /** Which side of the target to show the tooltip */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

interface GuidedTourProps {
  steps: TourStep[]
  onComplete: () => void
  onSkip: () => void
}

function getTooltipPosition(
  rect: DOMRect,
  placement: 'top' | 'bottom' | 'left' | 'right',
  tooltipWidth: number,
  tooltipHeight: number
) {
  const gap = 16
  let top: number
  let left: number

  switch (placement) {
    case 'top':
      top = rect.top - tooltipHeight - gap
      left = rect.left + rect.width / 2 - tooltipWidth / 2
      break
    case 'bottom':
      top = rect.bottom + gap
      left = rect.left + rect.width / 2 - tooltipWidth / 2
      break
    case 'left':
      top = rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.left - tooltipWidth - gap
      break
    case 'right':
      top = rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.right + gap
      break
  }

  // Clamp within viewport
  top = Math.max(12, Math.min(top, window.innerHeight - tooltipHeight - 12))
  left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12))

  return { top, left }
}

export function GuidedTour({ steps, onComplete, onSkip }: GuidedTourProps) {
  const t = useTranslations('tour')
  const [current, setCurrent] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tourRef = useModalA11y()
  const step = steps[current]
  const isFirst = current === 0
  const isLast = current === steps.length - 1

  const updateTargetRect = useCallback(() => {
    if (!step.target) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(step.target)
    if (el) {
      setTargetRect(el.getBoundingClientRect())
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } else {
      setTargetRect(null)
    }
  }, [step.target])

  useEffect(() => {
    updateTargetRect()
    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect, true)
    return () => {
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    }
  }, [updateTargetRect])

  const next = () => {
    if (isLast) {
      onComplete()
    } else {
      setCurrent((c) => c + 1)
    }
  }

  const prev = () => {
    if (!isFirst) setCurrent((c) => c - 1)
  }

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onSkip()
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const tooltipWidth = 380
  const tooltipHeight = 200

  // Calculate spotlight cutout + tooltip position
  const spotlight = targetRect
    ? {
        top: targetRect.top - 8,
        left: targetRect.left - 8,
        width: targetRect.width + 16,
        height: targetRect.height + 16,
        borderRadius: 12,
      }
    : null

  const tooltipPos = targetRect
    ? getTooltipPosition(targetRect, step.placement || 'bottom', tooltipWidth, tooltipHeight)
    : { top: window.innerHeight / 2 - tooltipHeight / 2, left: window.innerWidth / 2 - tooltipWidth / 2 }

  return (
    <div ref={tourRef} className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={t('tourLabel')}>
      {/* Overlay with spotlight cutout */}
      <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.left}
                y={spotlight.top}
                width={spotlight.width}
                height={spotlight.height}
                rx={spotlight.borderRadius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.75)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Clickable overlay to capture background clicks */}
      <div className="absolute inset-0" onClick={onSkip} />

      {/* Spotlight ring */}
      {spotlight && (
        <div
          className="absolute rounded-xl border-2 border-brand shadow-lg shadow-brand/20 motion-safe:animate-pulse pointer-events-none"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        onClick={(e) => e.stopPropagation()}
        className="absolute z-[101] animate-fadeIn"
        style={{ top: tooltipPos.top, left: tooltipPos.left, width: tooltipWidth }}
      >
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20">
                <Sparkles className="h-4 w-4 text-brand" />
              </div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-brand">
                {t('stepOf', { current: current + 1, total: steps.length })}
              </span>
            </div>
            <button
              onClick={onSkip}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              aria-label={t('skipTour')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <h3 className="mt-3 text-lg font-bold text-white">{t(step.titleKey)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{t(step.descriptionKey)}</p>

          {/* Progress bar */}
          <div className="mt-4 h-1 rounded-full bg-slate-800">
            <div
              className="h-1 rounded-full bg-brand transition-all duration-300"
              style={{ width: `${((current + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={onSkip}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
            >
              <SkipForward className="h-3 w-3" />
              {t('skipTour')}
            </button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  <ChevronLeft className="h-3 w-3" />
                  {t('previous')}
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1 rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
              >
                {isLast ? t('finishTour') : t('next')}
                {!isLast && <ChevronRight className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
