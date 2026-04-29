'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

// User-friendly copy for each error code emitted by the OAuth
// callback route. Anything not in this map falls back to the
// generic "couldn't connect" message — so a typoed code on the
// server side degrades gracefully rather than rendering a raw
// machine string to the user.
const ERROR_COPY: Record<string, string> = {
  unauthorized: 'You need to be signed in to connect an integration.',
  not_configured: 'This provider is not configured on this deployment yet.',
  missing_params: 'The provider redirect was missing required parameters. Please try again.',
  state_mismatch: "The connection link expired or didn't match this browser. Start the connection again from this page.",
  forbidden: "You're no longer a member of this workspace, so we couldn't finish the connection.",
  no_adapter: "No adapter is registered for this provider yet. We're working on it.",
  exchange_failed: "The provider rejected the authorization code. Usually this means the link was already used or it expired — try again.",
  encryption_unavailable: 'The integration could not be saved securely. Please contact support.',
  persist_failed: 'The connection succeeded but we could not save it. Please try again.',
  access_denied: 'You declined access on the provider. No connection was made.',
}

const PROVIDER_NAMES: Record<string, string> = {
  slack: 'Slack',
  notion: 'Notion',
  github: 'GitHub',
  linear: 'Linear',
  trello: 'Trello',
  asana: 'Asana',
  jira: 'Jira',
}

export function OAuthStatusBanner() {
  // We render only on the client because we read URL params and
  // need to mutate history to clear the query string. Server
  // rendering would re-emit the same query param on every nav.
  const [status, setStatus] = useState<
    | { kind: 'success'; provider: string }
    | { kind: 'error'; provider: string; code: string }
    | null
  >(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ok = params.get('oauth_connected')
    const err = params.get('oauth_error')
    const provider = params.get('provider') ?? ok ?? ''

    if (ok) {
      setStatus({ kind: 'success', provider: ok })
    } else if (err) {
      setStatus({ kind: 'error', provider, code: err })
    } else {
      return
    }

    // Strip the query params so a refresh doesn't re-show the
    // banner. We use replaceState to avoid pushing a history entry.
    params.delete('oauth_connected')
    params.delete('oauth_error')
    params.delete('provider')
    const next = params.toString()
    const url = window.location.pathname + (next ? `?${next}` : '')
    window.history.replaceState({}, '', url)
  }, [])

  if (!status) return null

  const providerName = PROVIDER_NAMES[status.provider] ?? status.provider

  if (status.kind === 'success') {
    return (
      <div
        role="status"
        className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-100">
            {providerName} connected
          </p>
          <p className="mt-0.5 text-xs text-emerald-200/80">
            You can manage scopes or disconnect this integration any time below.
          </p>
        </div>
        <button
          onClick={() => setStatus(null)}
          aria-label="Dismiss"
          className="text-emerald-200/60 hover:text-emerald-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const message = ERROR_COPY[status.code] ?? `We couldn't connect ${providerName}. Please try again.`

  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-rose-100">
          Couldn&apos;t connect {providerName}
        </p>
        <p className="mt-0.5 text-xs text-rose-200/80">{message}</p>
      </div>
      <button
        onClick={() => setStatus(null)}
        aria-label="Dismiss"
        className="text-rose-200/60 hover:text-rose-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
