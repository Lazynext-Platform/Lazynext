'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronDown, Plus, Check, Loader2 } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { cn } from '@/lib/utils/cn'

interface Workflow {
  id: string
  name: string
  description: string | null
}

/**
 * Picker dropdown anchored at the top-left of the canvas. Lists every
 * workflow in the current workspace and switches the URL to the chosen
 * one. Switching the URL re-runs `useCanvasHydration` against the new
 * `workflowId`, which clears + reloads the canvas with that workflow's
 * nodes and edges.
 *
 * The "+ New workflow" action POSTs to `/api/v1/workflows`, then routes
 * to the new workflow's URL — so the canvas immediately becomes the
 * blank slate of the just-created workflow without a refresh.
 */
export function WorkflowPicker() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id ?? null)
  const currentWorkflowId = useCanvasStore((s) => s.currentWorkflowId)
  const currentWorkflowName = useCanvasStore((s) => s.currentWorkflowName)

  const [isOpen, setIsOpen] = useState(false)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lazy-load the workflow list the first time the picker is opened
  // (saves a request on every canvas mount for users who never switch).
  useEffect(() => {
    if (!isOpen || !workspaceId) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/v1/workflows?workspaceId=${workspaceId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => {
        if (cancelled) return
        setWorkflows((j.data ?? []) as Workflow[])
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, workspaceId])

  // Click-outside / Escape to close.
  useEffect(() => {
    if (!isOpen) return
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  function selectWorkflow(id: string) {
    setIsOpen(false)
    if (!slug || id === currentWorkflowId) return
    router.push(`/workspace/${slug}/canvas/${id}`)
  }

  async function createWorkflow() {
    if (!workspaceId || creating) return
    const name = window.prompt('Workflow name')?.trim()
    if (!name) return
    setCreating(true)
    try {
      const res = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, workspaceId }),
      })
      if (!res.ok) return
      const json = (await res.json()) as { data: Workflow }
      setIsOpen(false)
      if (slug) router.push(`/workspace/${slug}/canvas/${json.data.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={containerRef} className="absolute left-4 top-4 z-10">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          'flex max-w-[280px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-sm text-slate-200 shadow-lg backdrop-blur transition-all hover:border-slate-600 hover:bg-slate-800',
          isOpen && 'border-slate-600 bg-slate-800',
        )}
      >
        <span className="truncate font-medium">
          {currentWorkflowName ?? 'Loading…'}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className="mt-2 w-72 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl motion-safe:animate-slide-in-up">
          <div className="max-h-72 overflow-y-auto py-1">
            {loading && (
              <div className="flex items-center justify-center py-4 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!loading && workflows.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-500">
                No workflows yet.
              </div>
            )}
            {!loading &&
              workflows.map((w) => {
                const active = w.id === currentWorkflowId
                return (
                  <button
                    key={w.id}
                    onClick={() => selectWorkflow(w.id)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800',
                      active && 'bg-slate-800/60 text-slate-100',
                    )}
                  >
                    <span className="flex-1 truncate">{w.name}</span>
                    {active && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
                    )}
                  </button>
                )
              })}
          </div>
          <div className="border-t border-slate-800">
            <button
              onClick={createWorkflow}
              disabled={creating}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-brand hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>New workflow</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
