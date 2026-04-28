import {
  ClipboardList,
  FileText,
  CheckCircle,
  MessageCircle,
  BarChart3,
  Settings,
  Grid3X3,
} from 'lucide-react'

const primitives = [
  {
    name: 'TASK',
    icon: ClipboardList,
    iconBg: 'bg-blue-500',
    desc: 'Track work with status, priority, and deadlines.',
    replaces: 'Replaces: Linear, Asana',
    highlight: false,
  },
  {
    name: 'DOC',
    icon: FileText,
    iconBg: 'bg-green-500',
    desc: 'Rich documents linked to everything else.',
    replaces: 'Replaces: Notion, Google Docs',
    highlight: false,
  },
  {
    name: 'DECISION',
    icon: CheckCircle,
    iconBg: 'bg-orange-500',
    desc: 'First-class decisions with quality scoring.',
    replaces: 'Replaces: nothing (it\'s new)',
    highlight: true,
  },
  {
    name: 'THREAD',
    icon: MessageCircle,
    iconBg: 'bg-purple-500',
    desc: 'Contextual conversations, not noisy channels.',
    replaces: 'Replaces: Slack threads',
    highlight: false,
  },
  {
    name: 'PULSE',
    icon: BarChart3,
    iconBg: 'bg-cyan-500',
    desc: 'Real-time status updates and check-ins.',
    replaces: 'Replaces: Standups, Geekbot',
    highlight: false,
  },
  {
    name: 'AUTOMATION',
    icon: Settings,
    iconBg: 'bg-slate-500',
    desc: 'If-this-then-that workflows, built in.',
    replaces: 'Replaces: Zapier, Make',
    highlight: false,
  },
  {
    name: 'TABLE',
    icon: Grid3X3,
    iconBg: 'bg-amber-500',
    desc: 'Structured data with relations and views.',
    replaces: 'Replaces: Airtable, Sheets',
    highlight: false,
  },
]

export default function PrimitivesSection() {
  return (
    <section id="features" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Built from seven{' '}
            <span className="rounded-md bg-brand/40 px-2 py-0.5 text-slate-900">powerful primitives</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
            Everything in Lazynext is a node. Combine them infinitely.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {primitives.map((p) => (
            <div
              key={p.name}
              className={`card-hover relative rounded-xl bg-white p-6 ${
                p.highlight
                  ? 'border-2 border-orange-400 ring-2 ring-orange-100 sm:col-span-2 lg:col-span-1'
                  : 'border border-slate-200'
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-4 rounded-full bg-orange-500 px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider text-white">
                  Nothing else does this
                </div>
              )}
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${p.iconBg}`}
              >
                <p.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
              <p className="mt-3 text-xs font-medium text-slate-600">
                {p.replaces}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
