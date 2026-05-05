// ─────────────────────────────────────────────────────────────
// Asana OAuth adapter.
//
// Fifth adapter on the OAuth scaffolding. Asana is one of the
// three remaining Import-modal connectors (#15) — Trello, Asana,
// Jira — and the cleanest of the three to wire because Asana
// implements a textbook OAuth 2.0 authorization-code flow.
//
// Notable differences from the earlier four adapters:
//
//   1. Asana issues SHORT-LIVED access tokens (1 hour) and a
//      refresh token. We persist `expires_at` so consumer code
//      can detect expiry and trigger refresh. The refresh flow
//      itself isn't part of the connect-time contract — it'll
//      land with the first feature that actually pulls Asana
//      data, which is when refresh becomes meaningful.
//
//   2. The token response includes a `data` user object inline
//      (`{ access_token, refresh_token, expires_in, data: { id, name, email } }`).
//      No /users/me round-trip needed at connect time. We use
//      `data.id` as the external_id (Asana's `gid`).
//
//   3. Scopes are NOT part of the standard OAuth flow today —
//      Asana grants the integration whatever the user authorised
//      at install. We keep the `scopes` record for shape parity
//      and to leave room for Asana's documented future scopes
//      (`default`, `openid`, `email`, `profile`).
//
// Env vars required:
//   - LAZYNEXT_OAUTH_ASANA_CLIENT_ID
//   - LAZYNEXT_OAUTH_ASANA_CLIENT_SECRET
//
// Asana docs: https://developers.asana.com/docs/oauth
// ─────────────────────────────────────────────────────────────

import {
  registerOAuthProvider,
  type OAuthProviderConfig,
  type OAuthScopeMode,
} from './registry'

const AUTHORIZE_URL = 'https://app.asana.com/-/oauth_authorize'
const TOKEN_URL = 'https://app.asana.com/-/oauth_token'

// Asana scope strings as documented today. Most integrations
// rely on `default` (the Asana "everything the user has access
// to" scope). Read mode pins to that. Write/admin reserved for
// future surface that exposes a real choice — Asana does not
// currently differentiate read vs write at the OAuth flow.
const ASANA_SCOPES: Record<OAuthScopeMode, string[]> = {
  read: ['default'],
  write: ['default'],
  admin: ['default'],
}

export const asanaAdapter: OAuthProviderConfig = {
  id: 'asana',
  displayName: 'Asana',
  // Asana's web flow uses the standard client_id+client_secret.
  // PKCE is supported as of 2024 but optional when the secret is
  // present; we leave it off because the secret is the proof.
  pkce: false,
  scopes: ASANA_SCOPES,

  buildAuthorizeUrl({ state, redirectUri, mode }) {
    const clientId = requireEnv('LAZYNEXT_OAUTH_ASANA_CLIENT_ID')
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      // Asana wants SPACE-separated scopes — same convention
      // as GitHub / Slack.
      scope: ASANA_SCOPES[mode].join(' '),
      state,
    })
    return `${AUTHORIZE_URL}?${params.toString()}`
  },

  async exchangeCode({ code, redirectUri }) {
    const clientId = requireEnv('LAZYNEXT_OAUTH_ASANA_CLIENT_ID')
    const clientSecret = requireEnv('LAZYNEXT_OAUTH_ASANA_CLIENT_SECRET')

    // Asana's token endpoint takes form-encoded credentials in
    // the body (NOT Basic auth in the header). Documented
    // shape — copy mistakes from GitHub/Slack are common.
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
      throw new Error(`Asana token exchange failed: HTTP ${tokenRes.status}`)
    }

    const tokenJson = (await tokenRes.json()) as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      token_type?: string
      data?: { id?: string | number; name?: string | null; email?: string | null; gid?: string }
      error?: string
      error_description?: string
    }

    if (tokenJson.error || !tokenJson.access_token) {
      throw new Error(
        `Asana token exchange returned error: ${tokenJson.error ?? 'no_access_token'}`,
      )
    }

    // Asana inlines the user object as `data` on the token
    // response. The id field is `gid` in modern responses and
    // `id` in legacy ones — accept either. Both are stable
    // strings from Asana's perspective.
    const userId = tokenJson.data?.gid ?? (tokenJson.data?.id != null ? String(tokenJson.data.id) : undefined)
    if (!userId) {
      throw new Error('Asana token exchange missing data.id/data.gid')
    }

    const displayName =
      tokenJson.data?.name ?? tokenJson.data?.email ?? userId

    const expiresAt =
      typeof tokenJson.expires_in === 'number'
        ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
        : null

    return {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? null,
      expiresAt,
      externalId: userId,
      displayName,
      // Asana doesn't echo granted scopes on the token response.
      scopes: null,
    }
  },
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(`${name} is not set; cannot build Asana OAuth URL.`)
  }
  return v
}

let _registered = false
export function ensureAsanaAdapterRegistered(): void {
  if (_registered) return
  _registered = true
  try {
    registerOAuthProvider(asanaAdapter)
  } catch {
    // Already registered (hot reload). Treat as success.
  }
}
