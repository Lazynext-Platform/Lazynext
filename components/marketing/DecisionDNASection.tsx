import { CheckCircle, Check, Users, Link as LinkIcon } from 'lucide-react'

const features = [
  {
    title: 'Quality scoring',
    desc: 'AI rates every decision on data, reversibility, and alignment',
  },
  {
    title: 'Outcome tracking',
    desc: 'revisit decisions and see if they paid off',
  },
  {
    title: 'Full lineage',
    desc: 'see every task, doc, and thread that led to or resulted from a decision',
  },
]

export default function DecisionDNASection() {
  return (
    <section className="gradient-decision relative overflow-hidden py-24">
      {/* Decorative blurs */}
      <div className="absolute left-0 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-200/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-blue-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-[1280px] px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Decision card mockup */}
          <div className="order-2 lg:order-1">
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl lg:mx-0">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-orange-500">
                    Decision
                  </span>
                  <span className="ml-2 text-xs text-slate-400">D-127</span>
                </div>
                <div className="ml-auto rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                  Resolved
                </div>
              </div>

              <h4 className="mb-2 text-lg font-bold text-slate-900">
                Which payment processor for global launch?
              </h4>

              <div className="mb-4 rounded-lg bg-slate-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Resolution
                </p>
                <p className="text-sm text-slate-700">
                  Go with Lemon Squeezy — handles global payments, tax,
                  and works for individual creators. Revisit if volume
                  exceeds 10K txns/month.
                </p>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Quality Score</span>
                  <span className="inline-flex items-center rounded-lg bg-green-500 px-2.5 py-1 text-sm font-bold text-white">
                    84/100
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Outcome</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    Validated
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Users className="h-3.5 w-3.5" />
                <span>5 participants</span>
                <span className="mx-1">&middot;</span>
                <LinkIcon className="h-3.5 w-3.5" />
                <span>3 linked nodes</span>
                <span className="mx-1">&middot;</span>
                <span>Mar 15, 2026</span>
              </div>
            </div>
          </div>

          {/* Text content */}
          <div className="order-1 lg:order-2">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-600">
              Hero Feature
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Decision DNA &mdash; Your team&apos;s{' '}
              <span className="text-orange-500">institutional memory</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Every decision your team makes is logged as a first-class node.
              Who decided, why, what options were considered, and what the
              outcome was &mdash; all searchable, scoreable, and connected to
              tasks and docs.
            </p>
            <ul className="mt-8 space-y-4">
              {features.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-100">
                    <Check className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <span className="text-sm text-slate-700">
                    <strong>{f.title}</strong> &mdash; {f.desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
