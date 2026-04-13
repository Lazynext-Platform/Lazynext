'use client'

import Link from 'next/link'
import { ArrowRight, Users, Target, Globe } from 'lucide-react'

const team = [
  { name: 'Avas Patel', role: 'Founder & CEO', initials: 'AP', color: 'bg-indigo-500' },
  { name: 'Priya Shah', role: 'Head of Design', initials: 'PS', color: 'bg-emerald-500' },
  { name: 'Rahul Dev', role: 'Lead Engineer', initials: 'RD', color: 'bg-amber-500' },
]

const mission = [
  { icon: Target, title: 'Decision Quality', body: 'Most tools track tasks. We track the decisions behind them — so teams learn from their choices, not just check boxes.' },
  { icon: Users, title: 'Team Intelligence', body: 'Every decision, discussion, and outcome builds a knowledge graph unique to your team. Over time, Lazynext gets smarter with you.' },
  { icon: Globe, title: 'Global-First', body: 'Built for teams worldwide with transparent USD pricing, Lemon Squeezy payments, and design for the 1000+ startups launching every year.' },
]

export default function AboutPage() {
  return (
    <main className="bg-white text-slate-900">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <span className="inline-block rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-600">About Lazynext</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">We&apos;re building the operating system for team decisions</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Lazynext combines tasks, docs, decisions, and threads on a graph-native canvas — giving teams a shared brain where nothing falls through the cracks.
        </p>
      </section>

      {/* Mission 3-col */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {mission.map(m => (
            <div key={m.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <m.icon className="h-8 w-8 text-indigo-600" />
              <h3 className="mt-3 text-lg font-semibold">{m.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h2 className="text-2xl font-bold">The Team</h2>
        <p className="mt-2 text-slate-600">A small team building something big.</p>
        <div className="mt-8 flex justify-center gap-8">
          {team.map(t => (
            <div key={t.name} className="flex flex-col items-center">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white ${t.color}`}>{t.initials}</div>
              <p className="mt-3 font-semibold">{t.name}</p>
              <p className="text-sm text-slate-500">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-16 text-center text-white">
        <h2 className="text-2xl font-bold">Ready to make better decisions?</h2>
        <p className="mt-2 text-indigo-200">Start free. No credit card required.</p>
        <Link href="/sign-up" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
          Get Started <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  )
}
