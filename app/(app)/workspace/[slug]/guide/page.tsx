'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Network,
  GitBranch,
  CheckSquare,
  MessageCircle,
  Activity,
  Zap,
  FileText,
  Sparkles,
  Users,
  ArrowRight,
  ChevronRight,
  Check,
  Play,
  BookOpen,
  Rocket,
  Table,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useTranslations } from 'next-intl'
import { useUIStore } from '@/stores/ui.store'

interface GuideSection {
  id: string
  titleKey: string
  descriptionKey: string
  icon: React.ElementType
  color: string
  features: { titleKey: string; descriptionKey: string }[]
}

const guideSections: GuideSection[] = [
  {
    id: 'canvas',
    titleKey: 'sections.canvas.title',
    descriptionKey: 'sections.canvas.description',
    icon: Network,
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    features: [
      { titleKey: 'sections.canvas.features.dragDrop.title', descriptionKey: 'sections.canvas.features.dragDrop.description' },
      { titleKey: 'sections.canvas.features.connect.title', descriptionKey: 'sections.canvas.features.connect.description' },
      { titleKey: 'sections.canvas.features.zoom.title', descriptionKey: 'sections.canvas.features.zoom.description' },
    ],
  },
  {
    id: 'nodes',
    titleKey: 'sections.nodes.title',
    descriptionKey: 'sections.nodes.description',
    icon: CheckSquare,
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    features: [
      { titleKey: 'sections.nodes.features.task.title', descriptionKey: 'sections.nodes.features.task.description' },
      { titleKey: 'sections.nodes.features.doc.title', descriptionKey: 'sections.nodes.features.doc.description' },
      { titleKey: 'sections.nodes.features.decision.title', descriptionKey: 'sections.nodes.features.decision.description' },
      { titleKey: 'sections.nodes.features.thread.title', descriptionKey: 'sections.nodes.features.thread.description' },
      { titleKey: 'sections.nodes.features.table.title', descriptionKey: 'sections.nodes.features.table.description' },
    ],
  },
  {
    id: 'decisions',
    titleKey: 'sections.decisions.title',
    descriptionKey: 'sections.decisions.description',
    icon: GitBranch,
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    features: [
      { titleKey: 'sections.decisions.features.log.title', descriptionKey: 'sections.decisions.features.log.description' },
      { titleKey: 'sections.decisions.features.quality.title', descriptionKey: 'sections.decisions.features.quality.description' },
      { titleKey: 'sections.decisions.features.outcomes.title', descriptionKey: 'sections.decisions.features.outcomes.description' },
    ],
  },
  {
    id: 'lazymind',
    titleKey: 'sections.lazymind.title',
    descriptionKey: 'sections.lazymind.description',
    icon: Sparkles,
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    features: [
      { titleKey: 'sections.lazymind.features.analyze.title', descriptionKey: 'sections.lazymind.features.analyze.description' },
      { titleKey: 'sections.lazymind.features.suggest.title', descriptionKey: 'sections.lazymind.features.suggest.description' },
      { titleKey: 'sections.lazymind.features.digest.title', descriptionKey: 'sections.lazymind.features.digest.description' },
    ],
  },
  {
    id: 'collaboration',
    titleKey: 'sections.collaboration.title',
    descriptionKey: 'sections.collaboration.description',
    icon: Users,
    color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    features: [
      { titleKey: 'sections.collaboration.features.realtime.title', descriptionKey: 'sections.collaboration.features.realtime.description' },
      { titleKey: 'sections.collaboration.features.threads.title', descriptionKey: 'sections.collaboration.features.threads.description' },
      { titleKey: 'sections.collaboration.features.mentions.title', descriptionKey: 'sections.collaboration.features.mentions.description' },
    ],
  },
  {
    id: 'productivity',
    titleKey: 'sections.productivity.title',
    descriptionKey: 'sections.productivity.description',
    icon: Rocket,
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    features: [
      { titleKey: 'sections.productivity.features.command.title', descriptionKey: 'sections.productivity.features.command.description' },
      { titleKey: 'sections.productivity.features.shortcuts.title', descriptionKey: 'sections.productivity.features.shortcuts.description' },
      { titleKey: 'sections.productivity.features.automations.title', descriptionKey: 'sections.productivity.features.automations.description' },
    ],
  },
]

const nodeTypes = [
  { key: 'task', icon: CheckSquare, color: 'bg-blue-500', label: 'Task' },
  { key: 'doc', icon: FileText, color: 'bg-emerald-500', label: 'Doc' },
  { key: 'decision', icon: GitBranch, color: 'bg-orange-500', label: 'Decision' },
  { key: 'thread', icon: MessageCircle, color: 'bg-purple-500', label: 'Thread' },
  { key: 'pulse', icon: Activity, color: 'bg-cyan-500', label: 'Pulse' },
  { key: 'automation', icon: Zap, color: 'bg-amber-500', label: 'Automation' },
  { key: 'table', icon: Table, color: 'bg-teal-500', label: 'Table' },
]

export default function PlatformGuidePage() {
  const t = useTranslations('guide')
  const tn = useTranslations('nodeTypes')
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [expandedSection, setExpandedSection] = useState<string | null>('canvas')
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set())
  const setTourActive = useUIStore((s) => s.setTourActive)

  const markComplete = (id: string) => {
    setCompletedSections((prev) => new Set(prev).add(id))
  }

  const allComplete = completedSections.size === guideSections.length

  const startInteractiveTour = () => {
    setTourActive(true)
    router.push(`/workspace/${slug}`)
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <div className="border-b border-slate-800 bg-gradient-to-b from-brand/5 to-transparent px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/20">
            <BookOpen className="h-7 w-7 text-brand" />
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{t('title')}</h1>
          <p className="mt-3 text-base text-slate-400 sm:text-lg">{t('subtitle')}</p>

          {/* Node type badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {nodeTypes.map((nt) => (
              <span
                key={nt.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300"
              >
                <span className={cn('h-2 w-2 rounded-full', nt.color)} />
                {tn(nt.key)}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={startInteractiveTour}
              className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
            >
              <Play className="h-4 w-4" />
              {t('startTour')}
            </button>
            <Link
              href={`/workspace/${slug}`}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-750 transition-colors"
            >
              {t('skipToWorkspace')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <span className="text-xs font-medium text-slate-400">
            {t('progress', { completed: completedSections.size, total: guideSections.length })}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-800">
            <div
              className="h-1.5 rounded-full bg-brand transition-all duration-500"
              style={{ width: `${(completedSections.size / guideSections.length) * 100}%` }}
            />
          </div>
          {allComplete && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <Check className="h-3 w-3" />
              {t('allComplete')}
            </span>
          )}
        </div>
      </div>

      {/* Guide sections */}
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        {guideSections.map((section) => {
          const isExpanded = expandedSection === section.id
          const isComplete = completedSections.has(section.id)
          const Icon = section.icon

          return (
            <div
              key={section.id}
              className={cn(
                'rounded-2xl border transition-all duration-200',
                isComplete
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : isExpanded
                    ? 'border-slate-700 bg-slate-900'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              )}
            >
              {/* Section header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="flex w-full items-center gap-4 px-6 py-5 text-left"
                aria-expanded={isExpanded}
              >
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', section.color)}>
                  {isComplete ? <Check className="h-5 w-5 text-emerald-400" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-white">{t(section.titleKey)}</h2>
                  <p className="mt-0.5 text-sm text-slate-400 truncate">{t(section.descriptionKey)}</p>
                </div>
                <ChevronRight
                  className={cn(
                    'h-5 w-5 text-slate-500 transition-transform duration-200',
                    isExpanded && 'rotate-90'
                  )}
                />
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-slate-800 px-6 pb-6 pt-4 animate-fadeIn">
                  <div className="space-y-4">
                    {section.features.map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-4"
                      >
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/20 text-3xs font-bold text-brand">
                          {i + 1}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-200">{t(feature.titleKey)}</h3>
                          <p className="mt-1 text-sm text-slate-400 leading-relaxed">{t(feature.descriptionKey)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      markComplete(section.id)
                      // Auto-advance to next section
                      const currentIdx = guideSections.findIndex((s) => s.id === section.id)
                      const nextSection = guideSections[currentIdx + 1]
                      setExpandedSection(nextSection?.id ?? null)
                    }}
                    className={cn(
                      'mt-5 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                      isComplete
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-brand text-white hover:bg-brand-hover'
                    )}
                  >
                    {isComplete ? (
                      <>
                        <Check className="h-4 w-4" />
                        {t('sectionComplete')}
                      </>
                    ) : (
                      <>
                        {t('gotIt')}
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Completion CTA */}
        {allComplete && (
          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center animate-fadeIn">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <Rocket className="h-6 w-6 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">{t('completionTitle')}</h2>
            <p className="mt-2 text-sm text-slate-400">{t('completionDescription')}</p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={startInteractiveTour}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-750"
              >
                <Play className="h-4 w-4" />
                {t('takeInteractiveTour')}
              </button>
              <Link
                href={`/workspace/${slug}`}
                className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                {t('goToWorkspace')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
