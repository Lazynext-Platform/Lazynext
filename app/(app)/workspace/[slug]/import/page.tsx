'use client'

import { useState } from 'react'
import { ArrowLeft, Upload } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ImportModal } from '@/components/ui/ImportModal'

export default function ImportPage() {
  const params = useParams()
  const slug = params.slug as string
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <Link
        href={`/workspace/${slug}/settings`}
        className="mb-4 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
      >
        <ArrowLeft className="h-3 w-3" /> Back to settings
      </Link>

      <h1 className="text-lg font-bold text-slate-50">Import Data</h1>
      <p className="mt-1 text-sm text-slate-400">
        Bring your existing data into Lazynext from other tools.
      </p>

      {/* Import sources overview */}
      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
              <Upload className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-100">Import from External Tools</h2>
              <p className="mt-1 text-xs text-slate-400">
                Connect Notion, Linear, Trello, Asana, or upload a CSV to import your data as nodes and edges.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
              >
                Start Import
              </button>
            </div>
          </div>
        </div>

        {/* Supported sources */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-semibold text-slate-200">Supported Sources</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { icon: '📝', name: 'Notion', desc: 'Pages & databases' },
              { icon: '⚡', name: 'Linear', desc: 'Issues & projects' },
              { icon: '📋', name: 'Trello', desc: 'Boards & cards' },
              { icon: '🎯', name: 'Asana', desc: 'Tasks & projects' },
              { icon: '📊', name: 'CSV', desc: 'Structured data' },
              { icon: '📦', name: 'Notion ZIP', desc: 'Exported archive' },
            ].map((source) => (
              <div
                key={source.name}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/50 p-3"
              >
                <span className="text-xl">{source.icon}</span>
                <div>
                  <p className="text-xs font-medium text-slate-200">{source.name}</p>
                  <p className="text-2xs text-slate-500">{source.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-semibold text-slate-200">How Import Works</h3>
          <ol className="mt-3 space-y-2 text-xs text-slate-400">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-2xs font-bold text-brand">1</span>
              Choose your source tool and connect via OAuth or file upload
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-2xs font-bold text-brand">2</span>
              Preview the mapping — pages become DOC nodes, tasks become TASK nodes
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-2xs font-bold text-brand">3</span>
              Import runs in the background — nodes and edges are created automatically
            </li>
          </ol>
        </div>
      </div>

      {showModal && <ImportModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
