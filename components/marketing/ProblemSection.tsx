import Image from 'next/image'
import {
  FileText,
  ListTodo,
  Hash,
  Table,
  ArrowRight,
  ArrowDown,
} from 'lucide-react'

const competitors = [
  {
    name: 'Notion',
    subtitle: 'forgets the why',
    icon: FileText,
    iconBg: 'bg-slate-900',
  },
  {
    name: 'Linear',
    subtitle: 'ships, never asks if it was right',
    icon: ListTodo,
    iconBg: 'bg-indigo-600',
  },
  {
    name: 'Slack',
    subtitle: 'decisions evaporate in threads',
    icon: Hash,
    iconBg: 'bg-purple-600',
  },
  {
    name: 'Airtable',
    subtitle: 'data without decisions',
    icon: Table,
    iconBg: 'bg-teal-600',
  },
]

export default function ProblemSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Your company&rsquo;s decisions die in{' '}
            <span className="rounded-md bg-brand/40 px-2 py-0.5 text-slate-900">the wrong tools</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
            You make 40 decisions a week and remember 4. Your tools capture
            tasks, docs, and chats &mdash; never the reasoning behind them.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-8 lg:flex-row">
          {/* Competitor cards */}
          <div className="grid max-w-md grid-cols-2 gap-4">
            {competitors.map((tool) => (
              <div
                key={tool.name}
                className="card-hover rounded-xl border border-slate-200 bg-slate-50 p-5 text-center"
              >
                <div
                  className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${tool.iconBg}`}
                >
                  <tool.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {tool.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">{tool.subtitle}</p>
              </div>
            ))}
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-2 py-4 lg:py-0">
            <ArrowRight className="hidden h-8 w-8 text-brand lg:block" />
            <ArrowDown className="h-8 w-8 text-brand lg:hidden" />
          </div>

          {/* Lazynext card */}
          <div className="card-hover max-w-xs rounded-2xl border-2 border-brand bg-brand/5 p-8 text-center shadow-lg shadow-brand/10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
              <Image src="/logo-transparent.png" alt="Lazynext" width={56} height={56} className="h-14 w-auto" />
            </div>
            <p className="text-xl font-bold text-slate-900">Lazynext</p>
            <p className="mt-2 text-sm font-medium text-slate-600">
              The decision layer your stack is missing.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
