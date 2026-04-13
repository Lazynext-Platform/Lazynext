'use client'

import Link from 'next/link'
import { ArrowRight, Check, X, Minus } from 'lucide-react'

const tools = ['Notion', 'Linear', 'Asana']

const rows = [
  { feature: 'Graph-native canvas', lazynext: true, notion: false, linear: false, asana: false },
  { feature: 'Decision tracking', lazynext: true, notion: false, linear: false, asana: false },
  { feature: 'AI quality scoring', lazynext: true, notion: false, linear: false, asana: false },
  { feature: 'Task management', lazynext: true, notion: true, linear: true, asana: true },
  { feature: 'Docs / Wiki', lazynext: true, notion: true, linear: false, asana: false },
  { feature: 'Real-time collaboration', lazynext: true, notion: true, linear: true, asana: true },
  { feature: 'Thread discussions', lazynext: true, notion: 'partial', linear: 'partial', asana: 'partial' },
  { feature: 'Automation builder', lazynext: true, notion: 'partial', linear: true, asana: true },
  { feature: 'Pulse / Analytics', lazynext: true, notion: false, linear: 'partial', asana: 'partial' },
  { feature: 'Template marketplace', lazynext: true, notion: true, linear: false, asana: true },
  { feature: 'Global pricing', lazynext: true, notion: false, linear: false, asana: false },
  { feature: 'Free tier', lazynext: true, notion: true, linear: true, asana: true },
]

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-emerald-600" />
  if (value === false) return <X className="mx-auto h-4 w-4 text-slate-300" />
  return <Minus className="mx-auto h-4 w-4 text-amber-500" />
}

export default function ComparisonPage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-12 text-center">
        <span className="inline-block rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-600">Compare</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">How Lazynext compares</h1>
        <p className="mt-2 text-lg text-slate-600">The only tool that tracks decisions alongside tasks and docs.</p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-3 text-left font-medium text-slate-500">Feature</th>
              <th className="py-3 text-center font-bold text-indigo-700">Lazynext</th>
              {tools.map(t => <th key={t} className="py-3 text-center font-medium text-slate-500">{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.feature} className="border-b border-slate-100">
                <td className="py-3 text-slate-700">{row.feature}</td>
                <td className="py-3 bg-indigo-50/50"><Cell value={row.lazynext} /></td>
                <td className="py-3"><Cell value={row.notion} /></td>
                <td className="py-3"><Cell value={row.linear} /></td>
                <td className="py-3"><Cell value={row.asana} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-indigo-600 py-16 text-center text-white">
        <h2 className="text-2xl font-bold">Switch to the smarter workspace</h2>
        <Link href="/sign-up" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
          Get Started Free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  )
}
