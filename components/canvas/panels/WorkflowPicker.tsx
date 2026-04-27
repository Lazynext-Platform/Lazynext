'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronDown, Plus, Check, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { cn } from '@/lib/utils/cn'
import { WorkflowFormModal } from './WorkflowFormModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface Workflow {
  id: string
  name: string
  description: string | null
}

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'rename'; id: string; name: string }
  | { kind: 'delete'; workflow: Workflow }

/**
 * Picker dropdown anchored at the top-left of the canvas. Lists every
 * workflow in the current workspace and switches the URL to the chosen
 * one. Switching the URL re-runs `useCanvasHydration` against the new
 * `workflowId`, which clears + reloads the canvas with that workflow's
 * nodes and edges.
 *
 * Each row exposes hover-revealed rename + delete actions. The "+ New
 * workflow" button POSTs to `/api/v1/workflows`, then routes to the new
 * workflow's URL — so the canvas immediately becomes the blank slate
 * of the just-created workflow without a refresh.
 *
 * Deleting the currently active workflow routes back to `default`,
 * which causes the canvas to fall back to the workspace's first
 * surviving workflow (or auto-create one if you nuked the last one).
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
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' })
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

  async function submitCreate(name: string) {
    if (!workspaceId) return
    const res = await fetch('/api/v1/workflows', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, workspaceId }),
    })
    if (!res.ok) return
    const json = (await res.json()) as { data: Workflow }
    setModal({ kind: 'closed' })
    setIsOpen(false)
    if (slug) router.push(`/workspace/${slug}/canvas/${json.data.id}`)
  }

  async function submitRename(id: string, name: string) {
    const res = await fetch(`/api/v1/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return
    setModal({ kind: 'closed' })
    setWorkflows((ws) => ws.map((w) => (w.id === id ? { ...w, name } : w)))
    // If we just renamed the active workflow, update the store name too
    // so the picker label reflects the new name without a reload.
    if (id === currentWorkflowId) {
      useCanvasStore.setState({ currentWorkflowName: name })
    }
  }

  async function deleteWorkflow(w: Workflow) {
    const res = await fetch(`/api/v1/workflows/${w.id}`, { method: 'DELETE' })
    if (!res.ok) return
    setModal({ kind: 'closed' })
    setWorkflows((ws) => ws.filter((x) => x.id !== w.id))
    if (w.id === currentWorkflowId && slug) {
      // Falls back to the workspace's first surviving workflow (or
      // auto-creates a new default if you nuked the last one).
      router.push(`/workspace/${slug}/canvas/default`)
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
        <div className="mt-2 w-80 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl motion-safe:animate-slide-in-up">
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
                  <div
                    key={w.id}
                    className={cn(
                      'group flex items-center gap-1 px-1 py-0.5',
                      active && 'bg-slate-800/60',
                    )}
                  >
                    <button
                      onClick={() => selectWorkflow(w.id)}
                      className={cn(
                        'flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-800',
                        active && 'text-slate-100',
                      )}
                    >
                      <span className="flex-1 truncate">{w.name}</span>
                      {active && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
                      )}
                    </button>
                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        onClick={() => setModal({ kind: 'rename', id: w.id, name: w.name })}
                        aria-label={`Rename ${w.name}`}
                        title="Rename"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setModal({ kind: 'delete', workflow: w })}
                        aria-label={`Delete ${w.name}`}
                        title="Delete"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
          <div className="border-t border-slate-800">
            <button
              onClick={() => setModal({ kind: 'create' })}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-brand hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              <span>New workflow</span>
            </button>
          </div>
        </div>
      )}

      {modal.kind === 'create' && (
        <WorkflowFormModal
          mode="create"
          onClose={() => setModal({ kind: 'closed' })}
          onSubmit={submitCreate}
        />
      )}
      {modal.kind === 'rename' && (
        <WorkflowFormModal
          mode="rename"
          initialName={modal.name}
          onClose={() => setModal({ kind: 'closed' })}
          onSubmit={(name) => submitRename(modal.id, name)}
        />
      )}
      {modal.kind === 'delete' && (
        <ConfirmModal
          title={`Delete "${modal.workflow.name}"?`}
          description="Its nodes and edges will be removed. This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onCancel={() => setModal({ kind: 'closed' })}
          onConfirm={() => deleteWorkflow(modal.workflow)}
        />
      )}
    </div>
  )
}
