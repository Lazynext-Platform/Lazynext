import type { Metadata } from 'next'
import Link from 'next/link'
import { Book, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Docs — Lazynext',
  description: 'Learn how to use Lazynext — guides, references, and API documentation.',
}

const sections = [
  {
    title: 'Getting Started',
    links: [
      { label: 'Create your workspace', href: '/sign-up' },
      { label: 'Invite your team', href: '/sign-up' },
      { label: 'Your first canvas', href: '/sign-up' },
    ],
  },
  {
    title: 'Core Concepts',
    links: [
      { label: 'Nodes & primitives', href: '/features' },
      { label: 'Decision DNA', href: '/features' },
      { label: 'LazyMind AI', href: '/features' },
    ],
  },
  {
    title: 'Integrations',
    links: [
      { label: 'Import from Notion', href: '/sign-up' },
      { label: 'Import from Linear', href: '/sign-up' },
      { label: 'API reference', href: '/sign-up' },
    ],
  },
]

export default function DocsPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-24">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
            <Book className="h-7 w-7 text-brand" />
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Documentation</h1>
          <p className="mt-4 text-lg text-slate-500">
            Everything you need to get the most out of Lazynext.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {sections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-brand"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <h2 className="text-xl font-bold">Need help?</h2>
          <p className="mt-2 text-slate-500">
            Can&apos;t find what you&apos;re looking for?
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-flex items-center rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
          >
            Contact Support
          </Link>
        </div>
      </section>
    </main>
  )
}
