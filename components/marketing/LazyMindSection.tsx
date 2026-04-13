import { Sparkles, ScanSearch, Wand2, Mail, Award } from 'lucide-react'

const aiFeatures = [
  {
    icon: ScanSearch,
    title: 'Analyze workflows',
    desc: 'Ask questions about your workspace and get instant answers grounded in your real data.',
  },
  {
    icon: Wand2,
    title: 'Generate from descriptions',
    desc: 'Describe a project and LazyMind scaffolds tasks, docs, and decisions for you.',
  },
  {
    icon: Mail,
    title: 'Weekly digest',
    desc: 'Every Monday: what shipped, what stalled, which decisions need revisiting.',
  },
  {
    icon: Award,
    title: 'Decision quality scoring',
    desc: 'AI evaluates each decision on data quality, reversibility, stakeholder alignment, and outcome clarity.',
  },
]

export default function LazyMindSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            AI that understands your{' '}
            <span className="text-brand">entire workflow</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
            LazyMind isn&apos;t a chatbot bolted on. It sees your graph.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
          {/* AI Chat mockup */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-700/50 px-4 py-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-300">
                LazyMind
              </span>
              <span className="ml-auto rounded-full bg-green-500/20 px-2 py-0.5 text-2xs font-bold text-green-400">
                Online
              </span>
            </div>
            <div className="min-h-[300px] space-y-4 p-5">
              {/* User message */}
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand/20 px-4 py-2.5 text-sm text-slate-200">
                  What decisions have we made about pricing this quarter?
                </div>
              </div>
              {/* AI response */}
              <div className="flex justify-start">
                <div className="max-w-[85%] space-y-2 rounded-2xl rounded-bl-md bg-slate-800 px-4 py-3 text-sm text-slate-300">
                  <p>
                    Found{' '}
                    <strong className="text-white">3 decisions</strong> about
                    pricing in Q1:
                  </p>
                  <div className="space-y-1 rounded-lg bg-slate-700/50 p-2.5 text-xs">
                    <p className="font-semibold text-orange-400">
                      D-127: Freemium vs. trial model
                    </p>
                    <p className="text-slate-400">
                      Resolved: Freemium. Score: 91/100
                    </p>
                  </div>
                  <div className="space-y-1 rounded-lg bg-slate-700/50 p-2.5 text-xs">
                    <p className="font-semibold text-orange-400">
                      D-134: Price point for Pro tier
                    </p>
                    <p className="text-slate-400">
                      Resolved: $9/seat. Score: 78/100
                    </p>
                  </div>
                  <div className="space-y-1 rounded-lg bg-slate-700/50 p-2.5 text-xs">
                    <p className="font-semibold text-orange-400">
                      D-141: Annual discount percentage
                    </p>
                    <p className="text-slate-400">
                      Resolved: 17%. Score: 84/100
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Average decision quality:{' '}
                    <span className="font-semibold text-green-400">
                      84.3/100
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-700/50 p-4">
              <div className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-2.5">
                <Sparkles className="h-4 w-4 text-brand" />
                <span className="text-sm text-slate-500">
                  Ask LazyMind anything...
                </span>
              </div>
            </div>
          </div>

          {/* Features list */}
          <div className="space-y-6">
            {aiFeatures.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10">
                  <f.icon className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {f.title}
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
