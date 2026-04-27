'use client'

import { useState } from 'react'
import { Shield, Database, Check, ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { decisionsToCsv } from '@/lib/utils/decisions-csv'
import type { Decision } from '@/lib/db/schema'

type ExportStatus = 'idle' | 'exporting' | 'ready' | 'error'
type DecisionFormat = 'json' | 'csv'

const exportIncludes = [
  'All workflows', 'All nodes', 'All edges', 'All decisions (with scores & outcomes)',
  'Workspace ID', 'Export timestamp', 'Schema version',
]

// No exports table exists in the schema yet. History stays empty
// until completed exports are persisted server-side.
const exportHistory: { name: string; format: string; date: string; size: string }[] = []

type ExportPayload = {
  version: string
  exportedAt: string
  workspaceId: string
  workflows: unknown[]
  nodes: unknown[]
  edges: unknown[]
  decisions: Array<{ created_at?: string; [k: string]: unknown }>
}

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function DataExportPage() {
  const params = useParams()
  const slug = params.slug as string
  const workspace = useWorkspaceStore(s => s.workspace)
  const workspaceId = workspace?.id ?? null

  const [fullExportStatus, setFullExportStatus] = useState<ExportStatus>('idle')
  const [fullExportError, setFullExportError] = useState<string | null>(null)
  const [fullExportFilename, setFullExportFilename] = useState<string | null>(null)
  const [decisionStatus, setDecisionStatus] = useState<ExportStatus>('idle')
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const [dateRange, setDateRange] = useState('all')
  const [decisionFormat, setDecisionFormat] = useState<DecisionFormat>('json')

  async function fetchExport(): Promise<ExportPayload> {
    if (!workspaceId) throw new Error('Workspace not loaded yet — refresh the page.')
    const res = await fetch(`/api/v1/export?workspaceId=${encodeURIComponent(workspaceId)}`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.message || body?.error || `Export failed (${res.status}).`)
    }
    return res.json()
  }

  const handleFullExport = async () => {
    setFullExportStatus('exporting')
    setFullExportError(null)
    try {
      const payload = await fetchExport()
      const filename = `lazynext-export-${new Date().toISOString().slice(0, 10)}.json`
      triggerDownload(filename, JSON.stringify(payload, null, 2), 'application/json')
      setFullExportFilename(filename)
      setFullExportStatus('ready')
    } catch (e) {
      setFullExportError(e instanceof Error ? e.message : 'Unknown error')
      setFullExportStatus('error')
    }
  }

  const handleDecisionExport = async () => {
    setDecisionStatus('exporting')
    setDecisionError(null)
    try {
      const payload = await fetchExport()
      const cutoffMs = (() => {
        const now = Date.now()
        if (dateRange === '30d') return now - 30 * 86400_000
        if (dateRange === '90d') return now - 90 * 86400_000
        if (dateRange === 'year') return new Date(new Date().getFullYear(), 0, 1).getTime()
        return 0
      })()
      const decisions = payload.decisions.filter(d => {
        if (!cutoffMs) return true
        const ts = d.created_at ? new Date(d.created_at).getTime() : 0
        return ts >= cutoffMs
      })
      const stamp = new Date().toISOString().slice(0, 10)
      if (decisionFormat === 'csv') {
        const filename = `lazynext-decisions-${stamp}.csv`
        triggerDownload(filename, decisionsToCsv(decisions as Decision[]), 'text/csv;charset=utf-8')
      } else {
        const filename = `lazynext-decisions-${stamp}.json`
        triggerDownload(filename, JSON.stringify({ exportedAt: payload.exportedAt, workspaceId: payload.workspaceId, decisions }, null, 2), 'application/json')
      }
      setDecisionStatus('ready')
    } catch (e) {
      setDecisionError(e instanceof Error ? e.message : 'Unknown error')
      setDecisionStatus('error')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <Link href={`/workspace/${slug}/settings`} className="mb-4 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
        <ArrowLeft className="h-3 w-3" /> Back to settings
      </Link>
      <h1 className="text-lg font-bold text-slate-50">Export Your Data</h1>
      <p className="mt-1 text-sm text-slate-400">Your data is always yours. Export anything, anytime.</p>

      {/* Data portability banner */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/5 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10">
          <Shield className="h-4 w-4 text-brand" />
        </div>
        <div>
          <p className="text-sm font-medium text-brand">Your data, your rules</p>
          <p className="mt-0.5 text-xs text-slate-400">We use open standards so you can always take your data with you. No lock-in, ever.</p>
        </div>
      </div>

      {/* Full workspace export */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-100">Full Workspace Export</h2>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-3xs font-medium text-emerald-400">Recommended</span>
        </div>
        <p className="mt-1 text-sm text-slate-400">Export all workflows, nodes, decisions, and metadata.</p>

        {fullExportStatus === 'ready' ? (
          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-100">Export downloaded</h3>
            <p className="mt-1 text-xs text-slate-500">{fullExportFilename}</p>
            <button onClick={handleFullExport} className="mt-3 rounded-lg border border-slate-600 bg-slate-800 px-6 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700">Re-export</button>
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-md bg-slate-800/50 p-3">
              <p className="text-2xs font-medium uppercase text-slate-500 mb-2">Export includes</p>
              <div className="grid grid-cols-2 gap-1">
                {exportIncludes.map(item => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Check className="h-3 w-3 text-emerald-400" />{item}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-2xs text-slate-600">Format: JSON (the only format the API currently emits — CSV/PDF transforms ship later).</p>
            </div>

            {fullExportError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{fullExportError}</span>
              </div>
            )}

            <button
              onClick={handleFullExport}
              disabled={fullExportStatus === 'exporting' || !workspaceId}
              className="mt-4 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-hover transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {fullExportStatus === 'exporting' ? 'Preparing export…' : !workspaceId ? 'Loading workspace…' : 'Export Full Workspace'}
            </button>
          </>
        )}
      </div>

      {/* Decisions only export */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-slate-100">Decisions Only Export</h2>
        <p className="mt-1 text-sm text-slate-400">Export the decision log (with quality scores and outcomes) filtered by date.</p>
        <div className="mt-4">
          <label htmlFor="decision-export-range" className="text-xs text-slate-500">Date Range</label>
          <select id="decision-export-range" value={dateRange} onChange={e => setDateRange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none">
            <option value="all">All time</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="year">This year</option>
          </select>
        </div>
        <div className="mt-3">
          <label htmlFor="decision-export-format" className="text-xs text-slate-500">Format</label>
          <select id="decision-export-format" value={decisionFormat} onChange={e => setDecisionFormat(e.target.value as DecisionFormat)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none">
            <option value="json">JSON — full payload</option>
            <option value="csv">CSV — spreadsheet-friendly</option>
          </select>
        </div>
        {decisionError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{decisionError}</span>
          </div>
        )}
        <button
          onClick={handleDecisionExport}
          disabled={decisionStatus === 'exporting' || !workspaceId}
          className="mt-4 w-full rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {decisionStatus === 'exporting' ? 'Preparing…' : decisionStatus === 'ready' ? 'Re-export Decisions' : 'Export Decisions'}
        </button>
      </div>

      {/* Export history */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-sm font-semibold text-slate-200">Export History</h2>
        {exportHistory.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">
            No previous exports. Past exports will appear here once server-side persistence is wired.
          </p>
        ) : (
          <>
            <div className="mt-3 space-y-2">
              {exportHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-slate-800/50 px-3 py-2">
                  <div>
                    <p className="text-sm text-slate-200">
                      {h.name} <span className="text-xs text-slate-500">({h.format})</span>
                    </p>
                    <p className="text-2xs text-slate-500">
                      {h.date} · {h.size}
                    </p>
                  </div>
                  <button className="text-xs text-brand hover:text-brand-hover">Re-download</button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-2xs text-slate-600">Exports available for 30 days.</p>
          </>
        )}
      </div>

      {/* API note */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-slate-500" />
          <span className="text-xs text-slate-400">API access: Programmatic export via REST API</span>
        </div>
        <div className="mt-2 space-y-0.5">
          <p className="font-mono text-2xs text-slate-500">GET /api/v1/export?workspaceId=&lt;uuid&gt;</p>
          <p className="text-2xs text-slate-600">Returns the same JSON payload these buttons download. A dedicated decisions-only endpoint isn&apos;t live yet — the button above filters client-side from this same response.</p>
        </div>
      </div>
    </div>
  )
}
