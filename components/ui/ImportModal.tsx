'use client'

import { X, Sparkles, Mail } from 'lucide-react'
import { useModalA11y } from '@/lib/utils/useModalA11y'

const sources = [
  { id: 'notion-api', name: 'Notion', desc: 'Pages & databases via OAuth', icon: '📝' },
  { id: 'notion-zip', name: 'Notion Export', desc: 'ZIP archive upload', icon: '📦' },
  { id: 'linear', name: 'Linear', desc: 'Issues & projects', icon: '⚡' },
  { id: 'trello', name: 'Trello', desc: 'Boards & cards', icon: '📋' },
  { id: 'asana', name: 'Asana', desc: 'Tasks & projects', icon: '🎯' },
  { id: 'csv', name: 'CSV File', desc: 'Structured data upload', icon: '📊' },
]

/**
 * Import flows haven't shipped yet — there's no OAuth handshake, no
 * file ingestion endpoint, no schema mapper. The previous version of
 * this modal simulated a successful Notion import with random
 * progress bars and a fake "12 docs, 24 tasks, 18 connections imported"
 * success screen. That was the most directly misleading flow in the
 * app: users clicked "Connect & Start Import", saw a fake success,
 * then nothing happened.
 *
 * Until the real import engine ships, this modal is honest: it lists
 * the planned source connectors so visitors understand the roadmap,
 * and offers an email-me-when-it-ships CTA instead of a button that
 * pretends to do work.
 */
export function ImportModal({ onClose }: { onClose: () => void }) {
  const modalRef = useModalA11y()

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
          {/* Honest status */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                <Sparkles className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-400">Import flows are in development</p>
                <p className="mt-1 text-xs text-slate-400">
                  None of the connectors below are active yet. The OAuth handshake, schema mapper, and ingestion
                  pipeline ship together — we&apos;d rather hold a non-working button than simulate a fake success.
                  Email us if you have a specific source you want prioritized.
                </p>
              </div>
            </div>
          </div>

          {/* Planned connectors — display only */}
          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Planned connectors</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sources.map((src) => (
              <div
                key={src.id}
                className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-800/50 p-4 opacity-80"
              >
                <span className="text-2xl">{src.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-200">{src.name}</p>
                    <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-3xs font-medium text-slate-400">
                      Soon
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{src.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA — email rather than fake button */}
          <a
            href="mailto:hello@lazynext.com?subject=Import%20connector%20priority"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
          >
            <Mail className="h-4 w-4" /> Email us your priority source
          </a>
        </div>

        <div className="border-t border-slate-800 px-6 py-3">
          <p className="text-2xs text-slate-500">
            When import ships, the OAuth handshake will run here and your data is encrypted in transit and at rest.
          </p>
        </div>
      </div>
    </div>
  )
}
