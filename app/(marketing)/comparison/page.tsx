import Link from 'next/link'
import { ArrowRight, Check, X, Minus, Clock } from 'lucide-react'

// Honest comparison: only ship features that actually work in v1.3.2.9 are
// marked ✅ for Lazynext. Roadmap features get the in-development clock.
//
// Removed from the previous version:
//   - "Real-time collaboration" — `CollaborationOverlay` renders today with
//     an empty `collaborators={[]}` prop; there is no presence channel,
//     no cursor sync, no broadcast layer. Not a parity feature yet.
//   - "Template marketplace" — `/workspace/[slug]/templates` is an honest
//     empty state. There is no `templates` table, no install endpoint.
//   - "Global pricing" — subjective marketing claim, not a comparable feature.
//
// Competitor checkmarks left intact where they reflect those tools'
// public, well-known capability set.

type Cell = true | false | 'partial' | 'soon'

interface Row {
  feature: string
  why: string
  lazynext: Cell
  notion: Cell
  linear: Cell
  asana: Cell
}

const competitors = ['Notion', 'Linear', 'Asana'] as const

const rows: Row[] = [
  {
    feature: 'Decision tracking with rationale',
    why: 'Log a decision in 30s with question, rationale, expected outcome, and review date.',
    lazynext: true, notion: false, linear: false, asana: false,
  },
  {
    feature: 'AI quality scoring',
    why: 'Each decision is scored 0–100 across clarity, data quality, risk awareness, and alternatives considered.',
    lazynext: true, notion: false, linear: false, asana: false,
  },
  {
    feature: 'Outcome reminder loop',
    why: 'When a decision\'s expected_by date arrives, the author is prompted to record what actually happened.',
    lazynext: true, notion: false, linear: false, asana: false,
  },
  {
    feature: 'Public decision pages',
    why: 'Share a decision externally with a stable /d/[slug] URL — no login required to view.',
    lazynext: true, notion: 'partial', linear: false, asana: false,
  },
  {
    feature: 'Graph-native canvas',
    why: 'Tasks, docs, and decisions live as nodes on an infinite canvas with typed edges between them.',
    lazynext: true, notion: false, linear: false, asana: false,
  },
  {
    feature: 'Task management',
    why: 'Status, assignee, due date, kanban + list views.',
    lazynext: true, notion: true, linear: true, asana: true,
  },
  {
    feature: 'Docs / Wiki',
    why: 'Long-form documents alongside tasks.',
    lazynext: true, notion: true, linear: false, asana: false,
  },
  {
    feature: 'Pulse / Analytics',
    why: 'Workload, throughput, and decision-quality trends.',
    lazynext: true, notion: false, linear: 'partial', asana: 'partial',
  },
  {
    feature: 'Automation builder',
    why: 'Trigger-based rules: when X happens, do Y.',
    lazynext: 'soon', notion: 'partial', linear: true, asana: true,
  },
  {
    feature: 'Templates',
    why: 'Start a project from a pre-built structure.',
    lazynext: 'soon', notion: true, linear: 'partial', asana: true,
  },
  {
    feature: 'Free tier',
    why: 'Single-workspace usage at no cost.',
    lazynext: true, notion: true, linear: true, asana: true,
  },
]

function CellIcon({ value }: { value: Cell }) {
  if (value === true) {
    return <Check aria-label="Yes" className="mx-auto h-4 w-4 text-emerald-600" />
  }
  if (value === false) {
    return <X aria-label="No" className="mx-auto h-4 w-4 text-slate-300" />
  }
  if (value === 'partial') {
    return <Minus aria-label="Partial" className="mx-auto h-4 w-4 text-amber-500" />
  }
  // 'soon'
  return <Clock aria-label="In development" className="mx-auto h-4 w-4 text-slate-400" />
}

export default function ComparisonPage() {
  const hasInDevRow = rows.some(r => r.lazynext === 'soon')

  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-12 text-center">
        <span className="inline-block rounded-full bg-lime-100 px-4 py-1 text-xs font-semibold text-lime-700">
          Compare
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">How Lazynext compares</h1>
        <p className="mt-2 text-lg text-slate-600">
          The only tool that tracks decisions alongside tasks and docs — with AI-scored quality and outcome follow-through.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          We&apos;re an honest startup. Features still in development are marked accordingly.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-12 overflow-x-auto">
        <table className="w-full text-sm" aria-label="Feature comparison across workflow platforms">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th scope="col" className="py-3 text-left font-medium text-slate-500">Feature</th>
              <th scope="col" className="py-3 text-center font-bold text-lime-700">Lazynext</th>
              {competitors.map(t => (
                <th key={t} scope="col" className="py-3 text-center font-medium text-slate-500">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.feature} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 text-slate-700">
                  <div className="font-medium">{row.feature}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{row.why}</div>
                </td>
                <td className="py-3 text-center bg-lime-50/50"><CellIcon value={row.lazynext} /></td>
                <td className="py-3 text-center"><CellIcon value={row.notion} /></td>
                <td className="py-3 text-center"><CellIcon value={row.linear} /></td>
                <td className="py-3 text-center"><CellIcon value={row.asana} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="pt-4 text-xs text-slate-500">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-600" /> shipped</span>
                  <span className="inline-flex items-center gap-1"><Minus className="h-3.5 w-3.5 text-amber-500" /> partial</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-400" /> in development</span>
                  <span className="inline-flex items-center gap-1"><X className="h-3.5 w-3.5 text-slate-300" /> not supported</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>

        {hasInDevRow && (
          <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <strong>What &ldquo;in development&rdquo; means here:</strong> the schema and node types exist, but the
            UI and engine ship in a future release. We&apos;d rather show a clock than a checkmark we can&apos;t back up.
            Track real progress on the <Link href="/changelog" className="font-medium text-slate-900 underline hover:no-underline">changelog</Link>.
          </p>
        )}
      </section>

      <section className="bg-slate-900 py-16 text-center text-slate-50">
        <h2 className="text-2xl font-bold">Try the decision-quality engine</h2>
        <p className="mt-2 text-sm text-slate-400">Free tier — no card required.</p>
        <Link
          href="/sign-up"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground hover:bg-brand-hover transition-colors"
        >
          Get Started Free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  )
}
