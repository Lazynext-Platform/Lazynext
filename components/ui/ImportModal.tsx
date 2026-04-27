'use client'

import { useEffect, useState } from 'react'
import { X, Sparkles, Mail, Upload, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { useModalA11y } from '@/lib/utils/useModalA11y'
import { useWorkspaceStore } from '@/stores/workspace.store'

// Per-source icon + description. Order matches the visual grid.
// Provider id (when present) maps to `lib/oauth/registry.ts`'s
// `OAuthProviderId` so tiles can hot-swap between disabled, configured,
// and connected states once an adapter ships. The notion-zip row has
// no provider id because it's a file upload, not OAuth.
const oauthSources: Array<{ id: string; providerId?: string; name: string; desc: string; icon: string }> = [
  { id: 'notion-api', providerId: 'notion', name: 'Notion', desc: 'Pages & databases via OAuth', icon: '📝' },
  { id: 'notion-zip', name: 'Notion Export', desc: 'ZIP archive upload', icon: '📦' },
  { id: 'linear', providerId: 'linear', name: 'Linear', desc: 'Issues & projects', icon: '⚡' },
  { id: 'trello', providerId: 'trello', name: 'Trello', desc: 'Boards & cards', icon: '📋' },
  { id: 'asana', providerId: 'asana', name: 'Asana', desc: 'Tasks & projects', icon: '🎯' },
]

type NodeType = 'task' | 'doc' | 'decision' | 'thread' | 'pulse' | 'automation' | 'table'
const VALID_NODE_TYPES: NodeType[] = ['task', 'doc', 'decision', 'thread', 'pulse', 'automation', 'table']

type ImportStatus = 'idle' | 'parsing' | 'uploading' | 'success' | 'error'

/**
 * CSV import is real: it parses the file in the browser, posts the rows
 * to `/api/v1/import` with `source: 'csv'`, and the API actually creates
 * `nodes` rows in the workspace. The OAuth-based connectors (Notion API,
 * Linear, Trello, Asana, Notion ZIP) are still a roadmap item — the API
 * accepts those source values and queues a fake job ID without doing any
 * background work, so we don't expose those buttons. When the OAuth +
 * ingestion pipeline ships, the disabled tiles below get wired up.
 */

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  // Minimal RFC 4180-ish parser. Handles quoted fields with embedded commas
  // and double-quote escapes. Good enough for typical Notion/Linear exports.
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') { inQuotes = false }
      else { field += c }
    } else {
      if (c === '"') { inQuotes = true }
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else { field += c }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  const headers = (rows.shift() ?? []).map(h => h.trim())
  return { headers, rows: rows.filter(r => r.some(cell => cell.trim().length > 0)) }
}

function rowsToImportItems(headers: string[], rows: string[][]) {
  const lower = headers.map(h => h.toLowerCase())
  const titleIdx = (() => {
    const candidates = ['title', 'name', 'task', 'subject']
    for (const c of candidates) {
      const idx = lower.indexOf(c)
      if (idx !== -1) return idx
    }
    return 0
  })()
  const typeIdx = lower.indexOf('type')
  const statusIdx = lower.indexOf('status')

  return rows
    .map((row) => {
      const title = (row[titleIdx] ?? '').trim()
      if (!title) return null
      const rawType = typeIdx !== -1 ? (row[typeIdx] ?? '').trim().toLowerCase() : 'task'
      const type: NodeType = (VALID_NODE_TYPES as readonly string[]).includes(rawType)
        ? (rawType as NodeType)
        : 'task'
      const data: Record<string, unknown> = {}
      headers.forEach((h, i) => {
        if (i === titleIdx || i === typeIdx) return
        const v = (row[i] ?? '').trim()
        if (v) data[h] = v
      })
      return {
        title,
        type,
        status: statusIdx !== -1 ? (row[statusIdx] ?? '').trim() || undefined : undefined,
        data: Object.keys(data).length > 0 ? data : undefined,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
}

export function ImportModal({ onClose }: { onClose: () => void }) {
  const modalRef = useModalA11y()
  const workspace = useWorkspaceStore(s => s.workspace)
  const workspaceId = workspace?.id ?? null

  const [status, setStatus] = useState<ImportStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState<number>(0)

  // Provider-configured map from the OAuth registry. Lazily loaded once
  // when the modal opens — keeps the modal cheap to render and means
  // dev-without-Supabase still sees honest tile state (the API returns
  // env-driven config even when the DB is unconfigured).
  const [providerConfig, setProviderConfig] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    fetch(`/api/v1/oauth/connections?workspaceId=${workspaceId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body?.data?.providers) return
        const map: Record<string, boolean> = {}
        for (const p of body.data.providers as Array<{ id: string; configured: boolean }>) {
          map[p.id] = p.configured
        }
        setProviderConfig(map)
      })
      .catch(() => {
        // Network errors are non-fatal: tiles fall back to the
        // disabled state, which matches reality (the connector is
        // not available right now).
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  async function handleCsvFile(file: File) {
    if (!workspaceId) {
      setError('Workspace not loaded yet — refresh and try again.')
      setStatus('error')
      return
    }
    setError(null)
    setStatus('parsing')
    try {
      const text = await file.text()
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0 || rows.length === 0) {
        throw new Error('CSV looks empty. Need at least a header row and one data row.')
      }
      const items = rowsToImportItems(headers, rows)
      if (items.length === 0) {
        throw new Error('No rows had a usable title column. Add a "title" or "name" column and retry.')
      }
      setStatus('uploading')
      const res = await fetch('/api/v1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'csv', workspaceId, data: items }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message || body?.error || `Import failed (${res.status}).`)
      }
      const body = await res.json().catch(() => ({}))
      setImportedCount(body?.data?.imported ?? items.length)
      setStatus('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        ref={modalRef}
        className="mx-3 w-full max-w-2xl animate-in rounded-xl border border-slate-700 bg-slate-900 shadow-2xl duration-200 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 id="import-modal-title" className="text-lg font-semibold text-slate-100">
            Import Data
          </h2>
          <button
            onClick={onClose}
            aria-label="Close import dialog"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-6">
          {status === 'success' ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-100">
                Imported {importedCount} {importedCount === 1 ? 'node' : 'nodes'}
              </h3>
              <p className="mt-1 text-xs text-slate-500">A new workflow was created with your CSV rows.</p>
              <button
                onClick={onClose}
                className="mt-4 rounded-lg bg-brand px-6 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
              >
                Open workspace
              </button>
            </div>
          ) : (
            <>
              {/* Active: CSV upload */}
              <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                    <Upload className="h-4 w-4 text-brand" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-brand">CSV upload — live</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Each row becomes a node. Use a <code className="rounded bg-slate-800 px-1 font-mono">title</code>
                      {' '}or <code className="rounded bg-slate-800 px-1 font-mono">name</code> column for the node label,
                      and an optional <code className="rounded bg-slate-800 px-1 font-mono">type</code> column
                      (<code className="rounded bg-slate-800 px-1 font-mono">task</code>,
                      {' '}<code className="rounded bg-slate-800 px-1 font-mono">doc</code>,
                      {' '}<code className="rounded bg-slate-800 px-1 font-mono">decision</code>, …) to set the node type.
                    </p>
                    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover">
                      <Upload className="h-4 w-4" />
                      {status === 'parsing' ? 'Parsing…' : status === 'uploading' ? 'Uploading…' : 'Choose CSV file'}
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        disabled={status === 'parsing' || status === 'uploading' || !workspaceId}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleCsvFile(f)
                        }}
                      />
                    </label>
                    {!workspaceId && (
                      <p className="mt-2 text-2xs text-slate-500">Loading workspace…</p>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Roadmap: OAuth connectors. Each tile reflects the real
                  registry state — configured providers show a green
                  Available badge with a working Connect link; the rest
                  stay disabled with copy that names the env vars. The
                  notion-zip row has no provider id (file upload, not
                  OAuth) and stays in the historical "Soon" state. */}
              <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-400">OAuth connectors</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Each tile becomes a working <strong>Connect</strong> button once that provider&apos;s
                      OAuth credentials are configured on this deployment. Until then, tiles stay disabled.
                      Email <a href="mailto:hello@lazynext.com" className="underline hover:text-amber-300">hello@lazynext.com</a> to vote on priority.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {oauthSources.map((src) => {
                  const isConfigured = src.providerId ? providerConfig[src.providerId] === true : false
                  return (
                    <div
                      key={src.id}
                      className={`flex items-start gap-3 rounded-xl border bg-slate-800/50 p-4 ${
                        isConfigured ? 'border-emerald-500/30' : 'border-slate-800 opacity-70'
                      }`}
                    >
                      <span className="text-2xl">{src.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-200">{src.name}</p>
                          {isConfigured ? (
                            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-3xs font-medium text-emerald-400">
                              Available
                            </span>
                          ) : (
                            <span
                              className="rounded-full bg-slate-700 px-1.5 py-0.5 text-3xs font-medium text-slate-400"
                              title={
                                src.providerId
                                  ? `Set LAZYNEXT_OAUTH_${src.providerId.toUpperCase()}_CLIENT_ID and LAZYNEXT_OAUTH_${src.providerId.toUpperCase()}_CLIENT_SECRET to enable.`
                                  : 'ZIP-archive ingestion ships separately.'
                              }
                            >
                              {src.providerId ? 'Not configured' : 'Soon'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{src.desc}</p>
                        {isConfigured && src.providerId && workspaceId && (
                          <a
                            href={`/api/v1/oauth/${src.providerId}/start?workspaceId=${workspaceId}`}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                          >
                            Connect <ArrowRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <a
                href="mailto:hello@lazynext.com?subject=Import%20connector%20priority"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                <Mail className="h-4 w-4" /> Vote on which connector ships next
              </a>
            </>
          )}
        </div>

        <div className="border-t border-slate-800 px-6 py-3">
          <p className="text-2xs text-slate-500">
            CSV rows are parsed in your browser and sent over HTTPS. Data is encrypted in transit and at rest.
          </p>
        </div>
      </div>
    </div>
  )
}
