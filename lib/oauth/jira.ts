// ─────────────────────────────────────────────────────────────
// Jira (Atlassian) OAuth 2.0 (3LO) adapter.
//
// Sixth adapter on the OAuth scaffolding. Jira is the third
// remaining Import-modal connector (#15). Jira Cloud uses
// Atlassian's "OAuth 2.0 (3LO)" — three-legged OAuth — which
// is a textbook authorization-code flow with two adapter-side
// quirks worth calling out before you read the code:
//
//   1. The authorize URL is on `auth.atlassian.com` and REQUIRES
//      `audience=api.atlassian.com`. Without it the flow lands
//      on a generic Atlassian login screen with no API access.
//
//   2. Identity needs TWO calls after the token exchange:
//        a. GET /me → user account_id + name + email
//        b. GET /oauth/token/accessible-resources → list of
//           Jira Cloud sites (`cloudid`) the user granted access
//           to. The first cloudid is the one we record as the
//           connection's external_id so the connection points
//           at a SPECIFIC Jira instance, not a user. (Multiple
//           sites under one connection is a future feature; for
//           v1 we pick the first and surface the site name in
//           display_name.)
//
//   3. Atlassian token responses include `expires_in` (typically
//      3600s) AND a refresh token IF `offline_access` was in the
//      scope set. We always include `offline_access` so consumer
//      code can refresh; the refresh flow itself isn't part of
//      connect-time and lands with the first feature that pulls
//      Jira data.
//
// Env vars required:
//   - LAZYNEXT_OAUTH_JIRA_CLIENT_ID
//   - LAZYNEXT_OAUTH_JIRA_CLIENT_SECRET
//
// Atlassian docs:
//   https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/
// ─────────────────────────────────────────────────────────────

import {
  registerOAuthProvider,
  type OAuthProviderConfig,
  type OAuthScopeMode,
} from './registry'

const AUTHORIZE_URL = 'https://auth.atlassian.com/authorize'
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token'
const ME_URL = 'https://api.atlassian.com/me'
const RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources'

// Atlassian scope strings. We pin to the lowest privilege set
// that matches the Lazynext use case (read issue/project metadata
// for Import #15, optionally write to mirror nodes back as Jira
// issues at write tier). `offline_access` is always included so
// the refresh-token flow is available.
const JIRA_SCOPES: Record<OAuthScopeMode, string[]> = {
  read: [
    'read:jira-user',
    'read:jira-work',
    'offline_access',
  ],
  // Read + the standard write scope. Atlassian's granular
  // scopes (`write:issue:jira`, etc.) are a separate axis we
  // can opt into later — `write:jira-work` covers the realistic
  // first use case.
  write: [
    'read:jira-user',
    'read:jira-work',
    'write:jira-work',
    'offline_access',
  ],
  // No "admin" scope at the OAuth flow today. Reserved for a
  // future GitHub-Apps-style site-admin migration.
  admin: [
    'read:jira-user',
    'read:jira-work',
    'write:jira-work',
    'offline_access',
  ],
}

export const jiraAdapter: OAuthProviderConfig = {
  id: 'jira',
  displayName: 'Jira',
  // Atlassian 3LO uses standard client_id+client_secret. PKCE
  // is supported as of 2024 but the secret is the proof for
  // server-side flows; we leave PKCE off for parity with the
  // other server-side adapters.
  pkce: false,
  scopes: JIRA_SCOPES,

  buildAuthorizeUrl({ state, redirectUri, mode }) {
    const clientId = requireEnv('LAZYNEXT_OAUTH_JIRA_CLIENT_ID')
    const params = new URLSearchParams({
      // `audience=api.atlassian.com` is REQUIRED — without it
      // the flow lands on a generic login with no API token
      // capability. This is the easiest mistake to make on
      // a first integration.
      audience: 'api.atlassian.com',
      client_id: clientId,
      // Atlassian wants SPACE-separated scopes.
      scope: JIRA_SCOPES[mode].join(' '),
      redirect_uri: redirectUri,
      state,
      response_type: 'code',
      // `prompt=consent` forces a fresh consent screen on every
      // authorize so scope upgrades are visible. Atlassian honours
      // this on the Auth0-backed /authorize endpoint.
      prompt: 'consent',
    })
    return `${AUTHORIZE_URL}?${params.toString()}`
  },

  async exchangeCode({ code, redirectUri }) {
    const clientId = requireEnv('LAZYNEXT_OAUTH_JIRA_CLIENT_ID')
    const clientSecret = requireEnv('LAZYNEXT_OAUTH_JIRA_CLIENT_SECRET')

    // Atlassian's token endpoint takes a JSON body. Different
    // from the form-body GitHub/Slack/Asana shape — copy-paste
    // bug magnet.
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      throw new Error(`Jira token exchange failed: HTTP ${tokenRes.status}`)
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
        `Jira token exchange returned error: ${tokenJson.error ?? 'no_access_token'}`,
      )
    }

    // Two parallel identity calls — one for the user, one for
    // the accessible Jira sites. Both are needed: the user gives
    // us a stable display name; the resources list pins the
    // connection to a specific Jira Cloud site.
    const [meRes, resourcesRes] = await Promise.all([
      fetch(ME_URL, {
        headers: {
          authorization: `Bearer ${tokenJson.access_token}`,
          accept: 'application/json',
        },
      }),
      fetch(RESOURCES_URL, {
        headers: {
          authorization: `Bearer ${tokenJson.access_token}`,
          accept: 'application/json',
        },
      }),
    ])

    if (!meRes.ok) {
      throw new Error(`Jira /me lookup failed: HTTP ${meRes.status}`)
    }
    if (!resourcesRes.ok) {
      throw new Error(`Jira accessible-resources lookup failed: HTTP ${resourcesRes.status}`)
    }

    const meJson = (await meRes.json()) as {
      account_id?: string
      name?: string | null
      email?: string | null
      nickname?: string | null
    }
    const resourcesJson = (await resourcesRes.json()) as Array<{
      id?: string
      name?: string | null
      url?: string | null
      scopes?: string[]
    }>

    if (!meJson.account_id) {
      throw new Error('Jira /me returned no account_id')
    }
    if (!Array.isArray(resourcesJson) || resourcesJson.length === 0 || !resourcesJson[0]?.id) {
      throw new Error('Jira accessible-resources returned no Jira sites')
    }

    // The connection points at the FIRST accessible Jira site.
    // external_id = `<cloudid>:<account_id>` so the unique
    // index `(workspace_id, provider, external_id)` collapses
    // re-installs into the same site by the same user, but
    // distinguishes "same user, different Jira instance".
    const cloudId = resourcesJson[0].id
    const siteName = resourcesJson[0].name ?? resourcesJson[0].url ?? cloudId
    const externalId = `${cloudId}:${meJson.account_id}`

    // Display name preference: site name + user name (most
    // useful when a user has access to multiple Jira sites);
    // fall back to either alone.
    const userName = meJson.name ?? meJson.nickname ?? meJson.email ?? meJson.account_id
    const displayName = `${siteName} (${userName})`

    const expiresAt =
      typeof tokenJson.expires_in === 'number'
        ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
        : null

    return {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? null,
      expiresAt,
      externalId,
      displayName,
      scopes: tokenJson.scope ?? null,
    }
  },
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(`${name} is not set; cannot build Jira OAuth URL.`)
  }
  return v
}

let _registered = false
export function ensureJiraAdapterRegistered(): void {
  if (_registered) return
  _registered = true
  try {
    registerOAuthProvider(jiraAdapter)
  } catch {
    // Already registered (hot reload). Treat as success.
  }
}
