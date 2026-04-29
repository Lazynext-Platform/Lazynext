// ─────────────────────────────────────────────────────────────
// GitHub OAuth adapter.
//
// First adapter to land on the OAuth scaffolding shipped in
// v1.3.26.0–v1.3.28.0. GitHub was chosen as the reference adapter
// because:
//   - The OAuth surface is small and stable (no changing API
//     versions, no shifting scope strings).
//   - The Integrations Settings page (#31) was designed with
//     "Slack/Notion/GitHub" as the priority three; GitHub is the
//     least vendor-coupled of the three.
//   - Read-only metadata (user.login, primary email, repo list)
//     covers the realistic Lazynext use case (link a node to a
//     PR, surface CI status) without needing an "App" install
//     flow which is a separate beast.
//
// State + PKCE: GitHub does not require PKCE on OAuth web flows
// (server-side, with a client secret). We still mint a state
// token because CSRF is a requirement, not an option. State is
// stored in a short-lived signed cookie set on the redirect; the
// callback verifies it before exchanging the code.
//
// Scope strategy: we pin to the lowest-privilege scope set that
// covers the documented use case. Upgrading scopes requires a
// new connection — reusing a low-scope token for a high-scope
// call would silently 403. Better to fail at connect time.
//
// Env vars required for this adapter to register:
//   - LAZYNEXT_OAUTH_GITHUB_CLIENT_ID
//   - LAZYNEXT_OAUTH_GITHUB_CLIENT_SECRET
//
// Without those, the registry's `isProviderConfigured('github')`
// returns false and the UI hides the Connect button. With them,
// the button works end-to-end.
// ─────────────────────────────────────────────────────────────

import {
  registerOAuthProvider,
  type OAuthProviderConfig,
  type OAuthScopeMode,
} from './registry'

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const TOKEN_URL = 'https://github.com/login/oauth/access_token'
const USER_API_URL = 'https://api.github.com/user'

// GitHub scope strings. Conservative — we ask only for what the
// realistic Lazynext use case needs. `read:user` covers profile
// metadata; `user:email` covers the primary-email lookup we use
// to label the connection in the UI; `repo` is gated to write mode.
const GITHUB_SCOPES: Record<OAuthScopeMode, string[]> = {
  read: ['read:user', 'user:email'],
  // Read + the public-repo subset of `repo`. Avoids granting
  // private-repo access for the default write tier; teams that
  // need it can extend later.
  write: ['read:user', 'user:email', 'public_repo'],
  // Admin tier reserved for future GitHub App migration. Not
  // wired today — the API surface treats it the same as `write`
  // until we add app-install flow support.
  admin: ['read:user', 'user:email', 'public_repo'],
}

/**
 * Adapter export. The route handler imports this and calls
 * `registerOAuthProvider(githubAdapter)` exactly once at module
 * init — see the bottom of this file. Tests can opt into the
 * registration by importing the adapter; the registry itself
 * deduplicates so re-imports are safe.
 */
export const githubAdapter: OAuthProviderConfig = {
  id: 'github',
  displayName: 'GitHub',
  // GitHub web-application flow does NOT require PKCE — the
  // client secret IS the proof. Including a PKCE challenge is
  // ignored by GitHub but doesn't break the flow either; we set
  // `false` so the callback handler doesn't bother storing the
  // verifier cookie.
  pkce: false,
  scopes: GITHUB_SCOPES,

  buildAuthorizeUrl({ state, redirectUri, mode }) {
    const clientId = requireEnv('LAZYNEXT_OAUTH_GITHUB_CLIENT_ID')
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: GITHUB_SCOPES[mode].join(' '),
      state,
      // `allow_signup=false` — Lazynext doesn't want to drive new
      // GitHub signups from this flow. Existing users only.
      allow_signup: 'false',
    })
    return `${AUTHORIZE_URL}?${params.toString()}`
  },

  async exchangeCode({ code, redirectUri }) {
    const clientId = requireEnv('LAZYNEXT_OAUTH_GITHUB_CLIENT_ID')
    const clientSecret = requireEnv('LAZYNEXT_OAUTH_GITHUB_CLIENT_SECRET')

    // GitHub's token endpoint accepts both form-encoded and JSON
    // POSTs; we use form-encoded because that matches every
    // example in their docs (and keeps `Accept: application/json`
    // the only place we ask for JSON back).
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenRes.ok) {
      throw new Error(`GitHub token exchange failed: HTTP ${tokenRes.status}`)
    }

    // Defensive parse — GitHub will return a 200 with `error` in
    // the body for invalid codes. Treat that as a thrown error so
    // the route's catch block reports it via Sentry.
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      scope?: string
      token_type?: string
      error?: string
      error_description?: string
    }

    if (tokenJson.error || !tokenJson.access_token) {
      throw new Error(
        `GitHub token exchange returned error: ${tokenJson.error ?? 'no_access_token'}`,
      )
    }

    // Look up the GitHub user so we can store an `external_id` and
    // a sensible `display_name`. This is the only outbound call we
    // make at connect time — the rest happen lazily via consumer
    // code paths.
    const userRes = await fetch(USER_API_URL, {
      headers: {
        authorization: `Bearer ${tokenJson.access_token}`,
        accept: 'application/vnd.github+json',
        // GitHub recommends a UA; missing one yields 403.
        'user-agent': 'Lazynext-OAuth/1.0',
      },
    })

    if (!userRes.ok) {
      throw new Error(`GitHub user lookup failed: HTTP ${userRes.status}`)
    }

    const userJson = (await userRes.json()) as {
      id?: number
      login?: string
      name?: string | null
    }

    if (typeof userJson.id !== 'number' || typeof userJson.login !== 'string') {
      throw new Error('GitHub user lookup returned unexpected shape')
    }

    // Compute expires_at if GitHub returned an expires_in. Most
    // GitHub OAuth apps don't expire access tokens (they're
    // long-lived), but GitHub Apps do — leaving the conditional
    // here means migrating to a GitHub App later doesn't require
    // an adapter change.
    const expiresAt =
      typeof tokenJson.expires_in === 'number'
        ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
        : null

    return {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? null,
      expiresAt,
      externalId: String(userJson.id),
      displayName: userJson.name ?? userJson.login,
      scopes: tokenJson.scope ?? null,
    }
  },
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    // Throws synchronously — the registry's `isProviderConfigured`
    // check runs upstream so production never reaches this throw.
    // Tests that exercise this path should set the env first.
    throw new Error(`${name} is not set; cannot build GitHub OAuth URL.`)
  }
  return v
}

// Register at module load. Tests that don't want this side effect
// should import from a sub-path (`./github/adapter`) and call
// `registerOAuthProvider` themselves; this file is the convenience
// re-export the API route uses.
let _registered = false
export function ensureGithubAdapterRegistered(): void {
  if (_registered) return
  _registered = true
  try {
    registerOAuthProvider(githubAdapter)
  } catch {
    // Already registered (e.g. hot reload re-imported the module
    // after the registry's dedupe error). Treat as success.
  }
}
