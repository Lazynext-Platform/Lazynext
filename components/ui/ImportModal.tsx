'use client'

import { useState, useRef, useEffect } from 'react'
import { X, CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type Step = 1 | 2 | 3
type ImportStatus = 'idle' | 'importing' | 'success'

const sources = [
  { id: 'notion-api', name: 'Notion', desc: 'Connect via API', icon: '📝', recommended: true },
  { id: 'notion-zip', name: 'Notion Export', desc: 'Upload ZIP file', icon: '📦', recommended: false },
  { id: 'linear', name: 'Linear', desc: 'Import issues & projects', icon: '⚡', recommended: false },
  { id: 'trello', name: 'Trello', desc: 'Import boards & cards', icon: '📋', recommended: false },
  { id: 'asana', name: 'Asana', desc: 'Import tasks & projects', icon: '🎯', recommended: false },
  { id: 'csv', name: 'CSV File', desc: 'Import structured data', icon: '📊', recommended: false },
]

const previewMapping = [
  { from: 'Pages', to: 'DOC nodes', included: true },
  { from: 'Database rows', to: 'TASK nodes', included: true },
  { from: 'Nested pages', to: 'Edge connections', included: true },
  { from: 'Images & files', to: 'Not imported', included: false },
  { from: 'Comments', to: 'THREAD nodes', included: true },
]

export function ImportModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [progress, setProgress] = useState({ docs: 0, tasks: 0, edges: 0 })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleImport = () => {
    setStep(3)
    setStatus('importing')
    timerRef.current = setInterval(() => {
      setProgress(prev => {
        const next = {
          docs: Math.min(prev.docs + Math.random() * 15, 100),
          tasks: Math.min(prev.tasks + Math.random() * 12, 100),
          edges: Math.min(prev.edges + Math.random() * 10, 100),
        }
        if (next.docs >= 100 && next.tasks >= 100 && next.edges >= 100) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          setTimeout(() => setStatus('success'), 500)
        }
        return next
      })
    }, 200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="import-modal-title" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="w-full max-w-2xl mx-3 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 id="import-modal-title" className="text-lg font-semibold text-slate-100">Import Data</h2>
          <button onClick={onClose} aria-label="Close import dialog" className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 border-b border-slate-800 py-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn('flex h-6 w-6 items-center justify-center rounded-full text-2xs font-bold', step >= s ? (step > s ? 'bg-emerald-500 text-white' : 'bg-brand text-white') : 'bg-slate-700 text-slate-400')}>
                {step > s ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
              </div>
              <span className={cn('text-xs hidden sm:block', step >= s ? 'text-slate-200' : 'text-slate-500')}>
                {s === 1 ? 'Source' : s === 2 ? 'Preview' : 'Import'}
              </span>
              {s < 3 && <div className={cn('h-px w-8', step > s ? 'bg-emerald-500' : 'bg-slate-700')} />}
            </div>
          ))}
        </div>

        <div className="px-6 py-5">
          {/* Step 1: Source selection */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sources.map((src) => (
                <button
                  key={src.id}
                  onClick={() => { setSelectedSource(src.id); setStep(2) }}
                  className={cn('relative flex items-start gap-3 rounded-xl border bg-slate-800 p-4 text-left transition-all hover:border-slate-600', selectedSource === src.id ? 'border-brand' : 'border-slate-700')}
                >
                  {src.recommended && <span className="absolute -top-2 right-3 rounded-full bg-brand/20 px-2 py-0.5 text-3xs font-medium text-brand">Recommended</span>}
                  <span className="text-2xl">{src.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{src.name}</p>
                    <p className="text-xs text-slate-500">{src.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-slate-800 p-4">
                <span className="text-2xl">{sources.find(s => s.id === selectedSource)?.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Connect to {sources.find(s => s.id === selectedSource)?.name}</p>
                  <p className="text-xs text-slate-500">We&apos;ll securely connect via OAuth to import your data.</p>
                </div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h3 className="text-xs font-semibold uppercase text-slate-400 mb-3">Import Preview</h3>
                <div className="space-y-2">
                  {previewMapping.map((m) => (
                    <div key={m.from} className="flex items-center gap-2 text-sm">
                      {m.included ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <span className="h-4 w-4 flex items-center justify-center text-slate-600">—</span>}
                      <span className="text-slate-300">{m.from}</span>
                      <ArrowRight className="h-3 w-3 text-slate-600" />
                      <span className={m.included ? 'text-slate-200' : 'text-slate-500'}>{m.to}</span>
                    </div>
                  ))}
                </div>
              </div>
              <select className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-brand focus:outline-none">
                <option>Create new workflow</option>
                <option>Q2 Product Sprint</option>
                <option>Client Onboarding</option>
              </select>
              <button onClick={handleImport} className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">
                Connect & Start Import
              </button>
              <button onClick={() => setStep(1)} className="w-full text-center text-xs text-slate-500 hover:text-slate-300">Back to sources</button>
            </div>
          )}

          {/* Step 3: Progress / Success */}
          {step === 3 && (
            <div className="space-y-4">
              {status === 'success' ? (
                <div className="flex flex-col items-center py-8 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                    <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-100">Import Complete!</h3>
                  <p className="mt-1 text-sm text-slate-400">12 docs, 24 tasks, and 18 connections imported.</p>
                  <button onClick={onClose} className="mt-5 rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Go to Workflow</button>
                  <button onClick={onClose} className="mt-2 text-xs text-slate-500 hover:text-slate-300">Import More</button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center py-4">
                    <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-700 border-t-brand" />
                    <p className="mt-3 text-sm font-medium text-slate-200">Importing...</p>
                  </div>
                  {[
                    { label: 'Docs', count: '12', pct: progress.docs, color: 'bg-emerald-500' },
                    { label: 'Tasks', count: '24', pct: progress.tasks, color: 'bg-brand' },
                    { label: 'Connections', count: '18', pct: progress.edges, color: 'bg-purple-500' },
                  ].map((p) => (
                    <div key={p.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">{p.label}</span>
                        <span className="text-xs text-slate-500">{Math.round(p.pct)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', p.color)} style={{ width: `${p.pct}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 max-h-24 overflow-y-auto rounded-lg bg-slate-800 p-3 font-mono text-2xs text-slate-400 space-y-0.5">
                    <p><span className="text-emerald-400">✓</span> Connected to Notion workspace</p>
                    <p><span className="text-emerald-400">✓</span> Importing pages as DOC nodes...</p>
                    <p><span className="text-emerald-400">✓</span> Importing databases as TASK nodes...</p>
                    <p><span className="text-amber-400">⚠</span> Skipped 2 embedded images (not supported)</p>
                    <p><span className="text-emerald-400">✓</span> Building edge connections...</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 1 && (
          <div className="border-t border-slate-800 px-6 py-3">
            <p className="text-2xs text-slate-500">Your data is encrypted in transit and at rest.</p>
          </div>
        )}
      </div>
    </div>
  )
}
