'use client'

import { useEffect, useState, useTransition } from 'react'
import { Lock, Copy, Check, Trash2, Plus, AlertCircle, Key } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ApiKeySummary {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

interface Props {
  workspaceId: string
  // The page server component knows the plan; we accept it as a prop
  // so this client doesn't have to round-trip back to the server just
  // to render a plan-locked panel. The API still gates server-side —
  // this prop is purely for UX (showing the upgrade nudge vs the form).
  plan: string
  // Plan slugs that unlock API keys. Source of truth is
  // `lib/utils/plan-gates.ts` — passed in so this component never
  // imports server-only code.
  unlockedPlans: readonly string[]
}

function expiresBadge(iso: string) {
  // Visual urgency for upcoming expiry. Negative remaining days means
  // already expired — server-side auth rejects it but we still render
  // a clear "expired" badge so the user knows to revoke or re-issue.
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  const days = Math.round((ms - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) {
    return (
      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-3xs font-bold text-red-400">
        expired
      </span>
    )
  }
  if (days <= 7) {
    return (
      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-3xs font-bold text-amber-400">
        expires in {days}d
      </span>
    )
  }
  return (
    <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-3xs font-bold text-slate-300">
      expires in {days}d
    </span>
  )
}

export function ApiKeysPanel({ workspaceId, plan, unlockedPlans }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [keys, setKeys] = useState<ApiKeySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  // Default to least-privilege — the user opts in to write access by
  // ticking the checkbox. Matches the server-side default.
  const [allowWrite, setAllowWrite] = useState(false)
  // The plaintext is shown exactly once after creation. We keep it in
  // state long enough for the user to copy it, then drop it on close.
  // Never persisted; never re-fetchable.
  const [reveal, setReveal] = useState<{ id: string; plaintext: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isUnlocked = unlockedPlans.includes(plan)

  useEffect(() => {
    if (!isUnlocked) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetch(`/api/v1/api-keys?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return
        if (body?.error) setError(body.message ?? body.error)
        else setKeys(body?.data?.keys ?? [])
      })
      .catch(() => {
        if (!cancelled) setError('Could not load API keys.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId, isUnlocked])

  async function handleCreate() {
    if (!name.trim()) return
    setError(null)
    setCreating(true)
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: name.trim(),
          scopes: allowWrite ? ['read', 'write'] : ['read'],
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body?.message ?? body?.error ?? `Create failed (${res.status}).`)
        return
      }
      const { key, plaintext } = body.data as { key: ApiKeySummary; plaintext: string }
      setKeys((prev) => [key, ...prev])
      setReveal({ id: key.id, plaintext })
      setName('')
      setAllowWrite(false)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    setDeletingId(id)
    try {
      const res = await fetch(`/api/v1/api-keys/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.message ?? body?.error ?? `Revoke failed (${res.status}).`)
        return
      }
      setKeys((prev) => prev.filter((k) => k.id !== id))
      // Also drop the reveal banner if the just-created key was revoked.
      if (reveal?.id === id) setReveal(null)
      startTransition(() => router.refresh())
    } finally {
      setDeletingId(null)
    }
  }

  async function copyPlaintext() {
    if (!reveal) return
    try {
      await navigator.clipboard.writeText(reveal.plaintext)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can fail under HTTP / unfocused tabs. The key is
      // still visible in the input below — user can select-and-copy.
    }
  }

  if (!isUnlocked) {
    return (
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-200">API Access</h2>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-3xs font-bold text-amber-400">
              Enterprise plan
            </span>
          </div>
          <Lock className="h-4 w-4 text-slate-500" />
        </div>
        <p className="mt-1 text-xs text-slate-500">Use the REST API for custom integrations and data management.</p>
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-3">
          <p className="text-xs text-slate-400">
            API key issuance is part of the Enterprise tier. Your workspace is on{' '}
            <span className="font-semibold text-slate-300">{plan}</span>. Contact sales to upgrade.
          </p>
          <a
            href="/contact?topic=enterprise"
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            Contact sales
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-200">API Access</h2>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-3xs font-bold text-emerald-400">
            Enterprise
          </span>
        </div>
        <Key className="h-4 w-4 text-slate-500" />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Issue scoped tokens for the REST API. Keys are shown once at creation; store them somewhere safe.
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {reveal && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="text-xs font-semibold text-emerald-300">New key — copy it now, you won&apos;t see it again</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-200">
              {reveal.plaintext}
            </code>
            <button
              onClick={copyPlaintext}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1.5 text-2xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => setReveal(null)}
              className="rounded-md border border-slate-700 px-2 py-1.5 text-2xs text-slate-400 hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Create */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. CI runner)"
          maxLength={100}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
        />
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-2xs font-semibold text-slate-300 hover:bg-slate-700">
          <input
            type="checkbox"
            checked={allowWrite}
            onChange={(e) => setAllowWrite(e.target.checked)}
            className="h-3 w-3 accent-brand"
          />
          Allow write
        </label>
        <button
          onClick={handleCreate}
          disabled={creating || !name.trim()}
          className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-60"
        >
          <Plus className="h-3 w-3" />
          {creating ? 'Generating…' : 'Generate key'}
        </button>
      </div>
      <p className="mt-1 text-3xs text-slate-500">
        Read-only keys can call GET endpoints (export, audit log, decisions list). Write keys can also mutate — only enable when needed.
      </p>

      {/* List */}
      <div className="mt-4 border-t border-slate-800 pt-3">
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="text-xs text-slate-500">No keys yet. Generate one above.</p>
        ) : (
          <ul className="space-y-1">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-slate-200">{k.name}</p>
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-3xs text-slate-400">
                      lzx_{k.keyPrefix}…
                    </code>
                    {k.scopes?.includes('write') ? (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-3xs font-bold text-amber-400">
                        read + write
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-3xs font-bold text-slate-300">
                        read-only
                      </span>
                    )}
                    {k.expiresAt && expiresBadge(k.expiresAt)}
                  </div>
                  <p className="text-3xs text-slate-500">
                    {k.lastUsedAt
                      ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : 'never used'}
                    {' \u00b7 '}
                    created {new Date(k.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(k.id)}
                  disabled={deletingId === k.id}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-3xs text-slate-300 hover:bg-slate-800 disabled:opacity-60"
                  aria-label={`Revoke ${k.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                  {deletingId === k.id ? 'Revoking…' : 'Revoke'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
