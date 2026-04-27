'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Plus, Check, Loader2 } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'
import { trackBillingEvent } from '@/lib/utils/telemetry'

interface WorkspaceRow {
  id: string
  name: string
  slug: string
  plan: string
  logo: string | null
  role: 'owner' | 'admin' | 'member'
}

/**
 * Multi-workspace switcher. Renders the active workspace as a button; on
 * click opens a dropdown listing every workspace the current user is a
 * member of. Clicking a row routes to `/workspace/{slug}` — the
 * `WorkspaceHydrator` on that route refreshes the store from the new slug.
 *
 * The list is fetched lazily on first open from `GET /api/v1/workspaces`
 * so we don't pay for the round-trip on users who never expand it.
 */
export function WorkspaceSelector() {
  const workspace = useWorkspaceStore((s) => s.workspace)
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<WorkspaceRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const name = workspace?.name ?? 'Workspace'

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Lazy-load the list on first open.
  useEffect(() => {
    if (!open || rows !== null || loading) return
    setLoading(true)
    setError(null)
    fetch('/api/v1/workspaces', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          setError(`HTTP ${res.status}`)
          return
        }
        const json = (await res.json()) as { data: WorkspaceRow[] }
        setRows(json.data)
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [open, rows, loading])

  function switchTo(slug: string) {
    setOpen(false)
    if (workspace?.slug === slug) return
    router.push(`/workspace/${slug}`)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Switch workspace (current: ${name})`}
        className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 hover:bg-slate-800/60"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-2xs font-bold text-brand-foreground">
          {name.charAt(0).toUpperCase()}
        </div>
        <span
          className="flex-1 truncate text-left text-sm font-semibold text-slate-200"
          title={name}
        >
          {name}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-full z-40 mt-1 rounded-lg border border-slate-800 bg-slate-950 p-1 shadow-xl"
        >
          {loading && (
            <div className="flex items-center justify-center px-2 py-3 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}

          {error && !loading && (
            <p className="px-3 py-2 text-xs text-red-400">Couldn&apos;t load workspaces ({error}).</p>
          )}

          {rows && rows.length === 0 && !loading && !error && (
            <p className="px-3 py-2 text-xs text-slate-500">No workspaces yet.</p>
          )}

          {rows && rows.length > 0 && (
            <ul className="max-h-72 overflow-y-auto py-0.5">
              {rows.map((row) => {
                const active = row.slug === workspace?.slug
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => switchTo(row.slug)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-800 ${
                        active ? 'bg-slate-800/60' : ''
                      }`}
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-brand text-[10px] font-bold text-brand-foreground">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 truncate text-slate-200" title={row.name}>
                        {row.name}
                      </span>
                      <span className="text-2xs capitalize text-slate-500">{row.role}</span>
                      {active && <Check className="h-3.5 w-3.5 text-brand" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="my-1 h-px bg-slate-800" />

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setShowCreate(true)
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Create workspace
          </button>
        </div>
      )}

      {showCreate && (
        <CreateWorkspaceDialog
          onClose={() => setShowCreate(false)}
          onCreated={(slug) => {
            setShowCreate(false)
            // Invalidate the cached list so the new workspace shows up
            // next time the dropdown opens.
            setRows(null)
            router.push(`/workspace/${slug}`)
          }}
        />
      )}
    </div>
  )
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function CreateWorkspaceDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (slug: string) => void
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const effectiveSlug = slugTouched ? slug : slugify(name)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !effectiveSlug) {
      setError('Name and slug are required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: effectiveSlug }),
      })
      const body = await res.json()
      if (!res.ok) {
        if (res.status === 402 && body?.variant === 'workspace-limit') {
          trackBillingEvent('paywall.gate.shown', {
            variant: 'workspace-limit',
            surface: 'create-workspace',
          })
          useUpgradeModal.getState().show('workspace-limit')
          onClose()
          return
        }
        if (res.status === 409) {
          setError('That slug is already taken — try another.')
        } else {
          setError(body?.error || `Failed to create workspace (HTTP ${res.status})`)
        }
        setSubmitting(false)
        return
      }
      onCreated(body.data.slug)
    } catch {
      setError('Network error')
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-workspace-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl"
      >
        <h2 id="create-workspace-title" className="text-lg font-semibold text-slate-100">
          Create a workspace
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          A separate canvas with its own members, decisions, and plan.
        </p>

        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Name</span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand"
              placeholder="Acme Inc"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">URL slug</span>
            <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm">
              <span className="text-slate-500">/workspace/</span>
              <input
                type="text"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '')
                      .slice(0, 60),
                  )
                }}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                className="flex-1 bg-transparent text-slate-100 outline-none"
                placeholder="acme"
              />
            </div>
          </label>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create workspace
          </button>
        </div>
      </form>
    </div>
  )
}
