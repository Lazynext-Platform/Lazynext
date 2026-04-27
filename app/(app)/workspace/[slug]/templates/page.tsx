'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Rocket,
  GitBranch,
  Sparkles,
  Target,
  Briefcase,
} from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace.store'

interface TemplateSummary {
  id: string
  name: string
  description: string
  category: string
  categoryLabel: string
  icon: string
  color: string
  nodeCount: number
  edgeCount: number
}

interface CategoryRef {
  id: string
  label: string
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  GitBranch,
  Sparkles,
  Target,
  Briefcase,
}

const COLOR_CLASSES: Record<string, string> = {
  blue: 'text-blue-400 bg-blue-500/10',
  purple: 'text-purple-400 bg-purple-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10',
  amber: 'text-amber-400 bg-amber-500/10',
  pink: 'text-pink-400 bg-pink-500/10',
  cyan: 'text-cyan-400 bg-cyan-500/10',
}

export default function TemplatesPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id ?? null)

  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [categories, setCategories] = useState<CategoryRef[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [justInstalled, setJustInstalled] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/templates', { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 503) {
          setError('Database is not configured. Templates still load — install needs Supabase.')
          return
        }
        if (!res.ok) {
          setError(`Failed to load templates (HTTP ${res.status}).`)
          return
        }
        const json = (await res.json()) as {
          data: { templates: TemplateSummary[]; categories: CategoryRef[] }
        }
        setTemplates(json.data.templates)
        setCategories(json.data.categories)
      })
      .catch(() => {
        if (!cancelled) setError('Network error loading templates.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return templates
    return templates.filter((t) => t.category === activeCategory)
  }, [templates, activeCategory])

  const onInstall = useCallback(
    async (t: TemplateSummary) => {
      if (!workspaceId) {
        setError('Workspace not loaded yet — please retry in a moment.')
        return
      }
      setInstallingId(t.id)
      setError(null)
      try {
        const res = await fetch('/api/v1/templates/install', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ templateId: t.id, workspaceId }),
        })
        if (!res.ok) {
          setError(`Install failed (HTTP ${res.status}).`)
          return
        }
        setJustInstalled(t.id)
        // Drop the user on the canvas of the new workflow.
        setTimeout(() => router.push(`/workspace/${slug}/canvas`), 700)
      } catch {
        setError('Network error during install.')
      } finally {
        setInstallingId(null)
      }
    },
    [workspaceId, router, slug],
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
        <FileText className="h-6 w-6 text-brand" />
        Template Marketplace
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Curated starter workflows — nodes + edges + status. Install one and the canvas opens with everything wired up.
      </p>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={
              activeCategory === 'all'
                ? 'rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground'
                : 'rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:border-slate-700'
            }
          >
            All ({templates.length})
          </button>
          {categories.map((c) => {
            const count = templates.filter((t) => t.category === c.id).length
            if (count === 0) return null
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={
                  activeCategory === c.id
                    ? 'rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground'
                    : 'rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:border-slate-700'
                }
              >
                {c.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="mt-10 flex items-center justify-center text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {filtered.map((t) => {
            const Icon = ICONS[t.icon] ?? FileText
            const colorClass = COLOR_CLASSES[t.color] ?? COLOR_CLASSES.blue
            const installed = justInstalled === t.id
            const installing = installingId === t.id
            return (
              <div
                key={t.id}
                className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-slate-100">{t.name}</h3>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-2xs text-slate-400">
                        {t.categoryLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{t.description}</p>
                    <p className="mt-2 text-2xs text-slate-600">
                      {t.nodeCount} nodes · {t.edgeCount} connections
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onInstall(t)}
                  disabled={installing || installed || !workspaceId}
                  className={
                    installed
                      ? 'mt-4 flex items-center justify-center gap-2 rounded-md bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300'
                      : 'mt-4 flex items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50'
                  }
                >
                  {installing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Installing…
                    </>
                  ) : installed ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Installed — opening canvas
                    </>
                  ) : (
                    'Install template'
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-10 text-2xs text-slate-600">
        Templates ship with the deploy. Custom workspace-private templates and an &ldquo;Export as template&rdquo; flow are still in the backlog.
      </p>
    </div>
  )
}
