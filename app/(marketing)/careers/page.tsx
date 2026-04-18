import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Careers — Lazynext',
  description: 'We are small and early. If that excites you, say hi.',
}

// Honest placeholder — no invented team pages, perks, or open roles. Lazynext
// is early; we'd rather say so than fake a careers site.
export default function CareersPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-2xl px-6 pb-20 pt-24">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-600">
            <Sparkles className="h-3 w-3" /> Careers
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            We&apos;re small. We&apos;d rather be honest than recruit-y.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Lazynext is early. There are no named roles listed here, no &ldquo;we offer unlimited PTO and foosball&rdquo; nonsense, no perks copy generated in a marketing sprint.
          </p>
          <p className="mt-3 text-lg leading-relaxed text-slate-600">
            If you think building the decision intelligence layer for teams is a generational problem worth betting years on, email us with what you want to work on.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Get in touch
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              See what we&apos;re building
            </Link>
          </div>
          <p className="mt-10 text-xs text-slate-400">
            This page will grow into a real careers page once we&apos;re hiring at volume. Right now, an email gets you further than a form.
          </p>
        </div>
      </section>
    </main>
  )
}
