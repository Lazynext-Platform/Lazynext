'use client'

const entries = [
  {
    version: 'v0.4.0', date: 'April 5, 2026', dateTime: '2026-04-05', tag: 'Latest',
    items: [
      { type: 'feat', text: 'Decision Health Dashboard with quality trends and outcome analytics' },
      { type: 'feat', text: 'Automation Builder with WHEN/THEN visual rules' },
      { type: 'feat', text: 'Task Views — Kanban board and List table' },
      { type: 'feat', text: 'Data Export with full workspace archive' },
      { type: 'fix', text: 'Canvas performance improved for 100+ nodes' },
    ],
  },
  {
    version: 'v0.3.0', date: 'March 22, 2026', dateTime: '2026-03-22', tag: null,
    items: [
      { type: 'feat', text: 'Decision DNA — AI quality scoring for every decision' },
      { type: 'feat', text: 'Template Marketplace with 6 starter templates' },
      { type: 'feat', text: 'Import wizard for Notion, Linear, and Trello' },
      { type: 'fix', text: 'Mobile canvas replaced with NodeListView below 640px' },
    ],
  },
  {
    version: 'v0.2.0', date: 'March 8, 2026', dateTime: '2026-03-08', tag: null,
    items: [
      { type: 'feat', text: 'Workflow Canvas with 7 node primitives' },
      { type: 'feat', text: 'LazyMind AI panel with Groq integration' },
      { type: 'feat', text: 'Thread discussions attached to any node' },
      { type: 'feat', text: 'Pulse dashboard with team metrics' },
    ],
  },
  {
    version: 'v0.1.0', date: 'February 20, 2026', dateTime: '2026-02-20', tag: null,
    items: [
      { type: 'feat', text: 'Initial launch — Landing page, pricing, and auth' },
      { type: 'feat', text: 'Onboarding flow with workspace creation' },
      { type: 'feat', text: 'Supabase authentication with Google & GitHub SSO' },
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
