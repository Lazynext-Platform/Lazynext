import Link from 'next/link'
import { ArrowRight, CheckSquare, GitBranch, Sparkles, BarChart3, MessageCircle, Zap, Clock } from 'lucide-react'

// Honest features list. Two items now carry an `inDevelopment` flag because
// they don't yet ship as described:
//   - Automations: the page is an honest empty state with no engine behind it.
//   - Pulse: stats and decision-quality trends are real, but "real-time"
//     overstates it (no live socket / no streaming refresh).
interface Feature {
  icon: typeof GitBranch
  title: string
  body: string
  reverse: boolean
  inDevelopment?: true
}

const features: Feature[] = [
  {
    icon: GitBranch,
    title: 'Graph-Native Canvas',
    body: 'Every task, doc, and decision is a node on an infinite canvas. See how work connects — zoom out for the big picture, zoom in for the details.',
    reverse: false,
  },
  {
    icon: Sparkles,
    title: 'Decision DNA',
    body: 'Log decisions with context, score quality with AI across four dimensions (clarity, data quality, risk awareness, alternatives), and track outcomes when expected_by lands. Each decision builds a knowledge graph unique to your team.',
    reverse: true,
  },
  {
    icon: CheckSquare,
    title: '7 Node Primitives',
    body: 'Tasks, Docs, Decisions, Threads, Pulse, Automations, and Tables — the seven primitives the schema supports. Tasks / Docs / Decisions / Threads ship today; the others are progressively rolling out.',
    reverse: false,
  },
  {
    icon: BarChart3,
    title: 'Pulse Dashboard',
    body: 'Workload distribution, decision quality trends, and week-over-week comparisons — computed from your real workspace activity. Refreshes on page load (live streaming is on the roadmap).',
    reverse: true,
  },
  {
    icon: MessageCircle,
    title: 'Thread Discussions',
    body: 'In-context conversations attached to any node. No more switching to Slack to discuss a decision.',
    reverse: false,
  },
  {
    icon: Zap,
    title: 'Automations',
    body: 'WHEN/THEN rules that move your workflow forward — when a task completes, notify the team; when a decision is made, log it to Slack. The schema and node type exist today; the rule builder and runtime ship in a future release.',
    reverse: true,
    inDevelopment: true,
  },
]

export default function FeaturesPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-12 text-center">
        <span className="inline-block rounded-full bg-lime-100 px-4 py-1 text-xs font-semibold text-lime-700">Features</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">What ships today, honestly</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Lazynext combines tasks, docs, and decisions on one connected workspace. Items still in development carry a clock badge — we&apos;d rather flag the gap than oversell.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 space-y-20">
        {features.map((f) => (
          <div key={f.title} className={`flex flex-col gap-8 md:flex-row md:items-center ${f.reverse ? 'md:flex-row-reverse' : ''}`}>
            <div className="flex-1">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-lime-100 text-lime-700">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <h3 className="text-2xl font-bold">{f.title}</h3>
                {f.inDevelopment && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    <Clock className="h-3 w-3" /> in development
                  </span>
                )}
              </div>
              <p className="mt-2 text-slate-600 leading-relaxed">{f.body}</p>
            </div>
            <div className="flex-1 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-lime-50 p-12 flex items-center justify-center">
              <f.icon className="h-16 w-16 text-lime-300" />
            </div>
          </div>
        ))}
      </section>

      <section className="bg-slate-900 py-16 text-center text-slate-50">
        <h2 className="text-2xl font-bold">Start building better workflows today</h2>
        <p className="mt-2 text-sm text-slate-600">Free tier — no card required.</p>
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
