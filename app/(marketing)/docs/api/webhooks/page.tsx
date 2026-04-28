import type { Metadata } from 'next'
import Link from 'next/link'
import { Webhook } from 'lucide-react'

export const metadata: Metadata = {
  title: 'API Webhooks — Lazynext',
  description:
    'How Lazynext webhooks work: signing, replay protection, retry policy, and how to verify a payload server-side.',
  alternates: { canonical: '/docs/api/webhooks' },
}

export default function ApiWebhooksPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-24">
        <Link href="/docs/api" className="text-sm font-medium text-indigo-600 hover:underline">
          ← API Reference
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          <Webhook className="h-3 w-3" /> Webhooks
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Webhooks</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Lazynext sends signed POSTs to your endpoint when events fire. Each
          delivery is signed, retried on transient failure, and includes the
          headers you need to verify it.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Headers</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
          <code>{`POST /your-endpoint HTTP/1.1
Content-Type: application/json
X-Lazynext-Event: decision.created
X-Lazynext-Delivery: <uuid>
X-Lazynext-Timestamp: 1745842800
X-Lazynext-Signature: sha256=...`}</code>
        </pre>

        <h2 className="mt-12 text-2xl font-semibold">Verifying a delivery (Node.js)</h2>
        <p className="mt-3 text-slate-700">
          Compute HMAC-SHA256 over <code>{'<timestamp>.<raw-body>'}</code> using
          your endpoint&apos;s shared secret. Compare with{' '}
          <code>crypto.timingSafeEqual</code> to avoid timing attacks. Reject
          deliveries older than 5 minutes (replay protection).
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
          <code>{`import crypto from 'node:crypto'

export function verifyLazynextWebhook(
  rawBody: string,
  headers: { signature: string; timestamp: string },
  secret: string,
): boolean {
  // 1. Replay protection — reject deliveries older than 5 minutes.
  const ts = Number(headers.timestamp)
  if (!Number.isFinite(ts)) return false
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false

  // 2. Strip the "sha256=" prefix.
  const expected = headers.signature.replace(/^sha256=/, '')

  // 3. Compute the signature over <timestamp>.<rawBody>.
  const actual = crypto
    .createHmac('sha256', secret)
    .update(\`\${ts}.\${rawBody}\`)
    .digest('hex')

  // 4. Constant-time compare.
  const a = Buffer.from(actual, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}`}</code>
        </pre>
        <p className="mt-3 text-sm text-slate-500">
          Use the <strong>raw</strong> request body, not a JSON-parsed copy —
          re-serializing reorders keys and breaks the signature.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Retry policy</h2>
        <p className="mt-3 text-slate-700">
          On <code>2xx</code> we mark the delivery successful. On{' '}
          <code>4xx</code> (other than <code>408</code> / <code>429</code>) we
          stop retrying — your endpoint told us the payload is bad. On{' '}
          <code>5xx</code>, <code>408</code>, <code>429</code>, or a network
          timeout we retry with exponential backoff:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-700">
          <li>30 seconds</li>
          <li>2 minutes</li>
          <li>10 minutes</li>
          <li>1 hour</li>
          <li>6 hours</li>
        </ul>
        <p className="mt-3 text-slate-700">
          After 5 attempts the delivery is marked failed. You can replay any
          failed delivery from <strong>Settings → Webhooks</strong>.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Idempotency</h2>
        <p className="mt-3 text-slate-700">
          Use <code>X-Lazynext-Delivery</code> as your dedup key. We may
          deliver the same delivery id twice in rare cases (network mid-flight,
          aggressive retry). Your handler must be idempotent — store the
          delivery id and skip if you&apos;ve seen it.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Events shipping in v1</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-700">
          <li><code>decision.created</code></li>
          <li><code>decision.outcome_logged</code></li>
          <li><code>workspace.member_added</code></li>
          <li><code>workspace.member_removed</code></li>
          <li><code>billing.plan_changed</code></li>
        </ul>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-semibold">Related</h2>
          <ul className="mt-3 space-y-2 text-slate-700">
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
