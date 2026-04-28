import type { Metadata } from 'next'
import Link from 'next/link'
import { Gauge } from 'lucide-react'

export const metadata: Metadata = {
  title: 'API Rate Limits — Lazynext',
  description:
    'How rate limiting works on the Lazynext REST API: per-key buckets, workspace ceilings, plan-aware quotas, and the headers you need to read.',
  alternates: { canonical: '/docs/api/rate-limits' },
}

export default function ApiRateLimitsPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-24">
        <Link href="/docs/api" className="text-sm font-medium text-indigo-600 hover:underline">
          ← API Reference
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          <Gauge className="h-3 w-3" /> Rate limits
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Rate limits</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Two-tier, plan-aware. Per-key buckets protect you from a single misbehaving
          script; the workspace ceiling protects the cluster from a customer minting
          many keys.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">The buckets</h2>
        <p className="mt-3 text-slate-700">
          Every API request hits two buckets. A request is allowed only when both
          have headroom.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-semibold">Plan</th>
                <th className="py-2 pr-4 font-semibold">Per-key /min</th>
                <th className="py-2 font-semibold">Workspace ceiling /min</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 pr-4">Free / Team</td>
                <td className="py-3 pr-4">— (no API access)</td>
                <td className="py-3">—</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Pro</td>
                <td className="py-3 pr-4">600</td>
                <td className="py-3">1,800</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Business</td>
                <td className="py-3 pr-4">6,000</td>
                <td className="py-3">30,000</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Enterprise</td>
                <td className="py-3 pr-4">6,000</td>
                <td className="py-3">30,000 (custom on request)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="mt-12 text-2xl font-semibold">Headers</h2>
        <p className="mt-3 text-slate-700">
          Every response (success or 429) carries the rate-limit triplet:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
          <code>{`X-RateLimit-Limit: 600
X-RateLimit-Remaining: 587
X-RateLimit-Reset: 1745842800`}</code>
        </pre>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-700">
          <li>
            <code>Limit</code> — max requests in the current 60-second window
          </li>
          <li>
            <code>Remaining</code> — requests left in this window (≥ 0)
          </li>
          <li>
            <code>Reset</code> — unix-seconds when the window resets
          </li>
        </ul>
        <p className="mt-3 text-slate-700">
          When the binding bucket is the workspace ceiling, the headers reflect{' '}
          <em>that</em> bucket — not the per-key one — because that&apos;s what
          you need to back off on.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">429 responses</h2>
        <p className="mt-3 text-slate-700">When you exceed a bucket:</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
          <code>{`HTTP/1.1 429 Too Many Requests
Retry-After: 12
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1745842800
Content-Type: application/json

{ "error": "RATE_LIMIT_EXCEEDED", "bucket": "per-key" }`}</code>
        </pre>
        <p className="mt-3 text-slate-700">
          <code>Retry-After</code> is in seconds, always ≥ 1. The{' '}
          <code>bucket</code> field is one of <code>per-key</code> or{' '}
          <code>workspace</code> so you know whether to slow down a single
          consumer or coordinate across all your keys.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Backoff strategy</h2>
        <p className="mt-3 text-slate-700">
          We recommend a token-bucket client that:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-6 text-slate-700">
          <li>
            Reads <code>X-RateLimit-Remaining</code> on every response.
          </li>
          <li>
            Throttles new sends when <code>Remaining</code> drops below 10% of{' '}
            <code>Limit</code>.
          </li>
          <li>
            On <code>429</code>, sleeps <code>Retry-After</code> seconds and
            retries with jitter.
          </li>
          <li>
            Retries idempotent requests (GET, PUT, DELETE) up to 3 times. POST
            requests should NOT be auto-retried unless you supply an{' '}
            <code>Idempotency-Key</code> header (coming in a future release).
          </li>
        </ol>

        <h2 className="mt-12 text-2xl font-semibold">Need higher limits?</h2>
        <p className="mt-3 text-slate-700">
          Email{' '}
          <a className="text-indigo-600 hover:underline" href="mailto:hello@lazynext.com">
            hello@lazynext.com
          </a>{' '}
          with your use case. Enterprise contracts can lift the ceiling.
        </p>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-semibold">Related</h2>
          <ul className="mt-3 space-y-2 text-slate-700">
            <li>
              <Link href="/docs/api/quickstart" className="font-medium text-indigo-600 hover:underline">
                Quickstart →
              </Link>
            </li>
            <li>
              <Link href="/docs/api/authentication" className="font-medium text-indigo-600 hover:underline">
                Authentication →
              </Link>
            </li>
            <li>
              <Link href="/docs/api/versioning" className="font-medium text-indigo-600 hover:underline">
                Versioning policy →
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  )
}
