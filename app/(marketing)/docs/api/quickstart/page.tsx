import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Code2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'API Quickstart — Lazynext',
  description:
    'Get your first call against the Lazynext REST API in under 5 minutes. Mint a key, send a request, verify the response.',
  alternates: { canonical: '/docs/api/quickstart' },
}

export default function ApiQuickstartPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-24">
        <Link
          href="/docs/api"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← API Reference
        </Link>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Quickstart</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Call your first endpoint in under five minutes.
        </p>

        <Step
          n={1}
          title="Mint an API key"
          body={
            <>
              Open <strong>Settings → Integrations → API Access</strong> in any
              workspace on the Business or Enterprise plan. Click{' '}
              <strong>Create API key</strong>, name it (we suggest{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">
                {'<project>-<env>'}
              </code>{' '}
              — e.g. <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">ci-prod</code>),
              and pick the scopes you need.
              <br />
              <br />
              Copy the key now — we hash it and you cannot read it back.
            </>
          }
        />

        <Step
          n={2}
          title="Verify with whoami"
          body={
            <>
              Test your key without burning a real budget. <code>GET /api/v1/whoami</code>{' '}
              echoes your resolved identity, the workspace your key is bound to, and
              the scopes it carries.
              <CodeBlock>{`curl -H "Authorization: Bearer $LAZYNEXT_KEY" \\
  https://lazynext.com/api/v1/whoami`}</CodeBlock>
              Expected response:
              <CodeBlock>{`{
  "authType": "apiKey",
  "userId": "user_...",
  "workspaceId": "ws_...",
  "keyId": "key_...",
  "keyPrefix": "ln_live_...",
  "keyName": "ci-prod",
  "scopes": ["read", "write"]
}`}</CodeBlock>
            </>
          }
        />

        <Step
          n={3}
          title="Make your first real call"
          body={
            <>
              Read all decisions in your workspace:
              <CodeBlock>{`curl -H "Authorization: Bearer $LAZYNEXT_KEY" \\
  https://lazynext.com/api/v1/decisions`}</CodeBlock>
              Or log a new decision from your CI/CD tooling:
              <CodeBlock>{`curl -X POST \\
  -H "Authorization: Bearer $LAZYNEXT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Adopted Postgres 16","outcome":"chosen"}' \\
  https://lazynext.com/api/v1/decisions`}</CodeBlock>
            </>
          }
        />

        <Step
          n={4}
          title="Read the response headers"
          body={
            <>
              Every response carries:
              <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-700">
                <li>
                  <code>X-Request-Id</code> — quote this in support tickets
                </li>
                <li>
                  <code>X-API-Version</code> — currently <code>v1</code>
                </li>
                <li>
                  <code>X-RateLimit-Limit</code>, <code>-Remaining</code>,{' '}
                  <code>-Reset</code> — back off pre-emptively when{' '}
                  <code>Remaining</code> approaches 0
                </li>
              </ul>
              On <code>429</code> you also get <code>Retry-After</code> in seconds.
              See{' '}
              <Link href="/docs/api/rate-limits" className="text-indigo-600 underline">
                Rate limits
              </Link>
              .
            </>
          }
        />

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-semibold">Next steps</h2>
          <ul className="mt-3 space-y-2">
            <NextLink href="/docs/api/authentication" label="Authentication & scopes" />
            <NextLink href="/docs/api/rate-limits" label="Rate limits" />
            <NextLink href="/docs/api/webhooks" label="Webhooks" />
            <NextLink href="/docs/api/versioning" label="Versioning policy" />
            <NextLink href="/api/v1/openapi.json" label="Full OpenAPI 3.1 spec" />
          </ul>
        </div>
      </section>
    </main>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <div className="mt-10 flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
        {n}
      </div>
      <div className="flex-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="mt-2 leading-relaxed text-slate-700">{body}</div>
      </div>
    </div>
  )
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
      <code className="font-mono">{children}</code>
    </pre>
  )
}

function NextLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex items-center gap-2 font-medium text-indigo-600 hover:underline"
      >
        <Code2 className="h-4 w-4" />
        {label}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  )
}
