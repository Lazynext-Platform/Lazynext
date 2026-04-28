import type { Metadata } from 'next'
import Link from 'next/link'
import { GitBranch } from 'lucide-react'

export const metadata: Metadata = {
  title: 'API Versioning — Lazynext',
  description:
    'Lazynext follows Stripe-style additive versioning. /v1/ stays put, /v2/ ships alongside, deprecations get a 6-month sunset window.',
  alternates: { canonical: '/docs/api/versioning' },
}

export default function ApiVersioningPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-24">
        <Link href="/docs/api" className="text-sm font-medium text-indigo-600 hover:underline">
          ← API Reference
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          <GitBranch className="h-3 w-3" /> Versioning
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Versioning policy</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Stripe-style additive. We add new versions without removing the old.
          You migrate at your pace, with at least six months&apos; notice.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Current</h2>
        <p className="mt-3 text-slate-700">
          <code>v1</code> — path prefix <code>/api/v1/</code>. Header{' '}
          <code>X-API-Version: v1</code>.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">What counts as breaking</h2>
        <p className="mt-3 text-slate-700">Any of these requires a new major version:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-700">
          <li>Removing or renaming a field, query param, or path</li>
          <li>Changing a field&apos;s type</li>
          <li>Tightening validation (request worked before, now 400s)</li>
          <li>Changing the meaning of a value (enum reused for new state)</li>
          <li>Changing a default that affects behaviour</li>
          <li>Tightening auth or scope semantics</li>
        </ul>
        <p className="mt-3 text-slate-700">These are <strong>not</strong> breaking and ship within the current major:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-700">
          <li>Adding new fields to responses (clients ignore unknown fields)</li>
          <li>Adding new optional query params or body fields</li>
          <li>Adding new endpoints</li>
          <li>Loosening validation (request that 400d before now 200s)</li>
          <li>Adding new scopes (existing keys keep their scopes)</li>
        </ul>

        <h2 className="mt-12 text-2xl font-semibold">Lifecycle</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-semibold">Phase</th>
                <th className="py-2 pr-4 font-semibold">Duration</th>
                <th className="py-2 font-semibold">Behaviour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 pr-4 font-mono">ACTIVE</td>
                <td className="py-3 pr-4">indefinite</td>
                <td className="py-3">Default version. <code>X-API-Version</code> reflects this.</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-mono">DEPRECATED</td>
                <td className="py-3 pr-4">≥ 6 months</td>
                <td className="py-3">
                  Endpoint still works. Adds <code>Sunset</code> + <code>Deprecation</code> + <code>Link</code> headers.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-mono">SUNSET</td>
                <td className="py-3 pr-4">final 24h</td>
                <td className="py-3">
                  We email all keys that hit the endpoint in the last 30 days.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-mono">REMOVED</td>
                <td className="py-3 pr-4">—</td>
                <td className="py-3">
                  Endpoint returns <code>410 Gone</code> with a <code>Link</code> to the migration doc.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-slate-700">
          The 6-month window is a floor, not a ceiling. Most deprecations run
          9–12 months. We only shorten to 6 if security or correctness demands.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Deprecation headers</h2>
        <p className="mt-3 text-slate-700">
          When you call a deprecated endpoint, your response carries:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
          <code>{`Sunset: Thu, 01 Oct 2026 00:00:00 GMT
Deprecation: @1745847600
Link: <https://lazynext.com/docs/api/changelog#v2>; rel="deprecation"`}</code>
        </pre>
        <p className="mt-3 text-slate-700">
          Per RFC 8594 (<code>Sunset</code>) and the IETF deprecation header
          draft (<code>Deprecation</code>). Watch for them in your client and
          surface them in your monitoring.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Communication</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-700">
          <li>
            Deprecation announcement on the{' '}
            <Link href="/docs/api/changelog" className="text-indigo-600 hover:underline">
              API changelog
            </Link>
            .
          </li>
          <li>Email to all keys that hit the endpoint in the last 30 days.</li>
          <li>Banner on this docs page.</li>
          <li>Sunset reminder emails at T-90, T-30, T-7, T-1 days.</li>
        </ul>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-semibold">Related</h2>
          <ul className="mt-3 space-y-2 text-slate-700">
            <li>
              <Link href="/docs/api/changelog" className="font-medium text-indigo-600 hover:underline">
                API changelog →
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  )
}
