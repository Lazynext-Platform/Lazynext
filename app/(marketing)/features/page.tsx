'use client'

import Link from 'next/link'
import { ArrowRight, CheckSquare, GitBranch, Sparkles, BarChart3, MessageCircle, Zap } from 'lucide-react'

const features = [
  {
    icon: GitBranch, title: 'Graph-Native Canvas', body: 'Every task, doc, and decision is a node on an infinite canvas. See how work connects — zoom out for the big picture, zoom in for the details.',
    image: null, reverse: false,
  },
  {
    icon: Sparkles, title: 'Decision DNA', body: 'Log decisions with context, score quality with AI, track outcomes over time. Build a knowledge graph that makes your team smarter with every choice.',
    image: null, reverse: true,
  },
  {
    icon: CheckSquare, title: '7 Node Primitives', body: 'Tasks, Docs, Decisions, Threads, Pulse, Automations, and Tables — everything you need, connected on one surface.',
    image: null, reverse: false,
  },
  {
    icon: BarChart3, title: 'Pulse Dashboard', body: 'Real-time health metrics: burndown charts, workload distribution, decision quality trends, and week-over-week comparisons.',
    image: null, reverse: true,
  },
  {
    icon: MessageCircle, title: 'Thread Discussions', body: 'In-context conversations attached to any node. No more switching to Slack to discuss a decision.',
    image: null, reverse: false,
  },
  {
    icon: Zap, title: 'Automations', body: 'WHEN/THEN rules that move your workflow forward. When a task completes, notify the team. When a decision is made, log it to Slack.',
    image: null, reverse: true,
  },
]

export default function FeaturesPage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-12 text-center">
        <span className="inline-block rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-600">Features</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Everything you need, nothing you don&apos;t</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Lazynext replaces your task tracker, wiki, and decision log with one connected workspace.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 space-y-20">
        {features.map((f) => (
          <div key={f.title} className={`flex flex-col gap-8 md:flex-row md:items-center ${f.reverse ? 'md:flex-row-reverse' : ''}`}>
            <div className="flex-1">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-2xl font-bold">{f.title}</h3>
              <p className="mt-2 text-slate-600 leading-relaxed">{f.body}</p>
            </div>
            <div className="flex-1 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50 p-12 flex items-center justify-center">
              <f.icon className="h-16 w-16 text-indigo-300" />
            </div>
          </div>
        ))}
      </section>

      <section className="bg-indigo-600 py-16 text-center text-white">
        <h2 className="text-2xl font-bold">Start building better workflows today</h2>
        <Link href="/sign-up" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
          Get Started Free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  )
}
