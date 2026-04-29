// ─────────────────────────────────────────────────────────────
// Linear OAuth adapter.
//
// Third adapter on the OAuth scaffolding. Linear is the highest-
// signal Import source for engineering teams (#15) and one of
// the three priority providers on the Integrations page (#31).
//
// Linear uses a standard OAuth2 web flow: authorize → exchange
// code for tokens → identity via a separate GraphQL `viewer`
// query. Unlike GitHub it accepts comma-separated scope strings
// in the authorize URL (NOT space-separated). Unlike Notion it
// has no inline identity in the token response.
//
// Env vars required:
//   - LAZYNEXT_OAUTH_LINEAR_CLIENT_ID
//   - LAZYNEXT_OAUTH_LINEAR_CLIENT_SECRET
//
// Linear docs: https://developers.linear.app/docs/oauth/authentication
// ─────────────────────────────────────────────────────────────

import {
  registerOAuthProvider,
  type OAuthProviderConfig,
  type OAuthScopeMode,
} from './registry'

const AUTHORIZE_URL = 'https://linear.app/oauth/authorize'
const TOKEN_URL = 'https://api.linear.app/oauth/token'
const GRAPHQL_URL = 'https://api.linear.app/graphql'

// Linear documents the following scopes:
//   read         — read all data
//   write        — create+update issues/comments/etc.
//   issues:create — create issues only (subset of write)
//   comments:create — create comments only
//   admin        — workspace admin (rare, opt-in)
//
// Read mode pins to `read`. Write mode adds `write`. Admin mode
// adds `admin`. We stay away from the granular create-only scopes
// because the Lazynext use case (mirror issues, link decisions)
// inherently needs read access.
const LINEAR_SCOPES: Record<OAuthScopeMode, string[]> = {
  read: ['read'],
  write: ['read', 'write'],
  admin: ['read', 'write', 'admin'],
}

export const linearAdapter: OAuthProviderConfig = {
  id: 'linear',
  displayName: 'Linear',
  // Linear's OAuth2 web flow uses the standard
  // client_id+client_secret pattern. PKCE is supported but not
  // required; we leave it off because the secret is the proof.
  pkce: false,
  scopes: LINEAR_SCOPES,

  buildAuthorizeUrl({ state, redirectUri, mode }) {
    const clientId = requireEnv('LAZYNEXT_OAUTH_LINEAR_CLIENT_ID')
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      // Linear wants COMMA-separated scopes. URLSearchParams
      // will percent-encode commas; both Linear's docs and our
      // testing confirm `%2C` is accepted.
      scope: LINEAR_SCOPES[mode].join(','),
      state,
      // `prompt=consent` forces a fresh consent screen even if
      // the user has previously authorised the app — we want
      // every scope upgrade to be visible.
      prompt: 'consent',
    })
    return `${AUTHORIZE_URL}?${params.toString()}`
  },

  async exchangeCode({ code, redirectUri }) {
    const clientId = requireEnv('LAZYNEXT_OAUTH_LINEAR_CLIENT_ID')
    const clientSecret = requireEnv('LAZYNEXT_OAUTH_LINEAR_CLIENT_SECRET')

    // Linear's token endpoint takes form-encoded credentials in
    // the body (NOT Basic auth in the header). This is
    // documented but trips up implementations that copy the
    // GitHub or Slack patterns.
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenRes.ok) {
      throw new Error(`Linear token exchange failed: HTTP ${tokenRes.status}`)
    }

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
        `Linear token exchange returned error: ${tokenJson.error ?? 'no_access_token'}`,
      )
    }

    // Identity lookup via GraphQL `viewer` query. Linear's REST
    // surface for this is intentionally limited — GraphQL is the
    // primary API. We ask only for the three fields we store:
    // id (external_id), name (display_name), email (display_name
    // fallback).
    const viewerRes = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${tokenJson.access_token}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        query: 'query { viewer { id name email } }',
      }),
    })

    if (!viewerRes.ok) {
      throw new Error(`Linear viewer lookup failed: HTTP ${viewerRes.status}`)
    }

    const viewerJson = (await viewerRes.json()) as {
      data?: { viewer?: { id?: string; name?: string | null; email?: string | null } }
      errors?: Array<{ message?: string }>
    }

    if (viewerJson.errors?.length) {
      throw new Error(
        `Linear viewer GraphQL error: ${viewerJson.errors[0]?.message ?? 'unknown'}`,
      )
    }

    const viewer = viewerJson.data?.viewer
    if (!viewer || typeof viewer.id !== 'string') {
      throw new Error('Linear viewer lookup returned unexpected shape')
    }

    const expiresAt =
      typeof tokenJson.expires_in === 'number'
        ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
        : null

    return {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? null,
      expiresAt,
      externalId: viewer.id,
      displayName: viewer.name ?? viewer.email ?? viewer.id,
      scopes: tokenJson.scope ?? null,
    }
  },
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(`${name} is not set; cannot build Linear OAuth URL.`)
  }
  return v
}

let _registered = false
export function ensureLinearAdapterRegistered(): void {
  if (_registered) return
  _registered = true
  try {
    registerOAuthProvider(linearAdapter)
  } catch {
    // Already registered (hot reload). Treat as success.
  }
}
