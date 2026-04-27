'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Copy, RefreshCcw, Check, X } from 'lucide-react'

interface ShareState {
  enabled: boolean
  shareToken: string | null
  sharedAt: string | null
}

interface ShareWorkflowDialogProps {
  workflowId: string
  workflowName: string
  onClose: () => void
}

/**
 * Generic workflow-share dialog. Render anywhere a real workflowId is
 * known. Drives `GET/PATCH /api/v1/workflows/[id]/share`.
 *
 * The toolbar surface for triggering this dialog is not yet wired —
 * the canvas store doesn't track a current workflow id (see
 * stores/canvas.store.ts). Once that hydration lands, drop this dialog
 * behind a toolbar Share button.
 */
export function ShareWorkflowDialog({ workflowId, workflowName, onClose }: ShareWorkflowDialogProps) {
  const [state, setState] = useState<ShareState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/v1/workflows/${workflowId}/share`, { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setError(`Failed to load (HTTP ${res.status}).`)
          return
        }
        const json = (await res.json()) as { data: ShareState }
        setState(json.data)
      })
      .catch(() => {
        if (!cancelled) setError('Network error.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [workflowId])

  const patch = useCallback(
    async (body: { enabled?: boolean; regenerate?: boolean }) => {
      setBusy(true)
      setError(null)
      try {
        const res = await fetch(`/api/v1/workflows/${workflowId}/share`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          setError(`Save failed (HTTP ${res.status}).`)
          return
        }
        const json = (await res.json()) as { data: ShareState }
        setState(json.data)
      } finally {
        setBusy(false)
      }
    },
    [workflowId],
  )

  const url =
    state?.shareToken && typeof window !== 'undefined'
      ? `${window.location.origin}/shared/${state.shareToken}`
      : null

  const onCopy = useCallback(async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }, [url])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Share canvas</h2>
            <p className="mt-1 text-xs text-slate-500 truncate">{workflowName}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center justify-center text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !state ? (
          <p className="mt-6 text-sm text-amber-300">{error ?? 'Unable to load share state.'}</p>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <input
                type="checkbox"
                checked={state.enabled}
                disabled={busy}
                onChange={(e) => void patch({ enabled: e.target.checked })}
                className="mt-1 h-4 w-4"
              />
              <div className="text-sm">
                <p className="font-medium text-slate-100">Public read-only link</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Anyone with the URL can view the canvas. They cannot edit, comment, or see member identities.
                </p>
              </div>
            </label>

            {state.enabled && url && (
              <div>
                <label className="text-xs font-medium text-slate-300">Public URL</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    readOnly
                    value={url}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-2xs text-slate-200"
                  />
                  <button
                    onClick={onCopy}
                    disabled={busy}
                    className="flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={() => void patch({ enabled: true, regenerate: true })}
                  disabled={busy}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Regenerate link (invalidates the current one)
                </button>
              </div>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
