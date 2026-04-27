import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Printer, ChevronLeft, FileSpreadsheet } from 'lucide-react'
import { getCurrentMemberWorkspace, getRecentDecisions } from '@/lib/data/workspace'
import type { Decision } from '@/lib/db/schema'
import { ReportPrintButton } from './ReportPrintButton'

export const metadata = { title: 'Decision DNA — Executive Report' }

// Server-rendered, print-optimized executive report covering every
// decided decision in the workspace. No PDF dependency — we lean on the
// browser's native "Save as PDF" via `window.print()`. The print
// stylesheet (in `globals.css` plus inline @media print rules below)
// hides the chrome so the printed output is the report alone.
export default async function DecisionReportPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { range?: string }
}) {
  const { workspace, isMember } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace || !isMember) notFound()

  const decisions = await getRecentDecisions(workspace.id, 500)

  const days = clampDays(searchParams.range)
  const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0
  const scoped = days
    ? decisions.filter((d) => new Date(d.created_at).getTime() >= cutoff)
    : decisions

  const stats = computeStats(scoped)
  const generatedAt = new Date()

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
      {/* On-screen action bar — hidden when printing */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link
            href={`/workspace/${params.slug}/decisions`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to decisions
          </Link>
          <div className="flex items-center gap-2">
            <RangePicker slug={params.slug} active={days} />
            <a
              href={
                days
                  ? `/api/v1/decisions/export-csv?workspaceId=${workspace.id}&range=${days}`
                  : `/api/v1/decisions/export-csv?workspaceId=${workspace.id}`
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </a>
            <ReportPrintButton>
              <Printer className="h-4 w-4" />
              Print / Save as PDF
            </ReportPrintButton>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-10 print:px-0 print:py-0">
        <header className="mb-10 border-b border-slate-200 pb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Decision DNA — Executive Report
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{workspace.name}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {days
              ? `Decisions logged in the last ${days} days · ${scoped.length} ${pluralize(scoped.length, 'entry', 'entries')}`
              : `All decisions ever logged · ${scoped.length} ${pluralize(scoped.length, 'entry', 'entries')}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Generated {generatedAt.toLocaleDateString('en-US', { dateStyle: 'long' })} at{' '}
            {generatedAt.toLocaleTimeString('en-US', { timeStyle: 'short' })}
          </p>
        </header>

        <section className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Total decisions" value={stats.total} />
          <Stat label="Avg quality" value={stats.avgQuality !== null ? `${stats.avgQuality}/100` : '—'} />
          <Stat label="Successful" value={stats.successful} hint={pct(stats.successful, stats.tagged)} />
          <Stat label="Failed" value={stats.failed} hint={pct(stats.failed, stats.tagged)} />
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Status breakdown
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="Decided" value={stats.byStatus.decided} />
            <Mini label="Open" value={stats.byStatus.open} />
            <Mini label="Pending outcome" value={stats.pendingOutcome} />
            <Mini label="Mixed" value={stats.mixed} />
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Top quality decisions
          </h2>
          {stats.top.length === 0 ? (
            <p className="text-sm text-slate-500">
              No decisions in this range have been quality-scored yet.
            </p>
          ) : (
            <ol className="space-y-3">
              {stats.top.map((d) => (
                <DecisionRow key={d.id} decision={d} />
              ))}
            </ol>
          )}
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Lessons — failed outcomes worth re-reading
          </h2>
          {stats.failedDecisions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No failed outcomes in this range. Either the team has been right, or the outcome
              tagging is behind. Worth checking.
            </p>
          ) : (
            <ol className="space-y-3">
              {stats.failedDecisions.map((d) => (
                <DecisionRow key={d.id} decision={d} />
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Full log
          </h2>
          {scoped.length === 0 ? (
            <p className="text-sm text-slate-500">No decisions in this range.</p>
          ) : (
            <ol className="space-y-3">
              {scoped.map((d) => (
                <DecisionRow key={d.id} decision={d} />
              ))}
            </ol>
          )}
        </section>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-500">
          <p>
            Generated by Lazynext · Decision DNA. Quality scores are model-assisted (see each
            decision&apos;s rationale on its node card for the breakdown). Outcomes are
            self-reported by stakeholders.
          </p>
        </footer>
      </main>

      <style>{`
        @media print {
          @page { margin: 0.6in; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}

function clampDays(raw: string | undefined): 7 | 30 | 90 | 365 | null {
  switch (raw) {
    case '7':
      return 7
    case '30':
      return 30
    case '90':
      return 90
    case '365':
      return 365
    default:
      return null
  }
}

function RangePicker({ slug, active }: { slug: string; active: number | null }) {
  const opts: Array<{ label: string; value: string | null }> = [
    { label: '7d', value: '7' },
    { label: '30d', value: '30' },
    { label: '90d', value: '90' },
    { label: '1y', value: '365' },
    { label: 'All', value: null },
  ]
  return (
    <div className="flex items-center gap-1 rounded-md border border-slate-200 p-0.5">
      {opts.map((o) => {
        const isActive = (active === null && o.value === null) || String(active) === o.value
        const href = o.value
          ? `/workspace/${slug}/decisions/report?range=${o.value}`
          : `/workspace/${slug}/decisions/report`
        return (
          <Link
            key={o.label}
            href={href}
            className={`rounded px-2 py-1 text-xs font-medium ${
              isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {o.label}
          </Link>
        )
      })}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function DecisionRow({ decision }: { decision: Decision }) {
  const made = new Date(decision.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })
  const score = decision.quality_score
  return (
    <li className="break-inside-avoid rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="flex-1 text-sm font-semibold text-slate-900">{decision.question}</p>
        {score !== null && (
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${qualityClass(score)}`}
          >
            {score}/100
          </span>
        )}
      </div>
      {decision.resolution && (
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Resolution:</span> {decision.resolution}
        </p>
      )}
      {decision.rationale && (
        <p className="mt-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Rationale:</span> {decision.rationale}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>Made {made}</span>
        <span>Status: {decision.status}</span>
        <span>Outcome: {formatOutcome(decision.outcome)}</span>
        {decision.decision_type && <span>Type: {decision.decision_type}</span>}
      </div>
    </li>
  )
}

function qualityClass(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-800'
  if (score >= 60) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

function formatOutcome(outcome: Decision['outcome']): string {
  switch (outcome) {
    case 'pending':
      return 'Pending'
    case 'good':
      return 'Successful'
    case 'bad':
      return 'Failed'
    case 'neutral':
      return 'Mixed'
    default:
      return outcome
  }
}

function pluralize(n: number, one: string, many: string) {
  return n === 1 ? one : many
}

function pct(part: number, whole: number): string | undefined {
  if (whole === 0) return undefined
  return `${Math.round((part / whole) * 100)}% of tagged`
}

interface ReportStats {
  total: number
  avgQuality: number | null
  successful: number
  failed: number
  mixed: number
  tagged: number
  pendingOutcome: number
  byStatus: { decided: number; open: number }
  top: Decision[]
  failedDecisions: Decision[]
}

function computeStats(decisions: Decision[]): ReportStats {
  let successful = 0
  let failed = 0
  let mixed = 0
  let pendingOutcome = 0
  let decided = 0
  let open = 0
  const scores: number[] = []

  for (const d of decisions) {
    if (d.outcome === 'good') successful++
    else if (d.outcome === 'bad') failed++
    else if (d.outcome === 'neutral') mixed++
    else if (d.outcome === 'pending' && d.status === 'decided') pendingOutcome++

    if (d.status === 'decided') decided++
    else if (d.status === 'open') open++

    if (typeof d.quality_score === 'number') scores.push(d.quality_score)
  }

  const tagged = successful + failed + mixed
  const avgQuality =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  const top = [...decisions]
    .filter((d) => typeof d.quality_score === 'number')
    .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0))
    .slice(0, 5)

  const failedDecisions = decisions.filter((d) => d.outcome === 'bad').slice(0, 10)

  return {
    total: decisions.length,
    avgQuality,
    successful,
    failed,
    mixed,
    tagged,
    pendingOutcome,
    byStatus: { decided, open },
    top,
    failedDecisions,
  }
}
