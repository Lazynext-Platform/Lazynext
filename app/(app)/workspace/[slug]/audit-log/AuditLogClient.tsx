'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ScrollText, Loader2, AlertTriangle, Download } from 'lucide-react'
import type { AuditAction, AuditView } from '@/lib/data/audit-log'
import {
  formatAuditAction,
  actionTone,
  formatRelativeTime,
  formatActor,
  formatAuditRange,
  type AuditRange,
} from '@/lib/utils/audit-format'

const ACTION_OPTIONS: { value: '' | AuditAction; label: string }[] = [
  { value: '', label: 'All actions' },
  { value: 'workspace.update', label: 'Workspace updated' },
  { value: 'workspace.delete', label: 'Workspace deleted' },
  { value: 'decision.create', label: 'Decision logged' },
  { value: 'decision.update', label: 'Decision edited' },
  { value: 'decision.delete', label: 'Decision deleted' },
  { value: 'node.create', label: 'Node created' },
  { value: 'node.update', label: 'Node edited' },
  { value: 'node.delete', label: 'Node deleted' },
  { value: 'member.invite', label: 'Member invited' },
  { value: 'member.remove', label: 'Member removed' },
  { value: 'member.role_update', label: 'Member role changed' },
  { value: 'api_key.create', label: 'API key created' },
  { value: 'api_key.rotate', label: 'API key rotated' },
  { value: 'api_key.revoke', label: 'API key revoked' },
  { value: 'ai.workflow.generated', label: 'AI workflow generated' },
  { value: 'ai.workflow.accepted', label: 'AI workflow accepted' },
  { value: 'ai.workflow.refined', label: 'AI workflow refined' },
]

const TONE_CLASSES: Record<ReturnType<typeof actionTone>, string> = {
  red: 'bg-red-500/10 text-red-300 border-red-500/30',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  sky: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  slate: 'bg-slate-700/40 text-slate-300 border-slate-600',
}

interface Props {
  workspaceId: string
  slug: string
  initialItems: AuditView[]
  initialCursor: string | null
  initialAction: AuditAction | null
  initialRange: AuditRange
}

const RANGE_OPTIONS: AuditRange[] = ['7', '30', '90', '365', 'all']

export function AuditLogClient({
  workspaceId,
  slug,
  initialItems,
  initialCursor,
  initialAction,
  initialRange,
}: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [items, setItems] = useState<AuditView[]>(initialItems)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setActionFilter(action: '' | AuditAction) {
    const params = new URLSearchParams(sp?.toString())
    if (action) params.set('action', action)
    else params.delete('action')
    startTransition(() =>
      router.replace(`/workspace/${slug}/audit-log${params.toString() ? '?' + params.toString() : ''}`),
    )
  }

  function setRange(range: AuditRange) {
    const params = new URLSearchParams(sp?.toString())
    if (range === 'all') params.delete('range')
    else params.set('range', range)
    startTransition(() =>
      router.replace(`/workspace/${slug}/audit-log${params.toString() ? '?' + params.toString() : ''}`),
    )
  }

  async function loadMore() {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    setError(null)
    try {
      const url = new URL('/api/v1/audit-log', window.location.origin)
      url.searchParams.set('workspaceId', workspaceId)
      url.searchParams.set('cursor', cursor)
      url.searchParams.set('limit', '50')
      if (initialAction) url.searchParams.set('action', initialAction)
      if (initialRange !== 'all') url.searchParams.set('range', initialRange)

      const res = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'same-origin',
      })
      if (!res.ok) {
        // 402 / 429 / 5xx all surface as a single inline message —
        // the page itself is already plan-gated, so a 402 here means
        // the workspace plan dropped mid-session.
        const body = await res.json().catch(() => ({}) as { message?: string })
        throw new Error(body?.message ?? `Request failed (${res.status})`)
      }
      const json = (await res.json()) as {
        data: { items: AuditView[]; nextCursor: string | null }
      }
      setItems((prev) => [...prev, ...json.data.items])
      setCursor(json.data.nextCursor)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load older entries.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/workspace/${slug}/settings`}
            className="mb-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
          >
            <ArrowLeft className="h-3 w-3" /> Back to settings
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <ScrollText className="h-6 w-6 text-amber-400" />
            Audit Log
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Every workspace mutation, ordered newest first.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <a
            href={
              `/api/v1/audit-log/export-csv?workspaceId=${encodeURIComponent(workspaceId)}` +
              (initialAction ? `&action=${encodeURIComponent(initialAction)}` : '') +
              (initialRange !== 'all' ? `&range=${initialRange}` : '')
            }
            download
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-slate-950"
            title={`Download CSV (${formatAuditRange(initialRange)}${initialAction ? `, ${initialAction}` : ''})`}
          >
            <Download className="h-4 w-4" aria-hidden />
            Download CSV
          </a>
          <div>
            <label className="block text-xs font-medium text-slate-500" htmlFor="range-filter">
              Date range
            </label>
            <select
              id="range-filter"
              value={initialRange}
              onChange={(e) => setRange(e.target.value as AuditRange)}
              disabled={isPending}
              className="mt-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              {RANGE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {formatAuditRange(r)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500" htmlFor="action-filter">
              Filter by action
            </label>
            <select
              id="action-filter"
              value={initialAction ?? ''}
              onChange={(e) => setActionFilter(e.target.value as '' | AuditAction)}
              disabled={isPending}
              className="mt-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
          <ScrollText className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-4 text-base font-medium text-slate-200">No audit entries yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Mutations appear here as soon as someone edits a node, decision, or member.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-950 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Actor</th>
                <th className="px-4 py-2 font-medium">Target</th>
                <th className="px-4 py-2 font-medium">IP</th>
                <th className="px-4 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.map((row) => {
                const tone = actionTone(row.action)
                return (
                  <tr key={row.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 align-top">
                      <span
                        className={
                          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ' +
                          TONE_CLASSES[tone]
                        }
                      >
                        {formatAuditAction(row.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-200">
                      <div>{formatActor(row.actor)}</div>
                      {row.actor?.email && row.actor?.name ? (
                        <div className="text-xs text-slate-500">{row.actor.email}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {row.resource_type ? (
                        <div className="font-mono text-xs text-slate-400">
                          {row.resource_type}
                          {row.resource_id ? (
                            <span className="text-slate-600">
                              {' · '}
                              {row.resource_id.slice(0, 8)}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                      {Object.keys(row.metadata ?? {}).length > 0 ? (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                            metadata
                          </summary>
                          <pre className="mt-1 max-w-md overflow-x-auto rounded bg-slate-950 p-2 text-[10px] text-slate-400">
                            {JSON.stringify(row.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-xs text-slate-500">
                      {row.ip ?? '—'}
                    </td>
                    <td
                      className="px-4 py-3 align-top text-slate-400"
                      title={new Date(row.created_at).toISOString()}
                    >
                      {formatRelativeTime(row.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {error ? (
            <div className="flex items-center gap-2 border-t border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </div>
          ) : null}

          {cursor ? (
            <div className="border-t border-slate-800 px-4 py-3">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                  </>
                ) : (
                  'Load older entries'
                )}
              </button>
            </div>
          ) : (
            <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-600">
              End of log.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
