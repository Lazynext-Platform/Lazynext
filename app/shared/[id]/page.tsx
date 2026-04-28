import Link from 'next/link'
import { Lock, Eye } from 'lucide-react'
import { getSharedCanvas } from '@/lib/data/shared-canvas'
import { SharedCanvasMount } from './SharedCanvasMount'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SharedCanvasPage({ params }: { params: { id: string } }) {
  const validId = UUID_RE.test(params.id)
  const canvas = validId ? await getSharedCanvas(params.id) : null

  if (!canvas) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
            <Lock className="h-5 w-5 text-slate-400" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-slate-100">
            {validId ? 'Shared canvas not found' : 'Invalid share link'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {validId
              ? 'This canvas either does not exist or its share link has been revoked.'
              : 'This share link does not look right. Share IDs are UUIDs.'}
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Looking for a public decision page instead? Those live at <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-slate-300">/d/[slug]</code>.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            Back to Lazynext
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-2xs uppercase tracking-wider text-slate-500">
            <Eye className="h-3 w-3" />
            Read-only · shared by {canvas.workspaceName ?? 'a Lazynext workspace'}
          </div>
          <h1 className="mt-0.5 truncate text-lg font-bold text-slate-50">{canvas.name}</h1>
          {canvas.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{canvas.description}</p>
          )}
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand-hover"
        >
          Build your own canvas
        </Link>
      </header>

      {canvas.nodes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-500">This canvas is empty.</p>
        </div>
      ) : (
        <SharedCanvasMount nodes={canvas.nodes} edges={canvas.edges} />
      )}

      <footer className="border-t border-slate-800 px-6 py-2 text-2xs text-slate-600">
        Shared via Lazynext · the workspace that survives your team
      </footer>
    </div>
  )
}
