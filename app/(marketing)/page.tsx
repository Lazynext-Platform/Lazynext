import Link from 'next/link'
import {
  CheckSquare,
  FileText,
  GitBranch,
  MessageCircle,
  Activity,
  Zap,
  Table,
  ArrowRight,
  Sparkles,
  Shield,
  BarChart3,
} from 'lucide-react'

const primitives = [
  { icon: CheckSquare, label: 'TASK', desc: 'Manage work with full context', color: 'bg-blue-500' },
  { icon: FileText, label: 'DOC', desc: 'Rich docs linked to everything', color: 'bg-emerald-500' },
  { icon: GitBranch, label: 'DECISION', desc: 'Log, score, and track every choice', color: 'bg-orange-500' },
  { icon: MessageCircle, label: 'THREAD', desc: 'Contextual discussions on anything', color: 'bg-purple-500' },
  { icon: Activity, label: 'PULSE', desc: 'Real-time team dashboards', color: 'bg-cyan-500' },
  { icon: Zap, label: 'AUTOMATION', desc: 'If-this-then-that workflows', color: 'bg-amber-500' },
  { icon: Table, label: 'TABLE', desc: 'Structured data, spreadsheet-style', color: 'bg-teal-500' },
]

const features = [
  {
    icon: Sparkles,
    title: 'LazyMind AI',
    desc: 'AI that understands your workspace. Summarize decisions, suggest actions, draft docs — powered by open-source models.',
  },
  {
    icon: GitBranch,
    title: 'Decision DNA',
    desc: 'Every team decision logged with context, rationale, and AI quality scores. Never repeat the same mistake twice.',
  },
  {
    icon: BarChart3,
    title: 'Decision Health',
    desc: 'Workspace-level analytics on decision quality, outcomes, and team patterns. The dashboard your leadership team actually wants.',
  },
  {
    icon: Shield,
    title: 'Unified Graph',
    desc: 'Tasks, docs, and decisions connected in a visual graph. See how everything relates. No more silos.',
  },
]

const replacements = [
  'Notion', 'Linear', 'Trello', 'Slack threads', 'Airtable', 'Google Sheets', 'Zapier',
]

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="mx-auto max-w-5xl px-4 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Now in public beta</span>
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-6xl lg:text-7xl">
            One platform that replaces
            <br />
            <span className="text-[#4F6EF7]">every tool</span> your team misuses
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 md:text-xl">
            Tasks, docs, decisions, and AI — unified in one graph.
            Stop switching apps. Start shipping work.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/sign-up"
              className="flex items-center gap-2 rounded-xl bg-[#4F6EF7] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-[#3D5BD4] transition-all"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="rounded-xl border border-slate-300 px-8 py-3.5 text-base font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all"
            >
              See how it works
            </Link>
          </div>

          {/* Replacement strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-slate-400">Replaces:</span>
            {replacements.map((tool) => (
              <span
                key={tool}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 line-through decoration-red-400"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 7 Primitives */}
      <section className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-bold text-slate-900 md:text-4xl">
            7 primitives. One workspace.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Every building block of work — tasks, docs, decisions, threads, dashboards, automations, and tables — natively connected in a single graph.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {primitives.map((p) => (
              <div
                key={p.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${p.color}`}>
                  <p.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900">{p.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-bold text-slate-900 md:text-4xl">
            Built different. On purpose.
          </h2>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F6EF7]/10">
                  <f.icon className="h-6 w-6 text-[#4F6EF7]" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 bg-[#020617] py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Ready to stop drowning in tools?
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Free forever for up to 3 members. No credit card required.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#4F6EF7] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-[#3D5BD4] transition-all"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
