'use client'

import { useState } from 'react'
import { Download, Lock, FileText, Shield, Database, Check, ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

type ExportStatus = 'idle' | 'exporting' | 'ready'

const exportIncludes = [
  'All nodes', 'Edge connections', 'Decision rationale', 'Quality scores',
  'Thread comments', 'Task metadata', 'Doc content', 'Tags & labels',
  'Timestamps', 'Member assignments', 'Outcome tags', 'Attachments metadata',
]

const exportHistory = [
  { name: 'Full Workspace Export', format: 'JSON', date: 'Apr 3, 2026', size: '2.4 MB' },
  { name: 'Decisions Export', format: 'CSV', date: 'Mar 28, 2026', size: '156 KB' },
  { name: 'Full Workspace Export', format: 'JSON', date: 'Mar 15, 2026', size: '1.8 MB' },
]

export default function DataExportPage() {
  const params = useParams()
  const slug = params.slug as string
  const [fullExportStatus, setFullExportStatus] = useState<ExportStatus>('idle')
  const [fullExportProgress, setFullExportProgress] = useState(0)
  const [fullFormat, setFullFormat] = useState('json')
  const [decisionFormat, setDecisionFormat] = useState('json')
  const [dateRange, setDateRange] = useState('all')

  const handleFullExport = () => {
    setFullExportStatus('exporting')
    const timer = setInterval(() => {
      setFullExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          setFullExportStatus('ready')
          return 100
        }
        return prev + Math.random() * 8
      })
    }, 150)
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
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-medium text-emerald-400">Recommended</span>
        </div>
        <p className="mt-1 text-sm text-slate-400">Export all workflows, nodes, decisions, and metadata.</p>

        {fullExportStatus === 'ready' ? (
          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-100">Export Ready!</h3>
            <p className="mt-1 text-xs text-slate-500">workspace-export-2026-04-06.json · 2.4 MB</p>
            <button className="mt-3 rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Download File</button>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Format</label>
                <select value={fullFormat} onChange={e => setFullFormat(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none">
                  <option value="json">JSON (Recommended)</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Scope</label>
                <select className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none">
                  <option>All workflows</option>
                  <option>Q2 Product Sprint</option>
                  <option>Client Onboarding</option>
                </select>
              </div>
            </div>

            <div className="mt-4 rounded-md bg-slate-800/50 p-3">
              <p className="text-[10px] font-medium uppercase text-slate-500 mb-2">Export includes</p>
              <div className="grid grid-cols-2 gap-1">
                {exportIncludes.map(item => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Check className="h-3 w-3 text-emerald-400" />{item}
                  </div>
                ))}
              </div>
            </div>

            {fullExportStatus === 'exporting' ? (
              <div className="mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400">Preparing...</span>
                  <span className="text-xs text-slate-500">{Math.round(fullExportProgress)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${fullExportProgress}%` }} />
                </div>
              </div>
            ) : (
              <button onClick={handleFullExport} className="mt-4 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">Export Full Workspace</button>
            )}
          </>
        )}
      </div>

      {/* Decisions only export */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-slate-100">Decisions Only Export</h2>
        <p className="mt-1 text-sm text-slate-400">Export decision log with quality scores and outcomes.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Format</label>
            <select value={decisionFormat} onChange={e => setDecisionFormat(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF Report</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Date Range</label>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none">
              <option value="all">All time</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="year">This year</option>
            </select>
          </div>
        </div>
        <button className="mt-4 w-full rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">Export 47 Decisions</button>
      </div>

      {/* Export history */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-sm font-semibold text-slate-200">Export History</h2>
        <div className="mt-3 space-y-2">
          {exportHistory.map((h, i) => (
            <div key={i} className="flex items-center justify-between rounded-md bg-slate-800/50 px-3 py-2">
              <div>
                <p className="text-sm text-slate-200">{h.name} <span className="text-xs text-slate-500">({h.format})</span></p>
                <p className="text-[10px] text-slate-500">{h.date} · {h.size}</p>
              </div>
              <button className="text-xs text-brand hover:text-brand-hover">Re-download</button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-600">Exports available for 30 days.</p>
      </div>

      {/* API note */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-slate-500" />
          <span className="text-xs text-slate-400">API access: Programmatic export via REST API</span>
        </div>
        <div className="mt-2 space-y-0.5">
          <p className="font-mono text-[10px] text-slate-500">GET /api/v1/export/workspace</p>
          <p className="font-mono text-[10px] text-slate-500">GET /api/v1/export/decisions</p>
          <p className="text-[10px] text-slate-600">Requires Pro or Business plan.</p>
        </div>
      </div>
    </div>
  )
}
