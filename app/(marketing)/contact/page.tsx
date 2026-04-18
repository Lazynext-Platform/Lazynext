import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MessageCircle, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact — Lazynext',
  description: 'Reach the humans behind Lazynext. No ticketing system theater.',
}

// Honest placeholder — no invented phone numbers, no 40-field contact form,
// no "live chat with a dedicated success manager". Just real routes to real
// people, with clear expectations on response time.
export default function ContactPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-2xl px-6 pb-20 pt-24">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-600">
            <MessageCircle className="h-3 w-3" /> Contact
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Talk to the humans behind Lazynext
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Pick the channel that matches your question. All of these go to real people.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          <ContactRow
            icon={<Mail className="h-5 w-5 text-indigo-600" />}
            title="General + sales"
            email="hello@lazynext.com"
            detail="We reply within 1 business day. If it&rsquo;s urgent, say so in the subject."
          />
          <ContactRow
            icon={<MessageCircle className="h-5 w-5 text-indigo-600" />}
            title="Support for paying customers"
            email="support@lazynext.com"
            detail="Include your workspace slug. Real response times: usually hours, sometimes a day."
          />
          <ContactRow
            icon={<Shield className="h-5 w-5 text-indigo-600" />}
            title="Security + privacy"
            email="security@lazynext.com"
            detail="Vulnerability reports, DPA requests, data export. We read every one."
          />
        </div>

        <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-600">
            Already signed up? The fastest answer is usually <Link href="/sign-up" className="font-semibold text-indigo-600 hover:underline">inside the product</Link> — use the in-app help panel.
          </p>
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          We do not run a chatbot that pretends to be a person. If you&apos;re emailing us, a person reads it.
        </p>
      </section>
    </main>
  )
}

function ContactRow({ icon, title, email, detail }: { icon: React.ReactNode; title: string; email: string; detail: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30"
    >
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 font-mono text-sm text-indigo-600">{email}</p>
        <p className="mt-1 text-sm text-slate-500">{detail}</p>
      </div>
    </a>
  )
}
