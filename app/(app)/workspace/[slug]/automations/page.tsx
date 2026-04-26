import { notFound } from 'next/navigation'
import { Zap, Sparkles, Clock, Bell, Mail, AlertTriangle } from 'lucide-react'
import { FeatureGate } from '@/components/ui/FeatureGate'
import { getCurrentMemberWorkspace } from '@/lib/data/workspace'

export const dynamic = 'force-dynamic'

const previewRules = [
  {
    icon: Bell,
    title: 'Auto-assign new tasks',
    desc: 'When a task is created, route it to the least-busy member.',
    color: 'text-blue-400 bg-blue-500/10',
  },
  {
    icon: Clock,
    title: 'Decision reminder',
    desc: 'When a decision is open for over 7 days, ping the owner.',
    color: 'text-orange-400 bg-orange-500/10',
  },
  {
    icon: Mail,
    title: 'Weekly digest',
    desc: 'Compile and email a Monday morning team digest.',
    color: 'text-emerald-400 bg-emerald-500/10',
  },
  {
    icon: AlertTriangle,
    title: 'Blocked task alert',
    desc: 'Notify the assignee when a task is blocked for over 2 days.',
    color: 'text-red-400 bg-red-500/10',
  },
]

export default async function AutomationsPage({ params }: { params: { slug: string } }) {
  const { workspace, isMember } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace || !isMember) notFound()

  return (
    <FeatureGate
      feature="automations"
      variant="automation-gate"
      title="Automations"
      description="Trigger workflows on events, schedules, or quality thresholds."
      requiredTier="Pro"
    >
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
              <Zap className="h-6 w-6 text-amber-400" />
              Automations
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Set up rules that run automatically when things happen in {workspace.name}.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-slate-900 to-slate-900 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
            <Sparkles className="h-7 w-7 text-amber-400" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-50">The automations engine is in development</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
            We&apos;re building a real event-driven workflow engine — not a stub. Triggers, actions, schedules, and run history will go live in an upcoming release. Until then, the UI you see below is a preview of the rule library that will ship.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              disabled
              className="cursor-not-allowed rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-500"
              title="Available when the engine ships"
            >
              Create automation (coming soon)
            </button>
          </div>
        </div>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Rule library — preview
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {previewRules.map((r) => {
            const Icon = r.icon
            return (
              <div
                key={r.title}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 opacity-80"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${r.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">{r.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{r.desc}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-2xs text-slate-600">
          No fake automations or run history are shown here — automations are not yet active in production. Stay tuned.
        </p>
      </div>
    </FeatureGate>
  )
}
