'use client'

const entries = [
  {
    version: 'v1.0.0.0', date: 'April 18, 2026', dateTime: '2026-04-18', tag: 'Latest',
    items: [
      { type: 'feat', text: 'Decision DNA — LLM-scored decisions across 4 dimensions (clarity, data quality, risk awareness, alternatives considered)' },
      { type: 'feat', text: 'Groq Llama 3.3 70B primary scorer, Together AI fallback, deterministic heuristic safety net' },
      { type: 'feat', text: 'Public decision pages at /d/[slug] with OG metadata and 5-minute ISR' },
      { type: 'feat', text: 'Workspace Maturity Score — progressive feature exposure (decisions first, canvas/automations at L4)' },
      { type: 'feat', text: 'Outcome reminder loop — daily Inngest job emails authors when expected_by lands' },
      { type: 'feat', text: 'Weekly digest now summarizes decisions logged, outcomes recorded, WMS progression' },
      { type: 'feat', text: 'Global Cmd+Shift+D to log a decision from anywhere' },
      { type: 'feat', text: 'Schema migration 00002_decision_intelligence_spine.sql — score_breakdown, expected_by, is_public, wms_score' },
      { type: 'perf', text: 'Placeholder env detection — ~7.6s first-paint hang on stock .env.local values now returns fallbacks in <250ms' },
      { type: 'fix', text: 'Decision scorer now strips ```json fences from Llama responses (was silently falling back to heuristic)' },
      { type: 'fix', text: '/careers, /contact, /docs, /d/[slug] signup links corrected to /sign-up' },
    ],
  },
]

const typeBadge: Record<string, string> = {
  feat: 'bg-emerald-100 text-emerald-700',
  fix: 'bg-amber-100 text-amber-700',
  perf: 'bg-blue-100 text-blue-700',
}

export default function ChangelogPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-16">
        <span className="inline-block rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-600">Changelog</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">What&apos;s new in Lazynext</h1>
        <p className="mt-2 text-lg text-slate-600">Follow our journey as we build the future of team workflows.</p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="relative ml-4 border-l-2 border-slate-200 pl-8 space-y-12">
          {entries.map(entry => (
            <div key={entry.version} className="relative">
              <div className="absolute -left-[41px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-200 bg-white">
                <div className={`h-2.5 w-2.5 rounded-full ${entry.tag ? 'bg-indigo-600' : 'bg-slate-300'}`} />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-bold">{entry.version}</h3>
                <time dateTime={entry.dateTime} className="text-sm text-slate-500">{entry.date}</time>
                {entry.tag && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-2xs font-semibold text-indigo-700">{entry.tag}</span>}
              </div>
              <ul className="space-y-2">
                {entry.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-2xs font-bold uppercase ${typeBadge[item.type] || 'bg-slate-100 text-slate-500'}`}>{item.type}</span>
                    <span className="text-sm text-slate-600">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
