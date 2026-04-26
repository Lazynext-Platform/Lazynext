import Link from 'next/link'
import { Lock, ExternalLink } from 'lucide-react'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const dynamic = 'force-dynamic'

/**
 * Public shared-canvas viewer. Sharing whole canvases (vs. individual
 * decisions at `/d/[slug]`) isn't a shipped feature yet — there is no
 * `shared_canvases` table or link-issuance flow. Until it ships, this
 * route renders an honest "not found" instead of fabricating a 5-node
 * sample graph and fake "24 total views / 8 unique visitors / 2m" stats.
 */
export default function SharedCanvasPage({ params }: { params: { id: string } }) {
  const validId = UUID_RE.test(params.id)

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
            ? "This canvas either doesn't exist or its share link has been revoked. Public canvas sharing is in development; until it ships, this route returns nothing."
            : "This share link doesn't look right. Share IDs are UUIDs."}
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Looking for a public decision page instead? Those live at <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-slate-300">/d/[slug]</code>.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
        >
          Back to Lazynext <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
