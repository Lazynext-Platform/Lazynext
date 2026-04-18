import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, CheckCircle2, AlertTriangle, Minus, Clock, Target } from 'lucide-react'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import type { Decision, DecisionScoreBreakdown } from '@/lib/db/schema'
import type { Metadata } from 'next'

// Cache public pages aggressively — they change only when the owner edits.
export const revalidate = 300

async function getPublicDecision(slug: string): Promise<Decision | null> {
  if (!hasValidDatabaseUrl) return null
  const { data } = await db
    .from('decisions')
    .select('*')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .single()
  return (data as Decision | null) ?? null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const decision = await getPublicDecision(params.slug)
  if (!decision) return { title: 'Decision not found · Lazynext' }
  const title = decision.question.length > 70 ? decision.question.slice(0, 67) + '…' : decision.question
  return {
    title: `${title} · Decision on Lazynext`,
    description: decision.resolution ?? decision.rationale ?? 'A decision recorded on Lazynext.',
    openGraph: {
      title,
      description: decision.resolution ?? undefined,
      type: 'article',
    },
  }
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-slate-400'
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-sky-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function scoreBand(score: number | null): string {
  if (score === null) return 'Unscored'
  if (score >= 80) return 'Rigorous'
  if (score >= 60) return 'Well-reasoned'
  if (score >= 40) return 'Considered'
  return 'Gut call'
}

function OutcomeBadge({ outcome }: { outcome: Decision['outcome'] }) {
  if (outcome === 'good') return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Worked</span>
  if (outcome === 'bad') return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400"><AlertTriangle className="h-3.5 w-3.5" /> Failed</span>
  if (outcome === 'neutral') return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400"><Minus className="h-3.5 w-3.5" /> Partial</span>
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-400"><Clock className="h-3.5 w-3.5" /> Outcome pending</span>
}

function DimensionBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-slate-300">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-sky-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${Math.max(3, value)}%` }}
        />
      </div>
    </div>
  )
}

export default async function PublicDecisionPage({ params }: { params: { slug: string } }) {
  const decision = await getPublicDecision(params.slug)
  if (!decision) notFound()

  const breakdown = decision.score_breakdown as DecisionScoreBreakdown | null
  const loggedOn = new Date(decision.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Minimal public header */}
      <header className="border-b border-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white">
            <Sparkles className="h-4 w-4 text-brand" />
            Lazynext
          </Link>
          <Link href="/sign-up" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover transition-colors">
            Log your team&apos;s decisions →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 md:px-8 md:py-16">
        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-800 px-2 py-0.5 font-medium text-slate-300 capitalize">{decision.status}</span>
          {decision.decision_type && <span className="rounded-full bg-slate-800 px-2 py-0.5 font-medium text-slate-300 capitalize">{decision.decision_type}</span>}
          <span>·</span>
          <span>Logged {loggedOn}</span>
        </div>

        {/* Question */}
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-50 md:text-4xl">
          {decision.question}
        </h1>

        {/* Outcome */}
        <div className="mt-4">
          <OutcomeBadge outcome={decision.outcome} />
        </div>

        {/* Quality score hero */}
        {typeof decision.quality_score === 'number' && (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Decision quality</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-5xl font-bold ${scoreColor(decision.quality_score)}`}>{decision.quality_score}</span>
                  <span className="text-xl font-medium text-slate-500">/100</span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-300">{scoreBand(decision.quality_score)}</p>
                {decision.score_rationale && (
                  <p className="mt-3 max-w-md text-sm text-slate-400 leading-relaxed">{decision.score_rationale}</p>
                )}
              </div>
              <Target className="h-8 w-8 text-brand/60" />
            </div>

            {breakdown && (
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-800 pt-5">
                <DimensionBar label="Clarity" value={breakdown.clarity} />
                <DimensionBar label="Data quality" value={breakdown.data_quality} />
                <DimensionBar label="Risk awareness" value={breakdown.risk_awareness} />
                <DimensionBar label="Alternatives" value={breakdown.alternatives_considered} />
              </div>
            )}
          </div>
        )}

        {/* Resolution */}
        {decision.resolution && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">What we chose</h2>
            <p className="mt-2 text-lg leading-relaxed text-slate-200">{decision.resolution}</p>
          </section>
        )}

        {/* Rationale */}
        {decision.rationale && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Why</h2>
            <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-slate-300">{decision.rationale}</p>
          </section>
        )}

        {/* Options considered */}
        {decision.options_considered?.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Options considered</h2>
            <ul className="mt-2 space-y-2">
              {decision.options_considered.map((opt, i) => (
                <li key={i} className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-300">
                  {opt}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Outcome notes (only if tagged) */}
        {decision.outcome !== 'pending' && decision.outcome_notes && (
          <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">What actually happened</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{decision.outcome_notes}</p>
            {typeof decision.outcome_confidence === 'number' && (
              <p className="mt-3 text-xs text-slate-500">Confidence in this verdict: <span className="font-semibold text-slate-400">{decision.outcome_confidence}/10</span></p>
            )}
          </section>
        )}

        {/* Footer CTA */}
        <div className="mt-16 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Powered by Lazynext</p>
          <h3 className="mt-2 text-xl font-bold text-slate-50">
            Decisions die in the wrong tools.
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Lazynext is the decision intelligence platform for teams that refuse to forget. AI-scored on four dimensions. Outcomes tracked forever.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/sign-up" className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">
              Start free →
            </Link>
            <Link href="/" className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              See how scoring works
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
