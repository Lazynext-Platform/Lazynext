import type { Metadata } from 'next'
import Link from 'next/link'
import { Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'API Authentication — Lazynext',
  description:
    'How Lazynext API authentication works: bearer tokens, key prefixes, scopes, hashed storage, rotation, revocation.',
  alternates: { canonical: '/docs/api/authentication' },
}

export default function ApiAuthPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-24">
        <Link href="/docs/api" className="text-sm font-medium text-indigo-600 hover:underline">
          ← API Reference
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          <Lock className="h-3 w-3" /> Auth
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Authentication</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Bearer-token auth on the <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">Authorization</code>{' '}
          header. Workspace-scoped, hashed at rest, scope-checked per request.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">The header</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
          <code>Authorization: Bearer ln_live_...</code>
        </pre>
        <p className="mt-3 text-slate-700">
          Keys start with one of:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-700">
          <li>
            <code>ln_live_</code> — production keys
          </li>
          <li>
            <code>ln_test_</code> — sandbox keys (no real billing impact)
          </li>
        </ul>

        <h2 className="mt-12 text-2xl font-semibold">Scopes</h2>
        <p className="mt-3 text-slate-700">
          Each key carries one or more scopes. The minimum-privilege principle
          applies — give a key only what its role needs.
        </p>
        <ul className="mt-3 space-y-2 text-slate-700">
          <li>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">read</code>{' '}
            — call any GET endpoint
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">write</code>{' '}
            — POST/PUT/PATCH/DELETE on resources the workspace owns
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">admin</code>{' '}
            — manage workspace settings, members, billing
          </li>
        </ul>
        <p className="mt-3 text-slate-700">
          A request that lacks the required scope returns <code>403 INSUFFICIENT_SCOPE</code>.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Storage</h2>
        <p className="mt-3 text-slate-700">
          We store only a <strong>SHA-256 hash</strong> of your key. The plaintext is
          shown exactly once at creation. There is no mechanism to retrieve a lost
          key — rotate or revoke it.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Rotation & revocation</h2>
        <p className="mt-3 text-slate-700">
          From <strong>Settings → Integrations → API Access</strong>:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-700">
          <li>
            <strong>Rotate</strong> — keep the same name + scopes, mints a new
            secret. The old secret stops working immediately.
          </li>
          <li>
            <strong>Revoke</strong> — irreversible delete. Use this if a key
            leaks.
          </li>
        </ul>
        <p className="mt-3 text-slate-700">
          You can also revoke programmatically:{' '}
          <code>DELETE /api/v1/api-keys/{'{id}'}</code>.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Workspace binding</h2>
        <p className="mt-3 text-slate-700">
          Every key is bound to exactly one workspace at creation. The bound
          workspace cannot change. If a request supplies a{' '}
          <code>workspaceId</code> via URL or body that doesn&apos;t match the
          key&apos;s binding, we return <code>403 WORKSPACE_MISMATCH</code> —
          your key cannot escape its workspace.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Audit log</h2>
        <p className="mt-3 text-slate-700">
          Every key creation, rotation, and revocation lands in the workspace
          audit log with the actor user id, timestamp, and IP. The audit log is
          read-only and append-only.
        </p>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-semibold">Related</h2>
          <ul className="mt-3 space-y-2 text-slate-700">
            <li>
              <Link href="/docs/api/rate-limits" className="font-medium text-indigo-600 hover:underline">
                Rate limits →
              </Link>
            </li>
            <li>
              <Link href="/docs/api/quickstart" className="font-medium text-indigo-600 hover:underline">
                Quickstart →
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  )
}
