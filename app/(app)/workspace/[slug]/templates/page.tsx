'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FileText, Sparkles } from 'lucide-react'

const plannedCategories = [
  { name: 'Engineering', sample: 'Product Sprint, Bug Triage, Architecture Decision Log' },
  { name: 'Product', sample: 'Feature Decision Log, OKR Tracker, User Research' },
  { name: 'Agency', sample: 'Client Project, Deliverables Tracker' },
  { name: 'Operations', sample: 'OKR Tracker, Hiring Pipeline' },
  { name: 'Startup', sample: 'Pre-launch Checklist, Fundraise Tracker' },
]

export default function TemplatesPage() {
  const params = useParams()
  const slug = params?.slug as string

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
        <FileText className="h-6 w-6 text-brand" />
        Template Marketplace
      </h1>
      <p className="mt-1 text-sm text-slate-400">Pre-built workflows to get your team started faster.</p>

      <div className="mt-8 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
          <Sparkles className="h-7 w-7 text-brand" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-100">Templates are in development</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
          The marketplace itself, the install round-trip, ratings and the publishing flow all need to ship before
          this page can do anything useful. Rather than show fake popularity numbers, we&apos;d rather show nothing
          until the real thing lands.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          In the meantime, you can build your own workflow on the canvas and we&apos;ll add an &ldquo;Export as template&rdquo;
          flow when the marketplace ships.
        </p>
        <Link
          href={`/workspace/${slug}/canvas`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
        >
          Open canvas
        </Link>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-300">Categories planned for launch</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {plannedCategories.map((c) => (
            <div key={c.name} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm font-semibold text-slate-200">{c.name}</p>
              <p className="mt-1 text-xs text-slate-500">{c.sample}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
