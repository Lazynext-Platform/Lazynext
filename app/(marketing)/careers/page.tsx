import type { Metadata } from 'next'
import Link from 'next/link'
import { Briefcase, Heart, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Careers — Lazynext',
  description: 'Join the team building the operating system for work.',
}

export default function CareersPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-24">
        <div className="text-center">
          <span className="inline-block rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-600">
            Careers
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Build the future of teamwork
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
            We&apos;re a small, fast-moving team obsessed with replacing the chaos of 6 half-used tools with
            one platform that actually works.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-6 text-center">
            <Zap className="mx-auto h-8 w-8 text-brand" />
            <h3 className="mt-3 font-semibold">Ship Fast</h3>
            <p className="mt-2 text-sm text-slate-500">Weekly releases. Real users. Zero bureaucracy.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-6 text-center">
            <Heart className="mx-auto h-8 w-8 text-brand" />
            <h3 className="mt-3 font-semibold">Remote-First</h3>
            <p className="mt-2 text-sm text-slate-500">Work from anywhere. Async by default.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-6 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-brand" />
            <h3 className="mt-3 font-semibold">Ownership</h3>
            <p className="mt-2 text-sm text-slate-500">Own your domain end-to-end. No permission needed.</p>
          </div>
        </div>

        <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <h2 className="text-2xl font-bold">No open positions right now</h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-500">
            We&apos;re not hiring at the moment, but we&apos;re always looking for exceptional people. Send us a note
            and tell us what you&apos;d build.
          </p>
          <a
            href="mailto:careers@lazynext.com"
            className="mt-6 inline-flex items-center rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
          >
            Say Hello
          </a>
        </div>

        <div className="mt-8 text-center">
          <Link href="/about" className="text-sm font-medium text-brand hover:underline">
            Learn more about us &rarr;
          </Link>
        </div>
      </section>
    </main>
  )
}
