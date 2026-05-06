'use client'

import { useState, useCallback, useMemo } from 'react'
import { Sparkles, X, Wand2, RefreshCw, Check, AlertTriangle } from 'lucide-react'
import { commitGeneratedWorkflow } from '@/lib/canvas/apply-generated-workflow'
import { layoutTopDown } from '@/lib/canvas/auto-layout'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'
import { trackBillingEvent } from '@/lib/utils/telemetry'
import { cn } from '@/lib/utils/cn'
import type { GeneratedWorkflow } from '@/lib/ai/workflow-generator'
import { NODE_TYPES } from '@/lib/utils/constants'

interface Props {
  isOpen: boolean
  onClose: () => void
  workspaceId: string | undefined
  /** Notify caller (LazyMindPanel) when a generation succeeds so the
   *  daily-quota badge can re-fetch. */
  onGenerated?: () => void
}

const PROMPT_MAX = 2000

type ApiResponse =
  | { data: GeneratedWorkflow; error: null }
  | {
      error: string
      message?: string
      variant?: string
      used?: number
    }

/**
 * Workflow generator modal. Three states:
 *   1. INPUT  — textarea + Generate button
 *   2. PREVIEW — scrollable list of generated nodes/edges + Accept/Refine/Discard
 *   3. ERROR — inline error banner above the textarea, retry from there
 *
 * The preview is a flat list (not a mini-canvas) — fast to render, easy
 * to scan, and avoids pulling ReactFlow into a modal context. A future
 * iteration can swap in a read-only ReactFlow miniature.
 */
export function WorkflowGeneratorModal({ isOpen, onClose, workspaceId, onGenerated }: Props) {
  const [prompt, setPrompt] = useState('')
  const [graph, setGraph] = useState<GeneratedWorkflow | null>(null)
  const [loading, setLoading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refineCount, setRefineCount] = useState(0)

  const reset = useCallback(() => {
    setPrompt('')
    setGraph(null)
    setError(null)
    setRefineCount(0)
  }, [])

  const handleClose = useCallback(() => {
    if (loading || committing) return
    reset()
    onClose()
  }, [loading, committing, onClose, reset])

  const generate = useCallback(async () => {
    const trimmed = prompt.trim()
    if (!trimmed || !workspaceId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/ai/workflow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, workspaceId }),
      })
      const json = (await res.json().catch(() => ({}))) as ApiResponse

      if (res.status === 402 && 'error' in json && json.error === 'PLAN_LIMIT_REACHED') {
        trackBillingEvent('paywall.gate.shown', {
          variant: 'ai-limit',
          surface: 'workflow-generator',
        })
        useUpgradeModal.getState().show('ai-limit')
        setError(json.message ?? 'Daily LazyMind quota exceeded.')
        return
      }
      if (!res.ok || !('data' in json)) {
        const msg =
          'message' in json && json.message
            ? json.message
            : 'error' in json && json.error
              ? json.error
              : `HTTP ${res.status}`
        setError(msg)
        return
      }
      setGraph(json.data)
      onGenerated?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [prompt, workspaceId, onGenerated])

  const refine = useCallback(() => {
    if (!graph) return
    // Pre-fill the prompt with the previous text + node titles so the
    // user can ask for adjustments without retyping context.
    const titles = graph.nodes.map((n) => `- ${n.title}`).join('\n')
    setPrompt(
      `${prompt.trim()}\n\nPrevious graph:\n${titles}\n\nRefine: `,
    )
    // Best-effort client audit (#48). Fire-and-forget — never blocks
    // the UI, and the server allowlist rejects anything else.
    if (workspaceId) {
      void fetch('/api/v1/audit-log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          workspaceId,
          action: 'ai.workflow.refined',
          metadata: {
            prompt: prompt.trim().slice(0, 500),
            nodeCount: graph.nodes.length,
            edgeCount: graph.edges.length,
            refineCount: refineCount + 1,
          },
        }),
      }).catch(() => undefined)
    }
    setGraph(null)
    setRefineCount((c) => c + 1)
  }, [graph, prompt, workspaceId, refineCount])

  const accept = useCallback(async () => {
    if (!graph) return
    setCommitting(true)
    try {
      // Best effort viewport center: middle of typical 1280×720 canvas.
      // (A future PR can read the live ReactFlow viewport via `useReactFlow`.)
      const center = { x: 600, y: 300 }
      await commitGeneratedWorkflow(graph, center)
      // Best-effort client audit (#48). The server already logs
      // `ai.workflow.generated` in /api/v1/ai/workflow; this closes
      // the funnel so compliance can see which generations were
      // actually committed to the canvas.
      if (workspaceId) {
        void fetch('/api/v1/audit-log', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            workspaceId,
            action: 'ai.workflow.accepted',
            metadata: {
              prompt: prompt.trim().slice(0, 500),
              nodeCount: graph.nodes.length,
              edgeCount: graph.edges.length,
              refineCount,
            },
          }),
        }).catch(() => undefined)
      }
      reset()
      onClose()
    } finally {
      setCommitting(false)
    }
  }, [graph, onClose, reset, workspaceId, prompt, refineCount])

  // Pre-compute a layered view so the preview lays out the same way the
  // commit will land on the canvas. Pure: no DOM, no state.
  const layered = useMemo(() => {
    if (!graph) return null
    const { positions } = layoutTopDown(
      graph.nodes.map((n) => ({ tempId: n.tempId })),
      graph.edges.map((e) => ({ source: e.source, target: e.target })),
    )
    const byLayer = new Map<number, typeof graph.nodes>()
    graph.nodes.forEach((n) => {
      const y = positions.get(n.tempId)?.y ?? 0
      const layer = Math.round(y / 140)
      if (!byLayer.has(layer)) byLayer.set(layer, [])
      byLayer.get(layer)!.push(n)
    })
    return Array.from(byLayer.entries()).sort(([a], [b]) => a - b)
  }, [graph])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm motion-safe:animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workflow-gen-title"
    >
      <div className="m-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
            <Wand2 className="h-4 w-4 text-brand-foreground" />
          </div>
          <div className="flex-1">
            <h2 id="workflow-gen-title" className="text-base font-semibold text-slate-100">
              Generate a workflow
            </h2>
            <p className="text-xs text-slate-500">
              Describe what you want; LazyMind drafts a graph for review.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading || committing}
            aria-label="Close"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
          {/* Error banner */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Input or Preview */}
          {!graph ? (
            <div>
              <label
                htmlFor="workflow-prompt"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                What workflow should we draft?
              </label>
              <textarea
                id="workflow-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_MAX))}
                rows={5}
                disabled={loading}
                placeholder="Plan our Q3 launch: design review, security audit, marketing kickoff, then ship."
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Up to 12 nodes &amp; 20 connections.
                </span>
                <span className="text-xs text-slate-500">
                  {prompt.length} / {PROMPT_MAX}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 text-brand" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-slate-200">
                      {graph.nodes.length} node{graph.nodes.length === 1 ? '' : 's'} &amp;{' '}
                      {graph.edges.length} connection
                      {graph.edges.length === 1 ? '' : 's'}
                    </p>
                    {graph.rationale && (
                      <p className="mt-0.5 text-xs text-slate-400">{graph.rationale}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Layered list */}
              <ol className="space-y-3">
                {(layered ?? []).map(([layer, nodes]) => (
                  <li key={layer}>
                    <p className="mb-1 text-2xs font-medium uppercase tracking-wider text-slate-500">
                      Layer {layer + 1}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {nodes.map((n) => {
                        const meta = NODE_TYPES[n.type]
                        return (
                          <div
                            key={n.tempId}
                            className={cn(
                              'rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm',
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.5 text-2xs font-medium',
                                  `bg-${meta.color}-500/15 text-${meta.color}-300`,
                                )}
                              >
                                {meta.label}
                              </span>
                              <span className="truncate font-medium text-slate-200">
                                {n.title}
                              </span>
                            </div>
                            {n.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                                {n.description}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-5 py-3">
          {!graph ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="rounded-md px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={loading || !prompt.trim() || !workspaceId}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-40"
              >
                {loading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                {loading ? 'Generating…' : 'Generate'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={reset}
                disabled={committing}
                className="rounded-md px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-40"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={refine}
                disabled={committing}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refine
              </button>
              <button
                type="button"
                onClick={accept}
                disabled={committing}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-40"
              >
                {committing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {committing ? 'Adding…' : 'Add to canvas'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
