import type { Metadata } from 'next'
import Link from 'next/link'
import { Book, GitBranch, Clock, Target, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Docs — Lazynext',
  description: 'A short, honest walkthrough of how Lazynext actually works.',
}

// Honest placeholder — no fake Docusaurus site with 200 empty sections.
// Just the four ideas someone needs to be productive today, with links to
// the real surfaces inside the product where they live.
export default function DocsPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-600">
            <Book className="h-3 w-3" /> Docs
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Lazynext in 4 concepts
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            We&apos;re not going to pretend to have a 200-page docs site. Lazynext is four ideas. Learn these and you&apos;re fluent.
          </p>
        </div>

        <div className="mt-12 space-y-5">
          <Concept
            num="1"
            icon={<GitBranch className="h-5 w-5 text-indigo-600" />}
            title="Decisions are first-class"
            body="Every meaningful choice — technical, product, hiring, pricing — gets logged with the question, what you chose, why, alternatives, and who was involved. Press ⌘D anywhere in the app to log one in 60 seconds."
          />
          <Concept
            num="2"
            icon={<Target className="h-5 w-5 text-indigo-600" />}
            title="The AI scores on 4 dimensions"
            body="Clarity, data quality, risk awareness, alternatives considered. Each 0–100. The aggregate score tells you whether a decision was rigorous (80+), well-reasoned (60+), considered (40+), or a gut call (<40). Hover any badge to see the breakdown."
          />
          <Concept
            num="3"
            icon={<Clock className="h-5 w-5 text-indigo-600" />}
            title="Outcomes close the loop"
            body="Set a check-in date when you log. When it&apos;s due, Lazynext pings you to record: did this work? We track Worked / Partial / Failed + a short retrospective. This is the data that makes your workspace&apos;s AI measurably smarter over time."
          />
          <Concept
            num="4"
            icon={<CheckCircle2 className="h-5 w-5 text-indigo-600" />}
            title="Share one decision with one link"
            body="Every decision gets a public URL (opt-in per decision). Ship a changelog, settle a team debate, or publish a post-mortem without exporting or copy-pasting."
          />
        </div>

        <div className="mt-12 rounded-xl border border-indigo-100 bg-indigo-50/50 p-6">
          <p className="text-sm font-semibold text-slate-900">That&apos;s it.</p>
          <p className="mt-1 text-sm text-slate-600">
            Everything else in the product — tasks, threads, canvas, automations — exists to give decisions the context they need. You&apos;ll discover those organically.
          </p>
          <Link
            href="/sign-up"
            className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Start logging decisions →
          </Link>
        </div>

        <p className="mt-10 text-xs text-slate-400">
          A deeper technical reference is on the roadmap. Need something specific right now? Email <a href="mailto:hello@lazynext.com" className="underline hover:text-slate-600">hello@lazynext.com</a> — we answer fast.
        </p>
      </section>
    </main>
  )
}

function Concept({ num, icon, title, body }: { num: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-indigo-200">
      <div className="flex flex-shrink-0 flex-col items-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50">{icon}</div>
        <div className="mt-2 font-mono text-xs font-semibold text-slate-400">0{num}</div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
      </div>
    </div>
  )
}
