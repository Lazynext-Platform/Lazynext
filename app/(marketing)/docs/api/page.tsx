import type { Metadata } from 'next'
import Link from 'next/link'
import { Code, Lock, Zap, AlertCircle, KeyRound } from 'lucide-react'

export const metadata: Metadata = {
  title: 'API Reference — Lazynext',
  description:
    'REST API reference for Lazynext. Bearer-token auth, scoped keys, four read endpoints, one write endpoint.',
  alternates: { canonical: '/docs/api' },
  openGraph: {
    title: 'API Reference — Lazynext',
    description:
      'REST API reference for Lazynext. Bearer-token auth, scoped keys, four read endpoints, one write endpoint.',
    url: '/docs/api',
  },
}

// API reference is intentionally short. The product surface is small —
// four reads, one write — and that's the whole reference. As we wire
// more routes to bearer auth this page grows row-by-row, not by
// generating a thousand pages of OpenAPI fluff.

export default function ApiDocsPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-600">
            <Code className="h-3 w-3" /> API
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">REST API</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            A small, honest REST surface. Bearer-token auth, scoped keys, JSON in /
            JSON out. v1 covers the read paths your CI runner needs and one write
            path for logging decisions from external tooling.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Machine-readable spec:{' '}
            <Link
              href="/api/v1/openapi.json"
              className="font-medium text-indigo-600 underline-offset-4 hover:underline"
            >
              /api/v1/openapi.json
            </Link>{' '}
            (OpenAPI 3.1)
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Typed client lives at <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">lib/sdk</code>{' '}
            in the repo &mdash; copy <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">client.ts</code>{' '}
            into your project. Zero deps, ~150 lines, types map 1:1 to the OpenAPI schema.
          </p>
        </div>

        <Section icon={<KeyRound className="h-5 w-5 text-indigo-600" />} title="Authentication">
          <p>
            Every API request must carry a workspace-scoped API key. Keys are minted
            from <strong>Settings → Integrations → API Access</strong> on the Enterprise
            plan. You see the plaintext exactly once at creation; we store only a
            SHA-256 hash.
          </p>
          <Code2 lang="bash">{`# Authorization header (RFC 6750):
curl https://lazynext.com/api/v1/audit-log?workspaceId=<id> \\
  -H "Authorization: Bearer lzx_..."

# X-Api-Key header is also accepted:
curl https://lazynext.com/api/v1/audit-log?workspaceId=<id> \\
  -H "X-Api-Key: lzx_..."`}</Code2>
          <p>
            Cookie-session callers (the dashboard) use the same endpoints with no
            bearer header — your browser session handles it.
          </p>
        </Section>

        <Section icon={<Lock className="h-5 w-5 text-indigo-600" />} title="Scopes">
          <p>
            Each key is minted with one or both scopes. Default is least-privilege.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-700">
            <li>
              <code>read</code> — call any GET endpoint.
            </li>
            <li>
              <code>write</code> — also call POST/PATCH/DELETE endpoints.
            </li>
          </ul>
          <p className="mt-3">
            A request whose key is missing the required scope returns{' '}
            <code>403 INSUFFICIENT_SCOPE</code> with a <code>requiredScope</code>{' '}
            field naming what it would have needed.
          </p>
        </Section>

        <Section icon={<Zap className="h-5 w-5 text-indigo-600" />} title="Rate limits">
          <p>
            Buckets are keyed by the <em>key id</em> (cookie sessions: per user)
            so a leaked key burns its own budget. Each endpoint family has its own limit:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-700">
            <li>
              <code>read</code> endpoints — 100 / minute.
            </li>
            <li>
              <code>export</code> endpoints (workspace dump, CSV) — 10 / minute.
            </li>
            <li>
              <code>mutation</code> endpoints (POST/PATCH/DELETE) — 30 / minute.
            </li>
          </ul>
          <p className="mt-3">
            Exceeding the bucket returns <code>429</code> with a{' '}
            <code>Retry-After</code> header.
          </p>
        </Section>

        <Section icon={<Code className="h-5 w-5 text-indigo-600" />} title="Endpoints">
          <Endpoint method="GET" path="/api/v1/export" scope="read">
            Full workspace export (workflows, nodes, decisions) as JSON. Pass{' '}
            <code>?workspaceId=&lt;uuid&gt;</code> — for bearer requests this must
            match the key&apos;s workspace.
          </Endpoint>
          <Endpoint method="GET" path="/api/v1/audit-log" scope="read">
            Cursor-paginated audit log. Filterable by <code>action</code>,{' '}
            <code>resourceType</code>. Includes <code>api_key.create</code> and{' '}
            <code>api_key.revoke</code> entries. Requires the <code>audit-log</code>{' '}
            feature gate (Business plan and up).
          </Endpoint>
          <Endpoint method="GET" path="/api/v1/decisions" scope="read">
            Lists every decision in the workspace, newest first.
          </Endpoint>
          <Endpoint method="GET" path="/api/v1/decisions/export-csv" scope="read">
            Same data as <code>/decisions</code> rendered as a CSV stream — useful
            for dropping into a spreadsheet or BI tool.
          </Endpoint>
          <Endpoint method="POST" path="/api/v1/decisions" scope="write">
            Log a new decision. Body is JSON: <code>workspaceId</code>,{' '}
            <code>question</code> (required), plus optional <code>resolution</code>,{' '}
            <code>rationale</code>, <code>optionsConsidered</code>,{' '}
            <code>decisionType</code>, <code>tags</code>, <code>expectedBy</code>.
            The Decision DNA scorer runs server-side and the score is in the
            response.
          </Endpoint>
          <Endpoint method="GET" path="/api/v1/decisions/{id}" scope="read">
            Single decision by id. Bearer keys must target the workspace that
            owns the decision — cross-workspace lookups return{' '}
            <code>403 WORKSPACE_MISMATCH</code>.
          </Endpoint>
          <Endpoint method="PATCH" path="/api/v1/decisions/{id}" scope="write">
            Update <code>resolution</code>, <code>rationale</code>,{' '}
            <code>status</code>, <code>outcome</code>, <code>outcomeNotes</code>,{' '}
            <code>outcomeConfidence</code>, or <code>tags</code>. Setting an
            outcome (other than <code>pending</code>) bumps the workspace WMS.
          </Endpoint>
          <Endpoint method="DELETE" path="/api/v1/decisions/{id}" scope="write">
            Permanently remove a decision. Cascades to all linked outcomes.
          </Endpoint>
        </Section>

        <Section icon={<AlertCircle className="h-5 w-5 text-indigo-600" />} title="Errors">
          <p>Errors are JSON: <code>{`{ "error": "CODE", "message"?: "..." }`}</code>.</p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-700">
            <li>
              <code>401 UNAUTHORIZED</code> — no key, malformed key, expired key.
            </li>
            <li>
              <code>403 FORBIDDEN</code> — cookie user isn&apos;t a workspace member.
            </li>
            <li>
              <code>403 WORKSPACE_MISMATCH</code> — bearer key targets a different
              workspace than the request.
            </li>
            <li>
              <code>403 INSUFFICIENT_SCOPE</code> — key lacks the required scope.
            </li>
            <li>
              <code>402 PLAN_GATE</code> — feature requires a higher plan.
            </li>
            <li>
              <code>429</code> — rate-limit exceeded.
            </li>
            <li>
              <code>503 DATABASE_NOT_CONFIGURED</code> — only on misconfigured
              self-host installs.
            </li>
          </ul>
        </Section>

        <div className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
          More endpoints land as we wire them to bearer auth. See the{' '}
          <Link href="/changelog" className="font-semibold text-indigo-600 hover:underline">
            changelog
          </Link>{' '}
          for the per-version rollout.
        </div>
      </section>
    </main>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        {icon}
        {title}
      </h2>
      <div className="mt-4 space-y-3 leading-relaxed text-slate-700">{children}</div>
    </section>
  )
}

function Code2({ children, lang = 'text' }: { children: string; lang?: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800">
      <code className={`language-${lang} font-mono`}>{children}</code>
    </pre>
  )
}

function Endpoint({
  method,
  path,
  scope,
  children,
}: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  scope: 'read' | 'write'
  children: React.ReactNode
}) {
  const methodColor =
    method === 'GET'
      ? 'bg-emerald-100 text-emerald-700'
      : method === 'POST'
        ? 'bg-indigo-100 text-indigo-700'
        : method === 'PATCH'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-red-100 text-red-700'
  const scopeColor =
    scope === 'write' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-2 py-0.5 font-mono text-2xs font-bold ${methodColor}`}>{method}</span>
        <code className="font-mono text-sm font-semibold text-slate-900">{path}</code>
        <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${scopeColor}`}>scope: {scope}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}
