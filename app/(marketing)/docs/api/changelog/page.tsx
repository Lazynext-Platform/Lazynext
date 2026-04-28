import type { Metadata } from 'next'
import Link from 'next/link'
import { ScrollText } from 'lucide-react'

export const metadata: Metadata = {
  title: 'API Changelog — Lazynext',
  description: 'What changed and when in the public Lazynext REST API.',
  alternates: { canonical: '/docs/api/changelog' },
}

export default function ApiChangelogPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-24">
        <Link href="/docs/api" className="text-sm font-medium text-indigo-600 hover:underline">
          ← API Reference
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          <ScrollText className="h-3 w-3" /> Changelog
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">API changelog</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Customer-facing log of every change to the public REST API. See{' '}
          <Link href="/docs/api/versioning" className="text-indigo-600 hover:underline">
            Versioning policy
          </Link>{' '}
          for how breaking changes are handled.
        </p>

        <Entry date="2026-04-29" tag="Added">
          <p>
            All <code>/api/v1/*</code> responses now carry{' '}
            <code>X-Request-Id</code> and <code>X-API-Version</code> headers.
            Quote <code>X-Request-Id</code> in support tickets for faster
            diagnosis.
          </p>
        </Entry>

        <Entry date="2026-04-29" tag="Added">
          <p>
            Bearer-key requests get a stricter, plan-aware two-tier rate limit
            (per-key bucket + workspace ceiling). Cookie-session requests are
            unchanged. See{' '}
            <Link href="/docs/api/rate-limits" className="text-indigo-600 hover:underline">
              Rate limits
            </Link>
            .
          </p>
        </Entry>

        <Entry date="2026-04-29" tag="Added">
          <p>
            <code>X-RateLimit-Limit</code> and <code>X-RateLimit-Remaining</code>{' '}
            headers now ship alongside the existing <code>X-RateLimit-Reset</code>{' '}
            and <code>Retry-After</code>. Use <code>Limit</code> and{' '}
            <code>Remaining</code> to throttle pre-emptively instead of waiting
            for a 429.
          </p>
        </Entry>

        <Entry date="2026-04-29" tag="Changed">
          <p>
            <code>GET /api/v1/whoami</code> returns rate-limit headers on 200
            and 429 responses. The body shape is unchanged.
          </p>
        </Entry>

        <Entry date="2026-04-29" tag="Deprecated">
          <p className="text-slate-500">— (none)</p>
        </Entry>

        <Entry date="2026-04-29" tag="Removed">
          <p className="text-slate-500">— (none)</p>
        </Entry>
      </section>
    </main>
  )
}

function Entry({
  date,
  tag,
  children,
}: {
  date: string
  tag: 'Added' | 'Changed' | 'Deprecated' | 'Removed'
  children: React.ReactNode
}) {
  const tagColours: Record<typeof tag, string> = {
    Added: 'bg-emerald-50 text-emerald-700',
    Changed: 'bg-blue-50 text-blue-700',
    Deprecated: 'bg-amber-50 text-amber-700',
    Removed: 'bg-rose-50 text-rose-700',
  }
  return (
    <div className="mt-8 border-l-2 border-slate-100 pl-6">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-mono text-slate-500">{date}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tagColours[tag]}`}
        >
          {tag}
        </span>
      </div>
      <div className="mt-2 leading-relaxed text-slate-700">{children}</div>
    </div>
  )
}
