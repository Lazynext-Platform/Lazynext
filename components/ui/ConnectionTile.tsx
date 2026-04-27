'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

// Display copy must mirror the server-component map. Kept slim here
// because the client component only needs name + colour + icon.
export interface ConnectionTileProps {
  workspaceId: string
  providerId: string
  providerName: string
  providerDesc: string
  providerIcon: string
  providerColor: string
  connections: Array<{
    id: string
    displayName: string | null
    externalId: string
    scopes: string | null
    createdAt: string
  }>
}

export function ConnectionTile(props: ConnectionTileProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function disconnect(connectionId: string) {
    setError(null)
    setDisconnectingId(connectionId)
    try {
      const res = await fetch(
        `/api/v1/oauth/connections/${connectionId}?workspaceId=${props.workspaceId}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Disconnect failed (${res.status}).`)
      }
      // Re-fetch the page so the connection drops out of the list.
      // `router.refresh()` re-runs the server component without losing
      // local state in unrelated panels.
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error.')
    } finally {
      setDisconnectingId(null)
      setConfirmId(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg text-xl',
              props.providerColor,
            )}
          >
            {props.providerIcon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-200">{props.providerName}</p>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-3xs font-medium text-emerald-400">
                {props.connections.length === 1
                  ? 'Connected'
                  : `${props.connections.length} connected`}
              </span>
            </div>
            <p className="text-xs text-slate-500">{props.providerDesc}</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-2xs text-red-300">
          {error}
        </p>
      )}

      <ul className="mt-3 space-y-1 border-t border-slate-800 pt-3">
        {props.connections.map((c) => {
          const isPending = pending && disconnectingId === c.id
          const askingConfirm = confirmId === c.id
          return (
            <li key={c.id} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex-1 min-w-0">
                <p className="truncate text-slate-300">{c.displayName ?? c.externalId}</p>
                <p className="text-3xs text-slate-500">
                  {c.scopes ? `${c.scopes.split(/\s+/).length} scope(s)` : 'no scopes recorded'}
                  {' \u00b7 '}
                  added {new Date(c.createdAt).toLocaleDateString()}
                </p>
              </div>
              {askingConfirm ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => disconnect(c.id)}
                    disabled={isPending}
                    className="rounded-md bg-red-500/15 px-2 py-1 text-3xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-60"
                  >
                    {isPending ? 'Disconnecting…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    disabled={isPending}
                    className="rounded-md border border-slate-700 px-2 py-1 text-3xs text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(c.id)}
                  className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-3xs text-slate-300 hover:bg-slate-800"
                >
                  Disconnect
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
