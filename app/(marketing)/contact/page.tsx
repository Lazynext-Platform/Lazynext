import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact — Lazynext',
  description: 'Get in touch with the Lazynext team.',
}

export default function ContactPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Get in touch</h1>
          <p className="mt-4 text-lg text-slate-500">
            Have a question, feedback, or just want to say hi? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10">
              <Mail className="h-6 w-6 text-brand" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Email us</h2>
            <p className="mt-2 text-sm text-slate-500">For general questions and support.</p>
            <a
              href="mailto:hello@lazynext.com"
              className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
            >
              hello@lazynext.com
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10">
              <MessageCircle className="h-6 w-6 text-brand" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Sales</h2>
            <p className="mt-2 text-sm text-slate-500">For enterprise and custom plans.</p>
            <a
              href="mailto:sales@lazynext.com"
              className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
            >
              sales@lazynext.com
            </a>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-400">
            We typically respond within 24 hours.{' '}
            <Link href="/pricing" className="font-medium text-brand hover:underline">
              View pricing
            </Link>{' '}
            or{' '}
            <Link href="/about" className="font-medium text-brand hover:underline">
              learn about us
            </Link>.
          </p>
        </div>
      </section>
    </main>
  )
}
