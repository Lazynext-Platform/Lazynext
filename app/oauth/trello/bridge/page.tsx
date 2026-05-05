'use client'

import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────
// Trello fragment-flow bridge.
//
// Trello redirects to this page after consent with the access
// token in the URL FRAGMENT (#token=...) and the CSRF state in
// the QUERY STRING (?state=...). Browsers don't send fragments
// to the server, so we extract both client-side and POST them
// to /api/v1/oauth/trello/finish, which validates the state
// cookie and persists the connection.
//
// We immediately scrub the fragment from the URL so the token
// isn't preserved in browser history. The window.history.replaceState
// happens on first render, before any fetch.
//
// On success the finish endpoint returns { redirect: '/workspace/...' }
// and we replace the location. On any error we redirect home with
// `?oauth_error=...&provider=trello` so the existing OAuthStatusBanner
// renders the appropriate error copy.
// ─────────────────────────────────────────────────────────────

export default function TrelloBridgePage() {
  const [status, setStatus] = useState<'connecting' | 'error'>('connecting')
  const [errorCode, setErrorCode] = useState<string>('unknown')
  // Strict-mode guard: useEffect runs twice in dev, and this effect
  // makes a one-shot POST. The ref keeps the second run from re-firing.
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    // Extract the token from the fragment. Trello sends it as
    // either `#token=<TOKEN>` or `#<TOKEN>` (the older shape).
    // Accept both for resilience.
    const hash = window.location.hash.replace(/^#/, '')
    const hashParams = new URLSearchParams(hash)
    let token = hashParams.get('token')
    if (!token && hash.length > 0 && !hash.includes('=')) {
      token = hash
    }
    const state = new URL(window.location.href).searchParams.get('state')

    // Scrub the fragment from the URL immediately. This avoids
    // the token being preserved in browser history or bookmarked
    // accidentally. Replacing only `hash` leaves the query
    // intact (we still want `?state=...` visible for debugging
    // until the page itself navigates away).
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }

    if (!token || !state) {
      // Trello cancellation also lands here without a token —
      // route to the same generic error page the code-flow uses.
      window.location.replace(`/?oauth_error=missing_params&provider=trello`)
      return
    }

    void (async () => {
      try {
        const res = await fetch('/api/v1/oauth/trello/finish', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token, state }),
        })
        const body = (await res.json().catch(() => null)) as
          | { ok?: boolean; redirect?: string; error?: string }
          | null
        if (!res.ok || !body?.ok) {
          const code = body?.error ?? `http_${res.status}`
          window.location.replace(
            `/?oauth_error=${encodeURIComponent(code)}&provider=trello`,
          )
          return
        }
        if (body.redirect) {
          window.location.replace(body.redirect)
          return
        }
        window.location.replace(`/?oauth_connected=trello`)
      } catch {
        setStatus('error')
        setErrorCode('network')
      }
    })()
  }, [])

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-center text-slate-100">
      {status === 'connecting' ? (
        <div className="space-y-4">
          <div
            className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-lime-400"
            role="status"
            aria-label="Connecting Trello"
          />
          <h1 className="text-lg font-semibold">Connecting Trello&hellip;</h1>
          <p className="text-sm text-slate-400">
            Don&rsquo;t close this window. We&rsquo;re finalising the connection.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h1 className="text-lg font-semibold">Couldn&rsquo;t finish the connection.</h1>
          <p className="text-sm text-slate-400">
            Error: <code>{errorCode}</code>. Try again from Settings &rarr; Integrations.
          </p>
          <a
            href="/?oauth_error=network&provider=trello"
            className="inline-flex items-center rounded-md bg-lime-400 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-lime-300"
          >
            Go back
          </a>
        </div>
      )}
    </main>
  )
}
